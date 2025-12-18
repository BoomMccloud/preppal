# System Design

### Architectural Overview

Preppal uses a distributed architecture that separates business logic from real-time communication. The Next.js application handles authentication, data persistence, and serves the frontend, while **Cloudflare Workers with Durable Objects** manage stateful, long-lived WebSocket connections for real-time audio streaming.

**Why This Architecture?**

1. **Separation of Concerns**: The Next.js application excels at handling business logic, data persistence, and serving the frontend, while Cloudflare's global network is purpose-built for high-performance, real-time communication at the edge.
2. **Scalability & Statefulness**: Serverless functions (like Vercel's) are not optimized for long-lived, stateful connections like a 30-minute interview. Cloudflare Durable Objects are designed specifically for this, providing a stateful, single-threaded environment for each interview session that can scale massively.
3. **Cost-Effectiveness**: Billing for Durable Objects is based on active use, which is a more efficient model for this use case than keeping a serverless function warm or running for extended periods.

```
+--------------------------------+      (2) WebSocket + JWT        +---------------------------------+
|                                |-------------------------------->|                                 |
|    Frontend (Next.js/React)    |                                 |  Cloudflare Worker (Edge)       |
|                                |      +------------------------->|   - WebSocket Termination       |
|  - UI / Audio Capture+Playback |      | (5) Protobuf API         |   - Gemini API Client           |
|  - Protobuf Encoding/Decoding  |      |     (Context, Transcript,|   - Durable Object (GeminiSession)
|  - tRPC Client (Business Logic)|      |      Feedback, Status)   |   - Transcript Manager          |
+---------------+----------------+      |                          +----------------+----------------+
                |                       |                                           | (3) Bi-directional
(1) tRPC for    |                       |                                           |     Audio Stream
    Auth/Data   |                       |                                           |
                |                       |                          +----------------+----------------+
+---------------+----------------+      |                          |                                 |
|                                |      |                          |   Gemini Live API (Google Cloud)|
|      Backend (Next.js)         |<-----+                          |                                 |
|                                |                                 +---------------------------------+
|  - tRPC Router (Business Logic)|
|  - Protobuf API (/api/worker)  |
|  - Prisma ORM                  |
|  - NextAuth.js (v5 Beta)       |
+---------------+----------------+
                |
(4) Prisma ORM  |
    Queries     |
+---------------+--+
|                  |
|   PostgreSQL     |
|   Database       |
|                  |
+------------------+
```

### **Core Technologies**

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (React 19) |
| **Backend (Business Logic)** | Next.js API Routes with tRPC v11 |
| **Backend (Real-time)** | Cloudflare Workers with Durable Objects |
| **Database** | PostgreSQL with Prisma ORM |
| **Real-time Communication** | WebSockets (binary frames) |
| **API (Non-real-time)** | tRPC for user-facing endpoints |
| **Worker-Backend API** | Protocol Buffers over HTTP POST |
| **Data Serialization** | Protocol Buffers (all real-time + worker communication) |
| **Authentication** | NextAuth.js v5 Beta (Google OAuth + dev credentials) |
| **Audio Processing** | Web Audio API with AudioWorklet (16kHz PCM) |

---

## Component Breakdown

### **1. Frontend (Client-Side)**

**Location**: `src/app/`

**Responsibilities**:

- **User Interface**: Renders the interview lobby, live session, and feedback pages.
- **Authentication**: Uses NextAuth.js to handle user sign-in and session management.
- **Business Logic API**: Uses tRPC to communicate with the Next.js backend for all non-real-time data.
- **Real-time Communication**:
  - Establishes and manages a WebSocket connection to the **Cloudflare Worker** for the duration of the interview.
  - Captures microphone audio via `AudioRecorder` (Web Audio API + AudioWorklet).
  - Resamples audio to 16kHz PCM before transmission.
  - Encodes audio into Protobuf `ClientToServerMessage` messages.
  - Receives `ServerToClientMessage` from Worker, decodes audio and transcript updates.
  - Plays back AI audio via `AudioPlayer` with proper scheduling.
  - Supports "barge-in" detection (user interrupts AI speech).

**Key Files**:
- `src/app/interview/[interviewId]/session/useInterviewSocket.ts` - WebSocket lifecycle management
- `src/lib/audio/AudioRecorder.ts` - Microphone capture with resampling
- `src/lib/audio/AudioPlayer.ts` - Audio playback with buffering
- `src/lib/audio/RawAudioClient.ts` - Protobuf encoding/decoding wrapper

---

### **2. Backend - Next.js (Business Logic Server)**

**Location**: `src/server/`

**Framework**: Hosted on Vercel as a standard Next.js application.

**Responsibilities**:

- **tRPC API** (`src/server/api/routers/`): Handles all standard CRUD operations and business logic.

  **Interview Router** (`interview.ts`):
  | Endpoint | Auth | Description |
  |----------|------|-------------|
  | `createSession` | User | Creates interview with idempotency key |
  | `generateWorkerToken` | User | Issues 5-minute JWT for Worker connection |
  | `generateWsToken` | User | Issues 1-hour JWT for WebSocket |
  | `getHistory` | User | Lists user's past interviews |
  | `getById` | User | Gets interview details |
  | `getCurrent` | User | Gets active interview if any |
  | `getFeedback` | User | Gets AI-generated feedback |
  | `delete` | User | Deletes an interview |
  | `updateStatus` | User/Worker | Updates interview status |
  | `getContext` | Worker | Fetches job description, resume, persona |
  | `submitTranscript` | Worker | Saves transcript entries |
  | `submitFeedback` | Worker | Saves AI-generated feedback |

  **User Router** (`user.ts`):
  | Endpoint | Auth | Description |
  |----------|------|-------------|
  | `getProfile` | User | Gets user profile |

- **Protobuf API** (`src/app/api/worker/route.ts`): Handles Worker-to-Backend communication via Protobuf over HTTP POST. Routes `WorkerApiRequest` messages to appropriate handlers.

- **Database Management**: The sole owner of the database connection (via Prisma). Persists all user, interview, transcript, and feedback data.

- **Authentication**: Manages user sessions via NextAuth.js v5 Beta.

**Authentication Methods**:
1. **User-based (Session)**: NextAuth.js session with user ID
2. **Worker-based (Shared Secret)**: `Authorization: Bearer {WORKER_SHARED_SECRET}`

---

### **3. Backend - Cloudflare Worker (Real-time Server)**

**Location**: `worker/`

**Framework**: Deployed on the Cloudflare Edge network.

**Responsibilities**:

- **WebSocket Server** (`worker/src/index.ts`): Listens for incoming WebSocket connections from the frontend. Validates JWT tokens and routes to Durable Objects.

- **Durable Object** (`worker/src/gemini-session.ts`): `GeminiSession` class manages state for each individual interview session:
  - Stores userId, interviewId (from JWT)
  - Fetches interview context (job description, resume, persona) from backend
  - Maintains transcript accumulator
  - Handles graceful shutdown

- **Gemini Live API Client** (`worker/src/gemini-client.ts`): Initiates and maintains a bi-directional stream with the Google Gemini Live API for the duration of the call.

- **Services**:
  - `InterviewLifecycleManager` - Orchestrates interview workflow and status transitions
  - `GeminiStreamHandler` - Streams audio/transcript from Gemini, encodes as Protobuf
  - `WebSocketMessageHandler` - Parses incoming Protobuf, routes to handlers
  - `TranscriptManager` - Accumulates and batches transcript entries
  - `ApiClient` - Sends Protobuf requests to Next.js backend

- **Data Persistence**: Upon interview completion, submits transcript and AI feedback to backend via Protobuf API.

**Key Files**:
```
worker/src/
├── index.ts                    # Entry point, JWT validation, routing
├── gemini-session.ts           # Durable Object implementation
├── gemini-client.ts            # Gemini Live API client
├── api-client.ts               # Backend API communication
├── audio-converter.ts          # Audio format conversion
├── transcript-manager.ts       # Transcript accumulation
├── services/
│   ├── interview-lifecycle-manager.ts
│   └── gemini-stream-handler.ts
└── handlers/
    └── websocket-message-handler.ts
```

---

### **4. Database**

**Location**: `prisma/schema.prisma`

**ORM**: Prisma handles all database communication with full type safety, exclusively through the Next.js backend.

**Core Models**:

| Model | Description |
|-------|-------------|
| `User` | NextAuth user (email, name, image) |
| `Interview` | Interview session with status, timestamps, job/resume snapshots |
| `InterviewFeedback` | AI-generated feedback (summary, strengths, areas to improve) |
| `TranscriptEntry` | Individual transcript entries with speaker and timestamp |
| `JobDescription` | User's job description library |
| `Resume` | User's resume library |

**Interview Status Flow**:
```
PENDING → IN_PROGRESS → COMPLETED
                     → ERROR
```

**Key Design Decisions**:
- **Idempotency**: Interview creation includes idempotency key to prevent duplicates
- **Snapshots**: Job description and resume text are copied at interview creation for immutable historical records
- **Personas**: Each interview stores its AI interviewer persona/prompt

---

### **5. Protocol Buffers Schema**

**Location**: `proto/interview.proto`

**Generated Code**: `src/lib/interview_pb.js` + `worker/src/lib/interview_pb.js`

#### Client ↔ Worker (WebSocket)

```protobuf
// Sent from client to worker
message ClientToServerMessage {
  oneof message {
    AudioChunk audio_chunk = 1;
    EndRequest end_request = 2;
  }
}

message AudioChunk {
  bytes audio_content = 1;  // 16kHz PCM audio
}

message EndRequest {}

// Sent from worker to client
message ServerToClientMessage {
  oneof message {
    TranscriptUpdate transcript_update = 1;
    AudioResponse audio_response = 2;
    ErrorResponse error_response = 3;
    SessionEnded session_ended = 4;
  }
}

message TranscriptUpdate {
  string speaker = 1;      // "USER" or "AI"
  string text = 2;
  bool is_final = 3;
  bool turn_complete = 4;
}

message AudioResponse {
  bytes audio_content = 1;  // 24kHz PCM audio from Gemini
}

message ErrorResponse {
  int32 code = 1;
  string message = 2;
}

message SessionEnded {
  Reason reason = 1;
  enum Reason {
    UNKNOWN = 0;
    USER_ENDED = 1;
    ERROR = 2;
    TIMEOUT = 3;
  }
}
```

#### Worker ↔ Backend (HTTP POST)

```protobuf
message WorkerApiRequest {
  oneof request {
    GetContextRequest get_context = 1;
    UpdateStatusRequest update_status = 2;
    SubmitTranscriptRequest submit_transcript = 3;
    SubmitFeedbackRequest submit_feedback = 4;
  }
}

message WorkerApiResponse {
  oneof response {
    GetContextResponse get_context = 1;
    UpdateStatusResponse update_status = 2;
    SubmitTranscriptResponse submit_transcript = 3;
    SubmitFeedbackResponse submit_feedback = 4;
    ErrorResponse error = 5;
  }
}
```

---

## Data Flow for a Live Interview

### A. Interview Initialization

```
1. User clicks "Start Interview"
   Frontend → tRPC: interview.createSession(jobDescriptionId, resumeId)
   ↓ (creates PENDING interview with idempotency key)

2. Frontend receives interviewId
   Frontend → tRPC: interview.generateWorkerToken(interviewId)
   ↓ (verifies ownership, issues 5-minute JWT)

3. Frontend establishes WebSocket
   Frontend → Worker: WebSocket /interview/{interviewId}?token={jwt}
   ↓ (validates JWT, extracts userId + interviewId)

4. Worker routes to Durable Object
   Worker → Durable Object: GeminiSession.fetch()
   ↓ (creates or retrieves session for interviewId)

5. Durable Object fetches context
   Durable Object → Backend API: getContext (Protobuf)
   ↓ (returns job description, resume, persona)

6. Durable Object connects to Gemini
   Durable Object → Gemini Live API: Create session with persona
   ↓ (bi-directional stream established)

7. Interview begins
   Backend: interview.updateStatus(IN_PROGRESS)
```

### B. Live Interview (Audio Streaming)

```
User speaks:
  Frontend (Microphone) → AudioRecorder (resample to 16kHz)
    → Protobuf encode (ClientToServerMessage.audio_chunk)
    → WebSocket → Worker → Durable Object
    → Gemini Live API

AI responds:
  Gemini Live API → Durable Object
    → Protobuf encode (ServerToClientMessage.audio_response + transcript_update)
    → WebSocket → Frontend
    → AudioPlayer (24kHz playback) + Transcript UI
```

### C. Interview Completion

```
1. User clicks "End Interview"
   Frontend → WebSocket: ClientToServerMessage.end_request

2. Worker closes Gemini connection
   Durable Object → Gemini Live API: Close stream
   ↓ (Gemini may send final transcript/feedback)

3. Worker submits data to backend
   Durable Object → Backend API: submitTranscript (Protobuf)
   Durable Object → Backend API: submitFeedback (Protobuf)
   Durable Object → Backend API: updateStatus(COMPLETED)

4. Worker notifies frontend
   Durable Object → WebSocket: ServerToClientMessage.session_ended
   ↓ (WebSocket closes)

5. Frontend navigates to feedback
   Frontend → tRPC: interview.getById (polls until COMPLETED)
   Frontend → Navigate to /interview/{id}/feedback
```

---

## File Structure

```
preppal/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── worker/route.ts          # Protobuf API for Worker
│   │   │   ├── trpc/[trpc]/route.ts     # tRPC endpoint
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── interview/[interviewId]/
│   │   │   ├── lobby/                   # Pre-interview setup
│   │   │   ├── session/                 # Live interview UI
│   │   │   │   ├── useInterviewSocket.ts
│   │   │   │   └── SessionContent.tsx
│   │   │   └── feedback/                # Results page
│   │   └── ...pages
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   │   ├── interview.ts         # Interview CRUD + Worker endpoints
│   │   │   │   └── user.ts              # User profile
│   │   │   ├── trpc.ts                  # Procedure definitions
│   │   │   └── root.ts                  # Router aggregation
│   │   ├── auth/config.ts               # NextAuth configuration
│   │   └── db.ts                        # Prisma client
│   └── lib/
│       ├── audio/
│       │   ├── AudioRecorder.ts         # Microphone capture
│       │   ├── AudioPlayer.ts           # Audio playback
│       │   └── RawAudioClient.ts        # WebSocket + Protobuf wrapper
│       └── interview_pb.js              # Generated Protobuf code
├── worker/
│   ├── src/
│   │   ├── index.ts                     # Entry point
│   │   ├── gemini-session.ts            # Durable Object
│   │   ├── gemini-client.ts             # Gemini API client
│   │   ├── api-client.ts                # Backend API client
│   │   ├── services/                    # Business logic services
│   │   └── handlers/                    # Message handlers
│   └── wrangler.toml                    # Cloudflare configuration
├── proto/
│   └── interview.proto                  # Protobuf definitions
├── prisma/
│   ├── schema.prisma                    # Database schema
│   └── migrations/                      # Migration history
└── docs/
    └── 01_design.md                     # This document
```

---

## Security Considerations

1. **JWT Tokens**: Short-lived (5 minutes) tokens for Worker authentication, verified on every connection.
2. **Shared Secret**: Worker-to-Backend communication uses `WORKER_SHARED_SECRET` for authentication.
3. **User Ownership**: All interview operations verify the user owns the interview.
4. **Idempotency**: Prevents duplicate interview creation from retry logic.
5. **Snapshots**: Job/resume data is copied at creation time, preventing tampering.
