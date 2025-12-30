# Implementation Guide: Dev Mode Controls for Block Interviews

**Based on Spec**: `docs/todo/FEAT30_dev_mode_controls.md`
**Verification Report**: `docs/todo/FEAT30_verification_report.md`
**Generated**: 2025-12-30
**Estimated Time**: 30-45 minutes

---

## Overview

### What You're Building

Two buttons in the dev console sidebar that let developers skip through block interview states without waiting for real timers. This speeds up manual testing of the block interview flow.

### Deliverables

After completing this guide, you will have:

- [ ] Two new event types in the state machine (`DEV_FORCE_BLOCK_COMPLETE`, `DEV_FORCE_ANSWER_TIMEOUT`)
- [ ] Reducer handlers for these events (only active in development mode)
- [ ] Two buttons in the dev console Actions section
- [ ] Unit tests for the new reducer logic

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts` | Modify | Add 2 dev event types |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts` | Modify | Add dev event handlers |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev.tsx` | Modify | Add Block Controls UI |
| `src/test/unit/session-reducer.test.ts` | Modify | Add tests for dev events |

### Out of Scope - DO NOT MODIFY

- `SessionContentProd.tsx` - Production UI is not affected
- `useInterviewSession.ts` - Hook doesn't need changes
- `BlockSession.tsx` - Block orchestrator doesn't need changes
- Any files not listed above

---

## Prerequisites

### 1. Environment Setup

```bash
# Verify you're in the correct directory
pwd
# Should output: /Users/.../preppal

# Ensure dependencies are installed
pnpm install
```

### 2. Verify Tests Pass

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

All tests should pass before you start.

### 3. Create Your Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/dev-mode-block-controls
```

---

## Step 1: Add Dev Event Types

### Goal

Add two new event types to the `SessionEvent` union that will trigger dev-only state transitions.

### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

### Find This Location

Open the file and navigate to **line 66**. You should see:

```typescript
// Line 64
  | { type: "TRANSCRIPT_PENDING"; buffers: { user?: string; ai?: string } }
// Line 65
  | { type: "AI_SPEAKING_CHANGED"; isSpeaking: boolean }
// Line 66
  | { type: "TIMER_TICK" };
```

### Add This Code

Replace line 66 with the following (adding dev events before the semicolon):

```typescript
  | { type: "AI_SPEAKING_CHANGED"; isSpeaking: boolean }
  | { type: "TIMER_TICK" }
  // Dev-only events (only processed in development mode)
  | { type: "DEV_FORCE_BLOCK_COMPLETE" }
  | { type: "DEV_FORCE_ANSWER_TIMEOUT" };
```

### After This Step

Lines 65-69 should now look like:

```typescript
  | { type: "AI_SPEAKING_CHANGED"; isSpeaking: boolean }
  | { type: "TIMER_TICK" }
  // Dev-only events (only processed in development mode)
  | { type: "DEV_FORCE_BLOCK_COMPLETE" }
  | { type: "DEV_FORCE_ANSWER_TIMEOUT" };
```

### Common Mistakes

#### Mistake 1: Forgetting the pipe character

```typescript
// WRONG - missing |
  { type: "DEV_FORCE_BLOCK_COMPLETE" }

// CORRECT - union types need |
  | { type: "DEV_FORCE_BLOCK_COMPLETE" }
```

#### Mistake 2: Adding semicolon after each line

```typescript
// WRONG - semicolons break the union
  | { type: "DEV_FORCE_BLOCK_COMPLETE" };
  | { type: "DEV_FORCE_ANSWER_TIMEOUT" };

// CORRECT - only one semicolon at the end
  | { type: "DEV_FORCE_BLOCK_COMPLETE" }
  | { type: "DEV_FORCE_ANSWER_TIMEOUT" };
```

### Verification Gate

Run TypeScript check:

```bash
pnpm typecheck
```

No errors should appear. If you see `Type '"DEV_FORCE_BLOCK_COMPLETE"' is not assignable`, the union syntax is wrong.

---

## Step 2: Add Dev Event Handlers to Reducer

### Goal

Handle the new dev events in the reducer, guarded by `NODE_ENV` so they only work in development.

### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

### Find This Location

Open the file and navigate to **line 54**. You should see:

```typescript
// Line 52
      commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
// Line 53
    };
// Line 54
  }
// Line 55
// Line 56
  // Handle new driver events (work across all states)
```

### Add This Code

Insert the following code **after line 54** (after the closing `}` of INTERVIEW_ENDED) and **before line 56** (before the "Handle new driver events" comment):

```typescript
  }

  // Dev-only events - only processed in development mode
  // These allow developers to step through block states without waiting for timers
  if (process.env.NODE_ENV !== "production") {
    // DEV_FORCE_BLOCK_COMPLETE: Skip directly to block complete screen
    if (event.type === "DEV_FORCE_BLOCK_COMPLETE") {
      if (
        state.status === "ANSWERING" ||
        state.status === "ANSWER_TIMEOUT_PAUSE"
      ) {
        return {
          state: {
            ...state,
            status: "BLOCK_COMPLETE_SCREEN",
            completedBlockIndex: state.blockIndex,
          },
          commands: [],
        };
      }
      return { state, commands: [] };
    }

    // DEV_FORCE_ANSWER_TIMEOUT: Trigger answer timeout immediately
    if (event.type === "DEV_FORCE_ANSWER_TIMEOUT") {
      if (state.status === "ANSWERING") {
        return {
          state: {
            ...state,
            status: "ANSWER_TIMEOUT_PAUSE",
            pauseStartedAt: now,
          },
          commands: [{ type: "MUTE_MIC" }],
        };
      }
      return { state, commands: [] };
    }
  }

  // Handle new driver events (work across all states)
```

### After This Step

The reducer function should have this structure (showing key sections):

```typescript
export function sessionReducer(...): ReducerResult {
  // Global Event Handler: INTERVIEW_ENDED
  if (event.type === "INTERVIEW_ENDED") {
    // ... lines 46-54
  }

  // Dev-only events (NEW - lines 55-88)
  if (process.env.NODE_ENV !== "production") {
    // ...
  }

  // Handle new driver events (work across all states)
  switch (event.type) {
    // ... existing code
  }
```

### Common Mistakes

#### Mistake 1: Wrong property name - `blockIndex` vs `completedBlockIndex`

```typescript
// WRONG - BLOCK_COMPLETE_SCREEN uses completedBlockIndex, not blockIndex
status: "BLOCK_COMPLETE_SCREEN",
blockIndex: state.blockIndex,  // This property doesn't exist on this state!

// CORRECT - use the right property name
status: "BLOCK_COMPLETE_SCREEN",
completedBlockIndex: state.blockIndex,
```

#### Mistake 2: Forgetting to access `state.blockIndex` from correct state

```typescript
// WRONG - trying to access blockIndex when state could be WAITING_FOR_CONNECTION
completedBlockIndex: state.blockIndex,  // TypeScript error!

// CORRECT - the if guard ensures we're in ANSWERING or ANSWER_TIMEOUT_PAUSE
if (state.status === "ANSWERING" || state.status === "ANSWER_TIMEOUT_PAUSE") {
  // Now TypeScript knows state.blockIndex exists
  completedBlockIndex: state.blockIndex,
}
```

#### Mistake 3: Missing fallback return

```typescript
// WRONG - no return if state guard fails
if (event.type === "DEV_FORCE_BLOCK_COMPLETE") {
  if (state.status === "ANSWERING") {
    return { ... };
  }
  // Function falls through with no return!
}

// CORRECT - always return something
if (event.type === "DEV_FORCE_BLOCK_COMPLETE") {
  if (state.status === "ANSWERING") {
    return { ... };
  }
  return { state, commands: [] };  // Fallback: no-op
}
```

#### Mistake 4: Using wrong NODE_ENV check

```typescript
// WRONG - this ENABLES in production (dangerous!)
if (process.env.NODE_ENV === "production") {

// CORRECT - this DISABLES in production
if (process.env.NODE_ENV !== "production") {
```

### Verification Gate

Run TypeScript check:

```bash
pnpm typecheck
```

No errors should appear.

---

## Step 3: Add Block Controls UI

### Goal

Add two buttons to the dev console sidebar that dispatch the new events.

### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev.tsx`

### Find This Location

Open the file and navigate to **line 413**. You should see:

```typescript
// Line 410
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">
// Line 411
              Actions
// Line 412
            </h3>
// Line 413
            <div className="space-y-3">
// Line 414
              <button
// Line 415
                onClick={handleCheckStatus}
```

### Add This Code

Insert the following code **after line 413** (`<div className="space-y-3">`) and **before line 414** (the existing button):

```typescript
            <div className="space-y-3">
              {/* Block Controls - dev-only buttons to step through states */}
              <div className="mb-4 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Block Controls
                </h4>
                <button
                  onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}
                  disabled={
                    state.status !== "ANSWERING" &&
                    state.status !== "ANSWER_TIMEOUT_PAUSE"
                  }
                  className="w-full rounded bg-yellow-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-yellow-500 disabled:opacity-50"
                >
                  Skip Block
                </button>
                <button
                  onClick={() => dispatch({ type: "DEV_FORCE_ANSWER_TIMEOUT" })}
                  disabled={state.status !== "ANSWERING"}
                  className="w-full rounded bg-orange-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
                >
                  Answer Timeout
                </button>
              </div>
              <button
                onClick={handleCheckStatus}
```

### After This Step

The Actions section (lines 408-440ish) should look like:

```typescript
          {/* Section: Debug Actions */}
          <section>
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              Actions
            </h3>
            <div className="space-y-3">
              {/* Block Controls - dev-only buttons to step through states */}
              <div className="mb-4 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Block Controls
                </h4>
                <button
                  onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}
                  ...
                </button>
                <button
                  onClick={() => dispatch({ type: "DEV_FORCE_ANSWER_TIMEOUT" })}
                  ...
                </button>
              </div>
              <button
                onClick={handleCheckStatus}
                className="w-full rounded bg-gray-800 ..."
              >
                Log Status to Console
              </button>
              ...
            </div>
          </section>
```

### Common Mistakes

#### Mistake 1: Wrong event type string

```typescript
// WRONG - typo in event type (will silently fail)
dispatch({ type: "DEV_FORCE_BLOCK_COMPLETED" })  // Extra 'D'
dispatch({ type: "DEV_SKIP_BLOCK" })  // Wrong name

// CORRECT - exact match required
dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })
```

#### Mistake 2: Missing disabled logic

```typescript
// WRONG - button always enabled, can crash in wrong states
<button onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}>

// CORRECT - disabled when not applicable
<button
  onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}
  disabled={state.status !== "ANSWERING" && state.status !== "ANSWER_TIMEOUT_PAUSE"}
>
```

#### Mistake 3: Wrong comparison operator

```typescript
// WRONG - this disables when we WANT it enabled
disabled={state.status === "ANSWERING"}

// CORRECT - disabled when NOT in valid state
disabled={state.status !== "ANSWERING"}
```

### Verification Gate

Run TypeScript check:

```bash
pnpm typecheck
```

Then run lint:

```bash
pnpm lint
```

Fix any errors before continuing.

---

## Step 4: Add Unit Tests

### Goal

Add tests to verify the new dev event handlers work correctly.

### File

`src/test/unit/session-reducer.test.ts`

### Find This Location

Find the end of the file, before the final closing `});`. The file ends around line 400+.

### Add This Code

Add the following test suite before the final `});`:

```typescript
  describe("Dev-only events", () => {
    describe("DEV_FORCE_BLOCK_COMPLETE", () => {
      it("should transition ANSWERING to BLOCK_COMPLETE_SCREEN", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 1,
          blockStartTime: now - 60000,
          answerStartTime: now - 30000,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_BLOCK_COMPLETE" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
        expect(result.state).toHaveProperty("completedBlockIndex", 1);
        expect(result.commands).toEqual([]);
      });

      it("should transition ANSWER_TIMEOUT_PAUSE to BLOCK_COMPLETE_SCREEN", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWER_TIMEOUT_PAUSE",
          blockIndex: 2,
          blockStartTime: now - 60000,
          pauseStartedAt: now - 1000,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_BLOCK_COMPLETE" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
        expect(result.state).toHaveProperty("completedBlockIndex", 2);
      });

      it("should be a no-op in WAITING_FOR_CONNECTION state", () => {
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_BLOCK_COMPLETE" },
          defaultContext,
        );

        expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      });
    });

    describe("DEV_FORCE_ANSWER_TIMEOUT", () => {
      it("should transition ANSWERING to ANSWER_TIMEOUT_PAUSE with MUTE_MIC command", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 60000,
          answerStartTime: now - 30000,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_ANSWER_TIMEOUT" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
        expect(result.state).toHaveProperty("pauseStartedAt", now);
        expect(result.commands).toContainEqual({ type: "MUTE_MIC" });
      });

      it("should be a no-op in ANSWER_TIMEOUT_PAUSE state", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWER_TIMEOUT_PAUSE",
          blockIndex: 0,
          blockStartTime: now - 60000,
          pauseStartedAt: now - 1000,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_ANSWER_TIMEOUT" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
        expect(result.commands).toEqual([]);
      });

      it("should be a no-op in BLOCK_COMPLETE_SCREEN state", () => {
        const state: SessionState = {
          status: "BLOCK_COMPLETE_SCREEN",
          completedBlockIndex: 0,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_ANSWER_TIMEOUT" },
          defaultContext,
        );

        expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      });
    });
  });
```

### Common Mistakes

#### Mistake 1: Wrong state shape for test

```typescript
// WRONG - ANSWERING requires blockIndex, blockStartTime, answerStartTime
const state: SessionState = {
  status: "ANSWERING",
  ...createCommonFields(),
};

// CORRECT - include all required properties
const state: SessionState = {
  status: "ANSWERING",
  blockIndex: 0,
  blockStartTime: now - 60000,
  answerStartTime: now - 30000,
  ...createCommonFields(),
};
```

#### Mistake 2: Missing `now` parameter

```typescript
// WRONG - `now` is needed for pauseStartedAt
const result = sessionReducer(state, event, defaultContext);

// CORRECT - pass `now` for deterministic testing
const result = sessionReducer(state, event, defaultContext, now);
```

### Verification Gate

Run the tests:

```bash
pnpm test src/test/unit/session-reducer.test.ts
```

All tests should pass, including your new ones:

```
 PASS  src/test/unit/session-reducer.test.ts
  sessionReducer (v5: Command Generation)
    ...
    Dev-only events
      DEV_FORCE_BLOCK_COMPLETE
        ✓ should transition ANSWERING to BLOCK_COMPLETE_SCREEN
        ✓ should transition ANSWER_TIMEOUT_PAUSE to BLOCK_COMPLETE_SCREEN
        ✓ should be a no-op in WAITING_FOR_CONNECTION state
      DEV_FORCE_ANSWER_TIMEOUT
        ✓ should transition ANSWERING to ANSWER_TIMEOUT_PAUSE with MUTE_MIC command
        ✓ should be a no-op in ANSWER_TIMEOUT_PAUSE state
        ✓ should be a no-op in BLOCK_COMPLETE_SCREEN state
```

---

## Final Verification

### Run All Tests

```bash
pnpm test
```

All tests must pass.

### Run Type Check

```bash
pnpm typecheck
```

No errors should appear.

### Run Linter

```bash
pnpm lint
```

Fix any lint errors.

### Run Format

```bash
pnpm format
```

### Manual Test

1. Start the dev server: `pnpm dev`
2. Navigate to an interview with a block-based template
3. Start the interview (you'll see the dev console on the right)
4. In the dev console Actions section, you should see:
   - **Block Controls** header
   - **Skip Block** button (yellow)
   - **Answer Timeout** button (orange)
5. Click **Skip Block** → should show block complete screen
6. Click **Continue** → should advance to next block
7. Click **Answer Timeout** → should show timeout pause (mic muted for 3s)

---

## Troubleshooting

### Error: `Type '"DEV_FORCE_BLOCK_COMPLETE"' is not assignable to type 'SessionEvent'`

**Cause**: The event type wasn't added to the union correctly.

**Fix**: Check `types.ts` - ensure the new event types are inside the `SessionEvent` union with proper `|` syntax.

### Error: `Property 'blockIndex' does not exist on type 'SessionState'`

**Cause**: Trying to access `state.blockIndex` without narrowing the state type first.

**Fix**: Ensure you're inside an `if (state.status === "ANSWERING" || ...)` guard.

### Buttons don't appear in dev console

**Cause**: Code was inserted in wrong location.

**Fix**: Verify the Block Controls div is inside the `<div className="space-y-3">` in the Actions section.

### Buttons appear but clicking does nothing

**Cause 1**: Event type string typo - check exact match with types.ts.

**Cause 2**: Reducer handler not reached - check NODE_ENV guard.

**Fix**: Add `console.log` in reducer to verify event is received:

```typescript
if (process.env.NODE_ENV !== "production") {
  console.log("Dev event received:", event.type);  // Temporary debug
  // ...
}
```

---

## Pre-Submission Checklist

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm lint`
- [ ] Code is formatted: `pnpm format`
- [ ] Only modified files listed in this guide
- [ ] Commit message follows convention

### Files Changed

Verify with `git status`:

| File | Status |
|------|--------|
| `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts` | Modified |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts` | Modified |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev.tsx` | Modified |
| `src/test/unit/session-reducer.test.ts` | Modified |

If you modified other files, **undo those changes**.

---

## Getting Help

If you're stuck after:

1. Re-reading the step instructions
2. Checking "Common Mistakes"
3. Looking at "Troubleshooting"

Then ask with:

- Which step you're on
- The exact error message (full text)
- What you've tried
