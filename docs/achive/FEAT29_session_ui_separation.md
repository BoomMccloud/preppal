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
- Each file stays under 300 lines

**Note on Bundle Size:** Both `SessionContentDev` and `SessionContentProd` will be included in the production bundle since we use runtime environment checks (`process.env.NODE_ENV`). True dead code elimination would require dynamic imports, which adds complexity. For now, we accept this trade-off since the dev view is ~200 lines and the bundle size impact is negligible.

## 3. Design Reference

### 3.1 Mockup Location

`docs/todo/layout.html` - Static HTML mockup for production UI

**Important:** The mockup uses different colors (`#2b8cee` blue, `#101922` dark). Implementation must convert these to project colors as shown in the mapping table below.

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

### 3.3 Mockup-to-Project Color Mapping

When implementing `SessionContentProd.tsx`, convert mockup colors as follows:

| Mockup Element | Mockup Color | Project Equivalent |
|----------------|--------------|-------------------|
| Primary blue (`#2b8cee`) | Accent highlights, ripple borders | `bg-accent`, `border-accent` |
| Dark background (`#101922`) | Main video area | `bg-secondary` (dark mode) or `bg-slate-900` |
| Green indicator (`#22c55e`) | Connected/online status | `bg-success` |
| Red end button (`#ef4444`) | End call button | `bg-danger` |
| White text on dark | Avatar label, status badge | `text-primary-text` (dark mode) |
| Waveform bars | Audio visualizer | `bg-accent` |

### 3.4 Tailwind Usage

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

### 4.2 Data Fetching Ownership

**Current implementation analysis:** Looking at `page.tsx:84-102`, the interview status query lives in the page component, NOT in `SessionContent`. The `SessionContent` component only has:
- Debug-only polling (`api.debug.getInterviewStatus.useQuery`) - moves to `SessionContentDev`
- Interview status polling for loading state - this STAYS in current location

**Decision:**
- `SessionContent.tsx` (wrapper): Pure view selection, no data fetching
- `SessionContentDev.tsx`: Keeps the debug query (`api.debug.getInterviewStatus`)
- `SessionContentProd.tsx`: No data fetching - purely receives props

The interview completion detection happens in `useInterviewSession` hook via `state.status === "INTERVIEW_COMPLETE"` - this is unchanged.

### 4.3 Side-Effect Control Flow ✅

Views dispatch intents only - no side effects in UI layer:
```typescript
onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}
// Reducer returns command → Hook executes → Driver acts
```

### 4.4 Testability ✅

Core logic remains testable without React:
```typescript
const result = sessionReducer(state, { type: "INTERVIEW_ENDED" }, context);
expect(result.state.status).toBe("INTERVIEW_COMPLETE");
```

### 4.5 KISS Compliance ✅

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

### 5.3 Parent Files That Import SessionContent

These files must be checked after renaming to ensure imports still work:

| File | Import Usage |
|------|--------------|
| `src/app/[locale]/(interview)/interview/[interviewId]/session/page.tsx:12` | `import { SessionContent } from "./SessionContent"` - Used in `StandardInterviewWithState` component (line 95) |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx:10` | `import { SessionContent } from "./SessionContent"` - Used in multiple render paths (lines 84, 219) |

**Action:** After creating the new wrapper, verify these imports still resolve correctly. No changes needed since we're keeping the same export name.

## 6. Component Specifications

### 6.1 SessionContent.tsx (Wrapper)

Uses static imports with runtime environment check.

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

**Source:** Rename current `SessionContent.tsx` with minimal changes.

Features (already implemented):
- Stats panel showing connection state, elapsed time
- Debug buttons (check interview status via `api.debug.getInterviewStatus`)
- Collapsible raw state JSON viewer
- Full transcript display with auto-scroll
- Standard control bar with "End Interview" button
- Loading/connecting/error states

**Changes from current:**
1. Rename file to `SessionContentDev.tsx`
2. Rename export to `SessionContentDev`
3. Add `data-testid="session-dev"` to root element
4. Keep all existing debug functionality

### 6.3 SessionContentProd.tsx

**New file** implementing immersive production UI.

#### 6.3.1 Layout Structure (from mockup)

```
┌─────────────────────────────────────────────────────────┐
│ Header: Title + Connection Status + Timer + Settings    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│     ┌─────────────────────────────────────────┐        │
│     │  "Sarah (AI)"           "Listening..." │        │
│     │           ┌───────┐                     │        │
│     │           │  AI   │ ← ripple animation  │        │
│     │           │ Avatar│                     │        │
│     │           └───────┘                     │        │
│     │                                         │        │
│     │  "Tell me about a time you had to..."  │        │
│     │  ↑ Current question overlay             │        │
│     └─────────────────────────────────────────┘        │
│                                                         │
│            ┌─────────────────────────┐                 │
│            │ 🎤  ▮▮▮▮▮▮  📞 End    │ ← floating bar  │
│            └─────────────────────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 6.3.2 Header Details

The Prod view includes a header bar (adapted from mockup lines 88-111):

| Element | Description | Implementation |
|---------|-------------|----------------|
| Logo + Title | Interview title from props or generic "Mock Interview" | Left-aligned, uses existing project logo or simple icon |
| Connection indicator | Green dot + "Connected" text | `bg-success` dot with `text-secondary-text` label |
| Timer badge | Elapsed time in `MM:SS` format | `formatTime(state.elapsedTime)` - same helper as dev view |
| Settings button (optional) | Placeholder for future settings | Can omit in v1 - not critical path |

#### 6.3.3 Transcript Handling

**Decision: Hide transcript completely in Prod view.**

Rationale:
- Immersive call experience focuses on conversation, not reading
- Current question overlay provides context
- Transcript available in feedback after interview completes
- Reduces visual clutter

#### 6.3.4 Icons

Use existing SVG icons from project (no Material Symbols dependency):
- Mic icon: Inline SVG (similar to existing `AIAvatar.tsx` pattern)
- Phone/End call icon: Inline SVG
- Status indicator: Reuse `StatusIndicator` component or inline

#### 6.3.5 Features Summary

- Full-screen immersive dark background (`bg-secondary` in dark mode)
- Centered AI avatar with ripple animation (inline, not using existing `AIAvatar`)
- "Listening..." / "Speaking..." status badge with `role="status" aria-live="polite"`
- Current question overlay (last AI transcript entry, large text)
- Header bar with timer and connection status
- Floating control bar with:
  - Mic button with pulse animation (visual only - mic always on)
  - Audio waveform visualizer (CSS animation)
  - End call button (`bg-danger`)
- No transcript display

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

## 7. Translation Keys

### 7.1 Existing Keys (Reuse)

From `messages/en.json` under `interview.session`:

| Key | Value | Used In |
|-----|-------|---------|
| `title` | "Interview Session" | Header |
| `listening` | "Listening..." | Status badge |
| `speaking` | "Speaking..." | Status badge |
| `endInterview` | "End Interview" | End button |
| `ending` | "Ending..." | End button disabled state |
| `connecting` | "Connecting..." | Loading state |
| `connectionError` | "Connection Error" | Error state |
| `connectionLost` | "Connection lost. Please return to the dashboard." | Error message |
| `returnToDashboard` | "Return to Dashboard" | Error state button |
| `aiInterviewer` | "AI Interviewer" | Avatar label |

### 7.2 New Keys Required

Add to `messages/en.json` under `interview.session`:

```json
{
  "interview": {
    "session": {
      "...existing keys...",
      "connected": "Connected",
      "aiName": "Sarah (AI Interviewer)",
      "currentQuestion": "Current Question"
    }
  }
}
```

Add corresponding keys to `messages/es.json` and `messages/zh.json`.

| Key | EN | ES | ZH |
|-----|-----|-----|-----|
| `connected` | "Connected" | "Conectado" | "已连接" |
| `aiName` | "Sarah (AI Interviewer)" | "Sarah (Entrevistador IA)" | "Sarah（AI面试官）" |
| `currentQuestion` | "Current Question" | "Pregunta actual" | "当前问题" |

---

## 8. Animation Specifications

Animations are added to `src/styles/globals.css` to be available globally.

### 8.1 Correct Tailwind v4 Syntax

Add OUTSIDE the `@theme` block (keyframes are standard CSS, not theme variables):

```css
/* After the existing @theme block */

/* Ripple animation for AI avatar */
@keyframes ripple {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ripple {
  animation: ripple 2s infinite linear;
}

/* Soft pulse animation for avatar */
@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

.animate-pulse-soft {
  animation: pulse-soft 3s infinite ease-in-out;
}
```

### 8.2 Waveform Bars

CSS-only animated bars using Tailwind's standard `animate-pulse` with staggered delays via inline styles:

```tsx
<div className="flex items-center gap-1">
  <div className="w-1 h-3 bg-accent rounded-full animate-pulse" />
  <div className="w-1 h-6 bg-accent rounded-full animate-pulse" style={{ animationDelay: "75ms" }} />
  <div className="w-1 h-4 bg-accent rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
  <div className="w-1 h-8 bg-accent rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
  <div className="w-1 h-5 bg-accent rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
</div>
```

## 9. Implementation Plan

### Phase 1: File Structure Setup

1. Create new `SessionContent.tsx` wrapper with view selection logic
2. Copy current `SessionContent.tsx` to `SessionContentDev.tsx`
3. Update `SessionContentDev.tsx`:
   - Change export name to `SessionContentDev`
   - Add `data-testid="session-dev"` to root element
4. Verify imports in parent files still work:
   - `page.tsx:12` - uses named import `{ SessionContent }`
   - `BlockSession.tsx:10` - uses named import `{ SessionContent }`
5. Test dev mode still works

**Files Changed:**
- `SessionContent.tsx` (new - wrapper)
- `SessionContentDev.tsx` (copy of original with minor changes)

### Phase 2: Prod View Implementation

1. Create `SessionContentProd.tsx` based on layout.html mockup
2. Convert mockup colors to project colors (see Section 3.3)
3. Implement inline:
   - Header bar with timer and connection status
   - AI avatar with ripple animation
   - Status badge with aria-live
   - Current question overlay (from last AI transcript entry)
   - Floating control bar
4. Use inline SVG icons (no external dependencies)
5. Add `data-testid="session-prod"` to root element
6. Add new translation keys

**Files Changed:**
- `SessionContentProd.tsx` (new)
- `messages/en.json` (add keys)
- `messages/es.json` (add keys)
- `messages/zh.json` (add keys)

### Phase 3: Tailwind Config

1. Add `ripple` and `pulse-soft` animations to `src/styles/globals.css`

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

## 10. Testing Strategy

### 10.1 Unit Tests

Location: `src/test/unit/session/`

```typescript
// SessionContent.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

import { useSearchParams } from "next/navigation";
import { SessionContent } from "./SessionContent";

describe("SessionContent", () => {
  const mockProps = {
    interviewId: "test-id",
    state: {
      status: "ANSWERING",
      connectionState: "live",
      transcript: [],
      elapsedTime: 0,
      error: null,
      isAiSpeaking: false,
      // ... other required state fields
    },
    dispatch: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders dev view in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.mocked(useSearchParams).mockReturnValue({
      get: () => null,
    } as any);

    render(<SessionContent {...mockProps} />);
    expect(screen.getByTestId("session-dev")).toBeInTheDocument();
  });

  it("renders prod view in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(useSearchParams).mockReturnValue({
      get: () => null,
    } as any);

    render(<SessionContent {...mockProps} />);
    expect(screen.getByTestId("session-prod")).toBeInTheDocument();
  });

  it("forces prod view in dev mode with ?ui=prod", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => key === "ui" ? "prod" : null,
    } as any);

    render(<SessionContent {...mockProps} />);
    expect(screen.getByTestId("session-prod")).toBeInTheDocument();
  });
});
```

### 10.2 Visual Testing

Manual verification:
- [ ] Dev view displays stats panel
- [ ] Dev view shows raw state JSON
- [ ] Prod view has immersive dark layout
- [ ] Prod view shows AI avatar with ripple animations
- [ ] Prod view displays current question overlay
- [ ] Prod view header shows timer and connection status
- [ ] Control bar works in both modes
- [ ] **URL Toggle:** `?ui=prod` switches to Prod view in dev mode
- [ ] **Accessibility:** Screen readers announce status changes (test with VoiceOver/NVDA)
- [ ] **Colors:** All elements use project colors, not mockup colors
- [ ] **i18n:** Test with `?locale=es` and `?locale=zh`

### 10.3 Bundle Verification

Since we use runtime checks, both views will be bundled. To verify the wrapper logic works:

```bash
# Build
pnpm build

# Verify both components exist (expected - not tree-shaken)
grep -r "session-dev" .next/static/chunks/
grep -r "session-prod" .next/static/chunks/
# Both should return results
```

## 11. Dependencies

- Existing: `useInterviewSession` hook, reducer, types
- Existing: `StatusIndicator` component (may reuse in header)
- Existing: Translation infrastructure (`useTranslations`)
- New: Tailwind animations in `globals.css`
- **Not needed:** Material Symbols font (use inline SVGs)

## 12. Rollback Plan

If issues arise:
1. Delete `SessionContentProd.tsx`
2. Rename `SessionContentDev.tsx` back to `SessionContent.tsx`
3. Delete wrapper `SessionContent.tsx`
4. No database or API changes required

---

## 13. References

- Mockup: `docs/todo/layout.html`
- Current implementation: `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent.tsx`
- Color system: `src/styles/globals.css`
- Parent files: `page.tsx`, `BlockSession.tsx`
- Translation files: `messages/en.json`, `messages/es.json`, `messages/zh.json`
