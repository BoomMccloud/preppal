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

### Page Details
- **Route**: `/interview/[interviewId]/lobby` (existing route)
- **Component Type**: **Server Component** (default in App Router).
- **Data Fetching**: `await api.interview.getById({ id: interviewId })` on the server.

### Server-Side Logic & Rendering
The page will fetch data on the server and handle all logic *before* rendering. This includes redirects and error handling.

#### 1. Server-Side Redirects

- **If `status` is `COMPLETED`**:
  - **Action**: Immediately perform a server-side redirect to the feedback page.
  - **Implementation**: `redirect("/interview/${id}/feedback")` from `next/navigation`.

#### 2. Error State Rendering

- **If `interview` is not found or user lacks access**:
  - The `api.interview.getById` call will throw a `TRPCError`. This should be caught in a `try...catch` block.
  - **Render**: An error component displaying "Interview not found or you don't have access" with a "Return to Dashboard" button.

- **If `status` is `IN_PROGRESS` or `ERROR`**:
  - **Render**: An error component displaying an appropriate message (e.g., "This interview is already in progress.") with a "Return to Dashboard" button.

#### 3. Success State Rendering (`status: PENDING`)

- **Display Elements**:
  - Job description preview: First 100 characters + "..." if longer.
  - Existing checklist UI (microphone, camera permissions).
  - Simple instructions for joining the interview.
- **Actions**:
  - Primary button: A standard Next.js `<Link>` to `/interview/{id}/session`.
  - Secondary link: A `<Link>` to `/dashboard`.

### Component Structure
```tsx
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { LobbyUI } from "./_components/LobbyUI"; // Example client component
import { ErrorDisplay } from "./_components/ErrorDisplay"; // Example error component

export default async function LobbyPage({ params }: { params: { interviewId: string } }) {
  try {
    const interview = await api.interview.getById({ id: params.interviewId });

    if (interview.status === "COMPLETED") {
      redirect(`/interview/${interview.id}/feedback`);
    }

    if (interview.status === "IN_PROGRESS" || interview.status === "ERROR") {
      return <ErrorDisplay status={interview.status} />;
    }

    // Success case (PENDING)
    return <LobbyUI interview={interview} />;

  } catch (error) {
    // Handles NOT_FOUND or other tRPC errors
    return <ErrorDisplay status="NOT_FOUND" />;
  }
}
```

---

## Test Requirements

### Backend Integration Tests
**Location**: `src/test/integration/dashboard.test.ts` (or similar)

**Test Cases:** (No changes from original)
- ✅ Should fetch interview by ID for correct user.
- ✅ Should deny access to other users - throws TRPCError.
- ✅ Should return correct fields (`id`, `status`, `jobDescriptionSnapshot`).
- ✅ Should throw `NOT_FOUND` when interview doesn't exist or user doesn't own it.
- ✅ Should console.log when interview not found.

### Frontend Tests (for Server Component)
**Location**: `src/app/(app)/interview/[interviewId]/lobby/page.test.tsx` (NEW FILE)

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

### Phase 3: Frontend Implementation (GREEN) - 🟡 IN PROGRESS
- [ ] Update `src/app/(app)/interview/[interviewId]/lobby/page.tsx`.
  - [ ] Convert the page to an `async` Server Component.
  - [ ] Implement the server-side `await api.interview.getById(...)` call within a `try...catch` block.
  - [ ] Implement the server-side `redirect()` for the `COMPLETED` status.
  - [ ] Implement conditional rendering for all error states (`NOT_FOUND`, `IN_PROGRESS`, `ERROR`).
  - [ ] For the `PENDING` status, render the main lobby UI and pass the fetched `interview` data to it.
    - [ ] Display the (potentially truncated) `jobDescriptionSnapshot`.
    - [ ] Ensure the "Start Interview" button is a Next.js `<Link>` pointing to `/interview/{id}/session`.
    - [ ] Ensure the "Back to Dashboard" button is a `<Link>` to `/dashboard`.
- [ ] **VERIFY**: Run all frontend and backend tests until they all pass.

### Phase 4: Documentation
- [ ] Update `docs/05_current_task.md` with the final implementation summary.
- [ ] Ensure this specification document is fully aligned with the final code.

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