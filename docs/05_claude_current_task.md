# Current Task: Dev Mode Controls for Block Interviews

**Status:** 📋 **PLANNING**
**Priority:** LOW (Developer Experience)
**Date:** 2025-12-30

---

## Executive Summary

Add development-only UI controls to block interviews that allow stepping through the entire experience without waiting for real timers. This enables faster manual testing of the block interview flow.

---

## Current Architecture Summary

The block interview uses a **Golden Path** architecture with unidirectional data flow:

```
page.tsx (Router)
    └─ BlockInterviewWithState
        └─ useInterviewSession()  ← SINGLE reducer instance
        └─ <BlockSession state={} dispatch={} />
            └─ <SessionContent state={} dispatch={} />
```

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

**Key Files:**
| File | Role |
|------|------|
| `reducer.ts` | Pure state machine - handles events, returns new state + commands |
| `types.ts` | State/Event/Command type definitions |
| `BlockSession.tsx` | Block UI orchestrator with timer overlays |
| `page.tsx` | Router that creates single `useInterviewSession` hook |

---

## Proposed Feature: Dev Controls Panel

### User Experience

A floating dev panel (bottom-right corner) visible **only in development mode** (`NODE_ENV !== "production"`):

```
┌─────────────────────────────────┐
│  🛠️ Dev Controls                │
├─────────────────────────────────┤
│  Current: ANSWERING             │
│  Block: 1 of 2                  │
├─────────────────────────────────┤
│  [⏭️ Skip Block]                │
│  [⏱️ Trigger Answer Timeout]    │
│  [🏁 End Interview]             │
│  ────────────────────           │
│  Jump to Block: [1 ▾]           │
└─────────────────────────────────┘
```

### Controls

| Button | Event Dispatched | Effect |
|--------|------------------|--------|
| **Skip Block** | `DEV_FORCE_BLOCK_COMPLETE` | Immediately transitions to `BLOCK_COMPLETE_SCREEN` |
| **Trigger Answer Timeout** | `DEV_FORCE_ANSWER_TIMEOUT` | Immediately transitions to `ANSWER_TIMEOUT_PAUSE` |
| **End Interview** | `INTERVIEW_ENDED` | Uses existing event - ends interview |
| **Jump to Block** | `DEV_JUMP_TO_BLOCK` | Jump directly to any block by index |

---

## Implementation Plan

### Phase 1: Add Dev Event Types

**File:** `types.ts`

Add new dev-only events to `SessionEvent` union:

```typescript
// Dev-only events (only processed in development mode)
| { type: "DEV_FORCE_BLOCK_COMPLETE" }
| { type: "DEV_FORCE_ANSWER_TIMEOUT" }
| { type: "DEV_JUMP_TO_BLOCK"; blockIndex: number }
```

### Phase 2: Handle Dev Events in Reducer

**File:** `reducer.ts`

Add dev event handlers at the top of the reducer, guarded by `NODE_ENV`:

```typescript
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

  if (event.type === "DEV_JUMP_TO_BLOCK") {
    return {
      state: {
        status: "ANSWERING",
        blockIndex: event.blockIndex,
        blockStartTime: now,
        answerStartTime: now,
        ...createCommonFields(state),
      },
      commands: [],
    };
  }
}
```

### Phase 3: Create DevControls Component

**File:** `DevControls.tsx` (new)

```typescript
"use client";

import type { Dispatch } from "react";
import type { SessionState, SessionEvent } from "./types";

interface DevControlsProps {
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  totalBlocks: number;
}

export function DevControls({ state, dispatch, totalBlocks }: DevControlsProps) {
  // Hide in production
  if (process.env.NODE_ENV === "production") return null;

  const currentBlock =
    state.status === "ANSWERING" || state.status === "ANSWER_TIMEOUT_PAUSE"
      ? state.blockIndex + 1
      : state.status === "BLOCK_COMPLETE_SCREEN"
        ? state.completedBlockIndex + 1
        : 0;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-64 rounded-lg border border-yellow-500 bg-yellow-50 p-4 shadow-lg">
      <div className="mb-2 flex items-center gap-2 border-b border-yellow-300 pb-2">
        <span>🛠️</span>
        <span className="font-bold text-yellow-800">Dev Controls</span>
      </div>

      {/* State Display */}
      <div className="mb-3 text-xs text-yellow-700">
        <div>Status: <code className="rounded bg-yellow-200 px-1">{state.status}</code></div>
        <div>Block: {currentBlock} of {totalBlocks}</div>
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <button
          onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}
          disabled={state.status !== "ANSWERING" && state.status !== "ANSWER_TIMEOUT_PAUSE"}
          className="w-full rounded bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-700 disabled:opacity-50"
        >
          ⏭️ Skip Block
        </button>

        <button
          onClick={() => dispatch({ type: "DEV_FORCE_ANSWER_TIMEOUT" })}
          disabled={state.status !== "ANSWERING"}
          className="w-full rounded bg-orange-600 px-3 py-1 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
        >
          ⏱️ Trigger Answer Timeout
        </button>

        <button
          onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}
          className="w-full rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        >
          🏁 End Interview
        </button>

        {/* Block Selector */}
        <div className="border-t border-yellow-300 pt-2">
          <label className="mb-1 block text-xs text-yellow-700">Jump to Block:</label>
          <select
            value={currentBlock}
            onChange={(e) => dispatch({
              type: "DEV_JUMP_TO_BLOCK",
              blockIndex: parseInt(e.target.value) - 1
            })}
            className="w-full rounded border border-yellow-400 bg-white px-2 py-1 text-sm"
          >
            {Array.from({ length: totalBlocks }, (_, i) => (
              <option key={i} value={i + 1}>Block {i + 1}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
```

### Phase 4: Integrate into BlockSession

**File:** `BlockSession.tsx`

Import and render the `DevControls` component:

```typescript
import { DevControls } from "./DevControls";

// ... inside BlockSession render, add at the end:
<DevControls
  state={state}
  dispatch={dispatch}
  totalBlocks={blocks.length}
/>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `types.ts` | Add 3 new event types to `SessionEvent` |
| `reducer.ts` | Add dev event handlers (guarded by NODE_ENV) |
| `DevControls.tsx` | **NEW** - Dev panel component |
| `BlockSession.tsx` | Import and render DevControls |

---

## Testing Strategy

### Unit Tests (Reducer)

```typescript
describe("sessionReducer - dev events", () => {
  it("DEV_FORCE_BLOCK_COMPLETE transitions ANSWERING to BLOCK_COMPLETE_SCREEN");
  it("DEV_FORCE_ANSWER_TIMEOUT transitions ANSWERING to ANSWER_TIMEOUT_PAUSE");
  it("DEV_JUMP_TO_BLOCK sets blockIndex and resets timestamps");
  it("dev events are ignored in production mode");
});
```

### Manual Testing

1. Start a block interview in development mode
2. Verify dev panel is visible
3. Click "Skip Block" → verify transition to block complete screen
4. Click "Continue" → verify next block starts
5. Click "Trigger Answer Timeout" → verify timeout pause shows
6. Use "Jump to Block" dropdown → verify block changes
7. Click "End Interview" → verify interview ends

---

## Open Questions for Mr. User

1. **Panel Position:** Bottom-right corner okay, or prefer a different location?

2. **Keyboard Shortcuts:** Add shortcuts for faster testing?
   - `Ctrl+Shift+N` → Skip Block
   - `Ctrl+Shift+T` → Trigger Answer Timeout
   - `Ctrl+Shift+E` → End Interview

3. **State Details:** Show more state info in the panel? (timestamps, elapsed time, etc.)

4. **Standard Interview:** Should similar dev controls be added to standard (non-block) interviews?

---

**Status:** 📋 **AWAITING APPROVAL**

**Estimated Effort:** Small (4 files, ~150 lines of new code)

**Next Step:** Await Mr. User's approval and clarification on open questions.
