# FEAT36: Block Session Isolation

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
// worker/src/gemini-session.ts:184-198
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
2. User completes block 1 at T=30s (via answer timeout or "Next Question")
3. Client-side state transitions to `BLOCK_COMPLETE_SCREEN`, then to `ANSWERING` for block 2
4. **The WebSocket connection remains open** (client never reconnects)
5. At T=60s, the DO's timeout fires `handleTimeoutEnd()`
6. DO sends `SESSION_ENDED` with `TIMEOUT` reason and closes WebSocket
7. Client receives close, interview ends unexpectedly

### Why the WebSocket Doesn't Reconnect

The `useInterviewSocket` hook has an idempotency guard:

```typescript
// src/app/.../session/useInterviewSocket.ts:232-237
const connect = useCallback(() => {
  if (!hasInitiatedConnection.current) {
    hasInitiatedConnection.current = true;
    generateToken({ interviewId, token: guestToken });
  }
}, [interviewId, guestToken, generateToken]);
```

Once connected for block 1, it never reconnects for block 2.

## First Principles Analysis

**What defines a "session" in block-based interviews?**

| Aspect | Shared Across Blocks? | Implication |
|--------|----------------------|-------------|
| System prompt | No (different per block) | Needs fresh context |
| Language | No (can change) | Needs fresh Gemini session |
| Question | No (different) | Needs fresh conversation |
| Timeout | No (per-block limit) | Needs independent timer |
| Transcript | No (stored per block) | Already separate in DB |

**Conclusion**: Each block is semantically an independent session.

## Solution: Separate DO per Block

Key the Durable Object by `interviewId_blockNumber`:

### Server Change

**`worker/src/index.ts`** (line ~91):
```typescript
// Change from:
const id = env.GEMINI_SESSION.idFromName(interviewId);

// To:
const block = url.searchParams.get("block") ?? "1";
const blockNum = parseInt(block, 10);
if (isNaN(blockNum) || blockNum < 1) {
  return new Response("Invalid block number", { status: 400 });
}
const id = env.GEMINI_SESSION.idFromName(`${interviewId}_block${block}`);
```

### Client Changes

**1. Add command type** (`types.ts`):
```typescript
export type Command =
  // ... existing commands
  | { type: "RECONNECT_FOR_BLOCK"; blockNumber: number };
```

**2. Emit reconnect command on block transition** (`reducer.ts`):
```typescript
case "BLOCK_COMPLETE_SCREEN":
  if (event.type === "USER_CLICKED_CONTINUE") {
    const nextIdx = state.completedBlockIndex + 1;
    if (nextIdx >= context.totalBlocks) {
      return { /* end interview */ };
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
```

**3. Add reconnect method** (`useInterviewSocket.ts`):

First, add a ref to track the current block (since `blockNumber` is a prop, not state):
```typescript
const currentBlockRef = useRef(blockNumber);

// Keep ref in sync with prop
useEffect(() => {
  currentBlockRef.current = blockNumber;
}, [blockNumber]);
```

Update `connectWebSocket` to use the ref:
```typescript
const wsUrl = `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}&block=${currentBlockRef.current}`;
```

Add the reconnect method:
```typescript
const reconnectForBlock = useCallback((newBlockNumber: number) => {
  // Update block ref for next connection
  currentBlockRef.current = newBlockNumber;
  // Close existing connection
  if (wsRef.current) {
    wsRef.current.close();
    wsRef.current = null;
  }
  // Reset connection guard and trigger new connection
  hasInitiatedConnection.current = false;
  generateToken({ interviewId, token: guestToken });
}, [interviewId, guestToken, generateToken]);
```

**4. Handle command** (`useInterviewSession.ts`):
```typescript
case "RECONNECT_FOR_BLOCK":
  driver.reconnectForBlock(cmd.blockNumber);
  break;
```

## Benefits

1. **Clean slate per block** - No state pollution between blocks
2. **Independent timeouts** - Each block's timer is self-contained
3. **Correct Gemini context** - Fresh system prompt per block
4. **Natural resource cleanup** - DO hibernates when block ends
5. **Aligns with data model** - Matches separate `InterviewBlock` records
6. **Simpler debugging** - Each block session is isolated

## Implementation Checklist

- [ ] Update `worker/src/index.ts` to key DO by `interviewId_block${blockNumber}`
- [ ] Add block number validation in `worker/src/index.ts`
- [ ] Add `RECONNECT_FOR_BLOCK` command to `types.ts`
- [ ] Update `reducer.ts` to emit reconnect command on block transition
- [ ] Add `reconnectForBlock()` method to `useInterviewSocket.ts`
- [ ] Update `useInterviewSession.ts` to handle `RECONNECT_FOR_BLOCK` command
- [ ] Write unit tests for block transition reconnection

## Test Scenarios

### Happy Path
1. Complete 6 blocks via answer timeouts - verify all blocks complete
2. Complete 6 blocks via "Next Question" button - verify all blocks complete
3. Mix of timeouts and manual advances - verify correct behavior
4. Verify each block gets correct system prompt/language
5. Verify transcripts are stored per-block correctly

### Edge Cases
6. Verify block 1 timeout doesn't affect block 2
7. Verify WebSocket closes cleanly between blocks
8. Invalid block number in URL - verify worker returns 400 error

## Future Improvements (Deferred)

If issues arise in production, consider adding:
- `RECONNECTING` status to show loading UI during block transition
- `RECONNECTION_ERROR` status with retry button if failures occur
- Rapid click protection if users trigger multiple reconnections

**KISS Principle:** Build the minimal fix first. Add error handling when errors actually occur.

## Related Files

- `worker/src/index.ts` - DO instantiation
- `worker/src/gemini-session.ts` - Session lifecycle
- `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts` - State machine
- `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts` - Command types
- `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts` - WebSocket driver
- `src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts` - Command executor
