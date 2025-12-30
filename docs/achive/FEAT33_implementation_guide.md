# Implementation Guide: FEAT33 Theme Color Migration

**Based on Spec**: docs/feat33_theme_color_migration.md
**Verification Report**: docs/feat33_theme_color_migration-verification-report.md
**Generated**: 2025-12-30

---

## Overview

### What You're Building

Migrate all hardcoded Tailwind colors (like `text-red-500`, `bg-blue-600`) to semantic theme colors (like `text-danger`, `bg-info`). This ensures consistent dark mode support and allows brand colors to be changed from a single location.

### Core Concept (The "North Star")

**Theme colors are semantic, not visual.** Instead of saying "this text is red", we say "this text represents danger". The actual color value is defined once in `globals.css` and automatically adapts to light/dark mode.

### Deliverables

After completing this guide, you will have:

- [ ] Extended `globals.css` with `warning` and `info` theme colors
- [ ] Migrated 10 legacy files to use theme colors exclusively
- [ ] Updated `theme-colors.test.ts` to pass with empty `LEGACY_FILES` set
- [ ] All colors automatically adapt to dark mode

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `src/styles/globals.css` | Modify | Add `warning` and `info` color variables |
| `src/app/[locale]/(app)/dashboard/page.tsx` | Modify | Replace `red-*` with `danger` |
| `src/app/[locale]/(interview)/.../ShareButton.tsx` | Modify | Replace `red-500` with `danger` |
| `src/app/[locale]/signin/_components/OtpVerification.tsx` | Modify | Replace `red-500` with `danger` |
| `src/app/[locale]/signin/_components/SignInForm.tsx` | Modify | Replace `red-500` with `danger` |
| `src/app/[locale]/(interview)/.../session/page.tsx` | Modify | Replace `red-600` with `danger` |
| `src/app/_components/LanguageSwitcher.tsx` | Modify | Replace `blue-500` with `accent` |
| `src/app/_components/StatusIndicator.tsx` | Modify | Replace status colors with theme colors |
| `src/app/[locale]/(interview)/.../session/BlockSession.tsx` | Modify | Replace UI colors with theme colors |
| `src/app/[locale]/(interview)/.../session/SessionContentDev.tsx` | Modify | Replace all hardcoded colors |
| `src/app/[locale]/(interview)/.../session/SessionContentProd.tsx` | Modify | Replace `slate-*` with theme colors |
| `src/test/unit/theme-colors.test.ts` | Modify | Update ALLOWED_COLORS and empty LEGACY_FILES |

### Out of Scope - DO NOT MODIFY

- Any file not listed above
- Database or API changes
- Component logic or behavior

---

## Prerequisites

### 1. Environment Setup

```bash
# Verify you're in the correct directory
pwd
# Should output: /path/to/preppal

# Install dependencies
pnpm install
```

### 2. Verify Tests Pass

```bash
pnpm test src/test/unit/theme-colors.test.ts
```

The test will show 10 legacy files needing migration. This is expected.

### 3. Create Your Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/theme-color-migration
```

---

## Phase 1: Extend Theme (Est. 5 mins)

### [ ] Step 1.1: Add `warning` and `info` Colors to globals.css

#### Goal

Add two new semantic colors that the legacy files need: `warning` (for caution states) and `info` (for informational states like "connecting", "processing").

#### File

`src/styles/globals.css`

#### Find This Location

Open the file and navigate to **line 14**. You should see:

```css
/* Line 12 */  --color-accent: #0d9488; /* Light: Teal */
/* Line 13 */  --color-success: #16a34a; /* Light: Forest Green */
/* Line 14 */  --color-danger: #ef4444; /* Light: Coral Red */
/* Line 15 */}
```

#### Action: Add New Colors

Insert the following **after line 14** (before the closing `}`):

```css
  --color-warning: #f59e0b; /* Light: Amber - caution states */
  --color-info: #3b82f6; /* Light: Blue - informational states */
```

#### Find Dark Mode Section

Navigate to **line 25**. You should see:

```css
/* Line 23 */  --color-accent: #5eead4; /* Dark: Bright Teal */
/* Line 24 */  --color-success: #a7f3d0; /* Dark: Mint Green */
/* Line 25 */  --color-danger: #fda4af; /* Dark: Salmon Pink */
/* Line 26 */}
```

#### Action: Add Dark Mode Overrides

Insert the following **after line 25** (before the closing `}`):

```css
  --color-warning: #fbbf24; /* Dark: Brighter amber */
  --color-info: #60a5fa; /* Dark: Brighter blue */
```

#### Common Mistakes

**Mistake 1: Forgetting the semicolon**
```css
/* WRONG */
--color-warning: #f59e0b

/* CORRECT */
--color-warning: #f59e0b;
```

**Mistake 2: Wrong section**
```css
/* WRONG - Adding dark colors to @theme block */
@theme {
  --color-info: #60a5fa; /* This is the dark value! */
}

/* CORRECT - Light in @theme, dark in .dark */
@theme {
  --color-info: #3b82f6; /* Light value */
}
.dark {
  --color-info: #60a5fa; /* Dark value */
}
```

#### Verification Gate

```bash
pnpm check
```

No errors should appear. The new colors are now available as `text-warning`, `bg-info`, etc.

---

## Phase 2: Update Test File (Est. 5 mins)

### [ ] Step 2.1: Add New Colors to ALLOWED_COLORS

#### Goal

Tell the lint test that `warning` and `info` are now valid theme colors.

#### File

`src/test/unit/theme-colors.test.ts`

#### Find This Location

Navigate to **line 13-26**. You should see:

```typescript
// Line 12 // Allowed theme colors (from globals.css)
// Line 13 const ALLOWED_COLORS = [
// Line 14   "primary",
// ...
// Line 20   "danger",
// Line 21   "transparent",
// ...
// Line 26 ];
```

#### Action: Add New Colors

**Current (Lines 13-26):**
```typescript
const ALLOWED_COLORS = [
  "primary",
  "secondary",
  "primary-text",
  "secondary-text",
  "accent",
  "success",
  "danger",
  "transparent",
  "current",
  "inherit",
  "white",
  "black",
];
```

**Replace With:**
```typescript
const ALLOWED_COLORS = [
  "primary",
  "secondary",
  "primary-text",
  "secondary-text",
  "accent",
  "success",
  "danger",
  "warning",
  "info",
  "transparent",
  "current",
  "inherit",
  "white",
  "black",
];
```

#### Verification Gate

```bash
pnpm test src/test/unit/theme-colors.test.ts
```

Test should still show 10 legacy files (we haven't migrated them yet).

---

## Phase 3: Migrate Tier 1 Files (Est. 15 mins)

These files have simple replacements - just error colors.

### [ ] Step 3.1: Migrate dashboard/page.tsx

#### File

`src/app/[locale]/(app)/dashboard/page.tsx`

#### Find and Replace

| Line | Current | Replace With |
|------|---------|--------------|
| 66 | `text-red-500` | `text-danger` |
| 114 | `text-red-500 hover:text-red-700` | `text-danger hover:text-danger/70` |

#### Exact Changes

**Line 66 - Current:**
```tsx
{error && <p className="mb-4 text-red-500">{t("loadError")}</p>}
```

**Line 66 - Replace With:**
```tsx
{error && <p className="mb-4 text-danger">{t("loadError")}</p>}
```

**Line 114 - Current:**
```tsx
className="text-red-500 hover:text-red-700"
```

**Line 114 - Replace With:**
```tsx
className="text-danger hover:text-danger/70"
```

---

### [ ] Step 3.2: Migrate ShareButton.tsx

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/feedback/_components/ShareButton.tsx`

#### Find and Replace

| Line | Current | Replace With |
|------|---------|--------------|
| 60 | `text-red-500` | `text-danger` |

**Line 60 - Current:**
```tsx
<p className="text-red-500">{t("shareError")}</p>
```

**Line 60 - Replace With:**
```tsx
<p className="text-danger">{t("shareError")}</p>
```

---

### [ ] Step 3.3: Migrate OtpVerification.tsx

#### File

`src/app/[locale]/signin/_components/OtpVerification.tsx`

#### Find and Replace

| Line | Current | Replace With |
|------|---------|--------------|
| 159 | `text-red-500` | `text-danger` |

**Line 159 - Current:**
```tsx
{error && <p className="text-center text-sm text-red-500">{error}</p>}
```

**Line 159 - Replace With:**
```tsx
{error && <p className="text-center text-sm text-danger">{error}</p>}
```

---

### [ ] Step 3.4: Migrate SignInForm.tsx

#### File

`src/app/[locale]/signin/_components/SignInForm.tsx`

#### Find and Replace

| Line | Current | Replace With |
|------|---------|--------------|
| 156 | `text-red-500` | `text-danger` |

**Line 156 - Current:**
```tsx
{otpError && <p className="text-sm text-red-500">{otpError}</p>}
```

**Line 156 - Replace With:**
```tsx
{otpError && <p className="text-sm text-danger">{otpError}</p>}
```

---

### [ ] Step 3.5: Migrate session/page.tsx

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/page.tsx`

#### Find and Replace

| Line | Current | Replace With |
|------|---------|--------------|
| 150 | `text-red-600` | `text-danger` |
| 164 | `text-red-600` | `text-danger` |
| 175 | `text-red-600` | `text-danger` |

**Lines 150, 164, 175 - Current:**
```tsx
<div className="text-center text-red-600">
```

**Replace each with:**
```tsx
<div className="text-center text-danger">
```

---

### [ ] Step 3.6: Migrate LanguageSwitcher.tsx

#### File

`src/app/_components/LanguageSwitcher.tsx`

#### Find and Replace

| Line | Current | Replace With |
|------|---------|--------------|
| 34 | `focus:ring-blue-500` | `focus:ring-accent` |

**Line 34 - Current:**
```tsx
className="bg-secondary text-secondary-text hover:text-primary-text border-secondary-text/20 cursor-pointer appearance-none rounded-md border px-2 py-1 text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
```

**Line 34 - Replace With:**
```tsx
className="bg-secondary text-secondary-text hover:text-primary-text border-secondary-text/20 cursor-pointer appearance-none rounded-md border px-2 py-1 text-sm transition-colors focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50"
```

#### Verification Gate (Tier 1)

```bash
pnpm check
```

No TypeScript or lint errors should appear.

---

## Phase 4: Migrate Tier 2 Files (Est. 20 mins)

These files have multiple color types requiring the mapping table.

### [ ] Step 4.1: Migrate StatusIndicator.tsx

#### File

`src/app/_components/StatusIndicator.tsx`

#### Goal

Replace all hardcoded status colors with semantic theme colors.

#### Find This Location

Navigate to **lines 22-43**. You should see the `statusMap` object.

#### Action: Replace Entire statusMap

**Current (Lines 22-43):**
```typescript
const statusMap: Record<InterviewStatus, { text: string; className: string }> =
  {
    idle: { text: "Idle", className: "text-secondary-text" },
    initializing: { text: "Initializing...", className: "text-blue-500" },
    requestingPermissions: {
      text: "Requesting Permissions...",
      className: "text-blue-500",
    },
    permissionsDenied: {
      text: "Permissions Denied",
      className: "text-red-500",
    },
    connecting: { text: "Connecting...", className: "text-blue-500" },
    live: { text: "Live", className: "text-green-500" },
    reconnecting: { text: "Reconnecting...", className: "text-orange-500" },
    ending: { text: "Ending...", className: "text-secondary-text" },
    processingResults: { text: "Processing...", className: "text-purple-500" },
    resultsReady: { text: "Results Ready", className: "text-green-500" },
    error: { text: "Error", className: "text-red-500" },
    listening: { text: "Listening", className: "text-green-500" },
    speaking: { text: "Speaking", className: "text-blue-500" },
  };
```

**Replace With:**
```typescript
const statusMap: Record<InterviewStatus, { text: string; className: string }> =
  {
    idle: { text: "Idle", className: "text-secondary-text" },
    initializing: { text: "Initializing...", className: "text-info" },
    requestingPermissions: {
      text: "Requesting Permissions...",
      className: "text-info",
    },
    permissionsDenied: {
      text: "Permissions Denied",
      className: "text-danger",
    },
    connecting: { text: "Connecting...", className: "text-info" },
    live: { text: "Live", className: "text-success" },
    reconnecting: { text: "Reconnecting...", className: "text-warning" },
    ending: { text: "Ending...", className: "text-secondary-text" },
    processingResults: { text: "Processing...", className: "text-info" },
    resultsReady: { text: "Results Ready", className: "text-success" },
    error: { text: "Error", className: "text-danger" },
    listening: { text: "Listening", className: "text-success" },
    speaking: { text: "Speaking", className: "text-info" },
  };
```

#### Color Mapping Reference

| Original | Theme | Reason |
|----------|-------|--------|
| `blue-500` | `info` | Informational/processing states |
| `green-500` | `success` | Active/ready states |
| `red-500` | `danger` | Error states |
| `orange-500` | `warning` | Reconnecting/caution |
| `purple-500` | `info` | Consolidate processing with info |

---

### [ ] Step 4.2: Migrate BlockSession.tsx

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx`

This file has many colors. Apply these replacements:

| Line | Current | Replace With |
|------|---------|--------------|
| 70 | `bg-gray-50` | `bg-secondary` |
| 72 | `text-gray-900` | `text-primary-text` |
| 76 | `bg-blue-50` | `bg-info/10` |
| 77 | `text-blue-800` | `text-info` |
| 80 | `text-blue-600` | `text-info` |
| 90 | `text-gray-600` | `text-secondary-text` |
| 104 | `bg-blue-600 ... hover:bg-blue-700` | `bg-accent ... hover:bg-accent/90` |
| 143 | `border-gray-100 bg-white/90 ... text-gray-700` | `border-secondary/50 bg-primary/90 ... text-secondary-text` |
| 152 | `bg-orange-500` | `bg-warning` |
| 153 | `border-gray-100 bg-white/90 text-gray-900` | `border-secondary/50 bg-primary/90 text-primary-text` |
| 164 | `bg-red-500` | `bg-danger` |
| 165 | `border-gray-100 bg-white/90 text-gray-900` | `border-secondary/50 bg-primary/90 text-primary-text` |
| 178 | `border-yellow-400 bg-yellow-50` | `border-warning bg-warning/10` |
| 180 | `text-yellow-800` | `text-warning` |
| 183 | `text-yellow-700` | `text-warning` |
| 202 | `bg-gray-50` | `bg-secondary` |
| 204 | `text-gray-900` | `text-primary-text` |
| 207 | `text-gray-600` | `text-secondary-text` |

#### Full Replacement for Key Sections

**Lines 70-72 - Current:**
```tsx
<div className="flex min-h-screen items-center justify-center bg-gray-50">
  <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 text-center shadow-lg">
    <h2 className="text-2xl font-bold text-gray-900">
```

**Replace With:**
```tsx
<div className="flex min-h-screen items-center justify-center bg-secondary">
  <div className="w-full max-w-lg space-y-6 rounded-lg bg-primary p-8 text-center shadow-lg">
    <h2 className="text-2xl font-bold text-primary-text">
```

**Lines 76-80 - Current:**
```tsx
<div className="rounded-md bg-blue-50 p-4">
  <div className="mb-2 text-lg font-medium text-blue-800">
    {t("languageSwitchTitle")}
  </div>
  <p className="text-blue-600">
```

**Replace With:**
```tsx
<div className="rounded-md bg-info/10 p-4">
  <div className="mb-2 text-lg font-medium text-info">
    {t("languageSwitchTitle")}
  </div>
  <p className="text-info">
```

**Line 104 - Current:**
```tsx
className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
```

**Replace With:**
```tsx
className="rounded-full bg-accent px-8 py-3 font-semibold text-white transition-colors hover:bg-accent/90"
```

**Lines 150-154 (Block timer warning) - Current:**
```tsx
className={`rounded-full px-4 py-2 text-sm font-bold shadow-md backdrop-blur-sm transition-colors duration-300 ${
  blockTimeRemaining < 60
    ? "animate-pulse bg-orange-500 text-white"
    : "border border-gray-100 bg-white/90 text-gray-900"
}`}
```

**Replace With:**
```tsx
className={`rounded-full px-4 py-2 text-sm font-bold shadow-md backdrop-blur-sm transition-colors duration-300 ${
  blockTimeRemaining < 60
    ? "animate-pulse bg-warning text-white"
    : "border border-secondary/50 bg-primary/90 text-primary-text"
}`}
```

**Lines 162-166 (Answer timer warning) - Current:**
```tsx
className={`rounded-full px-4 py-2 text-sm font-bold shadow-md backdrop-blur-sm transition-colors duration-300 ${
  answerTimeRemaining < 30
    ? "animate-pulse bg-red-500 text-white"
    : "border border-gray-100 bg-white/90 text-gray-900"
}`}
```

**Replace With:**
```tsx
className={`rounded-full px-4 py-2 text-sm font-bold shadow-md backdrop-blur-sm transition-colors duration-300 ${
  answerTimeRemaining < 30
    ? "animate-pulse bg-danger text-white"
    : "border border-secondary/50 bg-primary/90 text-primary-text"
}`}
```

**Lines 178-183 (Time's up banner) - Current:**
```tsx
<div className="rounded-lg border border-yellow-400 bg-yellow-50 px-8 py-6 text-center shadow-xl">
  <div className="mb-2 text-3xl">⏱️</div>
  <h3 className="mb-1 text-xl font-bold text-yellow-800">
    {t("timesUpTitle")}
  </h3>
  <p className="text-yellow-700">{t("timesUpMessage")}</p>
```

**Replace With:**
```tsx
<div className="rounded-lg border border-warning bg-warning/10 px-8 py-6 text-center shadow-xl">
  <div className="mb-2 text-3xl">⏱️</div>
  <h3 className="mb-1 text-xl font-bold text-warning">
    {t("timesUpTitle")}
  </h3>
  <p className="text-warning">{t("timesUpMessage")}</p>
```

**Lines 201-207 (Interview complete) - Current:**
```tsx
return (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 text-center shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900">
        Interview Complete!
      </h2>
      <p className="text-gray-600">Redirecting to feedback...</p>
```

**Replace With:**
```tsx
return (
  <div className="flex min-h-screen items-center justify-center bg-secondary">
    <div className="w-full max-w-lg space-y-6 rounded-lg bg-primary p-8 text-center shadow-lg">
      <h2 className="text-2xl font-bold text-primary-text">
        Interview Complete!
      </h2>
      <p className="text-secondary-text">Redirecting to feedback...</p>
```

---

## Phase 5: Migrate Tier 3 Files (Est. 30 mins)

These files are the most complex with many hardcoded colors.

### [ ] Step 5.1: Migrate SessionContentDev.tsx

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev.tsx`

This file has extensive hardcoded colors. Apply the complete color mapping:

#### Loading State (Lines 118-128)

**Current:**
```tsx
<div
  data-testid="session-dev"
  className="flex h-screen items-center justify-center bg-gray-50"
>
  <div className="flex flex-col items-center gap-4">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    <div className="text-lg text-gray-600">{tCommon("loading")}</div>
```

**Replace With:**
```tsx
<div
  data-testid="session-dev"
  className="flex h-screen items-center justify-center bg-secondary"
>
  <div className="flex flex-col items-center gap-4">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-info border-t-transparent"></div>
    <div className="text-lg text-secondary-text">{tCommon("loading")}</div>
```

#### Error State (Lines 132-156)

**Current:**
```tsx
<div
  data-testid="session-dev"
  className="flex h-screen items-center justify-center bg-red-50"
>
  <div className="max-w-md space-y-6 rounded-xl bg-white p-8 text-center shadow-lg">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
      <span className="text-2xl">⚠️</span>
    </div>
    <h1 className="text-2xl font-bold text-red-700">
      {t("connectionError")}
    </h1>
    <div className="rounded bg-red-50 p-4 text-left font-mono text-sm text-red-800">
      {error ?? t("connectionLost")}
    </div>
    <button
      onClick={() => router.push("/dashboard")}
      className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700"
    >
```

**Replace With:**
```tsx
<div
  data-testid="session-dev"
  className="flex h-screen items-center justify-center bg-danger/5"
>
  <div className="max-w-md space-y-6 rounded-xl bg-primary p-8 text-center shadow-lg">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
      <span className="text-2xl">⚠️</span>
    </div>
    <h1 className="text-2xl font-bold text-danger">
      {t("connectionError")}
    </h1>
    <div className="rounded bg-danger/5 p-4 text-left font-mono text-sm text-danger">
      {error ?? t("connectionLost")}
    </div>
    <button
      onClick={() => router.push("/dashboard")}
      className="w-full rounded-lg bg-danger px-4 py-3 font-semibold text-white transition-colors hover:bg-danger/90"
    >
```

#### Main Content Area (Lines 162-287)

Apply these replacements throughout the main content:

| Pattern | Replace With |
|---------|--------------|
| `bg-gray-50` | `bg-secondary` |
| `bg-gray-800` | `bg-secondary` |
| `text-gray-800` | `text-primary-text` |
| `text-gray-700` | `text-primary-text` |
| `text-gray-600` | `text-secondary-text` |
| `text-gray-500` | `text-secondary-text` |
| `text-gray-400` | `text-secondary-text` |
| `bg-blue-100` | `bg-info/20` |
| `text-blue-800` | `text-info` |
| `bg-blue-500` | `bg-info` |
| `bg-blue-600` | `bg-info` |
| `text-blue-600` | `text-info` |
| `text-blue-400` | `text-info` |
| `text-blue-300` | `text-info` |
| `text-blue-100` | `text-info/70` |
| `border-blue-100` | `border-info/20` |
| `border-blue-400` | `border-info` |
| `bg-blue-50` | `bg-info/10` |
| `border-gray-100` | `border-secondary/50` |
| `text-red-600` | `text-danger` |
| `text-red-700` | `text-danger` |
| `bg-red-50` | `bg-danger/10` |
| `bg-red-100` | `bg-danger/20` |
| `hover:bg-red-100` | `hover:bg-danger/20` |
| `hover:text-red-700` | `hover:text-danger/80` |

#### Dev Panel (Lines 291-453)

The dev panel uses dark theme colors. Replace:

| Pattern | Replace With |
|---------|--------------|
| `bg-gray-950` | `bg-primary` (or keep for dark panel) |
| `bg-gray-900` | `bg-secondary` |
| `bg-gray-800` | `bg-secondary` |
| `border-gray-800` | `border-secondary` |
| `text-gray-300` | `text-secondary-text` |
| `text-gray-500` | `text-secondary-text` |
| `text-gray-600` | `text-secondary-text` |
| `text-gray-700` | `text-secondary-text` |
| `text-gray-400` | `text-secondary-text` |
| `bg-green-500` | `bg-success` |
| `bg-green-400` | `bg-success` |
| `text-green-400` | `text-success` |
| `text-green-300` | `text-success` |
| `bg-yellow-500` | `bg-warning` |
| `text-yellow-400` | `text-warning` |
| `text-yellow-500` | `text-warning` |
| `bg-yellow-600` | `bg-warning` |
| `hover:bg-yellow-500` | `hover:bg-warning/90` |
| `bg-orange-600` | `bg-warning` |
| `hover:bg-orange-500` | `hover:bg-warning/90` |
| `text-blue-300` | `text-info` |

---

### [ ] Step 5.2: Migrate SessionContentProd.tsx

#### File

`src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx`

This file uses `slate-*` colors extensively. Note that SessionContentProd already uses some theme colors (`bg-secondary`, `text-primary-text`, `bg-accent`, `text-danger`, `bg-success`). Focus on remaining hardcoded colors:

#### Main Container (Line 102)

**Current:**
```tsx
className="flex h-screen flex-col overflow-hidden bg-slate-900"
```

**Replace With:**
```tsx
className="flex h-screen flex-col overflow-hidden bg-primary"
```

#### Header (Line 105)

**Current:**
```tsx
className="z-10 flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-3 backdrop-blur-sm"
```

**Replace With:**
```tsx
className="z-10 flex shrink-0 items-center justify-between border-b border-secondary bg-primary/95 px-6 py-3 backdrop-blur-sm"
```

#### Status Text (Line 117)

**Current:**
```tsx
<span className="text-xs font-medium text-slate-400">
```

**Replace With:**
```tsx
<span className="text-xs font-medium text-secondary-text">
```

#### Back to Dev Button (Line 128)

**Current:**
```tsx
className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-yellow-400"
```

**Replace With:**
```tsx
className="rounded bg-warning px-3 py-1.5 text-xs font-medium text-black hover:bg-warning/90"
```

#### Timer Container (Lines 134-136)

**Current:**
```tsx
<div className="hidden items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 md:flex">
  <TimerIcon className="size-4 text-slate-400" />
  <span className="font-mono text-sm text-slate-200">
```

**Replace With:**
```tsx
<div className="hidden items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 md:flex">
  <TimerIcon className="size-4 text-secondary-text" />
  <span className="font-mono text-sm text-primary-text">
```

#### Video Container Background (Line 149)

**Current:**
```tsx
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/50 via-[#202124] to-[#202124]" />
```

**Replace With:**
```tsx
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/50 via-[#202124] to-[#202124]" />
```

#### Avatar Circle (Lines 169-170)

**Current:**
```tsx
<div className="animate-pulse-soft relative z-20 flex size-32 items-center justify-center rounded-full bg-slate-700 shadow-2xl ring-4 ring-[#202124]">
  <SmartToyIcon className="size-16 text-slate-300" />
```

**Replace With:**
```tsx
<div className="animate-pulse-soft relative z-20 flex size-32 items-center justify-center rounded-full bg-secondary shadow-2xl ring-4 ring-[#202124]">
  <SmartToyIcon className="size-16 text-secondary-text" />
```

#### Status Badge (Line 190)

**Current:**
```tsx
className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md"
```

**Replace With:**
```tsx
className="flex items-center gap-2 rounded-full border border-white/10 bg-primary/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md"
```

#### Control Bar (Lines 213-223)

**Current:**
```tsx
<div className="flex items-center gap-6 rounded-full border border-white/10 bg-slate-900/90 px-6 py-3 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
  {/* Mic button */}
  <button className="group flex flex-col items-center gap-1">
    <div className="relative flex size-14 items-center justify-center rounded-full bg-slate-700 text-white ring-1 ring-white/10 transition-all hover:bg-slate-600">
...
<div className="mx-2 hidden h-10 items-center gap-1.5 rounded-full border border-white/5 bg-slate-800/50 px-4 sm:flex">
```

**Replace With:**
```tsx
<div className="flex items-center gap-6 rounded-full border border-white/10 bg-primary/90 px-6 py-3 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
  {/* Mic button */}
  <button className="group flex flex-col items-center gap-1">
    <div className="relative flex size-14 items-center justify-center rounded-full bg-secondary text-white ring-1 ring-white/10 transition-all hover:bg-secondary/80">
...
<div className="mx-2 hidden h-10 items-center gap-1.5 rounded-full border border-white/5 bg-secondary/50 px-4 sm:flex">
```

---

## Phase 6: Update Test and Verify (Est. 10 mins)

### [ ] Step 6.1: Empty LEGACY_FILES Set

#### File

`src/test/unit/theme-colors.test.ts`

#### Find This Location

Navigate to **lines 45-56**:

```typescript
// Line 43 // Legacy files with known violations - to be cleaned up over time
// Line 44 // TODO: Remove files from this list as they're migrated to theme colors
// Line 45 const LEGACY_FILES = new Set([
// ...
// Line 56 ]);
```

#### Action: Empty the Set

**Current (Lines 45-56):**
```typescript
const LEGACY_FILES = new Set([
  "src/app/[locale]/(app)/dashboard/page.tsx",
  "src/app/[locale]/(interview)/interview/[interviewId]/feedback/_components/ShareButton.tsx",
  "src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx",
  "src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev.tsx",
  "src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx",
  "src/app/[locale]/(interview)/interview/[interviewId]/session/page.tsx",
  "src/app/[locale]/signin/_components/OtpVerification.tsx",
  "src/app/[locale]/signin/_components/SignInForm.tsx",
  "src/app/_components/LanguageSwitcher.tsx",
  "src/app/_components/StatusIndicator.tsx",
]);
```

**Replace With:**
```typescript
const LEGACY_FILES = new Set<string>([
  // All files migrated to theme colors!
]);
```

#### Verification Gate

```bash
pnpm test src/test/unit/theme-colors.test.ts
```

**Expected Output:**
```
 PASS  src/test/unit/theme-colors.test.ts
  Theme Colors
    ✓ should not use hardcoded Tailwind colors in app components
    ✓ tracks legacy files needing migration
    ✓ documents allowed theme colors

📊 Theme color migration progress:
   0 files still need migration
```

---

## Final Verification

### Run All Checks

```bash
pnpm format && pnpm check
```

**No errors should appear.**

### Run Full Test Suite

```bash
pnpm test
```

**All tests should pass.**

### Visual Verification

1. Start the dev server: `pnpm dev`
2. Open the app in browser
3. Toggle dark mode (if available) and verify:
   - Error messages appear in `danger` color
   - Success states appear in `success` color
   - Info/connecting states appear in `info` color
   - Warning states appear in `warning` color
4. All colors should adapt automatically to dark mode

---

## Troubleshooting

### Error: "Property 'warning' does not exist"

**Cause**: Tailwind hasn't picked up the new CSS variables.

**Fix**: Verify `globals.css` has `--color-warning` inside the `@theme` block (not outside).

### Error: Test still shows legacy files

**Cause**: A file still has hardcoded colors you missed.

**Fix**: Run the test and check the violation output:
```bash
pnpm test src/test/unit/theme-colors.test.ts
```

Look for lines like:
```
src/app/[locale]/.../file.tsx:42 - "blue-500" in: className="text-blue-500"
```

Fix that specific line.

### Colors don't change in dark mode

**Cause**: Using `text-[#3b82f6]` (arbitrary value) instead of `text-info` (theme variable).

**Fix**: Use the theme class names, not hex values:
```tsx
// WRONG
className="text-[#3b82f6]"

// CORRECT
className="text-info"
```

### Build error: "Unknown word"

**Cause**: Typo in color name like `text-infoo` or `bg-warnign`.

**Fix**: Check spelling matches exactly: `primary`, `secondary`, `primary-text`, `secondary-text`, `accent`, `success`, `danger`, `warning`, `info`.

---

## Pre-Submission Checklist

- [ ] `pnpm format && pnpm check` passes with no errors
- [ ] `pnpm test` passes with all tests green
- [ ] `theme-colors.test.ts` shows "0 files still need migration"
- [ ] Visually verified colors work in both light and dark mode
- [ ] Only modified files listed in this guide
- [ ] No `console.log` statements added
- [ ] Commit message is clear and descriptive

### Files Changed (Expected)

| File | Lines Changed |
|------|---------------|
| `src/styles/globals.css` | ~4 lines added |
| `src/test/unit/theme-colors.test.ts` | ~15 lines changed |
| `src/app/[locale]/(app)/dashboard/page.tsx` | 2 lines |
| `src/app/[locale]/(interview)/.../ShareButton.tsx` | 1 line |
| `src/app/[locale]/signin/_components/OtpVerification.tsx` | 1 line |
| `src/app/[locale]/signin/_components/SignInForm.tsx` | 1 line |
| `src/app/[locale]/(interview)/.../session/page.tsx` | 3 lines |
| `src/app/_components/LanguageSwitcher.tsx` | 1 line |
| `src/app/_components/StatusIndicator.tsx` | ~20 lines |
| `src/app/[locale]/(interview)/.../BlockSession.tsx` | ~30 lines |
| `src/app/[locale]/(interview)/.../SessionContentDev.tsx` | ~80 lines |
| `src/app/[locale]/(interview)/.../SessionContentProd.tsx` | ~25 lines |

---

## Getting Help

If stuck after checking:
1. Re-reading step instructions
2. Checking "Common Mistakes"
3. Looking at "Troubleshooting"
4. Verifying line numbers (they shift as you edit)

Then ask your mentor with:
- Which step you're on
- The exact error message (full text)
- What you've tried
- The relevant code snippet
