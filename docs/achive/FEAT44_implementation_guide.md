# Implementation Guide: Session Architecture Simplification (FEAT44)

**Based on Spec**: `FEAT44_session_architecture_simplification.md`
**Verification Report**: `FEAT44_verification_report.md`
**Generated**: 2026-01-01
**Estimated Total Time**: 1-2 hours

---

## 📋 Overview

### What You're Building

You're simplifying the interview session architecture by removing a hidden "guard" state in the WebSocket driver that caused a race condition bug. This involves merging two commands (`START_CONNECTION` and `RECONNECT_FOR_BLOCK`) into one unified `CONNECT_FOR_BLOCK` command, and removing the driver's decision-making guard in favor of a "dumb driver" that simply executes commands.

### 💡 Core Concept (The "North Star")

**"The Reducer is the Brain. The Driver is Dumb Hardware."**

The driver should NEVER decide whether to connect - it should just execute what the reducer tells it. Currently, the driver has a hidden `hasInitiatedConnection` flag that gates connection attempts. This "smart" behavior caused a race condition where a second `generateToken()` call fired unexpectedly. After this change:
- The **Reducer** decides when to connect (sole decision-maker)
- The **Driver** executes connections (no guards, just does what it's told)
- `currentBlockRef` remains, but only as **data** (for URL building), not as a guard

### Deliverables

After completing this guide, you will have:

- [ ] Removed `START_CONNECTION` and `RECONNECT_FOR_BLOCK` commands
- [ ] Added single `CONNECT_FOR_BLOCK` command
- [ ] Removed `hasInitiatedConnection` guard from driver
- [ ] Merged `connect()` and `reconnectForBlock()` into `connectForBlock()`
- [ ] Updated command executor and reducer
- [ ] Updated all tests to use new command

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `src/app/.../session/types.ts` | Modify | Replace two commands with one |
| `src/app/.../session/useInterviewSocket.ts` | Modify | Remove guard, merge methods |
| `src/app/.../session/hooks/useInterviewSession.ts` | Modify | Update executor and auto-connect |
| `src/app/.../session/reducer.ts` | Modify | Update command generation |
| `src/app/.../session/README.md` | Modify | Update command documentation |
| `src/test/unit/session-reducer.test.ts` | Modify | Update test expectations |
| `src/test/unit/session-golden-path.test.ts` | Modify | Update test expectations |

### ⛔ Out of Scope - DO NOT MODIFY

These files/areas are **not part of this task**:

- `BlockSession.tsx` - UI component, no changes needed
- `SessionContent.tsx` - UI component, no changes needed
- `constants.ts` - Timer configuration, unchanged
- Any worker-side code (`worker/`)
- Any other files not listed above

If you think something outside this scope needs changing, **stop and ask**.

---

## 🔧 Prerequisites

### 1. Environment Setup

```bash
# Verify you're in the project root
pwd
# Should output: /Users/.../preppal

# Install dependencies
pnpm install

# Verify the project builds
pnpm build
```

### 2. Verify Tests Pass

```bash
pnpm test
```

✅ **All tests should pass before you start.** If tests fail, **stop and report the issue**.

### 3. Create Your Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/feat44-dumb-driver
```

---

## 📍 Phase 1: Command Types (Est. 5 mins)

### [ ] Step 1.1: Update Command Union

#### Goal

Replace the two existing connection commands with one unified command. This is the foundation that all other changes depend on.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

#### 🔍 Find This Location

Open the file and navigate to **lines 11-21**. You should see the `Command` type:

```typescript
// Line 11
// Command - instructions from reducer to driver
// Line 12
export type Command =
// Line 13
  | { type: "START_CONNECTION"; blockNumber: number }
// Line 14
  | { type: "CLOSE_CONNECTION" }
// Line 15
  | { type: "MUTE_MIC" }
// Line 16
  | { type: "UNMUTE_MIC" }
// Line 17
  | { type: "SETUP_AUDIO" }
// Line 18
  | { type: "STOP_AUDIO" }
// Line 19
  | { type: "COMPLETE_BLOCK"; blockNumber: number }
// Line 20
  | { type: "RECONNECT_FOR_BLOCK"; blockNumber: number }
// Line 21
  | { type: "COMPLETE_INTERVIEW" };
```

#### ✏️ Action: Replace Command Union

**Current (Lines 12-21):**
```typescript
export type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "SETUP_AUDIO" }
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number }
  | { type: "RECONNECT_FOR_BLOCK"; blockNumber: number }
  | { type: "COMPLETE_INTERVIEW" };
```

**Replace With:**
```typescript
export type Command =
  | { type: "CONNECT_FOR_BLOCK"; block: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "SETUP_AUDIO" }
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number }
  | { type: "COMPLETE_INTERVIEW" };
```

#### ⚠️ Common Mistakes for This Step

##### Mistake 1: Wrong property name

```typescript
// ❌ WRONG - using blockNumber to match old commands
| { type: "CONNECT_FOR_BLOCK"; blockNumber: number }

// ✅ CORRECT - using 'block' as specified in the spec
| { type: "CONNECT_FOR_BLOCK"; block: number }
```

##### Mistake 2: Leaving old commands

```typescript
// ❌ WRONG - keeping old commands alongside new one
| { type: "CONNECT_FOR_BLOCK"; block: number }
| { type: "START_CONNECTION"; blockNumber: number }  // Should be REMOVED
| { type: "RECONNECT_FOR_BLOCK"; blockNumber: number }  // Should be REMOVED
```

#### ✅ Verification Gate

After this change, TypeScript will show errors in other files - this is expected! We'll fix them in subsequent steps. Just verify the types.ts file itself has no syntax errors:

```bash
npx tsc --noEmit src/app/\[locale\]/\(interview\)/interview/\[interviewId\]/session/types.ts 2>&1 | head -20
```

You'll see errors about missing handlers - that's correct for now.

---

## 📍 Phase 2: Driver Simplification (Est. 20 mins)

This is the most critical phase. We're removing the hidden guard state and merging two methods into one.

### [ ] Step 2.1: Remove Guard Ref Declaration

#### Goal

Remove the `hasInitiatedConnection` ref that acts as a hidden guard.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

#### 🔍 Find This Location

Navigate to **lines 55-60**. You should see:

```typescript
// Line 55
  const wsRef = useRef<WebSocket | null>(null);
// Line 56
  const audioSessionRef = useRef<AudioSession | null>(null);
// Line 57
  const hasInitiatedConnection = useRef(false);
// Line 58
  const connectAttemptsRef = useRef(0);
// Line 59
  const activeConnectionsRef = useRef(0);
// Line 60
  const currentBlockRef = useRef(blockNumber);
```

#### ✏️ Action: Delete Line 57

**Current (Lines 55-60):**
```typescript
  const wsRef = useRef<WebSocket | null>(null);
  const audioSessionRef = useRef<AudioSession | null>(null);
  const hasInitiatedConnection = useRef(false);
  const connectAttemptsRef = useRef(0);
  const activeConnectionsRef = useRef(0);
  const currentBlockRef = useRef(blockNumber);
```

**Replace With:**
```typescript
  const wsRef = useRef<WebSocket | null>(null);
  const audioSessionRef = useRef<AudioSession | null>(null);
  const connectAttemptsRef = useRef(0);
  const activeConnectionsRef = useRef(0);
  const currentBlockRef = useRef(blockNumber);
```

> 💡 **Note:** After this deletion, line numbers in the file shift down by 1. The guide accounts for this.

---

### [ ] Step 2.2: Remove useEffect Sync

#### Goal

Remove the useEffect that syncs `currentBlockRef` with the prop. We'll now set it directly in `connectForBlock`.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

#### 🔍 Find This Location

After deleting line 57, navigate to what is now **lines 61-64**:

```typescript
// Line 61
  // Keep currentBlockRef in sync with prop for reconnection
// Line 62
  useEffect(() => {
// Line 63
    currentBlockRef.current = blockNumber;
// Line 64
  }, [blockNumber]);
```

#### ✏️ Action: Delete Lines 61-64

Remove the entire useEffect block (4 lines including the comment).

---

### [ ] Step 2.3: Update generateToken Mutation

#### Goal

Remove hook-level callbacks from `generateToken` mutation. We'll handle callbacks per-call in `connectForBlock` instead. This enables stale token detection.

#### 🔍 Find This Location

After previous deletions, navigate to approximately **lines 248-257** (was 252-261). Look for:

```typescript
  // Generate token mutation
  const { mutate: generateToken } =
    api.interview.generateWorkerToken.useMutation({
      onSuccess: (data) => {
        connectWebSocket(data.token);
      },
      onError: (err) => {
        events.onConnectionError(err.message);
      },
    });
```

#### ✏️ Action: Remove Callbacks

**Current:**
```typescript
  // Generate token mutation
  const { mutate: generateToken } =
    api.interview.generateWorkerToken.useMutation({
      onSuccess: (data) => {
        connectWebSocket(data.token);
      },
      onError: (err) => {
        events.onConnectionError(err.message);
      },
    });
```

**Replace With:**
```typescript
  // Generate token mutation (callbacks handled per-call in connectForBlock for stale detection)
  const { mutate: generateToken } =
    api.interview.generateWorkerToken.useMutation();
```

---

### [ ] Step 2.4: Remove Old connect() Method

#### Goal

Remove the `connect()` method which had the problematic guard.

#### 🔍 Find This Location

After previous changes, look for the `connect` callback (approximately **lines 259-265**):

```typescript
  // Public: Connect to interview
  const connect = useCallback(() => {
    if (!hasInitiatedConnection.current) {
      hasInitiatedConnection.current = true;
      generateToken({ interviewId, token: guestToken });
    }
  }, [interviewId, guestToken, generateToken]);
```

#### ✏️ Action: Delete This Block

Remove the entire `connect` callback (including the comment).

---

### [ ] Step 2.5: Replace reconnectForBlock() with connectForBlock()

#### Goal

Replace `reconnectForBlock` with the new unified `connectForBlock` method that has no guards.

#### 🔍 Find This Location

Look for `reconnectForBlock` (approximately **lines 299-340**):

```typescript
  // Public: Reconnect for a new block
  const reconnectForBlock = useCallback(
    (newBlockNumber: number) => {
      console.log(
        `[useInterviewSocket] reconnectForBlock(${newBlockNumber}) called`,
      );
      // ... rest of the method
    },
    [interviewId, guestToken, generateToken],
  );
```

#### ✏️ Action: Replace Entire Method

**Replace the entire `reconnectForBlock` callback with:**

```typescript
  // Public: Connect for a specific block (unified method, no guards)
  const connectForBlock = useCallback(
    (block: number) => {
      console.log(`[useInterviewSocket] connectForBlock(${block}) called`);

      // Close existing connection (stale socket guard handles late events)
      if (wsRef.current) {
        console.log(`[useInterviewSocket] Closing existing socket with code 4005`);
        wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
        wsRef.current = null;
      }

      // Set block for URL building (data, not guard)
      currentBlockRef.current = block;

      // Capture target block in closure to detect staleness
      const targetBlock = block;

      // HOT MIC: Keep audio session alive during block transitions
      // Audio chunks will be silently dropped until new socket opens
      // (see the wsRef.current?.readyState check in onAudioData callback)

      // Connect with per-call callbacks (enables stale token detection)
      generateToken(
        { interviewId, token: guestToken },
        {
          onSuccess: (data) => {
            // STALE CHECK: If we moved to a new block while waiting, ABORT.
            if (currentBlockRef.current !== targetBlock) {
              console.log(
                `[Socket] Ignoring stale token for block ${targetBlock} (current: ${currentBlockRef.current})`,
              );
              return;
            }
            connectWebSocket(data.token);
          },
          onError: (err) => {
            events.onConnectionError(err.message);
          },
        },
      );
    },
    [interviewId, guestToken, generateToken, connectWebSocket, events],
  );
```

#### ⚠️ Common Mistakes for This Step

##### Mistake 1: Forgetting to add `events` to dependencies

```typescript
// ❌ WRONG - missing events in dependency array
  }, [interviewId, guestToken, generateToken, connectWebSocket]);

// ✅ CORRECT - events is needed for onError callback
  }, [interviewId, guestToken, generateToken, connectWebSocket, events]);
```

##### Mistake 2: Keeping the hasInitiatedConnection guard

```typescript
// ❌ WRONG - this guard is what caused the bug!
const connectForBlock = useCallback((block: number) => {
  if (!hasInitiatedConnection.current) {
    hasInitiatedConnection.current = true;
    // ...
  }
}, [...]);

// ✅ CORRECT - no guards, just execute
const connectForBlock = useCallback((block: number) => {
  // Immediately close and reconnect, no guards
  wsRef.current?.close(...);
  generateToken(...);
}, [...]);
```

##### Mistake 3: Wrong stale check comparison

```typescript
// ❌ WRONG - comparing to block parameter (always matches)
if (currentBlockRef.current !== block) {

// ✅ CORRECT - comparing to captured targetBlock (detects if block changed during async wait)
const targetBlock = block;
// ... later in onSuccess:
if (currentBlockRef.current !== targetBlock) {
```

---

### [ ] Step 2.6: Update Return Object

#### Goal

Update the hook's return object to expose `connectForBlock` instead of `connect` and `reconnectForBlock`.

#### 🔍 Find This Location

Look for the `useMemo` return statement (near end of file, approximately **lines 355-380**):

```typescript
  return useMemo(
    () => ({
      connect,
      disconnect,
      mute,
      unmute,
      stopAudio,
      isAudioMuted,
      reconnectForBlock,
      debugInfo: {...},
    }),
    [
      connect,
      disconnect,
      mute,
      unmute,
      stopAudio,
      isAudioMuted,
      reconnectForBlock,
    ],
  );
```

#### ✏️ Action: Replace Return Object

**Replace with:**

```typescript
  return useMemo(
    () => ({
      connectForBlock,
      disconnect,
      mute,
      unmute,
      stopAudio,
      isAudioMuted,
      debugInfo: {
        connectAttempts: connectAttemptsRef.current,
        activeConnections: activeConnectionsRef.current,
      },
    }),
    [connectForBlock, disconnect, mute, unmute, stopAudio, isAudioMuted],
  );
```

---

### [ ] Step 2.7: Update Hook Return Type

#### Goal

Update the function signature to reflect the new return type.

#### 🔍 Find This Location

Navigate to **lines 40-54** where the hook function signature is defined:

```typescript
export function useInterviewSocket(
  interviewId: string,
  guestToken: string | undefined,
  blockNumber: number | undefined,
  events: DriverEvents,
): {
  connect: () => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  stopAudio: () => void;
  isAudioMuted: () => boolean;
  reconnectForBlock: (blockNumber: number) => void;
  debugInfo?: { connectAttempts: number; activeConnections: number };
}
```

#### ✏️ Action: Update Return Type

**Replace the return type (lines 45-54) with:**

```typescript
): {
  connectForBlock: (block: number) => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  stopAudio: () => void;
  isAudioMuted: () => boolean;
  debugInfo?: { connectAttempts: number; activeConnections: number };
}
```

#### ✅ Verification Gate

The driver file should now compile without errors (though it won't be used correctly yet):

```bash
npx tsc --noEmit src/app/\[locale\]/\(interview\)/interview/\[interviewId\]/session/useInterviewSocket.ts
```

---

## 📍 Phase 3: Command Executor (Est. 10 mins)

### [ ] Step 3.1: Update Command Handler

#### Goal

Update the command executor to handle `CONNECT_FOR_BLOCK` instead of `START_CONNECTION` and `RECONNECT_FOR_BLOCK`.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts`

#### 🔍 Find This Location

Navigate to **lines 84-132** where `executeCommand` is defined:

```typescript
  const executeCommand = useCallback(
    (cmd: Command) => {
      switch (cmd.type) {
        case "START_CONNECTION":
          driver.connect();
          break;
        // ... other cases
        case "RECONNECT_FOR_BLOCK":
          driver.reconnectForBlock(cmd.blockNumber);
          break;
        // ...
      }
    },
    [driver, interviewId, completeBlock, updateStatus],
  );
```

#### ✏️ Action: Replace Command Cases

**Current switch cases (approximately lines 86-131):**
```typescript
      switch (cmd.type) {
        case "START_CONNECTION":
          driver.connect();
          break;
        case "CLOSE_CONNECTION":
          driver.disconnect();
          break;
        case "MUTE_MIC":
          driver.mute();
          break;
        case "UNMUTE_MIC":
          driver.unmute();
          break;
        case "STOP_AUDIO":
          driver.stopAudio();
          break;
        case "COMPLETE_BLOCK":
          completeBlock.mutate({
            interviewId,
            blockNumber: cmd.blockNumber,
          });
          break;
        case "RECONNECT_FOR_BLOCK":
          driver.reconnectForBlock(cmd.blockNumber);
          break;
        case "COMPLETE_INTERVIEW":
          updateStatus.mutate(
            {
              interviewId,
              status: "COMPLETED",
            },
            {
              onError: (err) => {
                console.error(
                  "[COMPLETE_INTERVIEW] Failed to update status:",
                  err,
                );
              },
            },
          );
          break;
      }
```

**Replace with:**
```typescript
      switch (cmd.type) {
        case "CONNECT_FOR_BLOCK":
          driver.connectForBlock(cmd.block);
          break;
        case "CLOSE_CONNECTION":
          driver.disconnect();
          break;
        case "MUTE_MIC":
          driver.mute();
          break;
        case "UNMUTE_MIC":
          driver.unmute();
          break;
        case "STOP_AUDIO":
          driver.stopAudio();
          break;
        case "COMPLETE_BLOCK":
          completeBlock.mutate({
            interviewId,
            blockNumber: cmd.blockNumber,
          });
          break;
        case "COMPLETE_INTERVIEW":
          updateStatus.mutate(
            {
              interviewId,
              status: "COMPLETED",
            },
            {
              onError: (err) => {
                console.error(
                  "[COMPLETE_INTERVIEW] Failed to update status:",
                  err,
                );
              },
            },
          );
          break;
      }
```

---

### [ ] Step 3.2: Update Auto-Connect on Mount

#### Goal

Update the auto-connect useEffect to use `connectForBlock` instead of `connect`.

#### 🔍 Find This Location

Navigate to **lines 171-175**:

```typescript
  // Auto-connect on mount
  useEffect(() => {
    driver.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - driver.connect() is idempotent
```

#### ✏️ Action: Replace useEffect

**Replace with:**
```typescript
  // Auto-connect on mount
  useEffect(() => {
    driver.connectForBlock(config?.blockNumber ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
```

#### ⚠️ Common Mistakes for This Step

##### Mistake 1: Using wrong block number

```typescript
// ❌ WRONG - using 0-based index
driver.connectForBlock(config?.initialBlockIndex ?? 0);

// ✅ CORRECT - blocks are 1-indexed for the API
driver.connectForBlock(config?.blockNumber ?? 1);
```

#### ✅ Verification Gate

```bash
npx tsc --noEmit src/app/\[locale\]/\(interview\)/interview/\[interviewId\]/session/hooks/useInterviewSession.ts
```

---

## 📍 Phase 4: Reducer Updates (Est. 10 mins)

### [ ] Step 4.1: Update Command Generation

#### Goal

Update the reducer to generate `CONNECT_FOR_BLOCK` instead of `RECONNECT_FOR_BLOCK`.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

#### 🔍 Find This Location

Navigate to **lines 364-375** (in the `BLOCK_COMPLETE_SCREEN` handler):

```typescript
        console.log("[Reducer] >>> TRANSITIONING TO NEXT BLOCK:", nextIdx);
        // Go through WAITING_FOR_CONNECTION to avoid race conditions
        // CONNECTION_ESTABLISHED will auto-transition to ANSWERING with fresh timestamps
        return {
          state: {
            ...state,
            status: "WAITING_FOR_CONNECTION",
            targetBlockIndex: nextIdx,
            connectionState: "connecting",
          },
          commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }],
        };
```

#### ✏️ Action: Update Command

**Current (line 374):**
```typescript
          commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }],
```

**Replace With:**
```typescript
          commands: [{ type: "CONNECT_FOR_BLOCK", block: nextIdx + 1 }],
```

---

### [ ] Step 4.2: Remove Stale Comment

#### Goal

Remove the outdated comment that references `RECONNECT_FOR_BLOCK`.

#### 🔍 Find This Location

Navigate to **lines 139-143** (in the `CONNECTION_ESTABLISHED` handler):

```typescript
          // Note: No commands needed here. For initial connection, the driver.connect()
          // is already called by useEffect. For block transitions, RECONNECT_FOR_BLOCK
          // already initiated the connection. Generating START_CONNECTION here would
          // cause a duplicate connect() call that triggers a second generateToken.
          commands: [],
```

#### ✏️ Action: Update Comment

**Replace the comment (lines 139-142) with:**
```typescript
          // No commands needed - connection was already initiated by
          // driver.connectForBlock() via useEffect (initial) or CONNECT_FOR_BLOCK (transitions)
          commands: [],
```

#### ✅ Verification Gate

```bash
npx tsc --noEmit src/app/\[locale\]/\(interview\)/interview/\[interviewId\]/session/reducer.ts
```

---

## 📍 Phase 5: Update Tests (Est. 15 mins)

### [ ] Step 5.1: Update session-reducer.test.ts

#### Goal

Update all test expectations from `RECONNECT_FOR_BLOCK` to `CONNECT_FOR_BLOCK`.

#### 📁 File

`src/test/unit/session-reducer.test.ts`

#### ✏️ Action: Find and Replace

Use find and replace in your editor:

| Find | Replace |
|------|---------|
| `type: "RECONNECT_FOR_BLOCK"` | `type: "CONNECT_FOR_BLOCK"` |
| `blockNumber:` (in RECONNECT_FOR_BLOCK context) | `block:` |

**Specific locations to update (12 occurrences):**

1. **Line 356** - in answer timeout test:
```typescript
// BEFORE
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2,

// AFTER
        type: "CONNECT_FOR_BLOCK",
        block: 2,
```

2. **Lines 406, 432** - in "emit RECONNECT_FOR_BLOCK" test:
```typescript
// BEFORE
    it("should emit RECONNECT_FOR_BLOCK when advancing to next block", () => {
      // ...
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2,

// AFTER
    it("should emit CONNECT_FOR_BLOCK when advancing to next block", () => {
      // ...
        type: "CONNECT_FOR_BLOCK",
        block: 2,
```

3. **Line 437** - test name update:
```typescript
// BEFORE
    it("should NOT emit RECONNECT_FOR_BLOCK when finishing last block", () => {

// AFTER
    it("should NOT emit CONNECT_FOR_BLOCK when finishing last block", () => {
```

4. **Line 459** - in "NOT emit" test:
```typescript
// BEFORE
        expect.objectContaining({ type: "RECONNECT_FOR_BLOCK" }),

// AFTER
        expect.objectContaining({ type: "CONNECT_FOR_BLOCK" }),
```

5. **Lines 958** - in block transition test:
```typescript
// BEFORE
          type: "RECONNECT_FOR_BLOCK",
          blockNumber: 2,

// AFTER
          type: "CONNECT_FOR_BLOCK",
          block: 2,
```

Also update comments that reference `START_CONNECTION` or `RECONNECT_FOR_BLOCK`:

6. **Lines 72-73, 97, 726, 985, 1388** - update comments:
```typescript
// BEFORE
      // No START_CONNECTION command - the connection was already initiated by
      // driver.connect() (initial) or RECONNECT_FOR_BLOCK (block transitions)

// AFTER
      // No commands - connection was already initiated by driver.connectForBlock()
```

---

### [ ] Step 5.2: Update session-golden-path.test.ts

#### Goal

Update golden path test expectations.

#### 📁 File

`src/test/unit/session-golden-path.test.ts`

#### ✏️ Action: Update Test Expectations

**Line 70** - update comment:
```typescript
// BEFORE
    // Note: No START_CONNECTION command - the connection was already initiated by driver.connect()

// AFTER
    // Note: No commands - connection was already initiated by driver.connectForBlock()
```

**Lines 150-153** - update assertion:
```typescript
// BEFORE
    // Verify RECONNECT_FOR_BLOCK command was generated
    expect(result.commands).toContainEqual({
      type: "RECONNECT_FOR_BLOCK",
      blockNumber: 2,
    });

// AFTER
    // Verify CONNECT_FOR_BLOCK command was generated
    expect(result.commands).toContainEqual({
      type: "CONNECT_FOR_BLOCK",
      block: 2,
    });
```

**Lines 253-254** - update comment:
```typescript
// BEFORE
    // Note: No START_CONNECTION commands - connections are initiated by
    // driver.connect() (initial) or RECONNECT_FOR_BLOCK (block transitions)

// AFTER
    // Note: No commands - connections are initiated by driver.connectForBlock()
```

#### ✅ Verification Gate

Run the tests to verify all updates are correct:

```bash
pnpm test -- --grep "session-reducer"
pnpm test -- --grep "session-golden-path"
```

**Expected Result:** All tests should pass.

---

## 📍 Phase 6: Documentation Updates (Est. 5 mins)

### [ ] Step 6.1: Update README.md

#### Goal

Update the session README to document the new command.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/README.md`

#### 🔍 Find This Location

Navigate to **lines 227-234** where commands are documented:

```typescript
// Commands (side effects to execute)
type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "STOP_AUDIO" }
```

#### ✏️ Action: Update Command Documentation

**Replace with:**
```typescript
// Commands (side effects to execute)
type Command =
  | { type: "CONNECT_FOR_BLOCK"; block: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number }
  | { type: "COMPLETE_INTERVIEW" }
```

Also update **line 308** where driver methods are listed:

```typescript
// BEFORE
- Exposes methods: `connect()`, `disconnect()`, `mute()`, `unmute()`, `stopAudio()`

// AFTER
- Exposes methods: `connectForBlock()`, `disconnect()`, `mute()`, `unmute()`, `stopAudio()`
```

---

## 🎯 Final Success Criteria

Before submitting your PR, verify the following:

- [ ] **Functional**: Complete a 2+ block interview successfully in development
- [ ] **No Race Condition**: Block transitions don't trigger double `generateToken()` calls
- [ ] **Technical**: `pnpm check` passes with zero errors
- [ ] **Coverage**: All tests pass (`pnpm test`)

### Final Verification Commands

```bash
# 1. Type check
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Run all tests
pnpm test

# 4. Full check suite
pnpm check
```

---

## 🔍 Troubleshooting

### Error: "Property 'connect' does not exist on type"

**Cause**: You haven't updated all references to the old `connect` method.

**Fix**: Search for `driver.connect` and replace with `driver.connectForBlock(...)`.

### Error: "Property 'reconnectForBlock' does not exist on type"

**Cause**: Old method reference in command executor.

**Fix**: Update the switch case in `useInterviewSession.ts` to use `CONNECT_FOR_BLOCK`.

### Error: "Type '"RECONNECT_FOR_BLOCK"' is not assignable"

**Cause**: Old command type still being used.

**Fix**: Find and replace `RECONNECT_FOR_BLOCK` with `CONNECT_FOR_BLOCK` and update the property from `blockNumber` to `block`.

### Error: "Cannot find name 'hasInitiatedConnection'"

**Cause**: The guard ref was deleted but some code still references it.

**Fix**: This is expected if you're in the middle of changes. Make sure you've:
1. Removed the ref declaration
2. Removed the `connect()` method that used it
3. Replaced `reconnectForBlock()` with `connectForBlock()`

### Tests fail with "expected RECONNECT_FOR_BLOCK"

**Cause**: Test expectations not updated.

**Fix**: Update test files as described in Phase 5.

---

## ✅ Pre-Submission Checklist

Before creating your pull request:

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm lint`
- [ ] Only modified files listed in this guide
- [ ] No `console.log` statements added (existing logs are fine)
- [ ] Branch is rebased on latest main
- [ ] Commit messages are clear

### Files Changed

Verify your changes match this list exactly:

| File | Status |
|------|--------|
| `src/app/.../session/types.ts` | Modified |
| `src/app/.../session/useInterviewSocket.ts` | Modified |
| `src/app/.../session/hooks/useInterviewSession.ts` | Modified |
| `src/app/.../session/reducer.ts` | Modified |
| `src/app/.../session/README.md` | Modified |
| `src/test/unit/session-reducer.test.ts` | Modified |
| `src/test/unit/session-golden-path.test.ts` | Modified |

Run `git status` to verify. If you modified other files, **undo those changes**.

---

## Acceptance Criteria

The implementation is complete when the following tests pass:

- `src/test/unit/session-reducer.test.ts` - Validates reducer generates correct CONNECT_FOR_BLOCK commands instead of START_CONNECTION and RECONNECT_FOR_BLOCK
- `src/test/unit/session-golden-path.test.ts` - Validates complete session flow using unified connection command
- `src/test/integration/block-interview-golden-path.test.ts` - Validates end-to-end block interview flow (existing integration tests should continue passing with no changes)

All tests should pass after updating command types and expectations as specified in Phase 5.

---

## 🆘 Getting Help

If you're stuck after:

1. Re-reading the step instructions
2. Checking "Common Mistakes"
3. Looking at "Troubleshooting"
4. Verifying line numbers (they may have shifted from earlier edits)

Then ask your mentor with:

- Which step you're on
- The exact error message (full text)
- What you've tried
- The relevant code snippet
