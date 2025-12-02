# FEAT17: Updated Implementation Plan for Client-Side Audio

**Purpose**: This document provides an updated, actionable development plan for the frontend portion of the real-time interview feature. It supersedes the implementation details in `FEAT17_client_audio_spec.md` and aligns with the completed backend implementation in `FEAT16`.

---

## 0. Context & Prerequisites

**Backend Status**: The Cloudflare Worker and Gemini integration (FEAT16) are **COMPLETE**.
-   **Worker Command**: `pnpm dev:worker` (runs on `ws://localhost:8787`)
-   **API Endpoint**: `interview.generateWorkerToken` (Implemented in `src/server/api/routers/interview.ts`)

**Code Verification (October 30, 2025)**:
The current frontend code (`src/app/(app)/interview/[interviewId]/session/useInterviewSocket.ts`) is based on the **old specification** and must be refactored.

---

## 1. Core Changes

The new specification (`EPIC02`) and the completed backend (FEAT16) enforce the following:

1.  **New Authentication Flow**: The client uses `interview.generateWorkerToken` to get a short-lived JWT.
2.  **Simplified WebSocket Handshake**: Connect directly via URL with the token. No initial `StartRequest`.
3.  **Rich Server-to-Client Communication**: The worker sends `transcript_update`, `audio_response`, `error`, and `session_ended` messages.
4.  **New Client-to-Server Message**: The client must send an `EndRequest` message to terminate the session.

---

## 2. Revised API and Connection Logic

The `useInterviewSocket` hook must be updated to match the FEAT16 implementation.

### Configuration (New Requirement)

You must add the Worker URL to the environment variables.

1.  Update `.env` (and `.env.example`):
    ```env
    NEXT_PUBLIC_WORKER_URL="ws://localhost:8787"
    ```
2.  Update `src/env.js`:
    ```typescript
    client: {
      NEXT_PUBLIC_WORKER_URL: z.string().url(),
      // ...
    },
    runtimeEnv: {
      NEXT_PUBLIC_WORKER_URL: process.env.NEXT_PUBLIC_WORKER_URL,
      // ...
    }
    ```

### tRPC API Call

-   **OLD**: `interview.generateWsToken`
-   **NEW**: `interview.generateWorkerToken`
-   **Action**: Update the tRPC call in `useInterviewSocket.ts` to use the new mutation.

### WebSocket Connection

-   **OLD**: `ws://localhost:3001` with `StartRequest`.
-   **NEW**: `wss://<NEXT_PUBLIC_WORKER_URL>/<interviewId>?token=<jwt>`
-   **Action**:
    1.  Import `env` from `~/env`.
    2.  Construct the URL: `${env.NEXT_PUBLIC_WORKER_URL}/${interviewId}?token=${token}`.
    3.  Remove `StartRequest` logic.

---

## 3. Updated WebSocket Message Handling

The `onmessage` handler in `useInterviewSocket.ts` must be refactored to handle the Protobuf messages defined in `proto/interview.proto`.

### Sending Messages (`ClientToServerMessage`)

1.  **`AudioChunk`**: Wrap raw audio buffers in `ClientToServerMessage` -> `audio_chunk`.
2.  **`EndRequest`**: Create an `endSession` function that sends `ClientToServerMessage` -> `end_request`.

### Receiving Messages (`ServerToClientMessage`)

Decode incoming `ArrayBuffer` to `ServerToClientMessage`.

```typescript
// inside onmessage
const message = ServerToClientMessage.decode(new Uint8Array(event.data));

switch (message.payload) {
  case 'transcript_update':
    // Handle speaker='USER' vs 'AI'
    // Update transcript state
    break;

  case 'audio_response':
    // Pass audioContent to AudioPlayer
    break;

  case 'error':
    // Handle error state
    break;

  case 'session_ended':
    // Handle session end (redirect or show summary)
    break;
}
```

---

## 4. Revised Implementation Plan

-   [ ] **STEP 0: Config**: Add `NEXT_PUBLIC_WORKER_URL` to `.env` and `src/env.js`.

-   [ ] **RED**: Update tests in `session/page.test.tsx`.
    -   Mock `env.NEXT_PUBLIC_WORKER_URL`.
    -   Verify `generateWorkerToken` is called.
    -   Verify connection URL format.
    -   Mock `ServerToClientMessage` (Protobuf) responses.

-   [ ] **GREEN**: Modify `useInterviewSocket.ts`.
    -   Implement `generateWorkerToken`.
    -   Implement new connection URL logic.
    -   Implement `switch` case for message handling.
    -   Implement `endSession` function.

-   [ ] **REFACTOR**: Ensure clean state management and error handling.

---

## 5. Updated Test Requirements

-   **Unit Tests**: `session/page.test.tsx` (Mocked WebSocket).
-   **Manual/E2E Verification**:
    -   Start the worker: `pnpm dev:worker`
    -   Start the app: `pnpm dev`
    -   Go to `/interview/[id]/session`
    -   Verify:
        -   Permission prompt appears.
        -   Connection establishes (Worker logs "Session started").
        -   Speaking sends audio (Worker logs "Received Audio Chunk").
        -   AI responds (Audio plays back).
        -   "End Interview" works (Worker logs "Session ended").