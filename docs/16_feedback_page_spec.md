# Interview Feedback Page Specification

## Feature: Interview Feedback and Results

### Overview
This page displays the comprehensive, AI-generated feedback for a completed interview session. It acts as the final step in the user's journey for a given interview. The page will be implemented primarily as a Next.js Server Component to fetch all data upfront, but will delegate to a client-side polling component if the feedback is not yet ready.

---

## API Specification

This feature will expand the existing `interview.getById` tRPC procedure to conditionally include feedback data.

### `interview.getById` (Modified Procedure)

- **Purpose**: Fetches an interview record. Will be modified to optionally include the full feedback object, serving both the Lobby and Feedback pages.

#### Contract
```typescript
// Input
z.object({
  id: z.string().cuid(),
  includeFeedback: z.boolean().optional().default(false),
})

// Output
(Interview & {
  feedback?: InterviewFeedback | null;
}) | null

// Errors
- NOT_FOUND: Interview doesn't exist OR user doesn't own it.
```

#### Backend Requirements
1.  **Authentication**: Must remain a `protectedProcedure`.
2.  **Authorization**: Must enforce user ownership by querying on both `id` and `userId`.
3.  **Logging**: If an interview is not found or the user does not have access, a `warn` level log should be recorded on the server before throwing the `NOT_FOUND` error. The log should include the `userId` and the attempted `interviewId` for security monitoring.
4.  **Conditional Data**: The Prisma query must be updated to conditionally include the `feedback` relation based on the `includeFeedback` input flag.
    ```typescript
    // In the query
    include: {
      feedback: input.includeFeedback,
    }
    ```

---

## Frontend Specification

### Page Details
- **Route**: `/interview/[interviewId]/feedback/page.tsx`
- **Component Type**: **Server Component**.

### Server-Side Logic & Rendering

The page will fetch data on the server and handle all primary logic before rendering.

#### Imports
-   **tRPC Client**: `import { api } from "~/trpc/server";`
-   **Redirect**: `import { redirect } from "next/navigation";`

#### Logic

1.  **Data Fetching**: `await api.interview.getById({ id: interviewId, includeFeedback: true })` inside a `try...catch` block.

2.  **Error & State Handling**:
    -   **On `catch` (e.g., `NOT_FOUND` error)**: Render an error component: "Feedback not found or you don't have access."
    -   **If `interview.status` is not `COMPLETED`**: Before redirecting, log a server-side warning. The log should state that a user attempted to access the feedback page for an interview that was not completed, including the `userId`, `interviewId`, and the interview's current `status`. Then, perform a server-side redirect to the lobby page: `redirect('/interview/[interviewId]/lobby')`.
    -   **If `interview.feedback` is `null`**: The interview is complete, but feedback is still processing. Render a dedicated client-side polling component (`<FeedbackPolling>`).
    -   **If `interview.feedback` exists**: Render the main results UI, passing the feedback data to the existing `feedback-tabs.tsx` component.

### New & Modified UI Components

1.  **`feedback/page.tsx` (Modified Server Component)**
    -   This existing file will be modified to contain the primary server-side fetching and conditional logic described in this specification.

2.  **`_components/FeedbackPolling.tsx` (New Client Component)**
    -   **Purpose**: To provide a user-friendly "processing" state while waiting for feedback.
    -   **Props**:
        -   `interviewId: string`: The ID of the interview to poll.
    -   **Imports**:
        -   `import { useRouter } from "next/navigation";`
    -   **UI**: Displays a message like "Your feedback is being generated. This may take a minute..." along with a loading spinner.
    -   **Logic**: Implements polling by calling `api.interview.getById.useQuery` with the `{ refetchInterval: 3000 }` option. This uses the built-in polling feature of the underlying query library (TanStack Query) and avoids custom code. The `useRouter` hook is needed for the success callback.
    -   **On Success**: The `useQuery` hook will have an `onSuccess` callback. If the `data.feedback` object is present in the response, it will call `router.refresh()`. This unmounts the component, which automatically stops the polling.
    -   **On Error**: If the `useQuery` call fails, the built-in polling will automatically stop. The component should log the client-side error and display a UI error message (e.g., "Could not retrieve feedback. Please refresh the page to try again.").
3.  **`feedback-tabs.tsx` (Existing Client Component)**
    -   No major changes needed. It will receive the feedback data as props and render it.

---

## Test Requirements

### 1. Backend Tests
- **Location**: `src/server/api/routers/interview.test.ts`
- **Test Cases for `getById`**:
    -   (No change) Existing tests for lobby data (`includeFeedback: false`) should still pass.
    -   (RED) Write a new test case where `includeFeedback: true` fetches a `COMPLETED` interview along with its feedback.
    -   (RED) Write a new test case where `includeFeedback: true` returns `feedback: null` if the feedback has not been generated yet.

### 2. Frontend Tests
- **Location for Page**: `src/app/(app)/interview/[interviewId]/feedback/page.test.tsx` (new file)
- **Strategy**: Test the Server Component's logic by mocking the `api.interview.getById` responses.
- **Test Cases**:
    -   (RED) Test that it redirects to the lobby if the interview status is `PENDING`.
    -   (RED) Test that it renders the `<FeedbackPolling />` component if the interview is `COMPLETED` but `feedback` is `null`.
    -   (RED) Test that it renders the `<FeedbackTabs />` component when feedback data is present.
    -   (RED) Test that it renders the "Feedback not found" error component when the API throws a `NOT_FOUND` error.

- **Location for Polling Component**: `src/app/(app)/interview/[interviewId]/feedback/_components/FeedbackPolling.test.tsx` (new file)
- **Strategy**: Mock the `useQuery` hook for `getById`.
- **Test Cases**:
    -   (RED) Test that it calls `useQuery` with `{ includeFeedback: true }`.
    -   (RED) Test that it calls `router.refresh()` when the query returns a non-null `feedback` object.

---

## Implementation Checklist & TDD Plan

### Phase 1: Backend (RED → GREEN) ✅ COMPLETED
- [x] **RED**: Add failing tests to `interview.test.ts` for the new `includeFeedback: true` functionality in `getById`.
  - ✅ Added test: "should fetch a COMPLETED interview with feedback when includeFeedback is true" ([interview.test.ts:235-297](src/server/api/routers/interview.test.ts#L235-L297))
  - ✅ Added test: "should return feedback as null when includeFeedback is true but feedback not generated yet" ([interview.test.ts:299-351](src/server/api/routers/interview.test.ts#L299-L351))
- [x] **GREEN**: Modify the `getById` procedure in `src/server/api/routers/interview.ts` to conditionally include feedback. Ensure all existing and new tests pass.
  - ✅ Modified input schema to accept `includeFeedback: z.boolean().optional().default(false)` ([interview.ts:155-161](src/server/api/routers/interview.ts#L155-L161))
  - ✅ Changed from `findFirst` to `findUnique` for better performance
  - ✅ Added conditional `include: { feedback: input.includeFeedback }` ([interview.ts:164-171](src/server/api/routers/interview.ts#L164-L171))
  - ✅ Enhanced security logging with `console.warn` ([interview.ts:176-178](src/server/api/routers/interview.ts#L176-L178))
  - ✅ All tests passing (52/52)
- [x] **Refactor (Lobby Page)**: Update the Lobby page to call the modified `getById` procedure with `includeFeedback: false`
  - ✅ Updated lobby page data fetch ([lobby/page.tsx:13-16](src/app/(app)/interview/[interviewId]/lobby/page.tsx#L13-L16))
  - ✅ All lobby page tests still passing (8/8)

### Phase 2: Frontend (RED → GREEN) - IN PROGRESS
- [ ] **RED**: Create and write failing tests for the `feedback/page.tsx` Server Component.
- [ ] **GREEN**: Implement the server-side data fetching and conditional logic in `feedback/page.tsx`.
- [ ] **RED**: Create and write failing tests for the new `FeedbackPolling.tsx` client component.
- [ ] **GREEN**: Create and implement the `FeedbackPolling.tsx` component.

### Phase 3: Documentation
- [ ] Update `docs/10_current_task.md` with the final implementation summary for this feature.
- [ ] Mark all checklist items in this document as complete.

---

## Appendix: Note for Lobby Page Developer

A developer working on the Lobby Page should be aware of the dependency between the backend and frontend changes outlined in this specification.

**Message:**

> Hi,
>
> Please **do not start the refactor** of the Lobby Page to use the `getById` endpoint just yet.
>
> We've identified a dependency: the backend `api.interview.getById` procedure must be updated first to support the new `includeFeedback` flag.
>
> If you change the Lobby Page code before the backend is ready, it will cause errors.
>
> I will let you know as soon as the backend work is complete and you can safely begin the refactor. Thanks!

**Required Code Change:**

Once the backend is updated, the data fetching call in `src/app/(app)/interview/[interviewId]/lobby/page.tsx` must be updated to explicitly set `includeFeedback: false`.

*   **Current Code (Example):**
    ```typescript
    // BEFORE
    const interview = await api.interview.getById({ id: interviewId });
    ```

*   **Required Update:**
    ```typescript
    // AFTER
    const interview = await api.interview.getById({
      id: interviewId,
      includeFeedback: false, // This flag must be explicitly set
    });
    ```