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
3.  **Conditional Data**: The Prisma query must be updated to conditionally include the `feedback` relation based on the `includeFeedback` input flag.
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

1.  **Data Fetching**: `await api.interview.getById({ id: interviewId, includeFeedback: true })` inside a `try...catch` block.

2.  **Error & State Handling**:
    -   **On `catch` (e.g., `NOT_FOUND` error)**: Render an error component: "Feedback not found or you don't have access."
    -   **If `interview.status` is not `COMPLETED`**: Perform a server-side redirect to the lobby page: `redirect('/interview/[interviewId]/lobby')`.
    -   **If `interview.feedback` is `null`**: The interview is complete, but feedback is still processing. Render a dedicated client-side polling component (`<FeedbackPolling>`).
    -   **If `interview.feedback` exists**: Render the main results UI, passing the feedback data to the existing `feedback-tabs.tsx` component.

### New & Modified UI Components

1.  **`feedback/page.tsx` (Server Component)**
    -   Contains the primary server-side fetching and conditional logic.

2.  **`_components/FeedbackPolling.tsx` (New Client Component)**
    -   **Purpose**: To provide a user-friendly "processing" state while waiting for feedback.
    -   **UI**: Displays a message like "Your feedback is being generated. This may take a minute..." along with a loading spinner.
    -   **Logic**: Uses a custom `useInterval` hook to trigger `api.interview.getById.useQuery({ id: interviewId, includeFeedback: true })`.
    -   **On Success**: When the query returns data where `feedback` is not `null`, it should trigger a page refresh to re-run the server component data fetch: `router.refresh()`.

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

- **Location for Polling Component**: `src/app/(app)/interview/[interviewId]/feedback/_components/FeedbackPolling.test.tsx` (new file)
- **Strategy**: Mock the `useQuery` hook for `getById`.
- **Test Cases**:
    -   (RED) Test that it calls `useQuery` with `{ includeFeedback: true }`.
    -   (RED) Test that it calls `router.refresh()` when the query returns a non-null `feedback` object.

---

## Implementation Checklist & TDD Plan

### Phase 1: Backend (RED → GREEN)
- [ ] **RED**: Add failing tests to `interview.test.ts` for the new `includeFeedback: true` functionality in `getById`.
- [ ] **GREEN**: Modify the `getById` procedure in `src/server/api/routers/interview.ts` to conditionally include feedback. Ensure all existing and new tests pass.
- [ ] **Refactor**: Update the Lobby page at `src/app/(app)/interview/[interviewId]/lobby/page.tsx` to call `getById` without the `includeFeedback` flag, ensuring it continues to work as expected.

### Phase 2: Frontend (RED → GREEN)
- [ ] **RED**: Create and write failing tests for the `feedback/page.tsx` Server Component.
- [ ] **GREEN**: Implement the server-side data fetching and conditional logic in `feedback/page.tsx`.
- [ ] **RED**: Create and write failing tests for the new `FeedbackPolling.tsx` client component.
- [ ] **GREEN**: Create and implement the `FeedbackPolling.tsx` component.

### Phase 3: Documentation
- [ ] Update `docs/10_current_task.md` with the final implementation summary for this feature.
- [ ] Mark all checklist items in this document as complete.
