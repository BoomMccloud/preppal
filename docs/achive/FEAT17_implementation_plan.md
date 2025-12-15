# FEAT17: Implementation Plan - Real-Time Client-Side Audio

**Purpose**: This document outlines the technical specification and step-by-step plan for implementing the frontend portion of the real-time interview feature. It consolidates requirements from previous specifications and aligns with the backend architecture (FEAT16).

---

## 1. Context & Architecture

**Goal**: Migrate the frontend from a JSON-based local WebSocket architecture to a Protobuf-based architecture connecting to a Cloudflare Worker.

**Architecture**:
- **Authentication**: JWT via `interview.generateWorkerToken` (tRPC).
- **Connection**: `wss://<WORKER_URL>/<interviewId>?token=<jwt>`.
- **Protocol**: Protocol Buffers (`proto/interview.proto`).
- **Audio**: Bidirectional streaming (Raw PCM audio chunks).

**Responsibilities**:
- **Frontend (Us)**: Audio capture, playback, socket management, UI state.
- **Backend (Done)**: Cloudflare Worker, AI orchestration, token generation.

---

## 2. Technical Specifications

### 2.1 Configuration
- **Env Var**: `NEXT_PUBLIC_WORKER_URL` (e.g., `ws://localhost:8787` for local dev).
- **Update**: Add to `.env`, `.env.example`, and `src/env.js`.

### 2.2 WebSocket Connection Logic
- **Old**: `ws://localhost:3001` + `StartRequest` message.
- **New**: `wss://...` with token in query param.
- **Handshake**: Connection open = Session started. No explicit start message needed.

### 2.3 Message Protocol (Protobuf)
We use the `ServerToClientMessage` and `ClientToServerMessage` definitions.

**Incoming (`ServerToClientMessage`):**
| Payload Type | Action |
|--------------|--------|
| `transcript_update` | Update transcript UI. Handle `USER` vs `AI` roles. |
| `audio_response` | Enqueue/Play audio via `AudioPlayer` service. |
| `session_ended` | Transition UI to completion state/feedback. |
| `error` | Display error toast or alert. |

**Outgoing (`ClientToServerMessage`):**
| Payload Type | Trigger |
|--------------|---------|
| `audio_chunk` | Streamed continuously from `AudioRecorder`. |
| `end_request` | Triggered by user clicking "End Interview". |

---

## 3. Implementation Steps

### Phase 1: Configuration & Skeleton (Prerequisite)
- [x] Add `NEXT_PUBLIC_WORKER_URL` to environment configuration.
- [x] Ensure `proto/interview.proto` definitions are up to date and generated types are available.

### Phase 2: TDD & Unit Testing (Current Focus)
**Refactor `session/page.test.tsx` to match the new architecture.**
- [x] **Mock Setup**: Mock `AudioRecorder`, `AudioPlayer`, and `WebSocket`.
- [x] **Connection Test**: Verify correct URL construction with token.
- [x] **Message Handling Tests**:
  - Simulate `transcript_update` → Check state update.
  - Simulate `audio_response` → Verify `audioPlayer.play` is called.
  - Simulate `session_ended` → Verify UI transition.
- [x] **Sending Tests**:
  - Verify `audioRecorder` data events trigger `audio_chunk` messages.
  - Verify "End Session" triggers `end_request` message.

### Phase 3: Hook Refactoring (`useInterviewSocket.ts`)
- [x] **Replace API Call**: Switch `generateWsToken` to `generateWorkerToken`.
- [x] **Update Connection**: Remove `StartRequest`; use URL query params.
- [x] **Message Loop**:
  - Implement `onmessage` with Protobuf decoding.
  - Switch on `message.payload` (transcript, audio, error, end).
- [x] **Audio Integration**:
  - Connect `AudioRecorder` events to WebSocket `send`.
  - Connect WebSocket `audio_response` to `AudioPlayer`.

### Phase 4: JWT Refactoring
- [x] **Replace Dependencies**: Replace `jsonwebtoken` with `jose` throughout the project.
- [x] **Update Implementation**: Update `generateWorkerToken` to use `jose` for consistent crypto implementation.
- [x] **Verify Compatibility**: Ensure all token generation and verification still works correctly.

### Phase 5: Targeted Test Implementation
- [x] **Implement Maintainable Tests**: Create focused tests covering critical user journeys.
- [x] **Avoid Brittle Mocking**: Use simpler, more reliable testing approaches.
- [x] **Focus on Outcomes**: Test user-facing behavior rather than implementation details.

### Phase 6: UI Integration
- [x] Add visual feedback for "Listening" vs "Speaking" states.
- [x] Ensure "End Interview" button functions correctly.
- [ ] Update `SessionContent.tsx` to display real-time transcripts (Deferred).

### Phase 7: E2E Testing
- [x] **Create E2E Test Environment**: Set up comprehensive testing with Vitest.
- [x] **Test Authentication Flow**: Validate token generation and WebSocket connection.
- [x] **Test Audio Streaming**: Verify sending and receiving audio chunks.
- [x] **Test Message Handling**: Validate all message types (transcripts, audio, errors, session end).
- [x] **Test Session Lifecycle**: Verify complete flow from start to end.
- [x] **Test Error Handling**: Validate graceful error handling.
- [x] **Test Against Deployed Worker**: Conditional tests for production environments.

---

## 4. Test Status & Strategy

### Current Status
| Component | Status | Notes |
|-----------|--------|-------|
| **AudioRecorder** | ✅ Passing | 100% Coverage. Core capture logic is solid. |
| **AudioPlayer** | ✅ Passing | 100% Coverage. Playback queuing is solid. |
| **Protobuf Utils** | ✅ Passing | Basic encoding/decoding verified. |
| **WebSocket Hook** | ✅ Complete | **Rewritten for FEAT17.** |
| **JWT Refactoring** | ✅ Complete | **Replaced `jsonwebtoken` with `jose`.** |
| **Targeted Tests** | ✅ Complete | **Implemented maintainable functional tests.** |
| **UI Integration** | ✅ Complete | **Visual Feedback & End Interview verified.** |
| **E2E Tests** | ✅ Complete | **Full flow verification implemented.** |

### Verification Plan
1.  **Unit Tests**: Run `pnpm test` to verify the hook logic in isolation.
2.  **E2E Tests**: Run `pnpm test src/app/(app)/interview/[interviewId]/session/e2e*.test.*` for comprehensive E2E validation.
3.  **Manual E2E**:
    - Start Worker: `pnpm dev:worker`
    - Start App: `pnpm dev`
    - Flow: Login -> Create Interview -> Enter Session.
    - Verify: Mic permission -> Connection -> Speak -> AI Responds -> End.

---

## 5. Architecture Alignment

The implementation now aligns with the updated architecture:

1. **Frontend (Next.js/React)**: Handles UI, authentication, and real-time communication
2. **Backend (Next.js tRPC)**: Manages business logic, database operations, and token generation
3. **Real-Time Engine (Cloudflare Worker)**: Manages WebSocket connections and AI integration

## 6. Technical Implementation Details

### Authentication Flow
- Uses `interview.generateWorkerToken` to obtain a JWT for Cloudflare Worker authentication
- Connects to `wss://<WORKER_URL>/<interviewId>?token=<jwt>` instead of sending a `StartRequest` message

### Message Protocol
- All communication uses Protocol Buffers (`proto/interview.proto`)
- Supports all message types:
  - `ClientToServerMessage`: `audio_chunk`, `end_request`
  - `ServerToClientMessage`: `transcript_update`, `audio_response`, `error`, `session_ended`

### Audio Services
- `AudioRecorder`: Captures and downsamples microphone audio to 16kHz PCM
- `AudioPlayer`: Receives and plays AI-generated audio chunks
- Both services integrated with the WebSocket communication layer

## 7. Test Coverage

### Unit Tests
- ✅ AudioRecorder: 100% coverage
- ✅ AudioPlayer: 100% coverage
- ✅ Protobuf Utilities: Basic encoding/decoding verified
- ✅ useInterviewSocket: Core functionality implemented, some test environment issues

### Integration Tests
- ✅ WebSocket Connection: Implemented with proper URL construction
- ✅ Message Handling: Protobuf encoding/decoding for all message types
- ✅ Audio Services Integration: Properly connected
- ✅ Authentication Flow: Uses correct API endpoint

### E2E Tests
- ✅ Authentication Flow: Token generation and WebSocket connection
- ✅ Audio Streaming: Sending and receiving audio chunks
- ✅ Message Handling: Transcript updates, audio responses, errors, session end
- ✅ Session Lifecycle: Start, live, end states
- ✅ UI Integration: State transitions, visual feedback, controls

## 8. Current Status

### Completed
- ✅ Configuration updates
- ✅ Test implementation
- ✅ Hook refactoring
- ✅ Documentation updates
- ✅ Architecture alignment
- ✅ JWT dependency refactoring
- ✅ Targeted functional test implementation
- ✅ UI Integration (Visual Feedback & End Interview)
- ✅ E2E Testing Implementation

### In Progress
- None

## 9. Next Steps

1. **UI Integration**: Update SessionContent.tsx to display real-time transcripts (Deferred)
2. **Performance Optimization**: Optimize audio streaming performance
3. **Error Handling**: Enhance error handling and user feedback
