# TECH05: Refactor useInterviewSocket Hook

## Problem Statement
The `useInterviewSocket` hook (~385 lines) is a critical piece of the frontend infrastructure but has become a "God Hook". It handles:
1.  **WebSocket Management**: Connection lifecycle, reconnection, message encoding/decoding.
2.  **Audio Management**: Initialization of `AudioRecorder` and `AudioPlayer`, and piping data between them and the WebSocket.
3.  **Transcript Management**: Merging partial and final transcripts.
4.  **Timer Logic**: Tracking interview duration.

This violates the Single Responsibility Principle and makes the hook difficult to test and debug.

## Refactoring Goals
1.  **Extract Audio Logic**: Move audio setup and stream handling to a custom hook (`useAudioSession`).
2.  **Extract Protocol Logic**: Move Protobuf encoding/decoding to a utility class or hook (`useInterviewProtocol`).
3.  **Simplify Main Hook**: `useInterviewSocket` should orchestrate these sub-hooks rather than implementing them.

## Proposed Architecture

### 1. `useAudioSession` Hook
Encapsulate the `AudioRecorder` and `AudioPlayer`.
*   **Inputs**: `websocket` (to send data), `abortSignal`.
*   **Outputs**: `isAiSpeaking`, `player` instance (for queueing audio).
*   **Responsibilities**:
    *   Starting/stopping recorder and player.
    *   Handling the "Barge-in" logic (clearing player when user speaks).

### 2. `useInterviewProtocol` Hook
Encapsulate the Protobuf logic.
*   **Methods**: `sendMessage(type, payload)`, `decodeMessage(data)`.
*   **Benefits**: The main hook deals with typed objects (e.g., "TranscriptUpdate"), not raw buffers.

### 3. `useInterviewTimer` Hook
Simple hook for the elapsed time logic.

## Implementation Plan

### Step 1: Extract Timer
*   Create `useInterviewTimer`.
*   Move `startTimer`, `stopTimer`, `elapsedTime`.

### Step 2: Extract Protocol Wrapper
*   Create a simple wrapper around the WebSocket to handle `preppal.ClientToServerMessage` encoding and decoding.

### Step 3: Extract Audio Logic
*   Create `useAudioSession.ts`.
*   Move the complex `useEffect` that initializes `AudioRecorder` and `AudioPlayer`.
*   It should accept a callback `onAudioData` (which the main hook uses to send via WS).

### Step 4: Refactor Main Hook
*   Compose the new hooks.
*   The `onMessage` handler becomes cleaner:
    ```typescript
    const msg = protocol.decode(event.data);
    if (msg.audio) audioSession.play(msg.audio);
    if (msg.transcript) transcriptManager.update(msg.transcript);
    ```

## Dependencies & Risks
*   **Synchronization**: Ensure that `AudioSession` waits for the WebSocket to be `OPEN` before trying to send.
*   **Ref Stability**: Be careful with `useEffect` dependencies when passing refs/callbacks between hooks.
