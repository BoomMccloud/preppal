# Implementation Guide: Block Interview Feedback Bug Fix (FEAT31)

**Based on Spec**: `docs/todo/FEAT31_block_interview_feedback_bug.md`
**Verification Report**: `docs/todo/FEAT31_verification_report.md`
**Generated**: 2025-12-30
**Estimated Total Time**: 1-2 hours

---

## Overview

### What You're Building

You're fixing a bug where block-based interviews never generate feedback. When users complete all blocks, the system transitions to `INTERVIEW_COMPLETE` but never sends the `EndRequest` to the worker because `CLOSE_CONNECTION` is not emitted. Additionally, you're refactoring the block completion logic from a reactive pattern (useEffect) to a command-driven pattern for better testability.

### Core Concept (The "North Star")

**"The Reducer is the Brain. Commands are Instructions. Drivers are Dumb."**

In this architecture:
- The **Reducer** decides what happens (state transitions) and what should be done (commands)
- **Commands** are explicit instructions emitted by the reducer (e.g., `CLOSE_CONNECTION`, `COMPLETE_BLOCK`)
- **Drivers/Hooks** execute commands without making decisions

The bug exists because the reducer is NOT emitting commands when it should. The fix makes the reducer emit proper commands, and removes reactive useEffect code that bypasses this pattern.

### Deliverables

After completing this guide, you will have:

- [ ] A new `COMPLETE_BLOCK` command type
- [ ] Reducer emitting `COMPLETE_BLOCK` when blocks time out
- [ ] Reducer emitting `CLOSE_CONNECTION` when the last block completes
- [ ] Command executor handling `COMPLETE_BLOCK` to call the tRPC mutation
- [ ] Removed reactive useEffect from BlockSession
- [ ] Unit tests verifying the new behavior

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts` | Modify | Add `COMPLETE_BLOCK` command type |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts` | Modify | Emit `COMPLETE_BLOCK` and `CLOSE_CONNECTION` commands |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts` | Modify | Handle `COMPLETE_BLOCK` command |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx` | Modify | Remove reactive useEffect |
| `src/test/unit/session-golden-path.test.ts` | Modify | Add unit tests |

### Out of Scope - DO NOT MODIFY

These files/areas are **not part of this task**:

- `worker/` - Worker code is not modified
- `src/server/api/routers/interview.ts` - The `completeBlock` mutation already exists
- `DEV_FORCE_BLOCK_COMPLETE` event handler - Intentionally left without `COMPLETE_BLOCK` (dev-only shortcut)
- Any file not listed in "Files You Will Modify"

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
pnpm check
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
git checkout -b fix/feat31-block-feedback-bug
```

---

## Phase 1: Add Command Type (Est. 5 mins)

### [ ] Step 1.1: Add COMPLETE_BLOCK Command

#### Goal

Add the new `COMPLETE_BLOCK` command type so the reducer can emit it.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

#### Find This Location

Open the file and navigate to **lines 11-18**. You should see the `Command` type:

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
  | { type: "STOP_AUDIO" };
```

#### Action: Add New Command Variant

**Current (Lines 12-18):**
```typescript
export type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "SETUP_AUDIO" }
  | { type: "STOP_AUDIO" };
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
  | { type: "COMPLETE_BLOCK"; blockNumber: number };
```

#### Common Mistakes

##### Mistake 1: Missing semicolon after the union

```typescript
// WRONG - missing semicolon
export type Command =
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number }

// CORRECT - semicolon at the end
export type Command =
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number };
```

##### Mistake 2: Wrong property name

```typescript
// WRONG - using 'block' instead of 'blockNumber'
| { type: "COMPLETE_BLOCK"; block: number }

// CORRECT - matches tRPC mutation input
| { type: "COMPLETE_BLOCK"; blockNumber: number }
```

#### Verification Gate

```bash
pnpm typecheck
```

Should pass with no errors.

---

## Phase 2: Update Reducer (Est. 20 mins)

### [ ] Step 2.1: Emit COMPLETE_BLOCK on Block Timeout

#### Goal

When a block times out (block duration exceeded), emit `COMPLETE_BLOCK` command so the database is updated.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

#### Find This Location

Open the file and navigate to **lines 172-187**. You should see the `ANSWERING` case with block timeout logic:

```typescript
// Line 172
    case "ANSWERING":
// Line 173
      if (event.type === "TICK") {
// Line 174
        // 1. Block Limit (hard limit - checked first, 0 = no limit)
// Line 175
        if (
// Line 176
          context.blockDuration > 0 &&
// Line 177
          isTimeUp(state.blockStartTime, context.blockDuration, now)
// Line 178
        ) {
// Line 179
          return {
// Line 180
            state: {
// Line 181
              ...state,
// Line 182
              status: "BLOCK_COMPLETE_SCREEN",
// Line 183
              completedBlockIndex: state.blockIndex,
// Line 184
            },
// Line 185
            commands: [],
// Line 186
          };
// Line 187
        }
```

#### Action: Add COMPLETE_BLOCK Command

**Current (Lines 179-186):**
```typescript
          return {
            state: {
              ...state,
              status: "BLOCK_COMPLETE_SCREEN",
              completedBlockIndex: state.blockIndex,
            },
            commands: [],
          };
```

**Replace With:**
```typescript
          return {
            state: {
              ...state,
              status: "BLOCK_COMPLETE_SCREEN",
              completedBlockIndex: state.blockIndex,
            },
            commands: [
              { type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 },
            ],
          };
```

#### Common Mistakes

##### Mistake 1: Using 0-indexed blockNumber

```typescript
// WRONG - blockIndex is 0-indexed, but tRPC expects 1-indexed
commands: [{ type: "COMPLETE_BLOCK", blockNumber: state.blockIndex }]

// CORRECT - add 1 to convert to 1-indexed
commands: [{ type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 }]
```

The tRPC mutation `completeBlock` expects `blockNumber` to be 1-indexed (matching database storage), but `state.blockIndex` is 0-indexed.

---

### [ ] Step 2.2: Emit CLOSE_CONNECTION on Last Block Complete

#### Goal

When the user clicks "Continue" on the last block's completion screen, emit `CLOSE_CONNECTION` so the worker receives `EndRequest` and generates feedback.

#### Find This Location

Navigate to **lines 226-237**. You should see the `BLOCK_COMPLETE_SCREEN` case:

```typescript
// Line 226
    case "BLOCK_COMPLETE_SCREEN":
// Line 227
      if (event.type === "USER_CLICKED_CONTINUE") {
// Line 228
        const nextIdx = state.completedBlockIndex + 1;
// Line 229
        if (nextIdx >= context.totalBlocks) {
// Line 230
          return {
// Line 231
            state: {
// Line 232
              ...state,
// Line 233
              status: "INTERVIEW_COMPLETE",
// Line 234
            },
// Line 235
            commands: [],
// Line 236
          };
// Line 237
        }
```

#### Action: Add CLOSE_CONNECTION Command

**Current (Lines 230-236):**
```typescript
          return {
            state: {
              ...state,
              status: "INTERVIEW_COMPLETE",
            },
            commands: [],
          };
```

**Replace With:**
```typescript
          return {
            state: {
              ...state,
              status: "INTERVIEW_COMPLETE",
            },
            commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
          };
```

#### Why STOP_AUDIO Too?

The `STOP_AUDIO` command ensures any playing audio is stopped before disconnecting. This matches the pattern used in the `INTERVIEW_ENDED` global handler (line 52).

#### Common Mistakes

##### Mistake 1: Only adding CLOSE_CONNECTION

```typescript
// INCOMPLETE - audio might still be playing
commands: [{ type: "CLOSE_CONNECTION" }]

// CORRECT - stop audio first, then disconnect
commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }]
```

##### Mistake 2: Adding commands to wrong location

The commands should ONLY be added in the `if (nextIdx >= context.totalBlocks)` block. Don't add them to the else branch (lines 238-247) where we transition to the next block.

#### Verification Gate

```bash
pnpm typecheck
```

Should pass with no errors.

---

## Phase 3: Update Command Executor (Est. 15 mins)

### [ ] Step 3.1: Add COMPLETE_BLOCK Handler

#### Goal

Add handling for the new `COMPLETE_BLOCK` command in the command executor so it calls the tRPC mutation.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts`

#### Find This Location

Navigate to **lines 79-101**. You should see the `executeCommand` function:

```typescript
// Line 79
  // Command executor
// Line 80
  const executeCommand = useCallback(
// Line 81
    (cmd: Command) => {
// Line 82
      switch (cmd.type) {
// Line 83
        case "START_CONNECTION":
// Line 84
          driver.connect();
// Line 85
          break;
// Line 86
        case "CLOSE_CONNECTION":
// Line 87
          driver.disconnect();
// Line 88
          break;
// Line 89
        case "MUTE_MIC":
// Line 90
          driver.mute();
// Line 91
          break;
// Line 92
        case "UNMUTE_MIC":
// Line 93
          driver.unmute();
// Line 94
          break;
// Line 95
        case "STOP_AUDIO":
// Line 96
          driver.stopAudio();
// Line 97
          break;
// Line 98
      }
// Line 99
    },
// Line 100
    [driver],
// Line 101
  );
```

#### Action: Add COMPLETE_BLOCK Case and Import Mutation

**Step A: Add tRPC import**

Go to **line 2**. Add the api import after the existing imports:

**Current (Lines 1-11):**
```typescript
import { useReducer, useEffect, useCallback, useRef } from "react";
import { useRouter } from "~/i18n/navigation";
import { useInterviewSocket } from "../useInterviewSocket";
import { sessionReducer } from "../reducer";
import { TIMER_CONFIG } from "../constants";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  Command,
} from "../types";
```

**Replace With:**
```typescript
import { useReducer, useEffect, useCallback, useRef } from "react";
import { useRouter } from "~/i18n/navigation";
import { api } from "~/trpc/react";
import { useInterviewSocket } from "../useInterviewSocket";
import { sessionReducer } from "../reducer";
import { TIMER_CONFIG } from "../constants";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  Command,
} from "../types";
```

**Step B: Add completeBlock mutation**

Go to **line 31** (inside the function, after `const context = ...`). Add the mutation:

**Current (Lines 30-32):**
```typescript
  const router = useRouter();
  const context = config?.context ?? defaultContext;

  // Capture commands from reducer
```

**Replace With:**
```typescript
  const router = useRouter();
  const context = config?.context ?? defaultContext;
  const completeBlock = api.interview.completeBlock.useMutation();

  // Capture commands from reducer
```

**Step C: Add COMPLETE_BLOCK case in executeCommand**

**Current (Lines 95-98):**
```typescript
        case "STOP_AUDIO":
          driver.stopAudio();
          break;
      }
```

**Replace With:**
```typescript
        case "STOP_AUDIO":
          driver.stopAudio();
          break;
        case "COMPLETE_BLOCK":
          completeBlock.mutate({
            interviewId,
            blockNumber: cmd.blockNumber,
          });
          break;
```

**Step D: Update useCallback dependencies**

**Current (Lines 99-101):**
```typescript
    },
    [driver],
  );
```

**Replace With:**
```typescript
    },
    [driver, interviewId, completeBlock],
  );
```

#### Common Mistakes

##### Mistake 1: Forgetting to add interviewId to dependencies

```typescript
// WRONG - interviewId is used but not in deps
[driver, completeBlock]

// CORRECT - include all used variables
[driver, interviewId, completeBlock]
```

##### Mistake 2: Using wrong mutation import path

```typescript
// WRONG - server-side import
import { api } from "~/trpc/server";

// CORRECT - client-side import (this is a React hook)
import { api } from "~/trpc/react";
```

##### Mistake 3: Awaiting the mutation

```typescript
// WRONG - executeCommand should be synchronous (fire-and-forget)
case "COMPLETE_BLOCK":
  await completeBlock.mutateAsync({ ... });
  break;

// CORRECT - fire-and-forget, UI doesn't wait for DB
case "COMPLETE_BLOCK":
  completeBlock.mutate({ ... });
  break;
```

The `COMPLETE_BLOCK` mutation is intentionally fire-and-forget. The critical path for feedback generation is `CLOSE_CONNECTION`, not the DB update.

#### Verification Gate

```bash
pnpm typecheck
```

Should pass with no errors.

---

## Phase 4: Remove Reactive Code (Est. 10 mins)

### [ ] Step 4.1: Remove useEffect from BlockSession

#### Goal

Remove the reactive useEffect that calls `completeBlock.mutate()` when state changes. This logic is now handled by commands.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx`

#### Find This Location

Navigate to **lines 36 and 52-79**. You should see:

```typescript
// Line 36
  const completeBlock = api.interview.completeBlock.useMutation();
```

And later:

```typescript
// Line 52
  // Side Effect: Sync Block Completion to DB
// Line 53
  const lastCompletedRef = useRef<number | null>(null);
// Line 54
// Line 55
  useEffect(() => {
// Line 56
    if (state.status === "BLOCK_COMPLETE_SCREEN") {
// Line 57
      const blockIdx = state.completedBlockIndex;
// Line 58
// Line 59
      // Guard: prevent duplicate calls on re-render or Strict Mode
// Line 60
      if (lastCompletedRef.current === blockIdx) {
// Line 61
        return;
// Line 62
      }
// Line 63
      lastCompletedRef.current = blockIdx;
// Line 64
// Line 65
      const block = blocks[blockIdx];
// Line 66
      if (!block) {
// Line 67
        console.error(
// Line 68
          "[BlockSession] Invalid block index for completion:",
// Line 69
          blockIdx,
// Line 70
        );
// Line 71
        return;
// Line 72
      }
// Line 73
// Line 74
      completeBlock.mutate({
// Line 75
        interviewId: interview.id,
// Line 76
        blockNumber: block.blockNumber,
// Line 77
      });
// Line 78
    }
// Line 79
  }, [state, blocks, interview.id, completeBlock]);
```

#### Action: Delete Reactive Code

**Step A: Remove the mutation hook (line 36)**

**Current (Lines 35-36):**
```typescript
  const t = useTranslations("interview.blockSession");
  const completeBlock = api.interview.completeBlock.useMutation();
```

**Replace With:**
```typescript
  const t = useTranslations("interview.blockSession");
```

**Step B: Remove the ref and useEffect (lines 52-79)**

Delete the entire block from line 52 to line 79:

```typescript
  // Side Effect: Sync Block Completion to DB
  const lastCompletedRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.status === "BLOCK_COMPLETE_SCREEN") {
      const blockIdx = state.completedBlockIndex;

      // Guard: prevent duplicate calls on re-render or Strict Mode
      if (lastCompletedRef.current === blockIdx) {
        return;
      }
      lastCompletedRef.current = blockIdx;

      const block = blocks[blockIdx];
      if (!block) {
        console.error(
          "[BlockSession] Invalid block index for completion:",
          blockIdx,
        );
        return;
      }

      completeBlock.mutate({
        interviewId: interview.id,
        blockNumber: block.blockNumber,
      });
    }
  }, [state, blocks, interview.id, completeBlock]);
```

**Step C: Remove unused imports**

**Current (Lines 8-9):**
```typescript
import { useEffect, useRef, useCallback } from "react";
import { api } from "~/trpc/react";
```

**Replace With:**
```typescript
import { useCallback } from "react";
```

Note: `useEffect` and `useRef` are no longer used in this file after removing the reactive code. The `api` import is also no longer needed.

#### Common Mistakes

##### Mistake 1: Leaving the import but removing the usage

```typescript
// WRONG - unused import causes lint error
import { api } from "~/trpc/react";
// But completeBlock is deleted...

// CORRECT - remove the import too
// (no api import needed)
```

##### Mistake 2: Removing too much

Only remove the specific useEffect and ref. Don't remove the other useCallback (`handleConnectionReady`) which is still needed.

#### Verification Gate

```bash
pnpm typecheck
pnpm lint
```

Both should pass with no errors.

---

## Phase 5: Add Unit Tests (Est. 20 mins)

### [ ] Step 5.1: Add Block Completion Command Tests

#### Goal

Add tests to verify the reducer emits the correct commands for block completion.

#### File

`src/test/unit/session-golden-path.test.ts`

#### Find This Location

Navigate to **line 590** (end of file, before the final `});`):

```typescript
// Line 588
    expect(result.commands).toEqual([]);
// Line 589
  });
// Line 590
});
```

#### Action: Add Test Cases

Insert the following at **line 590**, before the final `});`:

```typescript

  describe("Block Completion Commands (FEAT31)", () => {
    it("should emit COMPLETE_BLOCK when block times out", () => {
      const context: ReducerContext = {
        answerTimeLimit: 90,
        blockDuration: 600, // 10 minutes
        totalBlocks: 3,
      };

      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now,
        answerStartTime: now,
        connectionState: "live",
        transcript: [],
        pendingUser: "",
        pendingAI: "",
        elapsedTime: 0,
        error: null,
        isAiSpeaking: false,
      };

      // Simulate time passing beyond block duration (601 seconds)
      const laterTime = now + 601 * 1000;
      const result = sessionReducer(state, { type: "TICK" }, context, laterTime);

      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 1, // 1-indexed
      });
    });

    it("should emit CLOSE_CONNECTION when last block completes", () => {
      const context: ReducerContext = {
        answerTimeLimit: 90,
        blockDuration: 600,
        totalBlocks: 3,
      };

      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 2, // Last block (0-indexed)
        connectionState: "live",
        transcript: [],
        pendingUser: "",
        pendingAI: "",
        elapsedTime: 100,
        error: null,
        isAiSpeaking: false,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
    });

    it("should NOT emit CLOSE_CONNECTION for non-last blocks", () => {
      const context: ReducerContext = {
        answerTimeLimit: 90,
        blockDuration: 600,
        totalBlocks: 3,
      };

      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0, // First block
        connectionState: "live",
        transcript: [],
        pendingUser: "",
        pendingAI: "",
        elapsedTime: 100,
        error: null,
        isAiSpeaking: false,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
      );

      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).not.toContainEqual({ type: "CLOSE_CONNECTION" });
    });

    it("should emit correct blockNumber for middle block", () => {
      const context: ReducerContext = {
        answerTimeLimit: 90,
        blockDuration: 600,
        totalBlocks: 3,
      };

      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 1, // Second block (0-indexed)
        blockStartTime: now,
        answerStartTime: now,
        connectionState: "live",
        transcript: [],
        pendingUser: "",
        pendingAI: "",
        elapsedTime: 0,
        error: null,
        isAiSpeaking: false,
      };

      const laterTime = now + 601 * 1000;
      const result = sessionReducer(state, { type: "TICK" }, context, laterTime);

      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 2, // 1-indexed (blockIndex 1 + 1)
      });
    });
  });
```

#### Verification Gate

```bash
pnpm test src/test/unit/session-golden-path.test.ts
```

All tests should pass, including the 4 new tests.

---

## Final Success Criteria

Before submitting your PR, verify the following:

- [ ] **Functional**: Block timeout emits `COMPLETE_BLOCK` command
- [ ] **Functional**: Last block completion emits `CLOSE_CONNECTION` command
- [ ] **Functional**: Non-last block completion does NOT emit `CLOSE_CONNECTION`
- [ ] **Technical**: `pnpm typecheck` passes with zero errors
- [ ] **Technical**: `pnpm lint` passes with zero errors
- [ ] **Technical**: `pnpm test` passes with all tests green
- [ ] **Code Quality**: No reactive useEffect remains in BlockSession for block completion

---

## Troubleshooting

### Error: "Type 'COMPLETE_BLOCK' is not assignable to type 'Command'"

**Cause**: The `COMPLETE_BLOCK` variant wasn't added to the Command type union in `types.ts`.

**Fix**: Verify you added the line:
```typescript
| { type: "COMPLETE_BLOCK"; blockNumber: number };
```

### Error: "Property 'mutate' does not exist on type..."

**Cause**: The `completeBlock` mutation hook wasn't defined.

**Fix**: Verify you added:
```typescript
const completeBlock = api.interview.completeBlock.useMutation();
```

### Error: "Cannot find module '~/trpc/react'"

**Cause**: Wrong import path.

**Fix**: The correct path is `~/trpc/react` (not `~/trpc/client` or `~/trpc/server`).

### Error: "'useRef' is declared but its value is never read"

**Cause**: You removed the useEffect but forgot to remove the `useRef` import.

**Fix**: Update the import line to only include `useCallback`:
```typescript
import { useCallback } from "react";
```

### Tests fail with "expected COMPLETE_BLOCK but received empty array"

**Cause**: The reducer change wasn't made correctly.

**Fix**: Verify lines 179-186 in `reducer.ts` have:
```typescript
commands: [
  { type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 },
],
```

---

## Pre-Submission Checklist

Before creating your pull request:

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm lint`
- [ ] Only modified files listed in this guide
- [ ] Commit messages are clear

### Files Changed

Verify your changes match this list exactly:

| File | Status |
|------|--------|
| `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts` | Modified |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts` | Modified |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts` | Modified |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx` | Modified |
| `src/test/unit/session-golden-path.test.ts` | Modified |

Run `git status` to verify. If you modified other files, **undo those changes**.

---

## Getting Help

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
