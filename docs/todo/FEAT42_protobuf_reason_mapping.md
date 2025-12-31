# FEAT42: Protobuf Reason to WebSocket Close Code Mapping

> **Status:** Ready
> **Created:** 2025-12-31
> **Related:** FEAT41 (Block Completion Flow Fix)

## Problem Statement

Block-based interviews still end prematurely with ERROR status because `onSessionEnded` passes the protobuf reason (0-3) to `onConnectionClose`, but the reducer expects WebSocket close codes (4001-4004).

## Root Cause

In `useInterviewSocket.ts` lines 183-192:

```typescript
onSessionEnded: (reason) => {
  const reasonMap: Record<number, string> = {
    0: "UNSPECIFIED",
    1: "USER_INITIATED",
    2: "GEMINI_ENDED",
    3: "TIMEOUT",
  };
  const reasonName = reasonMap[reason] ?? `UNKNOWN(${reason})`;
  console.log(`[WebSocket] Session ended with reason: ${reasonName}`);
  events.onConnectionClose(reason);  // ← BUG: passes reason (0-3), not close code!
},
```

When `reason=3` (TIMEOUT) is passed:
- Reducer checks `event.code === WS_CLOSE_TIMEOUT` (4002) → **false**
- `isNormalClose` = false (because 3 is not in [4001, 4002, 4003, 1000])
- `isErrorCode` = true (because `!isNormalClose && event.code !== 1000`)
- Reducer transitions to `INTERVIEW_COMPLETE` with error state

## Number Systems

Two separate numbering systems are conflated:

### Protobuf Reasons (0-3)
```
0: UNSPECIFIED
1: USER_INITIATED
2: GEMINI_ENDED
3: TIMEOUT
```

### WebSocket Close Codes (4001-4004)
```
4001: WS_CLOSE_USER_INITIATED
4002: WS_CLOSE_TIMEOUT
4003: WS_CLOSE_GEMINI_ENDED
4004: WS_CLOSE_ERROR
```

## Solution

Map protobuf reasons to WebSocket close codes before calling `onConnectionClose`:

### File: `useInterviewSocket.ts`

**1. Update imports:**
```typescript
import {
  WS_CLOSE_BLOCK_RECONNECT,
  WS_CLOSE_USER_INITIATED,
  WS_CLOSE_TIMEOUT,
  WS_CLOSE_GEMINI_ENDED,
  WS_CLOSE_ERROR,
} from "~/lib/constants/interview";
```

**2. Add mapping function (before useInterviewSocket):**
```typescript
// Map protobuf SessionEndReason to WebSocket close codes
function reasonToCloseCode(reason: number): number {
  switch (reason) {
    case 1: return WS_CLOSE_USER_INITIATED;  // USER_INITIATED
    case 2: return WS_CLOSE_GEMINI_ENDED;    // GEMINI_ENDED
    case 3: return WS_CLOSE_TIMEOUT;         // TIMEOUT
    default: return WS_CLOSE_ERROR;          // UNSPECIFIED or unknown
  }
}
```

**3. Update onSessionEnded callback:**
```typescript
onSessionEnded: (reason) => {
  const reasonMap: Record<number, string> = {
    0: "UNSPECIFIED",
    1: "USER_INITIATED",
    2: "GEMINI_ENDED",
    3: "TIMEOUT",
  };
  const reasonName = reasonMap[reason] ?? `UNKNOWN(${reason})`;
  console.log(`[WebSocket] Session ended with reason: ${reasonName}`);
  events.onConnectionClose(reasonToCloseCode(reason));  // ← Map to close code
},
```

## Verification

After fix:
1. Start a block-based interview
2. Let the block timeout (or use dev "Skip Block")
3. Should see `BLOCK_COMPLETE_SCREEN` state, not redirect to feedback
4. Console should show normal transition, no ERROR status
