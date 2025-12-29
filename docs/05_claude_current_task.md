# Current Task: FEAT27d - User Termination Experience (Intent-Based Architecture)

**Status:** 🔴 **PLANNED** - Awaiting approval to proceed
**Priority:** HIGH (architectural fix, resolves Split Brain issue)
**Date:** 2025-12-29
**Parent Feature:** FEAT27c v5 "Dumb Driver" Architecture

---

## Executive Summary

**Problem:** When a user clicks "End Interview", the timer overlay continues ticking after the connection closes, creating a "zombie state". This occurs because `BlockSession` and `SessionContent` maintain separate reducer instances (Split Brain architecture).

**Solution:** Lift state to the page level (Option A), making both components controlled. This ensures a single source of truth and proper intent-based termination flow.

**Spec:** [docs/todo/FEAT27d_user_termination.md](./todo/FEAT27d_user_termination.md)

### Relationship to FEAT27c

**FEAT27c (v5 "Dumb Driver") was successfully completed** - see [FEAT27c_v5_IMPLEMENTATION_COMPLETE.md](./todo/FEAT27c_v5_IMPLEMENTATION_COMPLETE.md)

FEAT27c achieved:
- ✅ Separated business logic (reducer) from infrastructure (driver)
- ✅ Made reducer pure and testable (48/48 tests passing)
- ✅ Implemented command/event pattern infrastructure

**FEAT27d builds on FEAT27c:**
- FEAT27c = **Separation of Concerns** (Phase 1: Create the tools)
- FEAT27d = **Single Source of Truth** (Phase 2: Use the tools correctly)

**Why both are needed:**
```
FEAT27c Foundation (Completed):
┌────────────────────────────┐
│ sessionReducer (Pure)      │
│ - Business logic ✅        │
└────────────────────────────┘
         ↓ commands
┌────────────────────────────┐
│ useInterviewSocket (Driver)│
│ - I/O only ✅              │
└────────────────────────────┘

FEAT27d Completion (This Task):
┌────────────────────────────┐
│ SessionPage (Container)    │
│ - ONE reducer instance ✅  │ ← New: Lift state
│ - Calculate timers once ✅ │ ← New: Centralize
│ - Complete handlers ✅     │ ← New: Use FEAT27c tools
└────────────────────────────┘
```

**Issues found are NOT FEAT27c failures:**
- Issue #1 (mic stays on): FEAT27c provided command infrastructure, we just need to use it
- Issue #2 (timer drift): FEAT27c provided correct logic, but TWO instances drift
- Issue #3 (timers during errors): FEAT27c provided event handler, needs complete transition
- Issue #4 (Split Brain): FEAT27c didn't address component architecture

FEAT27d completes what FEAT27c started.

---

## Problem Statement

Currently, when a user clicks "End Interview":
1. `SessionContent` calls `driver.disconnect()` directly (imperative)
2. The WebSocket closes, and audio stops
3. **Issue:** The `BlockSession` timer continues to tick until navigation completes
4. **Root Cause:** `BlockSession` has its own reducer instance that never receives the termination event

### Split Brain Confirmed

**Current Architecture:**
```
BlockSession (Line 90)
├─ useReducer(sessionReducer, initialState)  ← Reducer #1
├─ Renders timer overlay (reads from local state)
└─ Renders SessionContent
    └─ useReducer(sessionReducer, initialState)  ← Reducer #2
        └─ "End Interview" button calls driver.disconnect()
```

**Problem Flow:**
1. User clicks "End Interview" in SessionContent
2. SessionContent's reducer transitions to `INTERVIEW_COMPLETE`
3. **BlockSession's reducer never knows interview ended**
4. **BlockSession's timer keeps ticking** (zombie state)

---

## Architectural Analysis: First Principles

A comprehensive first-principles analysis was conducted, evaluating the proposal against five core principles:

### ✅ Principle 1: Source of Truth Topology
**Finding:** CRITICAL Split Brain issue
- Two independent reducer instances (BlockSession.tsx:90, SessionContent.tsx:122)
- Timer reads from BlockSession's state, button dispatches to SessionContent's state
- **Verdict:** Must lift state to parent for single source of truth

### ✅ Principle 2: Side-Effect Control Flow
**Finding:** Proposed intent-based architecture is excellent
- Shift from imperative `driver.disconnect()` to declarative `dispatch({ type: "INTERVIEW_ENDED" })`
- Clean separation: business logic in reducer, infrastructure in driver
- **Verdict:** Architecture is sound

### ✅ Principle 3: Hardware Driver Pattern
**Finding:** Infrastructure layer is properly abstracted
- Driver is "dumb" (provides methods, emits events, makes no decisions)
- Command pattern (CLOSE_CONNECTION) already implemented
- **Verdict:** Clean separation maintained

### ⚠️ Principle 4: Lifecycle & Concurrency
**Finding:** Missing safety guards
- No protection against duplicate `INTERVIEW_ENDED` events
- No timeout if connection close hangs
- No cleanup strategy if component unmounts during transition
- **Verdict:** Needs hardening with state machine guards

### ✅ Principle 5: Testability
**Finding:** Architecture supports headless testing
- Reducer can be tested independently of React
- State is serializable
- **Verdict:** Should add unit tests to verification plan

---

## Architectural Decision: Option A (Lift State to Parent)

**Chosen Solution:** Lift state to page level, making both `BlockSession` and `SessionContent` controlled components.

### Why Option A is Correct

**✅ Single Source of Truth**
- One reducer instance per interview session
- No possibility of Split Brain

**✅ Proper Separation of Concerns**
```
Page Layer:           Business logic (owns reducer, state machine)
BlockSession Layer:   Presentation (timer overlays, block transitions)
SessionContent Layer: Presentation (chat UI, controls)
```

**✅ Reusability**
- Both components become controlled
- Can be tested in isolation with mock state
- Can be reused in different contexts (preview, playback)

**✅ Testability**
- Reducer logic tested independently (unit tests)
- UI components tested with mock state (component tests)
- Full flow tested (integration tests)

### Rejected Alternatives

**Option B (Pass Dispatch Down):**
- ❌ BlockSession still owns state (violates single responsibility)
- ❌ Makes BlockSession a hybrid (container + presentation)
- ❌ SessionContent loses standalone capability

**Option C (Context):**
- ⚠️ Overkill for single level of nesting
- ⚠️ Makes data flow implicit (harder to trace)
- ✅ Would work, but unnecessary complexity

---

## Implementation Plan

Full implementation plan documented in [FEAT27d spec](./todo/FEAT27d_user_termination.md).

### Phase Overview

1. **Phase 1:** Create page-level container, lift reducer
2. **Phase 2:** Convert BlockSession to controlled component
3. **Phase 3:** Convert SessionContent to controlled component (with backward compatibility)
4. **Phase 4:** Implement `INTERVIEW_ENDED` handler in reducer with guards
5. **Phase 5:** Add lifecycle safety & concurrency guards
6. **Phase 6:** Write comprehensive tests (unit, component, integration)
7. **Phase 7:** Manual verification & cleanup

### Key Changes

**Files to Create:**
- Enhanced `page.tsx` with lifted state

**Files to Modify:**
1. `BlockSession.tsx` - Remove local reducer, accept props
2. `SessionContent.tsx` - Support controlled mode, update button handler
3. `reducer.ts` - Add `INTERVIEW_ENDED` handler with guards
4. Type definitions - Add props for controlled components

**Tests to Add:**
1. `reducer.test.ts` - Unit tests for `INTERVIEW_ENDED` logic
2. `BlockSession.test.tsx` - Component tests with mock state
3. `SessionContent.test.tsx` - Component tests with mock dispatch
4. Integration tests - E2E flow verification

---

## Critical Implementation Details

### State Machine Guards

```typescript
case "INTERVIEW_ENDED": {
  // Guard: Only allow from ANSWERING or ANSWER_TIMEOUT_PAUSE
  if (state.status !== "ANSWERING" && state.status !== "ANSWER_TIMEOUT_PAUSE") {
    console.warn('Ignoring INTERVIEW_ENDED: invalid state', state.status)
    return { state, commands: [] }
  }

  return {
    state: {
      ...state,
      status: "INTERVIEW_COMPLETE",
      elapsedTime: state.elapsedTime, // Freeze timer
    },
    commands: [{ type: "CLOSE_CONNECTION" }]
  }
}
```

### Timer Freeze (TICK Handler)

```typescript
case "TICK": {
  // Don't update timers if interview is complete
  if (state.status === "INTERVIEW_COMPLETE") {
    return { state, commands: [] }
  }
  // ... rest of tick logic
}
```

### Lifecycle Safety

```typescript
// Timeout safety: Force navigation if connection doesn't close
useEffect(() => {
  if (state.status === "INTERVIEW_COMPLETE") {
    const timeout = setTimeout(() => {
      console.warn('Connection close timeout, forcing navigation')
      router.push(feedbackUrl)
    }, 5000)
    return () => clearTimeout(timeout)
  }
}, [state.status])

// Cleanup on unmount: Always disconnect
useEffect(() => {
  return () => {
    driver.disconnect()
    driver.dispose()
  }
}, [driver])
```

---

## Testing Strategy

### Unit Tests (Headless)

```typescript
describe('sessionReducer - INTERVIEW_ENDED', () => {
  it('transitions to INTERVIEW_COMPLETE from ANSWERING')
  it('freezes elapsedTime on termination')
  it('generates CLOSE_CONNECTION command')
  it('ignores INTERVIEW_ENDED from INTERVIEW_COMPLETE state')
  it('ignores INTERVIEW_ENDED from invalid states')
})
```

### Component Tests

```typescript
describe('BlockSession - controlled component', () => {
  it('renders timer from provided state')
  it('stops rendering timer when status is INTERVIEW_COMPLETE')
  it('calls dispatch when user clicks continue')
})

describe('SessionContent - End Interview button', () => {
  it('dispatches INTERVIEW_ENDED when clicked')
  it('disables button when status is INTERVIEW_COMPLETE')
})
```

### Manual Testing Checklist

1. ✅ Click "End Interview" → Timer stops **immediately** (no zombie tick)
2. ✅ Connection closes within 1 second
3. ✅ User is redirected to feedback page
4. ✅ Double-click "End Interview" → No duplicate requests (guard works)
5. ✅ Navigate away during ANSWERING → Cleanup happens (no memory leak)
6. ✅ Microphone indicator turns off immediately

---

## Success Criteria

**Functional Requirements:**
- [ ] Timer overlay in `BlockSession` stops immediately when "End Interview" is clicked
- [ ] No "zombie state" where UI is active but connection is dead
- [ ] "End Interview" acts as a definitive state change, not just a side effect
- [ ] Microphone indicator turns off immediately
- [ ] User is redirected to feedback page within 5 seconds

**Architectural Requirements:**
- [ ] Single reducer instance at page level (no Split Brain)
- [ ] BlockSession is a controlled component (no local reducer)
- [ ] SessionContent supports controlled mode
- [ ] State machine guards prevent invalid transitions
- [ ] Lifecycle cleanup is deterministic

**Testing Requirements:**
- [ ] Reducer unit tests pass (INTERVIEW_ENDED logic)
- [ ] Component tests pass (BlockSession, SessionContent)
- [ ] Integration tests pass (full flow)
- [ ] Manual testing checklist completed
- [ ] All existing tests still pass (48+)

**Code Quality:**
- [ ] No TypeScript errors
- [ ] `pnpm format && pnpm check` passes
- [ ] Code follows v5 architecture (events → reducer → commands → driver)
- [ ] Documentation updated

---

## Risk Assessment

**Risk Level:** MEDIUM

**Rationale:**
- ✅ **Positive:** Fixes fundamental architectural issue
- ✅ **Positive:** Improves testability and maintainability
- ⚠️ **Negative:** Touches multiple core files (page, BlockSession, SessionContent, reducer)
- ⚠️ **Negative:** Changes component ownership model (could affect other features)

**Mitigation:**
- Backward compatibility in SessionContent (standalone mode still works)
- Comprehensive test coverage (unit + component + integration)
- Phased implementation (can test each phase independently)
- Manual QA before commit

---

## Files to Modify

### Production Code (4 files)
1. `src/app/[locale]/(interview)/interview/[interviewId]/session/page.tsx`
   - Create/enhance page component with lifted state

2. `src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx`
   - Remove local reducer (lines 47-99)
   - Add state/dispatch props
   - Update all state references

3. `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent.tsx`
   - Add optional state/dispatch props
   - Support controlled mode
   - Update "End Interview" button (line 379)

4. `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`
   - Add INTERVIEW_ENDED handler with guards
   - Update TICK handler to freeze timer on complete

### Tests (3-4 files)
1. `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.test.ts`
   - Add INTERVIEW_ENDED test suite

2. `src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.test.tsx`
   - New file: Component tests

3. `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent.test.tsx`
   - New file: Component tests

4. `src/app/[locale]/(interview)/interview/[interviewId]/session/integration.test.ts`
   - Optional: E2E flow tests

---

## Implementation Approach: TDD

Following the project's TDD methodology (see [docs/03_testing.md](./03_testing.md)):

### Step 1: Write Failing Tests
- Reducer unit tests for INTERVIEW_ENDED logic
- Component tests for controlled components

### Step 2: Run Tests (Should Fail)
```bash
pnpm test reducer.test.ts
```

### Step 3: Implement Reducer Changes
- Add INTERVIEW_ENDED handler
- Update TICK handler
- Add state machine guards

### Step 4: Run Tests (Should Pass)
```bash
pnpm test reducer.test.ts
```

### Step 5: Implement Component Changes
- Lift state to page level
- Convert BlockSession to controlled
- Convert SessionContent to controlled

### Step 6: Run Component Tests
```bash
pnpm test BlockSession.test.tsx SessionContent.test.tsx
```

### Step 7: Manual QA
- Follow Manual Testing Checklist

### Step 8: Run Full Test Suite
```bash
pnpm test
```

Expected: All tests pass (48+ existing + new tests)

---

## Previous Work Reference

This builds on the v5 "Dumb Driver" architecture:
- **Spec:** [docs/todo/FEAT27c_v5_FINAL_IMPLEMENTATION_SPEC.md](./todo/FEAT27c_v5_FINAL_IMPLEMENTATION_SPEC.md)
- **Completion:** [docs/todo/FEAT27c_v5_IMPLEMENTATION_COMPLETE.md](./todo/FEAT27c_v5_IMPLEMENTATION_COMPLETE.md)
- **Related:** Original microphone cleanup issue identified during testing

---

**Status:** 🔴 **AWAITING APPROVAL**

**Next Step:** Await Mr. User's explicit approval to proceed with Phase 1 implementation.

---

## Questions for Mr. User

1. **Approval:** Should we proceed with Option A (Lift State to Parent)?
2. **Scope:** Should we implement all 7 phases, or break into smaller increments?
3. **Testing:** TDD approach acceptable (tests first, then implementation)?
4. **Backward Compatibility:** Keep SessionContent's standalone mode for future flexibility?
