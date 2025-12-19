# TECH02: Refactor Interview Router

## Problem Statement
The `src/server/api/routers/interview.ts` file is ~690 lines, exceeding the project's 300-line guideline.

## Analysis: What's Actually in the File

| Section | Lines | Notes |
|---------|-------|-------|
| Imports | ~18 | Standard |
| Constants (`DURATION_MS`) | ~6 | Could stay or move |
| `generateGuestToken()` | ~4 | Simple utility |
| `getInterviewWithAccess()` | ~28 | Reusable access control |
| Zod schemas | ~23 | Good extraction candidate |
| Mock feedback data | ~66 | Development artifact |
| 13 router procedures | ~545 | Core router logic |

## KISS Refactoring Approach

Instead of introducing a Service Layer pattern (over-engineering for this codebase), we'll use **simple extraction**:

### Step 1: Extract Schemas (~23 lines saved)
Create `src/lib/schemas/interview.ts`:
```typescript
import { z } from "zod";

export const JobDescriptionInput = z.discriminatedUnion("type", [...]);
export const ResumeInput = z.discriminatedUnion("type", [...]);
```

### Step 2: Extract Access Control Helper (~35 lines saved)
Create `src/server/lib/interview-access.ts`:
```typescript
// Move getInterviewWithAccess, generateGuestToken, and DURATION_MS here
// These are genuinely reusable utilities
```

### Step 3: Remove or Extract Mock Data (~66 lines saved)
The `getFeedback` procedure contains ~66 lines of hardcoded mock data for `demo-*` interviews. Options:
- **Option A**: Delete it (if no longer needed)
- **Option B**: Move to `src/server/lib/mock-data.ts`

### Step 4: Split Worker Procedures (Optional, ~150 lines)
If still over 300 lines, consider splitting worker-specific procedures into a separate router:
- `src/server/api/routers/interview-worker.ts` for: `getContext`, `submitTranscript`, `submitFeedback`

These are only called by the Cloudflare Worker, not the frontend.

## What We're NOT Doing

1. **No Service Layer class** - tRPC procedures already serve as the service layer
2. **No dependency injection patterns** - Just use function parameters
3. **No new abstractions** - Just file organization

## Expected Result

| Change | Lines Saved |
|--------|-------------|
| Extract schemas | ~23 |
| Extract access helpers | ~35 |
| Remove/extract mock data | ~66 |
| **Total** | **~124** |

This brings the file to ~566 lines. If the 300-line limit is strict, Step 4 (splitting worker procedures) would bring it under 300.

## Implementation Steps

1. [x] Create `src/lib/schemas/interview.ts` with extracted Zod schemas
2. [x] Create `src/server/lib/interview-access.ts` with access control utilities
3. [x] Remove mock data from `getFeedback` procedure
4. [x] Update imports in `interview.ts`
5. [x] Split worker procedures to `interview-worker.ts`
6. [x] Run `pnpm check` to verify types
7. [x] Run `pnpm test` to ensure no regressions

## Final Results

| File | Lines |
|------|-------|
| `interview.ts` | 449 (was 690) |
| `interview-worker.ts` | 116 |
| `interview-access.ts` | 48 |
| `src/lib/schemas/interview.ts` | 32 |

**Status: COMPLETE**

## Risks
- **Minimal**: This is purely code organization, no logic changes
