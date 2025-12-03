# Refactor SessionContent.tsx to Eliminate Global State

Based on the simpler and more direct implementation in `raw-worker-test/page.tsx`, we will refactor `SessionContent.tsx` to improve its structure, modularity, and testability, removing any reliance on global state.

## Plan

1.  **Deprecate `useInterviewSocket` and Re-architect Session Logic**:
    -   The `useInterviewSocket.ts` file will be removed entirely.
    -   The core WebSocket connection and transcript management logic will be moved directly into `SessionContent.tsx`. This component will instantiate `RawAudioClient` and `TranscriptManager`, aligning the implementation with the simpler approach in `raw-worker-test/page.tsx`.

2.  **Create a `useAudioSession` Hook**:
    -   To improve modularity, a new custom hook, `useAudioSession`, will be created.
    -   This hook will encapsulate all audio-related logic, including the management of `AudioRecorder` and `AudioPlayer`.
    -   It will expose a simple API to start and stop recording/playback, which will be consumed by `SessionContent.tsx`.

3.  **Unify State Management via URL and Local State**:
    -   **No Global State**: The application will not use a global state manager (e.g., Zustand). The URL and the database (via tRPC) will serve as the single source of truth for the application's high-level state.
        -   `/interview/[id]/session`: Represents the live interview state.
        -   `/interview/[id]/feedback`: Represents the completed interview state.
    -   **Data-Driven State Transitions**: The `SessionContent` component will fetch the interview's status from the database on load using a tRPC query. If the status is `COMPLETED`, it will redirect to the feedback page. This eliminates the need for polling and ensures the UI is always in sync with the backend.
    -   **Local State Machine**: A `useReducer` hook within `SessionContent` will manage the component's internal, ephemeral state for the WebSocket and session lifecycle.
        -   `loading`: The initial tRPC query to fetch interview data is in progress.
        -   `connecting`: The tRPC query is complete, and the client is attempting to connect to the WebSocket.
        -   `live`: The WebSocket is connected and the interview is active.
        -   `ended`: The session has concluded (signaled via WebSocket or user action), and the component is preparing to navigate away.
        -   `error`: An error occurred with either the tRPC query or the WebSocket connection.

4.  **Isolate Debugging UI**:
    -   Move the debugging UI in `SessionContent` to a separate component.
    -   This component can be conditionally rendered based on a development flag.

5.  **Testing Considerations**:
    -   Ensure robust unit testing for the new `useAudioSession` hook in isolation.
    -   Write integration tests for `SessionContent` that cover the full lifecycle, including critical error states (e.g., WebSocket connection failure, microphone permission denied).
