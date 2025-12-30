# FEAT30: Dev Mode Controls for Block Interviews

**Status:** 📋 PLANNED
**Priority:** LOW (Developer Experience)
**Date:** 2025-12-30

---

## Overview

Add block navigation controls to the existing dev console in `SessionContentDev.tsx`, allowing developers to step through the block interview experience without waiting for real timers.

---

## Current Architecture

The block interview uses a **Golden Path** architecture with unidirectional data flow:

```
page.tsx (Router)
    └─ BlockInterviewWithState
        └─ useInterviewSession()  ← SINGLE reducer instance
        └─ <BlockSession state={} dispatch={} />
            └─ <SessionContent state={} dispatch={} />
                └─ isDev? → <SessionContentDev />  ← HAS EXISTING DEV CONSOLE
                         → <SessionContentProd />
```

**Existing Dev Console:** `SessionContentDev.tsx` already has a sidebar with:
- State Monitor (connection, phase, audio, block)
- Raw Buffers viewer
- State Inspector (JSON)
- Actions section (currently just "Log Status to Console")

**State Machine:**
```
WAITING_FOR_CONNECTION
        │ CONNECTION_READY
        ▼
    ANSWERING ◄────────────────┐
        │                       │
        ├── answer timeout ────▶ ANSWER_TIMEOUT_PAUSE (3s)
        │                              │
        │◄─────── after 3s ────────────┘
        │
        └── block timeout ────▶ BLOCK_COMPLETE_SCREEN
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                      │
            USER_CLICKED_CONTINUE              USER_CLICKED_CONTINUE
              (more blocks)                        (last block)
                    │                                      │
                    ▼                                      ▼
             ANSWERING                           INTERVIEW_COMPLETE
```

---

## Feature Specification

### Extend Existing Dev Console

Add a new "Block Controls" section to the Actions area in `SessionContentDev.tsx`:

```
┌─────────────────────────────────────┐
│  Dev Console (existing sidebar)     │
├─────────────────────────────────────┤
│  State Monitor     (existing)       │
│  Raw Buffers       (existing)       │
│  State Inspector   (existing)       │
├─────────────────────────────────────┤
│  Actions                            │
│  ────────────────────               │
│  Block Controls (NEW)               │
│  ┌─────────────────────────────┐   │
│  │ [⏭️ Skip Block]              │   │
│  │ [⏱️ Trigger Answer Timeout]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Log Status to Console] (existing) │
└─────────────────────────────────────┘
```

### Controls

| Button | Event Dispatched | Effect |
|--------|------------------|--------|
| **Skip Block** | `DEV_FORCE_BLOCK_COMPLETE` | Immediately transitions to `BLOCK_COMPLETE_SCREEN` |
| **Trigger Answer Timeout** | `DEV_FORCE_ANSWER_TIMEOUT` | Immediately transitions to `ANSWER_TIMEOUT_PAUSE` |

To advance to the next block, use **Skip Block** → **Continue** (existing button on block complete screen).

Note: "End Interview" button already exists in the main UI footer.

---

## Implementation Plan

### Phase 1: Add Dev Event Types

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

Add new dev-only events to `SessionEvent` union:

```typescript
// Dev-only events (only processed in development mode)
| { type: "DEV_FORCE_BLOCK_COMPLETE" }
| { type: "DEV_FORCE_ANSWER_TIMEOUT" }
```

### Phase 2: Handle Dev Events in Reducer

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

Add dev event handlers **after the `INTERVIEW_ENDED` handler (line 54) and before the driver events switch (line 56)**:

```typescript
  // Global Event Handler: INTERVIEW_ENDED
  if (event.type === "INTERVIEW_ENDED") {
    // ... existing code (lines 46-54)
  }

  // ========== INSERT DEV EVENTS HERE (after line 54) ==========
  // Dev-only events - skip in production
  if (process.env.NODE_ENV !== "production") {
    if (event.type === "DEV_FORCE_BLOCK_COMPLETE") {
      if (state.status === "ANSWERING" || state.status === "ANSWER_TIMEOUT_PAUSE") {
        return {
          state: {
            ...state,
            status: "BLOCK_COMPLETE_SCREEN",
            completedBlockIndex: state.blockIndex,
          },
          commands: [],
        };
      }
    }

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
    }
  }
  // ========== END DEV EVENTS ==========

  // Handle new driver events (work across all states)
  switch (event.type) {
    // ... existing code continues
```

### Phase 3: Add Block Controls to Dev Console

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev.tsx`

Add new Block Controls section in the Actions area. Insert **after line 412 (`<div className="space-y-3">`) and before line 414 (the "Log Status to Console" button)**:

```typescript
{/* Block Controls */}
<div className="mb-4 space-y-2">
  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
    Block Controls
  </h4>
  <button
    onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}
    disabled={state.status !== "ANSWERING" && state.status !== "ANSWER_TIMEOUT_PAUSE"}
    className="w-full rounded bg-yellow-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-yellow-500 disabled:opacity-50"
  >
    ⏭️ Skip Block
  </button>
  <button
    onClick={() => dispatch({ type: "DEV_FORCE_ANSWER_TIMEOUT" })}
    disabled={state.status !== "ANSWERING"}
    className="w-full rounded bg-orange-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
  >
    ⏱️ Answer Timeout
  </button>
</div>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `types.ts` | Add 2 new dev event types to `SessionEvent` |
| `reducer.ts` | Add dev event handlers (guarded by NODE_ENV) |
| `SessionContentDev.tsx` | Add Block Controls section to Actions area |

---

## Testing Strategy

### Unit Tests (Reducer)

```typescript
describe("sessionReducer - dev events", () => {
  it("DEV_FORCE_BLOCK_COMPLETE transitions ANSWERING to BLOCK_COMPLETE_SCREEN");
  it("DEV_FORCE_ANSWER_TIMEOUT transitions ANSWERING to ANSWER_TIMEOUT_PAUSE");
  it("ignores dev events when state guards fail");
});
```

### Manual Testing Checklist

- [ ] Start a block interview in development mode
- [ ] Verify Block Controls section appears in dev console sidebar
- [ ] Click "Skip Block" → verify transition to block complete screen
- [ ] Click "Continue" (on block complete screen) → verify next block starts
- [ ] Click "Answer Timeout" → verify timeout pause shows (3s mic mute)
- [ ] Wait for timeout to end → verify mic unmutes and returns to ANSWERING
- [ ] Verify controls are disabled in invalid states (e.g., Skip Block disabled during BLOCK_COMPLETE_SCREEN)

---

## Design Decisions

### Why extend SessionContentDev instead of new component?

- **Consistency:** Dev tooling already lives in the dev console sidebar
- **No duplication:** Avoids having two separate dev panels

### Why add events to reducer vs direct state manipulation?

Maintains the Golden Path architecture - all state changes flow through the reducer. This keeps the state machine testable and predictable.

### Why NODE_ENV check in reducer?

Defense in depth - even if someone dispatches dev events in production, the reducer ignores them.

### Why no "End Interview" button in Block Controls?

Already exists in the main UI footer (`SessionContentDev.tsx:279-285`).

### Why no "Jump to Block" feature?

Removed for simplicity (KISS). The "Skip Block" → "Continue" flow properly transitions blocks including Gemini context. A direct jump would only update UI state without proper connection handling.

---

## Estimated Effort

**Small** - 3 files, ~30 lines of new code

---

## References

- [Session README](../../src/app/[locale]/(interview)/interview/[interviewId]/session/README.md) - Architecture documentation
- [SessionContentDev.tsx](../../src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev.tsx) - Existing dev console
