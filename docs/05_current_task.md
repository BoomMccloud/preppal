# Current Task

## Task: FEAT17 - Implement Real-Time Client-Side Audio

**Status:** In Progress - Starting Frontend Integration

**Summary:**
FEAT15 (JSON-based session page) is complete and working. We're now beginning FEAT17 frontend integration to migrate to Protobuf + audio. **Backend is being handled by another team** - we're only responsible for the frontend client code. Following TDD approach: write failing tests first, then implement.

---

## Current Situation

### What We Have (Working)

#### FEAT15 - Basic Session Page ✅ (Just Completed)

- **Local WebSocket server** at `ws://localhost:3001`
- **JSON message protocol** (not Protobuf)
- **Mock transcript streaming** (4 pre-scripted questions)
- `generateWsToken` tRPC endpoint
- Full end-to-end flow working (create interview → session → completion)
- Test coverage: 4/4 backend tests passing

#### FEAT17 - Audio Components ✅ (Previously Built)

- `AudioRecorder` service with audio-processor worklet
- `AudioPlayer` service with audio-player-processor worklet
- 100% unit test coverage
- Protobuf setup and dependencies

### What We Need (FEAT17 Integration)

According to `FEAT17_implementation_plan.md`, FEAT17 requires:

#### Frontend Requirements ❌

- [ ] Refactor `useInterviewSocket` to use **Protobuf** instead of JSON
- [ ] Update WebSocket URL format: `wss://<worker-url>/<interviewId>?token=<jwt>`
- [ ] Remove `StartRequest` message (authentication via URL token)
- [ ] Implement new message handlers:
  - `transcript_update` - Display real-time transcripts
  - `audio_response` - Play AI audio via AudioPlayer
  - `session_ended` - Handle session termination
- [ ] Integrate `AudioRecorder` to capture and stream audio
- [ ] Integrate `AudioPlayer` to play AI responses
- [ ] Send `EndRequest` message format
- [ ] Update UI to reflect new connection states

#### Testing Requirements ❌

- [ ] Rewrite `useInterviewSocket` tests for new API contract
- [ ] Implement E2E test against mock/real server
- [ ] Test audio capture and playback integration

#### Backend

- **Backend is handled by another team** - We are NOT responsible for:
  - Cloudflare Worker implementation
  - Protobuf message handling on server side
  - Speech-to-text/text-to-speech integration
  - AI conversation logic
  - Token generation endpoint

---

## The Architecture Gap

**FEAT15 (Current Implementation):**

```
Client → ws://localhost:3001
         ↓ JSON messages
         ↓ generateWsToken
         ↓ StartRequest/EndRequest
         ↓ Mock text transcripts
Server (local WebSocket)
```

**FEAT17 (Target Architecture):**

```
Client → wss://worker-url/<interviewId>?token=<jwt>
         ↓ Protobuf messages
         ↓ (Backend team's token endpoint)
         ↓ No StartRequest (auth via URL)
         ↓ Real audio + transcripts
Cloudflare Worker (Backend team) → STT/TTS/AI
```

---

## Our Scope: Frontend Only

**Decision Made:** Full migration to FEAT17 architecture (Protobuf + audio + Cloudflare Worker)

**What we're building:**
- Protobuf-based `useInterviewSocket` hook
- AudioRecorder integration (capture and stream audio)
- AudioPlayer integration (play AI responses)
- Updated UI components for audio status
- Comprehensive tests

**What we're NOT building:**
- Backend/server code (handled by another team)
- Token generation endpoints
- Cloudflare Worker logic

---

## FEAT17 Frontend Work (Our Responsibility)

### Phase 1: Testing (TDD Approach) - **CURRENT PHASE**

- [ ] **Write failing tests for Protobuf-based `useInterviewSocket`** ⬅️ **NEXT IMMEDIATE STEP**
  - Test Protobuf message encoding/decoding (ClientToServerMessage, ServerToClientMessage)
  - Test new message handlers: transcript_update, audio_response, session_ended
  - Test AudioRecorder integration (capturing and streaming audio chunks)
  - Test AudioPlayer integration (playing AI audio responses)
  - Test WebSocket URL construction with token parameter
  - Test removal of StartRequest message logic
  - Test EndRequest message handling

### Phase 2: Frontend Integration

- [ ] Refactor `useInterviewSocket.ts` for Protobuf messages
- [ ] Integrate `AudioRecorder` service
- [ ] Integrate `AudioPlayer` service
- [ ] Update message handlers for new API contract
- [ ] Update URL construction with token parameter
- [ ] Remove StartRequest logic

### Phase 3: UI Updates

- [ ] Display real-time transcripts from `transcript_update`
- [ ] Show audio recording status
- [ ] Handle new connection states
- [ ] Update error handling

### Phase 4: Integration Testing

- [ ] Add integration tests
- [ ] Implement E2E test
- [ ] Manual testing with real audio

---

## What Was Completed This Session

### FEAT15 - Session Page (Completed)

1. **Fixed ES module error** in WebSocket server
2. **Removed mock feedback generation** (architectural correction)
3. **Fixed rejoin protection race condition** in frontend
4. **Verified end-to-end flow** working correctly
5. **Updated documentation** comprehensively

### Architectural Clarity

- Confirmed feedback generation should be separate service (not in WebSocket)
- Frontend "Processing Feedback" state is correct behavior
- Proper separation of concerns established

---

## Next Steps

**Immediate Next Action:**

Write failing tests for Protobuf-based `useInterviewSocket` hook following TDD principles.

**Reference Specs:**
- [FEAT17_implementation_plan.md](FEAT17_implementation_plan.md) - Detailed refactoring requirements
- [proto/interview.proto](../proto/interview.proto) - Protobuf message definitions
- Current implementation: `src/app/(app)/interview/[interviewId]/session/useInterviewSocket.ts` (JSON-based)

**Test Coverage Plan:**

1. **Protobuf Message Handling**
   - Encode ClientToServerMessage (audio_chunk, end_request)
   - Decode ServerToClientMessage (transcript_update, audio_response, session_ended, error)

2. **WebSocket Connection**
   - URL format: `wss://worker-url/<interviewId>?token=<jwt>`
   - No StartRequest message (auth via URL token)
   - Handle connection states (connecting, connected, disconnected, error)

3. **AudioRecorder Integration**
   - Start/stop recording
   - Capture audio chunks
   - Stream via WebSocket as Protobuf messages

4. **AudioPlayer Integration**
   - Receive audio_response messages
   - Decode audio data
   - Play through AudioPlayer service

5. **Message Handlers**
   - transcript_update: Update transcript state
   - audio_response: Trigger audio playback
   - session_ended: Clean up and transition state
   - error: Handle error states

**Documentation:**

- All FEAT15 docs updated ✅
- FEAT17 specs exist (implementation not started)
- Frontend scope clarified (backend = another team)

---

## Files Reference

**FEAT15 (Current Working Code):**

- `src/server/ws/server.ts` - Local WebSocket server (JSON)
- `src/server/api/routers/interview.ts` - generateWsToken
- `src/app/(app)/interview/[interviewId]/session/useInterviewSocket.ts` - JSON-based hook
- `src/app/(app)/interview/[interviewId]/session/SessionContent.tsx` - Session UI

**FEAT17 (Built But Not Integrated):**

- `src/services/audio/AudioRecorder.ts` - Audio capture service
- `src/services/audio/AudioPlayer.ts` - Audio playback service
- `public/audio-processor.js` - Recording worklet
- `public/audio-player-processor.js` - Playback worklet

**FEAT17 (Specs/Plans):**

- `docs/FEAT17_implementation_plan.md` - Detailed refactoring plan
- `docs/FEAT17_client_audio_spec.md` - Original spec
- `docs/FEAT17_progress.md` - Progress tracking
- `docs/EPIC02_realtime_interview_session.md` - Unified architecture
