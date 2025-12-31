# FEAT41: Block Completion Flow Fix

> **Status:** Ready
> **Created:** 2025-12-31
> **Related:** FEAT40 (Unified Block Isolation)
> **Reviewed:** First-Principle Analysis (2025-12-31)

## Problem Statement

Block-based interviews end prematurely when completing a block. Two symptoms observed:

1. **Dev "Skip Block" button ends interview immediately** - Clicking the dev console's "Skip Block" button navigates to feedback instead of showing the block complete screen.

2. **Normal block completion ends interview** - When a block ends naturally (timeout or user clicks "Next Question"), the interview ends instead of transitioning to the next block.

## Root Cause Analysis

### The Race Condition

When a block ends, the following sequence occurs:

```
1. Block ends (timeout / user action)
2. State → BLOCK_COMPLETE_SCREEN
3. COMPLETE_BLOCK command emitted IMMEDIATELY
4. completeBlock API called
5. API auto-completes interview if last block (lines 555-568 in interview.ts)
6. page.tsx polls interview status, sees COMPLETED
7. page.tsx redirects to feedback
8. User never sees BLOCK_COMPLETE_SCREEN
```

### Separation of Concerns Violation

The `completeBlock` API currently has two responsibilities:
1. Mark a block as COMPLETED ✓ (correct)
2. Auto-complete the interview if it's the last block ✗ (wrong)

This violates separation of concerns:
- **Worker:** Handles block-scoped session (audio, Gemini, transcript)
- **API:** Persists data to database
- **UI:** Controls interview flow and user experience

The UI should decide when to mark the interview as complete, not the API.

### Evidence from Worker

The worker already follows this principle correctly (`interview-lifecycle-manager.ts:117-132`):

```typescript
// If it's a block, we don't mark the whole interview as COMPLETED.
// The backend handles marking the block as COMPLETED during submitTranscript.
if (!blockNumber) {
  await this.apiClient.updateStatus(interviewId, INTERVIEW_STATUS.COMPLETED);
} else {
  console.log(`Block ${blockNumber} finalized`);  // No COMPLETED update
}
```

The worker explicitly does NOT mark block-based interviews as complete. The API should follow the same principle.

## First-Principle Analysis

This architecture was reviewed against the five first-principles for clean state management:

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Source of Truth | ✅ Pass | Consolidates interview lifecycle ownership to UI state machine |
| 2. Side-Effect Control | ✅ Pass | Intent-based command architecture (not reactive useEffect chains) |
| 3. Hardware Driver | ✅ Pass | Removes business logic from API - API becomes "dumb driver" |
| 4. Lifecycle & Concurrency | ✅ Pass | Eliminates race condition; state machine guards concurrent actions |
| 5. Testability | ✅ Pass | Reducer is headless-testable via `processEvents()` |

**Litmus Test:** ✅ Pass - The entire interview flow can be tested without rendering React components or making network calls.

## Solution Architecture

### Principle: UI Controls Interview Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ UI (Browser)                                                     │
│  ├── State machine controls flow                                │
│  ├── Emits COMPLETE_BLOCK when block ends                       │
│  ├── Emits COMPLETE_INTERVIEW when interview ends               │
│  └── Navigates based on client state, not database state        │
├─────────────────────────────────────────────────────────────────┤
│ API (Server)                                                     │
│  ├── completeBlock: Marks block as COMPLETED (only)             │
│  ├── updateStatus: Marks interview status                       │
│  └── No auto-completion logic                                   │
├─────────────────────────────────────────────────────────────────┤
│ Worker (Cloudflare)                                              │
│  ├── Block-scoped session management                            │
│  └── Does NOT mark interview as COMPLETED for block interviews  │
└─────────────────────────────────────────────────────────────────┘
```

### Changes Required

#### 1a. Remove Auto-Complete from tRPC Route (`interview.ts`)

**Before (lines 555-568):**
```typescript
// Check if this was the last block
const totalBlocks = await ctx.db.interviewBlock.count({
  where: { interviewId: input.interviewId },
});

if (input.blockNumber === totalBlocks) {
  await ctx.db.interview.update({
    where: { id: input.interviewId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });
}
```

**After:**
```typescript
// Block marked as COMPLETED - that's all this API does
// Interview completion is handled by the UI via updateStatus
return updatedBlock;
```

#### 1b. Remove Auto-Complete from Worker REST Route (`interview-worker.ts`)

The same auto-complete logic exists in the worker's `submitTranscript` endpoint. This must also be removed for consistency.

**Before (lines 149-162):**
```typescript
// Check if this was the last block
const totalBlocks = await ctx.db.interviewBlock.count({
  where: { interviewId: input.interviewId },
});

if (input.blockNumber === totalBlocks) {
  await ctx.db.interview.update({
    where: { id: input.interviewId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(input.endedAt),
    },
  });
}
```

**After:**
```typescript
// Block marked as COMPLETED - that's all this endpoint does
// Interview completion is handled by the UI via updateStatus
return { success: true };
```

> **Note:** The worker's `InterviewLifecycleManager` was already designed to NOT mark block interviews as complete (see `interview-lifecycle-manager.ts:117-132`). This REST endpoint was contradicting that intent.

#### 2. Add COMPLETE_INTERVIEW Command (`types.ts`)

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
  | { type: "COMPLETE_INTERVIEW" };  // NEW
```

#### 3. Emit COMPLETE_INTERVIEW When Interview Ends (`reducer.ts`)

**Before (lines 280-287):**
```typescript
if (nextIdx >= context.totalBlocks) {
  return {
    state: { ...state, status: "INTERVIEW_COMPLETE" },
    commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
  };
}
```

**After:**
```typescript
if (nextIdx >= context.totalBlocks) {
  return {
    state: { ...state, status: "INTERVIEW_COMPLETE" },
    commands: [
      { type: "STOP_AUDIO" },
      { type: "CLOSE_CONNECTION" },
      { type: "COMPLETE_BLOCK", blockNumber: state.completedBlockIndex + 1 },
      { type: "COMPLETE_INTERVIEW" },
    ],
  };
}
```

Note: We also emit COMPLETE_BLOCK for the final block here, since user clicked Continue.

#### 4. Handle COMPLETE_INTERVIEW Command (`useInterviewSession.ts`)

```typescript
const updateStatus = api.interview.updateStatus.useMutation();

const executeCommand = useCallback((cmd: Command) => {
  switch (cmd.type) {
    // ... existing cases ...
    case "COMPLETE_INTERVIEW":
      updateStatus.mutate(
        {
          interviewId,
          status: "COMPLETED",
        },
        {
          onError: (err) => {
            // Log but don't block - navigation works based on client state
            // Worker's finalize logic provides backup for non-block interviews
            console.error("[COMPLETE_INTERVIEW] Failed to update status:", err);
          },
        }
      );
      break;
  }
}, [/* deps */]);
```

> **Note:** If the API call fails, the user still navigates correctly (based on client state). The worker's finalize logic provides a backup path for non-block interviews.

#### 5. Also Handle INTERVIEW_ENDED Event (`reducer.ts`)

The global INTERVIEW_ENDED handler (user clicks "End Interview") should also emit COMPLETE_INTERVIEW:

**Before (lines 52-60):**
```typescript
if (event.type === "INTERVIEW_ENDED") {
  return {
    state: { ...state, status: "INTERVIEW_COMPLETE" },
    commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
  };
}
```

**After:**
```typescript
if (event.type === "INTERVIEW_ENDED") {
  return {
    state: { ...state, status: "INTERVIEW_COMPLETE" },
    commands: [
      { type: "STOP_AUDIO" },
      { type: "CLOSE_CONNECTION" },
      { type: "COMPLETE_INTERVIEW" },
    ],
  };
}
```

## Implementation Plan

### Phase 1: Remove Auto-Complete from Both API Routes
- [ ] Remove lines 555-568 from `src/server/api/routers/interview.ts` (tRPC)
- [ ] Remove lines 149-162 from `src/server/api/routers/interview-worker.ts` (REST)
- [ ] Verify both routes only mark the block as COMPLETED, not the interview

### Phase 2: Add COMPLETE_INTERVIEW Command
- [ ] Add `COMPLETE_INTERVIEW` to Command type in `types.ts`
- [ ] Add command handler in `useInterviewSession.ts` (call updateStatus)

### Phase 3: Emit Command from Reducer
- [ ] Update INTERVIEW_ENDED handler to emit COMPLETE_INTERVIEW
- [ ] Update USER_CLICKED_CONTINUE (last block) to emit COMPLETE_INTERVIEW + COMPLETE_BLOCK

### Phase 4: Update Tests
- [ ] Update `session-reducer.test.ts` to verify new commands:
  - [ ] `INTERVIEW_ENDED` → verify `COMPLETE_INTERVIEW` in commands
  - [ ] `USER_CLICKED_CONTINUE` (last block) → verify both `COMPLETE_BLOCK` + `COMPLETE_INTERVIEW`
  - [ ] `USER_CLICKED_CONTINUE` (not last block) → verify NO `COMPLETE_INTERVIEW` (negative test)
- [ ] Update `session-golden-path.test.ts` if affected

**Example test case:**
```typescript
it("should emit COMPLETE_INTERVIEW when completing final block", () => {
  const state = createState({
    status: "BLOCK_COMPLETE_SCREEN",
    blockIndex: 2,
    completedBlockIndex: 2,
  });
  const result = processEvents(
    state,
    { totalBlocks: 3 },
    [{ type: "USER_CLICKED_CONTINUE" }]
  );

  expect(result.state.status).toBe("INTERVIEW_COMPLETE");
  expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
  expect(result.commands).toContainEqual({ type: "COMPLETE_BLOCK", blockNumber: 3 });
});

it("should NOT emit COMPLETE_INTERVIEW when completing non-final block", () => {
  const state = createState({
    status: "BLOCK_COMPLETE_SCREEN",
    blockIndex: 0,
    completedBlockIndex: 0,
  });
  const result = processEvents(
    state,
    { totalBlocks: 3 },
    [{ type: "USER_CLICKED_CONTINUE" }]
  );

  expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
  expect(result.commands).not.toContainEqual({ type: "COMPLETE_INTERVIEW" });
});
```

## Verification Scenarios

### 1. Skip Block in Dev Mode (Single Block)
```
Start interview with 1 block
Click "Skip Block" in dev console
State → BLOCK_COMPLETE_SCREEN (not feedback!)
Click "Continue"
State → INTERVIEW_COMPLETE
COMPLETE_INTERVIEW command fires
Navigate to feedback
```

### 2. Normal Block Completion (Multi-Block)
```
Start interview with 3 blocks
Block 1 ends (timeout)
State → BLOCK_COMPLETE_SCREEN
Verify: Still on session page, not feedback
Click "Continue"
State → WAITING_FOR_CONNECTION (targetBlockIndex: 1)
Connection ready → ANSWERING (blockIndex: 1)
```

### 3. Last Block Completion
```
Block 3 ends (timeout)
State → BLOCK_COMPLETE_SCREEN
Click "Continue"
State → INTERVIEW_COMPLETE
Commands: [STOP_AUDIO, CLOSE_CONNECTION, COMPLETE_BLOCK(3), COMPLETE_INTERVIEW]
Navigate to feedback
```

### 4. User Ends Interview Early
```
In Block 2, click "End Interview"
State → INTERVIEW_COMPLETE
Commands: [STOP_AUDIO, CLOSE_CONNECTION, COMPLETE_INTERVIEW]
Navigate to feedback
```

## State Machine Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ANSWERING                                      │
│                              │                                           │
│              ┌───────────────┴───────────────┐                          │
│              │                               │                          │
│         (timeout)                    (USER_CLICKED_NEXT)                │
│              │                               │                          │
│              ▼                               ▼                          │
│     ANSWER_TIMEOUT_PAUSE ──────────> BLOCK_COMPLETE_SCREEN              │
│                                              │                          │
│                              ┌───────────────┴───────────────┐          │
│                              │                               │          │
│                    (more blocks)                      (last block)      │
│                              │                               │          │
│                              ▼                               ▼          │
│                 WAITING_FOR_CONNECTION            INTERVIEW_COMPLETE    │
│                              │                               │          │
│                    (CONNECTION_READY)               Commands:           │
│                              │                    - STOP_AUDIO          │
│                              ▼                    - CLOSE_CONNECTION    │
│                          ANSWERING                - COMPLETE_BLOCK(N)   │
│                                                   - COMPLETE_INTERVIEW  │
└─────────────────────────────────────────────────────────────────────────┘

Global: INTERVIEW_ENDED (from any state)
        → INTERVIEW_COMPLETE
        → Commands: [STOP_AUDIO, CLOSE_CONNECTION, COMPLETE_INTERVIEW]
```

## Risk Assessment

### Low Risk
- Removing auto-complete from API is a pure subtraction
- Adding new command is additive, doesn't break existing flow
- Navigation already works based on client state

### Consideration
- If the COMPLETE_INTERVIEW API call fails, the database won't be updated
- Mitigation: The navigation still works (based on client state), and the worker's finalize logic provides a backup for non-block interviews

## References

- [FEAT40: Unified Block Isolation](./FEAT40_unified_block_isolation.md) - Block transition architecture
- [Session README](../../src/app/[locale]/(interview)/interview/[interviewId]/session/README.md) - State machine documentation
