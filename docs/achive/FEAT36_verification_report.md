# Spec Verification Report

**Spec**: FEAT36_block_session_isolation.md
**Verified**: 2025-12-30
**Overall Status**: ✅ PASS (corrections applied)

---

## Summary

- **Files**: 6 verified, 1 path issue
- **Methods/Functions**: 8 verified, 0 issues
- **Code References**: 5 verified, 0 issues
- **Proposed Changes**: 4 analyzed, 1 design consideration

---

## Blocking Issues

None.

---

## Warnings

### [WARN-001] File path incorrect: `useInterviewSocket.ts`

**Spec says**: `src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSocket.ts`
**Reality**: `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

The file exists but is NOT in a `hooks/` subdirectory. It's directly in the `session/` folder.

**Recommendation**: Update spec to use correct path.

---

### [WARN-002] Block number already passed to worker, but DO key not updated

**Spec analysis is correct**. The codebase already passes block number:

1. **Client** (`useInterviewSocket.ts:126-128`):
```typescript
const wsUrl = blockNumber
  ? `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}&block=${blockNumber}`
  : `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;
```

2. **Worker** (`worker/src/index.ts:99-103`):
```typescript
const block = url.searchParams.get("block");
if (block) {
  headers.set("X-Block-Number", block);
}
```

3. **But DO key is only interviewId** (`worker/src/index.ts:91`):
```typescript
const id = env.GEMINI_SESSION.idFromName(interviewId);
```

**This confirms the root cause** - infrastructure for block-aware routing exists but DO keying doesn't use it.

---

### [WARN-003] Proposed `setCurrentBlock` function doesn't exist

**Spec proposes**:
```typescript
const reconnectForBlock = useCallback((blockNumber: number) => {
  // ...
  setCurrentBlock(blockNumber);
}, []);
```

**Reality**: `blockNumber` is passed as a prop to `useInterviewSocket`, not internal state. There is no `setCurrentBlock` function.

**Design consideration**: The implementation will need to either:
- Store `blockNumber` in a ref that `connectWebSocket` reads
- Or pass `blockNumber` as parameter to a new `reconnect(blockNumber)` method

**Recommendation**: Update spec to use a ref-based approach:
```typescript
const currentBlockRef = useRef(blockNumber);

const reconnectForBlock = useCallback((newBlockNumber: number) => {
  currentBlockRef.current = newBlockNumber;
  hasInitiatedConnection.current = false;
  if (wsRef.current) {
    wsRef.current.close();
    wsRef.current = null;
  }
  // Trigger new connection
  generateToken({ interviewId, token: guestToken });
}, [interviewId, guestToken, generateToken]);
```

---

### [WARN-004] Reducer emits no commands on block transition

**Spec correctly identifies this** - Looking at `reducer.ts:240-249`:

```typescript
case "BLOCK_COMPLETE_SCREEN":
  if (event.type === "USER_CLICKED_CONTINUE") {
    // ...
    return {
      state: {
        ...state,
        status: "ANSWERING",
        blockIndex: nextIdx,
        // ...
      },
      commands: [],  // <-- No commands!
    };
  }
```

The transition to next block currently emits NO commands. The spec's proposal to add `RECONNECT_FOR_BLOCK` command is valid.

---

## Verified Items ✅

| Category | Reference | Status |
|----------|-----------|--------|
| File | `worker/src/index.ts` | ✅ Exists |
| File | `worker/src/gemini-session.ts` | ✅ Exists |
| File | `session/reducer.ts` | ✅ Exists |
| File | `session/types.ts` | ✅ Exists |
| File | `session/hooks/useInterviewSession.ts` | ✅ Exists |
| Code | `idFromName(interviewId)` at index.ts:91 | ✅ Exact match |
| Code | `startDurationTimeout` at gemini-session.ts:184 | ✅ Exists (with logging) |
| Code | `handleTimeoutEnd` method | ✅ Exists at line 203 |
| Code | `hasInitiatedConnection.current` guard | ✅ Exists at useInterviewSocket.ts:233-234 |
| Code | `generateToken` mutation | ✅ Exists at useInterviewSocket.ts:221-229 |
| Code | `BLOCK_COMPLETE_SCREEN` status | ✅ Exists in types.ts and reducer.ts |
| Code | `USER_CLICKED_CONTINUE` event | ✅ Exists in types.ts:58 |
| Code | `completedBlockIndex` state field | ✅ Exists in types.ts:49 |
| Code | `blockIndex` state field | ✅ Exists in types.ts:37 |
| Code | `wsRef` in useInterviewSocket | ✅ Exists at line 37 |
| State | `ANSWERING` status | ✅ Exists |
| State | `answerStartTime` field | ✅ Exists |
| State | `blockStartTime` field | ✅ Exists |
| Model | `InterviewBlock` concept | ✅ Exists (blocks stored separately in DB) |
| Model | `interviewContext.durationMs` | ✅ Exists at gemini-session.ts:45 |
| Model | `DEFAULT_DURATION_MS` | ✅ Exists at gemini-session.ts:40 |
| Model | `SESSION_ENDED` message | ✅ Exists (createSessionEnded) |
| Model | `TIMEOUT` reason | ✅ Exists (SessionEnded_Reason.TIMEOUT) |

---

## Recommendations

1. **Before implementing**: Fix file path in spec (WARN-001)
2. **Design consideration**: Decide on ref-based approach for block number (WARN-003)
3. **The core analysis is sound**: The bug diagnosis and proposed DO keying fix are correct

---

## Implementation Readiness

The spec is **ready for implementation**. ✅

### Corrections Applied:

1. ✅ Updated `useInterviewSocket.ts` path (removed `hooks/` from path)
2. ✅ Replaced `setCurrentBlock(blockNumber)` with ref-based approach

### Validated Assumptions:

- ✅ DO is keyed only by interviewId (confirmed at index.ts:91)
- ✅ Block number already passed via query param (confirmed at useInterviewSocket.ts:126-128)
- ✅ Worker reads block param (confirmed at index.ts:99-103)
- ✅ `hasInitiatedConnection` guard prevents reconnection (confirmed at useInterviewSocket.ts:233)
- ✅ No commands emitted on block transition (confirmed at reducer.ts:248)
- ✅ Timeout fires from DO regardless of block (confirmed - single DO instance)
