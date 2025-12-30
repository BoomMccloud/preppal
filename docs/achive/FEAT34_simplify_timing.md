# FEAT34: Simplify Interview Timing (One Block = One Question)

## Summary

Simplify the interview timing model by making each block contain exactly one question. This eliminates:
- Dual timers (block + answer) - they become the same thing
- Question progression tracking within blocks
- Race conditions between timer types
- Configuration complexity for template authors

## Status: COMPLETE ✓

### Implementation Progress
- [x] Schema updated (single `question` per block, removed `durationSec`)
- [x] Templates restructured (MBA: 6 blocks, Language Test: 6 blocks)
- [x] Types updated (removed `blockDuration`, added `USER_CLICKED_NEXT`)
- [x] Reducer updated (answer timeout → BLOCK_COMPLETE_SCREEN)
- [x] Constants updated (removed `DEFAULT_BLOCK_DURATION_SEC`)
- [x] Session page updated (simplified `getContext`)
- [x] UI updated (removed block timer, added "Next Question" button)
- [x] Translations added (`nextQuestion` key)
- [x] Unit tests updated
- [x] Integration tests updated

### Test Results
- **Passing:** 262 tests
- **Code compiles:** `pnpm check` passes

## Priority: P1 (Simplification / Technical Debt)

## Problem Statement

**Current dual-timer complexity:**

1. **Two competing timers** create edge cases:
   - Block timer: Hard limit for entire block
   - Answer timer: Soft limit per answer (3s pause, then reset)
   - Priority logic required (block checked first, answer second)
   - Edge case: answer timeout pause during final seconds of block

2. **Configuration burden on template authors:**
   - Must set both `durationSec` (per block) AND `answerTimeLimitSec` (per template)
   - Must ensure: `blockDuration >= numQuestions × answerTimeLimit`
   - Easy to misconfigure (e.g., 30s block with 60s answer limit)

3. **Code complexity:**
   - `reducer.ts` has two timeout paths (lines 174-203)
   - Tests must cover priority ordering and edge cases
   - Developer note acknowledges the complexity (lines 209-211)

## Solution: One Block = One Question

### Key Insight

With one question per block:
- `durationSec` becomes redundant (just use `answerTimeLimitSec`)
- No need for `questionIndex` or `questionsInBlock`
- Answer timeout naturally ends the block
- State machine simplifies significantly

### Current vs Proposed Model

**Current (Complex):**
```
Block 1 (durationSec: 180)
├── Q1: "Tell me about yourself" (answerTimeLimitSec: 90)
├── Q2: "Describe a challenge" (answerTimeLimitSec: 90)
└── Q3: "Why MBA?" (answerTimeLimitSec: 90)

Two timers compete:
- Block timer: 180s hard limit
- Answer timer: 90s soft limit per question
```

**Proposed (Simple):**
```
Block 1: "Tell me about yourself" (90s)
Block 2: "Describe a challenge" (90s)
Block 3: "Why MBA?" (90s)

One timer:
- Answer timeout = Block complete
```

### New State Machine Flow

```
WAITING_FOR_CONNECTION
        │
        │ CONNECTION_READY
        ▼
    ANSWERING (Block N, single question)
        │
        ├─────────────────────────────────────┐
        │                                     │
        │ Answer timeout                      │ USER_CLICKED_NEXT
        │ (answerTimeLimitSec reached)        │ (manual advance)
        ▼                                     │
ANSWER_TIMEOUT_PAUSE (3s, mic muted)          │
        │                                     │
        │ After 3 seconds                     │
        ▼                                     │
BLOCK_COMPLETE_SCREEN  ←──────────────────────┘
        │
        ├─ USER_CLICKED_CONTINUE (more blocks) → ANSWERING (Block N+1)
        │
        └─ USER_CLICKED_CONTINUE (last block) → INTERVIEW_COMPLETE
```

## Files to Modify

### 1. Schema (`src/lib/interview-templates/schema.ts`)
- Remove `durationSec` from `InterviewBlockSchema`
- Change `questions: z.array(...)` to `question: InterviewQuestionSchema` (single question)

```typescript
// CHANGE FROM:
export const InterviewBlockSchema = z.object({
  language: LanguageSchema,
  durationSec: z.number().int().positive(),
  questions: z.array(InterviewQuestionSchema).min(1),
});

// CHANGE TO:
export const InterviewBlockSchema = z.object({
  language: LanguageSchema,
  question: InterviewQuestionSchema,  // Single question, not array
});
```

### 2. Templates
| File | Change |
|------|--------|
| `src/lib/interview-templates/definitions/mba-behavioral-v1.ts` | Split 2 blocks (3 questions each) → 6 blocks (1 question each) |
| `src/lib/interview-templates/definitions/language-transition-test-v1.ts` | Already 1 question per block - just remove `durationSec`, change to single `question` |

### 3. Types (`src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`)
- Remove `blockDuration` from `ReducerContext`
- Add new event: `USER_CLICKED_NEXT`

```typescript
// Remove from ReducerContext:
export interface ReducerContext {
  answerTimeLimit: number;
  // blockDuration: REMOVED
  totalBlocks: number;
}

// Add to SessionEvent union:
| { type: "USER_CLICKED_NEXT" }  // User manually advances to next block
```

### 4. Reducer (`src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`)

**Remove block timeout check entirely (lines 174-189):**
```typescript
// DELETE THIS BLOCK:
if (context.blockDuration > 0 && isTimeUp(state.blockStartTime, context.blockDuration, now)) {
  return { ... BLOCK_COMPLETE_SCREEN ... };
}
```

**Change answer timeout pause to go to BLOCK_COMPLETE_SCREEN (lines 212-226):**
```typescript
// CHANGE FROM:
if (elapsed >= TIMER_CONFIG.ANSWER_TIMEOUT_PAUSE_DURATION_MS) {
  return {
    state: { ...state, status: "ANSWERING", answerStartTime: now },
    commands: [{ type: "UNMUTE_MIC" }],
  };
}

// CHANGE TO:
if (elapsed >= TIMER_CONFIG.ANSWER_TIMEOUT_PAUSE_DURATION_MS) {
  return {
    state: {
      ...state,
      status: "BLOCK_COMPLETE_SCREEN",
      completedBlockIndex: state.blockIndex,
    },
    commands: [{ type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 }],
  };
}
```

**Add handler for USER_CLICKED_NEXT in ANSWERING state:**
```typescript
case "ANSWERING":
  // Handle manual "Next" button click
  if (event.type === "USER_CLICKED_NEXT") {
    return {
      state: {
        ...state,
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: state.blockIndex,
      },
      commands: [{ type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 }],
    };
  }
  // ... existing TICK handling
```

### 5. Constants (`src/app/[locale]/(interview)/interview/[interviewId]/session/constants.ts`)
- Remove `DEFAULT_BLOCK_DURATION_SEC` (no longer needed)

### 6. Session Page (`src/app/[locale]/(interview)/interview/[interviewId]/session/page.tsx`)

```typescript
// CHANGE FROM:
const getContext = (blockIndex: number): ReducerContext => {
  const currentTemplateBlock = template.blocks[blockIndex];
  return {
    answerTimeLimit: template.answerTimeLimitSec,
    blockDuration: currentTemplateBlock?.durationSec ?? 600,
    totalBlocks: blocks.length,
  };
};

// CHANGE TO:
const getContext = (): ReducerContext => ({
  answerTimeLimit: template.answerTimeLimitSec,
  totalBlocks: blocks.length,
});
```

### 7. UI (`src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx`)

**Remove block timer display, keep only answer timer:**
- Remove `blockTimeRemaining` calculation
- Remove block timer UI element
- Keep answer timer only

**Remove reference to `durationSec` in block complete screen**

**Add "Next Question" button in ANSWERING state:**
```tsx
{state.status === "ANSWERING" && (
  <button
    onClick={() => dispatch({ type: "USER_CLICKED_NEXT" })}
    className="bg-secondary hover:bg-secondary/80 rounded-full px-6 py-2 text-sm font-medium transition-colors"
  >
    {t("nextQuestion")}
  </button>
)}
```

### 8. Translations
Add `nextQuestion` key to all locales:
- `messages/en.json`
- `messages/zh.json`
- `messages/es.json`

```json
"interview": {
  "blockSession": {
    "nextQuestion": "Next Question"
  }
}
```

### 9. Tests
| File | Change |
|------|--------|
| `src/test/unit/session-reducer.test.ts` | Remove block timeout tests, update answer timeout to verify BLOCK_COMPLETE_SCREEN, add USER_CLICKED_NEXT test |
| `src/test/unit/session-golden-path.test.ts` | Update for new flow |
| `src/test/integration/block-interview-golden-path.test.ts` | Update for restructured templates |

## Migration Notes

1. **No database migration needed for `durationSec`** - only in templates, not persisted
2. **Database `questions` field** - Keep as `Json` type but store single question string instead of array
   - Change from: `questions: block.questions.map((q) => q.content)` (array)
   - Change to: `questions: block.question.content` (single string, stored in Json field)
   - Avoids Prisma migration while still being clean
3. **Template restructuring required** - MBA template needs to be split from 2 blocks to 6 blocks
4. **Backwards compatible** - Existing interviews in progress will continue (they use database blocks)

## Implementation Order

1. Update schema (remove `durationSec`, change `questions[]` → `question`)
2. Restructure templates (1 question per block, use new schema)
3. Update types (remove `blockDuration` from context, add `USER_CLICKED_NEXT` event)
4. Update reducer (answer timeout → BLOCK_COMPLETE_SCREEN, handle `USER_CLICKED_NEXT`)
5. Update constants (remove DEFAULT_BLOCK_DURATION_SEC)
6. Update session page (simplify getContext)
7. Update UI (remove block timer, add "Next Question" button)
8. Add translations for "nextQuestion"
9. Update tests
10. Run `pnpm check`

## Acceptance Criteria

### Timing Behavior
- [x] Answer timeout (after 3s pause) ends the block
- [x] No separate block timer exists
- [x] Each block has exactly one question

### Configuration
- [x] Templates only need `answerTimeLimitSec` (no `durationSec`)
- [x] Zod schema validates templates without `durationSec`
- [x] Schema enforces single `question` (not array)

### UI
- [x] Only answer timer displayed (no block timer)
- [x] Block progress shows "Block 1 of 6" (more blocks, simpler each)
- [x] "Next Question" button visible during ANSWERING state
- [x] Clicking "Next" advances to BLOCK_COMPLETE_SCREEN

### Tests
- [x] All tests pass with updated flow (262 passing)
- [x] No block timeout priority tests (removed)
- [x] Answer timeout tests verify BLOCK_COMPLETE_SCREEN transition
- [x] USER_CLICKED_NEXT test verifies manual advancement

## First-Principle Analysis

### 1. Source of Truth ✅
- Single state tree in reducer
- No split brain - client owns all state
- No question tracking needed (one per block)

### 2. Side-Effect Control Flow ✅
- Intent-based: USER_CLICKED_NEXT dispatches event
- Reducer returns commands, driver executes
- No reactive useEffect chains

### 3. Hardware Driver Pattern ✅
- No new driver methods needed
- Driver stays "dumb"
- No NEXT_QUESTION command (eliminated by simplification)

### 4. Lifecycle & Concurrency ✅
- Single timer type eliminates race conditions
- Sequential block flow is deterministic
- Existing cleanup mechanisms unchanged

### 5. Testability ✅
- Pure reducer with injectable `now`
- Fewer edge cases to test
- Can test entire flow without React

### Litmus Test ✅
> "If I delete the UI layer and replace the Network layer with a Mock, can I still run the entire business process in a console script?"

**Answer: YES** - Reducer is pure, state is serializable, commands are testable.

## References

- **Plan File:** `/Users/jasonbxu/.claude/plans/majestic-tickling-pebble.md`
- **Current Reducer:** `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`
- **Session README:** `src/app/[locale]/(interview)/interview/[interviewId]/session/README.md`
