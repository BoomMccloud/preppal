# FEAT32: Interview Session UI Reskin

## Summary

Reskin the interview session UI (`SessionContentProd.tsx`) to implement a proper design system with CSS variables, conditional animations based on AI state, Geist typography, and theme support. Additionally, add a dev mode with a transcript console panel for debugging.

## Status: TODO

## Priority: P2 (Enhancement)

## Architecture Review

This spec has been reviewed against **First-Principle** and **KISS** analysis frameworks:

**First-Principle Analysis:** ✅ PASS
- Existing session architecture follows clean patterns (reducer + dumb driver)
- `isAiSpeaking` state already available from reducer
- Timer data (`elapsedTime`) already in state - just needs display logic
- No architectural changes needed - this is a pure UI/presentation layer change

**KISS Analysis:** Applied simplifications
- Reduced new files from 4 to 1 (only `DevConsole.tsx`)
- Removed 2 unnecessary hooks (`useTheme.ts`, `useTimerState.ts`)
- Timer logic: 8-line pure function inline vs separate hook file
- Theme toggle: 15-line inline component vs separate hook file
- Progress ring: Inline first, extract only if >50 lines

## Reference Design

- **Mockup:** `docs/todo/layout6.html`
- **Current Implementation:** `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

## Problem Statement

**Current Issues:**

1. **No Design System:** Hardcoded color values (`slate-900`, `slate-800`) scattered throughout, making theming impossible
2. **Always-On Animations:** Avatar ripple and pulse run constantly, creating visual fatigue and losing their feedback purpose
3. **No Typography System:** Missing custom fonts, relies on Tailwind defaults
4. **Dark Mode Only:** Locked to dark theme with no flexibility
5. **No Page Load Polish:** Missing entrance animations
6. **Poor Dev Experience:** No way to see transcript/state during development

**User Impact:**
- Visual fatigue from constant animations
- No light mode for users who prefer it
- Generic appearance lacking brand identity
- Developers struggle to debug session issues

## Design System Specification

### CSS Variables

Create a semantic color system using CSS variables in `globals.css`:

```css
:root {
  /* Surfaces */
  --color-primary: #fcfcfc;
  --color-secondary: #f1f3f4;

  /* Text */
  --color-primary-text: #334155;
  --color-secondary-text: #64748b;

  /* Accents */
  --color-accent: #0d9488;
  --color-success: #16a34a;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}

.dark {
  /* Surfaces */
  --color-primary: #1f2937;
  --color-secondary: #374151;

  /* Text */
  --color-primary-text: #f9fafb;
  --color-secondary-text: #9ca3af;

  /* Accents */
  --color-accent: #5eead4;
  --color-success: #a7f3d0;
  --color-warning: #fcd34d;
  --color-danger: #fda4af;
}
```

### Tailwind Extension

Add semantic colors to `tailwind.config.ts`:

```typescript
colors: {
  "primary": "var(--color-primary)",
  "secondary": "var(--color-secondary)",
  "primary-text": "var(--color-primary-text)",
  "secondary-text": "var(--color-secondary-text)",
  "accent": "var(--color-accent)",
  "success": "var(--color-success)",
  "warning": "var(--color-warning)",
  "danger": "var(--color-danger)",
}
```

### Typography

Add Geist font to `app/layout.tsx`:

```typescript
import { GeistSans } from 'geist/font/sans';

// In layout
<html className={GeistSans.className}>
```

Or via Google Fonts in `globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');

:root {
  --font-display: 'Geist', ui-sans-serif, system-ui, sans-serif;
}
```

## Animation System

### Keyframe Definitions

Add to `globals.css`:

```css
/* Soft breathing pulse for avatar when AI speaks */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.03); }
}

/* Ripple effect radiating from avatar */
@keyframes ripple {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

/* Page entrance animation */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mobile mic button shadow pulse */
@keyframes shadow-pulse {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.3),
                0 0 0 8px rgba(13, 148, 136, 0.15);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(13, 148, 136, 0.4),
                0 0 0 12px rgba(13, 148, 136, 0.2);
  }
}

/* Dark mode shadow pulse uses brighter teal */
@keyframes shadow-pulse-dark {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(94, 234, 212, 0.3),
                0 0 0 8px rgba(94, 234, 212, 0.15);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(94, 234, 212, 0.4),
                0 0 0 12px rgba(94, 234, 212, 0.2);
  }
}

/* Pulsing ring for critical timer state */
@keyframes pulse-ring-danger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Progress ring smooth transition */
.progress-ring {
  transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
}
```

### Tailwind Animation Utilities

Add to `tailwind.config.ts`:

```typescript
animation: {
  "pulse-soft": "pulse-soft 3s infinite ease-in-out",
  "ripple": "ripple 2s infinite linear",
  "fade-up": "fade-up 0.5s ease-out backwards",
  "fade-up-delay-1": "fade-up 0.5s ease-out 0.1s backwards",
  "fade-up-delay-2": "fade-up 0.5s ease-out 0.2s backwards",
  "shadow-pulse": "shadow-pulse 1.5s ease-in-out infinite",
  "pulse-ring-danger": "pulse-ring-danger 1s infinite",
}
```

### Conditional Animation Logic

**Key Principle:** Animations should indicate state, not run constantly.

| Element | Idle State | Active State (AI Speaking) |
|---------|------------|---------------------------|
| Avatar Ripples | Hidden | Visible, animating |
| Avatar Icon | Static ring | `animate-pulse-soft` |
| Waveform Bars | Short (h-2), gray | Tall (varying), accent color, pulsing |
| Mic Button | No shadow | `animate-shadow-pulse` (mobile only) |

**Implementation in React:**

```tsx
// Avatar ripples - only show when AI is speaking
{isAiSpeaking && (
  <div className="absolute flex items-center justify-center">
    <div className="size-40 rounded-full border border-accent/40 animate-ripple" />
    <div className="size-40 absolute rounded-full border border-accent/25 animate-ripple"
         style={{ animationDelay: "0.6s" }} />
    <div className="size-40 absolute rounded-full border border-accent/15 animate-ripple"
         style={{ animationDelay: "1.2s" }} />
  </div>
)}

// Avatar icon - conditional pulse
<div className={cn(
  "relative size-32 rounded-full bg-gradient-to-br from-accent/20 to-accent/5",
  "flex items-center justify-center shadow-2xl ring-4 ring-secondary z-20",
  isAiSpeaking && "animate-pulse-soft"
)}>
```

## Progress Ring Timer System

The timer is displayed as an SVG progress ring wrapping around the AI avatar, providing visual feedback on remaining time without occupying additional screen space.

### Timer States

| State | Ring Color | Ring Fill | Avatar Display | Mic Button Color |
|-------|------------|-----------|----------------|------------------|
| Normal | `accent` | Full (100%) | AI Icon | `bg-accent` |
| Warning | `warning` | ~40% remaining | AI Icon | `bg-warning` |
| Critical | `danger` (pulsing) | ~10% remaining | Countdown Number | `bg-danger` |
| Expired | `secondary-text` | Empty (0%) | "Time Up" display | `bg-secondary-text` |

### Progress Ring SVG Structure

```tsx
<svg className="absolute inset-0 size-40 -rotate-90" viewBox="0 0 100 100">
  {/* Background ring (always visible) */}
  <circle
    cx="50" cy="50" r="46"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    className="text-secondary-text/20"
  />
  {/* Progress ring (fills based on time remaining) */}
  <circle
    cx="50" cy="50" r="46"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    strokeDasharray="289"  // circumference = 2 * PI * 46
    strokeDashoffset={progressOffset}
    className={cn(
      "progress-ring",
      timerState === "normal" && "text-accent",
      timerState === "warning" && "text-warning",
      timerState === "critical" && "text-danger animate-pulse-ring-danger",
      timerState === "expired" && "text-secondary-text"
    )}
  />
</svg>
```

### Avatar State Variants

**Normal/Warning State - AI Icon:**
```tsx
<div className="relative size-32 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-secondary z-20">
  <SmartToyIcon className="text-6xl text-accent" />
  {/* Online indicator */}
  <div className="absolute bottom-1 right-1 size-7 bg-secondary rounded-full flex items-center justify-center">
    <div className="size-4 bg-success rounded-full border-2 border-secondary" />
  </div>
</div>
```

**Critical State - Countdown Display:**
```tsx
<div className="size-32 rounded-full bg-danger/10 flex items-center justify-center ring-4 ring-danger/30">
  <span className="text-5xl font-bold text-danger tabular-nums">{countdown}</span>
</div>
```

**Expired State - Time Up Display:**
```tsx
<div className="size-32 rounded-full bg-secondary-text/10 flex flex-col items-center justify-center ring-4 ring-secondary-text/30">
  <MicOffIcon className="text-4xl text-secondary-text" />
  <span className="text-[10px] font-semibold text-secondary-text mt-0.5 uppercase tracking-wide">
    Time Up
  </span>
</div>
```

### Timer State Logic (Inline Pure Function)

No hook needed - just a pure function inline in the component (KISS principle):

```typescript
// Inline in SessionContentProd.tsx - 8 lines, fully testable
type TimerState = "normal" | "warning" | "critical" | "expired";

function getTimerState(elapsed: number, limit: number): TimerState {
  if (limit === 0) return "normal"; // No time limit
  const remaining = limit - elapsed;
  if (remaining <= 0) return "expired";
  const pct = remaining / limit;
  return pct <= 0.1 ? "critical" : pct <= 0.4 ? "warning" : "normal";
}

// Usage in component
const timerState = getTimerState(elapsedTime, context.answerTimeLimit);

// Progress offset calculation
const circumference = 2 * Math.PI * 46; // ~289
const remaining = context.answerTimeLimit - elapsedTime;
const percentRemaining = context.answerTimeLimit > 0 ? remaining / context.answerTimeLimit : 1;
const progressOffset = circumference * (1 - Math.max(0, percentRemaining));
```

**Testing:** This pure function can be unit tested without React:
```typescript
expect(getTimerState(50, 100)).toBe("normal");   // 50% remaining
expect(getTimerState(70, 100)).toBe("warning");  // 30% remaining
expect(getTimerState(95, 100)).toBe("critical"); // 5% remaining
expect(getTimerState(100, 100)).toBe("expired"); // 0% remaining
```

## Component Structure

### Production Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
│ [AI Icon + Title + Status] ────────── [Block 2/3] [Settings]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    Main Video Area                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [AI Name Badge]                    [Status: Listening] │  │
│  │                                                        │  │
│  │                   ┌──────────┐                         │  │
│  │                   │ Progress │                         │  │
│  │                   │  Ring    │                         │  │
│  │                   │  ┌────┐  │                         │  │
│  │                   │  │ AI │  │                         │  │
│  │                   │  │Icon│  │                         │  │
│  │                   │  └────┘  │                         │  │
│  │                   │ (Timer)  │                         │  │
│  │                   └──────────┘                         │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ "Current question text displayed here..."        │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│           ┌─────────────────────────────────────┐            │
│           │ [Mic] [Waveform] [End Call]         │            │
│           └─────────────────────────────────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key Changes from Previous Design:**
- Timer moved from header to progress ring around avatar
- Header now shows block progress (e.g., "Block 2/3")
- Progress ring changes color based on timer state (accent → warning → danger)
- Avatar is replaced by countdown number in critical state (last 10%)
- Avatar is replaced by "Time Up" display when time expires

### Dev Mode Layout

When `NODE_ENV === "development"`, add a collapsible debug panel:

```
┌──────────────────────────────────────────────────────────────┐
│ Header                                              [⚙ Dev] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    Main Video Area                           │
│                        (same as prod)                        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Debug Console (collapsible)                          [▼/▲]  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ State: ANSWERING | Block: 1/3 | Elapsed: 02:45          │ │
│ │ ──────────────────────────────────────────────────────── │ │
│ │ [AI] Tell me about a time you had to prioritize...      │ │
│ │ [USER] Well, in my previous role at...                  │ │
│ │ [AI] That's interesting. Can you elaborate on...        │ │
│ │ [USER] Sure, the main challenge was...                  │ │
│ │ [USER_PARTIAL] And we also had to consider...           │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Debug Console Features:**

1. **State Display:** Current session status, block number, elapsed time
2. **Transcript Log:** Real-time transcript with speaker labels
3. **Partial Transcript:** Show in-progress user speech (dimmed)
4. **Collapsible:** Toggle visibility with keyboard shortcut (`Ctrl+D`)
5. **Auto-scroll:** Follow new messages, pause on hover

## Theme Support

### Theme Toggle Button (Inline Implementation)

Add theme toggle directly in the header - no separate hook file needed (KISS principle):

```tsx
// Inline in SessionContentProd.tsx header - ~15 lines total
function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  const toggle = () => {
    const newIsDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    setIsDark(newIsDark);
  };

  return (
    <button
      onClick={toggle}
      className="flex size-9 items-center justify-center rounded-lg hover:bg-secondary"
      aria-label="Toggle theme"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
```

**Note:** The `isDark` state is only for icon display. The actual source of truth is `document.documentElement.classList` (CSS-driven theming pattern).

### Flash Prevention

Add to `<head>` in layout to prevent theme flash:

```html
<script>
  (function() {
    const theme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  })();
</script>
```

## Page Load Choreography

Stagger entrance animations for polish:

```tsx
// Header - immediate
<header className="animate-fade-up">

// Main content - slight delay
<main className="animate-fade-up-delay-1">

// Control bar - more delay
<div className="animate-fade-up-delay-2">
```

## Mobile Considerations

### Voice Indicator

On mobile, the waveform is hidden. Use shadow pulse on mic button instead:

```tsx
<div className={cn(
  "size-14 rounded-full bg-accent",
  // Only animate on mobile when user is speaking (mic active)
  !isAiSpeaking && "sm:shadow-none animate-shadow-pulse sm:animate-none"
)}>
```

### Responsive Breakpoints

| Element | Mobile (<640px) | Desktop (≥640px) |
|---------|-----------------|------------------|
| Timer | Hidden | Visible |
| Waveform | Hidden | Visible |
| Mic Shadow Pulse | Active when speaking | Disabled |
| Question Text | `text-lg` | `text-xl lg:text-2xl` |
| Control Gap | `gap-8` | `gap-6` |

## Files to Modify

| File | Change |
|------|--------|
| `src/styles/globals.css` | Add CSS variables, keyframes (including `pulse-ring-danger`), progress-ring transition |
| `tailwind.config.ts` | Add semantic colors (including `warning`), animation utilities |
| `src/app/layout.tsx` | Add Geist font, theme flash prevention script |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx` | Refactor to use design system, add inline progress ring timer, conditional animations, inline theme toggle |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/components/DevConsole.tsx` | NEW: Debug console component |

**KISS Simplifications Applied:**
- ~~`useTheme.ts`~~ - Removed, inline 15 lines in header instead
- ~~`useTimerState.ts`~~ - Removed, use inline pure function `getTimerState()` (8 lines)
- ~~`ProgressRingAvatar.tsx`~~ - Deferred, implement inline first, extract only if exceeds 50 lines

## Implementation Order

1. **Design System Foundation**
   - Add CSS variables to `globals.css` (including `warning` color)
   - Extend Tailwind config with semantic colors
   - Add keyframe animations (including `pulse-ring-danger`)
   - Add `.progress-ring` transition class

2. **Typography & Theme Flash Prevention**
   - Install/configure Geist font
   - Add theme flash prevention script to layout `<head>`

3. **Refactor SessionContentProd** (main work)
   - Add inline `getTimerState()` pure function (8 lines)
   - Add inline progress ring SVG with timer state variants
   - Add inline theme toggle button in header (15 lines)
   - Replace hardcoded colors with semantic classes
   - Replace timer display with block progress in header
   - Implement conditional animations based on `isAiSpeaking`
   - Add page load animations
   - Integrate timer state with mic button color
   - **Post-refactor:** If progress ring code exceeds 50 lines, extract to `ProgressRingAvatar.tsx`

4. **Dev Console**
   - Create `DevConsole.tsx` component
   - Integrate with session state/transcript
   - Add keyboard shortcut toggle (`Ctrl+D`)
   - Add cleanup for keyboard event listener

5. **Polish**
   - Mobile shadow pulse indicator
   - Responsive adjustments
   - Test light/dark modes
   - Test all timer state transitions

## Acceptance Criteria

### Design System
- [ ] All colors use CSS variables, no hardcoded hex values in components
- [ ] Theme can be toggled between light and dark
- [ ] Theme persists across page refreshes
- [ ] No theme flash on page load

### Progress Ring Timer
- [ ] Progress ring displays around avatar showing remaining time
- [ ] Ring color is accent (teal) in normal state
- [ ] Ring color changes to warning (amber) at 40% time remaining
- [ ] Ring color changes to danger (red) at 10% time remaining
- [ ] Ring pulses in critical state (`animate-pulse-ring-danger`)
- [ ] Avatar is replaced by countdown number in critical state
- [ ] Avatar is replaced by "Time Up" display when time expires
- [ ] Mic button color matches timer state (accent → warning → danger → gray)
- [ ] Ring stroke-dashoffset animates smoothly between states
- [ ] Header shows block progress (e.g., "Block 2/3") instead of timer

### Animations
- [ ] Avatar ripples only visible when AI is speaking
- [ ] Avatar pulse only active when AI is speaking
- [ ] Waveform shows idle state (short gray bars) when user is not speaking
- [ ] Waveform shows active state (tall colored bars) when user is speaking
- [ ] Page elements fade up on load with staggered timing

### Typography
- [ ] Geist font loads and renders correctly
- [ ] Countdown number uses `tabular-nums` for stable width

### Dev Mode
- [ ] Debug console visible in development only
- [ ] Shows current state, block number, elapsed time
- [ ] Shows real-time transcript with speaker labels
- [ ] Collapsible via button or `Ctrl+D`
- [ ] Auto-scrolls to latest, pauses on hover
- [ ] Keyboard event listener cleaned up on unmount

### Code Quality (KISS)
- [ ] No separate `useTheme.ts` hook file - theme toggle is inline
- [ ] No separate `useTimerState.ts` hook file - `getTimerState()` is inline pure function
- [ ] `getTimerState()` has unit tests (pure function, no React needed)
- [ ] Progress ring code inline unless >50 lines (then extract)

### Mobile
- [ ] Mic button has shadow pulse when speaking (mobile only)
- [ ] Waveform hidden on mobile
- [ ] Touch targets are 44px minimum

## Visual Reference

See `docs/todo/layout6.html` for the complete reference implementation with:
- Working theme toggle
- Demo controls for all timer states (Normal, Warning, Critical, Expired)
- AI Speaking toggle to test ripple animations
- Progress ring timer around avatar
- All animations and transitions

## Risks

**Low Risk:**
- CSS variable approach is well-supported (IE11+ not needed)
- Conditional animations follow React best practices
- No breaking changes to functionality

**Medium Risk:**
- Font loading may cause layout shift (mitigate with `font-display: swap`)
- Theme flash prevention requires inline script (CSP consideration)

## Testing Plan

### Visual Regression
- Screenshot comparison of light/dark modes
- Verify animations trigger correctly based on state

### Accessibility
- Verify `prefers-reduced-motion` is respected
- Ensure color contrast meets WCAG AA in both themes
- Test keyboard navigation for theme toggle and dev console

### Cross-Browser
- Test in Chrome, Firefox, Safari
- Verify animations perform well on lower-end devices

## References

- [Reference Design](./layout6.html) - Interactive HTML mockup with progress ring timer
- [Current Implementation](../../src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx)
- [Tailwind Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)
- [Geist Font](https://vercel.com/font)
- [SVG Stroke Dasharray/Dashoffset](https://css-tricks.com/svg-line-animation-works/) - Progress ring animation technique
