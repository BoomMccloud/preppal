# Feature Specification: Session UI Separation (Dev/Prod)

## Implementation Status

> **Branch:** feat/interview-templates
> **Last Updated:** 2025-12-29

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1: File Structure** | Pending | Create wrapper, rename existing to Dev |
| **Phase 2: Prod View** | Pending | Immersive layout based on layout.html mockup |
| **Phase 3: Tailwind Config** | Pending | Add animations to global CSS/Tailwind config |

---

## 1. Overview

Separate the interview session UI into two distinct views:

- **Dev Mode** - Debug-focused view with stats panel, raw state viewer, and connection diagnostics
- **Prod Mode** - Polished, immersive video-call style interface based on `layout.html` mockup

**New Capability:** In development mode, developers can force the "Prod" view by appending `?ui=prod` to the URL.

Both views use the project's existing color system (Tailwind CSS variables) for consistency.

## 2. Problem Statement

Current limitations:
- Single `SessionContent.tsx` (267 lines) handles both debug and production UI
- Debug code pollutes production bundle
- Production UI is basic and functional, not polished
- No clear separation of concerns between dev diagnostics and user experience

Goals:
- Clean, immersive UI for production users
- Rich debugging tools for development
- Dead code elimination removes dev view from prod bundle
- Each file stays under 300 lines

## 3. Design Reference

### 3.1 Mockup Location

`docs/todo/layout.html` - Static HTML mockup for production UI

### 3.2 Project Color System

From `src/styles/globals.css`:

| CSS Variable | Light Mode | Dark Mode | Usage |
|--------------|------------|-----------|-------|
| `--color-primary` | `#fcfcfc` | `#1f2937` | Main background |
| `--color-secondary` | `#f1f3f4` | `#374151` | Secondary background |
| `--color-primary-text` | `#334155` | `#f9fafb` | Primary text |
| `--color-secondary-text` | `#64748b` | `#9ca3af` | Secondary text |
| `--color-accent` | `#0d9488` | `#5eead4` | Accent/highlight |
| `--color-success` | `#16a34a` | `#a7f3d0` | Success states |
| `--color-danger` | `#ef4444` | `#fda4af` | Danger/end call |

### 3.3 Tailwind Usage

```tsx
// Use CSS variables via Tailwind classes
<div className="bg-primary text-primary-text" />
<div className="bg-secondary text-secondary-text" />
<button className="bg-accent hover:bg-accent/90" />
<button className="bg-danger hover:bg-danger/90" />
```

## 4. Architecture Decisions

This design was validated against first-principle thinking (see `.claude/skills/first-principle`).

### 4.1 Source of Truth Topology ✅

State ownership remains in `useInterviewSession` hook. Both dev/prod views receive `state` and `dispatch` as props - they are pure "limbs" that render UI and dispatch events, not decision-makers.

```
useInterviewSession (Brain) ← No changes
    ├── useReducer (Single State Tree)
    ├── useInterviewSocket (Dumb Driver)
    └── SessionContent (Wrapper)
        ├── SessionContentDev (Limb - props-driven)
        └── SessionContentProd (Limb - props-driven)
```

### 4.2 Side-Effect Control Flow ✅

Views dispatch intents only - no side effects in UI layer:
```typescript
onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}
// Reducer returns command → Hook executes → Driver acts
```

### 4.3 Testability ✅

Core logic remains testable without React:
```typescript
const result = sessionReducer(state, { type: "INTERVIEW_ENDED" }, context);
expect(result.state.status).toBe("INTERVIEW_COMPLETE");
```

### 4.4 KISS Compliance ✅

This design was validated against KISS principles (see `.claude/skills/kiss`).

**Key decisions:**
- **No extracted components** - Inline all UI in dev/prod views until 300-line limit is hit
- **No shared abstractions** - Dev and prod UIs are fundamentally different
- **No variant props** - Different views = different code, not configuration
- **4 files total** - Minimal file count for the requirement

---

## 5. File Structure

### 5.1 Target Structure

```
src/app/[locale]/(interview)/interview/[interviewId]/session/
├── SessionContent.tsx         # Wrapper - selects dev/prod view (~30 lines)
├── SessionContentDev.tsx      # Dev view with inline stats (~200 lines)
├── SessionContentProd.tsx     # Prod view - immersive UI (~250 lines)
├── hooks/
│   └── useInterviewSession.ts # Existing - no changes
├── reducer.ts                 # Existing - no changes
└── types.ts                   # Existing - no changes
```

**3 new/modified files. No extracted components.**

### 5.2 File Responsibilities

| File | Purpose | Lines |
|------|---------|-------|
| `SessionContent.tsx` | Thin wrapper, environment detection | ~40 |
| `SessionContentDev.tsx` | Debug UI with inline stats panel, transcript, controls | ~200 |
| `SessionContentProd.tsx` | Immersive UI with inline avatar, question overlay, controls | ~250 |

## 6. Component Specifications

### 6.1 SessionContent.tsx (Wrapper)

Uses static imports with dead code elimination where possible, but includes dynamic runtime check for URL params to improve DX.

```typescript
/**
 * SessionContent - Environment-aware wrapper for interview session UI
 * Selects dev or prod view based on NODE_ENV and URL parameters.
 */
"use client";

import type { Dispatch } from "react";
import { useSearchParams } from "next/navigation";
import type { SessionState, SessionEvent } from "./types";
import { SessionContentDev } from "./SessionContentDev";
import { SessionContentProd } from "./SessionContentProd";

const IS_DEV = process.env.NODE_ENV === "development";

interface SessionContentProps {
  interviewId: string;
  guestToken?: string;
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  onConnectionReady?: () => void;
}

export function SessionContent(props: SessionContentProps) {
  const searchParams = useSearchParams();
  const forceProd = searchParams.get("ui") === "prod";

  // In development, show Dev view unless forced to Prod
  if (IS_DEV && !forceProd) {
    return <SessionContentDev {...props} />;
  }

  return <SessionContentProd {...props} />;
}
```

### 6.2 SessionContentDev.tsx

Features:
- Stats panel (top or side) showing:
  - Connection state (`initializing` | `connecting` | `live` | `ending` | `error`)
  - Elapsed time (formatted)
  - Transcript entry count
  - AI speaking state (boolean)
  - Last error message
- Collapsible raw state JSON viewer
- Debug buttons (check interview status)
- Basic transcript display
- Standard control bar

### 6.3 SessionContentProd.tsx

Features (adapted from layout.html):
- Full-screen immersive dark background (using project colors)
- Centered AI avatar with ripple animation
- "Listening..." / "Speaking..." status badge (**Live Region** for A11y)
- Current question overlay (large text)
- Floating control bar with:
  - Mic button with pulse animation
  - Audio waveform visualizer (CSS animation)
  - End call button
- Transcript hidden or minimal (focus on conversation)

**Accessibility Note:**
The status badge should use `role="status" aria-live="polite"` so screen readers announce when the AI starts/stops listening.

### 6.4 Inline Components (No Extraction)

Per KISS principles, all sub-components are inlined.

**Why no extraction?**
- Each component is used only once
- Dev and prod controls are fundamentally different (not variants)
- Inlining keeps related code together (locality)
- Extract later if files exceed 300 lines

### 6.5 Data-TestId Strategy

Add test IDs to distinguish views and enable reliable testing:

```typescript
// SessionContentDev.tsx
<div data-testid="session-dev">
  {/* Stats, transcript, controls all inline */}
</div>

// SessionContentProd.tsx
<div data-testid="session-prod">
  {/* Avatar, question overlay, controls all inline */}
</div>
```

---

## 7. Animation Specifications

Animations are added to `src/styles/globals.css` (Tailwind v4 theme config) to be available globally and use theme tokens.

### 7.1 Ripple Animation

```css
@theme {
  --animate-ripple: ripple 2s infinite linear;
  
  @keyframes ripple {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
}
```

### 7.2 Pulse Animation

```css
@theme {
  --animate-pulse-soft: pulse-soft 3s infinite ease-in-out;

  @keyframes pulse-soft {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
}
```

### 7.3 Waveform Bars

CSS-only animated bars using Tailwind's standard `animate-pulse` with staggered delays.

## 8. Implementation Plan

### Phase 1: File Structure Setup

1. Create `SessionContent.tsx` wrapper with URL toggle logic
2. Rename current `SessionContent.tsx` to `SessionContentDev.tsx`
3. Update imports in parent components
4. Verify dev mode still works

**Files Changed:**
- `SessionContent.tsx` (new - wrapper)
- `SessionContentDev.tsx` (renamed from SessionContent.tsx)

### Phase 2: Prod View Implementation

1. Create `SessionContentProd.tsx` based on layout.html mockup
2. Implement inline: AI avatar, question overlay, floating control bar
3. Use project color variables throughout
4. Add data-testid attributes and A11y live regions

**Files Changed:**
- `SessionContentProd.tsx` (new)

### Phase 3: Tailwind Config

1. Add `ripple` and `pulse-soft` animations to `src/styles/globals.css` (Tailwind v4)

**Files Changed:**
- `src/styles/globals.css` (add animations)

### Future: Component Extraction (Only If Needed)

Extract components only when:
- A file exceeds 300 lines
- Same code is duplicated 3+ times
- Testing requires isolation

| Component | Extract When |
|-----------|--------------|
| `TranscriptBubble` | Used in 3+ places with identical styling |
| `StatsPanel` | Dev view exceeds 300 lines |
| `ControlBar` | Never (dev/prod are fundamentally different) |

## 9. Testing Strategy

### 9.1 Unit Tests

Location: `src/test/unit/session/`

```typescript
// SessionContent.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

describe("SessionContent", () => {
  const mockProps = {
    interviewId: "test-id",
    state: { /* mock state */ },
    dispatch: vi.fn(),
  };

  it("renders dev view in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    // Mock useSearchParams to return null
    render(<SessionContent {...mockProps} />);
    expect(screen.getByTestId("session-dev")).toBeInTheDocument();
  });

  it("renders prod view in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<SessionContent {...mockProps} />);
    expect(screen.getByTestId("session-prod")).toBeInTheDocument();
  });
  
  it("forces prod view in dev mode with ?ui=prod", () => {
    vi.stubEnv("NODE_ENV", "development");
    // Mock useSearchParams to return 'prod'
    render(<SessionContent {...mockProps} />);
    expect(screen.getByTestId("session-prod")).toBeInTheDocument();
  });
});
```

### 9.2 Visual Testing

Manual verification:
- [ ] Dev view displays stats panel
- [ ] Dev view shows raw state JSON
- [ ] Prod view has immersive dark layout
- [ ] Prod view shows AI avatar with animations
- [ ] Prod view displays current question overlay
- [ ] Control bar works in both modes
- [ ] **URL Toggle:** `?ui=prod` switches to Prod view in dev mode
- [ ] **Accessibility:** Screen readers announce status changes

### 9.3 Bundle Size Verification

```bash
# Build and check bundle
pnpm build

# Verify dev components not in prod bundle
# Look for "SessionContentDev" in .next/static chunks
grep -r "SessionContentDev" .next/static/chunks/
# Should return no results in production build
```

## 10. Dependencies

- Existing: `useInterviewSession` hook, reducer, types
- Existing: `AIAvatar`, `StatusIndicator` components (may inline or reuse)
- New: Tailwind animations in `globals.css`

## 11. Rollback Plan

If issues arise:
1. Revert to single `SessionContent.tsx`
2. Keep dev code behind `IS_DEV` conditionals
3. No database or API changes required

---

## 12. References

- Mockup: `docs/todo/layout.html`
- Current implementation: `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent.tsx`
- Color system: `src/styles/globals.css`