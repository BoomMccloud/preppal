# Lobby Page Implementation Specification

## Feature: Interview Lobby Page (`getById`)

### Overview
The lobby page serves as a "join meeting" experience before starting an interview. It leverages Next.js Server Components to fetch data server-side, ensuring a fast and secure pre-flight check before the user enters the live session.

---

## API Specification

### Procedure: `interview.getById`

#### Contract
```typescript
// Input
{ id: string }

// Output
{
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ERROR";
  jobDescriptionSnapshot: string | null;
}

// Errors
- NOT_FOUND: Interview doesn't exist OR user doesn't own it
  (Don't reveal if interview exists for security - prevents enumeration attacks)
- UNAUTHORIZED: User not authenticated (handled by protectedProcedure)
```

#### Backend Requirements

1. **Authentication & Authorization**
   - Protected procedure (requires authentication).
   - Enforce user ownership: Query with BOTH `id` AND `userId`.
   - Single query - if not found, throw `NOT_FOUND` error.
   - Do NOT distinguish between "doesn't exist" and "not yours" for security.

2. **Error Handling**
   - Throw `TRPCError` with code `NOT_FOUND` when interview doesn't exist or belongs to another user.
   - Console log ALL `NOT_FOUND` attempts for security monitoring.
   - Log format: `[getById] Interview not found: ${id} for user: ${userId}`

3. **Data Return**
   - Return only required fields: `id`, `status`, `jobDescriptionSnapshot`.

---

## Frontend Specification

### Prerequisites for Junior Developers
Before starting implementation, verify:
1. **Backend is working**: Run `pnpm test dashboard` - should pass 11 tests including `getById`
2. **Test file exists**: `src/app/(app)/interview/[interviewId]/lobby/page.test.tsx` already exists with all test cases written
3. **See failing tests**: Run `pnpm test lobby` - should show 11 failing tests (this is expected!)
4. **Page file exists**: `src/app/(app)/interview/[interviewId]/lobby/page.tsx` contains placeholder/mock UI

### Page Details
- **Route**: `/interview/[interviewId]/lobby` (existing route)
- **Component Type**: **Server Component** (default in App Router).
- **Data Fetching**: `await api.interview.getById({ id: interviewId })` on the server.

### Server-Side Logic & Rendering
The page will fetch data on the server and handle all logic *before* rendering. This includes redirects and error handling.

#### 1. Server-Side Redirects

- **If `status` is `COMPLETED`**:
  - **Action**: Immediately perform a server-side redirect to the feedback page.
  - **Implementation**: `redirect("/interview/${id}/feedback")` from `'next/navigation'` (NOT `'next/server'`).

#### 2. Error State Rendering

- **If `interview` is not found or user lacks access**:
  - The `api.interview.getById` call will throw a `TRPCError`. This should be caught in a `try...catch` block.
  - **Render**: An error component displaying "Interview not found or you don't have access" with a "Return to Dashboard" button.

- **If `status` is `IN_PROGRESS` or `ERROR`**:
  - **Render**: An error component displaying an appropriate message (e.g., "This interview is already in progress.") with a "Return to Dashboard" button.

#### 3. Success State Rendering (`status: PENDING`)

- **Display Elements**:
  - **Job description preview**: First 100 characters + "..." if longer. Handle `null` values.
    ```tsx
    const displayDescription = interview.jobDescriptionSnapshot
      ? interview.jobDescriptionSnapshot.length > 100
        ? interview.jobDescriptionSnapshot.substring(0, 100) + "..."
        : interview.jobDescriptionSnapshot
      : "No job description provided";
    ```
  - Existing checklist UI (microphone, camera permissions).
  - Simple instructions for joining the interview.
- **Actions**:
  - Primary button: A standard Next.js `<Link>` to `/interview/{id}/session`.
  - Secondary link: A `<Link>` to `/dashboard`.

### Component Structure & Implementation Guidance

**IMPORTANT: Write all JSX inline in the page component. Do NOT create separate component files** (unless a component exceeds 50 lines, which is unlikely for this page).

The component names `LobbyUI` and `ErrorDisplay` in the example below are **conceptual only**. You should write the JSX directly in the page component.

```tsx
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import Link from "next/link";

export default async function LobbyPage({ params }: { params: { interviewId: string } }) {
  try {
    const interview = await api.interview.getById({ id: params.interviewId });

    if (interview.status === "COMPLETED") {
      redirect(`/interview/${interview.id}/feedback`);
    }

    if (interview.status === "IN_PROGRESS") {
      // Write error UI inline - see test expectations at line 82-84 in page.test.tsx
      return (
        <div>
          <p>This interview is already in progress. Please refresh or contact support.</p>
          <Link href="/dashboard">Return to Dashboard</Link>
        </div>
      );
    }

    if (interview.status === "ERROR") {
      // Write error UI inline - see test expectations at line 101-103 in page.test.tsx
      return (
        <div>
          <p>This interview has encountered an error. Please contact support.</p>
          <Link href="/dashboard">Return to Dashboard</Link>
        </div>
      );
    }

    // Success case (PENDING) - write lobby UI inline
    const displayDescription = interview.jobDescriptionSnapshot
      ? interview.jobDescriptionSnapshot.length > 100
        ? interview.jobDescriptionSnapshot.substring(0, 100) + "..."
        : interview.jobDescriptionSnapshot
      : "No job description provided";

    return (
      <div>
        <h1>Interview Lobby</h1>
        <p>{displayDescription}</p>
        {/* Add your checklist UI, instructions, etc. */}
        <Link href={`/interview/${interview.id}/session`}>Start Interview</Link>
      </div>
    );

  } catch (error) {
    // Handles NOT_FOUND or other tRPC errors - see test at line 45 in page.test.tsx
    return (
      <div>
        <p>Interview not found or you don't have access</p>
        <Link href="/dashboard">Return to Dashboard</Link>
      </div>
    );
  }
}
```

**Error Message Requirements** (must match test expectations):
- **NOT_FOUND**: "Interview not found or you don't have access"
- **IN_PROGRESS**: "This interview is already in progress. Please refresh or contact support."
- **ERROR**: "This interview has encountered an error. Please contact support."
- **All error states**: Must include "Return to Dashboard" link

---

## Test Requirements

### Backend Integration Tests
**Location**: `src/test/integration/dashboard.test.ts`

**Status**: ✅ COMPLETED - The `getById` test suite has already been added to this file.

**Test Cases:**
- ✅ Should fetch interview by ID for correct user.
- ✅ Should deny access to other users - throws TRPCError.
- ✅ Should return correct fields (`id`, `status`, `jobDescriptionSnapshot`).
- ✅ Should throw `NOT_FOUND` when interview doesn't exist or user doesn't own it.
- ✅ Should console.log when interview not found.

### Frontend Tests (for Server Component)
**Location**: `src/app/(app)/interview/[interviewId]/lobby/page.test.tsx`

**Status**: ✅ COMPLETED - This file already exists with all test cases written.

**Test Cases:**
- ✅ Should render the error component if `getById` throws a `NOT_FOUND` error.
- ✅ Should call `redirect` to the feedback page if the interview `status` is `COMPLETED`.
- ✅ Should render an error component if `status` is `IN_PROGRESS`.
- ✅ Should render an error component if `status` is `ERROR`.
- ✅ Should render the main lobby UI when `status` is `PENDING`.
- ✅ Should correctly truncate a long job description with "...".
- ✅ Should render a "Start Interview" link pointing to the correct session URL.

---

## Implementation Checklist & TDD Plan

This checklist outlines the full implementation process following TDD methodology.

### Quick Start Guide for Junior Developers

**Before you start, verify your environment:**
```bash
# 1. Verify backend tests pass
pnpm test dashboard
# Expected: 11/11 tests passing (including 5 getById tests)

# 2. Verify frontend tests are failing (RED phase)
pnpm test lobby
# Expected: 11/11 tests failing (this is good - it's TDD RED phase!)
```

**Your task:** Make the frontend tests pass by implementing the page logic.

**Where to work:** Edit `src/app/(app)/interview/[interviewId]/lobby/page.tsx`

**What you'll do:**
1. Convert the page to an `async` Server Component
2. Fetch interview data using `await api.interview.getById({ id: params.interviewId })`
3. Handle all status cases (COMPLETED → redirect, PENDING → show UI, others → show errors)
4. Match the exact error messages in the test file (see lines 45, 82, 101 in `page.test.tsx`)

**When you're done:**
```bash
# Verify all tests pass
pnpm test lobby
# Expected: 11/11 tests passing (GREEN phase complete!)
```

---

### Phase 1: Backend Implementation (RED → GREEN) - ✅ COMPLETED
- [x] **RED**: Run the existing integration test for `getById` in `src/test/integration/dashboard.test.ts` to verify it fails.
- [x] **GREEN**: Implement the `interview.getById` procedure in `src/server/api/routers/interview.ts`.
  - [x] Make it a protected procedure requiring authentication.
  - [x] Define input schema: `{ id: string }`.
  - [x] Define output schema: `{ id, status, jobDescriptionSnapshot }`.
  - [x] Enforce user ownership by querying with both `id` and `userId`.
  - [x] Throw a `NOT_FOUND` TRPCError if no record is found.
  - [x] Add a console log for all `NOT_FOUND` attempts for security monitoring.
- [x] **VERIFY**: Run all backend integration tests and verify they pass.

### Phase 2: Frontend Tests (RED) - ✅ COMPLETED
- [x] Create the test file: `src/app/(app)/interview/[interviewId]/lobby/page.test.tsx`.
- [x] Write all test cases for the `LobbyPage` Server Component:
  - [x] Test that it renders the error component if `getById` throws a `NOT_FOUND` error.
  - [x] Test that it calls `redirect` to the feedback page if the interview `status` is `COMPLETED`.
  - [x] Test that it renders an error component if `status` is `IN_PROGRESS`.
  - [x] Test that it renders an error component if `status` is `ERROR`.
  - [x] Test that it renders the main lobby UI when `status` is `PENDING`.
  - [x] Test that it correctly truncates a long job description with "...".
  - [x] Test that it renders a "Start Interview" link pointing to the correct session URL.
- [x] **VERIFY**: Run the frontend tests and confirm that all fail as expected.

### Phase 3: Frontend Implementation (GREEN) - ✅ COMPLETED
- [x] Update `src/app/(app)/interview/[interviewId]/lobby/page.tsx`.
  - [x] Add necessary imports: `redirect` from `'next/navigation'`, `api` from `'~/trpc/server'`, `Link` from `'next/link'`
  - [x] Convert the page to an `async` Server Component (add `async` to function signature).
  - [x] Wrap API call in `try...catch`: `await api.interview.getById.query({ id: params.interviewId })`
  - [x] In the `catch` block: render NOT_FOUND error UI with exact message "Interview not found or you don't have access"
  - [x] After fetching data successfully:
    - [x] If `status === "COMPLETED"`: call `redirect(\`/interview/${interview.id}/feedback\`)`
    - [x] If `status === "IN_PROGRESS"`: return error UI with exact message "This interview is already in progress. Please refresh or contact support."
    - [x] If `status === "ERROR"`: return error UI with exact message "This interview has encountered an error. Please contact support."
    - [x] If `status === "PENDING"`: render main lobby UI
  - [x] For PENDING status:
    - [x] Implement job description truncation logic (see code example in spec above)
    - [x] Render heading with text matching "Interview Lobby" (test uses `/Interview Lobby/i`)
    - [x] Display the truncated/full job description
    - [x] Add `<Link href={`/interview/${interview.id}/session`}>Start Interview</Link>`
    - [x] Add checklist UI and instructions
- [x] **VERIFY**: Run `pnpm test lobby` - all 8 tests pass! ✅

### Phase 4: Documentation - ✅ COMPLETED
- [x] Update `docs/10_current_task.md` with the final implementation summary.
- [x] Update `docs/11_trcp.md` to mark Lobby Page as completed.
- [x] Mark all Phase 3 checklist items as complete.
- [x] Ensure this specification document is fully aligned with the final code.

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User not authenticated | Redirect to login (handled by auth middleware) |
| Interview doesn't exist | Render "not found" error component |
| User doesn't own interview | Render "not found" error component (same as above) |
| Status is `COMPLETED` | **Server-side redirect** to `/interview/{id}/feedback` |
| Status is `IN_PROGRESS` | Render error component |
| Status is `ERROR` | Render error component |
| Status is `PENDING` | Render lobby page normally |
| Very long job description | Truncate to 100 chars + "..." |