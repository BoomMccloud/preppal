# CURRENT TASK: Implement Real-Time Interview Session (Backend)

## Feature Spec

- Follow the backend-related sections of the plan outlined in [FEAT15_session_page_spec.md](./FEAT15_session_page_spec.md), with the following clarifications.

## Clarifications

- **Port Configuration**: The WebSocket server port should be configurable via a `WSS_PORT` environment variable, defaulting to `3001`.
- **Authentication**: A new tRPC mutation, `interview.generateWsToken`, will be created. This will generate a JWT valid for 1 hour for a specific user and interview. The WebSocket server will authenticate requests by verifying this token.

## High-Level Plan

### Phase 1: tRPC Auth Token ✅
- [x] **RED**: Write a failing test for a new `interview.generateWsToken` tRPC mutation.
- [x] **GREEN**: Implement the `interview.generateWsToken` mutation. It should take an `interviewId`, authorize the user, and return a short-lived JWT signed with `NEXTAUTH_SECRET` containing `userId` and `interviewId` claims.

### Phase 2: Backend (WebSocket Server) ✅
- [x] **Install Deps**: `pnpm add ws @types/ws jose`.
- [x] **RED**: Create `src/server/ws/server.test.ts` and write failing tests for the core authentication (using the new token) and state change logic.
- [x] **GREEN**: Create `src/server/ws/server.ts` and implement the WebSocket server. It should read the port from `process.env.WSS_PORT`.
- [x] **Setup**: Create a `dev:ws` script in `package.json` to run the server.
- [x] **Config**: Add `WSS_PORT` to environment variable validation in `src/env.js`.

## Implementation Summary

### Phase 1: tRPC Auth Token ✅

**Test File**: `src/server/api/routers/interview.test.ts`
- Added test for successful token generation for owned interviews
- Added test for authorization failure when interview doesn't belong to user

**Implementation**: `src/server/api/routers/interview.ts`
- Created `generateWsToken` mutation that:
  - Verifies interview ownership via database lookup
  - Generates JWT with `userId` and `interviewId` claims
  - Uses `jose` library (SignJWT) with HS256 algorithm
  - Tokens expire after 1 hour
  - Returns `{ token: string }`

**Technical Note**: Used `/**  @vitest-environment node */` comment in test file to avoid JSDOM/Uint8Array compatibility issues with `jose` library.

### Phase 2: WebSocket Server ✅

**Dependencies Installed**:
- `ws@8.18.3` - WebSocket server implementation
- `@types/ws@8.18.1` - TypeScript definitions
- `jose@6.1.0` - JWT signing/verification (modern alternative to jsonwebtoken)

**Test File**: `src/server/ws/server.test.ts`
- Test server authentication with valid JWT tokens
- Test rejection of invalid/malformed tokens
- Test authorization (interview ownership verification)
- Test state transitions: PENDING → IN_PROGRESS → COMPLETED
- All 4 tests passing ✅

**Implementation**: `src/server/ws/server.ts`
- WebSocket server with JSON message protocol (following protobuf schema structure)
- JWT authentication using tokens from `interview.generateWsToken`
- Message handlers:
  - `StartRequest`: Authenticates, updates DB to IN_PROGRESS, sends StartResponse
  - `EndRequest`: Updates DB to COMPLETED, creates mock feedback, sends SessionEnded, closes connection
  - `AudioChunk`: Ignored in MVP (logged for debugging)
- Mock transcript streaming with realistic interview questions:
  - 4 pre-defined questions with variable delays (3-15 seconds)
  - Automatic session termination after final question
- Mock feedback generation: Creates sample feedback when interview completes (for MVP testing)
- Database integration for state management (status updates, timestamps, feedback creation)
- Graceful error handling and connection cleanup

**Configuration**:
- Added `dev:ws` script to `package.json`: `tsx src/server/ws/server.ts`
- Added `WSS_PORT` environment variable to `src/env.js` (defaults to "3001")
- Server can be started with: `pnpm dev:ws`

**Message Protocol** (JSON):
```typescript
// Client → Server
{
  start_request?: { auth_token: string, interview_id: string, audio_config?: {...} }
  end_request?: {}
  audio_chunk?: { audio_content: string }
}

// Server → Client
{
  start_response?: { session_id: string }
  partial_transcript?: { text: string, speaker: "USER" | "AI", is_final: boolean }
  session_ended?: { reason: "USER_INITIATED" | "AI_INITIATED" | "TIMEOUT" | "INTERNAL_ERROR", message?: string }
  error?: { code: number, message: string }
}
```

## Test Results

All tests passing ✅
- 9 interview router tests (including 2 new generateWsToken tests)
- 4 WebSocket server tests
- Total: 13/13 passing

## Next Steps

The backend is complete and ready for frontend integration. The next phase should implement:
1. Frontend session page (`/interview/[interviewId]/session`)
2. `TranscriptDisplay` component
3. Client-side state machine and WebSocket connection logic
4. Frontend tests for the session page
