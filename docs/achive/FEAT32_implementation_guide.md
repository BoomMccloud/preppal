# Implementation Guide: Interview Session UI Reskin (FEAT32)

**Based on Spec**: `docs/todo/FEAT32_reskin.md`
**Verification Report**: `docs/todo/FEAT32_reskin_verification_report.md`
**Generated**: 2025-12-30
**Estimated Total Time**: 4-6 hours

---

## Overview

### What You're Building

You're reskinning the interview session UI to add a progress ring timer around the AI avatar, conditional animations that respond to AI state, page entrance animations, theme toggle support, and a developer console for debugging. The design system (CSS variables, colors) is already implemented - you're adding visual features on top of it.

### Core Concept (The "North Star")

**"Animations Indicate State, Not Decorations."** In this design, animations should only run when they communicate something meaningful. The avatar pulse and ripples only animate when the AI is speaking. The progress ring shows time remaining and changes color to warn users. This prevents visual fatigue and makes feedback purposeful.

**"The Progress Ring is the Timer."** Instead of a separate timer display, the progress ring wrapping the avatar shows remaining time. It starts full (accent color), depletes as time passes, changes to warning (amber) at 40%, critical (red pulsing) at 10%, and shows "Time Up" when expired.

### Deliverables

After completing this guide, you will have:

- [ ] Missing animations added to `globals.css` (fade-up, pulse-ring-danger, progress-ring)
- [ ] Theme flash prevention script in root layout
- [ ] `SessionContentProd.tsx` refactored with progress ring timer and conditional animations
- [ ] `DevConsole.tsx` component for development debugging
- [ ] All animations conditional on `isAiSpeaking` state

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `src/styles/globals.css` | Modify | Add fade-up, pulse-ring-danger animations |
| `src/app/layout.tsx` | Modify | Add theme flash prevention script |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx` | Modify | Add progress ring, conditional animations, theme toggle |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/components/DevConsole.tsx` | Create | Debug console showing transcript and state |

### Out of Scope - DO NOT MODIFY

These files/areas are **not part of this task**:

- `tailwind.config.ts` - This project uses Tailwind v4 with `@theme` in CSS, not the config file
- `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts` - State logic is separate
- `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts` - Types already have what we need
- `src/app/_components/ThemeToggle.tsx` - Already exists, we'll import it

If you think something outside this scope needs changing, **stop and ask**.

---

## Prerequisites

### 1. Environment Setup

```bash
# Verify you're in the project root
pwd
# Should output: /path/to/preppal

# Install dependencies
pnpm install

# Verify the project builds
pnpm check
```

### 2. Verify Tests Pass

```bash
pnpm test
```

All tests should pass before you start. If tests fail, **stop and report the issue**.

### 3. Create Your Branch

```bash
git checkout feat/interview-templates
git pull origin feat/interview-templates
```

---

## Phase 1: CSS Foundation (Est. 20 mins)

### [ ] Step 1.1: Add Missing Animations to globals.css

#### Goal

Add the fade-up entrance animation, pulse-ring-danger animation, and progress-ring transition class that the mockup uses but aren't in the codebase yet.

#### File

`src/styles/globals.css`

#### Find This Location

Open the file and navigate to **line 70**. You should see the end of the `.animate-pulse-soft` rule:

```css
/* Line 68 */
.animate-pulse-soft {
/* Line 69 */
  animation: pulse-soft 3s infinite ease-in-out;
/* Line 70 */
}
```

#### Action: Add New Code

Insert the following at **line 72** (after the closing brace of `.animate-pulse-soft`):

```css
/* Page entrance animation - elements fade up on load */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation: fade-up 0.5s ease-out backwards;
}

.animate-fade-up-delay-1 {
  animation: fade-up 0.5s ease-out 0.1s backwards;
}

.animate-fade-up-delay-2 {
  animation: fade-up 0.5s ease-out 0.2s backwards;
}

/* Pulsing ring for critical timer state (last 10% of time) */
@keyframes pulse-ring-danger {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-ring-danger {
  animation: pulse-ring-danger 1s infinite;
}

/* Progress ring smooth transition for timer */
.progress-ring {
  transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
}
```

#### Common Mistakes

**Mistake 1: Placing animations outside `@theme` block incorrectly**
```css
/* CORRECT - Animations go AFTER the @theme block, not inside it */
@theme {
  /* colors go here */
}

/* Animations go here, outside @theme */
@keyframes fade-up { ... }
```

**Mistake 2: Using `animation-delay` instead of the `backwards` fill mode**
```css
/* WRONG - element is visible before animation starts */
.animate-fade-up-delay-1 {
  animation: fade-up 0.5s ease-out;
  animation-delay: 0.1s;
}

/* CORRECT - backwards ensures element starts invisible */
.animate-fade-up-delay-1 {
  animation: fade-up 0.5s ease-out 0.1s backwards;
}
```

#### Verification Gate

```bash
pnpm check
```

No CSS-related errors should appear. The build should succeed.

---

## Phase 2: Theme Flash Prevention (Est. 10 mins)

### [ ] Step 2.1: Add Theme Flash Prevention Script

#### Goal

Add an inline script to the `<head>` that reads the saved theme from localStorage before React hydrates, preventing a flash of the wrong theme on page load.

#### File

`src/app/layout.tsx`

#### Find This Location

Open the file and navigate to **line 22-28**. You should see:

```typescript
// Line 22
  return (
// Line 23
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
// Line 24
      <body>
// Line 25
        <TRPCReactProvider>{children}</TRPCReactProvider>
// Line 26
      </body>
// Line 27
    </html>
// Line 28
  );
```

#### Action: Add head Element with Script

**Current (Lines 23-26):**
```typescript
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
```

**Replace With:**
```typescript
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') ||
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
```

#### Common Mistakes

**Mistake 1: Using `<script>` tag directly without dangerouslySetInnerHTML**
```tsx
/* WRONG - JSX doesn't allow inline script content */
<head>
  <script>
    const theme = localStorage.getItem('theme');
  </script>
</head>

/* CORRECT - Use dangerouslySetInnerHTML for inline scripts */
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `const theme = localStorage.getItem('theme');`,
    }}
  />
</head>
```

**Mistake 2: Forgetting the try-catch**

The script runs before any error boundaries. If localStorage is blocked (private browsing), it would crash silently. Always wrap in try-catch.

**Mistake 3: Putting the script in `<body>` instead of `<head>`**

The script must run before any content renders. Placing it in `<body>` defeats the purpose - the page will flash.

#### Verification Gate

```bash
pnpm check
```

Build should succeed. To manually verify:
1. Run `pnpm dev`
2. Open the app, toggle to dark mode, refresh - no flash should occur

---

## Phase 3: Refactor SessionContentProd (Est. 2-3 hours)

This is the main implementation work. We'll refactor in stages.

### [ ] Step 3.1: Add Timer State Logic

#### Goal

Add the pure function `getTimerState()` that determines what state the timer is in based on elapsed time and limit. This is a pure function with no React dependencies, making it easy to test.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

#### Find This Location

Navigate to **line 53**. You should see the end of the `formatTime` function:

```typescript
// Line 49
  const formatTime = (seconds: number): string => {
// Line 50
    const mins = Math.floor(seconds / 60);
// Line 51
    const secs = seconds % 60;
// Line 52
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
// Line 53
  };
```

#### Action: Add New Code

Insert the following at **line 55** (after the `formatTime` function):

```typescript
  // Timer state calculation - pure function for testability
  type TimerState = "normal" | "warning" | "critical" | "expired";

  const getTimerState = (elapsed: number, limit: number): TimerState => {
    if (limit === 0) return "normal"; // No time limit
    const remaining = limit - elapsed;
    if (remaining <= 0) return "expired";
    const pct = remaining / limit;
    return pct <= 0.1 ? "critical" : pct <= 0.4 ? "warning" : "normal";
  };
```

#### Common Mistakes

**Mistake 1: Using `<=` vs `<` at boundaries**
```typescript
/* Current implementation uses <= which means:
   - At exactly 40% remaining -> "warning"
   - At exactly 10% remaining -> "critical"
   - At exactly 0% remaining -> "expired"

   This is intentional. Don't change to < */
```

**Mistake 2: Forgetting the limit === 0 check**
```typescript
/* WRONG - Division by zero when no time limit */
const pct = remaining / limit; // Crashes if limit is 0

/* CORRECT - Early return for no-limit case */
if (limit === 0) return "normal";
```

#### Verification Gate

This is just adding a function. Type check should pass:

```bash
pnpm check
```

---

### [ ] Step 3.2: Add ThemeToggle Import

#### Goal

Import the existing ThemeToggle component so we can add it to the header.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

#### Find This Location

Navigate to **line 8-11**. You should see the imports:

```typescript
// Line 8
import { useEffect, useRef, type Dispatch } from "react";
// Line 9
import { useRouter } from "~/i18n/navigation";
// Line 10
import { useTranslations } from "next-intl";
// Line 11
import type { SessionState, SessionEvent } from "./types";
```

#### Action: Add Import

Insert at **line 12**:

```typescript
import ThemeToggle from "~/app/_components/ThemeToggle";
```

#### Common Mistakes

**Mistake 1: Wrong import path**
```typescript
/* WRONG - relative path that doesn't work */
import ThemeToggle from "../../../../../_components/ThemeToggle";

/* CORRECT - use the ~ alias */
import ThemeToggle from "~/app/_components/ThemeToggle";
```

**Mistake 2: Named import instead of default**
```typescript
/* WRONG - ThemeToggle uses default export */
import { ThemeToggle } from "~/app/_components/ThemeToggle";

/* CORRECT */
import ThemeToggle from "~/app/_components/ThemeToggle";
```

---

### [ ] Step 3.3: Add MicOffIcon for Expired State

#### Goal

Add the MicOff icon SVG that will be shown when the timer expires.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

#### Find This Location

Navigate to **line 324-335**. You should see the `WaveformIcon` function:

```typescript
// Line 324
function WaveformIcon({ className }: { className?: string }) {
// ...
// Line 335
}
```

#### Action: Add New Code

Insert the following at **line 337** (after the `WaveformIcon` function):

```typescript
function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 11c0 1.19-.34 2.3-.9 3.28l-1.23-1.23c.27-.62.43-1.31.43-2.05H19zm-4.02.22c0-.03.02-.06.02-.09V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.17l5.98 5.98v.07zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9l4.19 4.18L21 19.73 4.27 3z" />
    </svg>
  );
}
```

---

### [ ] Step 3.4: Refactor Header with Block Progress and Theme Toggle

#### Goal

Replace the timer in the header with block progress indicator and add the theme toggle button.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

#### Find This Location

Navigate to **lines 123-140**. You should see the header controls section:

```typescript
// Line 123
        <div className="flex items-center gap-4">
// Line 124
          {/* Back to Dev button (only in dev preview mode) */}
// Line 125
          {onToggleDevView && (
// ...
// Line 132
          )}
// Line 133
          {/* Timer */}
// Line 134
          <div className="bg-secondary hidden items-center gap-2 rounded-lg px-3 py-1.5 md:flex">
// Line 135
            <TimerIcon className="text-secondary-text size-4" />
// Line 136
            <span className="text-primary-text font-mono text-sm">
// Line 137
              {formatTime(elapsedTime)}
// Line 138
            </span>
// Line 139
          </div>
// Line 140
        </div>
```

#### Action: Replace Block

**Current (Lines 123-140):**
```typescript
        <div className="flex items-center gap-4">
          {/* Back to Dev button (only in dev preview mode) */}
          {onToggleDevView && (
            <button
              onClick={onToggleDevView}
              className="bg-warning hover:bg-warning/80 rounded px-3 py-1.5 text-xs font-medium text-black"
            >
              Back to Dev
            </button>
          )}
          {/* Timer */}
          <div className="bg-secondary hidden items-center gap-2 rounded-lg px-3 py-1.5 md:flex">
            <TimerIcon className="text-secondary-text size-4" />
            <span className="text-primary-text font-mono text-sm">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>
```

**Replace With:**
```typescript
        <div className="flex items-center gap-3">
          {/* Back to Dev button (only in dev preview mode) */}
          {onToggleDevView && (
            <button
              onClick={onToggleDevView}
              className="bg-warning hover:bg-warning/80 rounded px-3 py-1.5 text-xs font-medium text-black"
            >
              Back to Dev
            </button>
          )}
          {/* Block Progress */}
          <div className="bg-secondary hidden items-center gap-2 rounded-lg border border-white/5 px-3 py-1.5 md:flex">
            <LayersIcon className="text-secondary-text size-4" />
            <span className="text-primary-text text-sm font-medium">
              Block {state.status === "ANSWERING" ? state.blockIndex + 1 : 1}/3
            </span>
          </div>
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
```

#### Add LayersIcon

You need to add the LayersIcon. Insert it after the `MicOffIcon` function you added in Step 3.3:

```typescript
function LayersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z" />
    </svg>
  );
}
```

#### Common Mistakes

**Mistake 1: Accessing blockIndex on wrong state**
```typescript
/* WRONG - blockIndex doesn't exist on all states */
<span>Block {state.blockIndex + 1}/3</span>

/* CORRECT - Check state.status first */
<span>Block {state.status === "ANSWERING" ? state.blockIndex + 1 : 1}/3</span>
```

---

### [ ] Step 3.5: Refactor Avatar with Progress Ring and Conditional Animations

#### Goal

Replace the always-animating avatar with a progress ring timer that wraps the avatar, and make animations conditional on `isAiSpeaking`.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

#### Find This Location

Navigate to **lines 151-176**. You should see the AI Avatar section:

```typescript
// Line 151
            {/* AI Avatar with ripple */}
// Line 152
            <div className="relative z-10 flex flex-col items-center justify-center">
// Line 153
              {/* Ripple rings */}
// Line 154
              <div className="absolute flex items-center justify-center">
// ...
// Line 176
            </div>
```

This is the main section to replace.

#### Action: Replace Block

**Current (Lines 151-176):**
```typescript
            {/* AI Avatar with ripple */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {/* Ripple rings */}
              <div className="absolute flex items-center justify-center">
                <div
                  className="animate-ripple border-accent/30 size-32 rounded-full border"
                  style={{ animationDelay: "0s" }}
                />
                <div
                  className="animate-ripple border-accent/20 absolute size-32 rounded-full border"
                  style={{ animationDelay: "0.6s" }}
                />
                <div
                  className="animate-ripple border-accent/10 absolute size-32 rounded-full border"
                  style={{ animationDelay: "1.2s" }}
                />
              </div>
              {/* Avatar circle */}
              <div className="animate-pulse-soft bg-secondary relative z-20 flex size-32 items-center justify-center rounded-full shadow-2xl ring-4 ring-black">
                <SmartToyIcon className="text-secondary-text size-16" />
                {/* Online indicator */}
                <div className="absolute right-1 bottom-1 flex size-7 items-center justify-center rounded-full bg-black">
                  <div className="bg-success size-4 rounded-full border-2 border-black" />
                </div>
              </div>
            </div>
```

**Replace With:**
```typescript
            {/* AI Avatar with Progress Ring Timer */}
            <div className="relative z-10 flex size-40 items-center justify-center">
              {/* Ripple rings - only visible when AI is speaking */}
              {isAiSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="animate-ripple border-accent/40 size-40 rounded-full border"
                    style={{ animationDelay: "0s" }}
                  />
                  <div
                    className="animate-ripple border-accent/25 absolute size-40 rounded-full border"
                    style={{ animationDelay: "0.6s" }}
                  />
                  <div
                    className="animate-ripple border-accent/15 absolute size-40 rounded-full border"
                    style={{ animationDelay: "1.2s" }}
                  />
                </div>
              )}

              {/* Progress Ring SVG */}
              <ProgressRingSVG
                timerState={timerState}
                progressOffset={progressOffset}
              />

              {/* Avatar Content - changes based on timer state */}
              <AvatarContent
                timerState={timerState}
                isAiSpeaking={isAiSpeaking}
                countdown={countdown}
              />
            </div>
```

#### Add Supporting Variables

Before the `return` statement (around line 60), add these calculations:

```typescript
  // Timer state and progress calculations
  // TODO: Get answerTimeLimit from context when available, defaulting to 120 for now
  const answerTimeLimit = 120; // seconds
  const timerState = getTimerState(elapsedTime, answerTimeLimit);

  // Progress ring calculations
  const circumference = 2 * Math.PI * 46; // ~289
  const remaining = answerTimeLimit - elapsedTime;
  const percentRemaining = answerTimeLimit > 0 ? remaining / answerTimeLimit : 1;
  const progressOffset = circumference * (1 - Math.max(0, percentRemaining));

  // Countdown for critical state (last 10 seconds)
  const countdown = Math.max(0, Math.ceil(remaining));
```

#### Add ProgressRingSVG Component

Add this after the icons at the bottom of the file:

```typescript
function ProgressRingSVG({
  timerState,
  progressOffset,
}: {
  timerState: "normal" | "warning" | "critical" | "expired";
  progressOffset: number;
}) {
  const ringColorClass = {
    normal: "text-accent",
    warning: "text-warning",
    critical: "text-danger animate-pulse-ring-danger",
    expired: "text-secondary-text",
  }[timerState];

  return (
    <svg
      className="absolute inset-0 size-40 -rotate-90"
      viewBox="0 0 100 100"
    >
      {/* Background ring */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-secondary-text/20"
      />
      {/* Progress ring */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="289"
        strokeDashoffset={progressOffset}
        className={`progress-ring ${ringColorClass}`}
      />
    </svg>
  );
}
```

#### Add AvatarContent Component

Add this after ProgressRingSVG:

```typescript
function AvatarContent({
  timerState,
  isAiSpeaking,
  countdown,
}: {
  timerState: "normal" | "warning" | "critical" | "expired";
  isAiSpeaking: boolean;
  countdown: number;
}) {
  // Critical state - show countdown number
  if (timerState === "critical") {
    return (
      <div className="z-20 flex size-32 items-center justify-center rounded-full bg-danger/10 ring-4 ring-danger/30">
        <span className="text-danger tabular-nums text-5xl font-bold">
          {countdown}
        </span>
      </div>
    );
  }

  // Expired state - show "Time Up" message
  if (timerState === "expired") {
    return (
      <div className="z-20 flex size-32 flex-col items-center justify-center rounded-full bg-secondary-text/10 ring-4 ring-secondary-text/30">
        <MicOffIcon className="text-secondary-text size-10" />
        <span className="text-secondary-text mt-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Time Up
        </span>
      </div>
    );
  }

  // Normal/Warning state - show AI avatar
  return (
    <div
      className={`bg-secondary relative z-20 flex size-32 items-center justify-center rounded-full shadow-2xl ring-4 ring-black ${
        isAiSpeaking ? "animate-pulse-soft" : ""
      }`}
    >
      <SmartToyIcon className="text-secondary-text size-16" />
      {/* Online indicator */}
      <div className="absolute right-1 bottom-1 flex size-7 items-center justify-center rounded-full bg-black">
        <div className="bg-success size-4 rounded-full border-2 border-black" />
      </div>
    </div>
  );
}
```

#### Common Mistakes

**Mistake 1: Forgetting the z-20 on avatar content**
```tsx
/* WRONG - Avatar appears behind the progress ring */
<div className="flex size-32 ...">

/* CORRECT - z-20 ensures avatar is above the ring */
<div className="z-20 flex size-32 ...">
```

**Mistake 2: Wrong SVG rotation**
```tsx
/* WRONG - Progress starts from the right side */
<svg className="absolute inset-0 size-40" viewBox="0 0 100 100">

/* CORRECT - Rotate -90deg so progress starts from top */
<svg className="absolute inset-0 size-40 -rotate-90" viewBox="0 0 100 100">
```

**Mistake 3: Wrong strokeDasharray value**
```tsx
/* The circumference must match: 2 * PI * radius */
/* radius = 46, so circumference = 2 * 3.14159 * 46 = ~289 */
strokeDasharray="289"
```

---

### [ ] Step 3.6: Update Mic Button Color Based on Timer State

#### Goal

Make the mic button color change to match the timer state (accent -> warning -> danger -> gray).

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

#### Find This Location

Navigate to the mic button section (around **line 215-220**). You should see:

```typescript
              {/* Mic button */}
              <button className="group flex flex-col items-center gap-1">
                <div className="bg-secondary hover:bg-secondary/80 relative flex size-14 items-center justify-center rounded-full text-white ring-1 ring-white/10 transition-all">
                  <MicIcon className="size-6 transition-transform group-hover:scale-110" />
```

#### Action: Replace Block

**Current:**
```typescript
              {/* Mic button */}
              <button className="group flex flex-col items-center gap-1">
                <div className="bg-secondary hover:bg-secondary/80 relative flex size-14 items-center justify-center rounded-full text-white ring-1 ring-white/10 transition-all">
                  <MicIcon className="size-6 transition-transform group-hover:scale-110" />
                  <span className="border-accent/50 absolute inset-0 animate-ping rounded-full border opacity-30" />
                </div>
              </button>
```

**Replace With:**
```typescript
              {/* Mic button - color changes with timer state */}
              <button className="group flex flex-col items-center gap-1">
                <div
                  className={`relative flex size-14 items-center justify-center rounded-full text-white ring-1 ring-white/10 transition-all ${
                    timerState === "expired"
                      ? "bg-secondary-text"
                      : timerState === "critical"
                        ? "bg-danger shadow-danger/20 shadow-lg"
                        : timerState === "warning"
                          ? "bg-warning shadow-warning/20 shadow-lg"
                          : "bg-accent shadow-accent/20 shadow-lg"
                  }`}
                >
                  {timerState === "expired" ? (
                    <MicOffIcon className="size-6" />
                  ) : (
                    <MicIcon className="size-6 transition-transform group-hover:scale-110" />
                  )}
                </div>
              </button>
```

#### Common Mistakes

**Mistake 1: Using ternary chain incorrectly**
```typescript
/* WRONG - This doesn't work as expected */
timerState === "expired" ? "bg-secondary-text"
  : timerState === "critical" ? "bg-danger"
  : "bg-accent"  // Missing warning case!

/* CORRECT - All states handled */
timerState === "expired"
  ? "bg-secondary-text"
  : timerState === "critical"
    ? "bg-danger ..."
    : timerState === "warning"
      ? "bg-warning ..."
      : "bg-accent ..."
```

---

### [ ] Step 3.7: Add Page Load Animations

#### Goal

Add entrance animations to header, main content, and control bar.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

#### Find This Location

Navigate to **line 105** where the header starts:

```typescript
      {/* Header */}
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-black/20 bg-black/95 px-6 py-3 backdrop-blur-sm">
```

#### Action: Add Animation Classes

Add `animate-fade-up` to the header:

```typescript
      <header className="animate-fade-up z-10 flex shrink-0 items-center justify-between border-b border-black/20 bg-black/95 px-6 py-3 backdrop-blur-sm">
```

Find the main content div (around line 145):
```typescript
        <div className="relative flex flex-1 flex-col items-center justify-center bg-black p-4">
```

Change to:
```typescript
        <div className="animate-fade-up-delay-1 relative flex flex-1 flex-col items-center justify-center bg-black p-4">
```

Find the control bar (around line 212):
```typescript
          <div className="absolute right-0 bottom-8 left-0 z-30 flex justify-center px-4">
```

Change to:
```typescript
          <div className="animate-fade-up-delay-2 absolute right-0 bottom-8 left-0 z-30 flex justify-center px-4">
```

---

### [ ] Step 3.8: Verification Gate for Phase 3

```bash
pnpm check
pnpm test src/test/unit/BlockSession.test.tsx
```

All tests should pass. The type checker should not report any errors.

---

## Phase 4: Create DevConsole Component (Est. 45 mins)

### [ ] Step 4.1: Create DevConsole.tsx

#### Goal

Create a collapsible debug panel that shows session state and transcript in development mode.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/components/DevConsole.tsx` (NEW FILE)

#### Action: Create File

First, create the `components` directory if it doesn't exist:

```bash
mkdir -p src/app/[locale]/\(interview\)/interview/\[interviewId\]/session/components
```

Then create the file with this content:

```typescript
/**
 * DevConsole - Development-only debug panel for interview session
 * Shows real-time transcript, session state, and timing info
 * Toggle with Ctrl+D or the collapse button
 */
"use client";

import { useState, useEffect, useRef } from "react";
import type { SessionState, TranscriptEntry } from "../types";

interface DevConsoleProps {
  state: SessionState;
}

export function DevConsole({ state }: DevConsoleProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+D to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-scroll to bottom when new transcript entries arrive
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.transcript, isPaused]);

  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getBlockInfo = (): string => {
    if (state.status === "ANSWERING") {
      return `Block ${state.blockIndex + 1}`;
    }
    if (state.status === "BLOCK_COMPLETE_SCREEN") {
      return `Completed Block ${state.completedBlockIndex + 1}`;
    }
    return "N/A";
  };

  return (
    <div
      className={`fixed right-4 bottom-4 z-50 w-96 rounded-lg border border-white/10 bg-black/95 shadow-2xl backdrop-blur-md transition-all ${
        isCollapsed ? "h-10" : "h-80"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">Dev Console</span>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
            DEV
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">Ctrl+D</span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex size-6 items-center justify-center rounded hover:bg-white/10"
          >
            <span className="text-white">{isCollapsed ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* State Bar */}
          <div className="flex items-center gap-4 border-b border-white/10 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">State:</span>
              <span className="font-mono font-medium text-cyan-400">
                {state.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Block:</span>
              <span className="font-mono text-white">{getBlockInfo()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Time:</span>
              <span className="font-mono text-white">
                {formatTime(state.elapsedTime)}
              </span>
            </div>
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            className="h-52 overflow-y-auto p-2"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {state.transcript.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500">
                No transcript yet...
              </p>
            ) : (
              <div className="space-y-1">
                {state.transcript.map((entry, i) => (
                  <TranscriptLine key={i} entry={entry} />
                ))}
                {/* Pending user text */}
                {state.pendingUser && (
                  <TranscriptLine
                    entry={{
                      speaker: "USER",
                      text: state.pendingUser,
                      is_final: false,
                    }}
                  />
                )}
                {/* Pending AI text */}
                {state.pendingAI && (
                  <TranscriptLine
                    entry={{
                      speaker: "AI",
                      text: state.pendingAI,
                      is_final: false,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  const isAI = entry.speaker === "AI";
  const isPending = !entry.is_final;

  return (
    <div
      className={`flex gap-2 rounded px-2 py-1 text-xs ${
        isPending ? "opacity-50" : ""
      }`}
    >
      <span
        className={`shrink-0 font-mono font-semibold ${
          isAI ? "text-cyan-400" : "text-green-400"
        }`}
      >
        [{isAI ? "AI" : "USER"}]
      </span>
      <span className="text-gray-200">{entry.text}</span>
    </div>
  );
}
```

#### Common Mistakes

**Mistake 1: Forgetting to clean up the event listener**
```typescript
/* WRONG - Memory leak! */
useEffect(() => {
  window.addEventListener("keydown", handleKeyDown);
}, []);

/* CORRECT - Return cleanup function */
useEffect(() => {
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

**Mistake 2: Not checking NODE_ENV**
```typescript
/* WRONG - Console shows in production */
export function DevConsole({ state }: DevConsoleProps) {
  return <div>...</div>;
}

/* CORRECT - Early return in production */
export function DevConsole({ state }: DevConsoleProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  return <div>...</div>;
}
```

---

### [ ] Step 4.2: Import DevConsole in SessionContentProd

#### Goal

Import and render the DevConsole component in the production session UI.

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

#### Find This Location

At the imports section (around **line 12**), after the ThemeToggle import.

#### Action: Add Import

```typescript
import { DevConsole } from "./components/DevConsole";
```

#### Find the Return Statement

At the end of the live interview state return, before the closing `</div>` of the root element (around **line 266**):

```typescript
      </main>
    </div>
  );
```

#### Action: Add DevConsole

```typescript
      </main>

      {/* Dev Console - only visible in development */}
      <DevConsole state={state} />
    </div>
  );
```

---

### [ ] Step 4.3: Verification Gate for Phase 4

```bash
pnpm check
pnpm test
```

All tests should pass.

---

## Acceptance Criteria

Implementation is complete when:

### Tests (Regression)
- [ ] `pnpm test src/test/unit/BlockSession.test.tsx` passes
- [ ] `pnpm test src/test/unit/session-reducer.test.ts` passes
- [ ] `pnpm test` (full suite) passes

### Technical Gates
- [ ] `pnpm check` passes (no TypeScript errors)
- [ ] `pnpm format` produces no changes

### Manual Verification
- [ ] All items in "Final Success Criteria" section verified

---

## Final Success Criteria

Before submitting your PR, verify the following:

- [ ] **Animations**: Avatar ripples only animate when `isAiSpeaking` is true
- [ ] **Animations**: Avatar pulse only animates when `isAiSpeaking` is true
- [ ] **Progress Ring**: Ring displays around avatar and depletes as time passes
- [ ] **Progress Ring**: Ring color changes: accent (normal) -> warning (40%) -> danger (10%)
- [ ] **Progress Ring**: Ring pulses in critical state
- [ ] **Avatar**: Shows countdown number in critical state (last 10%)
- [ ] **Avatar**: Shows "Time Up" with mic-off icon when expired
- [ ] **Mic Button**: Color matches timer state
- [ ] **Header**: Shows block progress instead of timer
- [ ] **Header**: Theme toggle button works
- [ ] **Theme**: No flash of wrong theme on page load
- [ ] **Dev Console**: Visible in development mode
- [ ] **Dev Console**: Toggles with Ctrl+D
- [ ] **Dev Console**: Shows transcript and state
- [ ] **Dev Console**: Hidden in production
- [ ] **Page Load**: Elements fade up with staggered timing
- [ ] **Technical**: `pnpm check` passes with zero errors
- [ ] **Technical**: `pnpm test` passes with all tests green

---

## Troubleshooting

### Error: "Cannot find module './components/DevConsole'"

**Cause**: Directory or file doesn't exist

**Fix**: Create the directory structure:
```bash
mkdir -p src/app/[locale]/\(interview\)/interview/\[interviewId\]/session/components
```

### Error: "Property 'blockIndex' does not exist on type 'SessionState'"

**Cause**: Accessing blockIndex without checking state.status first

**Fix**: Use type narrowing:
```typescript
// blockIndex only exists when status is "ANSWERING"
if (state.status === "ANSWERING") {
  console.log(state.blockIndex); // Now TypeScript knows this is valid
}
```

### Progress ring doesn't animate smoothly

**Cause**: Missing `.progress-ring` CSS class

**Fix**: Verify `globals.css` has:
```css
.progress-ring {
  transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
}
```

### Theme toggle has no effect

**Cause**: CSS variables not set up for dark mode

**Fix**: Verify `globals.css` has the `.dark` selector with overridden variables.

### Animations always run (not conditional)

**Cause**: Forgot to wrap in `{isAiSpeaking && ...}`

**Fix**: Check that ripples and pulse use conditional rendering:
```tsx
{isAiSpeaking && (
  <div className="animate-ripple ...">
)}
```

### DevConsole doesn't appear

**Cause**: Not in development mode

**Fix**: Ensure you're running `pnpm dev`, not a production build.

---

## Pre-Submission Checklist

Before creating your pull request:

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm check`
- [ ] Formatting is correct: `pnpm format`
- [ ] Only modified files listed in this guide
- [ ] No `console.log` statements in production code
- [ ] No commented-out code
- [ ] Commit messages are clear

### Files Changed

Verify your changes match this list:

| File | Status |
|------|--------|
| `src/styles/globals.css` | Modified |
| `src/app/layout.tsx` | Modified |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx` | Modified |
| `src/app/[locale]/(interview)/interview/[interviewId]/session/components/DevConsole.tsx` | Created |

Run `git status` to verify. If you modified other files, **undo those changes**.

---

## Getting Help

If you're stuck after:

1. Re-reading the step instructions
2. Checking "Common Mistakes"
3. Looking at "Troubleshooting"
4. Verifying line numbers (they may have shifted)

Then ask your mentor with:

- Which step you're on
- The exact error message (full text)
- What you've tried
- The relevant code snippet
