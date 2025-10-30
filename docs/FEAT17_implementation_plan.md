# FEAT17: Updated Implementation Plan for Client-Side Audio

**Purpose**: This document provides an updated, actionable development plan for the frontend portion of the real-time interview feature. It supersedes the implementation details in `FEAT17_client_audio_spec.md` to align with the unified architectural strategy defined in `EPIC02_realtime_interview_session.md`.

---

## 1. Core Changes from the New Specification

The new specification (`EPIC02`) introduces a unified API contract and a clear separation of concerns between the Next.js application and a new Cloudflare Worker for real-time communication. The "echo server" approach is now obsolete.

**Key Changes for the Frontend:**

1.  **New Authentication Flow**: The client will now use a new tRPC endpoint to get a short-lived JWT to authenticate with the real-time server (the Cloudflare Worker).
2.  **Simplified WebSocket Handshake**: The `StartRequest` message has been removed. Authentication is handled entirely by the JWT passed as a query parameter in the WebSocket URL.
3.  **Rich Server-to-Client Communication**: The server will no longer "echo" audio. It will send a variety of messages, including transcript updates, AI audio responses, and session status updates.
4.  **New Client-to-Server Message**: A new `EndRequest` message is required for when the user terminates the session.

---

## 2. Revised API and Connection Logic

The `useInterviewSocket` hook must be updated to reflect the new API contract.

### tRPC API Call

-   **OLD**: `interview.generateWsToken`
-   **NEW**: `interview.generateWorkerToken`
-   **Action**: Update the tRPC call in `useInterviewSocket.ts` to use the new `generateWorkerToken` mutation. The input (`{ interviewId }`) and output (`{ token }`) remain conceptually similar.

### WebSocket Connection

-   **OLD**: `ws://localhost:3001` with a `StartRequest` message sent after connection.
-   **NEW**: `wss://<worker-url>/<interviewId>?token=<jwt>` with **no** initial `StartRequest` message.
-   **Action**:
    1.  Modify the connection logic to construct the WebSocket URL with the `interviewId` and the token received from `generateWorkerToken`.
    2.  Remove all code related to creating and sending the `StartRequest` Protobuf message. The connection is considered authenticated upon a successful `onopen` event.

---

## 3. Updated WebSocket Message Handling

This is the most significant change. The `onmessage` handler in `useInterviewSocket.ts` must be completely refactored.

### Sending Messages (`ClientToServerMessage`)

1.  **`AudioChunk`**: This logic remains. The `AudioRecorder` service will provide audio buffers, which must be wrapped in a `ClientToServerMessage` with the `audio_chunk` payload and sent over the WebSocket.
2.  **`EndRequest`**: **New Requirement**. Create a new function, e.g., `endSession`, in the `useInterviewSocket` hook. This function will:
    -   Create a `ClientToServerMessage` with the `end_request` payload.
    -   Encode and send the message.
    -   Transition the client state to `ending`.

### Receiving Messages (`ServerToClientMessage`)

The `onmessage` handler must decode the incoming `ArrayBuffer` into a `ServerToClientMessage` and use its `oneof payload` field to determine the message type.

```typescript
// In useInterviewSocket.ts, inside the onmessage handler

const message = ServerToClientMessage.decode(new Uint8Array(event.data));

switch (message.payload) {
  case 'transcript_update':
    // Action: Update a new state variable, e.g., `transcript`, with the message content.
    // The UI will render this transcript.
    // Differentiate between `is_final` and intermediate results if needed.
    console.log(`Transcript (${message.transcript_update.speaker}): ${message.transcript_update.text}`);
    break;

  case 'audio_response':
    // Action: Pass the `audio_content` (an ArrayBuffer) to the `AudioPlayer` service.
    // player.enqueue(message.audio_response.audio_content);
    break;

  case 'error':
    // Action: Set the main state to 'error' and store the error details.
    // The UI should display a user-friendly message.
    console.error(`Received error: ${message.error.message}`);
    break;

  case 'session_ended':
    // Action: This is the definitive signal that the session is over.
    // Transition the state to 'ending'.
    // The UI should then trigger the redirect to the feedback page.
    console.log(`Session ended. Reason: ${message.session_ended.reason}`);
    // Perform cleanup (stop recorder, player, close socket).
    break;

  default:
    // Should not happen
    console.warn('Received unknown message type');
    break;
}
```

---

## 4. Revised Implementation Plan for `useInterviewSocket`

This replaces "Phase 4" from the original `FEAT17_client_audio_spec.md`.

-   [ ] **RED**: Update tests in `session/page.test.tsx` to align with the new contract.
    -   Remove tests for sending `StartRequest`.
    -   Add a test to verify the `generateWorkerToken` tRPC procedure is called.
    -   Add tests to mock the reception of each `ServerToClientMessage` type (`transcript_update`, `audio_response`, `error`, `session_ended`) and assert that the hook's state and the UI react correctly.
    -   Add a test to verify that clicking the "End Interview" button triggers the sending of an `EndRequest` message.

-   [ ] **GREEN**: Modify `useInterviewSocket.ts`.
    -   Replace `generateWsToken` with `generateWorkerToken`.
    -   Update the `connect` method to use the new `wss://...` URL format and remove the `StartRequest` logic.
    -   Implement the new `onmessage` handler with the `switch` statement as described above.
    -   Create and expose an `endSession` function that sends the `EndRequest` message.
    -   Integrate the `AudioPlayer` service, calling `player.enqueue()` when an `audio_response` is received.

-   [ ] **REFACTOR**: Ensure the hook's state management is clean and all socket events (`onopen`, `onclose`, `onerror`, `onmessage`) are handled robustly.

## 5. Updated Test Requirements

-   **Unit/Integration Tests (`session/page.test.tsx`)**: Must be updated as described in the section above. The primary goal is to mock the WebSocket and verify that the `useInterviewSocket` hook and UI components correctly handle the **full lifecycle and message contract** defined in `EPIC02`.

-   **E2E Test (`audio-journey.spec.ts`)**: This test must be updated to run against the **mock WebSocket server** provided by the backend team.
    -   The test should still grant microphone permissions.
    -   It must assert (by inspecting WebSocket traffic) that binary `AudioChunk` messages are sent.
    -   It must assert that `ServerToClientMessage` frames are received. You can specifically look for `TranscriptUpdate` and `AudioResponse` messages to confirm the mock server is working as expected.
    -   The test should end the interview by clicking the button and assert that an `EndRequest` message is sent.
