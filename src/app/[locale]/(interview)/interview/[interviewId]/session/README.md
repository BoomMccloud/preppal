# Interview Session Architecture

This folder implements the real-time interview session using a **Golden Path** architecture - a unidirectional data flow pattern with a single source of truth.

## Quick Reference

| File                     | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `page.tsx`               | Router - decides block vs standard interview       |
| `BlockSession.tsx`       | Block interview orchestrator (timers, transitions) |
| `SessionContent.tsx`     | Shared UI component (transcript, avatar, controls) |
| `useInterviewSession.ts` | State management hook (single reducer instance)    |
| `useInterviewSocket.ts`  | WebSocket + Audio driver ("dumb driver")           |
| `reducer.ts`             | Pure state machine (all business logic)            |
| `types.ts`               | Type definitions for state, events, commands       |
| `constants.ts`           | Timer configuration values                         |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ page.tsx (Router)                                               │
│                                                                 │
│  interview.isBlockBased?                                        │
│     ├─ YES → BlockInterviewWithState                           │
│     │         └─ useInterviewSession(initialBlockIndex) ← SINGLE│
│     │         └─ <BlockSession state={} dispatch={} />         │
│     │              └─ <SessionContent state={} dispatch={} />  │
│     │                                                           │
│     └─ NO → StandardInterviewWithState                         │
│              └─ useInterviewSession() ← SINGLE INSTANCE        │
│              └─ <SessionContent state={} dispatch={} />        │
└─────────────────────────────────────────────────────────────────┘
```

## Core Principles (Golden Path)

### 1. Single Source of Truth

One reducer instance per interview session. State flows down, events flow up.

```typescript
// ✅ CORRECT: One reducer, passed down
function BlockInterviewWithState() {
  const { state, dispatch } = useInterviewSession(interviewId, token, { context });
  return <BlockSession state={state} dispatch={dispatch} />;
}

// ❌ WRONG: Multiple reducer instances
function BlockSession() {
  const { state, dispatch } = useInterviewSession(...);  // Don't do this!
}
```

### 2. Timestamps Are Absolute

Timestamps are set once and never modified. Remaining time is calculated.

```typescript
// State stores absolute timestamps
state.blockStartTime = 1735502400000; // Set once when block starts
state.answerStartTime = 1735502450000; // Reset when new question starts

// Calculate remaining time from timestamp + now
const blockTimeRemaining = getRemainingSeconds(
  state.blockStartTime,
  context.blockDuration,
  Date.now(),
);
```

### 3. Intent-Based Commands

UI dispatches events (intent), reducer generates commands (side effects).

```typescript
// ✅ CORRECT: Dispatch intent
onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}

// Reducer generates commands:
case "INTERVIEW_ENDED":
  return {
    state: { ...state, status: "INTERVIEW_COMPLETE" },
    commands: [
      { type: "STOP_AUDIO" },
      { type: "CLOSE_CONNECTION" }
    ]
  };

// ❌ WRONG: Direct driver calls
onClick={() => {
  driver.stopAudio();
  driver.disconnect();
}}
```

### 4. Zero Means No Limit

Context values of `0` disable time limits (used for standard interviews).

```typescript
// Standard interview: no time limits
const defaultContext: ReducerContext = {
  answerTimeLimit: 0,  // 0 = no answer time limit
  blockDuration: 0,    // 0 = no block time limit
  totalBlocks: 1,
};

// Reducer checks before applying limits:
if (context.blockDuration > 0 && isTimeUp(...)) {
  // Only applies if limit is set
}
```

### 5. Decoupled Flow Control

The UI (Reducer) determines the flow; the Server (API) executes specific tasks. We avoid "magic" server-side logic that couples independent concepts.

*   **Explicit End of Block:** The `completeBlock` API only marks the block as complete. It does **not** auto-complete the interview, even if it's the last block.
*   **Explicit End of Interview:** The UI explicitly commands `COMPLETE_INTERVIEW` when the flow requires it.
*   **Lazy Completion:** We emit `COMPLETE_BLOCK` when the user **exits** the "Block Complete" screen (clicks Continue), not when they enter it. This prevents race conditions where the backend completes the interview before the user sees the summary.

## State Machine

```
┌─────────────────────────┐
│ WAITING_FOR_CONNECTION  │ ← Initial state (with targetBlockIndex)
└───────────┬─────────────┘
            │ CONNECTION_ESTABLISHED (auto-transitions)
            ▼
┌─────────────────────────┐
│       ANSWERING         │ ← Active interview
└───────────┬─────────────┘
            │
    ┌───────┼───────┐
    │       │       │
    │       │       │ Answer timeout (if answerTimeLimit > 0)
    │       │       ▼
    │       │  ┌─────────────────────────┐
    │       │  │  ANSWER_TIMEOUT_PAUSE   │ ← 3-second pause, mic muted
    │       │  └───────────┬─────────────┘
    │       │              │ After 3 seconds
    │       │              │ (back to ANSWERING)
    │       │◀─────────────┘
    │       │
    │       │ Block timeout (if blockDuration > 0)
    │       ▼
    │  ┌─────────────────────────┐
    │  │  BLOCK_COMPLETE_SCREEN  │ ← Transition between blocks
    │  └───────────┬─────────────┘
    │              │
    │              ├─ USER_CLICKED_CONTINUE (more blocks)
    │              │  → Back to ANSWERING
    │              │
    │              └─ USER_CLICKED_CONTINUE (last block)
    │                 → INTERVIEW_COMPLETE
    │
    │ INTERVIEW_ENDED (user clicks "End Interview")
    │ CONNECTION_ERROR
    ▼
┌─────────────────────────┐
│   INTERVIEW_COMPLETE    │ ← Terminal state, navigates to feedback
└─────────────────────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                 │
│                                                                   │
│  1. User Action                                                  │
│     onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}        │
│                           │                                       │
│                           ▼                                       │
│  2. Reducer (Pure Function)                                      │
│     ┌─────────────────────────────────────────┐                 │
│     │ sessionReducer(state, event, context)   │                 │
│     │                                          │                 │
│     │ Returns:                                 │                 │
│     │   { state: newState, commands: [...] }  │                 │
│     └─────────────────────────────────────────┘                 │
│                           │                                       │
│              ┌────────────┴────────────┐                         │
│              ▼                         ▼                         │
│  3a. State Update               3b. Command Execution            │
│      React re-renders               useInterviewSession          │
│                                     executes commands            │
│                                          │                       │
│                                          ▼                       │
│                                   ┌─────────────────┐            │
│                                   │ Driver (Dumb)   │            │
│                                   │ - stopAudio()   │            │
│                                   │ - disconnect()  │            │
│                                   │ - mute()        │            │
│                                   └─────────────────┘            │
│                                          │                       │
│                                          ▼                       │
│                                   Driver fires events            │
│                                   back to reducer                │
│                                   (CONNECTION_CLOSED, etc.)      │
└──────────────────────────────────────────────────────────────────┘
```

## Key Types

```typescript
// State shape (discriminated union)
type SessionState =
  | { status: "WAITING_FOR_CONNECTION"; ... }
  | { status: "ANSWERING"; blockIndex: number; blockStartTime: number; answerStartTime: number; ... }
  | { status: "ANSWER_TIMEOUT_PAUSE"; blockIndex: number; pauseStartedAt: number; ... }
  | { status: "BLOCK_COMPLETE_SCREEN"; completedBlockIndex: number; ... }
  | { status: "INTERVIEW_COMPLETE"; ... }

// Events (what happened)
type SessionEvent =
  | { type: "TICK" }
  | { type: "TIMER_TICK" }
  | { type: "USER_CLICKED_CONTINUE" }
  | { type: "INTERVIEW_ENDED" }
  | { type: "CONNECTION_ESTABLISHED" }  // Auto-transitions to ANSWERING
  | { type: "CONNECTION_CLOSED"; code: number }
  | { type: "CONNECTION_ERROR"; error: string }
  | ... // other driver events

// Commands (side effects to execute)
type Command =
  | { type: "CONNECT_FOR_BLOCK"; block: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "STOP_AUDIO" }
  | { type: "COMPLETE_BLOCK"; blockNumber: number }
  | { type: "COMPLETE_INTERVIEW" }

// Context (injected configuration)
interface ReducerContext {
  answerTimeLimit: number;  // seconds, 0 = no limit
  blockDuration: number;    // seconds, 0 = no limit
  totalBlocks: number;
}
```

## Interview Types

### Block-Based Interview

- Uses a template with multiple blocks (e.g., English + Chinese)
- Each block has a time limit (`blockDuration`)
- Each answer has a time limit (`answerTimeLimit`)
- Shows transition screens between blocks
- Timer overlays displayed

### Standard Interview

- No template, free-form conversation
- No time limits (`answerTimeLimit: 0`, `blockDuration: 0`)
- Single continuous session
- No timer overlays

## File Details

### page.tsx

Router component that:

- Fetches interview data
- Decides between block-based and standard interview
- Creates the single `useInterviewSession` hook instance
- Redirects to feedback when interview is complete

### BlockSession.tsx

Block interview orchestrator that:

- Renders timer overlays (block timer, answer timer)
- Shows "Time's up" banner during `ANSWER_TIMEOUT_PAUSE`
- Renders transition screen during `BLOCK_COMPLETE_SCREEN`
- Syncs block completion to database
- Wraps `SessionContent` for the active interview UI

### SessionContent.tsx

Shared UI component that:

- Renders the AI avatar
- Displays the transcript
- Shows connection states (connecting, error)
- Provides the "End Interview" button
- Handles navigation to feedback page

### useInterviewSession.ts (hooks/)

State management hook that:

- Creates single reducer instance
- Wires up driver events to dispatch
- Executes commands after state updates
- Manages timer intervals (TICK every 100ms, TIMER_TICK every 1s)
- Handles navigation on `INTERVIEW_COMPLETE`

### useInterviewSocket.ts

"Dumb driver" that:

- Manages WebSocket connection to worker
- Manages AudioSession (mic input, speaker output)
- Fires events to parent (onConnectionOpen, onTranscriptCommit, etc.)
- Exposes methods: `connectForBlock()`, `disconnect()`, `mute()`, `unmute()`, `stopAudio()`
- Contains NO business logic

### reducer.ts

Pure state machine that:

- Processes events and returns new state + commands
- Handles all state transitions
- Generates commands for side effects
- Accepts injectable `now` parameter for testing
- Contains ALL business logic

### types.ts

Type definitions for:

- `SessionState` - discriminated union of all states
- `SessionEvent` - all possible events
- `Command` - side effect instructions
- `ReducerContext` - configuration
- `ReducerResult` - return type of reducer

### constants.ts

Configuration values:

- `TICK_INTERVAL_MS: 100` - state machine tick rate
- `ANSWER_TIMEOUT_PAUSE_DURATION_MS: 3000` - pause before unmuting
- `DEFAULT_BLOCK_DURATION_SEC: 600` - 10 minutes
- `DEFAULT_ANSWER_LIMIT_SEC: 120` - 2 minutes

## Testing

The reducer is a pure function, making it easy to test:

```typescript
import { sessionReducer } from "./reducer";

describe("sessionReducer", () => {
  it("transitions to INTERVIEW_COMPLETE on INTERVIEW_ENDED", () => {
    const state = { status: "ANSWERING", ... };
    const event = { type: "INTERVIEW_ENDED" };
    const context = { answerTimeLimit: 120, blockDuration: 600, totalBlocks: 2 };
    const now = Date.now();

    const result = sessionReducer(state, event, context, now);

    expect(result.state.status).toBe("INTERVIEW_COMPLETE");
    expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
    expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
  });

  it("skips timeout when limit is 0", () => {
    const state = { status: "ANSWERING", answerStartTime: 0, ... };
    const event = { type: "TICK" };
    const context = { answerTimeLimit: 0, blockDuration: 0, totalBlocks: 1 };
    const now = 999999999; // Way past any reasonable limit

    const result = sessionReducer(state, event, context, now);

    expect(result.state.status).toBe("ANSWERING"); // No timeout
  });
});
```

## Common Tasks

### Adding a new event type

1. Add to `SessionEvent` union in `types.ts`
2. Handle in `reducer.ts`
3. Dispatch from component

### Adding a new command type

1. Add to `Command` union in `types.ts`
2. Generate in `reducer.ts`
3. Execute in `useInterviewSession.ts`

### Adding a new state

1. Add to `SessionState` union in `types.ts`
2. Handle transitions in `reducer.ts`
3. Render UI in `BlockSession.tsx` or `SessionContent.tsx`

## Related Documentation

- [Golden Path Explained](../../../../../docs/achive/FEAT27d_golden_path_explained.md) - Detailed explanation of the architecture
- [Golden Path Spec](../../../../../docs/achive/FEAT27d_golden_path.md) - Original implementation specification
