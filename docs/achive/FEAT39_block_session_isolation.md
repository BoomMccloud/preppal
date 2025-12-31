# FEAT39: Block Session Isolation (Refined)

> Supersedes FEAT36. Incorporates first-principle analysis refinements.

## Problem Statement

Block-based interviews stop unexpectedly mid-way through the second block. The interview ends approximately `answerTimeLimitSec` seconds after the first block started, regardless of when block 2 began.

## Root Cause Analysis

### Current Architecture

The Cloudflare Worker uses a Durable Object (DO) keyed by `interviewId` alone:

```typescript
// worker/src/index.ts:91
const id = env.GEMINI_SESSION.idFromName(interviewId);
```

This means **the same DO instance handles all blocks** of an interview.

### The Bug

When block 1 starts, the DO sets a duration timeout:

```typescript
// worker/src/gemini-session.ts
private startDurationTimeout(ws: WebSocket): void {
  const timeoutMs = this.interviewContext.durationMs || this.DEFAULT_DURATION_MS;
  this.durationTimeoutId = setTimeout(() => {
    void this.handleTimeoutEnd(ws);
  }, timeoutMs);
}
```

For block-based interviews, `durationMs` is set to `answerTimeLimitSec * 1000` (e.g., 60 seconds).

**Timeline of failure:**
1. Block 1 starts at T=0, DO sets 60-second timeout
2. User completes block 1 at T=30s
3. Client-side state transitions to `BLOCK_COMPLETE_SCREEN`, then to `ANSWERING` for block 2
4. **The WebSocket connection remains open** (client never reconnects)
5. At T=60s, the DO's timeout fires `handleTimeoutEnd()`
6. DO sends `SESSION_ENDED` with `TIMEOUT` reason and closes WebSocket
7. Client receives close, interview ends unexpectedly

## First Principles Analysis

**What defines a "session" in block-based interviews?**

| Aspect | Shared Across Blocks? | Implication |
|--------|----------------------|-------------|
| System prompt | No (different per block) | Needs fresh context |
| Language | No (can change) | Needs fresh Gemini session |
| Question | No (different) | Needs fresh conversation |
| Timeout | No (per-block limit) | Needs independent timer |
| Transcript | No (stored per block) | Already separate in DB |

**Conclusion**: Each block is semantically an independent session. Each block should have its own Durable Object.

## Solution Overview

1. **Server**: Key Durable Object by `interviewId_block${blockNumber}`
2. **Client**: Add `RECONNECT_FOR_BLOCK` command to establish new connection per block
3. **Client**: Defer timer start until connection is ready (fixes timer-during-reconnect issue)
4. **Client**: Add reconnecting guard to prevent false error states

---

## Detailed Implementation

### 1. Worker Changes

**`worker/src/index.ts`** (~line 91):

```typescript
// Before:
const id = env.GEMINI_SESSION.idFromName(interviewId);

// After:
const block = url.searchParams.get("block") ?? "1";
const blockNum = parseInt(block, 10);
if (isNaN(blockNum) || blockNum < 1) {
  return new Response("Invalid block number", { status: 400 });
}
const id = env.GEMINI_SESSION.idFromName(`${interviewId}_block${block}`);
```

### 2. Types Changes

**`types.ts`** - Add new command and update state:

```typescript
export type Command =
  // ... existing commands
  | { type: "CLOSE_CONNECTION" }
  | { type: "RECONNECT_FOR_BLOCK"; blockNumber: number };

// Update SessionState to track reconnection
export type SessionState =
  | { status: "WAITING_FOR_CONNECTION"; /* ... */ }
  | {
      status: "ANSWERING";
      blockIndex: number;
      blockStartTime: number | null;  // null = waiting for connection
      answerStartTime: number | null; // null = waiting for connection
      isReconnecting: boolean;        // true during block transition
      /* ... */
    }
  | { status: "ANSWER_TIMEOUT_PAUSE"; /* ... */ }
  | { status: "BLOCK_COMPLETE_SCREEN"; completedBlockIndex: number; /* ... */ }
  | { status: "INTERVIEW_COMPLETE"; /* ... */ };
```

### 3. Reducer Changes

**`reducer.ts`** - Handle block transitions correctly:

```typescript
// When user clicks continue on block complete screen
case "BLOCK_COMPLETE_SCREEN":
  if (event.type === "USER_CLICKED_CONTINUE") {
    const nextIdx = state.completedBlockIndex + 1;

    // Last block → end interview
    if (nextIdx >= context.totalBlocks) {
      return {
        state: { ...state, status: "INTERVIEW_COMPLETE" },
        commands: [{ type: "CLOSE_CONNECTION" }],
      };
    }

    // More blocks → transition to ANSWERING but DON'T start timer yet
    return {
      state: {
        ...state,
        status: "ANSWERING",
        blockIndex: nextIdx,
        blockStartTime: null,      // ← Will be set on CONNECTION_READY
        answerStartTime: null,     // ← Will be set on CONNECTION_READY
        isReconnecting: true,      // ← Guard flag
      },
      commands: [
        { type: "CLOSE_CONNECTION" },
        { type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 },
      ],
    };
  }
  break;

// When connection is ready (either initial or after reconnect)
case "ANSWERING":
  if (event.type === "CONNECTION_READY") {
    return {
      state: {
        ...state,
        blockStartTime: state.blockStartTime ?? now,   // Set if null
        answerStartTime: state.answerStartTime ?? now, // Set if null
        isReconnecting: false,
      },
      commands: [],
    };
  }

  // Ignore connection closed during reconnection
  if (event.type === "CONNECTION_CLOSED" && state.isReconnecting) {
    return { state, commands: [] };  // No-op, expected during transition
  }

  // Handle TICK - but only if timer has started
  if (event.type === "TICK") {
    // Skip timeout checks if timer hasn't started
    if (state.blockStartTime === null || state.answerStartTime === null) {
      return { state, commands: [] };
    }

    // ... existing timeout logic
  }
  break;
```

### 4. WebSocket Driver Changes

**`useInterviewSocket.ts`** - Add reconnect capability:

```typescript
// Add ref to track current block
const currentBlockRef = useRef(blockNumber);

// Keep ref in sync with prop
useEffect(() => {
  currentBlockRef.current = blockNumber;
}, [blockNumber]);

// Update connectWebSocket to include block number
const connectWebSocket = useCallback((token: string) => {
  const wsUrl = `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}&block=${currentBlockRef.current}`;
  // ... rest of connection logic
}, [workerUrl, interviewId]);

// Add reconnect method
const reconnectForBlock = useCallback((newBlockNumber: number) => {
  // Update block ref for next connection
  currentBlockRef.current = newBlockNumber;

  // Reset connection guard to allow new connection
  hasInitiatedConnection.current = false;

  // Trigger new token generation → will call connectWebSocket
  generateToken({ interviewId, token: guestToken });
}, [interviewId, guestToken, generateToken]);

// Return reconnectForBlock in the hook's return value
return {
  // ... existing returns
  reconnectForBlock,
};
```

### 5. Session Hook Changes

**`useInterviewSession.ts`** - Execute new commands:

```typescript
// In command execution effect:
for (const cmd of result.commands) {
  switch (cmd.type) {
    case "CLOSE_CONNECTION":
      driver.disconnect();
      break;

    case "RECONNECT_FOR_BLOCK":
      driver.reconnectForBlock(cmd.blockNumber);
      break;

    // ... other commands
  }
}
```

---

## State Machine Update

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BLOCK TRANSITION STATE MACHINE                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────┐                                            │
│  │ WAITING_FOR_CONNECTION  │ ← Initial state                            │
│  └───────────┬─────────────┘                                            │
│              │ CONNECTION_READY                                          │
│              ▼                                                           │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ ANSWERING                                                │            │
│  │   blockStartTime: number                                 │            │
│  │   answerStartTime: number                                │            │
│  │   isReconnecting: false                                  │ ◀──┐      │
│  └───────────┬─────────────────────────────────────────────┘    │      │
│              │ Block timeout                                     │      │
│              ▼                                                   │      │
│  ┌─────────────────────────┐                                    │      │
│  │ BLOCK_COMPLETE_SCREEN   │                                    │      │
│  │   completedBlockIndex   │                                    │      │
│  └───────────┬─────────────┘                                    │      │
│              │ USER_CLICKED_CONTINUE (more blocks)              │      │
│              ▼                                                   │      │
│  ┌─────────────────────────────────────────────────────────┐    │      │
│  │ ANSWERING (reconnecting)                                 │    │      │
│  │   blockStartTime: null    ← Timer NOT counting           │    │      │
│  │   answerStartTime: null   ← Timer NOT counting           │    │      │
│  │   isReconnecting: true    ← Ignores CONNECTION_CLOSED    │    │      │
│  └───────────┬─────────────────────────────────────────────┘    │      │
│              │ CONNECTION_READY                                  │      │
│              │   → Set blockStartTime = now                      │      │
│              │   → Set answerStartTime = now                     │      │
│              │   → Set isReconnecting = false                    │      │
│              └──────────────────────────────────────────────────┘      │
│                                                                          │
│  USER_CLICKED_CONTINUE (last block) ──────▶ INTERVIEW_COMPLETE          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Refinements from FEAT36

| Issue | FEAT36 | FEAT39 |
|-------|--------|--------|
| Timer during reconnect | Timer starts immediately on `USER_CLICKED_CONTINUE` | Timer starts on `CONNECTION_READY` |
| Connection close handling | No guard; could trigger error state | `isReconnecting` flag prevents false errors |
| Command sequence | Single `RECONNECT_FOR_BLOCK` | Explicit `CLOSE_CONNECTION` + `RECONNECT_FOR_BLOCK` |
| State modeling | `blockStartTime` always number | `blockStartTime` nullable during reconnection |

---

## Implementation Checklist

### Worker
- [ ] Update `worker/src/index.ts` to parse `block` query param
- [ ] Validate block number (>= 1, is number)
- [ ] Key DO by `${interviewId}_block${blockNumber}`

### Types
- [ ] Add `RECONNECT_FOR_BLOCK` command type
- [ ] Make `blockStartTime` and `answerStartTime` nullable in `ANSWERING` state
- [ ] Add `isReconnecting` boolean to `ANSWERING` state

### Reducer
- [ ] Handle `USER_CLICKED_CONTINUE` with `isReconnecting: true` and null timestamps
- [ ] Handle `CONNECTION_READY` in `ANSWERING` state to set timestamps
- [ ] Guard `CONNECTION_CLOSED` when `isReconnecting` is true
- [ ] Guard `TICK` when timestamps are null

### WebSocket Driver
- [ ] Add `currentBlockRef` to track block number
- [ ] Include `block` param in WebSocket URL
- [ ] Add `reconnectForBlock(blockNumber)` method
- [ ] Export `reconnectForBlock` from hook

### Session Hook
- [ ] Handle `CLOSE_CONNECTION` command
- [ ] Handle `RECONNECT_FOR_BLOCK` command

### Tests
- [ ] Test block transition emits correct commands
- [ ] Test timer doesn't count during reconnection
- [ ] Test `CONNECTION_CLOSED` ignored during reconnection
- [ ] Test `CONNECTION_READY` sets timestamps correctly

---

## Test Scenarios

### Happy Path
1. Complete 6 blocks via answer timeouts - verify all blocks complete
2. Complete 6 blocks via "Next Question" button - verify all blocks complete
3. Mix of timeouts and manual advances - verify correct behavior
4. Verify each block gets correct system prompt/language
5. Verify transcripts are stored per-block correctly

### Timer Accuracy
6. Reconnection takes 3 seconds → verify user gets full `answerTimeLimit` seconds
7. Reconnection fails → verify error handling (not timed out)

### Edge Cases
8. Verify block 1 timeout doesn't affect block 2
9. Verify WebSocket closes cleanly between blocks
10. Invalid block number in URL - verify worker returns 400 error
11. Rapid-click "Continue" button - verify no duplicate reconnections

---

## Benefits

1. **Clean slate per block** - No state pollution between blocks
2. **Independent timeouts** - Each block's timer is self-contained
3. **Correct Gemini context** - Fresh system prompt per block
4. **Accurate timing** - Timer only counts when connected
5. **Robust transitions** - No false error states during reconnection
6. **Natural resource cleanup** - DO hibernates when block ends
7. **Aligns with data model** - Matches separate `InterviewBlock` records
8. **Testable** - Pure reducer logic, easily unit tested

---

## Related Files

- `worker/src/index.ts` - DO instantiation
- `worker/src/gemini-session.ts` - Session lifecycle
- `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts` - State machine
- `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts` - Command types
- `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts` - WebSocket driver
- `src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts` - Command executor
