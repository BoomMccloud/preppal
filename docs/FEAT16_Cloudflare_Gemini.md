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

1.  **Secret Generation**: The `JWT_SECRET` and `WORKER_SHARED_SECRET` must be securely generated. Use a password manager or a command-line tool like `openssl rand -hex 32` to create two unique, random strings of at least 32 characters each.
2.  **Secret Storage**:
    *   In the Next.js app (Vercel), store these as standard environment variables.
    *   In the Cloudflare Worker, use [Wrangler secrets](https://developers.cloudflare.com/workers/wrangler/commands/#secret) to securely store `JWT_SECRET` and `WORKER_SHARED_SECRET`. This prevents them from being exposed in plaintext.

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
-   **Authorization**: The procedure must first query the database for the interview, ensuring the `userId` on the interview record matches `ctx.session.user.id`.
-   **Error Handling**: If no matching interview is found (either because it doesn't exist or the user is not the owner), the procedure must throw a `NOT_FOUND` tRPC error. This prevents leaking information about the existence of interviews.
-   **JWT Generation**:
    *   **Library**: Use the `jsonwebtoken` library.
    *   **Algorithm**: Use **HS256** for signing.
    *   **Payload**: The JWT payload must include the following claims:
        *   `userId`: The ID of the user.
        *   `interviewId`: The ID of the interview session.
        *   `iat` (Issued At): The timestamp when the token was generated.
        *   `exp` (Expiration Time): The timestamp for expiration. Set this to **5 minutes** from the issue time to minimize the token's validity period.
    *   **Secret**: The token must be signed with the `JWT_SECRET` environment variable.

#### Procedure: `interview.submitTranscript`

- **Purpose**: To provide a secure, **internal-only** endpoint for the Durable Object to post the completed interview transcript and session data back to our database.
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
      timestamp: z.date(), // ISO 8601 string from Worker
    })
  ),
  // ... any other final metadata
})
```

**Implementation Details:**
-   **Security Model**: This procedure will not use the standard `protectedProcedure` which relies on user sessions. Instead, it will be secured by a custom middleware that validates a shared secret, ensuring only our trusted Cloudflare Worker can call it.
-   **Step 1: Create a Custom `internalProcedure`**:
    *   In `src/server/api/trpc.ts`, define a new middleware that reads the `Authorization` header from the request.
    *   The middleware will compare the header's value to `Bearer <WORKER_SHARED_SECRET>`.
    *   It must throw an `UNAUTHORIZED` error if the header is missing or the secret is incorrect.
    *   Use this middleware to create a new procedure type, e.g., `export const internalProcedure = t.procedure.use(...)`.
-   **Step 2: Create the Internal Router**:
    *   Create a new file: `src/server/api/routers/_internal.ts`.
    *   Define a new `internalRouter` using `createTRPCRouter`.
    *   Add the `submitTranscript` mutation to this router, ensuring it is built with the new `internalProcedure`.
    *   **Important**: Do NOT merge `internalRouter` into the main `appRouter` in `src/server/api/root.ts`.
-   **Step 3: Expose via a Next.js API Route**:
    *   Create a new file: `src/pages/api/internal/[trpc].ts`.
    *   In this file, use `createNextApiHandler` to expose only the `internalRouter`. The Cloudflare Worker will send its `fetch` request to this endpoint (e.g., `/api/internal/submitTranscript`).
-   **Database Logic**:
    *   The procedure should save all incoming transcript entries to the `TranscriptEntry` table.
    *   **Idempotency**: The combination of `interviewId` and `timestamp` on a transcript entry can be considered unique. The logic should add new entries, not replace existing ones. Use a database transaction to ensure all entries are created atomically.

### 2. WebSocket API (Cloudflare Worker)

- **Endpoint**: A new production URL, configured via `NEXT_PUBLIC_WORKER_URL` (e.g., `wss://preppal-worker.yourdomain.com`).
- **Protocol**: The communication protocol remains unchanged and will adhere to the protobuf schema defined in `proto/interview.proto`.
- **Authentication**: The client must connect to the WebSocket with the JWT obtained from `interview.generateWorkerToken` passed as a query parameter (e.g., `wss://.../?token=...`). The worker will validate this token upon connection.

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
      *   It will then get the specific object stub using `env.INTERVIEW_OBJECT.idFromName(interviewId)`. This ensures that all connections for the same interview are routed to the same Durable Object instance.
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
  - **Authentication**: Receives the WebSocket and validates the JWT from the query parameters using the `JWT_SECRET` stored as a Cloudflare secret. If invalid or expired, it closes the connection immediately.
  - **Gemini API Connection**:
      *   **SDK**: The official **Node.js SDK (`google-genai`)** will be used. The `nodejs_compat` compatibility flag must be enabled in the `wrangler.toml` file.
      *   **Authentication**: The Durable Object will authenticate with the Gemini API using an API key. This key must be stored as a secure **Cloudflare secret**.
  - **Audio Proxy & Format**:
      *   The Gemini Live API requires a specific audio format: **16-bit PCM, 16kHz, single-channel (mono)**.
      *   The client-side audio capture logic must be configured to stream audio in this exact format.
      *   The Durable Object will directly forward the raw audio chunks received from the client to the Gemini API stream.
  - **State Management & Hibernation**:
      *   The Durable Object class will implement the WebSocket Hibernation API handlers (`webSocketMessage`, `webSocketClose`, `webSocketError`).
      *   Transcript entries will be buffered in a simple in-memory array (`this.transcript = []`).
  - **Termination & Data Persistence**: On receiving an `EndRequest` from the client (or in the `webSocketClose` handler), it:
    1.  Gracefully closes the connection to the Gemini API.
    2.  Bundles the complete transcript.
    3.  Makes a secure `fetch` call to the `interview.submitTranscript` tRPC endpoint on the Next.js backend, authenticating with the `Authorization: Bearer <WORKER_SHARED_SECRET>` header.

---

## Frontend Specification

The primary changes will be within the `useInterviewSocket` custom hook.

- **Route**: `/interview/[interviewId]/session` (no change).
- **Component**: `useInterviewSocket.ts` will be modified.

### Component Logic & Lifecycle Changes

1.  **Initialization Flow**:
    - The `useEffect` hook will now first call the `api.interview.generateWorkerToken.useMutation()`.
    - The `enabled` option of the mutation will be tied to the successful check that the interview is in a `PENDING` state.
2.  **Connection**:
    - On a successful mutation, the `onSuccess` callback will receive the JWT.
    - It will then use this token and the new `NEXT_PUBLIC_WORKER_URL` environment variable to instantiate the WebSocket connection.
3.  **Protocol Handling**:
    - The logic for handling `onmessage`, `onclose`, `onerror`, and sending Protobuf messages remains **unchanged**, as the communication contract with the server is the same.

---

## Test Requirements

### 1. Backend Tests (Next.js / tRPC)

- **Location**: `src/server/api/routers/interview.test.ts`
- **Test Cases**:
  - (RED) Write a test for `generateWorkerToken` to ensure it fails for an interview not owned by the user.
  - (RED) Write a test for `generateWorkerToken` to ensure it returns a valid, decodable JWT for a valid request.
  - (RED) Write a test for `submitTranscript` that fails if the shared secret is missing or incorrect.
  - (RED) Write a test for `submitTranscript` that successfully saves transcript entries for a valid request.

### 2. Backend Tests (Cloudflare Worker)

- **Strategy**: Use `miniflare` and Vitest to write integration tests for the worker.
- **Test Cases**:
  - (RED) Test that the stateless worker correctly forwards connections to the correct Durable Object.
  - (RED) Test that the Durable Object rejects connections with an invalid JWT.
  - (RED) Write a full integration test for the Durable Object: mock a client connection, mock the Gemini API, and assert that the `submitTranscript` endpoint is called with the correct data upon completion.

### 3. Frontend Tests

- **Location**: `src/app/(app)/interview/[interviewId]/session/page.test.tsx`
- **Strategy**: Update existing tests to accommodate the new asynchronous token generation step.
- **Test Cases**:
  - (RED) Modify the connection test to mock the `generateWorkerToken` mutation and verify the WebSocket is instantiated with the token and the correct URL.

---

## Implementation Checklist & TDD Plan

### Phase 1: Next.js API Implementation

- [ ] **RED**: Write failing tests for `generateWorkerToken` and `submitTranscript` in `interview.test.ts`.
- [ ] **GREEN**: Implement the two new tRPC procedures in `interview.ts` to make the tests pass.
- [ ] **Config**: Add `WORKER_SHARED_SECRET` and `JWT_SECRET` to `.env` and `env.js`.
- [ ] **Install Deps**: `pnpm add jsonwebtoken @types/jsonwebtoken`.

### Phase 2: Cloudflare Worker Implementation

- [ ] **Setup**: Scaffold a new Cloudflare Worker project (`/worker` directory) with `wrangler`.
- [ ] **RED**: Write failing tests for the worker and Durable Object using `miniflare`.
- [ ] **GREEN**: Implement the stateless worker and the stateful Durable Object logic.
- [ ] **Integration**: Implement the real Gemini Live API connection.

### Phase 3: Frontend Client Update

- [ ] **RED**: Update tests in `session/page.test.tsx` to reflect the new authentication flow.
- [ ] **GREEN**: Modify the `useInterviewSocket.ts` hook to call `generateWorkerToken` before connecting.
- [ ] **Config**: Add `NEXT_PUBLIC_WORKER_URL` to `.env.example`.

### Phase 4: Deployment & E2E Testing

- [ ] **Deploy**: Deploy the Next.js app to Vercel and the worker to Cloudflare.
- [ ] **Configure**: Ensure all environment variables are set correctly in both environments.
- [ ] **Test**: Perform manual end-to-end testing on a staging environment.
- [ ] **Update**: Update Playwright E2E tests to run against the live, integrated system.
