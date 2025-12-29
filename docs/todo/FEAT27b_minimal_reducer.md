# FEAT27b: Explicit State Machine (Reducer) - Fix Complex State

## 📋 Strategy: The "Reducer" Approach

We are adopting the **Reducer Pattern** immediately. This decision supersedes previous "Phase 1 / Phase 2" discussions.

**Why?**
- **Centralized Logic:** Impossible to change state "randomly" from scattered `useEffect` hooks.
- **Testability:** The logic is pure functions, testable without rendering React components.
- **Robustness:** Eliminates "timer drift" and "stale closure" bugs common with `useState` inside `setInterval`.

---

## ⚠️ Requirements for Implementation

### 1. ✅ **onConnectionReady Callback** (REQUIRED)
- **Purpose**: SessionContent must signal when Gemini connection is ready.
- **Implementation**: Add `onConnectionReady` prop to `SessionContentProps`.
- **Usage**: Call callback when `state === 'live'` in `SessionContent`.

### 2. ✅ **Dynamic blockDuration** (CRITICAL)
- **Problem**: Block duration varies per block (e.g., Block 1: 600s, Block 2: 900s).
- **Solution**: Wrap the reducer in a `useCallback` closure that reads `blocks[state.blockIndex]` to inject current configuration.
- **Critical**: Do NOT hardcode or capture block duration at mount time. Must be dynamic per block.

### 3. ✅ **Translation Keys** (REQUIRED)
- Use existing `next-intl` infrastructure.
- See "Missing Translations" section below.

## Architectural Decisions

### 1. Removal of Question Counter
- **Behavior:** The "Question X of Y" counter is removed from the UI.
- **Decision:** Since Gemini controls the conversation flow, the frontend cannot accurately track the "current" question index. We now show **Block Progress** (e.g., "Block 1 of 3").

### 2. Timer Start
- **Behavior:** Timer starts ONLY when `onConnectionReady` fires.
- **Benefit:** User doesn't lose the first 5-10 seconds while the AI connects.

### 3. Answer Timeout Pause
- **Behavior:** When answer time limit is reached, the system enters a 3-second `ANSWER_TIMEOUT_PAUSE` state.
- **Purpose:** Hard stop - microphone is blocked during this pause to enforce the time limit.
- **Block Timer:** Continues running during the 3-second pause (not paused). The 3-second duration is negligible compared to 10+ minute blocks, simplifying implementation.
- **UI:** Display "Time's Up! Please wrap up your answer now." message.

### 4. Single Timer Mechanism
- **Behavior:** Only `TICK` events drive state transitions. No manual timeout triggers.
- **Benefit:** Simpler, more predictable state machine. Testing uses shorter `blockDuration` values rather than manual event injection.
- **Dev Testing:** Configure `blockDuration: 30` (30 seconds) for faster development iteration.

### 5. Configuration Injection via Closure
- **Pattern:** Wrap the pure reducer in a `useCallback` closure that injects `ReducerContext` from props.
- **Rationale:** `blockDuration` is external business configuration (database-driven, varies per interview type and block). It should not be stored in state (duplication) but must be accessible to the reducer (for timer checks).
- **Benefit:** Standard React patterns (`dispatch({ type: 'TICK' })`), no custom wrapper functions, pure testable reducer.

---

## Missing Translations

Add the following to `messages/en.json` (and equivalents for `es.json`, `zh.json`):

```json
{
  "interview": {
    "blockSession": {
      "blockComplete": "Block {number} Complete",
      "languageSwitchTitle": "Language Change",
      "nextBlockLanguage": "The next block will be in {language}",
      "english": "English",
      "chinese": "Chinese",
      "blockDetails": "{questions} questions | ~{minutes} minutes",
      "continue": "Continue to Next Block",
      "blockProgress": "Block {current} of {total}",
      "blockTimer": "Section: {minutes}:{seconds}",
      "timer": "Answer: {minutes}:{seconds}",
      "timesUpTitle": "Time's Up!",
      "timesUpMessage": "Please wrap up your answer now."
    }
  }
}
```

---

## Implementation Plan

### Step 1: Define Constants (`constants.ts`)

```typescript
// src/app/[locale]/(interview)/interview/[interviewId]/session/constants.ts

export const TIMER_CONFIG = {
  TICK_INTERVAL_MS: 100,
  ANSWER_TIMEOUT_PAUSE_DURATION_MS: 3000,
  DEFAULT_BLOCK_DURATION_SEC: 600,
  DEFAULT_ANSWER_LIMIT_SEC: 120,
} as const;
```

### Step 2: Define State Type (`types.ts`)

```typescript
// src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts

export type SessionState =
  | { status: 'WAITING_FOR_CONNECTION' }
  | {
      status: 'ANSWERING';
      blockIndex: number;
      blockStartTime: number;  // Timestamp
      answerStartTime: number; // Timestamp
    }
  | {
      status: 'ANSWER_TIMEOUT_PAUSE';
      blockIndex: number;
      blockStartTime: number;
      pauseStartedAt: number;  // Timestamp
    }
  | {
      status: 'BLOCK_COMPLETE_SCREEN';
      completedBlockIndex: number;
    }
  | {
      status: 'INTERVIEW_COMPLETE';
    };

export type SessionEvent =
  | { type: 'CONNECTION_READY'; initialBlockIndex: number }
  | { type: 'TICK' }
  | { type: 'USER_CLICKED_CONTINUE' };

export interface ReducerContext {
  answerTimeLimit: number;
  blockDuration: number;
  totalBlocks: number;
}

export const SessionStatus = {
  WAITING_FOR_CONNECTION: 'WAITING_FOR_CONNECTION',
  ANSWERING: 'ANSWERING',
  ANSWER_TIMEOUT_PAUSE: 'ANSWER_TIMEOUT_PAUSE',
  BLOCK_COMPLETE_SCREEN: 'BLOCK_COMPLETE_SCREEN',
  INTERVIEW_COMPLETE: 'INTERVIEW_COMPLETE',
} as const;
```

### Step 3: Create Reducer (`reducer.ts`)

```typescript
// src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts

import { isTimeUp } from "~/lib/countdown-timer";
import type { SessionState, SessionEvent, ReducerContext } from "./types";
import { TIMER_CONFIG } from "./constants";

export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
  context: ReducerContext,
  now = Date.now() // Injectable for testing
): SessionState {
  switch (state.status) {
    case 'WAITING_FOR_CONNECTION':
      if (event.type === 'CONNECTION_READY') {
        return {
          status: 'ANSWERING',
          blockIndex: event.initialBlockIndex,
          blockStartTime: now,
          answerStartTime: now,
        };
      }
      return state;

    case 'ANSWERING':
      if (event.type === 'TICK') {
        // 1. Answer Limit
        if (isTimeUp(state.answerStartTime, context.answerTimeLimit, now)) {
          return {
            status: 'ANSWER_TIMEOUT_PAUSE',
            blockIndex: state.blockIndex,
            blockStartTime: state.blockStartTime,
            pauseStartedAt: now,
          };
        }
        // 2. Block Limit
        if (isTimeUp(state.blockStartTime, context.blockDuration, now)) {
          return {
            status: 'BLOCK_COMPLETE_SCREEN',
            completedBlockIndex: state.blockIndex,
          };
        }
        return state;
      }
      return state;

    case 'ANSWER_TIMEOUT_PAUSE':
      // NOTE: Block timer continues during this 3-second pause (mic is blocked).
      // The 3-second duration is negligible relative to block duration (10+ minutes),
      // so we don't adjust blockStartTime. This simplifies the implementation.
      if (event.type === 'TICK') {
        const elapsed = now - state.pauseStartedAt;
        if (elapsed >= TIMER_CONFIG.ANSWER_TIMEOUT_PAUSE_DURATION_MS) {
          return {
            status: 'ANSWERING',
            blockIndex: state.blockIndex,
            blockStartTime: state.blockStartTime,
            answerStartTime: now, // Reset answer timer
          };
        }
        return state;
      }
      return state;

    case 'BLOCK_COMPLETE_SCREEN':
      if (event.type === 'USER_CLICKED_CONTINUE') {
        const nextIdx = state.completedBlockIndex + 1;
        if (nextIdx >= context.totalBlocks) {
          return { status: 'INTERVIEW_COMPLETE' };
        }
        return {
          status: 'ANSWERING',
          blockIndex: nextIdx,
          blockStartTime: now,
          answerStartTime: now,
        };
      }
      return state;

    default:
      return state;
  }
}
```

### Step 4: Refactor BlockSession (`BlockSession.tsx`)

Key changes:
1.  Replace `useState` soup with `useReducer(sessionReducer, ...)`.
2.  Wrap reducer in `useCallback` closure to inject dynamic configuration from `blocks` prop.
3.  Single `setInterval` that dispatches `TICK`.
4.  Remove `currentQuestionIndex` and related UI.

**Reducer Setup Pattern:**
```typescript
import { TIMER_CONFIG } from "./constants";
import type { ReducerContext } from "./types";

// Wrap the pure reducer with a closure that injects configuration
const reducer = useCallback(
  (state: SessionState, event: SessionEvent) => {
    const currentBlock = blocks[state.blockIndex];

    // Validate: fail fast if blockIndex is invalid
    if (!currentBlock) {
      console.error('[BlockSession] Invalid blockIndex:', {
        blockIndex: state.blockIndex,
        totalBlocks: blocks.length,
        state,
      });
      // Return state unchanged to prevent crash
      return state;
    }

    const context: ReducerContext = {
      blockDuration: currentBlock.duration,
      answerTimeLimit: currentBlock.answerTimeLimit,
      totalBlocks: blocks.length,
    };
    return sessionReducer(state, event, context);
  },
  [blocks]
);

const [state, dispatch] = useReducer(reducer, { status: 'WAITING_FOR_CONNECTION' });

// Standard React dispatch - no custom wrapper needed
useEffect(() => {
  const interval: NodeJS.Timeout = setInterval(
    () => dispatch({ type: 'TICK' }),
    TIMER_CONFIG.TICK_INTERVAL_MS
  );
  return () => clearInterval(interval);
}, []);
```

### Step 4b: Side Effect Orchestration & Resumption

**Resumption Logic:**
Calculate the initial block index and pass it to the `CONNECTION_READY` event:
```typescript
const initialBlockIndex = blocks.findIndex(b => b.status !== 'COMPLETED');
const startBlockIndex = initialBlockIndex === -1 ? 0 : initialBlockIndex;

const [state, dispatch] = useReducer(reducer, {
  status: 'WAITING_FOR_CONNECTION'
});

// Inside onConnectionReady callback
const handleConnectionReady = useCallback(() => {
  dispatch({
    type: 'CONNECTION_READY',
    initialBlockIndex: startBlockIndex
  });
}, [startBlockIndex]);
```

**Side Effects:**
The reducer is pure. We handle side effects (DB updates) by watching the state.
Use a ref to prevent duplicate mutations in React Strict Mode:
```typescript
// Effect to sync Block Completion to DB
const lastCompletedRef = useRef<number | null>(null);

useEffect(() => {
  if (state.status === 'BLOCK_COMPLETE_SCREEN') {
    const blockIdx = state.completedBlockIndex;

    // Guard: prevent duplicate calls on re-render or Strict Mode
    if (lastCompletedRef.current === blockIdx) {
      return;
    }
    lastCompletedRef.current = blockIdx;

    const blockNumber = blocks[blockIdx].blockNumber;
    completeBlock.mutate({ interviewId, blockNumber });
  }
}, [state.status, state.completedBlockIndex, blocks, interviewId]);
```

### Step 5: Integration Tests (`BlockSession.test.tsx`)

**Critical Test Cases:**

1. **State Machine Flow**
   - ✅ Initial state is WAITING_FOR_CONNECTION
   - ✅ Timer starts on CONNECTION_READY with correct initialBlockIndex
   - ✅ Answer timeout → ANSWER_TIMEOUT_PAUSE (3s) → Resume to ANSWERING
   - ✅ Block timeout → BLOCK_COMPLETE_SCREEN → Next block
   - ✅ Final block → INTERVIEW_COMPLETE

2. **Resumption**
   - ✅ If block 0 is COMPLETED, CONNECTION_READY starts at block 1
   - ✅ If all blocks COMPLETED, starts at block 0 (edge case)

3. **Side Effects**
   - ✅ Block completion mutation fires exactly once per block
   - ✅ No duplicate mutations in React Strict Mode

4. **Edge Cases**
   - ✅ Invalid blockIndex logs error and doesn't crash
   - ✅ Timer stops on unmount (no memory leaks)
   - ✅ Context validation prevents missing block config

5. **Testability**
   - ✅ Reducer accepts `now` parameter for time injection
   - ✅ Tests use mock timestamps, not real Date.now()

**Example Test:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { sessionReducer } from './reducer';
import { TIMER_CONFIG } from './constants';

describe('sessionReducer', () => {
  it('transitions from ANSWERING to ANSWER_TIMEOUT_PAUSE after answer time limit', () => {
    const now = 1000000;
    const state = {
      status: 'ANSWERING' as const,
      blockIndex: 0,
      blockStartTime: now - 10000, // 10s ago
      answerStartTime: now - 125000, // 125s ago (over 120s limit)
    };

    const context = {
      answerTimeLimit: 120,
      blockDuration: 600,
      totalBlocks: 3,
    };

    const nextState = sessionReducer(state, { type: 'TICK' }, context, now);

    expect(nextState).toEqual({
      status: 'ANSWER_TIMEOUT_PAUSE',
      blockIndex: 0,
      blockStartTime: now - 10000,
      pauseStartedAt: now,
    });
  });

  it('resumes from pause after 3 seconds', () => {
    const now = 1000000;
    const state = {
      status: 'ANSWER_TIMEOUT_PAUSE' as const,
      blockIndex: 0,
      blockStartTime: now - 10000,
      pauseStartedAt: now - 3100, // 3.1s ago
    };

    const context = {
      answerTimeLimit: 120,
      blockDuration: 600,
      totalBlocks: 3,
    };

    const nextState = sessionReducer(state, { type: 'TICK' }, context, now);

    expect(nextState.status).toBe('ANSWERING');
    expect(nextState.answerStartTime).toBe(now); // Timer reset
  });
});
```

---

## Maintainability Improvements Summary

The following improvements were added to ensure long-term maintainability:

### P0 - Critical
1. **Resumption Logic Fixed** - `CONNECTION_READY` now accepts `initialBlockIndex` payload to properly resume interviews from the correct block.
2. **Side Effect Guard** - `useRef` prevents duplicate database mutations in React Strict Mode or during re-renders.
3. **Context Validation** - Fail-fast error logging when `blockIndex` is out of bounds, prevents silent failures.

### P1 - Important
4. **Constants Extracted** - All magic numbers (100ms, 3000ms, 600s, 120s) moved to `TIMER_CONFIG` for easy tuning.
5. **Injectable Time** - Reducer accepts `now` parameter (defaults to `Date.now()`) for deterministic testing.

### Benefits
- **Testability**: Pure reducer with injectable time, no `vi.setSystemTime()` needed
- **Robustness**: Validation catches configuration errors early
- **Debuggability**: Error logs show exact state when issues occur
- **Maintainability**: Constants are centralized, resumption logic is explicit
