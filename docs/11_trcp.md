# Frontend Data Integration Analysis

This document outlines the findings from an analysis of the frontend pages to identify where hardcoded data is being used instead of dynamic data fetched via tRPC. The goal is to replace these static elements with live data from the backend.

## Pages Requiring tRPC Integration

### 1. Dashboard Page

- **File:** `src/app/(app)/dashboard/page.tsx`
- **Problem:** The "Recent Sessions" section displays hardcoded links to demo interviews (`/interview/demo-123/feedback`, `/interview/demo-456/lobby`).
- **Solution:** This section should be dynamic. A tRPC query is needed to fetch the user's past interview sessions.
    - **Loading State:** The page should display a simple "Loading..." text while the data is being fetched.
    - **Data Fetching:** Fetch the entire list of interviews at once. Do not implement pagination.
    - **Rendering:** Once loaded, map over the list to render a link for each session, pointing to the correct feedback or lobby page.

### 2. Create Interview Page

- **File:** `src/app/(app)/create-interview/page.tsx`
- **Problem:** The form submission is not handled by a tRPC mutation. The "Start Interview" button is a simple `<Link>` that redirects to a hardcoded demo lobby URL (`/interview/demo-new/lobby`).
- **Solution:** The "Start Interview" button should trigger the `api.interview.createSession` tRPC mutation. On a successful response, the client will perform a programmatic redirect to the new interview's lobby page, e.g., `/interview/[newInterviewId]/lobby`.

### 3. Profile Page

- **File:** `src/app/(app)/profile/page.tsx`
- **Problem:** The user profile form is static. The input fields for name, email, and preferences are empty and do not reflect the currently logged-in user's data. The "Save Changes" button is not functional.
- **Solution:**
    1.  **Data Fetching:** Use `api.user.getProfile` to fetch the current user's profile data when the page loads. Returns only `{ name: string | null, email: string | null }` (read-only, populated from NextAuth).
    2.  **Read-Only Display:** The profile page is read-only since login information already includes this data. No update mutation needed.

### 4. Interview Lobby Page

- **File:** `src/app/(app)/interview/[interviewId]/lobby/page.tsx`
- **Problem:** The page displays hardcoded interview details (Type, Duration, Level, Status) and does not fetch data specific to the `interviewId`.
- **Solution:** This page should be a Server Component that fetches data using the `api.interview.getById` tRPC query, passing the `interviewId` from the URL. This will populate the lobby with dynamic details about the specific interview session. The "Start Interview" button will be a standard Next.js `<Link>` to the session page.

### 5. Interview Session Page

- **File:** `src/app/(app)/interview/[interviewId]/session/page.tsx`
- **Problem:** This is a client component that is currently a static mock. It uses hardcoded placeholder values for real-time state and lacks the logic to connect to the real-time backend.
- **Solution:** This page is the primary consumer of the real-time connection.
    1.  On component mount, it will establish a persistent **WebSocket connection** to the backend.
    2.  It will send an initial `StartRequest` message over the WebSocket to authenticate and initialize the live session on the backend.
    3.  All subsequent data (audio streams, AI status, transcripts) will be streamed over this WebSocket, not via tRPC queries. The `api.interview.getCurrent` tRPC query can be used to fetch the initial state if needed before the WebSocket is established.

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

#### `useMutation` for Data Modification

This pattern is used to create, update, or delete data. It provides helpers for handling the mutation's lifecycle.

```typescript
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

function UpdateNameForm() {
  const [name, setName] = useState("");
  const utils = api.useUtils();

  // useMutation provides a function to trigger the change.
  const { mutate, isPending } = api.user.updateProfile.useMutation({
    onSuccess: (updatedUser) => {
      // This runs after the mutation is successful.
      console.log("Profile updated for:", updatedUser.name);

      // Invalidate the `getProfile` query to refetch fresh data.
      void utils.user.getProfile.invalidate();
    },
    onError: (error) => {
      // This runs if the mutation fails.
      console.error("Failed to update profile:", error.message);
    },
  });

  const handleSave = () => {
    mutate({ name });
  };

  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isPending}
      />
      <button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save New Name"}
      </button>
    </div>
  );
}
```

## Endpoint Mapping

This table maps the pages to the official tRPC endpoints as defined in `src/server/api/GEMINI.md`.

| Page | Required Data / Action | Official tRPC Endpoint |
| :--- | :--- | :--- |
| **Dashboard** | Fetch a list of the user's past interviews. | `api.interview.getHistory` |
| **Create Interview** | Create a new interview session record. | `api.interview.createSession` (mutation) |
| **Profile** | Fetch user profile information (read-only). | `api.user.getProfile` |
| **Lobby** | Fetch details for a single, specific interview. | `api.interview.getById` |
| **Feedback** | Fetch all details for an interview, including feedback. | `api.interview.getById` |
| **Session** | Get the currently active interview. | `api.interview.getCurrent` |

## TDD Test Plan

Based on the TDD guide in `docs/02_tdd.md`, this is the proposed set of tests to be written for implementing the endpoints and connecting the frontend pages.

### 1. Profile Page (`getProfile`)

*   **Backend Tests (`/tests/server/routers/user.test.ts`)**
    1.  **(Red)** Write a test for a `user.getProfile` procedure that fails because it doesn't exist.
    2.  **(Red)** The test should call the procedure for a mock user and assert that the returned data contains only `{ name, email }`.

*   **Frontend Tests (`/src/app/(app)/profile/page.test.tsx`)**
    1.  **(Red)** Write a test that renders the `ProfilePage`. Mock the `api.user.getProfile.useQuery` hook to return mock user data (e.g., `{ name: 'John Doe', email: 'john@example.com' }`).
    2.  **(Red)** Assert that the name and email are displayed correctly in the component.

### 2. Dashboard Page (`getHistory`)

*   **Backend Tests (`/tests/server/routers/interview.test.ts`)**
    1.  **(Red)** Write a test for an `interview.getHistory` procedure that fails.
    2.  **(Red)** The test should seed a test database with several mock interviews for a user, call the procedure, and assert that the returned array contains the correct number of lightweight interview objects.

*   **Frontend Tests (`/src/app/(app)/dashboard/page.test.tsx`)**
    1.  **(Red)** Write a test that renders the `DashboardPage`. Mock the `api.interview.getHistory.useQuery` hook to return an array of mock interviews (e.g., `[{ id: '1', status: 'COMPLETED' }, { id: '2', status: 'PENDING' }]`).
    2.  **(Red)** Assert that the component renders two links, one for each interview, with the correct `href` (e.g., `/interview/1/feedback` and `/interview/2/lobby`).

### 3. Create Interview Page (`createSession`)

*   **Backend Tests (`/tests/server/routers/interview.test.ts`)**
    1.  **(Red)** Write a test for an `interview.createSession` mutation that fails.
    2.  **(Red)** The test should call the mutation for a user, then query the test database to assert that a new `Interview` record was created with the correct `userId` and an initial status.

*   **Frontend Tests (`/src/app/(app)/create-interview/page.test.tsx`)**
    1.  **(Red)** Write a test that renders the `CreateInterviewPage`, simulates filling out the form, and clicks the "Start Interview" button.
    2.  **(Red)** Mock the `api.interview.createSession.useMutation` hook and assert that it was called.

### 4. Lobby & Feedback Pages (`getById`)

*   **Backend Tests (`/tests/server/routers/interview.test.ts`)**
    1.  **(Red)** Write a test for an `interview.getById` procedure that fails.
    2.  **(Red)** The test should seed a full interview record (including feedback) in the test database, call the procedure with that ID, and assert that the returned object contains all the correct details.
    3.  **(Red)** Write a security test to ensure that a user cannot fetch an interview that does not belong to them.

*   **Frontend Tests (`/src/app/(app)/interview/[interviewId]/lobby/page.test.tsx`)**
    1.  **(Red)** Write a test that renders the `InterviewLobbyPage`. Mock the `api.interview.getById.useQuery` hook to return a mock interview object.
    2.  **(Red)** Assert that the "Interview Details" (Type, Duration, etc.) are correctly rendered from the mock data.

## Implementation Order

This is the recommended order of implementation, starting with the simplest, most isolated feature and progressing to the most complex. This allows for incremental building and verification.

1.  **Profile Page (`getProfile`)**
    - **Why first?** This is the most isolated feature. It only involves the `User` model (read-only) and doesn't depend on the interview flow, making it perfect for establishing the TDD workflow.

2.  **Create Interview Page (`createSession`)**
    - **Why second?** We must be able to *create* interviews before we can view them. This implements the entry point to the core application flow.

3.  **Dashboard Page (`getHistory`)**
    - **Why third?** Now that interviews can be created, we can implement the page to *list* them. This depends on the `createSession` feature being complete.

4.  **Lobby Page (`getById`)**
    - **Why fourth?** This is the next step in the user journey, requiring a query for a single, specific interview's details.

5.  **Feedback Page (`getById`)**
    - **Why fifth?** This uses the same `api.interview.getById` endpoint as the Lobby and can be implemented immediately after, representing a different view of the same data.

6.  **Interview Session Page (`getCurrent` & WebSocket)**
    - **Why last?** This is the most complex feature, requiring the entire real-time WebSocket infrastructure and depending on all other pieces being in place.

## Router File Locations

This section specifies the file paths for the tRPC routers that will be implemented or modified.

1.  **`interview.ts` (Modify)**
    - **Path:** `/Users/jasonbxu/Documents/GitHub/preppal/src/server/api/routers/interview.ts`
    - **Action:** This file already exists. It needs to be modified to add the missing procedures (`createSession`, `getHistory`, `getById`, `getCurrent`) and to refactor the old `getFeedback` logic into `getById`.

2.  **`user.ts` (Create)**
    - **Path:** `/Users/jasonbxu/Documents/GitHub/preppal/src/server/api/routers/user.ts`
    - **Action:** This file does not exist yet and needs to be created to house the `getProfile` procedure.

## Zod Input Validation Schemas

This section defines the Zod input validation schema for each tRPC procedure to ensure type safety and security.

### `user` Router

1.  **`user.getProfile`**
    - **Schema:** `z.void()`
    - **Reasoning:** This procedure fetches the profile for the currently authenticated user. The user's identity is derived from the session context on the server, so no input is required from the client.


### `interview` Router

1.  **`interview.createSession`**
    - **Schema:** `z.void()`
    - **Reasoning:** This procedure creates an interview for the currently authenticated user. The `userId` is taken from the session context.

2.  **`interview.getHistory`**
    - **Schema:** `z.void()`
    - **Reasoning:** This fetches a list of all interviews belonging to the current user, who is identified by the session context.

3.  **`interview.getById`**
    - **Schema:** `z.object({ id: z.string().cuid() })`
    - **Reasoning:** To fetch a specific interview, the client must provide its unique ID. Using `.cuid()` ensures the ID is in the correct format.

4.  **`interview.getCurrent`**
    - **Schema:** `z.void()`
    - **Reasoning:** This finds the single "active" interview for the current user, who is identified by the session context.

5.  **`interview.getFeedbackStatus`**
    - **Schema:** `z.object({ id: z.string().cuid() })`
    - **Reasoning:** The client must specify which interview it is polling by providing a valid CUID.