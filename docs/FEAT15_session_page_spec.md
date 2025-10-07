# Real-Time Interview Session Specification

## Feature: Real-Time Interview Session

### Overview
This is the core feature of the application, providing a live, interactive interview experience. The user engages in a conversation with an AI interviewer, with the entire session powered by a real-time, bi-directional WebSocket connection. This page is a fully client-side component that manages the complex state of a live call, including connection status, audio streaming, and transcript display.

---

## API Specification

This feature utilizes both a standard tRPC query for initial state checking and a WebSocket connection for real-time data exchange.

### 1. tRPC API

#### Procedure: `interview.getCurrent`
- **Purpose**: To check if a session is already `IN_PROGRESS` for the current user. This is crucial for handling page reloads or attempts to re-join an active session.
- **Status**: ✅ COMPLETED

#### Contract
```typescript
// Input
void

// Output
(Interview & {
  // any other fields needed for initialization
}) | null

// Errors
- UNAUTHORIZED: User not authenticated (handled by protectedProcedure)
```

### 2. WebSocket API

- **Endpoint**: `ws://localhost:3001` (during development)
- **Protocol**: The communication adheres to the protobuf schema defined in `proto/interview.proto`. See `proto/GEMINI.md` for a detailed flow description.

#### Backend Requirements (WebSocket Server)

1.  **Server Setup**
    -   A new WebSocket server will be created (`src/server/ws/server.ts`).
    -   It will run on a separate port (e.g., 3001) from the main Next.js application.
    -   A new script `pnpm dev:ws` will be added to run this server.

2.  **Connection & Authentication**
    -   On receiving a `ClientToServerMessage` containing a `StartRequest`:
        -   Decode the `auth_token` to authenticate the user session.
        -   Verify that the `interview_id` belongs to the authenticated user.
        -   If authentication or authorization fails, send a `ServerToClientMessage` with an `Error` payload and close the connection.
    -   If successful, send a `ServerToClientMessage` with a `StartResponse`.

3.  **Database & State Management**
    -   Upon successful authentication, update the `Interview` record in the database:
        -   Set `status` from `PENDING` to `IN_PROGRESS`.
        -   Set the `startedAt` timestamp.
    -   On receiving an `EndRequest` from the client:
        -   Update the `Interview` record:
            -   Set `status` to `COMPLETED`.
            -   Set the `endedAt` timestamp.
        -   Send a `SessionEnded` message to the client and gracefully close the connection.

4.  **Streaming (MVP Mock)**
    -   The server will not process incoming `AudioChunk` messages from the client in the MVP.
    -   To simulate the AI interviewer, the server will send a series of pre-defined `PartialTranscript` messages to the client at timed intervals after the session starts.

---

## Frontend Specification

### Page Details
- **Route**: `/interview/[interviewId]/session`
- **Component Type**: **Client Component** (`"use client"`).

### State Management
The component will use a client-side state machine to track the interview's status, based on `docs/04_states.md`.
- **Key States**: `initializing`, `requestingPermissions`, `permissionsDenied`, `connecting`, `live`, `ending`, `error`.
- **Data State**:
    -   `transcript`: An array of transcript entries received from the server.
    -   `aiStatus`: A string representing the AI's current action (e.g., "Listening...", "Speaking...").
    -   `elapsedTime`: A number tracking the seconds since the interview started.

### Component Logic & Lifecycle

1.  **Initial Load (`useEffect` on mount)**
    -   Transition state to `initializing`.
    -   Use `api.interview.getCurrent.useQuery()` to check if an interview is already active. If so, display an appropriate message.
    -   Request microphone permissions via the browser API. On denial, transition to `permissionsDenied` and show an error.
    -   On permission grant, transition to `connecting` and instantiate the WebSocket connection.
    -   Assign event listeners (`onopen`, `onmessage`, `onclose`, `onerror`).

2.  **WebSocket Event Handling**
    -   **`onopen`**: Send the `StartRequest` message, including the `interviewId` and the NextAuth session token.
    -   **`onmessage`**:
        -   On `StartResponse`: Transition state to `live`. Start a client-side timer to track `elapsedTime`.
        -   On `PartialTranscript`: Append the content to the `transcript` state array.
        -   On `SessionEnded`: Transition to `ending` state, then programmatically redirect to the feedback page: `router.push('/interview/[interviewId]/feedback')`.
        -   On `Error`: Transition to `error` state and display the error message from the payload.
    -   **`onclose` / `onerror`**: Transition to `error` state and display a generic "Connection lost" message with a button to return to the dashboard.

3.  **User Interaction**
    -   **"End Interview" Button**:
        -   Triggers the `ending` state.
        -   Sends an `EndRequest` message over the WebSocket.
        -   Disables all controls.

4.  **Cleanup (`useEffect` return function)**
    -   When the component unmounts, ensure the WebSocket connection is properly closed.

### New UI Components

1.  **`TranscriptDisplay.tsx`**
    -   A new client component responsible for rendering the list of transcript entries.
    -   It will receive the `transcript` array as a prop.
    -   It should visually distinguish between `USER` and `AI` speakers.

---

## Test Requirements

### 1. Backend Tests (WebSocket Server)
- **Location**: `src/server/ws/server.test.ts` (new file)
- **Strategy**: A test-specific client will be used to connect to an instance of the WebSocket server to verify its behavior.
- **Test Cases**:
    -   (RED) Write a test to check for a successful connection and authentication flow.
    -   (RED) Write a test to check that an invalid auth token results in a connection closure.
    -   (RED) Write a test to verify the `Interview` status is updated to `IN_PROGRESS` in the DB after `StartRequest`.
    -   (RED) Write a test to verify the `Interview` status is updated to `COMPLETED` after `EndRequest`.

### 2. Frontend Tests
- **Location**: `src/app/(app)/interview/[interviewId]/session/page.test.tsx` (new file)
- **Strategy**: The global `WebSocket` object will be mocked to allow for simulating server messages and asserting the component's reactions.
- **Test Cases**:
    -   (RED) Test that the component initially renders a "Connecting..." or similar status.
    -   (RED) Test that an error UI is shown if microphone permissions are denied.
    -   (RED) Test that a `StartRequest` message is sent when the WebSocket connection opens.
    -   (RED) Test that the main "live" interview UI is rendered upon receiving a `StartResponse`.
    -   (RED) Test that the transcript is updated when `PartialTranscript` messages are received.
    -   (RED) Test that clicking "End Interview" sends an `EndRequest`.
    -   (RED) Test that the component redirects to the feedback page upon receiving a `SessionEnded` message.

---

## Implementation Checklist & TDD Plan

### Phase 1: Backend (WebSocket Server)
- [ ] **Install Deps**: `pnpm add ws @types/ws`.
- [ ] **RED**: Create `src/server/ws/server.test.ts` and write failing tests for the core authentication and state change logic.
- [ ] **GREEN**: Create `src/server/ws/server.ts` and implement the WebSocket server, including DB interactions, to make the tests pass.
- [ ] **Setup**: Create a `dev:ws` script in `package.json` to run the server.

### Phase 2: Frontend (TDD & Implementation)
- [ ] **RED**: Create `src/app/(app)/interview/[interviewId]/session/page.test.tsx` and write failing tests for the state machine and UI rendering.
- [ ] **GREEN (Component Logic)**: Refactor `session/page.tsx` to implement the state machine and WebSocket connection logic. A `useInterviewSocket` custom hook is recommended to encapsulate WebSocket complexity.
- [ ] **GREEN (UI)**: Create the `TranscriptDisplay.tsx` component for rendering the conversation.
- [ ] **VERIFY**: Run all frontend tests and ensure they pass.

### Phase 3: Documentation
- [ ] Update `docs/10_current_task.md` with the final implementation summary for this feature.
- [ ] Mark all checklist items in this document as complete.
