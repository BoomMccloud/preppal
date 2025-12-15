# EPIC02: Real-Time Interview Session Specification

## 1. Overview

This document provides the complete, unified specification for implementing the real-time interview session feature. It is the **single source of truth** for both frontend and backend development, enabling parallel workstreams.

The feature will replace the MVP's mock text stream with a full-duplex, real-time audio pipeline. The user will speak to the AI via their microphone, and the AI will respond with streaming audio. The backend will be a scalable Cloudflare Worker that integrates with the Google Gemini Live API.

---

## 2. Architectural Strategy

The architecture is designed for scalability, performance, and separation of concerns.

1.  **Frontend (Next.js)**: Handles the UI, client-side state management, and user authentication.
2.  **Backend API (Next.js tRPC)**: Manages business logic, database state (e.g., interview status), and generates authentication tokens for the worker.
3.  **Real-Time Engine (Cloudflare Worker)**: Manages the persistent WebSocket connection, state for a single interview session (via Durable Objects), and integrates directly with the Gemini Live API for audio processing.

This clean separation allows the Next.js app to remain stateless and scalable, while the Cloudflare Worker handles the complex, stateful, real-time communication at the edge.

---

## 3. The Unified API Contract

This section defines the complete API contract that both frontend and backend teams must adhere to.

### 3.1. tRPC API (Next.js Backend)

These procedures manage the lifecycle and authorization of an interview session.

#### `interview.generateWorkerToken` (Mutation)

- **Purpose**: Securely authorizes a user to connect to the Cloudflare Worker for a specific interview.
- **Input**: `{ interviewId: string }`
- **Output**: `{ token: string }` (A short-lived JWT)
- **Details**:
  - Must verify the interview is owned by the user and its status is `PENDING`.
  - The JWT payload must contain `userId`, `interviewId`, and an expiration time of 5 minutes.

#### `interview.updateStatus` (Mutation)

- **Purpose**: Updates the interview status. Supports dual authentication (user session or worker shared secret).
- **Input**: `{ interviewId: string, status: z.enum(["IN_PROGRESS", "COMPLETED", "ERROR"]), endedAt?: string }`
- **Details**: Used by the worker to transition the interview to `IN_PROGRESS` or `ERROR`.

#### `interview.submitTranscript` (Mutation)

- **Purpose**: A **worker-only** endpoint to post the final transcript and mark the session as `COMPLETED`.
- **Input**: `{ interviewId: string, transcript: TranscriptEntry[], endedAt: string }`
- **Details**: Must be authenticated via a shared secret. Atomically writes the transcript and updates the interview status in a single transaction.

### 3.2. WebSocket API (Cloudflare Worker)

- **Endpoint Format**: `wss://<worker-url>/<interviewId>?token=<jwt>`
- **Authentication**: The JWT in the query parameter is the sole authentication mechanism for establishing the connection. No separate `StartRequest` message is needed.

### 3.3. Protobuf Schema (`proto/interview.proto`)

This is the definitive schema for all WebSocket communication.

```protobuf
syntax = "proto3";

package preppal;

// =============================================
// Sent from Client to Server
// =============================================

message ClientToServerMessage {
  oneof payload {
    AudioChunk audio_chunk = 1;
    EndRequest end_request = 2;
  }
}

// Contains a chunk of raw audio data from the client's microphone.
message AudioChunk {
  bytes audio_content = 1; // 16-bit LINEAR_PCM, 16kHz, mono
}

// Sent when the user clicks the "End Interview" button.
message EndRequest {}


// =============================================
// Sent from Server to Client
// =============================================

message ServerToClientMessage {
  oneof payload {
    TranscriptUpdate transcript_update = 1;
    AudioResponse audio_response = 2;
    ErrorResponse error = 3;
    SessionEnded session_ended = 4;
  }
}

// Contains a segment of transcribed text from the user or AI.
message TranscriptUpdate {
  string speaker = 1; // "USER" or "AI"
  string text = 2;
  bool is_final = 3; // True if this is a final, corrected transcript segment
}

// Contains a chunk of AI-generated audio data to be played by the client.
message AudioResponse {
  bytes audio_content = 1; // 16-bit LINEAR_PCM, 16kHz, mono
}

// Sent when a recoverable or fatal error occurs.
message ErrorResponse {
  int32 code = 1;       // e.g., 4001 (Auth Error), 4002 (Gemini API Error)
  string message = 2; // "An internal error occurred."
}

// Notifies the client that the session has definitively ended.
message SessionEnded {
  enum Reason {
    REASON_UNSPECIFIED = 0;
    USER_INITIATED = 1; // User clicked "End"
    GEMINI_ENDED = 2;   // AI concluded the interview
    TIMEOUT = 3;        // Session hit 1-hour limit
  }
  Reason reason = 1;
}
```

---

## 4. State Management & Lifecycle

### Backend Status (`Interview` table)

`PENDING` → `IN_PROGRESS` → `COMPLETED` or `ERROR`

1.  **PENDING → IN_PROGRESS**: Triggered when the Cloudflare Worker successfully connects to the Gemini API. The worker calls the `interview.updateStatus` mutation.
2.  **IN_PROGRESS → COMPLETED**: Triggered when the session ends normally (user ends, AI ends, or timeout). The worker calls the `interview.submitTranscript` mutation.
3.  **IN_PROGRESS → ERROR**: Triggered if the Gemini API connection fails. The worker calls `interview.updateStatus`.

### Frontend State (`useInterviewSocket` hook)

✅ **IMPLEMENTED** - `initializing` → `connecting` → `live` → `ending`

- **`initializing`**: Initial state when the hook is first loaded.
- **`connecting`**: Corresponds to the WebSocket connection being established and initializing audio services.
- **`live`**: The session is active. The client is sending user audio and receiving `TranscriptUpdate` and `AudioResponse` messages.
- **`ending`**: The session is over. The client receives a `SessionEnded` message.

Note: We've simplified the state flow by removing the `requestingPermissions` state since audio permissions are handled by the AudioRecorder service.

---

## 5. Parallel Development Plan

✅ **COMPLETED** - 1.  **Contract Implementation**: The backend team immediately updated `proto/interview.proto` with the schema from section 3.3 and generated the corresponding TypeScript code.
✅ **COMPLETED** - 2.  **Mock Server Development**: The backend team's **first priority** was to build and deploy a simple mock WebSocket server that perfectly implements the new contract. It listens for `AudioChunk` messages and responds with a pre-scripted sequence of `TranscriptUpdate` and `AudioResponse` messages.
✅ **COMPLETED** - 3.  **Parallel Workstreams**:
    - **Frontend Team**: Developed the full client experience against the **mock server**. Implemented the audio capture/playback logic and the UI for displaying transcripts and handling session states.
    - **Backend Team**: Worked in parallel on the full-featured Cloudflare Worker with Gemini integration.
⚠️ **IN PROGRESS** - 4.  **Integration**: The production worker is complete, and the frontend application has been updated to work with the new worker URL. Integration testing is in progress.

---

## 6. Implementation Guidance

### Frontend

✅ **Audio Capture**: Use the `AudioWorklet` approach detailed in `FEAT17` to capture 16kHz, 16-bit PCM audio from the microphone.
✅ **Audio Playback**: Use the `AudioWorklet` approach for playback to ensure smooth, non-blocking audio, as detailed in `FEAT17`.
✅ **Message Handling**: The WebSocket `onmessage` handler must now decode `ServerToClientMessage` and switch on the `payload` type:
  - On `transcript_update`: Update the UI state with the new text.
  - On `audio_response`: Pass the `audio_content` buffer to the `AudioPlayer` service for playback.
  - On `error`: Display an appropriate error message to the user.
  - On `session_ended`: Transition the UI to the final feedback page.
✅ **Authentication**: Use `interview.generateWorkerToken` to obtain a JWT for authenticating with the Cloudflare Worker.
✅ **Connection**: Connect to `wss://<WORKER_URL>/<interviewId>?token=<jwt>` instead of sending a `StartRequest` message.

### Backend

- Follow the detailed implementation plan in `FEAT16` for the Cloudflare Worker, Durable Objects, and Gemini API integration.
- The worker must trust the JWT and does not need to expect a `StartRequest` message.
- When handling the AI's response, the worker should send both the `TranscriptUpdate` (with `speaker: "AI"`) and the corresponding `AudioResponse` chunks to the client.

---

## 7. Test Requirements

### Backend (tRPC & Worker)

✅ **Tests for `generateWorkerToken`** must validate ownership and `PENDING` status.
✅ **Tests for `updateStatus` and `submitTranscript`** must validate authentication (session and shared secret) and correct database transactions.
✅ **Worker integration tests (`miniflare`)** must validate:
  - Rejection of invalid JWTs (close code 4001).
  - Successful call to `updateStatus` after Gemini connection.
  - Correct forwarding of `TranscriptUpdate` and `AudioResponse` messages from a mocked Gemini API.
  - Correct handling of `EndRequest`, timeout alarms, and Gemini errors, leading to calls to `submitTranscript` or `updateStatus`.

### Frontend (React Testing Library & Mocks)

✅ **Unit test the `AudioRecorder` and `AudioPlayer` services.**
✅ **Mock the WebSocket and `useInterviewSocket` hook** to test the UI's reaction to all `ServerToClientMessage` types.
✅ **Verify the UI correctly displays user and AI transcripts.**
✅ **Verify the UI correctly handles all states from `initializing` to `ending`.**

### E2E (Playwright)

⚠️ **IN PROGRESS** - The final E2E test should run against the **live integrated system**.
- The test will log in, start an interview, grant microphone permissions, and assert (by inspecting WebSocket traffic) that binary `AudioChunk` messages are sent and that `TranscriptUpdate` and `AudioResponse` messages are received. It will then end the interview and verify redirection.
