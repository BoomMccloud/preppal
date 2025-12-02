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

### Phase 4: UI Integration
- [ ] Update `SessionContent.tsx` to display real-time transcripts.
- [ ] Add visual feedback for "Listening" vs "Speaking" states.
- [ ] Ensure "End Interview" button functions correctly.

---

## 4. Test Status & Strategy

### Current Status
| Component | Status | Notes |
|-----------|--------|-------|
| **AudioRecorder** | ✅ Passing | 100% Coverage. Core capture logic is solid. |
| **AudioPlayer** | ✅ Passing | 100% Coverage. Playback queuing is solid. |
| **Protobuf Utils** | ✅ Passing | Basic encoding/decoding verified. |
| **WebSocket Hook** | ✅ Complete | **Rewritten for FEAT17.** |

### Verification Plan
1.  **Unit Tests**: Run `pnpm test` to verify the hook logic in isolation.
2.  **Manual E2E**:
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
- ⚠️ useInterviewSocket: Core functionality implemented, some test environment issues

### Integration Tests
- ✅ WebSocket Connection: Implemented with proper URL construction
- ✅ Message Handling: Protobuf encoding/decoding for all message types
- ✅ Audio Services Integration: Properly connected
- ✅ Authentication Flow: Uses correct API endpoint

## 8. Current Status

### Completed
- ✅ Configuration updates
- ✅ Test implementation
- ✅ Hook refactoring
- ✅ Documentation updates
- ✅ Architecture alignment

### In Progress
- ⚠️ Test verification (debugging test environment timing issues)
- ⏳ UI integration for live transcripts and connection states
- ⏳ End-to-end testing with Cloudflare Worker

## 9. Next Steps

1. **Debug Test Issues**: Resolve timing issues in the test environment
2. **UI Integration**: Update SessionContent.tsx to display real-time transcripts
3. **E2E Testing**: Perform full flow verification against the Cloudflare Worker
4. **Performance Optimization**: Optimize audio streaming performance
5. **Error Handling**: Enhance error handling and user feedback
