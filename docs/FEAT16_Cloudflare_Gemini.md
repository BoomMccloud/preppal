# EPIC: Cloudflare Worker & Gemini API Integration Specification

## Feature: Real-Time Backend with Cloudflare and Gemini

### Overview

This document outlines the architecture and implementation plan for replacing our mock WebSocket server with a production-grade, scalable, real-time backend. This new backend will be built on **Cloudflare Workers with Durable Objects** and will integrate with the **real Google Gemini Live API** for audio processing and AI interaction.

This marks the transition from a simulated MVP to a fully functional, scalable application core.

---

## Architectural Strategy: From Mock to Production

The initial MVP successfully used a WebSocket server integrated within our Next.js application. While excellent for rapid development and validation, this approach is not ideal for a stateful, real-time application at scale.

We are evolving our architecture for the following reasons:

1.  **Scalability & Statefulness**: Serverless platforms like Vercel are optimized for stateless HTTP requests. Cloudflare Durable Objects are purpose-built to manage state for long-lived connections, providing a dedicated, stateful "mini-server" for each interview session.
2.  **Separation of Concerns**: This architecture cleanly separates responsibilities. The Next.js application handles business logic and data persistence, while the Cloudflare Worker manages the intense, specialized task of real-time audio streaming and state management at the edge.
3.  **Performance & Cost**: Leveraging Cloudflare's global network for WebSocket termination reduces latency. The Durable Object pricing model, based on active use, is more cost-effective for this use case than keeping a serverless function constantly active.

For a visual representation of this new architecture, please refer to the updated **[System Design Document](./01_design.md)**.

---

## Detailed Implementation Guidance

This section provides answers to common implementation questions to ensure clarity for the developer.

### Environment & Secrets Management

1.  **Secret Generation**: The `JWT_SECRET`, `WORKER_SHARED_SECRET`, and `GEMINI_API_KEY` must be securely generated/obtained:
    *   Use a password manager or a command-line tool like `openssl rand -hex 32` to create two unique, random strings of at least 32 characters each for `JWT_SECRET` and `WORKER_SHARED_SECRET`.
    *   Obtain a `GEMINI_API_KEY` from the Google AI Studio console.
2.  **Secret Storage**:
    *   In the Next.js app (Vercel), store these as standard environment variables.
    *   In the Cloudflare Worker, use [Wrangler secrets](https://developers.cloudflare.com/workers/wrangler/commands/#secret) to securely store `JWT_SECRET`, `WORKER_SHARED_SECRET`, and `GEMINI_API_KEY`. This prevents them from being exposed in plaintext.
    *   Example: `wrangler secret put JWT_SECRET`

### Wrangler Configuration & Development

1.  **Initial Setup**: Start with a known working Cloudflare Worker + Durable Objects template. Research a basic template that includes:
    *   Durable Object binding configuration
    *   WebSocket handling example
    *   `nodejs_compat` compatibility flag
2.  **Development & Testing**:
    *   Follow the Cloudflare Workers testing guide: https://developers.cloudflare.com/workers/development-testing/
    *   Use `wrangler dev` to run the worker locally during development
    *   The local worker will be accessible at a different URL than the Next.js app (e.g., `localhost:8787`)
3.  **Key Configuration Requirements** in `wrangler.toml`:
    *   Enable `nodejs_compat` compatibility flag for the Gemini SDK
    *   Define the Durable Object class binding (e.g., `INTERVIEW_OBJECT`)
    *   Configure any custom routes or domains for production

---

## Interview State Transition Flow

This section provides a complete overview of how interview status transitions throughout the lifecycle.

### State Diagram

```
PENDING → IN_PROGRESS → COMPLETED
                ↓
              ERROR
```

### Detailed Flow

1. **Dashboard → PENDING**:
   - User clicks "Start Interview" on dashboard
   - Next.js calls `interview.createSession` mutation
   - Interview record created with `status: PENDING`
   - User redirected to `/interview/[id]/session` (lobby/session page)

2. **PENDING → IN_PROGRESS**:
   - User on session page clicks "Begin Interview" (or auto-start)
   - Client calls `interview.generateWorkerToken` mutation
   - Mutation verifies interview is `PENDING` and owned by user
   - JWT token generated and returned to client
   - Client establishes WebSocket connection to Cloudflare Worker with JWT
   - Worker validates JWT and creates Durable Object
   - Durable Object connects to Gemini Live API
   - **Once Gemini connection succeeds**, Durable Object calls `interview.updateStatus({ status: 'IN_PROGRESS' })`
   - Database sets `startedAt` timestamp
   - Durable Object sets 1-hour alarm for timeout

3. **IN_PROGRESS → COMPLETED** (Three possible paths):

   **Path A: User ends interview**
   - User clicks "End Interview" button
   - Client sends `EndRequest` protobuf message
   - Durable Object receives message, closes Gemini connection
   - Durable Object calls `interview.submitTranscript({ transcript, endedAt })`
   - Database atomically saves transcript + sets `status: COMPLETED` + sets `endedAt`

   **Path B: Gemini ends normally**
   - Gemini API closes connection (interview questions complete)
   - Durable Object detects closure, triggers cleanup
   - Same flow as Path A (calls `submitTranscript`)

   **Path C: 1-hour timeout**
   - Durable Object alarm fires after 1 hour
   - Alarm handler closes both Gemini and client connections
   - Same flow as Path A (calls `submitTranscript`)

4. **IN_PROGRESS → ERROR**:
   - Gemini API connection fails or disconnects unexpectedly
   - Durable Object calls `interview.updateStatus({ status: 'ERROR', endedAt })`
   - Database sets `status: ERROR` and `endedAt`
   - Durable Object closes client connection with error code 4002
   - Client displays error, allows user to retry

### Key Design Principles

- **Status checks happen at JWT generation**: The `generateWorkerToken` mutation validates the interview is in `PENDING` state before issuing a token
- **Worker is trusted**: Once JWT is validated, the Durable Object trusts it and doesn't make additional status checks
- **Atomic operations**: Transcript submission and status update happen in a single database transaction
- **Single responsibility**: `submitTranscript` always marks as `COMPLETED`, `updateStatus` handles `ERROR` transitions
- **Dual authentication**: `updateStatus` supports both user session auth (for manual cancellation) and worker auth (for status transitions)

---

## API Specification

### 1. tRPC API (Next.js Backend)

The Next.js backend will be updated with two new procedures to support the Cloudflare Worker.

#### Procedure: `interview.generateWorkerToken`

- **Purpose**: To securely authorize a user to connect to the Cloudflare Worker for a specific interview. This prevents unauthorized access to the real-time infrastructure.
- **Type**: `mutation`
- **Status**: ❌ NOT STARTED

**Contract:**

```typescript
// Input
z.object({
  interviewId: z.string(),
})

// Output
z.object({
  token: z.string(), // A short-lived JSON Web Token (JWT)
})
```

**Implementation Details:**
-   **Authorization & Status Check**: The procedure must first query the database for the interview, ensuring:
    1. The `userId` on the interview record matches `ctx.session.user.id`
    2. The interview `status` is `PENDING` (not already in progress or completed)
-   **Error Handling**:
    *   If no matching interview is found, throw a `NOT_FOUND` tRPC error (prevents leaking information about interview existence)
    *   If the interview is not in `PENDING` state, throw a `BAD_REQUEST` tRPC error with message "Interview is not in PENDING state"
-   **JWT Generation**:
    *   **Library**: Use the `jsonwebtoken` library.
    *   **Algorithm**: Use **HS256** for signing.
    *   **Payload**: The JWT payload must include the following claims:
        *   `userId`: The ID of the user.
        *   `interviewId`: The ID of the interview session.
        *   `iat` (Issued At): The timestamp when the token was generated.
        *   `exp` (Expiration Time): The timestamp for expiration. Set this to **5 minutes** from the issue time to minimize the token's validity period.
    *   **Secret**: The token must be signed with the `JWT_SECRET` environment variable.

#### Procedure: `interview.updateStatus`

- **Purpose**: To update the interview status throughout its lifecycle. This procedure supports **dual authentication**: user session auth for client-initiated updates (e.g., manual cancellation) and shared secret auth for Worker-initiated updates (e.g., session start, completion).
- **Type**: `mutation`
- **Status**: ❌ NOT STARTED

**Contract:**

```typescript
// Input
z.object({
  interviewId: z.string(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ERROR"]),
  endedAt: z.string().optional(), // ISO 8601 string, required for COMPLETED status
})

// Output
// Returns the updated Interview object
```

**Implementation Details:**
-   **Dual Authentication**: This procedure uses a custom `flexibleProcedure` that accepts EITHER:
    1. **Session authentication** (standard `ctx.session.user`) - for user-initiated actions
    2. **Shared secret authentication** (via `Authorization: Bearer <WORKER_SHARED_SECRET>` header) - for Worker-initiated actions
-   **Flexible Auth Middleware**:
    *   Create a new middleware in `src/server/api/trpc.ts` that checks for session auth first, then falls back to shared secret auth.
    *   The middleware should add an `authType: 'user' | 'worker'` field to the context.
    *   Access the header via the `createContext` function, which has direct access to the Next.js request object.
-   **Authorization Logic**:
    *   If `authType === 'user'`: Query the database to verify the interview belongs to `ctx.session.user.id`. Throw `NOT_FOUND` if not owned by user.
    *   If `authType === 'worker'`: Only verify the interview exists (Worker is trusted, JWT already validated ownership).
-   **Status Transition Logic**:
    *   `IN_PROGRESS`: Set `startedAt` to current timestamp
    *   `COMPLETED`: Set `endedAt` from input (required), or current timestamp if not provided
    *   `ERROR`: Set `endedAt` to current timestamp
-   **Database Update**: Use a Prisma `update` operation to atomically update the status and timestamps.

#### Procedure: `interview.submitTranscript`

- **Purpose**: To provide a secure, **Worker-only** endpoint for the Durable Object to post the completed interview transcript back to our database. This procedure also atomically updates the interview status to `COMPLETED`.
- **Type**: `mutation`
- **Status**: ❌ NOT STARTED

**Contract:**

```typescript
// Input
z.object({
  interviewId: z.string(),
  transcript: z.array(
    z.object({
      speaker: z.enum(["USER", "AI"]),
      content: z.string(),
      timestamp: z.string(), // ISO 8601 string from Worker, will be converted to Date in DB
    })
  ),
  endedAt: z.string(), // ISO 8601 string - when the interview ended
})
```

**Implementation Details:**
-   **Security Model**: This procedure uses the **Worker-only authentication** (shared secret via `Authorization` header).
    *   Use the same `internalProcedure` middleware created for `updateStatus` (or reuse if already created).
    *   The middleware validates `Authorization: Bearer <WORKER_SHARED_SECRET>`.
-   **Database Logic**:
    *   The procedure must perform two operations atomically within a Prisma transaction:
        1. Save all incoming transcript entries to the `TranscriptEntry` table (defined in `prisma/schema.prisma`)
        2. Update the interview status to `COMPLETED` and set `endedAt`
    *   The `TranscriptEntry` model has the following structure:
        *   `id`: String (auto-generated cuid)
        *   `timestamp`: DateTime (when this conversation happened)
        *   `speaker`: SpeakerRole enum (USER or AI)
        *   `content`: String (the text content)
        *   `interviewId`: String (foreign key to Interview)
    *   **Idempotency**: The combination of `interviewId` and `timestamp` on a transcript entry can be considered unique. The logic should add new entries, not replace existing ones.
    *   **Transaction Example**:
        ```typescript
        await ctx.db.$transaction([
          ctx.db.transcriptEntry.createMany({ data: transcriptEntries }),
          ctx.db.interview.update({
            where: { id: input.interviewId },
            data: { status: 'COMPLETED', endedAt: new Date(input.endedAt) }
          })
        ]);
        ```

### 2. WebSocket API (Cloudflare Worker)

- **Endpoint**: A new production URL, configured via `NEXT_PUBLIC_WORKER_URL` (e.g., `wss://preppal-worker.yourdomain.com`).
- **URL Format**: `wss://<worker-url>/<interviewId>?token=<jwt>`
  - The `interviewId` is included in the path for Durable Object routing
  - The JWT token is passed as a query parameter for authentication
  - Example: `wss://preppal-worker.yourdomain.com/interview_abc123?token=eyJhbG...`
- **Protocol**: The communication protocol remains unchanged and will adhere to the protobuf schema defined in `proto/interview.proto`.
  - Audio data is sent via `AudioChunk` messages containing raw binary data
  - See `proto/interview.proto` for complete message definitions
- **Audio Format**: Client must send audio as **16-bit LINEAR_PCM, 16kHz, mono** as specified in the `AudioConfig` message in the protobuf schema. This format is required by the Gemini Live API.

---

## Backend Specification (Cloudflare Worker)

The Cloudflare implementation will consist of two main components.

### 1. Stateless Entrypoint Worker

- **Role**: The public-facing, stateless entrypoint that handles initial WebSocket connections.
- **Responsibilities**:
  - Receives the incoming WebSocket upgrade request (`Upgrade: websocket`).
  - **URL Parsing**: The worker expects a URL format of `wss://<worker-url>/<interviewId>`. It must extract the `interviewId` from the path.
  - **Durable Object Stub Retrieval**:
      *   It will get a reference to the Durable Object namespace from its environment bindings (e.g., `env.INTERVIEW_OBJECT`).
      *   It will then get the specific object stub using `env.INTERVIEW_OBJECT.idFromName(interviewId)`. This ensures that all connections for the same `interviewId` are consistently routed to the same Durable Object instance, maintaining session state.
  - **WebSocket Handoff**:
      *   The worker will not handle the WebSocket handshake itself. Instead, it will immediately forward the original request to the Durable Object stub by calling `stub.fetch(request)`.

### 2. Durable Object (Stateful Session Manager)

- **Role**: The stateful core that manages a single interview session from start to finish.
- **Responsibilities**:
  - **WebSocket Handshake**:
      *   The `fetch` handler within the Durable Object receives the forwarded request.
      *   It creates a `new WebSocketPair()`.
      *   It returns one end of the pair (`client`) in a `new Response(null, { status: 101, webSocket: client })`. This response is sent back to the original user, completing the handshake.
      *   It keeps the other end (`server`) and accepts it using `this.state.acceptWebSocket(server)`. This attaches the connection to the Durable Object and enables the Hibernation API.
  - **Authentication & Status Validation**:
      *   Extract the JWT from the query parameters using the standard URL API (e.g., `new URL(request.url).searchParams.get('token')`).
      *   Validate the JWT using a Worker-compatible library like **`jose`** (NOT `jsonwebtoken`, which is Node.js-only).
      *   Verify the token using the `JWT_SECRET` stored as a Cloudflare secret.
      *   The JWT validation happens at token generation time in `generateWorkerToken`, which checks that the interview is in `PENDING` state. The Durable Object trusts the JWT and does not need to make additional status checks.
      *   **Note**: No separate `StartRequest` message is expected from the client. The WebSocket session is considered authenticated and initiated upon successful connection with a valid JWT.
      *   If JWT is invalid or expired, close the connection immediately with WebSocket close code **4001** (authentication failure).
  - **Gemini API Connection & Status Transition to IN_PROGRESS**:
      *   **SDK**: The official **Node.js SDK (`@google/generative-ai`)** will be used. The `nodejs_compat` compatibility flag must be enabled in the `wrangler.toml` file.
      *   **Reference**: Follow the WebSocket streaming pattern documented at https://ai.google.dev/gemini-api/docs/live
      *   **Authentication**: The Durable Object will authenticate with the Gemini API using an API key. This key must be stored as a secure **Cloudflare secret** named `GEMINI_API_KEY`.
      *   **Connection Method**: Use the Gemini Live API's WebSocket interface as shown in the reference documentation.
      *   **Status Update**: Once the Gemini connection is successfully established, the Durable Object must call the `interview.updateStatus` mutation to transition the interview from `PENDING` to `IN_PROGRESS`. This is done via a `fetch` call to the Next.js backend with the `Authorization: Bearer <WORKER_SHARED_SECRET>` header.
  - **Audio Proxy & Format**:
      *   The Gemini Live API requires a specific audio format: **16-bit LINEAR_PCM, 16kHz, single-channel (mono)**.
      *   The Durable Object receives `AudioChunk` messages from the client (as defined in `proto/interview.proto`) and forwards the raw binary audio content to the Gemini API.
      *   No transcoding is needed - the audio format matches what Gemini expects.
  - **State Management & Hibernation**:
      *   The Durable Object class will implement the WebSocket Hibernation API handlers (`webSocketMessage`, `webSocketClose`, `webSocketError`).
      *   Transcript entries will be buffered in a simple in-memory array (`this.transcript = []`).
      *   The Gemini API provides speaker diarization which distinguishes between `USER` and `AI` speakers. The worker must process messages from Gemini and forward them to the client according to the protobuf contract:
          *   For the user's speech, send `TranscriptUpdate` messages with `speaker: "USER"`.
          *   For the AI's response, send both a `TranscriptUpdate` message with `speaker: "AI"` for the text content, and the corresponding `AudioResponse` messages containing the audio chunks.
  - **Session Timeout Management**:
      *   Use Cloudflare Durable Object Alarms (https://developers.cloudflare.com/durable-objects/api/alarms/) to implement a 1-hour maximum session duration.
      *   When the Gemini connection is established, set an alarm for 1 hour from the current time.
      *   When the alarm fires, gracefully close both the Gemini and client connections, then call `submitTranscript` to save the transcript and mark the interview as `COMPLETED`.
  - **Error Handling & Status Transitions to ERROR**:
      *   **MVP Strategy**: If the Gemini API connection fails or disconnects during a session, the Durable Object should:
        1. Close the client WebSocket connection with error code **4002** (Gemini API error)
        2. Call `interview.updateStatus` to transition the interview to `ERROR` state
        3. Optionally save any partial transcript via `submitTranscript` (but mark interview as `ERROR` instead of `COMPLETED`)
      *   Use WebSocket close code **4001** for authentication failures (no status update needed, interview stays `PENDING`)
      *   The client will need to initiate a new session. No automatic reconnection or retry logic is required for the MVP.
  - **Termination & Data Persistence (Transition to COMPLETED)**:
      *   The interview can end in three ways:
        1. **User-initiated**: Client sends `EndRequest` message
        2. **Gemini-initiated**: Gemini API closes the connection normally (interview complete)
        3. **Timeout**: Durable Object alarm fires after 1 hour
      *   In all cases, the Durable Object should:
        1. Gracefully close the connection to the Gemini API (if still open)
        2. Bundle the complete transcript (using ISO 8601 formatted timestamp strings)
        3. Make a secure `fetch` call to the `interview.submitTranscript` tRPC endpoint on the Next.js backend, authenticating with the `Authorization: Bearer <WORKER_SHARED_SECRET>` header
        4. The `submitTranscript` procedure atomically saves the transcript AND updates the interview status to `COMPLETED`

    **Note**: The `EndRequest` message structure should be defined in `proto/interview.proto`. This requires further discussion to finalize the exact protobuf message format.

---

## 3. WebSocket API Contract

This section defines the definitive contract for all real-time communication over the WebSocket.

### 3.1. Endpoint

*   **Format**: `wss://<worker-url>/<interviewId>?token=<jwt>`
*   **Authentication**: The JWT in the query parameter is the sole authentication mechanism. No separate `StartRequest` message is needed from the client after connection.

### 3.2. Protobuf Schema (`proto/interview.proto`)

This is the complete and final schema for all WebSocket messages.

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

## Test Requirements

### 1. Backend Tests (Next.js / tRPC)

- **Location**: `src/server/api/routers/interview.test.ts`
- **Test Cases for `generateWorkerToken`**:
  - (RED) Test fails for an interview not owned by the user
  - (RED) Test fails for an interview not in `PENDING` state (e.g., already `IN_PROGRESS`)
  - (RED) Test returns a valid, decodable JWT for a valid `PENDING` interview
  - (RED) Test JWT contains correct claims (userId, interviewId, exp, iat)
- **Test Cases for `updateStatus`**:
  - (RED) Test fails without authentication (no session, no shared secret)
  - (RED) Test succeeds with session auth for user-owned interview
  - (RED) Test fails with session auth for interview not owned by user
  - (RED) Test succeeds with shared secret auth
  - (RED) Test correctly sets `startedAt` when transitioning to `IN_PROGRESS`
  - (RED) Test correctly sets `endedAt` when transitioning to `COMPLETED` or `ERROR`
- **Test Cases for `submitTranscript`**:
  - (RED) Test fails if the shared secret is missing or incorrect
  - (RED) Test successfully saves transcript entries and updates status to `COMPLETED` in a transaction
  - (RED) Test handles idempotency correctly (same timestamp entries)

### 2. Backend Tests (Cloudflare Worker)

- **Strategy**: Use `miniflare` and Vitest to write integration tests for the worker.
- **Test Cases**:
  - (RED) Test that the stateless worker correctly forwards connections to the correct Durable Object
  - (RED) Test that the Durable Object rejects connections with an invalid JWT (close code 4001)
  - (RED) Test that the Durable Object rejects connections with an expired JWT (close code 4001)
  - (RED) Test that the Durable Object calls `updateStatus` with `IN_PROGRESS` after successful Gemini connection
  - (RED) Test that the Durable Object handles user-initiated `EndRequest` and calls `submitTranscript`
  - (RED) Test that the Durable Object handles Gemini disconnection errors and calls `updateStatus` with `ERROR`
  - (RED) Test that the Durable Object alarm (1-hour timeout) correctly terminates the session and calls `submitTranscript`
  - (RED) Write a full integration test: mock a client connection, mock the Gemini API, send audio chunks, receive transcript updates, end session, and assert that the `submitTranscript` endpoint is called with the correct data


---

## Parallel Development Plan

This project will follow a **contract-first** approach to enable parallel development.

### 1. Contract Implementation (Immediate Priority)

- [ ] **Action**: The backend team immediately updates `proto/interview.proto` with the schema from the **WebSocket API Contract** section and generates the corresponding TypeScript code.

### 2. Mock Server Development

- [ ] **Action**: The backend team's **first implementation task** is to build and deploy a simple **mock WebSocket server**. 
- [ ] **Requirement**: This server must perfectly implement the new contract. It will listen for `AudioChunk` messages and respond with a pre-scripted, realistic sequence of `TranscriptUpdate` and `AudioResponse` messages.
- [ ] **Goal**: Unblock the frontend team for immediate development.

### 3. Parallel Workstreams

- [ ] **Frontend Team**:
    - [ ] Implement the full client experience against the **mock server**.
    - [ ] Implement audio capture and playback using Web Audio APIs.
    - [ ] Build UI components to display transcripts and manage session states (`connecting`, `live`, `ending`, etc.).
- [ ] **Backend Team**:
    - [ ] After delivering the mock server, work in parallel on the full-featured Cloudflare Worker.
    - [ ] Implement the tRPC API endpoints (`generateWorkerToken`, `updateStatus`, `submitTranscript`).
    - [ ] Implement the Durable Object logic, Gemini API integration, and state management as detailed in this specification.

### 4. Integration & E2E Testing

- [ ] **Integration**: Once the production worker is complete, the frontend application will be pointed to the new worker URL.
- [ ] **Deploy**: Deploy the Next.js app to Vercel and the worker to Cloudflare.
- [ ] **Configure**: Ensure all environment variables are set correctly in both environments.
- [ ] **Test**: Perform manual and automated (Playwright) end-to-end testing on a staging environment against the live, integrated system.
