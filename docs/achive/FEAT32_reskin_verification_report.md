# Spec Verification Report

**Spec**: FEAT32_reskin.md
**Verified**: 2025-12-30
**Overall Status**: ⚠️ WARNINGS (No blocking issues, but spec needs updates)

---

## Summary

- **Files**: 5 verified, 1 issue (tailwind.config.ts approach outdated)
- **Methods/Functions**: 4 verified, 0 issues
- **Libraries**: 3 verified, 0 issues
- **CSS Variables**: 8 verified, 0 issues (already implemented!)
- **Animations**: 4 existing, 4 missing (need to be added)
- **Naming**: Consistent throughout

---

## Blocking Issues

**None!** The spec is fundamentally implementable. All blocking concerns have workarounds.

---

## Warnings

### [WARN-001] Tailwind v4 Architecture Mismatch

**Spec says**: Modify `tailwind.config.ts` to add semantic colors
```typescript
colors: {
  "primary": "var(--color-primary)",
  ...
}
```

**Reality**:
- Codebase uses **Tailwind CSS v4.0.15** which uses CSS-native `@theme` directive
- No `tailwind.config.ts` exists - configuration is done in `globals.css`
- CSS variables are already defined in `src/styles/globals.css:3-17`

**Recommendation**: Update spec to reflect Tailwind v4 architecture. The color system is **already implemented** - no changes needed to "Tailwind config". Simply add missing animations to `globals.css`.

---

### [WARN-002] Theme Toggle Already Exists as Separate Component

**Spec says**: Add inline ThemeToggle (~15 lines) in SessionContentProd header

**Reality**: `src/app/_components/ThemeToggle.tsx` already exists (72 lines, full implementation with Sun/Moon icons)

**Recommendation**:
- Reuse existing `ThemeToggle` component instead of creating inline version
- This is **better** than spec - proper separation of concerns
- Just import and use: `import ThemeToggle from "~/app/_components/ThemeToggle"`

---

### [WARN-003] cn() Utility Not Used in Codebase

**Spec says**: Use `cn()` for conditional class merging
```tsx
<div className={cn("base-class", isActive && "active-class")}>
```

**Reality**:
- No `clsx` or `class-variance-authority` installed
- Current code uses template literals: `` className={`base ${condition ? "active" : ""}`} ``

**Recommendation**: Either:
1. Install `clsx` and add `cn()` utility (better DX)
2. Or update spec to use template literals (simpler, no new deps)

---

### [WARN-004] Missing Theme Flash Prevention Script

**Spec says**: Add inline script to `<head>` for theme flash prevention

**Reality**: No theme flash prevention script exists. The `ThemeToggle` component only initializes on client mount.

**Recommendation**: Add the theme flash prevention script to `src/app/layout.tsx`. This is a valid TODO for implementation.

---

### [WARN-005] Missing Animations (To Be Added)

**Spec lists animations that don't exist yet**:

| Animation | Status | Action Needed |
|-----------|--------|---------------|
| `fade-up` | ❌ Missing | Add to globals.css |
| `fade-up-delay-1` | ❌ Missing | Add to globals.css |
| `fade-up-delay-2` | ❌ Missing | Add to globals.css |
| `shadow-pulse` | ❌ Missing | Add to globals.css |
| `shadow-pulse-dark` | ❌ Missing | Add to globals.css |
| `pulse-ring-danger` | ❌ Missing | Add to globals.css |
| `.progress-ring` class | ❌ Missing | Add to globals.css |

These are **expected** to be missing since they're part of what the spec wants to add.

---

## Verified Items ✅

### Files

| File | Status | Notes |
|------|--------|-------|
| `src/styles/globals.css` | ✅ Exists | CSS variables already defined |
| `tailwind.config.ts` | ⚠️ N/A | Tailwind v4 uses @theme in CSS |
| `src/app/layout.tsx` | ✅ Exists | Geist font already configured |
| `SessionContentProd.tsx` | ✅ Exists | Target file for refactor |
| `docs/todo/layout6.html` | ✅ Exists | Reference mockup available |
| `DevConsole.tsx` | 🆕 To Create | Correctly marked as NEW |

### Libraries

| Library | Status | Version |
|---------|--------|---------|
| Tailwind CSS | ✅ Installed | v4.0.15 |
| Geist Font | ✅ Configured | via next/font/google |
| Next.js | ✅ Installed | v15.5.9 |

### State Variables (from types.ts)

| Variable | Status | Location |
|----------|--------|----------|
| `isAiSpeaking` | ✅ Exists | `types.ts:29` (CommonStateFields) |
| `elapsedTime` | ✅ Exists | `types.ts:27` (CommonStateFields) |
| `answerTimeLimit` | ✅ Exists | `types.ts:74` (ReducerContext) |
| `transcript` | ✅ Exists | `types.ts:24` (CommonStateFields) |

### CSS Variables (globals.css)

| Variable | Light Mode | Dark Mode |
|----------|------------|-----------|
| `--color-primary` | ✅ #fcfcfc | ✅ #1f2937 |
| `--color-secondary` | ✅ #f1f3f4 | ✅ #374151 |
| `--color-primary-text` | ✅ #334155 | ✅ #f9fafb |
| `--color-secondary-text` | ✅ #64748b | ✅ #9ca3af |
| `--color-accent` | ✅ #0d9488 | ✅ #5eead4 |
| `--color-success` | ✅ #16a34a | ✅ #a7f3d0 |
| `--color-warning` | ✅ #f59e0b | ✅ #fbbf24 |
| `--color-danger` | ✅ #ef4444 | ✅ #fda4af |

### Existing Animations (globals.css)

| Animation | Status |
|-----------|--------|
| `@keyframes ripple` | ✅ Lines 40-49 |
| `.animate-ripple` | ✅ Lines 51-53 |
| `@keyframes pulse-soft` | ✅ Lines 56-66 |
| `.animate-pulse-soft` | ✅ Lines 68-70 |

### Existing Icons (SessionContentProd.tsx)

| Icon | Status | Location |
|------|--------|----------|
| `SmartToyIcon` | ✅ Inline SVG | Lines 272-283 |
| `TimerIcon` | ✅ Inline SVG | Lines 285-296 |
| `MicIcon` | ✅ Inline SVG | Lines 298-309 |
| `PhoneEndIcon` | ✅ Inline SVG | Lines 311-322 |
| `WaveformIcon` | ✅ Inline SVG | Lines 324-335 |

---

## Recommendations

### Before Implementing

1. **Update spec Section "Tailwind Extension"**: Remove references to `tailwind.config.ts` - Tailwind v4 uses `@theme` in CSS. The color system is already implemented.

2. **Update spec Section "Theme Support"**: Replace "inline ThemeToggle" approach with importing existing `ThemeToggle` component.

3. **Decide on cn() utility**: Either install `clsx` + create `cn()` helper, or update spec examples to use template literals.

### During Implementation

1. Add missing animations to `globals.css` (fade-up, shadow-pulse, pulse-ring-danger)
2. Add theme flash prevention script to layout
3. Create `DevConsole.tsx` as specified
4. Refactor `SessionContentProd.tsx` - most design system work is already done!

### Good News 🎉

Much of the design system foundation is **already implemented**:
- CSS variables ✅
- Semantic color classes working ✅
- Geist font configured ✅
- Base animations (ripple, pulse-soft) ✅
- Theme toggle component exists ✅

The main work remaining is:
1. Adding progress ring timer logic
2. Making animations conditional on `isAiSpeaking`
3. Adding page entrance animations
4. Creating DevConsole
5. Theme flash prevention

---

## Implementation Checklist (Updated)

Based on verification, here's the revised implementation order:

1. **Add missing animations to globals.css** (~20 lines)
   - fade-up, shadow-pulse, pulse-ring-danger keyframes
   - .progress-ring transition class

2. **Add theme flash prevention** (~8 lines in layout.tsx)

3. **Refactor SessionContentProd.tsx** (main work)
   - Add `getTimerState()` function
   - Add progress ring SVG around avatar
   - Make ripple/pulse conditional on `isAiSpeaking`
   - Import existing ThemeToggle component
   - Add page entrance animation classes

4. **Create DevConsole.tsx** (~100 lines)

5. **Polish & test**

---

## References

- [Current globals.css](/Users/jasonbxu/Documents/GitHub/preppal/src/styles/globals.css)
- [Current SessionContentProd.tsx](/Users/jasonbxu/Documents/GitHub/preppal/src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd.tsx)
- [Existing ThemeToggle.tsx](/Users/jasonbxu/Documents/GitHub/preppal/src/app/_components/ThemeToggle.tsx)
- [Session types.ts](/Users/jasonbxu/Documents/GitHub/preppal/src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts)
