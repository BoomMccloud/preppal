# Implementation Guide: Block Completion Flow Fix (FEAT41)

**Based on Spec**: FEAT41_block_completion_flow.md
**Verification Report**: FEAT41_verification_report.md
**Generated**: 2025-12-31

---

## Overview

### What You're Building

You are fixing a bug where block-based interviews end prematurely when completing a block. Currently, the API auto-completes the interview when the last block is completed, causing a race condition that redirects users to feedback before they see the block complete screen.

### Core Concept (The "North Star")

**The UI is the single source of truth for interview lifecycle.** The API should be a "dumb driver" that only persists data - it should NOT make decisions about when an interview is complete. The UI's state machine decides when to navigate, and it tells the API when the interview is done.

```
UI (Brain)  →  decides interview is complete  →  emits COMPLETE_INTERVIEW command
API (Driver) →  receives command               →  marks interview as COMPLETED in DB
```

### Deliverables

After completing this guide, you will have:

- [ ] Removed auto-complete logic from `interview.ts` (tRPC route)
- [ ] Removed auto-complete logic from `interview-worker.ts` (REST route)
- [ ] Added `COMPLETE_INTERVIEW` command type
- [ ] Updated reducer to emit `COMPLETE_INTERVIEW` when appropriate
- [ ] Added command handler in `useInterviewSession.ts`
- [ ] Added/updated unit tests for new behavior

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `src/server/api/routers/interview.ts` | Modify | Remove auto-complete logic (lines 555-568) |
| `src/server/api/routers/interview-worker.ts` | Modify | Remove auto-complete logic (lines 149-162) |
| `src/app/.../session/types.ts` | Modify | Add `COMPLETE_INTERVIEW` command type |
| `src/app/.../session/reducer.ts` | Modify | Emit `COMPLETE_INTERVIEW` in 2 places |
| `src/app/.../session/hooks/useInterviewSession.ts` | Modify | Add command handler |
| `src/test/unit/session-reducer.test.ts` | Modify | Add tests for new command |

### Out of Scope - DO NOT MODIFY

These files/areas are **not part of this task**:

- `worker/src/services/interview-lifecycle-manager.ts` - Already correctly does NOT auto-complete
- `src/app/[locale]/(interview)/interview/[interviewId]/page.tsx` - Navigation works correctly
- Database migrations - No schema changes needed
- Any file not listed in "Files You Will Modify"

If you think something outside this scope needs changing, **stop and ask**.

---

## Prerequisites

Before starting, complete these checks:

### 1. Environment Setup

```bash
# Verify you're in the correct directory
pwd
# Should output: /Users/jasonbxu/Documents/GitHub/preppal

# Install dependencies
pnpm install
```

### 2. Verify Tests Pass

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

All tests should pass before you start. If tests fail, **stop and report the issue**.

### 3. Create Your Branch (if not already on feature branch)

```bash
git checkout -b feat/FEAT41-block-completion-flow
```

---

## Phase 1: Remove Auto-Complete from API Routes (Est. 10 mins)

These changes remove the logic that auto-completes the interview when the last block is completed.

### [ ] Step 1.1: Remove Auto-Complete from tRPC Route

#### Goal

Remove the code that checks if this is the last block and auto-completes the interview. The API should ONLY mark the block as completed.

#### File

`src/server/api/routers/interview.ts`

#### Find This Location

Open the file and navigate to **line 555**. You should see this code:

```typescript
// Line 553
      });
// Line 554
// Line 555
      // Check if this was the last block
// Line 556
      const totalBlocks = await ctx.db.interviewBlock.count({
// Line 557
        where: { interviewId: input.interviewId },
// Line 558
      });
// Line 559
// Line 560
      if (input.blockNumber === totalBlocks) {
// Line 561
        await ctx.db.interview.update({
// Line 562
          where: { id: input.interviewId },
// Line 563
          data: {
// Line 564
            status: "COMPLETED",
// Line 565
            endedAt: new Date(),
// Line 566
          },
// Line 567
        });
// Line 568
      }
// Line 569
// Line 570
      return updatedBlock;
```

#### Action: DELETE Lines 555-568

Delete the entire auto-complete block (lines 555-568). The code should go directly from the block update to the return statement.

**Before:**
```typescript
      });

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

      return updatedBlock;
```

**After:**
```typescript
      });

      // Block marked as COMPLETED - that's all this API does
      // Interview completion is handled by the UI via updateStatus
      return updatedBlock;
```

#### Common Mistakes for This Step

##### Mistake 1: Deleting the return statement
```typescript
// WRONG - Don't delete the return!
      });
      // Block marked as COMPLETED...
    }),  // Missing return updatedBlock!

// CORRECT - Keep the return
      });
      // Block marked as COMPLETED - that's all this API does
      // Interview completion is handled by the UI via updateStatus
      return updatedBlock;
    }),
```

##### Mistake 2: Deleting too much
Make sure you only delete lines 555-568, not the closing `});` or the `return updatedBlock;` line.

#### Verification Gate

```bash
pnpm typecheck
```

No TypeScript errors should appear related to `interview.ts`.

---

### [ ] Step 1.2: Remove Auto-Complete from REST Route

#### Goal

Remove the same auto-complete logic from the worker's REST endpoint. This keeps both APIs consistent.

#### File

`src/server/api/routers/interview-worker.ts`

#### Find This Location

Open the file and navigate to **line 149**. You should see this code:

```typescript
// Line 147
        });
// Line 148
// Line 149
        // Check if this was the last block
// Line 150
        const totalBlocks = await ctx.db.interviewBlock.count({
// Line 151
          where: { interviewId: input.interviewId },
// Line 152
        });
// Line 153
// Line 154
        if (input.blockNumber === totalBlocks) {
// Line 155
          await ctx.db.interview.update({
// Line 156
            where: { id: input.interviewId },
// Line 157
            data: {
// Line 158
              status: "COMPLETED",
// Line 159
              endedAt: new Date(input.endedAt),
// Line 160
            },
// Line 161
          });
// Line 162
        }
// Line 163
// Line 164
        return { success: true };
```

#### Action: DELETE Lines 149-162

Delete the entire auto-complete block (lines 149-162).

**Before:**
```typescript
        });

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

        return { success: true };
```

**After:**
```typescript
        });

        // Block marked as COMPLETED - that's all this endpoint does
        // Interview completion is handled by the UI via updateStatus
        return { success: true };
```

#### Verification Gate

```bash
pnpm typecheck
```

No TypeScript errors should appear.

---

## Phase 2: Add COMPLETE_INTERVIEW Command (Est. 15 mins)

### [ ] Step 2.1: Add Command Type

#### Goal

Add the new `COMPLETE_INTERVIEW` command to the Command union type.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

#### Find This Location

Open the file and navigate to **line 12**. You should see the Command type:

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
  | { type: "RECONNECT_FOR_BLOCK"; blockNumber: number };
```

#### Action: Add New Command Type

Add `COMPLETE_INTERVIEW` as the last union member.

**Before:**
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

**After:**
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

#### Common Mistakes for This Step

##### Mistake 1: Forgetting the semicolon
```typescript
// WRONG - missing semicolon
  | { type: "COMPLETE_INTERVIEW" }

// CORRECT - has semicolon
  | { type: "COMPLETE_INTERVIEW" };
```

##### Mistake 2: Adding parameters when none are needed
```typescript
// WRONG - COMPLETE_INTERVIEW takes no parameters
  | { type: "COMPLETE_INTERVIEW"; interviewId: string };

// CORRECT - no parameters
  | { type: "COMPLETE_INTERVIEW" };
```

#### Verification Gate

```bash
pnpm typecheck
```

---

### [ ] Step 2.2: Add Command Handler in useInterviewSession

#### Goal

Add the handler that executes the `COMPLETE_INTERVIEW` command by calling the `updateStatus` API.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts`

#### Find This Location - Part A (Add mutation)

Open the file and navigate to **line 33**. You should see:

```typescript
// Line 31
  const router = useRouter();
// Line 32
  const context = config?.context ?? defaultContext;
// Line 33
  const completeBlock = api.interview.completeBlock.useMutation();
// Line 34
// Line 35
  // Capture commands from reducer
```

#### Action: Add updateStatus Mutation

Insert the new mutation declaration after line 33.

**Before:**
```typescript
  const router = useRouter();
  const context = config?.context ?? defaultContext;
  const completeBlock = api.interview.completeBlock.useMutation();

  // Capture commands from reducer
```

**After:**
```typescript
  const router = useRouter();
  const context = config?.context ?? defaultContext;
  const completeBlock = api.interview.completeBlock.useMutation();
  const updateStatus = api.interview.updateStatus.useMutation();

  // Capture commands from reducer
```

#### Find This Location - Part B (Add case handler)

Navigate to **line 105** (after adding the mutation, line numbers shift by 1). You should see:

```typescript
// Line 104
        case "RECONNECT_FOR_BLOCK":
// Line 105
          driver.reconnectForBlock(cmd.blockNumber);
// Line 106
          break;
// Line 107
      }
// Line 108
    },
```

#### Action: Add COMPLETE_INTERVIEW Case

Insert the new case before the closing `}` of the switch.

**Before:**
```typescript
        case "RECONNECT_FOR_BLOCK":
          driver.reconnectForBlock(cmd.blockNumber);
          break;
      }
    },
```

**After:**
```typescript
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
                // Log but don't block - navigation works based on client state
                // Worker's finalize logic provides backup for non-block interviews
                console.error("[COMPLETE_INTERVIEW] Failed to update status:", err);
              },
            },
          );
          break;
      }
    },
```

#### Update Dependencies Array

Find the dependencies array at **line 110** (after your additions, approximately line 122). You should see:

```typescript
    [driver, interviewId, completeBlock],
```

Add `updateStatus` to the array:

**Before:**
```typescript
    [driver, interviewId, completeBlock],
```

**After:**
```typescript
    [driver, interviewId, completeBlock, updateStatus],
```

#### Common Mistakes for This Step

##### Mistake 1: Wrong status value
```typescript
// WRONG - lowercase
status: "completed",

// CORRECT - matches Prisma enum
status: "COMPLETED",
```

##### Mistake 2: Missing error handler
```typescript
// WRONG - no error handling
updateStatus.mutate({ interviewId, status: "COMPLETED" });

// CORRECT - has error handler (doesn't block navigation, just logs)
updateStatus.mutate(
  { interviewId, status: "COMPLETED" },
  {
    onError: (err) => {
      console.error("[COMPLETE_INTERVIEW] Failed to update status:", err);
    },
  },
);
```

##### Mistake 3: Forgetting to update dependencies
If you forget to add `updateStatus` to the dependencies array, ESLint will warn you about exhaustive-deps.

#### Verification Gate

```bash
pnpm typecheck
pnpm lint src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts
```

---

## Phase 3: Emit Command from Reducer (Est. 15 mins)

### [ ] Step 3.1: Update INTERVIEW_ENDED Handler

#### Goal

Add `COMPLETE_INTERVIEW` to the commands emitted when the user ends the interview early.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

#### Find This Location

Open the file and navigate to **line 52**. You should see:

```typescript
// Line 50
  // Global Event Handler: INTERVIEW_ENDED
// Line 51
  // Can happen from any state (e.g., user clicks "End Interview")
// Line 52
  if (event.type === "INTERVIEW_ENDED") {
// Line 53
    return {
// Line 54
      state: {
// Line 55
        ...state,
// Line 56
        status: "INTERVIEW_COMPLETE",
// Line 57
      },
// Line 58
      commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
// Line 59
    };
// Line 60
  }
```

#### Action: Add COMPLETE_INTERVIEW Command

**Before:**
```typescript
  if (event.type === "INTERVIEW_ENDED") {
    return {
      state: {
        ...state,
        status: "INTERVIEW_COMPLETE",
      },
      commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
    };
  }
```

**After:**
```typescript
  if (event.type === "INTERVIEW_ENDED") {
    return {
      state: {
        ...state,
        status: "INTERVIEW_COMPLETE",
      },
      commands: [
        { type: "STOP_AUDIO" },
        { type: "CLOSE_CONNECTION" },
        { type: "COMPLETE_INTERVIEW" },
      ],
    };
  }
```

#### Verification Gate

```bash
pnpm typecheck
```

---

### [ ] Step 3.2: Update Last Block Completion Handler

#### Goal

Add `COMPLETE_INTERVIEW` and `COMPLETE_BLOCK` commands when completing the final block.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

#### Find This Location

Navigate to **line 280**. You should see:

```typescript
// Line 277
    case "BLOCK_COMPLETE_SCREEN":
// Line 278
      if (event.type === "USER_CLICKED_CONTINUE") {
// Line 279
        const nextIdx = state.completedBlockIndex + 1;
// Line 280
        if (nextIdx >= context.totalBlocks) {
// Line 281
          return {
// Line 282
            state: {
// Line 283
              ...state,
// Line 284
              status: "INTERVIEW_COMPLETE",
// Line 285
            },
// Line 286
            commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
// Line 287
          };
// Line 288
        }
```

#### Action: Add COMPLETE_INTERVIEW and COMPLETE_BLOCK Commands

**Before:**
```typescript
        if (nextIdx >= context.totalBlocks) {
          return {
            state: {
              ...state,
              status: "INTERVIEW_COMPLETE",
            },
            commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
          };
        }
```

**After:**
```typescript
        if (nextIdx >= context.totalBlocks) {
          return {
            state: {
              ...state,
              status: "INTERVIEW_COMPLETE",
            },
            commands: [
              { type: "STOP_AUDIO" },
              { type: "CLOSE_CONNECTION" },
              { type: "COMPLETE_BLOCK", blockNumber: state.completedBlockIndex + 1 },
              { type: "COMPLETE_INTERVIEW" },
            ],
          };
        }
```

#### Why COMPLETE_BLOCK Here?

When the user clicks "Continue" on the final block's complete screen, we need to:
1. Mark the final block as COMPLETED (via `COMPLETE_BLOCK`)
2. Mark the interview as COMPLETED (via `COMPLETE_INTERVIEW`)

The `COMPLETE_BLOCK` command wasn't emitted here before because the API was auto-completing. Now that we removed that, we need to explicitly emit it.

#### Common Mistakes for This Step

##### Mistake 1: Wrong blockNumber calculation
```typescript
// WRONG - blockNumber is 1-indexed, completedBlockIndex is 0-indexed
{ type: "COMPLETE_BLOCK", blockNumber: state.completedBlockIndex }

// CORRECT - add 1 to convert from 0-indexed to 1-indexed
{ type: "COMPLETE_BLOCK", blockNumber: state.completedBlockIndex + 1 }
```

##### Mistake 2: Wrong command order
The order doesn't strictly matter for functionality, but keeping cleanup commands (`STOP_AUDIO`, `CLOSE_CONNECTION`) first is conventional.

#### Verification Gate

```bash
pnpm typecheck
```

---

## Phase 4: Update Tests (Est. 20 mins)

### [ ] Step 4.1: Add COMPLETE_INTERVIEW Tests

#### Goal

Add tests verifying that `COMPLETE_INTERVIEW` is emitted correctly in all scenarios.

#### File

`src/test/unit/session-reducer.test.ts`

#### Find This Location

Navigate to the end of the file, around **line 1075**. You should see:

```typescript
// Line 1073
      });
// Line 1074
    });
// Line 1075
  });
// Line 1076
});
```

#### Action: Add New Test Suite

Insert the new test suite **before** the final `});` (line 1076):

```typescript
  describe("COMPLETE_INTERVIEW command", () => {
    it("should emit COMPLETE_INTERVIEW when completing final block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 2, // Last block (totalBlocks = 3)
        ...createCommonFields(),
      };
      const context: ReducerContext = { answerTimeLimit: 120, totalBlocks: 3 };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 3,
      });
    });

    it("should NOT emit COMPLETE_INTERVIEW when completing non-final block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0, // First block
        ...createCommonFields(),
      };
      const context: ReducerContext = { answerTimeLimit: 120, totalBlocks: 3 };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );

      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      expect(result.commands).not.toContainEqual(
        expect.objectContaining({ type: "COMPLETE_INTERVIEW" }),
      );
    });

    it("should emit COMPLETE_INTERVIEW on INTERVIEW_ENDED from any state", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: now - 10000,
        answerStartTime: now - 5000,
        ...createCommonFields(),
      };
      const context: ReducerContext = { answerTimeLimit: 120, totalBlocks: 3 };

      const result = sessionReducer(
        state,
        { type: "INTERVIEW_ENDED" },
        context,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
    });

    it("should emit COMPLETE_INTERVIEW for single-block interview completion", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };
      const singleBlockContext: ReducerContext = {
        answerTimeLimit: 120,
        totalBlocks: 1,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        singleBlockContext,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 1,
      });
    });
  });
```

#### Verification Gate

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

**Expected Result:**

All existing tests should pass, plus your 4 new tests:
- `should emit COMPLETE_INTERVIEW when completing final block`
- `should NOT emit COMPLETE_INTERVIEW when completing non-final block`
- `should emit COMPLETE_INTERVIEW on INTERVIEW_ENDED from any state`
- `should emit COMPLETE_INTERVIEW for single-block interview completion`

---

### [ ] Step 4.2: Update Existing Tests

Some existing tests assert on the exact number of commands. These need to be updated.

#### Find and Update: INTERVIEW_ENDED Test

Navigate to approximately **line 513** (in the `INTERVIEW_ENDED event` describe block). Find:

```typescript
      expect(result.commands).toHaveLength(2);
```

This test expects 2 commands, but now we emit 3. Update it:

**Before:**
```typescript
      expect(result.commands).toHaveLength(2);
```

**After:**
```typescript
      expect(result.commands).toHaveLength(3);
```

Do this for all three tests in the `INTERVIEW_ENDED event` describe block:
- Line ~513 (from ANSWERING state)
- Line ~536 (from ANSWER_TIMEOUT_PAUSE state)
- Line ~557 (from BLOCK_COMPLETE_SCREEN state)

#### Find and Update: Final Block Completion Tests

Navigate to the test at approximately **line 378** (in `BLOCK_COMPLETE_SCREEN state` describe):

```typescript
    it("should transition to INTERVIEW_COMPLETE when completing final block", () => {
```

This test doesn't check command count, but you should verify it still passes.

Also find and update the test at approximately **line 402** (`should handle single-block interview completion`):

This test checks for `STOP_AUDIO` and `CLOSE_CONNECTION`. It should still pass since those are still emitted.

#### Verification Gate

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

**All tests must pass.** If any fail, check:
1. Command count assertions (should be 3 for INTERVIEW_ENDED, 4 for final block completion)
2. Import paths are correct
3. Your edits match the spec exactly

---

## Final Integration Verification

### Run All Tests

```bash
pnpm test
```

**All tests must pass.**

### Run Type Check

```bash
pnpm typecheck
```

**No errors should appear.**

### Run Linter

```bash
pnpm check
```

**Fix any lint errors before submitting.**

### Manual Test Scenarios

Test each scenario to verify the fix works:

#### Scenario 1: Skip Block in Dev Mode (Single Block)
1. Start interview with 1 block
2. Click "Skip Block" in dev console
3. **Verify:** State shows BLOCK_COMPLETE_SCREEN (not feedback!)
4. Click "Continue"
5. **Verify:** Navigates to feedback page

#### Scenario 2: Normal Block Completion (Multi-Block)
1. Start interview with 3 blocks
2. Let Block 1 timeout or click "Next"
3. **Verify:** See BLOCK_COMPLETE_SCREEN, not feedback
4. Click "Continue"
5. **Verify:** Block 2 starts (not feedback)

#### Scenario 3: Last Block Completion
1. Complete blocks 1 and 2
2. Complete block 3
3. See BLOCK_COMPLETE_SCREEN
4. Click "Continue"
5. **Verify:** Navigates to feedback

#### Scenario 4: User Ends Interview Early
1. During any block, click "End Interview"
2. **Verify:** Navigates to feedback

---

## Troubleshooting

### Error: "Property 'updateStatus' does not exist on type..."

**Cause:** The `updateStatus` mutation doesn't exist on the interview router.

**Fix:** Verify the mutation exists:
```bash
grep -n "updateStatus" src/server/api/routers/interview.ts
```

It should exist around line 422. If not, check if it's named differently.

### Error: Tests fail with "expected 2, received 3" for command count

**Cause:** You updated the reducer but not the tests.

**Fix:** Update all tests that assert `toHaveLength(2)` for INTERVIEW_ENDED to `toHaveLength(3)`.

### Error: "COMPLETE_INTERVIEW is not assignable to type Command"

**Cause:** You didn't add `COMPLETE_INTERVIEW` to the Command type union.

**Fix:** Verify your edit to `types.ts` includes:
```typescript
  | { type: "COMPLETE_INTERVIEW" };
```

### Interview still ends prematurely after changes

**Cause:** You may have missed one of the API changes.

**Fix:** Verify both files were updated:
```bash
grep -n "totalBlocks" src/server/api/routers/interview.ts
grep -n "totalBlocks" src/server/api/routers/interview-worker.ts
```

Neither should find the "Check if this was the last block" pattern in the completeBlock mutation.

---

## Pre-Submission Checklist

Before creating your pull request:

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm check`
- [ ] Only modified files listed in this guide
- [ ] No `console.log` statements in production code (except the intentional error log)
- [ ] No commented-out code
- [ ] Branch is up to date with main

### Files Changed

Verify your changes match this list exactly:

| File | Status |
|------|--------|
| `src/server/api/routers/interview.ts` | Modified |
| `src/server/api/routers/interview-worker.ts` | Modified |
| `src/app/.../session/types.ts` | Modified |
| `src/app/.../session/reducer.ts` | Modified |
| `src/app/.../session/hooks/useInterviewSession.ts` | Modified |
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
