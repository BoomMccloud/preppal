# FEAT38: Block Reconnect Close Code

## Problem Statement

Block-based interviews end immediately after the first block completes. When transitioning from block 1 to block 2, the interview ends with "Connection lost" error instead of proceeding to the next block.

## Root Cause Analysis

### Current Architecture

When a block completes and the user clicks "Continue", the system must:
1. Close the WebSocket connection to the block 1 Durable Object
2. Open a new WebSocket connection to the block 2 Durable Object

The `reconnectForBlock` method handles this:

```typescript
// useInterviewSocket.ts:284-310
const reconnectForBlock = useCallback((newBlockNumber: number) => {
  currentBlockRef.current = newBlockNumber;

  // Close existing WebSocket connection
  if (wsRef.current) {
    wsRef.current.close();  // <-- No close code specified
    wsRef.current = null;
  }

  // ... trigger new connection
}, [...]);
```

### The Bug

When `wsRef.current.close()` is called without arguments:
1. Browser sends WebSocket close frame with code 1000 (normal closure)
2. The `onclose` handler fires with `event.code = 1000`
3. Code 1000 doesn't match any custom codes (4001-4004)
4. Falls through to `default` case → fires `onConnectionError("Connection lost")`
5. Reducer handles `CONNECTION_ERROR` → sets `status: "INTERVIEW_COMPLETE"`

```typescript
// useInterviewSocket.ts:209-221
ws.onclose = (event) => {
  switch (event.code) {
    case WS_CLOSE_USER_INITIATED:  // 4001
    case WS_CLOSE_TIMEOUT:         // 4002
    case WS_CLOSE_GEMINI_ENDED:    // 4003
      events.onConnectionClose(event.code);
      break;
    case WS_CLOSE_ERROR:           // 4004
      events.onConnectionError("Session error");
      break;
    default:
      // Code 1000 falls here during block reconnection!
      events.onConnectionError("Connection lost");
  }
};
```

```typescript
// reducer.ts:110-119
case "CONNECTION_ERROR":
  return {
    state: {
      ...state,
      connectionState: "error",
      error: event.error,
      status: "INTERVIEW_COMPLETE",  // <-- Interview ends!
    },
    commands: [{ type: "STOP_AUDIO" }],
  };
```

### Timeline of Failure

1. Block 1 completes → state becomes `BLOCK_COMPLETE_SCREEN`
2. User clicks "Continue" → dispatches `USER_CLICKED_CONTINUE`
3. Reducer emits `RECONNECT_FOR_BLOCK` command with `blockNumber: 2`
4. `useInterviewSession` executes command → calls `driver.reconnectForBlock(2)`
5. `reconnectForBlock` calls `wsRef.current.close()` (no code)
6. `onclose` fires with code 1000 → triggers `onConnectionError("Connection lost")`
7. Reducer receives `CONNECTION_ERROR` → sets `status: "INTERVIEW_COMPLETE"`
8. Interview ends before block 2 connection is established

## First Principles Analysis

**What is the semantic meaning of each close scenario?**

| Scenario | Who Initiates | Intent | Correct Handling |
|----------|--------------|--------|------------------|
| User clicks "End Interview" | Client | End session | `INTERVIEW_COMPLETE` |
| Block timeout on server | Server | Session limit reached | `INTERVIEW_COMPLETE` |
| Gemini ends conversation | Server | AI ended session | `INTERVIEW_COMPLETE` |
| Server error | Server | Something went wrong | `INTERVIEW_COMPLETE` |
| Block transition | Client | Intentional reconnect | **Continue to next block** |
| Network failure | Network | Unexpected disconnect | `INTERVIEW_COMPLETE` |

**What is the purpose of WebSocket close codes?**

WebSocket close codes exist to communicate *why* a connection was closed. RFC 6455 reserves:
- 1000-2999: Protocol-level codes
- 3000-3999: Library/framework codes
- 4000-4999: Application-specific codes

The codebase already uses 4001-4004 for application-specific close reasons. Adding 4005 for block transitions follows this established pattern.

**Why not use a flag?**

| Approach | Pros | Cons |
|----------|------|------|
| Flag (`isReconnecting`) | Simple to implement | Temporal coupling, race conditions, state sync issues |
| Close code (4005) | Self-describing, stateless, follows existing pattern | None |

**Conclusion**: Use a custom close code (4005) for block transitions. The close event carries its meaning, no additional state needed.

## Solution: Custom Close Code for Block Reconnection

### 1. Add New Constant

```typescript
// src/lib/constants/interview.ts
export const WS_CLOSE_USER_INITIATED = 4001;
export const WS_CLOSE_TIMEOUT = 4002;
export const WS_CLOSE_GEMINI_ENDED = 4003;
export const WS_CLOSE_ERROR = 4004;
export const WS_CLOSE_BLOCK_RECONNECT = 4005;  // NEW
```

### 2. Update `reconnectForBlock` to Use Code

```typescript
// useInterviewSocket.ts
import { WS_CLOSE_BLOCK_RECONNECT } from "~/lib/constants/interview";

const reconnectForBlock = useCallback((newBlockNumber: number) => {
  console.log(`[useInterviewSocket] reconnectForBlock(${newBlockNumber}) called`);

  currentBlockRef.current = newBlockNumber;

  // Close existing WebSocket with BLOCK_RECONNECT code
  if (wsRef.current) {
    wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
    wsRef.current = null;
  }

  // ... rest unchanged
}, [interviewId, guestToken, generateToken]);
```

### 3. Handle Code in `onclose`

```typescript
// useInterviewSocket.ts
ws.onclose = (event) => {
  activeConnectionsRef.current = Math.max(0, activeConnectionsRef.current - 1);
  console.log(
    `[WebSocket] Closed with code ${event.code}: ${event.reason} (Active: ${activeConnectionsRef.current})`,
  );

  switch (event.code) {
    case WS_CLOSE_USER_INITIATED:
    case WS_CLOSE_TIMEOUT:
    case WS_CLOSE_GEMINI_ENDED:
      events.onConnectionClose(event.code);
      break;
    case WS_CLOSE_ERROR:
      events.onConnectionError("Session error");
      break;
    case WS_CLOSE_BLOCK_RECONNECT:
      // Intentional close for block transition - no action needed
      // New connection will be established by reconnectForBlock
      console.log("[WebSocket] Closed for block reconnection");
      break;
    default:
      // Unexpected close (network failure, etc.)
      events.onConnectionError("Connection lost");
  }
};
```

## Benefits

1. **Self-Describing Events** - Close code carries semantic meaning
2. **No Additional State** - No flags to synchronize
3. **Follows Existing Pattern** - Extends 4001-4004 convention
4. **Explicit Intent** - Code 4005 clearly indicates block transition
5. **Robust** - No race conditions or temporal coupling
6. **Minimal Change** - ~10 lines of code

## Implementation Checklist

### Changes Required

- [ ] Add `WS_CLOSE_BLOCK_RECONNECT = 4005` to `src/lib/constants/interview.ts`
- [ ] Import constant in `useInterviewSocket.ts`
- [ ] Update `reconnectForBlock` to close with code 4005
- [ ] Add case for 4005 in `onclose` handler (no-op, just log)
- [ ] Run `pnpm check` to verify no type errors
- [ ] Run `pnpm test` to verify existing tests pass

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/constants/interview.ts` | Add `WS_CLOSE_BLOCK_RECONNECT` |
| `src/app/.../session/useInterviewSocket.ts` | Use code in `reconnectForBlock`, handle in `onclose` |

## Test Scenarios

### Manual Testing

1. **Happy Path**: Complete 2+ blocks via "Next Question" button
   - Verify block 1 completes, transition screen shows
   - Click "Continue", verify block 2 starts
   - Verify interview only ends after final block

2. **Answer Timeout Path**: Let answer timeout trigger block completion
   - Verify timeout pause shows, then transition screen
   - Click "Continue", verify next block starts

3. **Console Verification**: Check browser console for:
   - `[WebSocket] Closed for block reconnection` on block transition
   - `[WebSocket] Connected successfully` for new block connection

### Unit Test (Optional)

```typescript
// src/test/unit/useInterviewSocket.test.ts
describe("reconnectForBlock", () => {
  it("should close WebSocket with BLOCK_RECONNECT code", () => {
    const mockClose = vi.fn();
    wsRef.current = { close: mockClose } as unknown as WebSocket;

    reconnectForBlock(2);

    expect(mockClose).toHaveBeenCalledWith(4005, "Block transition");
  });
});
```

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Close code not recognized by server | Low | None | Server doesn't use client close codes |
| Browser compatibility | Very Low | High | Close codes are WebSocket standard |
| Regression in standard interviews | Low | Medium | Standard interviews don't use `reconnectForBlock` |

## Related Files

**To Modify:**
- `src/lib/constants/interview.ts` - Add constant
- `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts` - Use and handle code

**Context (Read-Only):**
- `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts` - State machine (no changes needed)
- `src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts` - Command executor (no changes needed)
- `docs/todo/FEAT36_block_session_isolation.md` - Related feature that introduced `reconnectForBlock`

## Appendix: WebSocket Close Codes Reference

| Code | Name | Source |
|------|------|--------|
| 1000 | Normal Closure | RFC 6455 |
| 1001 | Going Away | RFC 6455 |
| 1006 | Abnormal Closure | RFC 6455 |
| 4001 | User Initiated | Application |
| 4002 | Timeout | Application |
| 4003 | Gemini Ended | Application |
| 4004 | Error | Application |
| **4005** | **Block Reconnect** | **Application (NEW)** |
