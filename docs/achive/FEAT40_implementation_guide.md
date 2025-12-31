# Implementation Guide: Unified Block Isolation Strategy

**Based on Spec**: `docs/todo/FEAT40_unified_block_isolation.md`
**Verification Report**: `docs/todo/FEAT40_verification_report.md`
**Generated**: 2025-12-31
**Estimated Total Time**: 4-5 hours

---

## Overview

### What You're Building

You're fixing critical stability issues in block-based interviews. Currently, when users transition between interview blocks (questions), the system has race conditions, stale socket events, and unnecessary microphone restarts. This implementation ensures each block is cleanly isolated and transitions are smooth.

### Core Concept (The "North Star")

**"The Reducer is the Brain. The Driver is the Hardware. One Guard is Sufficient."**

```
┌─────────────────────────────────────────────────────────────────┐
│ REDUCER (Brain)                                                 │
│  - Makes ALL business decisions                                 │
│  - Determines what state to transition to                       │
│  - Emits commands for the driver to execute                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DRIVER (Hardware)                                               │
│  - Manages WebSocket and Audio                                  │
│  - Fires events UPWARD (never interprets them)                  │
│  - Filters ONLY stale socket events (wsRef.current !== ws)      │
│  - "Dumb pipe" - no business logic                              │
└─────────────────────────────────────────────────────────────────┘
```

**The Single Guard Principle**: The driver's stale socket check (`wsRef.current !== ws`) is the ONLY filter. The reducer must handle ALL events that pass this guard - including connection failures during reconnection.

### Deliverables

After completing this guide, you will have:

- [ ] A new `WS_CLOSE_BLOCK_RECONNECT = 4005` constant for debugging
- [ ] Stale socket guard in the driver that filters old socket events
- [ ] Simplified `onclose` handler that always emits (no interpretation)
- [ ] Audio that stays alive during block transitions ("hot mic")
- [ ] State machine that properly handles block transitions via `WAITING_FOR_CONNECTION`
- [ ] Reducer that handles connection failures during reconnection (no more infinite spinners)
- [ ] Unit tests verifying all new behaviors

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `src/lib/constants/interview.ts` | Modify | Add `WS_CLOSE_BLOCK_RECONNECT = 4005` |
| `src/app/.../session/useInterviewSocket.ts` | Modify | Add stale socket guard, simplify handlers, hot mic |
| `src/app/.../session/types.ts` | Modify | Add `targetBlockIndex` to `WAITING_FOR_CONNECTION` |
| `src/app/.../session/reducer.ts` | Modify | Update block transition and `CONNECTION_CLOSED` handling |
| `src/test/unit/session-reducer.test.ts` | Modify | Add tests for new block transition flow |

### Out of Scope - DO NOT MODIFY

These files/areas are **not part of this task**:

- `worker/src/index.ts` - Backend DO isolation is already implemented
- `src/lib/audio/AudioSession.ts` - Audio internals don't need changes
- `src/lib/audio/AudioRecorder.ts` - Audio internals don't need changes
- Any database/Prisma files - No schema changes needed
- Any UI components - This is purely state machine and driver logic

If you think something outside this scope needs changing, **stop and ask**.

---

## Prerequisites

### 1. Environment Setup

```bash
# Verify you're in the project root
pwd
# Should show: /path/to/preppal

# Install dependencies
pnpm install

# Verify the project builds
pnpm build
```

### 2. Verify Tests Pass

```bash
pnpm test
```

All tests should pass before you start. If tests fail, **stop and report the issue**.

### 3. Create Your Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/unified-block-isolation
```

---

## Phase 1: Add Constants (Est. 5 mins)

### [ ] Step 1.1: Add Block Reconnect Close Code

#### Goal

Add the `WS_CLOSE_BLOCK_RECONNECT = 4005` constant. This is used for debugging visibility only - the driver will use this code when closing old sockets during block transitions.

#### File

`src/lib/constants/interview.ts`

#### Find This Location

Open the file and navigate to **line 32-33**. You should see:

```typescript
// Line 31
export const WS_CLOSE_GEMINI_ENDED = 4003;
// Line 32
export const WS_CLOSE_ERROR = 4004;
// Line 33 (end of file)
```

#### Action: Add New Code

Insert at **line 33** (after `WS_CLOSE_ERROR`):

```typescript
export const WS_CLOSE_BLOCK_RECONNECT = 4005;
```

#### Verification Gate

```bash
pnpm typecheck
```

No errors should appear.

---

## Phase 2: Driver Simplification (Est. 45 mins)

This phase transforms the driver into a true "dumb pipe" with proper stale socket filtering.

### [ ] Step 2.1: Add Stale Socket Guard and Simplify Handlers

#### Goal

The driver currently interprets close codes (deciding what's an "error" vs "normal" close). This violates the "dumb pipe" principle. We need to:
1. Add stale socket guards to all event handlers
2. Simplify `onclose` to always emit the raw code
3. Remove all close code interpretation

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

#### Step 2.1a: Add Import for New Constant

#### Find This Location

Open the file and find **lines 10-14** with the imports:

```typescript
// Line 10
import {
// Line 11
  WS_CLOSE_USER_INITIATED,
// Line 12
  WS_CLOSE_TIMEOUT,
// Line 13
  WS_CLOSE_GEMINI_ENDED,
// Line 14
  WS_CLOSE_ERROR,
// Line 15
} from "~/lib/constants/interview";
```

#### Action: Add Import

**Current (Lines 10-15):**
```typescript
import {
  WS_CLOSE_USER_INITIATED,
  WS_CLOSE_TIMEOUT,
  WS_CLOSE_GEMINI_ENDED,
  WS_CLOSE_ERROR,
} from "~/lib/constants/interview";
```

**Replace With:**
```typescript
import {
  WS_CLOSE_USER_INITIATED,
  WS_CLOSE_TIMEOUT,
  WS_CLOSE_GEMINI_ENDED,
  WS_CLOSE_ERROR,
  WS_CLOSE_BLOCK_RECONNECT,
} from "~/lib/constants/interview";
```

#### Step 2.1b: Add Stale Socket Guard to `onopen`

#### Find This Location

Navigate to **lines 144-153** inside `connectWebSocket`:

```typescript
// Line 144
      ws.onopen = () => {
// Line 145
        activeConnectionsRef.current += 1;
// Line 146
        console.log(
// Line 147
          `[WebSocket] Connected successfully (Active: ${activeConnectionsRef.current})`,
// Line 148
        );
// Line 149
        events.onConnectionOpen();
// Line 150
// Line 151
        // Setup audio after connection opens
// Line 152
        void setupAudio();
// Line 153
      };
```

#### Action: Add Stale Socket Guard

**Current (Lines 144-153):**
```typescript
      ws.onopen = () => {
        activeConnectionsRef.current += 1;
        console.log(
          `[WebSocket] Connected successfully (Active: ${activeConnectionsRef.current})`,
        );
        events.onConnectionOpen();

        // Setup audio after connection opens
        void setupAudio();
      };
```

**Replace With:**
```typescript
      ws.onopen = () => {
        // Stale socket guard: ignore events from old sockets
        if (wsRef.current !== ws) {
          console.log(`[WebSocket] Ignoring onopen from stale socket`);
          return;
        }
        activeConnectionsRef.current += 1;
        console.log(
          `[WebSocket] Connected successfully (Active: ${activeConnectionsRef.current})`,
        );
        events.onConnectionOpen();

        // Setup audio after connection opens (only if we don't already have one)
        if (!audioSessionRef.current) {
          void setupAudio();
        }
      };
```

#### Step 2.1c: Add Stale Socket Guard to `onmessage`

#### Find This Location

Navigate to **lines 155-191** for the `onmessage` handler:

```typescript
// Line 155
      ws.onmessage = (event: MessageEvent) => {
// Line 156
        if (!(event.data instanceof ArrayBuffer)) return;
// ...
```

#### Action: Add Stale Socket Guard

Insert at **line 156** (right after the function opens):

**Current (Lines 155-157):**
```typescript
      ws.onmessage = (event: MessageEvent) => {
        if (!(event.data instanceof ArrayBuffer)) return;

        const message = decodeServerMessage(event.data);
```

**Replace With:**
```typescript
      ws.onmessage = (event: MessageEvent) => {
        // Stale socket guard: ignore events from old sockets
        if (wsRef.current !== ws) {
          console.log(`[WebSocket] Ignoring message from stale socket`);
          return;
        }
        if (!(event.data instanceof ArrayBuffer)) return;

        const message = decodeServerMessage(event.data);
```

#### Step 2.1d: Add Stale Socket Guard to `onerror`

#### Find This Location

Navigate to **lines 194-197**:

```typescript
// Line 194
      ws.onerror = (event) => {
// Line 195
        console.error(`[WebSocket] Error:`, event);
// Line 196
        events.onConnectionError("Connection error.");
// Line 197
      };
```

#### Action: Add Stale Socket Guard

**Current (Lines 194-197):**
```typescript
      ws.onerror = (event) => {
        console.error(`[WebSocket] Error:`, event);
        events.onConnectionError("Connection error.");
      };
```

**Replace With:**
```typescript
      ws.onerror = (event) => {
        // Stale socket guard: ignore events from old sockets
        if (wsRef.current !== ws) {
          console.log(`[WebSocket] Ignoring error from stale socket`);
          return;
        }
        console.error(`[WebSocket] Error:`, event);
        events.onConnectionError("Connection error.");
      };
```

#### Step 2.1e: Simplify `onclose` Handler (Critical!)

#### Find This Location

Navigate to **lines 199-222**:

```typescript
// Line 199
      ws.onclose = (event) => {
// Line 200
        activeConnectionsRef.current = Math.max(
// Line 201
          0,
// Line 202
          activeConnectionsRef.current - 1,
// Line 203
        );
// Line 204
        console.log(
// Line 205
          `[WebSocket] Closed with code ${event.code}: ${event.reason} (Active: ${activeConnectionsRef.current})`,
// Line 206
        );
// Line 207
// Line 208
        // Handle close based on code
// Line 209
        switch (event.code) {
// Line 210
          case WS_CLOSE_USER_INITIATED:
// Line 211
          case WS_CLOSE_TIMEOUT:
// Line 212
          case WS_CLOSE_GEMINI_ENDED:
// Line 213
            events.onConnectionClose(event.code);
// Line 214
            break;
// Line 215
          case WS_CLOSE_ERROR:
// Line 216
            events.onConnectionError("Session error");
// Line 217
            break;
// Line 218
          default:
// Line 219
            // Unexpected close
// Line 220
            events.onConnectionError("Connection lost");
// Line 221
        }
// Line 222
      };
```

#### Action: Replace with Dumb Pipe Implementation

**Current (Lines 199-222):**
```typescript
      ws.onclose = (event) => {
        activeConnectionsRef.current = Math.max(
          0,
          activeConnectionsRef.current - 1,
        );
        console.log(
          `[WebSocket] Closed with code ${event.code}: ${event.reason} (Active: ${activeConnectionsRef.current})`,
        );

        // Handle close based on code
        switch (event.code) {
          case WS_CLOSE_USER_INITIATED:
          case WS_CLOSE_TIMEOUT:
          case WS_CLOSE_GEMINI_ENDED:
            events.onConnectionClose(event.code);
            break;
          case WS_CLOSE_ERROR:
            events.onConnectionError("Session error");
            break;
          default:
            // Unexpected close
            events.onConnectionError("Connection lost");
        }
      };
```

**Replace With:**
```typescript
      ws.onclose = (event) => {
        // Stale socket guard: ignore events from old sockets
        if (wsRef.current !== ws) {
          console.log(`[WebSocket] Ignoring close from stale socket (code: ${event.code})`);
          return;
        }
        activeConnectionsRef.current = Math.max(
          0,
          activeConnectionsRef.current - 1,
        );
        console.log(
          `[WebSocket] Closed with code ${event.code}: ${event.reason} (Active: ${activeConnectionsRef.current})`,
        );

        // Dumb pipe: always emit the raw close code, let reducer decide what it means
        events.onConnectionClose(event.code);
      };
```

#### Common Mistakes for This Step

##### Mistake 1: Forgetting to add guard to ALL handlers
```typescript
// WRONG - only added guard to onclose
ws.onopen = () => { events.onConnectionOpen(); };  // No guard!
ws.onclose = (event) => {
  if (wsRef.current !== ws) return;  // Has guard
  events.onConnectionClose(event.code);
};

// CORRECT - all handlers have guards
ws.onopen = () => {
  if (wsRef.current !== ws) return;  // Has guard
  events.onConnectionOpen();
};
ws.onclose = (event) => {
  if (wsRef.current !== ws) return;  // Has guard
  events.onConnectionClose(event.code);
};
```

##### Mistake 2: Checking `wsRef.current === null` instead of identity
```typescript
// WRONG - null check doesn't detect stale sockets
if (wsRef.current === null) return;

// CORRECT - identity check detects stale sockets
if (wsRef.current !== ws) return;
```

The closure captures `ws` (the specific socket instance). During reconnection:
- Old socket: `ws = oldSocket`, `wsRef.current = newSocket` → `wsRef.current !== ws` is TRUE → filtered
- New socket: `ws = newSocket`, `wsRef.current = newSocket` → `wsRef.current !== ws` is FALSE → passed

##### Mistake 3: Keeping the switch statement in onclose
```typescript
// WRONG - driver still interprets codes
ws.onclose = (event) => {
  if (wsRef.current !== ws) return;
  switch (event.code) {  // Still deciding what's an "error"!
    case WS_CLOSE_ERROR:
      events.onConnectionError("Session error");
      break;
    default:
      events.onConnectionClose(event.code);
  }
};

// CORRECT - always emit raw code
ws.onclose = (event) => {
  if (wsRef.current !== ws) return;
  events.onConnectionClose(event.code);  // Let reducer decide
};
```

#### Verification Gate

```bash
pnpm typecheck
```

No errors should appear.

---

### [ ] Step 2.2: Implement Hot Mic (Audio Persistence)

#### Goal

Keep the microphone alive during block transitions. Currently, we tear down audio and reinitialize it on every block, causing the browser recording indicator to flash.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

#### Find This Location

Navigate to **lines 283-310** for the `reconnectForBlock` function:

```typescript
// Line 283
  // Public: Reconnect for a new block
// Line 284
  const reconnectForBlock = useCallback(
// Line 285
    (newBlockNumber: number) => {
// Line 286
      console.log(
// Line 287
        `[useInterviewSocket] reconnectForBlock(${newBlockNumber}) called`,
// Line 288
      );
// Line 289
// Line 290
      // Update block ref for the new connection URL
// Line 291
      currentBlockRef.current = newBlockNumber;
// Line 292
// Line 293
      // Close existing WebSocket connection
// Line 294
      if (wsRef.current) {
// Line 295
        wsRef.current.close();
// Line 296
        wsRef.current = null;
// Line 297
      }
// Line 298
// Line 299
      // Stop current audio session (new one will start on connection)
// Line 300
      audioSessionRef.current?.stop();
// Line 301
      audioSessionRef.current = null;
// Line 302
// Line 303
      // Reset connection guard so generateToken triggers a new connection
// Line 304
      hasInitiatedConnection.current = false;
// Line 305
// Line 306
      // Trigger new connection with updated block number
// Line 307
      generateToken({ interviewId, token: guestToken });
// Line 308
    },
// Line 309
    [interviewId, guestToken, generateToken],
// Line 310
  );
```

#### Action: Keep Audio Alive During Transition

**Current (Lines 284-310):**
```typescript
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

**Replace With:**
```typescript
  const reconnectForBlock = useCallback(
    (newBlockNumber: number) => {
      console.log(
        `[useInterviewSocket] reconnectForBlock(${newBlockNumber}) called`,
      );

      // Update block ref for the new connection URL
      currentBlockRef.current = newBlockNumber;

      // Close existing WebSocket connection with 4005 (block transition)
      // The stale socket guard will filter any late events from this socket
      if (wsRef.current) {
        wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
        wsRef.current = null;
      }

      // HOT MIC: Keep audio session alive during block transitions
      // Audio chunks will be silently dropped until new socket opens
      // (see the wsRef.current?.readyState check in onAudioData callback)
      // DO NOT call audioSessionRef.current?.stop() here!

      // Reset connection guard so generateToken triggers a new connection
      hasInitiatedConnection.current = false;

      // Trigger new connection with updated block number
      generateToken({ interviewId, token: guestToken });
    },
    [interviewId, guestToken, generateToken],
  );
```

#### Common Mistakes for This Step

##### Mistake 1: Forgetting to use 4005 close code
```typescript
// WRONG - no code for debugging
wsRef.current.close();

// CORRECT - 4005 for visibility in logs
wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
```

##### Mistake 2: Still stopping audio
```typescript
// WRONG - defeats the purpose of hot mic
if (wsRef.current) {
  wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
  wsRef.current = null;
}
audioSessionRef.current?.stop();  // NO! This kills the mic!

// CORRECT - only close socket, keep audio
if (wsRef.current) {
  wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
  wsRef.current = null;
}
// Audio stays alive - chunks dropped until new socket opens
```

#### Verification Gate

```bash
pnpm typecheck
```

No errors should appear.

---

## Phase 3: State Machine Updates (Est. 60 mins)

This phase updates the types and reducer to properly handle block transitions.

### [ ] Step 3.1: Update Types for Block Transition

#### Goal

Add `targetBlockIndex` to `WAITING_FOR_CONNECTION` state so the reducer knows which block to transition to when the connection is ready.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

#### Find This Location

Navigate to **line 35**:

```typescript
// Line 34
export type SessionState =
// Line 35
  | ({ status: "WAITING_FOR_CONNECTION" } & CommonStateFields)
// Line 36
  | ({
```

#### Action: Add Optional targetBlockIndex

**Current (Line 35):**
```typescript
  | ({ status: "WAITING_FOR_CONNECTION" } & CommonStateFields)
```

**Replace With:**
```typescript
  | ({ status: "WAITING_FOR_CONNECTION"; targetBlockIndex?: number } & CommonStateFields)
```

#### Common Mistakes for This Step

##### Mistake 1: Making targetBlockIndex required
```typescript
// WRONG - breaks initial connection (no target yet)
| ({ status: "WAITING_FOR_CONNECTION"; targetBlockIndex: number } & CommonStateFields)

// CORRECT - optional for initial connection, set for block transitions
| ({ status: "WAITING_FOR_CONNECTION"; targetBlockIndex?: number } & CommonStateFields)
```

#### Verification Gate

```bash
pnpm typecheck
```

No errors should appear.

---

### [ ] Step 3.2: Update Reducer - Block Transition Flow

#### Goal

Change the block transition to go through `WAITING_FOR_CONNECTION` instead of directly to `ANSWERING`. This eliminates race conditions where timers fire before the connection is ready.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

#### Find This Location

Navigate to **lines 228-250** for the `BLOCK_COMPLETE_SCREEN` handler:

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
          commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }],
// Line 249
        };
// Line 250
      }
// Line 251
      return { state, commands: [] };
```

#### Action: Transition to WAITING_FOR_CONNECTION

**Current (Lines 228-251):**
```typescript
    case "BLOCK_COMPLETE_SCREEN":
      if (event.type === "USER_CLICKED_CONTINUE") {
        const nextIdx = state.completedBlockIndex + 1;
        if (nextIdx >= context.totalBlocks) {
          return {
            state: {
              ...state,
              status: "INTERVIEW_COMPLETE",
            },
            commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
          };
        }
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
      }
      return { state, commands: [] };
```

**Replace With:**
```typescript
    case "BLOCK_COMPLETE_SCREEN":
      if (event.type === "USER_CLICKED_CONTINUE") {
        const nextIdx = state.completedBlockIndex + 1;
        if (nextIdx >= context.totalBlocks) {
          return {
            state: {
              ...state,
              status: "INTERVIEW_COMPLETE",
            },
            commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
          };
        }
        // Go through WAITING_FOR_CONNECTION to avoid race conditions
        // CONNECTION_READY will transition to ANSWERING with fresh timestamps
        return {
          state: {
            ...state,
            status: "WAITING_FOR_CONNECTION",
            targetBlockIndex: nextIdx,
            connectionState: "connecting",
          },
          commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }],
        };
      }
      return { state, commands: [] };
```

#### Verification Gate

```bash
pnpm typecheck
```

No errors should appear (yet - we still need to update the `WAITING_FOR_CONNECTION` handler).

---

### [ ] Step 3.3: Update Reducer - CONNECTION_READY Handler

#### Goal

Update `WAITING_FOR_CONNECTION` + `CONNECTION_READY` to use `targetBlockIndex` when transitioning to `ANSWERING`.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

#### Find This Location

Navigate to **lines 158-173** for the `WAITING_FOR_CONNECTION` handler:

```typescript
// Line 157
  switch (state.status) {
// Line 158
    case "WAITING_FOR_CONNECTION":
// Line 159
      if (event.type === "CONNECTION_READY") {
// Line 160
        return {
// Line 161
          state: {
// Line 162
            status: "ANSWERING",
// Line 163
            blockIndex: event.initialBlockIndex,
// Line 164
            blockStartTime: now,
// Line 165
            answerStartTime: now,
// Line 166
            ...createCommonFields(state),
// Line 167
          },
// Line 168
          commands: [
// Line 169
            { type: "START_CONNECTION", blockNumber: event.initialBlockIndex },
// Line 170
          ],
// Line 171
        };
// Line 172
      }
// Line 173
      return { state, commands: [] };
```

#### Action: Use targetBlockIndex When Available

**Current (Lines 158-173):**
```typescript
    case "WAITING_FOR_CONNECTION":
      if (event.type === "CONNECTION_READY") {
        return {
          state: {
            status: "ANSWERING",
            blockIndex: event.initialBlockIndex,
            blockStartTime: now,
            answerStartTime: now,
            ...createCommonFields(state),
          },
          commands: [
            { type: "START_CONNECTION", blockNumber: event.initialBlockIndex },
          ],
        };
      }
      return { state, commands: [] };
```

**Replace With:**
```typescript
    case "WAITING_FOR_CONNECTION":
      if (event.type === "CONNECTION_READY") {
        // Use targetBlockIndex if set (block transition), otherwise use event's initialBlockIndex (initial connection)
        const blockIndex = state.targetBlockIndex ?? event.initialBlockIndex;
        return {
          state: {
            status: "ANSWERING",
            blockIndex,
            blockStartTime: now,
            answerStartTime: now,
            ...createCommonFields(state),
          },
          commands: [
            { type: "START_CONNECTION", blockNumber: blockIndex },
          ],
        };
      }
      return { state, commands: [] };
```

#### Common Mistakes for This Step

##### Mistake 1: Not preserving initial connection behavior
```typescript
// WRONG - breaks initial connection (no targetBlockIndex set)
const blockIndex = state.targetBlockIndex!;  // Crashes on initial connection!

// CORRECT - fallback to event for initial connection
const blockIndex = state.targetBlockIndex ?? event.initialBlockIndex;
```

#### Verification Gate

```bash
pnpm typecheck
```

No errors should appear.

---

### [ ] Step 3.4: Update Reducer - CONNECTION_CLOSED Handler (Critical!)

#### Goal

This is the most critical change. Currently, `CONNECTION_CLOSED` just sets `connectionState: "ending"`. With the dumb driver, we need to handle error cases here:
1. If in `WAITING_FOR_CONNECTION` and connection closes → connection **failed** → error state
2. If close code indicates error → error state
3. Otherwise → normal ending

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

#### Step 3.4a: Add Import for Close Codes

#### Find This Location

Navigate to **lines 5-6**:

```typescript
// Line 5
import { isTimeUp } from "~/lib/countdown-timer";
// Line 6
import type {
```

#### Action: Add Import

**Current (Lines 5-6):**
```typescript
import { isTimeUp } from "~/lib/countdown-timer";
import type {
```

**Replace With:**
```typescript
import { isTimeUp } from "~/lib/countdown-timer";
import {
  WS_CLOSE_USER_INITIATED,
  WS_CLOSE_TIMEOUT,
  WS_CLOSE_GEMINI_ENDED,
  WS_CLOSE_ERROR,
} from "~/lib/constants/interview";
import type {
```

#### Step 3.4b: Update CONNECTION_CLOSED Handler

#### Find This Location

Navigate to **lines 104-108**:

```typescript
// Line 104
    case "CONNECTION_CLOSED":
// Line 105
      return {
// Line 106
        state: { ...state, connectionState: "ending" },
// Line 107
        commands: [], // Connection already closed - no action needed
// Line 108
      };
```

#### Action: Handle Error Cases

**Current (Lines 104-108):**
```typescript
    case "CONNECTION_CLOSED":
      return {
        state: { ...state, connectionState: "ending" },
        commands: [], // Connection already closed - no action needed
      };
```

**Replace With:**
```typescript
    case "CONNECTION_CLOSED": {
      // If we're here, the event passed the driver's stale socket guard,
      // meaning it's from the CURRENT socket. Always handle it.

      // Check if this is an error close code
      const isNormalClose =
        event.code === WS_CLOSE_USER_INITIATED ||
        event.code === WS_CLOSE_TIMEOUT ||
        event.code === WS_CLOSE_GEMINI_ENDED ||
        event.code === 1000; // Standard WebSocket normal close

      const isErrorCode = event.code === WS_CLOSE_ERROR ||
        (!isNormalClose && event.code !== 1000);

      // Connection closed while WAITING = connection failed to establish
      // This handles the "new socket fails" race condition
      if (state.status === "WAITING_FOR_CONNECTION") {
        return {
          state: {
            ...state,
            status: "INTERVIEW_COMPLETE",
            connectionState: "error",
            error: "Connection failed",
          },
          commands: [{ type: "STOP_AUDIO" }],
        };
      }

      // Error code during active session = error state
      if (isErrorCode) {
        return {
          state: {
            ...state,
            status: "INTERVIEW_COMPLETE",
            connectionState: "error",
            error: "Connection lost",
          },
          commands: [{ type: "STOP_AUDIO" }],
        };
      }

      // Normal close (timeout, user-initiated, Gemini ended)
      return {
        state: { ...state, connectionState: "ending" },
        commands: [],
      };
    }
```

#### Common Mistakes for This Step

##### Mistake 1: Ignoring close events in WAITING_FOR_CONNECTION
```typescript
// WRONG - The Double Guard Trap! Creates infinite spinner
case "CONNECTION_CLOSED":
  if (state.status === "WAITING_FOR_CONNECTION") {
    return { state, commands: [] };  // WRONG: Ignores legitimate failures!
  }
  // ...

// CORRECT - Handle as error (new socket failed)
case "CONNECTION_CLOSED":
  if (state.status === "WAITING_FOR_CONNECTION") {
    return {
      state: { ...state, status: "INTERVIEW_COMPLETE", connectionState: "error", error: "Connection failed" },
      commands: [{ type: "STOP_AUDIO" }],
    };
  }
```

##### Mistake 2: Using wrong error field name
```typescript
// WRONG - field doesn't exist
error: undefined,
errorMessage: "Connection failed",  // Doesn't exist in SessionState!

// CORRECT - use existing 'error' field
error: "Connection failed",
```

##### Mistake 3: Forgetting the block scope for case
```typescript
// WRONG - const inside case without block
case "CONNECTION_CLOSED":
  const isNormalClose = ...;  // SyntaxError in some contexts

// CORRECT - wrap in block
case "CONNECTION_CLOSED": {
  const isNormalClose = ...;  // OK
}
```

#### Verification Gate

```bash
pnpm typecheck
pnpm test
```

All tests should pass (existing tests should still work with this change).

---

## Phase 4: Tests (Est. 45 mins)

### [ ] Step 4.1: Add Block Transition Tests

#### Goal

Add tests to verify:
1. `BLOCK_COMPLETE_SCREEN` + `USER_CLICKED_CONTINUE` → `WAITING_FOR_CONNECTION` (not directly to `ANSWERING`)
2. `WAITING_FOR_CONNECTION` + `CONNECTION_READY` → `ANSWERING` with correct `blockIndex`
3. `WAITING_FOR_CONNECTION` + `CONNECTION_CLOSED` → `INTERVIEW_COMPLETE` with error (not ignored!)
4. `ANSWERING` + `CONNECTION_CLOSED` with error code → `INTERVIEW_COMPLETE` with error

#### File

`src/test/unit/session-reducer.test.ts`

#### Find This Location

Navigate to the end of the file, find the last `describe` block and its closing `});`. Around **line 895**:

```typescript
// Line 892
      });
// Line 893
    });
// Line 894
  });
// Line 895
});
```

#### Action: Add New Test Describe Block

Insert at **line 895** (before the final `});`):

```typescript
  describe("FEAT40: Unified Block Isolation", () => {
    describe("Block transition goes through WAITING_FOR_CONNECTION", () => {
      it("should transition BLOCK_COMPLETE_SCREEN to WAITING_FOR_CONNECTION on USER_CLICKED_CONTINUE", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "BLOCK_COMPLETE_SCREEN",
          completedBlockIndex: 0,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "USER_CLICKED_CONTINUE" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
        if (result.state.status === "WAITING_FOR_CONNECTION") {
          expect(result.state.targetBlockIndex).toBe(1);
          expect(result.state.connectionState).toBe("connecting");
        }
        expect(result.commands).toContainEqual({
          type: "RECONNECT_FOR_BLOCK",
          blockNumber: 2,
        });
      });

      it("should transition WAITING_FOR_CONNECTION to ANSWERING on CONNECTION_READY using targetBlockIndex", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          targetBlockIndex: 2,
          ...createCommonFields(),
          connectionState: "connecting",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_READY", initialBlockIndex: 0 }, // initialBlockIndex should be ignored
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("ANSWERING");
        if (result.state.status === "ANSWERING") {
          expect(result.state.blockIndex).toBe(2); // Uses targetBlockIndex, not initialBlockIndex
          expect(result.state.blockStartTime).toBe(now);
          expect(result.state.answerStartTime).toBe(now);
        }
      });
    });

    describe("Connection failure during WAITING_FOR_CONNECTION", () => {
      it("should transition to INTERVIEW_COMPLETE with error when connection fails during reconnection", () => {
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          targetBlockIndex: 1,
          ...createCommonFields(),
          connectionState: "connecting",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 1006 }, // Abnormal closure
          defaultContext,
        );

        expect(result.state.status).toBe("INTERVIEW_COMPLETE");
        expect(result.state.connectionState).toBe("error");
        expect(result.state.error).toBe("Connection failed");
        expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      });

      it("should NOT ignore CONNECTION_CLOSED during WAITING_FOR_CONNECTION (no double guard trap)", () => {
        // This test verifies we don't have the "double guard trap" bug
        // where CONNECTION_CLOSED is ignored in WAITING state
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          ...createCommonFields(),
          connectionState: "connecting",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 4004 }, // WS_CLOSE_ERROR
          defaultContext,
        );

        // Should NOT stay in WAITING_FOR_CONNECTION (that would be the bug)
        expect(result.state.status).not.toBe("WAITING_FOR_CONNECTION");
        expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      });
    });

    describe("Error handling during ANSWERING", () => {
      it("should transition to INTERVIEW_COMPLETE with error on WS_CLOSE_ERROR (4004)", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 10000,
          answerStartTime: now - 10000,
          ...createCommonFields(),
          connectionState: "live",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 4004 }, // WS_CLOSE_ERROR
          defaultContext,
        );

        expect(result.state.status).toBe("INTERVIEW_COMPLETE");
        expect(result.state.connectionState).toBe("error");
        expect(result.state.error).toBe("Connection lost");
        expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      });

      it("should handle normal close (4001, 4002, 4003) without error during ANSWERING", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 10000,
          answerStartTime: now - 10000,
          ...createCommonFields(),
          connectionState: "live",
        };

        // Test each normal close code
        for (const code of [4001, 4002, 4003]) {
          const result = sessionReducer(
            state,
            { type: "CONNECTION_CLOSED", code },
            defaultContext,
          );

          expect(result.state.connectionState).toBe("ending");
          expect(result.state.status).toBe("ANSWERING"); // Status unchanged
          expect(result.state.error).toBeNull();
        }
      });
    });

    describe("Initial connection still works", () => {
      it("should use initialBlockIndex from CONNECTION_READY when targetBlockIndex is not set", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          // No targetBlockIndex - this is initial connection
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_READY", initialBlockIndex: 0 },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("ANSWERING");
        if (result.state.status === "ANSWERING") {
          expect(result.state.blockIndex).toBe(0); // Uses initialBlockIndex
        }
      });
    });
  });
```

#### Verification Gate

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

**Expected Result:**

```
 PASS  src/test/unit/session-reducer.test.ts
  sessionReducer (v6: One Block = One Question)
    ...
    FEAT40: Unified Block Isolation
      Block transition goes through WAITING_FOR_CONNECTION
        ✓ should transition BLOCK_COMPLETE_SCREEN to WAITING_FOR_CONNECTION on USER_CLICKED_CONTINUE
        ✓ should transition WAITING_FOR_CONNECTION to ANSWERING on CONNECTION_READY using targetBlockIndex
      Connection failure during WAITING_FOR_CONNECTION
        ✓ should transition to INTERVIEW_COMPLETE with error when connection fails during reconnection
        ✓ should NOT ignore CONNECTION_CLOSED during WAITING_FOR_CONNECTION (no double guard trap)
      Error handling during ANSWERING
        ✓ should transition to INTERVIEW_COMPLETE with error on WS_CLOSE_ERROR (4004)
        ✓ should handle normal close (4001, 4002, 4003) without error during ANSWERING
      Initial connection still works
        ✓ should use initialBlockIndex from CONNECTION_READY when targetBlockIndex is not set
```

All 7 new tests should pass. If any fail, check:
1. The reducer changes match what the tests expect
2. Import statements are correct
3. Field names match (`error` not `errorMessage`)

---

### [ ] Step 4.2: Update Existing Block Transition Test

#### Goal

One existing test expects `USER_CLICKED_CONTINUE` to go directly to `ANSWERING`. Update it to expect `WAITING_FOR_CONNECTION`.

#### File

`src/test/unit/session-reducer.test.ts`

#### Find This Location

Navigate to **lines 335-360**:

```typescript
// Line 335
    it("should transition to next block when USER_CLICKED_CONTINUE", () => {
// Line 336
      const now = 1000000;
// Line 337
      const state: SessionState = {
// Line 338
        status: "BLOCK_COMPLETE_SCREEN",
// Line 339
        completedBlockIndex: 0,
// Line 340
        ...createCommonFields(),
// Line 341
      };
// Line 342
// Line 343
      const result = sessionReducer(
// Line 344
        state,
// Line 345
        { type: "USER_CLICKED_CONTINUE" },
// Line 346
        defaultContext,
// Line 347
        now,
// Line 348
      );
// Line 349
// Line 350
      expect(result.state).toMatchObject({
// Line 351
        status: "ANSWERING",
// Line 352
        blockIndex: 1,
// Line 353
        blockStartTime: now,
// Line 354
        answerStartTime: now,
// Line 355
      });
// Line 356
      expect(result.commands).toContainEqual({
// Line 357
        type: "RECONNECT_FOR_BLOCK",
// Line 358
        blockNumber: 2, // blockIndex 1 + 1 = blockNumber 2 (1-indexed)
// Line 359
      });
// Line 360
    });
```

#### Action: Update Expected State

**Current (Lines 335-360):**
```typescript
    it("should transition to next block when USER_CLICKED_CONTINUE", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        defaultContext,
        now,
      );

      expect(result.state).toMatchObject({
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: now,
        answerStartTime: now,
      });
      expect(result.commands).toContainEqual({
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2, // blockIndex 1 + 1 = blockNumber 2 (1-indexed)
      });
    });
```

**Replace With:**
```typescript
    it("should transition to WAITING_FOR_CONNECTION when USER_CLICKED_CONTINUE", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        defaultContext,
        now,
      );

      // Now goes through WAITING_FOR_CONNECTION first (FEAT40)
      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      if (result.state.status === "WAITING_FOR_CONNECTION") {
        expect(result.state.targetBlockIndex).toBe(1);
        expect(result.state.connectionState).toBe("connecting");
      }
      expect(result.commands).toContainEqual({
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2, // blockIndex 1 + 1 = blockNumber 2 (1-indexed)
      });
    });
```

#### Find This Location

Also update the test at **lines 407-437**:

```typescript
// Line 407
    it("should emit RECONNECT_FOR_BLOCK when advancing to next block", () => {
```

#### Action: Update This Test Too

**Current (Lines 407-437):**
```typescript
    it("should emit RECONNECT_FOR_BLOCK when advancing to next block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const context: ReducerContext = {
        answerTimeLimit: 60,
        totalBlocks: 3,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );

      expect(result.state.status).toBe("ANSWERING");
      expect(result.state).toMatchObject({
        blockIndex: 1,
        blockStartTime: now,
        answerStartTime: now,
      });
      expect(result.commands).toContainEqual({
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2, // blockIndex 1 + 1 = blockNumber 2 (1-indexed)
      });
    });
```

**Replace With:**
```typescript
    it("should emit RECONNECT_FOR_BLOCK when advancing to next block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const context: ReducerContext = {
        answerTimeLimit: 60,
        totalBlocks: 3,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );

      // Now goes through WAITING_FOR_CONNECTION first (FEAT40)
      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      if (result.state.status === "WAITING_FOR_CONNECTION") {
        expect(result.state.targetBlockIndex).toBe(1);
      }
      expect(result.commands).toContainEqual({
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2, // blockIndex 1 + 1 = blockNumber 2 (1-indexed)
      });
    });
```

#### Find This Location

Also update the "Full state machine flow" test at **lines 683-765**. Find **lines 726-737**:

```typescript
// Line 726
      now += 5000;
// Line 727
      result = sessionReducer(
// Line 728
        state,
// Line 729
        { type: "USER_CLICKED_CONTINUE" },
// Line 730
        context,
// Line 731
        now,
// Line 732
      );
// Line 733
      expect(result.state.status).toBe("ANSWERING");
// Line 734
      if (result.state.status === "ANSWERING") {
// Line 735
        expect(result.state.blockIndex).toBe(1);
// Line 736
      }
// Line 737
      state = result.state;
```

#### Action: Update Flow Test

**Current (Lines 726-737):**
```typescript
      // 3. User clicks continue to next block
      now += 5000;
      result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );
      expect(result.state.status).toBe("ANSWERING");
      if (result.state.status === "ANSWERING") {
        expect(result.state.blockIndex).toBe(1);
      }
      state = result.state;
```

**Replace With:**
```typescript
      // 3. User clicks continue to next block -> WAITING_FOR_CONNECTION
      now += 5000;
      result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );
      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      if (result.state.status === "WAITING_FOR_CONNECTION") {
        expect(result.state.targetBlockIndex).toBe(1);
      }
      state = result.state;

      // 3b. CONNECTION_READY -> ANSWERING
      result = sessionReducer(
        state,
        { type: "CONNECTION_READY", initialBlockIndex: 0 },
        context,
        now,
      );
      expect(result.state.status).toBe("ANSWERING");
      if (result.state.status === "ANSWERING") {
        expect(result.state.blockIndex).toBe(1); // Uses targetBlockIndex
      }
      state = result.state;
```

#### Verification Gate

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

All tests should pass.

---

## Final Success Criteria

Before submitting your PR, verify the following:

### Run All Quality Checks

```bash
pnpm format && pnpm check
```

All checks should pass.

### Run All Tests

```bash
pnpm test
```

All tests should pass.

### Verify Specific Behaviors

- [ ] **Block Transition**: `BLOCK_COMPLETE_SCREEN` + `USER_CLICKED_CONTINUE` → `WAITING_FOR_CONNECTION` (not `ANSWERING`)
- [ ] **Connection Ready**: `WAITING_FOR_CONNECTION` + `CONNECTION_READY` → `ANSWERING` with correct `blockIndex`
- [ ] **Failed Reconnect**: `WAITING_FOR_CONNECTION` + `CONNECTION_CLOSED` → `INTERVIEW_COMPLETE` with error (no infinite spinner)
- [ ] **Stale Socket**: Old socket close events are filtered by driver (check console logs)
- [ ] **Hot Mic**: Audio session not stopped during block transitions (check `reconnectForBlock`)

### Manual Testing (Optional)

If you can run the app:
1. Start an interview with multiple blocks
2. Complete Block 1 (let timer run out or click Next)
3. Click "Continue" to start Block 2
4. Observe:
   - Recording indicator stays ON (no flash)
   - Block 2 starts with fresh timer
   - No "Connection Lost" errors
5. Kill network during Block 2
6. Observe: Shows error screen (not infinite spinner)

---

## Troubleshooting

### Error: "Property 'targetBlockIndex' does not exist on type 'SessionState'"

**Cause**: TypeScript doesn't know about the discriminated union variant.

**Fix**: Narrow the type first:
```typescript
if (result.state.status === "WAITING_FOR_CONNECTION") {
  expect(result.state.targetBlockIndex).toBe(1);  // Now TS knows targetBlockIndex exists
}
```

### Error: "Cannot find name 'WS_CLOSE_ERROR'"

**Cause**: Missing import in reducer.ts

**Fix**: Add the import:
```typescript
import {
  WS_CLOSE_USER_INITIATED,
  WS_CLOSE_TIMEOUT,
  WS_CLOSE_GEMINI_ENDED,
  WS_CLOSE_ERROR,
} from "~/lib/constants/interview";
```

### Test Failure: "Expected WAITING_FOR_CONNECTION but got ANSWERING"

**Cause**: You haven't updated the reducer's `BLOCK_COMPLETE_SCREEN` handler yet.

**Fix**: Complete Step 3.2.

### Test Failure: "Expected INTERVIEW_COMPLETE but got WAITING_FOR_CONNECTION"

**Cause**: You haven't updated the reducer's `CONNECTION_CLOSED` handler yet.

**Fix**: Complete Step 3.4.

### Console shows "Ignoring close from stale socket" but state still shows error

**Cause**: The stale socket guard is working! The reducer shouldn't receive this event.

**Check**: Make sure the test is sending the event from the **new** socket's perspective, not the old one.

---

## Pre-Submission Checklist

Before creating your pull request:

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm check`
- [ ] Only modified files listed in this guide
- [ ] No `console.log` statements added (except the existing debug logs)
- [ ] No commented-out code
- [ ] Branch is rebased on latest main
- [ ] Commit messages are clear

### Files Changed

Verify your changes match this list exactly:

| File | Status |
|------|--------|
| `src/lib/constants/interview.ts` | Modified |
| `src/app/.../session/useInterviewSocket.ts` | Modified |
| `src/app/.../session/types.ts` | Modified |
| `src/app/.../session/reducer.ts` | Modified |
| `src/test/unit/session-reducer.test.ts` | Modified |

Run `git status` to verify. If you modified other files, **undo those changes**.

---

## Getting Help

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
