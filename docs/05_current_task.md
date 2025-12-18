# Refactor SessionContent.tsx to Eliminate Global State

Based on the simpler and more direct implementation in `raw-worker-test/page.tsx`, we will refactor `SessionContent.tsx` to improve its structure, modularity, and testability, removing any reliance on global state.

## Plan

1.  **Enhance `RawAudioClient` for Production**:
    -   **Current State Analysis**:
        -   Existing Callbacks: `onConnectionStateChange`, `onRecordingStateChange`, `onSpeakingStateChange`, `onTranscriptUpdate`, `onError`.
        -   Missing Functionality: No handling for the "End of Interview" protocol (`EndRequest` -> `SessionEnded`). It acts as a passive streamer.
    -   **Add `endSession()` Method**:
        -   **Goal**: Initiate the graceful shutdown of the interview on the server.
        -   **Implementation**:
            -   Create an `EndRequest` message using `interview_pb.preppal.EndRequest.create()`.
            -   Wrap it in a `ClientToServerMessage`.
            -   Send it via the active WebSocket.
            -   *Crucial*: Do **not** immediately close the WebSocket. Wait for the server to acknowledge with a `SessionEnded` message (or handle timeout in the hook).
    -   **Update Message Handling**:
        -   Update `handleServerMessage` to handle the `sessionEnded` message type.
        -   Add `onSessionEnded` to the `RawClientCallbacks` interface.
        -   Trigger this callback when the server confirms the session is over.
    -   **Resource Cleanup (`cleanup()` method)**:
        -   Ensure the existing `cleanup` logic is robust:
            -   `AudioRecorder`: Call `stop()` to release the microphone.
            -   `AudioPlayer`: Call `stop()`/`clear()` to halt playback.
            -   `WebSocket`: Close the connection if open.

2.  **Create `useAudioSession` Hook**:
    -   Create a new custom hook: `src/app/(app)/interview/[interviewId]/session/useAudioSession.ts`.
    -   **Responsibility**: This hook will act as a React wrapper around the enhanced `RawAudioClient` class, managing the lifecycle of the `RawAudioClient` instance.
    -   **Callback Mapping (Bridge Class to React State)**:
        -   `onConnectionStateChange(state)` → Update `connectionState` (e.g., 'connecting' -> 'connected').
        -   `onRecordingStateChange(isRec)` → Update `isRecording`.
        -   `onSpeakingStateChange(isSpeaking)` → Update `isAiSpeaking`.
        -   `onTranscriptUpdate(update)` → Append/Update `transcript` state. (Note: Ensure `transcript` state accumulates entries correctly).
        -   `onError(errMsg)` → Update `error` state.
        -   `onSessionEnded()` → Perform final cleanup and perhaps update `connectionState` to 'disconnected' or a specific 'completed' state.
    -   **Method Behavior**:
        -   `connect(url, token)`: Should be called explicitly by the consuming component (e.g., `SessionContent`) once the WebSocket token is successfully fetched from tRPC.
        -   `endInterview()`: *Graceful Termination*. Calls `client.endSession()`. This sends the protocol message and waits for the server to acknowledge. Returns a Promise that resolves when the session ends.
        -   `disconnect()`: *Abrupt Termination/Cleanup*. Calls `client.disconnect()`. Immediately closes the socket and stops audio. Used on component unmount or error.
    -   **Type Definitions**:
        ```typescript
        export type ConnectionState = "initializing" | "connecting" | "connected" | "disconnected" | "error";

        export interface TranscriptEntry {
          speaker: "USER" | "AI";
          text: string;
          isFinal: boolean;
        }

        export interface UseAudioSessionReturn {
          connect: (url: string, token: string) => Promise<void>;
          disconnect: () => void;
          endInterview: () => Promise<void>;
          connectionState: ConnectionState;
          isRecording: boolean;
          isAiSpeaking: boolean;
          transcript: TranscriptEntry[];
          error: string | null;
        }
        ```
    -   **API**: It will expose the `UseAudioSessionReturn` interface.

3.  **Refactor `SessionContent.tsx`**:
    -   **Remove Legacy Code**: Delete `useInterviewSocket.ts` and remove all inline WebSocket logic from `SessionContent.tsx`.
    -   **Integrate New Hook**: Consume `useAudioSession` to handle the interview mechanics.
    -   **State & Navigation**:
        -   **Initial Status Check**: Use `api.interview.getById.useQuery({ id: interviewId })`.
            -   If status is `COMPLETED`, redirect immediately to `/interview/${interviewId}/feedback`.
        -   **UI State Machine**:
            We will derive the UI from `interviewQuery` and `useAudioSession` state:
            1.  **State: Loading Data**
                -   *Condition*: `interviewQuery.isLoading`.
                -   *UI*: Generic loading spinner.
                -   *Transition*: When data arrives -> **Connecting** (or Redirect if completed).
            2.  **State: Connecting**
                -   *Condition*: Data loaded AND `connectionState` is `initializing` or `connecting`.
                -   *UI*: "Connecting to Interview..." with status messages.
                -   *Transition*: When `connectionState` becomes `connected` -> **Live**.
            3.  **State: Live**
                -   *Condition*: `connectionState` is `connected`.
                -   *UI*: Main interview interface (Mic, Transcript, Timer).
                -   *Transition*: User clicks "End Interview" -> **Ending**.
            4.  **State: Ending**
                -   *Condition*: Async `endInterview()` is in progress.
                -   *UI*: Disable controls, show "Ending...".
                -   *Transition*: `endInterview()` resolves -> Redirect to Feedback.
            5.  **State: Error**
                -   *Condition*: `connectionState` is `error` OR `interviewQuery.error`.
                -   *UI*: Error message with "Return to Dashboard" button.
        -   **Connection Flow**:
            -   On mount (if status is PENDING/IN_PROGRESS): Fetch WS token -> Call `connect()`.
        -   **End Interview Flow**:
            -   User clicks "End Interview".
            -   Call `await endInterview()`.
            -   On success (Promise resolves), `router.push("/interview/${interviewId}/feedback")`.
    -   **Preserve Existing UI**:
        -   Keep the `InterviewHeader` (timer, status indicator).
        -   Keep the `TranscriptDisplay` area (with auto-scroll logic).
        -   Keep the `InterviewControls` (End button).
        -   Ensure `StatusIndicator` is hooked up to `isAiSpeaking` from the new hook.

4.  **Isolate Debugging UI**:
    -   Move the debugging UI in `SessionContent` to a separate component (`DebugControls.tsx`).
    -   This component can be conditionally rendered based on a development flag.

5.  **Testing Considerations**:
    -   Ensure robust unit testing for the `useAudioSession` hook (mocking `RawAudioClient`).
    -   Write integration tests for `SessionContent` that cover the full lifecycle.