# Refactor SessionContent.tsx

Based on the simpler and more direct implementation in `raw-worker-test/page.tsx`, we will refactor `SessionContent.tsx` to improve its structure, modularity, and testability.

## Plan

1.  **Deprecate and Remove `useInterviewSocket` Hook**:
    -   The `useInterviewSocket.ts` file will be removed entirely.
    -   All logic for managing the WebSocket connection, handling audio, and processing transcripts will be moved directly into the `SessionContent.tsx` component. This component will instantiate `RawAudioClient` and `TranscriptManager` and manage the session's lifecycle using the state machine defined below. This aligns the implementation with the simpler approach in `raw-worker-test/page.tsx`.

2.  **Unify State Management via URL and Local State**:
    -   **No Global State**: The application will not use a global state manager (e.g., Zustand). The URL and the database (via tRPC) will serve as the single source of truth for the application's high-level state.
        -   `/interview/[id]/session`: Represents the live interview state.
        -   `/interview/[id]/feedback`: Represents the completed interview state.
    -   **Data-Driven State Transitions**: The `SessionContent` component will fetch the interview's status from the database on load using a tRPC query. If the status is `COMPLETED`, it will redirect to the feedback page. This eliminates the need for polling and ensures the UI is always in sync with the backend.
    -   **Local State Machine**: A `useReducer` hook within `SessionContent` will manage the component's internal, ephemeral state during the live session.
        -   `loading`: The initial tRPC query to fetch interview data is in progress.
        -   `connecting`: The tRPC query is complete, and the client is attempting to connect to the WebSocket.
        -   `live`: The WebSocket is connected and the interview is active.
        -   `ended`: The session has concluded (signaled via WebSocket or user action), and the component is preparing to navigate away.
        -   `error`: An error occurred with either the tRPC query or the WebSocket connection.

5.  **Isolate Debugging UI**:
    -   Move the debugging UI in `SessionContent` to a separate component.
    -   This component can be conditionally rendered based on a development flag.
