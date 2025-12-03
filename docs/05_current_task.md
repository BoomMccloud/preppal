# Refactor SessionContent.tsx

Based on the simpler and more direct implementation in `raw-worker-test/page.tsx`, we will refactor `SessionContent.tsx` to improve its structure, modularity, and testability.

## Plan

1.  **Extract `RawAudioClient` and `TranscriptManager` from `useInterviewSocket`**:
    -   The `useInterviewSocket` hook will be refactored to expose instances of `RawAudioClient` and `TranscriptManager`.
    -   `SessionContent` will then instantiate and use these classes directly, similar to `raw-worker-test/page.tsx`.

2.  **Define a Clear State Machine**:
    -   Create a dedicated state management solution (e.g., a custom hook using `useReducer` or a state machine library) to manage the session's lifecycle. This will consolidate the various states (tRPC query status, WebSocket connection, UI interactions) into a single, predictable state object, reducing the complexity of multiple `useState` and `useEffect` hooks.

    -   **Session States:**
        -   `loading`: The initial state when the component mounts. The tRPC query to fetch interview data is in progress.
            -   **Component:** Renders a loading spinner or a skeleton UI.
        -   `connecting`: The tRPC query was successful and we have the necessary data (like the WebSocket URL). The client is now attempting to connect to the WebSocket server.
            -   **Component:** `ConnectingState`. Displays a message like "Connecting to interview session...".
        -   `live`: The WebSocket connection is established and the interview is active. The user can speak, and the system will record, transcribe, and receive responses.
            -   **Component:** `LiveInterview`. This component will contain the `TranscriptDisplay` and `InterviewControls`.
        -   `ended`: The interview has concluded, either by the user manually ending it or by the server terminating the session.
            -   **Component:** Renders a summary view or a message indicating the session is over, with a link to the feedback page.
        -   `error`: An error has occurred. This state should store the error details. The error could originate from the tRPC query or the WebSocket connection.
            -   **Component:** `ErrorState`. Displays an informative error message and a prompt to retry the connection.

3.  **Component Composition**:
    -   Break down the UI of `SessionContent` into smaller, more focused components:
        -   `ConnectingState`: Renders the UI when the WebSocket is connecting.
        -   `ErrorState`: Renders the UI when there is a connection error.
        -   `LiveInterview`: Renders the main interview UI with the transcript and controls.
        -   `Transcript`: A dedicated component for displaying the transcript.

4.  **Adopt a Hybrid Data Fetching Strategy**:
    -   **Initial State Fetch via tRPC**: On component mount, use a single `api.interview.getById.useQuery` to fetch the interview's current status. This is essential for handling initial edge cases, such as the interview already being `COMPLETED`, in which case we can redirect immediately. The polling `refetchInterval` will be removed to avoid unnecessary network requests.
    -   **Real-time Updates via WebSocket**: After the initial check confirms the interview is ready, all subsequent state changes (like the session ending) will be communicated exclusively through the WebSocket connection. This provides a more efficient, event-driven approach and eliminates the need for HTTP polling during the live interview session.

5.  **Isolate Debugging UI**:
    -   Move the debugging UI in `SessionContent` to a separate component.
    -   This component can be conditionally rendered based on a development flag.
