# Frontend Data Integration Analysis

This document outlines the findings from an analysis of the frontend pages to identify where hardcoded data is being used instead of dynamic data fetched via tRPC. The goal is to replace these static elements with live data from the backend.

## Pages Requiring tRPC Integration

### 1. Dashboard Page - ✅ COMPLETED

- **File:** `src/app/(app)/dashboard/page.tsx`
- **Problem:** The "Recent Sessions" section displays hardcoded links to demo interviews (`/interview/demo-123/feedback`, `/interview/demo-456/lobby`).
- **Solution:** This section should be dynamic. A tRPC query is needed to fetch the user's past interview sessions.
  - **Loading State:** The page should display a simple "Loading..." text while the data is being fetched.
  - **Data Fetching:** Fetch the entire list of interviews at once. Do not implement pagination.
  - **Rendering:** Once loaded, map over the list to render a link for each session, pointing to the correct feedback or lobby page.

### 2. Create Interview Page - ✅ COMPLETED

- **File:** `src/app/(app)/create-interview/page.tsx`
- **Problem:** The form submission is not handled by a tRPC mutation. The "Start Interview" button is a simple `<Link>` that redirects to a hardcoded demo lobby URL (`/interview/demo-new/lobby`).
- **Solution:** The "Start Interview" button should trigger the `api.interview.createSession` tRPC mutation, passing a structured input object for the `jobDescription` and `resume` (e.g., `{ type: 'text', content: '...' }`). On a successful response, the client will perform a programmatic redirect to the new interview's lobby page, e.g., `/interview/[newInterviewId]/lobby`.

#### Idempotency for Creation

To prevent users from accidentally creating duplicate interview sessions (e.g., by double-clicking the "Start Interview" button), we will implement an idempotency check.

1.  **Client-Side:** The `create-interview` page will generate a unique UUID when it first loads and store it in state. This key will be sent with the `createSession` mutation.

    ```typescript
    // In create-interview/page.tsx
    const [idempotencyKey] = useState(() => crypto.randomUUID());

    // ... in the mutate call
    mutate({
      // ... other fields
      idempotencyKey,
    });
    ```

2.  **API & Validation:** The `CreateSessionInput` Zod schema in the `interview` router must be updated to include the key.

    ```typescript
    export const CreateSessionInput = z.object({
      // ... other fields
      idempotencyKey: z.string().uuid(),
    });
    ```

3.  **Database:** The `Interview` model in `prisma/schema.prisma` must be updated with a field to store this key, and a unique constraint must be applied to it.

    ```prisma
    // In prisma/schema.prisma, inside the Interview model
    model Interview {
      // ...
      idempotencyKey String @unique
    }
    ```

    _Note: After modifying the schema, run `pnpm db:push` to apply the changes._

4.  **Backend Logic:** The `createSession` tRPC mutation will pass the `idempotencyKey` to the `db.interview.create` call. If the key already exists, Prisma will throw a unique constraint violation error. This error should be caught, and the backend should respond with a `CONFLICT` tRPC error to inform the client that this was a duplicate request.

5.  **TDD Test:** A new backend test should be added to verify that calling the mutation twice with the same `idempotencyKey` results in the second call failing with a `CONFLICT` error.

### 3. Profile Page - ✅ COMPLETED

- **File:** `src/app/(app)/profile/page.tsx`
- **Problem:** The user profile form is static. The input fields for name, email, and preferences are empty and do not reflect the currently logged-in user's data. The "Save Changes" button is not functional.
- **Solution:**
  1.  **Data Fetching:** Use `api.user.getProfile` to fetch the current user's profile data when the page loads. Returns only `{ name: string | null, email: string | null }` (read-only, populated from NextAuth).
  2.  **Read-Only Display:** The profile page is read-only since login information already includes this data. No update mutation needed.

### 4. Interview Lobby Page - ✅ COMPLETED

- **File:** `src/app/(app)/interview/[interviewId]/lobby/page.tsx`
- **Status:** ✅ Fully implemented as Server Component with all status handling and error states
- **Implementation Details:**
  - Server-side data fetching using `await api.interview.getById.query({ id })`
  - Status-based logic: COMPLETED → redirect, IN_PROGRESS/ERROR → error UI, PENDING → lobby UI
  - Job description truncation (100 characters + "...")
  - Error handling for NOT_FOUND with security message
  - Pre-interview checklist UI with camera/microphone status
  - "Start Interview" link to session page
  - "Return to Dashboard" link on all error states
- **Tests:** 8/8 passing (see `src/app/(app)/interview/[interviewId]/lobby/page.test.tsx`)
- **Specification:** Full details in `docs/06_lobby_page_spec.md`

### 5. Interview Session Page

- **File:** `src/app/(app)/interview/[interviewId]/session/page.tsx`
- **Problem:** This is a client component that is currently a static mock. It uses hardcoded placeholder values for real-time state and lacks the logic to connect to the real-time backend.
- **Solution:** This page is the primary consumer of the real-time connection.
  1.  On component mount, it will establish a persistent **WebSocket connection** to the backend.
  2.  It will send an initial `StartRequest` message over the WebSocket to authenticate and initialize the live session on the backend.
  3.  All subsequent data (audio streams, AI status, transcripts) will be streamed over this WebSocket, not via tRPC queries. The `api.interview.getCurrent` tRPC query can be used to fetch the initial state if needed before the WebSocket is established.

### Server vs. Client Components: A Quick Guide

In the Next.js App Router, components are **Server Components by default**. You should only opt into using **Client Components** when necessary. Here’s a guide for this project:

#### When to Use Server Components

- **Data Fetching:** Use them for pages that need to fetch initial data on the server (e.g., using `await api.interview.getById(...)`). This is efficient and secure.
- **No Interactivity:** For components or pages that just display information without responding to user events.
- **Passing Data:** They act as the entry point for a route, fetching data and passing it as props to Client Components.

#### When to Use Client Components (`"use client"`)

- **Interactivity:** If your component needs to use React hooks like `useState`, `useEffect`, or `useReducer`.
- **Event Listeners:** For handling user actions like `onClick`, `onChange`, etc.
- **tRPC Hooks:** Any component that uses `api.some.procedure.useQuery()` or `api.some.procedure.useMutation()` must be a Client Component.

#### Component Strategy for Pages

| Page                 | File                        | Recommended Type | Justification                                                                                                                                                                           |
| :------------------- | :-------------------------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**        | `dashboard/page.tsx`        | Client           | Needs `useQuery` to fetch the interview history and `useState` for the loading state.                                                                                                   |
| **Create Interview** | `create-interview/page.tsx` | Client           | Needs `useState` for form inputs and `useMutation` to submit the form.                                                                                                                  |
| **Profile**          | `profile/page.tsx`          | Client           | Needs `useQuery` to fetch the user's profile data.                                                                                                                                      |
| **Lobby**            | `lobby/page.tsx`            | Server           | Fetches data on the server with `await api.interview.getById(...)`. This is the established architectural pattern for data-display pages, as finalized in `docs/06_lobby_page_spec.md`. |
| **Feedback**         | `feedback/page.tsx`         | Server           | Already implemented as a Server Component. It fetches data and passes it to the client-side `feedback-tabs.tsx`.                                                                        |
| **Session**          | `session/page.tsx`          | Client           | The most complex client component. Manages real-time state, WebSockets, and user interaction via `useState` and `useEffect`.                                                            |

## Code Examples & Best Practices

These files and patterns serve as excellent examples for development.

### 1. Best for Server-Side tRPC Queries: `feedback/page.tsx`

- **File:** `src/app/(app)/interview/[interviewId]/feedback/page.tsx`
- **Why it's a great example:** This is the best illustration of the pattern we need to implement across the other pages.
  1.  It's a **React Server Component** that can fetch data directly on the server.
  2.  It correctly extracts a dynamic parameter (`interviewId`) from the URL.
  3.  It calls the tRPC API on the server (`await api.interview.getFeedback(...)`) to fetch data specific to that parameter.
  4.  It then passes that data down to client components as props, separating data fetching from presentation.

### 2. Best for Presentational Client Components: `feedback-tabs.tsx`

- **File:** `src/app/(app)/interview/[interviewId]/feedback/feedback-tabs.tsx`
- **Why it's a great example:** This component is a perfect example of a "dumb" or "presentational" component.
  1.  It uses the `"use client"` directive.
  2.  It has no data-fetching logic. It receives all the data it needs to display via props.
  3.  It manages its own internal UI state (`useState` for the active tab) without mixing it with business logic.
  4.  This separation of concerns makes it highly reusable and easy to test.

### 3. Best for Basic Server-Side Data: `page.tsx` (Root)

- **File:** `src/app/page.tsx`
- **Why it's a great example:** This is the most fundamental example of a Server Component. It demonstrates how to fetch non-tRPC server-side data (in this case, the session from `auth()`) and perform conditional rendering based on the result.

### 4. tRPC Client Patterns (`useQuery` & `useMutation`)

While the examples above focus on server-side fetching, here is how to use tRPC's hooks on the client for dynamic data fetching and mutations.

#### `useQuery` for Data Fetching

This pattern is used in client components that need to fetch data, for example, to display user-specific content without server-rendering it.

```typescript
"use client";

import { api } from "~/trpc/react";

function UserGreeting() {
  // useQuery fetches data and handles loading/error states.
  // The data is automatically typed based on your API definition.
  const { data: user, isLoading, error } = api.user.getProfile.useQuery();

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  // `user` is fully typed and can be used safely.
  return <h1>Welcome, {user?.name ?? 'Guest'}!</h1>;
}
```

#### `useMutation` for Data Modification & Redirects

This pattern is used to create, update, or delete data. The `onSuccess` callback is the perfect place to handle programmatic redirects after a successful mutation.

```typescript
"use client";

import { useRouter } from "next/navigation"; // Correct import for App Router
import { api } from "~/trpc/react";

function CreateInterviewButton() {
  const router = useRouter();

  // useMutation provides a function to trigger the change
  const { mutate, isPending } = api.interview.createSession.useMutation({
    onSuccess: (interview) => {
      // This runs after the mutation is successful.
      // The `interview` object is the return value from the tRPC procedure.
      console.log("Created interview with ID:", interview.id);

      // Programmatically redirect to the new interview's lobby page.
      router.push(`/interview/${interview.id}/lobby`);
    },
    onError: (error) => {
      // This runs if the mutation fails.
      console.error("Failed to create interview:", error.message);
      // Here you might show a toast notification to the user.
    },
  });

  const handleStart = () => {
    // For the MVP, we send the text content from the form.
    // This assumes you have the state for jdText and resumeText.
    mutate({
      jobDescription: { type: "text", content: jdText },
      resume: { type: "text", content: resumeText },
    });
  };

  return (
    <button onClick={handleStart} disabled={isPending}>
      {isPending ? "Creating..." : "Start Interview"}
    </button>
  );
}
```

#### Form State Management (`useState`)

For the "Create Interview" page, manage the `jdText` and `resumeText` inputs using React's `useState` hook. This approach is lightweight, requires no external libraries for this simple use case, and integrates cleanly with the `useMutation` hook.

The example below includes logic for the UX and interaction requirements.

**Example:**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

function CreateInterviewPage() {
  const router = useRouter();
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");

  const { mutate, isPending } = api.interview.createSession.useMutation({
    onSuccess: (interview) => {
      router.push(`/interview/${interview.id}/lobby`);
    },
    onError: (error) => {
      // 1. Show a generic toast notification for the error.
      console.error("Failed to create interview:", error.message);
      // e.g., toast.error("Something went wrong. Please try again.");
    },
  });

  const handleStart = () => {
    mutate({
      jobDescription: { type: "text", content: jdText },
      resume: { type: "text", content: resumeText },
    });
  };

  // 3. Disable button if fields are empty or form is submitting.
  const isButtonDisabled = isPending || jdText.trim() === "" || resumeText.trim() === "";

  return (
    <>
      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste the job description here..."
        // 2. Disable textarea when loading.
        disabled={isPending}
      />
      <textarea
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        placeholder="Paste your resume here..."
        // 2. Disable textarea when loading.
        disabled={isPending}
      />
      <button onClick={handleStart} disabled={isButtonDisabled}>
        {isPending ? "Creating..." : "Start Interview"}
      </button>
    </>
  );
}
```

##### UX and Interaction Requirements

- **Error Handling:** On a mutation `onError`, display a generic toast notification to the user (e.g., "Something went wrong. Please try again."). Specific error messages will be handled in a future iteration.
- **Loading State:** While the mutation is `isPending` (showing "Creating..."), both the "Job Description" and "Resume" text areas should be disabled (e.g. grayed out) to prevent edits during submission.
- **Client-Side Validation:** The "Start Interview" button must be disabled if either of the text fields is empty.

## Endpoint Mapping

This table maps the pages to the official tRPC endpoints as defined in `src/server/api/GEMINI.md`.

| Page | Required Data / Action | Official tRPC Endpoint |
| :--- | :--- | :--- |
| **Dashboard** | Fetch a list of the user's past interviews. | `api.interview.getHistory` |
| **Create Interview** | Create a new interview session record. | `api.interview.createSession` (mutation) |
| **Profile** | Fetch user profile information (read-only). | `api.user.getProfile` |
| **Lobby** | Fetch details for a single, specific interview. | `api.interview.getById` |
| **Feedback** | Fetch all details for an interview, including feedback. | `api.interview.getFeedback` |
| **Session** | Get the currently active interview. | `api.interview.getCurrent` |

> **Note on `getById`:**
> The `getById` procedure has been refactored to serve multiple pages. It accepts an optional `includeFeedback: boolean` flag to conditionally fetch the full feedback object. The Lobby page calls it without the flag, while the Feedback page calls it with `includeFeedback: true`.

## TDD Test Plan

Based on the TDD guide in `docs/02_tdd.md`, this is the proposed set of tests to be written for implementing the endpoints and connecting the frontend pages.

### Test Setup Requirements

Before writing tests, ensure the following setup is complete:

1.  **Vitest Configuration** - Add path alias resolution to `vitest.config.ts`:

    ```typescript
    import path from "path";

    export default defineConfig({
      resolve: {
        alias: {
          "~": path.resolve(__dirname, "./src"),
        },
      },
      // ... rest of config
    });
    ```

2.  **Backend Test Mocking Pattern** - For tRPC router tests, mock both the database and auth modules:

    ```typescript
    import { describe, it, expect, beforeEach, vi } from "vitest";
    import type { Session } from "next-auth";

    // Mock NextAuth to avoid test environment issues
    vi.mock("~/server/auth", () => ({
      auth: vi.fn(),
    }));

    // Mock Prisma for unit testing (per docs/02_tdd.md)
    vi.mock("~/server/db", () => ({
      db: {
        user: {
          findUnique: vi.fn(),
        },
      },
    }));
    ```

3.  **Frontend Test Mocking Pattern** - For client components using tRPC:

    ```typescript
    import { vi } from "vitest";

    // Create mock function outside vi.mock()
    const mockUseQuery = vi.fn();

    // Mock the tRPC module
    vi.mock("~/trpc/react", () => ({
      api: {
        user: {
          getProfile: {
            useQuery: () => mockUseQuery(),
          },
        },
      },
    }));
    ```

### 1. Profile Page (`getProfile`) - ✅ COMPLETED

- **Backend Tests (`src/server/api/routers/user.test.ts`)**
  1.  **(Red)** Write a test for a `user.getProfile` procedure that fails because it doesn't exist.
  2.  **(Red)** The test should call the procedure for a mock user and assert that the returned data contains only `{ name, email }`.
  3.  **Implementation Notes:**
      - Use mocked Prisma (not real database) for unit testing
      - Mock `db.user.findUnique` to return test data
      - Create tRPC caller with mock session context
      - Verify the procedure queries with correct `where` clause and `select` fields

- **Frontend Tests (`src/app/(app)/profile/page.test.tsx`)**
  1.  **(Red)** Write a test that renders the `ProfilePage`. Mock the `api.user.getProfile.useQuery` hook to return mock user data (e.g., `{ name: 'John Doe', email: 'john@example.com' }`).
  2.  **(Red)** Assert that the name and email are displayed correctly in the component.
  3.  **(Red)** Assert that a loading state is displayed while `isLoading` is true.
  4.  **Implementation Notes:**
      - ProfilePage must be a client component (`"use client"`)
      - Input fields should be `readOnly` (profile is read-only)
      - Remove unused UI elements (like "Save Changes" button or Interview Preferences)

### 2. Dashboard Page (`getHistory`)

- **Backend Tests (`src/server/api/routers/interview.test.ts`)**
  1.  **(Red)** Write a test for an `interview.getHistory` procedure that fails.
  2.  **(Red)** The test should seed a test database with several mock interviews for a user, call the procedure, and assert that the returned array contains the correct number of lightweight interview objects.

- **Frontend Tests (`src/app/(app)/dashboard/page.test.tsx`)**
  1.  **(Red)** Write a test that renders the `DashboardPage`. Mock the `api.interview.getHistory.useQuery` hook to return an array of mock interviews (e.g., `[{ id: '1', status: 'COMPLETED' }, { id: '2', status: 'PENDING' }]`).
  2.  **(Red)** Assert that the component renders two links, one for each interview, with the correct `href` (e.g., `/interview/1/feedback` and `/interview/2/lobby`).

### 3. Create Interview Page (`createSession`)

- **Backend Tests (`/tests/server/routers/interview.test.ts`)**
  1.  **(Red)** Write a test for an `interview.createSession` mutation that fails.
  2.  **(Red)** The test should call the mutation with a mock structured input (e.g., `{ type: 'text', content: '...' }`). It should then query the test database to assert that a new `Interview` record was created with the correct `userId`, a status of `PENDING`, and that the snapshot fields match the input content.
  3.  **Implementation Notes:**
      - The `createSession` procedure should be added to the existing router file at `src/server/api/routers/interview.ts`.

- **Frontend Tests (`src/app/(app)/create-interview/page.test.tsx`)**
  1.  **(Red)** Write a test that renders the `CreateInterviewPage`, simulates filling out the two text areas, and clicks the "Start Interview" button.
  2.  **(Red)** Mock the `api.interview.createSession.useMutation` hook and assert that it was called with the correct structured input, e.g., `{ jobDescription: { type: 'text', content: '...' } }`.

### 4. Lobby & Feedback Pages (`getById`) - ✅ COMPLETED

- **Backend Tests (`src/test/integration/dashboard.test.ts`)** - ✅ COMPLETED
  1.  ✅ `getById` procedure implemented and tested (5/5 tests passing)
  2.  ✅ Tests verify correct data return with all required fields
  3.  ✅ Security tests ensure users cannot fetch interviews belonging to others
  4.  ✅ NOT_FOUND error handling with security logging implemented

- **Frontend Tests (`src/app/(app)/interview/[interviewId]/lobby/page.test.tsx`)** - ✅ COMPLETED
  1.  ✅ All tests for `LobbyPage` Server Component written and passing (8/8 tests)
  2.  ✅ Tests verify `redirect()` is called when status is `COMPLETED`
  3.  ✅ Tests verify correct error UI for IN_PROGRESS and ERROR statuses
  4.  ✅ Tests verify main lobby UI renders correctly for PENDING status
  5.  ✅ Tests verify job description truncation logic
  6.  ✅ Tests verify NOT_FOUND error handling

## Implementation Order

This is the recommended order of implementation, starting with the simplest, most isolated feature and progressing to the most complex. This allows for incremental building and verification.

1.  ✅ **Profile Page (`getProfile`)** - COMPLETED
    - **Why first?** This is the most isolated feature. It only involves the `User` model (read-only) and doesn't depend on the interview flow, making it perfect for establishing the TDD workflow.

2.  ✅ **Create Interview Page (`createSession`)** - COMPLETED
    - **Why second?** We must be able to _create_ interviews before we can view them. This implements the entry point to the core application flow.

3.  ✅ **Dashboard Page (`getHistory`)** - COMPLETED
    - **Why third?** Now that interviews can be created, we can implement the page to _list_ them. This depends on the `createSession` feature being complete.

4.  ✅ **Lobby Page (`getById`)** - COMPLETED
    - **Why fourth?** This is the next step in the user journey, requiring a query for a single, specific interview's details.

5.  **Feedback Page (`getById`)** - PENDING
    - **Why fifth?** This uses the same `api.interview.getById` endpoint as the Lobby and can be implemented immediately after, representing a different view of the same data.

6.  **Interview Session Page (`getCurrent` & WebSocket)** - PENDING
    - **Why last?** This is the most complex feature, requiring the entire real-time WebSocket infrastructure and depending on all other pieces being in place.

## Router File Locations

This section specifies the file paths for the tRPC routers that will be implemented or modified.

1.  **`interview.ts` (Modify)**
    - **Path:** `/Users/jasonbxu/Documents/GitHub/preppal/src/server/api/routers/interview.ts`
    - **Action:** This file already exists. It needs to be modified to add the missing procedures (`createSession`, `getHistory`, `getById`, `getCurrent`) and to refactor the old `getFeedback` logic into `getById`.

2.  **`user.ts` (Create)** - ✅ COMPLETED
    - **Path:** `src/server/api/routers/user.ts`
    - **Action:** Created with the `getProfile` procedure.
    - **Registration:** After creating, must register in `src/server/api/root.ts`:

      ```typescript
      import { userRouter } from "~/server/api/routers/user";

      export const appRouter = createTRPCRouter({
        user: userRouter,
        interview: interviewRouter,
      });
      ```

## Data Snapshot Strategy

To handle different input sources (raw text, URLs, library items) in a scalable way, the `createSession` mutation will use a flexible "dispatcher" pattern. This keeps the API endpoint stable for the future.

The input for `jobDescription` and `resume` will be a structured object that defines the `type` of the source. The backend will then use a helper function to resolve this input into a text snapshot before saving it to the database.

**Example Backend Logic:**

```typescript
// Helper function to resolve input to a text snapshot
async function getSnapshotText(
  input: z.infer<typeof JobOrResumeInput>,
): Promise<string> {
  switch (input.type) {
    case "text":
      return input.content; // MVP implementation
    case "url":
      // Future implementation: call a web scraper
      throw new Error("URL inputs are not supported yet.");
    case "library":
      // Future implementation: fetch from the database
      throw new Error("Library inputs are not supported yet.");
    default:
      throw new Error("Invalid input type.");
  }
}

// In the createSession mutation...
const jdSnapshot = await getSnapshotText(input.jobDescription);
const resumeSnapshot = await getSnapshotText(input.resume);

// ...then create the interview record with these snapshots.
```

This approach is ideal for the MVP as it provides a clear path for future expansion without requiring disruptive changes to the API contract.

## Zod Input Validation Schemas

This section defines the Zod input validation schema for each tRPC procedure to ensure type safety and security.

### `user` Router

1.  **`user.getProfile`**
    - **Schema:** `z.void()`
    - **Reasoning:** This procedure fetches the profile for the currently authenticated user. The user's identity is derived from the session context on the server, so no input is required from the client.

### `interview` Router

1.  **`interview.createSession`**
    - **Schema:**

      ```typescript
      const JobOrResumeInput = z.discriminatedUnion("type", [
        z.object({ type: z.literal("text"), content: z.string().min(1) }),
        z.object({ type: z.literal("url"), url: z.string().url() }),
        z.object({ type: z.literal("library"), id: z.string().cuid() }),
      ]);

      export const CreateSessionInput = z.object({
        jobDescription: JobOrResumeInput,
        resume: JobOrResumeInput,
      });
      ```

    - **Reasoning:** This schema uses a discriminated union to create a flexible and future-proof API. It can accept raw text (for the MVP), and can be extended to accept URLs or library item IDs in the future without changing the API signature. The frontend for the MVP will send `{ type: 'text', content: '...' }`.

2.  **`interview.getHistory`**
    - **Schema:** `z.void()`
    - **Reasoning:** This fetches a list of all interviews belonging to the current user, who is identified by the session context.

3.  **`interview.getById`**
    - **Schema:** `z.object({ id: z.string().cuid(), includeFeedback: z.boolean().optional() })`
    - **Reasoning:** To fetch a specific interview, the client must provide its unique ID. The optional `includeFeedback` flag allows the caller to request the full feedback object, making this a versatile endpoint for both the lobby and feedback pages.

4.  **`interview.getCurrent`**
    - **Schema:** `z.void()`
    - **Reasoning:** This finds the single "active" interview for the current user, who is identified by the session context.

5.  **`interview.getFeedbackStatus`**
    - **Schema:** `z.object({ id: z.string().cuid() })`
    - **Reasoning:** The client must specify which interview it is polling by providing a valid CUID.
