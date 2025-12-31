# Implementation Guide: Block Session Isolation

**Based on Spec**: `FEAT36_block_session_isolation.md`
**Verification Report**: `FEAT36_verification_report.md`
**Generated**: 2025-12-30
**Estimated Total Time**: 2-3 hours

---

## 📋 Overview

### What You're Building

You're fixing a bug where multi-block interviews end prematurely. Currently, all blocks share a single Durable Object (DO), so the timeout set in block 1 fires during block 2 and terminates the interview. The fix creates a separate DO for each block.

### 💡 Core Concept (The "North Star")

**"The Reducer is the Brain. The Driver is the Hardware."**

- **Reducer**: Pure state machine that decides *what* should happen and emits commands
- **Driver (useInterviewSocket)**: Dumb I/O layer that executes commands (WebSocket, audio)
- **Hook (useInterviewSession)**: Glue that connects reducer commands to driver methods

When the user clicks "Continue" to start block 2, the reducer emits a `RECONNECT_FOR_BLOCK` command. The hook sees this command and calls `driver.reconnectForBlock(2)`, which closes the old WebSocket and opens a new one with `?block=2`. This hits a *different* DO keyed by `interviewId_block2`.

### Deliverables

After completing this guide, you will have:

- [ ] Worker routes blocks to separate Durable Objects (`interviewId_block1`, `interviewId_block2`, etc.)
- [ ] Client reconnects to a new DO when transitioning between blocks
- [ ] Each block has its own independent timeout timer
- [ ] All existing tests pass + new tests for reconnection logic

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `worker/src/index.ts` | Modify | Key DO by `interviewId_block${blockNumber}` |
| `src/.../session/types.ts` | Modify | Add `RECONNECT_FOR_BLOCK` command |
| `src/.../session/reducer.ts` | Modify | Emit reconnect command on block transition |
| `src/.../session/useInterviewSocket.ts` | Modify | Add `reconnectForBlock()` method |
| `src/.../session/hooks/useInterviewSession.ts` | Modify | Handle `RECONNECT_FOR_BLOCK` command |

### ⛔ Out of Scope - DO NOT MODIFY

These files/areas are **not part of this task**:

- `worker/src/gemini-session.ts` - The DO lifecycle logic doesn't need changes
- `prisma/schema.prisma` - No database changes needed
- Any UI components - The state machine handles transitions automatically
- Error handling or retry logic - Build the minimal fix first (KISS)

If you think something outside this scope needs changing, **stop and ask**.

---

## 🔧 Prerequisites

### 1. Environment Setup

```bash
# Verify you're in the project root
pwd
# Should show: /Users/.../preppal

# Install dependencies
pnpm install

# Verify the project builds
pnpm check
```

### 2. Verify Tests Pass

```bash
pnpm test
```

✅ **All tests should pass before you start.** If tests fail, **stop and report the issue**.

### 3. Create Your Branch

```bash
git checkout feat/interview-templates
git pull origin feat/interview-templates
```

---

## 📍 Phase 1: Worker (DO Keying) (Est. 15 mins)

### [ ] Step 1.1: Update Durable Object Key

#### Goal

Change the DO instantiation to include block number, so each block gets its own isolated DO instance with its own timeout.

#### 📁 File

`worker/src/index.ts`

#### 🔍 Find This Location

Open the file and navigate to **line 91**. You should see:

```typescript
// Line 89
        }

// Line 90
        // Create or get Durable Object instance using interviewId
// Line 91
        const id = env.GEMINI_SESSION.idFromName(interviewId);
// Line 92
        const stub = env.GEMINI_SESSION.get(id);
```

#### ✏️ Action: Replace Code Block

**Current (Lines 90-92):**
```typescript
        // Create or get Durable Object instance using interviewId
        const id = env.GEMINI_SESSION.idFromName(interviewId);
        const stub = env.GEMINI_SESSION.get(id);
```

**Replace With:**
```typescript
        // Validate block number if present (must be positive integer)
        const block = url.searchParams.get("block") ?? "1";
        const blockNum = parseInt(block, 10);
        if (isNaN(blockNum) || blockNum < 1) {
          return new Response("Invalid block number", { status: 400 });
        }

        // Create or get Durable Object instance using interviewId + block
        // Each block gets its own DO with independent timeout timer
        const id = env.GEMINI_SESSION.idFromName(`${interviewId}_block${block}`);
        const stub = env.GEMINI_SESSION.get(id);
```

#### ⚠️ Common Mistakes for This Step

##### Mistake 1: Forgetting default block value

```typescript
// ❌ WRONG - crashes if block param is missing
const block = url.searchParams.get("block");
const id = env.GEMINI_SESSION.idFromName(`${interviewId}_block${block}`);
// Results in: interviewId_blocknull

// ✅ CORRECT - default to "1" for backwards compatibility
const block = url.searchParams.get("block") ?? "1";
```

##### Mistake 2: Using blockNum in the string instead of block

```typescript
// ❌ WRONG - loses leading zeros (if any)
const id = env.GEMINI_SESSION.idFromName(`${interviewId}_block${blockNum}`);

// ✅ CORRECT - use the original string
const id = env.GEMINI_SESSION.idFromName(`${interviewId}_block${block}`);
```

#### ✅ Verification Gate

Test the worker manually:

```bash
# Start the worker
pnpm dev:worker

# In another terminal, test invalid block
curl -i "http://localhost:8787/test-interview?block=invalid"
# Should return: 400 Invalid block number

curl -i "http://localhost:8787/test-interview?block=0"
# Should return: 400 Invalid block number

curl -i "http://localhost:8787/test-interview?block=-1"
# Should return: 400 Invalid block number
```

---

## 📍 Phase 2: Types (Est. 5 mins)

### [ ] Step 2.1: Add RECONNECT_FOR_BLOCK Command

#### Goal

Define the new command type that the reducer will emit when transitioning between blocks.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

#### 🔍 Find This Location

Open the file and navigate to **lines 12-19**. You should see the `Command` type:

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
  | { type: "COMPLETE_BLOCK"; blockNumber: number };
```

#### ✏️ Action: Add New Command Variant

**Current (Lines 12-19):**
```typescript
export type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "SETUP_AUDIO" }
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number };
```

**Replace With:**
```typescript
export type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "SETUP_AUDIO" }
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number }
  | { type: "RECONNECT_FOR_BLOCK"; blockNumber: number };
```

#### ⚠️ Common Mistakes for This Step

##### Mistake 1: Missing semicolon or pipe

```typescript
// ❌ WRONG - missing pipe
  | { type: "COMPLETE_BLOCK"; blockNumber: number }
    { type: "RECONNECT_FOR_BLOCK"; blockNumber: number };

// ✅ CORRECT - pipe before new variant
  | { type: "COMPLETE_BLOCK"; blockNumber: number }
  | { type: "RECONNECT_FOR_BLOCK"; blockNumber: number };
```

#### ✅ Verification Gate

```bash
pnpm typecheck
```

No errors should appear.

---

## 📍 Phase 3: Reducer (Est. 20 mins)

### [ ] Step 3.1: Emit RECONNECT_FOR_BLOCK on Block Transition

#### Goal

When the user clicks "Continue" on the block complete screen, emit a `RECONNECT_FOR_BLOCK` command so the driver reconnects to the new block's DO.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

#### 🔍 Find This Location

Open the file and navigate to **lines 228-251**. You should see the `BLOCK_COMPLETE_SCREEN` handler:

```typescript
// Line 228
    case "BLOCK_COMPLETE_SCREEN":
// Line 229
      if (event.type === "USER_CLICKED_CONTINUE") {
// Line 230
        const nextIdx = state.completedBlockIndex + 1;
// Line 231
        if (nextIdx >= context.totalBlocks) {
// Line 232
          return {
// Line 233
            state: {
// Line 234
              ...state,
// Line 235
              status: "INTERVIEW_COMPLETE",
// Line 236
            },
// Line 237
            commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
// Line 238
          };
// Line 239
        }
// Line 240
        return {
// Line 241
          state: {
// Line 242
            ...state,
// Line 243
            status: "ANSWERING",
// Line 244
            blockIndex: nextIdx,
// Line 245
            blockStartTime: now,
// Line 246
            answerStartTime: now,
// Line 247
          },
// Line 248
          commands: [],
// Line 249
        };
// Line 250
      }
// Line 251
      return { state, commands: [] };
```

#### ✏️ Action: Add RECONNECT_FOR_BLOCK Command

**Current (Lines 240-249):**
```typescript
        return {
          state: {
            ...state,
            status: "ANSWERING",
            blockIndex: nextIdx,
            blockStartTime: now,
            answerStartTime: now,
          },
          commands: [],
        };
```

**Replace With:**
```typescript
        return {
          state: {
            ...state,
            status: "ANSWERING",
            blockIndex: nextIdx,
            blockStartTime: now,
            answerStartTime: now,
          },
          commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }],
        };
```

#### ⚠️ Common Mistakes for This Step

##### Mistake 1: Using nextIdx instead of nextIdx + 1

```typescript
// ❌ WRONG - nextIdx is 0-indexed, but block numbers are 1-indexed
commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx }],
// If nextIdx is 1 (second block), this sends blockNumber: 1 (first block!)

// ✅ CORRECT - add 1 to convert to 1-indexed block number
commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }],
// If nextIdx is 1, this correctly sends blockNumber: 2
```

##### Mistake 2: Emitting command for last block

The current code already handles this correctly - if `nextIdx >= context.totalBlocks`, it returns `INTERVIEW_COMPLETE` instead. The reconnect command is only emitted when there ARE more blocks.

#### ✅ Verification Gate

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

All tests should pass. (We'll add a specific test for this in Phase 5.)

---

## 📍 Phase 4: Driver (Est. 30 mins)

### [ ] Step 4.1: Add Block Ref and reconnectForBlock Method

#### Goal

Add a `reconnectForBlock()` method that closes the current WebSocket and opens a new one to the next block's DO.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

#### 🔍 Find This Location (Part A: Add Ref)

Navigate to **lines 37-41**. You should see the existing refs:

```typescript
// Line 37
  const wsRef = useRef<WebSocket | null>(null);
// Line 38
  const audioSessionRef = useRef<AudioSession | null>(null);
// Line 39
  const hasInitiatedConnection = useRef(false);
// Line 40
  const connectAttemptsRef = useRef(0);
// Line 41
  const activeConnectionsRef = useRef(0);
```

#### ✏️ Action: Add currentBlockRef

**Current (Lines 37-41):**
```typescript
  const wsRef = useRef<WebSocket | null>(null);
  const audioSessionRef = useRef<AudioSession | null>(null);
  const hasInitiatedConnection = useRef(false);
  const connectAttemptsRef = useRef(0);
  const activeConnectionsRef = useRef(0);
```

**Replace With:**
```typescript
  const wsRef = useRef<WebSocket | null>(null);
  const audioSessionRef = useRef<AudioSession | null>(null);
  const hasInitiatedConnection = useRef(false);
  const connectAttemptsRef = useRef(0);
  const activeConnectionsRef = useRef(0);
  const currentBlockRef = useRef(blockNumber);
```

---

#### 🔍 Find This Location (Part B: Sync Ref with Prop)

Navigate to **line 43** where `transcriptManagerRef` is declared:

```typescript
// Line 43
  const transcriptManagerRef = useRef<TranscriptManager | null>(null);
// Line 44
// Line 45
  // Initialize TranscriptManager
```

#### ✏️ Action: Add Effect to Sync Block Ref

Insert the following **after line 42** (after the refs, before transcriptManagerRef):

```typescript
  // Keep currentBlockRef in sync with prop for reconnection
  useEffect(() => {
    currentBlockRef.current = blockNumber;
  }, [blockNumber]);

```

**Note:** After this insertion, the code should look like:

```typescript
  const currentBlockRef = useRef(blockNumber);

  // Keep currentBlockRef in sync with prop for reconnection
  useEffect(() => {
    currentBlockRef.current = blockNumber;
  }, [blockNumber]);

  const transcriptManagerRef = useRef<TranscriptManager | null>(null);
```

---

#### 🔍 Find This Location (Part C: Update connectWebSocket)

Navigate to **lines 126-128** inside `connectWebSocket`:

```typescript
// Line 126
      const wsUrl = blockNumber
// Line 127
        ? `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}&block=${blockNumber}`
// Line 128
        : `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;
```

#### ✏️ Action: Use currentBlockRef Instead of Prop

**Current (Lines 126-128):**
```typescript
      const wsUrl = blockNumber
        ? `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}&block=${blockNumber}`
        : `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;
```

**Replace With:**
```typescript
      const wsUrl = currentBlockRef.current
        ? `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}&block=${currentBlockRef.current}`
        : `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;
```

---

#### 🔍 Find This Location (Part D: Add reconnectForBlock Method)

Navigate to **lines 268-274** where `stopAudio` is defined:

```typescript
// Line 268
  // Public: Stop audio session
// Line 269
  const stopAudio = useCallback(() => {
// Line 270
    console.log("[useInterviewSocket] stopAudio() called");
// Line 271
    audioSessionRef.current?.stop();
// Line 272
    audioSessionRef.current = null;
// Line 273
    console.log("[useInterviewSocket] stopAudio() completed");
// Line 274
  }, []);
```

#### ✏️ Action: Add reconnectForBlock Method

Insert the following **after line 274** (after `stopAudio`, before the cleanup effect):

```typescript

  // Public: Reconnect for a new block
  const reconnectForBlock = useCallback(
    (newBlockNumber: number) => {
      console.log(
        `[useInterviewSocket] reconnectForBlock(${newBlockNumber}) called`,
      );

      // Update block ref for the new connection URL
      currentBlockRef.current = newBlockNumber;

      // Close existing WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Stop current audio session (new one will start on connection)
      audioSessionRef.current?.stop();
      audioSessionRef.current = null;

      // Reset connection guard so generateToken triggers a new connection
      hasInitiatedConnection.current = false;

      // Trigger new connection with updated block number
      generateToken({ interviewId, token: guestToken });
    },
    [interviewId, guestToken, generateToken],
  );

```

---

#### 🔍 Find This Location (Part E: Export reconnectForBlock)

Navigate to **lines 289-302** where the return object is defined:

```typescript
// Line 289
  return useMemo(
// Line 290
    () => ({
// Line 291
      connect,
// Line 292
      disconnect,
// Line 293
      mute,
// Line 294
      unmute,
// Line 295
      stopAudio,
// Line 296
      isAudioMuted,
// Line 297
      debugInfo: {
// Line 298
        connectAttempts: connectAttemptsRef.current,
// Line 299
        activeConnections: activeConnectionsRef.current,
// Line 300
      },
// Line 301
    }),
// Line 302
    [connect, disconnect, mute, unmute, stopAudio, isAudioMuted],
```

#### ✏️ Action: Add reconnectForBlock to Return Object

**Current (Lines 290-302):**
```typescript
    () => ({
      connect,
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
    [connect, disconnect, mute, unmute, stopAudio, isAudioMuted],
```

**Replace With:**
```typescript
    () => ({
      connect,
      disconnect,
      mute,
      unmute,
      stopAudio,
      isAudioMuted,
      reconnectForBlock,
      debugInfo: {
        connectAttempts: connectAttemptsRef.current,
        activeConnections: activeConnectionsRef.current,
      },
    }),
    [connect, disconnect, mute, unmute, stopAudio, isAudioMuted, reconnectForBlock],
```

---

#### 🔍 Find This Location (Part F: Update Return Type)

Navigate to **lines 28-36** where the return type is defined:

```typescript
// Line 28
): {
// Line 29
  connect: () => void;
// Line 30
  disconnect: () => void;
// Line 31
  mute: () => void;
// Line 32
  unmute: () => void;
// Line 33
  stopAudio: () => void;
// Line 34
  isAudioMuted: () => boolean;
// Line 35
  debugInfo?: { connectAttempts: number; activeConnections: number };
// Line 36
} {
```

#### ✏️ Action: Add reconnectForBlock to Return Type

**Current (Lines 28-36):**
```typescript
): {
  connect: () => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  stopAudio: () => void;
  isAudioMuted: () => boolean;
  debugInfo?: { connectAttempts: number; activeConnections: number };
} {
```

**Replace With:**
```typescript
): {
  connect: () => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  stopAudio: () => void;
  isAudioMuted: () => boolean;
  reconnectForBlock: (blockNumber: number) => void;
  debugInfo?: { connectAttempts: number; activeConnections: number };
} {
```

#### ⚠️ Common Mistakes for This Step

##### Mistake 1: Forgetting to reset hasInitiatedConnection

```typescript
// ❌ WRONG - generateToken won't fire because guard is still true
const reconnectForBlock = useCallback((newBlockNumber: number) => {
  currentBlockRef.current = newBlockNumber;
  wsRef.current?.close();
  generateToken({ interviewId, token: guestToken });
  // hasInitiatedConnection is still true, so this is a no-op!
}, []);

// ✅ CORRECT - reset the guard so generateToken works
hasInitiatedConnection.current = false;
generateToken({ interviewId, token: guestToken });
```

##### Mistake 2: Not stopping audio before reconnect

```typescript
// ❌ WRONG - old audio session keeps running
const reconnectForBlock = useCallback((newBlockNumber: number) => {
  currentBlockRef.current = newBlockNumber;
  wsRef.current?.close();
  hasInitiatedConnection.current = false;
  generateToken({ interviewId, token: guestToken });
  // Old audio session is still running and might conflict!
}, []);

// ✅ CORRECT - stop audio cleanly
audioSessionRef.current?.stop();
audioSessionRef.current = null;
```

##### Mistake 3: Missing dependencies in useCallback

```typescript
// ❌ WRONG - stale closures
const reconnectForBlock = useCallback((newBlockNumber: number) => {
  generateToken({ interviewId, token: guestToken });
}, []); // Missing dependencies!

// ✅ CORRECT - include all dependencies
const reconnectForBlock = useCallback((newBlockNumber: number) => {
  generateToken({ interviewId, token: guestToken });
}, [interviewId, guestToken, generateToken]);
```

#### ✅ Verification Gate

```bash
pnpm typecheck
```

No errors should appear.

---

## 📍 Phase 5: Hook (Command Handler) (Est. 10 mins)

### [ ] Step 5.1: Handle RECONNECT_FOR_BLOCK Command

#### Goal

Wire up the command executor to call `driver.reconnectForBlock()` when the reducer emits a `RECONNECT_FOR_BLOCK` command.

#### 📁 File

`src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts`

#### 🔍 Find This Location

Navigate to **lines 80-108** where `executeCommand` is defined:

```typescript
// Line 80
  // Command executor
// Line 81
  const executeCommand = useCallback(
// Line 82
    (cmd: Command) => {
// Line 83
      switch (cmd.type) {
// Line 84
        case "START_CONNECTION":
// Line 85
          driver.connect();
// Line 86
          break;
// Line 87
        case "CLOSE_CONNECTION":
// Line 88
          driver.disconnect();
// Line 89
          break;
// Line 90
        case "MUTE_MIC":
// Line 91
          driver.mute();
// Line 92
          break;
// Line 93
        case "UNMUTE_MIC":
// Line 94
          driver.unmute();
// Line 95
          break;
// Line 96
        case "STOP_AUDIO":
// Line 97
          driver.stopAudio();
// Line 98
          break;
// Line 99
        case "COMPLETE_BLOCK":
// Line 100
          completeBlock.mutate({
// Line 101
            interviewId,
// Line 102
            blockNumber: cmd.blockNumber,
// Line 103
          });
// Line 104
          break;
// Line 105
      }
// Line 106
    },
// Line 107
    [driver, interviewId, completeBlock],
// Line 108
  );
```

#### ✏️ Action: Add RECONNECT_FOR_BLOCK Case

**Current (Lines 99-105):**
```typescript
        case "COMPLETE_BLOCK":
          completeBlock.mutate({
            interviewId,
            blockNumber: cmd.blockNumber,
          });
          break;
      }
```

**Replace With:**
```typescript
        case "COMPLETE_BLOCK":
          completeBlock.mutate({
            interviewId,
            blockNumber: cmd.blockNumber,
          });
          break;
        case "RECONNECT_FOR_BLOCK":
          driver.reconnectForBlock(cmd.blockNumber);
          break;
      }
```

#### ⚠️ Common Mistakes for This Step

##### Mistake 1: Forgetting the break statement

```typescript
// ❌ WRONG - falls through to next case (if any)
case "RECONNECT_FOR_BLOCK":
  driver.reconnectForBlock(cmd.blockNumber);
// Missing break!

// ✅ CORRECT
case "RECONNECT_FOR_BLOCK":
  driver.reconnectForBlock(cmd.blockNumber);
  break;
```

#### ✅ Verification Gate

```bash
pnpm typecheck
pnpm test
```

All tests should pass.

---

## 📍 Phase 6: Tests (Est. 30 mins)

### [ ] Step 6.1: Add Reducer Test for Block Transition

#### Goal

Add a unit test verifying that the reducer emits `RECONNECT_FOR_BLOCK` when transitioning between blocks.

#### 📁 File

`src/test/unit/session-reducer.test.ts`

#### 🔍 Find This Location

Search for `USER_CLICKED_CONTINUE` in the file. Find the test block for block transitions (around line 200+). Look for a describe block like:

```typescript
describe("BLOCK_COMPLETE_SCREEN", () => {
```

#### ✏️ Action: Add Test Case

Find the existing tests for `BLOCK_COMPLETE_SCREEN` and add this test:

```typescript
    it("should emit RECONNECT_FOR_BLOCK when advancing to next block", () => {
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        connectionState: "live",
        transcript: [],
        elapsedTime: 60,
        error: null,
        isAiSpeaking: false,
      };

      const context: ReducerContext = {
        answerTimeLimit: 60,
        totalBlocks: 3,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
      );

      expect(result.state.status).toBe("ANSWERING");
      expect(result.state.blockIndex).toBe(1);
      expect(result.commands).toContainEqual({
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2, // blockIndex 1 + 1 = blockNumber 2
      });
    });

    it("should NOT emit RECONNECT_FOR_BLOCK when finishing last block", () => {
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 2, // Last block (0-indexed)
        connectionState: "live",
        transcript: [],
        elapsedTime: 180,
        error: null,
        isAiSpeaking: false,
      };

      const context: ReducerContext = {
        answerTimeLimit: 60,
        totalBlocks: 3, // 3 blocks: 0, 1, 2
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).not.toContainEqual(
        expect.objectContaining({ type: "RECONNECT_FOR_BLOCK" }),
      );
    });
```

#### ✅ Verification Gate

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

All tests should pass, including the new ones.

---

## 🎯 Final Success Criteria

Before submitting your PR, verify the following:

- [ ] **Functional**: Multi-block interviews complete all blocks without premature termination
- [ ] **Block Isolation**: Each block's timeout is independent (block 1 timeout doesn't affect block 2)
- [ ] **WebSocket**: New WebSocket connects to correct DO (`interviewId_block2`, etc.)
- [ ] **Backwards Compatible**: Single-block interviews still work (default `?block=1`)
- [ ] **Technical**: `pnpm check` passes with zero errors

---

## 🔍 Troubleshooting

### Error: "Property 'reconnectForBlock' does not exist on type..."

**Cause**: The return type wasn't updated in `useInterviewSocket.ts`

**Fix**: Verify you added `reconnectForBlock: (blockNumber: number) => void;` to the return type on lines 28-36

### Error: "Cannot find name 'currentBlockRef'"

**Cause**: The ref wasn't declared at the top of the hook

**Fix**: Verify you added `const currentBlockRef = useRef(blockNumber);` after the other refs on line 42

### Error: Tests fail with "expected RECONNECT_FOR_BLOCK but got empty commands"

**Cause**: Reducer change wasn't made correctly

**Fix**: Verify you changed `commands: []` to `commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }]` on line 248

### WebSocket connects to wrong block

**Cause**: `connectWebSocket` is still using the `blockNumber` prop instead of `currentBlockRef.current`

**Fix**: Verify you changed `blockNumber` to `currentBlockRef.current` on lines 126-128

### Block 2 starts but immediately ends

**Cause**: Worker is still using old DO key (without block)

**Fix**: Verify the worker change at line 91 includes `_block${block}` in the `idFromName()` call

---

## ✅ Pre-Submission Checklist

Before creating your pull request:

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm check`
- [ ] Only modified files listed in this guide
- [ ] Commit messages are clear
- [ ] Manual test: Start a multi-block interview and complete all blocks

### Files Changed

Verify your changes match this list exactly:

| File | Status |
|------|--------|
| `worker/src/index.ts` | Modified |
| `src/.../session/types.ts` | Modified |
| `src/.../session/reducer.ts` | Modified |
| `src/.../session/useInterviewSocket.ts` | Modified |
| `src/.../session/hooks/useInterviewSession.ts` | Modified |
| `src/test/unit/session-reducer.test.ts` | Modified |

Run `git status` to verify. If you modified other files, **undo those changes**.

---

## 🆘 Getting Help

If you're stuck after:

1. Re-reading the step instructions
2. Checking "Common Mistakes"
3. Looking at "Troubleshooting"
4. Verifying line numbers (they may have shifted)

Then ask your mentor with:

- Which step you're on
- The exact error message (full text)
- What you've tried
- The relevant code snippet

---

## Acceptance Criteria

The implementation is complete when the following unit tests pass:

- `src/test/unit/session-reducer.test.ts` - Validates that the reducer correctly emits the `RECONNECT_FOR_BLOCK` command when advancing to the next block, and does NOT emit it when completing the final block. These tests ensure the core business logic of block session isolation is correct.

Run the tests with:
```bash
pnpm test src/test/unit/session-reducer.test.ts
```

Expected outcome: All 33 tests pass (currently 1 failing until implementation is complete).
