# Current Task

## Task: FEAT17 - Implement Real-Time Client-Side Audio

**Status:** In Progress - Foundation Complete, Integration Pending

**Summary:**
The foundational audio components (`AudioRecorder` and `AudioPlayer`) are complete and unit-tested. During work on FEAT17, we discovered that a prerequisite feature (FEAT15 - basic session page) was partially implemented and needed completion. FEAT15 is now complete and provides a working foundation, but it uses a different architecture than what FEAT17 requires.

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

- Backend is handled by another team

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
         ↓ generateWorkerToken
         ↓ No StartRequest (auth via URL)
         ↓ Real audio + transcripts
Cloudflare Worker → STT/TTS/AI
```

---

## Decision Point

We need to decide how to proceed with FEAT17:

### Option A: Build FEAT17 Alongside FEAT15

- Keep FEAT15 as-is (local WebSocket, JSON, mock transcripts)
- Build new Cloudflare Worker backend for FEAT17
- Create new `generateWorkerToken` endpoint
- Build parallel audio-enabled session page
- **Pros**: FEAT15 remains working for testing/demo
- **Cons**: Duplicate code, two session implementations

### Option B: Migrate FEAT15 to FEAT17 Architecture

- Replace local WebSocket with Cloudflare Worker
- Migrate JSON to Protobuf
- Integrate audio components
- **Pros**: Single implementation, cleaner codebase
- **Cons**: Breaks current working FEAT15, more complex migration

### Option C: Pause FEAT17, Focus on Other Features

- Keep FEAT15 as-is
- Build feedback generation service (high priority)
- Return to FEAT17 audio integration later
- **Pros**: Addresses more immediate needs
- **Cons**: Audio features delayed

---

## Pending Work for FEAT17

### 1. Backend (Cloudflare Worker or Updated Server)

- [ ] Set up Cloudflare Worker or update existing WebSocket server for Protobuf
- [ ] Implement `generateWorkerToken` tRPC mutation
- [ ] Add Protobuf message encoding/decoding
- [ ] Integrate speech-to-text (Google/OpenAI)
- [ ] Integrate text-to-speech
- [ ] Integrate AI conversation logic

### 2. Frontend Integration

- [ ] Refactor `useInterviewSocket.ts` for Protobuf messages
- [ ] Integrate `AudioRecorder` service
- [ ] Integrate `AudioPlayer` service
- [ ] Update message handlers for new API contract
- [ ] Update URL construction with token parameter
- [ ] Remove StartRequest logic

### 3. UI Updates

- [ ] Display real-time transcripts from `transcript_update`
- [ ] Show audio recording status
- [ ] Handle new connection states
- [ ] Update error handling

### 4. Testing

- [ ] Rewrite hook tests for Protobuf API
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

**Immediate:** Decide on approach (Option A, B, or C above)

**If continuing with FEAT17:**

1. Choose backend architecture (Cloudflare Worker vs local server upgrade)
2. Implement `generateWorkerToken` endpoint
3. Begin refactoring `useInterviewSocket` for Protobuf
4. Test with mock Protobuf messages before full audio integration

**Documentation:**

- All FEAT15 docs updated
- FEAT17 specs exist but implementation not started
- Architecture gap now clearly documented

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
