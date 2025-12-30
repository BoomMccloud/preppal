# FEAT31: Block Interview Feedback Generation Bug Fix

## Summary

When completing a block-based interview, feedback generation is not triggered. This is caused by two issues:
1. The reducer does not emit `CLOSE_CONNECTION` command when the last block completes
2. Block completion (`completeBlock`) is triggered reactively via useEffect instead of via commands

This spec describes a command-driven fix that addresses the root architectural issue.

## Status: TODO

## Priority: P0 (Critical Bug)

## Problem Statement

**User Impact:** Users who complete block-based interviews see the feedback page stuck in "Generating feedback..." state indefinitely.

**Expected Behavior:** After completing all blocks in a block-based interview, the system should:
1. Mark each block as completed in the database
2. Close the WebSocket connection after the last block
3. Send `EndRequest` to the worker
4. Trigger feedback generation
5. Display feedback on the feedback page

**Actual Behavior:** After completing all blocks:
1. Frontend transitions to `INTERVIEW_COMPLETE` state
2. Frontend navigates to feedback page
3. WebSocket is never properly closed
4. `EndRequest` is never sent
5. Feedback is never generated
6. User sees infinite loading spinner

## Root Cause Analysis (First-Principle)

### Architectural Issue: Split Brain + Reactive Side Effects

The current architecture has **three independent systems** deciding when the interview is "done":

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (Brain #1)           │  Backend (Brain #2)               │
│  Reducer decides UI state      │  completeBlock() marks DB status  │
│  - INTERVIEW_COMPLETE          │  - InterviewBlock.status          │
│                                │  - Interview.status               │
├────────────────────────────────┼────────────────────────────────────┤
│  Worker (Brain #3)             │                                    │
│  finalizeSession() decides     │                                    │
│  when to generate feedback     │                                    │
└─────────────────────────────────────────────────────────────────────┘
```

Additionally, `completeBlock` is triggered **reactively** (useEffect watching state) instead of **imperatively** (command from reducer):

```typescript
// Current: Reactive (BAD)
useEffect(() => {
  if (state.status === "BLOCK_COMPLETE_SCREEN") {
    completeBlock.mutate({ ... });  // Reacts to state change
  }
}, [state]);

// Desired: Intent-Based (GOOD)
// Reducer emits: { commands: [{ type: "COMPLETE_BLOCK", blockNumber: 1 }] }
// Command executor calls: completeBlock.mutate()
```

### Bug #1: Missing `CLOSE_CONNECTION` Command

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts:226-236`

```typescript
case "BLOCK_COMPLETE_SCREEN":
  if (event.type === "USER_CLICKED_CONTINUE") {
    const nextIdx = state.completedBlockIndex + 1;
    if (nextIdx >= context.totalBlocks) {
      return {
        state: { ...state, status: "INTERVIEW_COMPLETE" },
        commands: [],  // ← BUG: Empty! Should have CLOSE_CONNECTION
      };
    }
```

### Bug #2: Reactive `completeBlock` in BlockSession

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx:55-79`

```typescript
useEffect(() => {
  if (state.status === "BLOCK_COMPLETE_SCREEN") {
    const blockIdx = state.completedBlockIndex;
    if (lastCompletedRef.current === blockIdx) return;
    lastCompletedRef.current = blockIdx;

    completeBlock.mutate({ ... });  // ← Reactive, not command-driven
  }
}, [state, ...]);
```

This causes:
- Untestable logic (requires React to trigger mutation)
- Race conditions (DB updated before `EndRequest` sent)
- Inconsistent architecture (some actions are commands, some are reactive)

## Proposed Fix: Command-Driven Block Completion (Option A)

### Design Principles

1. **Single Source of Truth:** Reducer is the brain; it emits commands
2. **Intent-Based:** All side effects (API calls) triggered by commands, not state changes
3. **Testable:** Can verify entire flow without React

### New Command: `COMPLETE_BLOCK`

Add a new command type that the reducer emits when a block completes:

```typescript
// types.ts
export type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number };  // NEW
```

### Changes Required

#### 1. Update Types (`types.ts`)

**Add `COMPLETE_BLOCK` command:**

```typescript
export type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number };
```

#### 2. Update Reducer (`reducer.ts`)

**Emit `COMPLETE_BLOCK` when entering `BLOCK_COMPLETE_SCREEN`:**

```typescript
// When block timeout triggers BLOCK_COMPLETE_SCREEN (lines 174-187)
if (
  context.blockDuration > 0 &&
  isTimeUp(state.blockStartTime, context.blockDuration, now)
) {
  return {
    state: {
      ...state,
      status: "BLOCK_COMPLETE_SCREEN",
      completedBlockIndex: state.blockIndex,
    },
    commands: [
      { type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 },  // ADD: 1-indexed
    ],
  };
}
```

**Emit `CLOSE_CONNECTION` when last block completes (lines 230-236):**

```typescript
if (nextIdx >= context.totalBlocks) {
  return {
    state: { ...state, status: "INTERVIEW_COMPLETE" },
    commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],  // ADD
  };
}
```

#### 3. Update Command Executor (`hooks/useInterviewSession.ts`)

**Add `COMPLETE_BLOCK` case and inject mutation:**

```typescript
export function useInterviewSession(
  interviewId: string,
  token?: string,
  config?: UseInterviewSessionConfig,
) {
  const router = useRouter();
  const context = config?.context ?? defaultContext;

  // Add completeBlock mutation
  const completeBlock = api.interview.completeBlock.useMutation();

  // ... existing code ...

  const executeCommand = useCallback(
    (cmd: Command) => {
      switch (cmd.type) {
        case "START_CONNECTION":
          driver.connect();
          break;
        case "CLOSE_CONNECTION":
          driver.disconnect();
          break;
        case "MUTE_MIC":
          driver.mute();
          break;
        case "UNMUTE_MIC":
          driver.unmute();
          break;
        case "STOP_AUDIO":
          driver.stopAudio();
          break;
        case "COMPLETE_BLOCK":  // ADD
          // Fire-and-forget: UI continues regardless of DB result
          // Block completion is best-effort for resumption; CLOSE_CONNECTION is the critical path
          completeBlock.mutate({
            interviewId,
            blockNumber: cmd.blockNumber,
          });
          break;
      }
    },
    [driver, interviewId, completeBlock],
  );
```

#### 4. Remove Reactive useEffect from BlockSession (`BlockSession.tsx`)

**Delete the entire useEffect block (lines 52-79):**

```typescript
// DELETE THIS ENTIRE BLOCK:
const lastCompletedRef = useRef<number | null>(null);

useEffect(() => {
  if (state.status === "BLOCK_COMPLETE_SCREEN") {
    const blockIdx = state.completedBlockIndex;
    if (lastCompletedRef.current === blockIdx) return;
    lastCompletedRef.current = blockIdx;

    const block = blocks[blockIdx];
    if (!block) {
      console.error("[BlockSession] Invalid block index:", blockIdx);
      return;
    }

    completeBlock.mutate({
      interviewId: interview.id,
      blockNumber: block.blockNumber,
    });
  }
}, [state, blocks, interview.id, completeBlock]);
```

Also remove:
- `const completeBlock = api.interview.completeBlock.useMutation();` (moved to hook)
- `import { api } from "~/trpc/react";` (if no longer needed)

## Data Flow After Fix

```
Block timeout (TICK event)
    ↓
Reducer: ANSWERING → BLOCK_COMPLETE_SCREEN
    ↓
Commands: [{ type: "COMPLETE_BLOCK", blockNumber: 1 }]
    ↓
executeCommand() → completeBlock.mutate()
    ↓
Backend: InterviewBlock.status = "COMPLETED"
    ↓
User sees "Block Complete" screen, clicks Continue
    ↓
Reducer: BLOCK_COMPLETE_SCREEN → ANSWERING (next block)
    ↓
... repeat for each block ...
    ↓
Last block timeout
    ↓
Reducer: ANSWERING → BLOCK_COMPLETE_SCREEN
    ↓
Commands: [{ type: "COMPLETE_BLOCK", blockNumber: N }]
    ↓
User clicks Continue
    ↓
Reducer: BLOCK_COMPLETE_SCREEN → INTERVIEW_COMPLETE
    ↓
Commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }]
    ↓
executeCommand() → driver.disconnect() → EndRequest sent
    ↓
Worker: handleEndRequest() → finalizeSession()
    ↓
Feedback generated ✓
```

## Testing Plan

### Unit Tests (Reducer)

Add to `src/test/unit/session-golden-path.test.ts`:

```typescript
describe("Block Completion Commands", () => {
  it("should emit COMPLETE_BLOCK when block times out", () => {
    const state: SessionState = {
      status: "ANSWERING",
      blockIndex: 0,
      blockStartTime: 0,
      answerStartTime: 0,
      // ... other fields
    };

    const context: ReducerContext = {
      totalBlocks: 3,
      answerTimeLimit: 90,
      blockDuration: 600,  // 10 minutes
    };

    // Simulate time passing beyond block duration
    const now = 601 * 1000;  // 601 seconds
    const result = sessionReducer(state, { type: "TICK" }, context, now);

    expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
    expect(result.commands).toContainEqual({
      type: "COMPLETE_BLOCK",
      blockNumber: 1  // 1-indexed
    });
  });

  it("should emit CLOSE_CONNECTION when last block completes", () => {
    const state: SessionState = {
      status: "BLOCK_COMPLETE_SCREEN",
      completedBlockIndex: 2,  // Last block (0-indexed)
      // ... other fields
    };

    const context: ReducerContext = {
      totalBlocks: 3,
      answerTimeLimit: 90,
      blockDuration: 600,
    };

    const result = sessionReducer(
      state,
      { type: "USER_CLICKED_CONTINUE" },
      context
    );

    expect(result.state.status).toBe("INTERVIEW_COMPLETE");
    expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
    expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
  });

  it("should NOT emit CLOSE_CONNECTION for non-last blocks", () => {
    const state: SessionState = {
      status: "BLOCK_COMPLETE_SCREEN",
      completedBlockIndex: 0,  // First block
      // ... other fields
    };

    const context: ReducerContext = {
      totalBlocks: 3,
      answerTimeLimit: 90,
      blockDuration: 600,
    };

    const result = sessionReducer(
      state,
      { type: "USER_CLICKED_CONTINUE" },
      context
    );

    expect(result.state.status).toBe("ANSWERING");
    expect(result.commands).not.toContainEqual({ type: "CLOSE_CONNECTION" });
  });
});
```

### Headless Integration Test

```typescript
describe("Block Interview Flow (Headless)", () => {
  it("can simulate entire 3-block interview without React", () => {
    const mockDriver = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
      stopAudio: vi.fn(),
    };
    const mockCompleteBlock = vi.fn();

    const context: ReducerContext = {
      totalBlocks: 3,
      answerTimeLimit: 90,
      blockDuration: 600,
    };

    // Start
    let state = initialState;
    let result = sessionReducer(state, { type: "CONNECTION_READY", initialBlockIndex: 0 }, context);
    state = result.state;
    expect(state.status).toBe("ANSWERING");

    // Block 1 timeout
    result = sessionReducer(state, { type: "TICK" }, context, 601000);
    state = result.state;
    expect(state.status).toBe("BLOCK_COMPLETE_SCREEN");
    expect(result.commands).toContainEqual({ type: "COMPLETE_BLOCK", blockNumber: 1 });

    // Continue to block 2
    result = sessionReducer(state, { type: "USER_CLICKED_CONTINUE" }, context);
    state = result.state;
    expect(state.status).toBe("ANSWERING");
    expect(state.blockIndex).toBe(1);

    // Block 2 timeout
    result = sessionReducer(state, { type: "TICK" }, context, state.blockStartTime + 601000);
    state = result.state;
    expect(result.commands).toContainEqual({ type: "COMPLETE_BLOCK", blockNumber: 2 });

    // Continue to block 3
    result = sessionReducer(state, { type: "USER_CLICKED_CONTINUE" }, context);
    state = result.state;
    expect(state.blockIndex).toBe(2);

    // Block 3 timeout
    result = sessionReducer(state, { type: "TICK" }, context, state.blockStartTime + 601000);
    state = result.state;
    expect(result.commands).toContainEqual({ type: "COMPLETE_BLOCK", blockNumber: 3 });

    // Continue (last block) → INTERVIEW_COMPLETE
    result = sessionReducer(state, { type: "USER_CLICKED_CONTINUE" }, context);
    state = result.state;
    expect(state.status).toBe("INTERVIEW_COMPLETE");
    expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
  });
});
```

## Files to Modify

| File | Change |
|------|--------|
| `src/app/.../session/types.ts` | Add `COMPLETE_BLOCK` command type |
| `src/app/.../session/reducer.ts` | Emit `COMPLETE_BLOCK` on block timeout, emit `CLOSE_CONNECTION` on last block |
| `src/app/.../session/hooks/useInterviewSession.ts` | Handle `COMPLETE_BLOCK` command |
| `src/app/.../session/BlockSession.tsx` | Remove reactive useEffect for completeBlock |
| `src/test/unit/session-golden-path.test.ts` | Add unit tests |

## Implementation Order

1. **Add command type** (`types.ts`) - No risk
2. **Update reducer** (`reducer.ts`) - Emit new commands
3. **Update hook** (`useInterviewSession.ts`) - Handle `COMPLETE_BLOCK`
4. **Remove reactive code** (`BlockSession.tsx`) - Delete useEffect
5. **Add tests** - Verify behavior

## Risks

**Low Risk:**
- The fix follows existing patterns (command-based architecture)
- `CLOSE_CONNECTION` is already used for manual interview ending
- Changes are isolated to the session state machine

**Migration Risk:**
- None - this is additive (new command) and removal of duplicate logic

## Architectural Benefits

| Before | After |
|--------|-------|
| Reactive useEffect triggers `completeBlock` | Command-driven `COMPLETE_BLOCK` |
| Can't test without React | Fully headless testable |
| Race condition (DB updated before EndRequest) | Deterministic command sequence |
| Split logic between reducer and BlockSession | All logic in reducer |

## Design Decisions

### COMPLETE_BLOCK is Fire-and-Forget

The `COMPLETE_BLOCK` command is intentionally **fire-and-forget** - the UI does not wait for the mutation to succeed before allowing the user to continue.

**Rationale:**

```
Per-block completion (for resumption) ≠ Interview completion (for feedback)
```

These are separate concerns:

| Concern | Command | Purpose | Failure Impact |
|---------|---------|---------|----------------|
| Block completion | `COMPLETE_BLOCK` | Enable resumption if browser crashes | User resumes from wrong block (recoverable) |
| Interview completion | `CLOSE_CONNECTION` | Trigger feedback generation | No feedback generated (critical) |

**Why this is acceptable:**

1. **Best-effort resumption:** If the DB mutation fails, the worst case is the user resumes from an earlier block. This is annoying but recoverable.

2. **Critical path is CLOSE_CONNECTION:** Feedback generation depends on `EndRequest` being sent via WebSocket, not on the tRPC mutation succeeding.

3. **No blocking UI:** Users shouldn't wait for a DB round-trip before seeing the "Block Complete" screen.

**Alternative considered:** We could add error handling that shows a toast if block completion fails, but this adds complexity without meaningful benefit. The user will still proceed to feedback regardless.

### DEV_FORCE_BLOCK_COMPLETE: Intentionally Not Modified

The reducer contains a dev-only event `DEV_FORCE_BLOCK_COMPLETE` (`reducer.ts:60-74`) that also transitions to `BLOCK_COMPLETE_SCREEN` but does **not** emit `COMPLETE_BLOCK`:

```typescript
if (event.type === "DEV_FORCE_BLOCK_COMPLETE") {
  return {
    state: { ...state, status: "BLOCK_COMPLETE_SCREEN", completedBlockIndex: state.blockIndex },
    commands: [],  // No COMPLETE_BLOCK emitted
  };
}
```

**Decision: Do NOT add `COMPLETE_BLOCK` to this path.**

**Rationale:**
1. **Dev-only code** - Only runs when `NODE_ENV !== "production"`. Production behavior is unaffected.
2. **Intentional bypass** - Developers using this debug shortcut likely want to skip to the UI state without triggering DB mutations during rapid iteration.
3. **Separation of concerns** - This is a UI testing utility, not a simulation of the production flow.

**If full simulation is needed**, developers should let the block timer run out naturally or use the headless test suite which exercises the production code path.

## First-Principle Architecture Review

This spec was reviewed against the [First-Principle Skill](../../.claude/skills/first-principle/skill.md) on 2025-12-30.

| Principle | Status | Notes |
|-----------|--------|-------|
| Source of Truth Topology | ✅ Pass | Fix makes reducer the single brain for block completion |
| Side-Effect Control Flow | ✅ Pass | Moves from reactive (useEffect) to intent-based (commands) |
| Hardware Driver Pattern | ✅ N/A | Drivers already "dumb" - no changes needed |
| Lifecycle & Concurrency | ✅ N/A | Existing cleanup mechanisms sufficient |
| Testability | ✅ Pass | Enables headless testing of complete block flow |

**Litmus Test:** After this fix, the entire block interview flow can be simulated in a console script without React or real network calls.

## Future Considerations

### FEAT28: Block Transcript Storage

Currently, block transcripts are not properly stored. This fix will generate feedback, but only from the **last block's transcript**. Full block-based feedback requires:
- Store transcript per block
- Aggregate all block transcripts for feedback generation

### Worker-Owned Completion (Option B - Future)

A more comprehensive refactor would make the Worker the single source of truth:
1. Frontend sends `END_BLOCK` message
2. Worker saves transcript, checks if last block
3. Worker generates feedback if last block
4. Worker sends `INTERVIEW_COMPLETED` back

This removes split brain entirely but requires more extensive changes.

## References

- [Worker README](../../worker/README.md) - Feedback generation flow
- [FEAT18 Feedback Generation](../achive/FEAT18_feedback_generation.md) - Original implementation
- [Session README](../../src/app/[locale]/(interview)/interview/[interviewId]/session/README.md) - State machine docs
- [First-Principle Skill](../../.claude/skills/first-principle/skill.md) - Architecture analysis framework
