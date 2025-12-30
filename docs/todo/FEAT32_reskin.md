# FEAT32: Interview Session UI Reskin

## Summary

Reskin the interview session UI (`SessionContentProd.tsx`) to implement a proper design system with CSS variables, conditional animations based on AI state, Geist typography, and theme support. Additionally, add a dev mode with a transcript console panel for debugging.

## Status: TODO

## Priority: P2 (Enhancement)

## Reference Design

- **Mockup:** `docs/todo/layout2.html`
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
    <div className="size-32 rounded-full border border-accent/40 animate-ripple" />
    <div className="size-32 absolute rounded-full border border-accent/25 animate-ripple"
         style={{ animationDelay: "0.6s" }} />
    <div className="size-32 absolute rounded-full border border-accent/15 animate-ripple"
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

## Component Structure

### Production Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
│ [AI Icon + Title + Status] ─────────────── [Timer] [Theme]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    Main Video Area                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [AI Name Badge]                    [Status: Listening] │  │
│  │                                                        │  │
│  │                   ┌──────────┐                         │  │
│  │                   │ Ripples  │                         │  │
│  │                   │  ┌────┐  │                         │  │
│  │                   │  │ AI │  │                         │  │
│  │                   │  │Icon│  │                         │  │
│  │                   │  └────┘  │                         │  │
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

### Theme Toggle Button

Add a theme toggle in the header (settings position):

```tsx
<button
  onClick={toggleTheme}
  className="flex size-9 items-center justify-center rounded-lg hover:bg-secondary"
  aria-label="Toggle theme"
>
  {isDark ? <SunIcon /> : <MoonIcon />}
</button>
```

### Theme Persistence

Use localStorage with system preference fallback:

```typescript
// In a useTheme hook or layout
useEffect(() => {
  const stored = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored ?? (systemPrefersDark ? 'dark' : 'light');

  document.documentElement.classList.toggle('dark', theme === 'dark');
}, []);

const toggleTheme = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
};
```

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
| `src/styles/globals.css` | Add CSS variables, keyframes, theme styles |
| `tailwind.config.ts` | Add semantic colors, animation utilities |
| `src/app/layout.tsx` | Add Geist font, theme flash prevention |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx` | Refactor to use design system, conditional animations |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/components/DevConsole.tsx` | NEW: Debug console component |
| `src/hooks/useTheme.ts` | NEW: Theme toggle hook |

## Implementation Order

1. **Design System Foundation**
   - Add CSS variables to `globals.css`
   - Extend Tailwind config with semantic colors
   - Add keyframe animations

2. **Typography**
   - Install/configure Geist font
   - Update font-family in Tailwind config

3. **Refactor SessionContentProd**
   - Replace hardcoded colors with semantic classes
   - Implement conditional animations based on `isAiSpeaking`
   - Add page load animations

4. **Theme Support**
   - Create `useTheme` hook
   - Add theme toggle to header
   - Add flash prevention script

5. **Dev Console**
   - Create `DevConsole` component
   - Integrate with session state/transcript
   - Add keyboard shortcut toggle

6. **Polish**
   - Mobile shadow pulse indicator
   - Responsive adjustments
   - Test light/dark modes

## Acceptance Criteria

### Design System
- [ ] All colors use CSS variables, no hardcoded hex values in components
- [ ] Theme can be toggled between light and dark
- [ ] Theme persists across page refreshes
- [ ] No theme flash on page load

### Animations
- [ ] Avatar ripples only visible when AI is speaking
- [ ] Avatar pulse only active when AI is speaking
- [ ] Waveform shows idle state (short gray bars) when user is not speaking
- [ ] Waveform shows active state (tall colored bars) when user is speaking
- [ ] Page elements fade up on load with staggered timing

### Typography
- [ ] Geist font loads and renders correctly
- [ ] Timer displays in monospace for stable width

### Dev Mode
- [ ] Debug console visible in development only
- [ ] Shows current state, block number, elapsed time
- [ ] Shows real-time transcript with speaker labels
- [ ] Collapsible via button or `Ctrl+D`
- [ ] Auto-scrolls to latest, pauses on hover

### Mobile
- [ ] Mic button has shadow pulse when speaking (mobile only)
- [ ] Waveform hidden on mobile
- [ ] Timer hidden on mobile
- [ ] Touch targets are 44px minimum

## Visual Reference

See `docs/todo/layout2.html` for the complete reference implementation with:
- Working theme toggle
- Demo toggle for idle/active states
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

- [Reference Design](./layout2.html) - Static HTML mockup
- [Current Implementation](../../src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx)
- [Tailwind Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)
- [Geist Font](https://vercel.com/font)
