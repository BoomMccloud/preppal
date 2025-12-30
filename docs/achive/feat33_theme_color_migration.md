# FEAT33: Theme Color Migration

## Overview

Migrate all hardcoded Tailwind colors to theme-based CSS variables, ensuring consistent styling and proper dark mode support across the application.

## Problem Statement

The codebase has **two sources of truth** for colors:

1. `globals.css` defines 5 semantic colors (primary, secondary, accent, success, danger)
2. Individual files hardcode additional colors (blue-500, yellow-400, gray-300, etc.)

This causes:

- Inconsistent dark mode support
- Colors drifting between files
- No single place to update brand colors
- Test failures in `theme-colors.test.ts`

## Current Theme (globals.css)

| Variable         | Light   | Dark    | Purpose                     |
| ---------------- | ------- | ------- | --------------------------- |
| `primary`        | #fcfcfc | #1f2937 | Primary background          |
| `secondary`      | #f1f3f4 | #374151 | Secondary background        |
| `primary-text`   | #334155 | #f9fafb | Primary text                |
| `secondary-text` | #64748b | #9ca3af | Secondary text              |
| `accent`         | #0d9488 | #5eead4 | Interactive elements (teal) |
| `success`        | #16a34a | #a7f3d0 | Success states (green)      |
| `danger`         | #ef4444 | #fda4af | Error states (red)          |

## Semantic Gap

Analyzing the 10 legacy files reveals missing semantic colors:

| Semantic Meaning | Hardcoded Colors                   | Theme Has?            |
| ---------------- | ---------------------------------- | --------------------- |
| Error/danger     | red-500, red-600, red-700          | `danger`              |
| Success/live     | green-500, green-700               | `success`             |
| Interactive      | blue-500 (focus states)            | `accent`              |
| Info/connecting  | blue-500, blue-600, blue-800       | **Missing**           |
| Warning/caution  | yellow-400, yellow-700, orange-500 | **Missing**           |
| Processing       | purple-500                         | **Missing**           |
| Neutral UI       | gray-_, slate-_                    | Partial (`secondary`) |

## Solution: Extend Theme

Add two semantic colors to `globals.css`:

```css
@theme {
  /* Existing colors... */

  /* NEW */
  --color-warning: #f59e0b; /* Amber - caution states */
  --color-info: #3b82f6; /* Blue - informational states */
}

.dark {
  /* Existing dark overrides... */

  /* NEW */
  --color-warning: #fbbf24; /* Brighter amber */
  --color-info: #60a5fa; /* Brighter blue */
}
```

## Color Mapping Reference

After extending the theme, use this mapping:

| Hardcoded              | Maps To                        | Use Case                             |
| ---------------------- | ------------------------------ | ------------------------------------ |
| `red-*`                | `danger`                       | Error messages, destructive actions  |
| `green-*`              | `success`                      | Live, ready, completed states        |
| `blue-*`               | `info`                         | Connecting, speaking, informational  |
| `yellow-*`, `orange-*` | `warning`                      | Time warnings, reconnecting, caution |
| `purple-*`             | `info`                         | Processing (consolidate with info)   |
| `gray-*`, `slate-*`    | `secondary` / `secondary-text` | Neutral UI elements                  |
| `white`                | `primary`                      | Light backgrounds                    |

## Files to Migrate

### Tier 1: Simple (error-only)

| File                                                      | Changes               |
| --------------------------------------------------------- | --------------------- |
| `src/app/[locale]/(app)/dashboard/page.tsx`               | `red-500` → `danger`  |
| `src/app/[locale]/(interview)/.../ShareButton.tsx`        | `red-500` → `danger`  |
| `src/app/[locale]/signin/_components/OtpVerification.tsx` | `red-500` → `danger`  |
| `src/app/[locale]/signin/_components/SignInForm.tsx`      | `red-500` → `danger`  |
| `src/app/[locale]/(interview)/.../session/page.tsx`       | `red-600` → `danger`  |
| `src/app/_components/LanguageSwitcher.tsx`                | `blue-500` → `accent` |

### Tier 2: Medium (multiple colors)

| File                                                | Changes                                        |
| --------------------------------------------------- | ---------------------------------------------- |
| `src/app/_components/StatusIndicator.tsx`           | Multiple status colors → semantic theme colors |
| `src/app/[locale]/(interview)/.../BlockSession.tsx` | Loading, timer, warning states                 |

### Tier 3: Complex (extensive UI)

| File                                                      | Changes                |
| --------------------------------------------------------- | ---------------------- |
| `src/app/[locale]/(interview)/.../SessionContentDev.tsx`  | Full dev UI migration  |
| `src/app/[locale]/(interview)/.../SessionContentProd.tsx` | Full prod UI migration |

## Implementation Steps

### Step 1: Extend globals.css

Add `warning` and `info` colors with dark mode variants.

### Step 2: Migrate Tier 1 files

Simple find-replace operations:

- `text-red-500` → `text-danger`
- `border-red-500` → `border-danger`
- `bg-red-500` → `bg-danger`

### Step 3: Migrate Tier 2 files

Update StatusIndicator `statusMap` (all 12 statuses):

```typescript
const statusMap: Record<InterviewStatus, { text: string; className: string }> = {
  idle: { text: "Idle", className: "text-secondary-text" },
  initializing: { text: "Initializing...", className: "text-info" },
  requestingPermissions: { text: "Requesting Permissions...", className: "text-info" },
  permissionsDenied: { text: "Permissions Denied", className: "text-danger" },
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

### Step 4: Migrate Tier 3 files

Systematic replacement in session UI components.

### Step 5: Update test

Remove migrated files from `LEGACY_FILES` in `theme-colors.test.ts`.

### Step 6: Verify

```bash
pnpm test src/test/unit/theme-colors.test.ts
```

Test should pass with 0 legacy files remaining.

## Acceptance Criteria

1. [ ] `globals.css` extended with `warning` and `info` colors
2. [ ] All 10 legacy files migrated to theme colors
3. [ ] `theme-colors.test.ts` passes with empty `LEGACY_FILES` set
4. [ ] Dark mode works correctly for all migrated colors
5. [ ] No hardcoded Tailwind colors in `src/app/` (except skipped dev pages)

## Litmus Test

After migration, verify:

1. Can change app's "info" color by editing ONE line in globals.css
2. Dark mode toggle adapts all colors automatically
3. `grep -r "blue-500" src/app/` returns zero matches (excluding skipped files)

## Related Files

- `src/styles/globals.css` - Theme definitions
- `src/test/unit/theme-colors.test.ts` - Lint test for hardcoded colors
