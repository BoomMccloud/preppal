# FEAT44: Session Architecture Simplification

> **Status:** Ready
> **Created:** 2025-12-31
> **Updated:** 2026-01-01 (KISS revision)
> **Related:** FEAT40 (Block Isolation), FEAT42 (Close Code Handling)

## Problem Statement

The interview session architecture has accumulated complexity that makes it fragile and hard to maintain. A recent change to unify `CONNECTION_READY` into `CONNECTION_ESTABLISHED` exposed a hidden race condition caused by the driver's internal state guards.

## Root Cause Analysis

### The Bug That Revealed the Complexity

When `CONNECTION_ESTABLISHED` generated a `START_CONNECTION` command:

1. `reconnectForBlock()` reset `hasInitiatedConnection = false` and called `generateToken()`
2. Token succeeded, WebSocket connected
3. `CONNECTION_ESTABLISHED` fired → generated `START_CONNECTION` command
4. `START_CONNECTION` called `driver.connect()`
5. Since flag was `false`, `connect()` called `generateToken()` **again**
6. Second `generateToken()` failed → `CONNECTION_ERROR` → interview ended

### Why It Was Hidden

Before the change, `CONNECTION_READY` was only dispatched via `SessionContentDev`'s `onConnectionReady` callback. That callback had a `connectionReadyCalledRef` guard that was **never reset**, so it only fired on the initial connection, not on block transitions.

This hidden coupling between UI state (`connectionReadyCalledRef`) and driver state (`hasInitiatedConnection`) masked the architectural flaw.

## First-Principle Analysis

### Current Architecture Violations

| Principle | Violation | Risk |
|-----------|-----------|------|
| **Source of Truth** | Driver has hidden guard state (`hasInitiatedConnection`) | Split-brain between reducer and driver |
| **Dumb Driver** | Driver decides when to connect via guards | Business logic in infrastructure |
| **Command Clarity** | `START_CONNECTION` is now a no-op | Dead code, confusion |
| **Single Responsibility** | `RECONNECT_FOR_BLOCK` and `connect()` do similar things | Duplicate paths |

> **Note:** `currentBlockRef` is data (holds block number for URL), not a guard. It doesn't make decisions, so it's not problematic. We keep it for simplicity.

### State Topology Problem

```
Reducer State (visible):        Driver State (hidden):
├─ connectionState: "live"      ├─ hasInitiatedConnection: true/false  ← GUARD (remove)
├─ status: "ANSWERING"          ├─ currentBlockRef: number             ← DATA (keep)
├─ blockIndex: 0                ├─ wsRef: WebSocket
└─ targetBlockIndex: 1          └─ activeConnectionsRef: number
```

The driver's `hasInitiatedConnection` flag is a **guard** that decides whether to actually connect. This violates the "Dumb Driver" principle - drivers should execute commands, not decide whether to execute them.

`currentBlockRef` is different - it's just a parameter holder for the async callback (token generation → WebSocket URL). It doesn't gate behavior, so removing it would add complexity without benefit (KISS).

## Design Decision: Combined Cleanup + Dumb Driver

After first-principle analysis, we determined that Phase 1 (dead code removal) alone doesn't improve maintainability - the hidden driver state remains. The real value is in making the driver stateless.

**Decision:** Combine Phase 1 + Phase 2 into a single implementation.

**Rationale:**
- Phase 1 alone leaves the split-brain architecture intact
- Phase 2 eliminates the hidden state machine in the driver
- Combined change is still small (~50-80 lines)
- Single PR = single review = less drift risk

### Before: Smart Driver with Hidden State

```typescript
// Driver has hidden state that shadows reducer
connect() {
  if (!hasInitiatedConnection.current) {  // <-- DECISION in driver
    hasInitiatedConnection.current = true;
    generateToken(...);
  }
}

reconnectForBlock(block) {
  currentBlockRef.current = block;           // <-- Driver owns state
  hasInitiatedConnection.current = false;    // <-- Driver manages lifecycle
  generateToken();
}
```

**Problems:**
- Two methods doing similar things
- Hidden guards that can conflict with reducer state
- `hasInitiatedConnection` reset causes race conditions

### After: Dumb Driver, No Guards

```typescript
// Driver has no guards - just executes commands
connectForBlock(block: number) {
  wsRef.current?.close();  // Always close existing
  currentBlockRef.current = block;  // Set for URL building (data, not guard)
  generateToken({ interviewId, block });  // Always connect, no guards
}
```

**Benefits:**
- One method, no guards
- Reducer is sole decision-maker
- `currentBlockRef` remains but only as data (not decision-making state)

### Command Simplification

```typescript
// BEFORE: Two commands, confusing semantics
| START_CONNECTION    | → driver.connect() (with guard, often no-op)
| RECONNECT_FOR_BLOCK | → driver.reconnectForBlock()

// AFTER: One command, clear semantics
| CONNECT_FOR_BLOCK   | → driver.connectForBlock(block)
```

## Future Work: Explicit Initial Connection

Currently the initial connection is implicit via useEffect:
```typescript
useEffect(() => {
  driver.connectForBlock(1);  // Auto-connect on mount
}, []);
```

This could become explicit (lower priority):
```typescript
// Reducer generates CONNECT command from initial state
case "START_INTERVIEW":
  return {
    state,
    commands: [{ type: "CONNECT_FOR_BLOCK", block: 1 }]
  };
```

**Risk:** Medium - changes initialization sequence
**Priority:** Low - current approach works fine after main fix

## Solution: Combined Implementation

### 1. Update Command Types

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

```typescript
// REMOVE these lines from Command union:
| { type: "START_CONNECTION"; blockNumber: number }
| { type: "RECONNECT_FOR_BLOCK"; blockNumber: number }

// ADD this line:
| { type: "CONNECT_FOR_BLOCK"; block: number }
```

### 2. Update Driver Interface

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

```typescript
// REMOVE the guard ref (this caused the bug):
const hasInitiatedConnection = useRef(false);  // DELETE

// KEEP currentBlockRef (it's just data for URL building):
const currentBlockRef = useRef(blockNumber);  // KEEP

// REMOVE the useEffect that syncs currentBlockRef (we set it directly now)

// MODIFY useMutation to REMOVE hook-level callbacks:
// (callbacks are now handled per-call in connectForBlock for stale detection)
const { mutate: generateToken } =
  api.interview.generateWorkerToken.useMutation();
// ↑ No onSuccess/onError here - moved to connectForBlock

// REMOVE connect() method

// REMOVE reconnectForBlock() method

// ADD single connectForBlock() method:
const connectForBlock = useCallback((block: number) => {
  // Close existing connection (stale socket guard handles late events)
  if (wsRef.current) {
    wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
    wsRef.current = null;
  }

  // Set block for URL building (data, not guard)
  currentBlockRef.current = block;

  // Capture target block in closure to detect staleness
  const targetBlock = block;

  // Connect with per-call callbacks (enables stale token detection)
  generateToken(
    { interviewId, token: guestToken },
    {
      onSuccess: (data) => {
        // STALE CHECK: If we moved to a new block while waiting, ABORT.
        if (currentBlockRef.current !== targetBlock) {
          console.log(`[Socket] Ignoring stale token for block ${targetBlock} (current: ${currentBlockRef.current})`);
          return;
        }
        connectWebSocket(data.token);
      },
      onError: (err) => {
        // Handle error (moved from hook-level callback)
        events.onConnectionError(err.message);
      },
    }
  );
}, [interviewId, guestToken, generateToken, connectWebSocket, events]);

// UPDATE return object:
return {
  connectForBlock,  // Replaces connect + reconnectForBlock
  disconnect,
  mute,
  unmute,
  stopAudio,
  isAudioMuted,
};
```

### 3. Update Command Executor

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts`

```typescript
// REMOVE these cases:
case "START_CONNECTION":
  driver.connect();
  break;
case "RECONNECT_FOR_BLOCK":
  driver.reconnectForBlock(cmd.blockNumber);
  break;

// ADD this case:
case "CONNECT_FOR_BLOCK":
  driver.connectForBlock(cmd.block);
  break;

// UPDATE auto-connect useEffect:
useEffect(() => {
  driver.connectForBlock(config?.blockNumber ?? 1);
}, []);
```

### 4. Update Reducer

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

```typescript
// In BLOCK_COMPLETE_SCREEN handler, change:
commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }]

// To:
commands: [{ type: "CONNECT_FOR_BLOCK", block: nextIdx + 1 }]
```

### 5. Update README

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/README.md`

Update command documentation to reflect single `CONNECT_FOR_BLOCK` command.

## Files to Modify

| File | Change |
|------|--------|
| `types.ts` | Replace `START_CONNECTION` + `RECONNECT_FOR_BLOCK` with `CONNECT_FOR_BLOCK` |
| `useInterviewSocket.ts` | Remove `hasInitiatedConnection` guard, merge `connect()` + `reconnectForBlock()` into `connectForBlock()`, remove useEffect sync |
| `hooks/useInterviewSession.ts` | Update command executor, update auto-connect useEffect |
| `reducer.ts` | Update command generation to use `CONNECT_FOR_BLOCK`, remove stale comment at line ~139 |
| `README.md` | Update command documentation |

## Unit Tests

Update existing tests to use new command:

```typescript
// BEFORE
expect(result.commands).toContainEqual({
  type: "RECONNECT_FOR_BLOCK",
  blockNumber: 2
});

// AFTER
expect(result.commands).toContainEqual({
  type: "CONNECT_FOR_BLOCK",
  block: 2
});
```

Verify:
```bash
pnpm test -- --grep "session-reducer"
pnpm test -- --grep "session-golden-path"
```

## Acceptance Criteria

- [ ] `START_CONNECTION` removed from types
- [ ] `RECONNECT_FOR_BLOCK` removed from types
- [ ] `CONNECT_FOR_BLOCK` added to types
- [ ] `hasInitiatedConnection` ref removed from driver (the guard)
- [ ] `currentBlockRef` useEffect sync removed (now set directly in `connectForBlock`)
- [ ] `connect()` and `reconnectForBlock()` merged into `connectForBlock()`
- [ ] Command executor updated
- [ ] Reducer updated to generate `CONNECT_FOR_BLOCK`
- [ ] Stale comment removed from reducer (~line 139)
- [ ] All existing tests pass (after updating expectations)
- [ ] `pnpm check` passes
- [ ] Manual test: Complete a 2+ block interview successfully

## Appendix: First-Principle Checklist

| Principle | Current State | After This Change |
|-----------|--------------|-------------------|
| **Source of Truth** | Split (reducer + driver guard) | Unified (reducer decides, driver holds data only) |
| **Dumb Driver** | Smart (has guards) | Dumb (executes only, `currentBlockRef` is just data) |
| **Command Clarity** | Two commands, confusing | One command, clear |
| **Testability** | Good (reducer is pure) | Better (no guard state to mock) |

## Appendix: Architecture Comparison

### Current Flow (Complex)

```
Mount
  │
  ▼
useEffect calls driver.connect()
  │
  ▼
driver checks hasInitiatedConnection ─── true ──► (no-op)
  │
  │ false
  ▼
driver sets flag, calls generateToken()
  │
  ▼
Token succeeds → connectWebSocket()
  │
  ▼
WebSocket opens → CONNECTION_ESTABLISHED
  │
  ▼
Reducer transitions to ANSWERING
```

### Block Transition (Where Bug Occurred)

```
User clicks Continue
  │
  ▼
Reducer: WAITING_FOR_CONNECTION + RECONNECT_FOR_BLOCK command
  │
  ▼
Executor calls driver.reconnectForBlock(block)
  │
  ▼
Driver resets hasInitiatedConnection = false  ← DANGER
  │
  ▼
Driver calls generateToken()
  │
  ▼
Token succeeds → WebSocket opens
  │
  ▼
CONNECTION_ESTABLISHED → Reducer transitions to ANSWERING
  │
  ▼
(Previously: START_CONNECTION command → driver.connect())
  │
  ▼
(Previously: Flag is false → SECOND generateToken() → FAILURE)
```

### Target Flow (After This Change)

```
Mount
  │
  ▼
useEffect calls driver.connectForBlock(1)
  │
  ▼
Driver sets currentBlockRef = 1, calls generateToken()
  │
  ▼
WebSocket opens → CONNECTION_ESTABLISHED
  │
  ▼
Reducer transitions to ANSWERING (no commands)

Block Transition:
  │
  ▼
User clicks Continue
  │
  ▼
Reducer: WAITING_FOR_CONNECTION + CONNECT_FOR_BLOCK(nextBlock)
  │
  ▼
Executor calls driver.connectForBlock(nextBlock)
  │
  ▼
Driver sets currentBlockRef = nextBlock, calls generateToken()
  │
  ▼
WebSocket opens → CONNECTION_ESTABLISHED
  │
  ▼
Reducer transitions to ANSWERING (no commands)
```

**Key difference:** No guards in driver. Reducer is sole decision-maker. `currentBlockRef` remains as data only (for URL building).
