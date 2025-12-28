# System Design

## 1. Architectural Overview

Preppal uses a hybrid architecture to optimize for both robust business logic and low-latency real-time communication:

1.  **Business Logic (Next.js)**: Handles authentication, database interactions, and the UI. Hosted on Vercel.
2.  **Real-Time Edge (Cloudflare Workers)**: Manages stateful, long-lived WebSocket connections for audio streaming. Hosted on Cloudflare's global edge network using **Durable Objects**.

**Why This Split?**
*   **Statefulness**: Next.js (serverless) cannot maintain long-lived connections efficiently. Cloudflare Durable Objects provide a dedicated, single-threaded environment for each 30-minute interview session.
*   **Performance**: Processing audio at the edge reduces latency between the user and the AI.

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

---

## 2. Critical User Journeys

The system is designed around five core actions that define the user experience:

1.  **Personalized Interview Setup**:
    *   User selects a Job Description, Resume, and AI Persona.
    *   **Tech**: `interviewRouter.createSession` creates an `Interview` record with immutable **snapshots** of this context to ensure historical accuracy.
2.  **Natural Audio Interaction**:
    *   User speaks naturally with the AI with minimal latency.
    *   **Tech**: `GeminiSession` (Durable Object) streams 16kHz PCM audio to Google's Gemini Live API via WebSockets.
3.  **Comprehensive Transcript Recording**:
    *   The entire conversation is captured.
    *   **Tech**: The Worker aggregates audio/text chunks via `TranscriptManager` and saves them as a compressed **Protobuf binary blob** in the `TranscriptEntry` table.
4.  **AI-Powered Analysis**:
    *   The system generates actionable feedback based on the specific job context.
    *   **Tech**: Post-interview, the Worker requests structured feedback (Communication, Content, Presentation) from Gemini and saves it to `InterviewFeedback`.
5.  **Feedback Accessibility**:
    *   User reviews scores and replays the interview.
    *   **Tech**: The frontend retrieves the structured data and binary transcript via `interviewRouter.getFeedback`.

---

## 3. Detailed Component Breakdown

### **A. Frontend (Client-Side)**
*   **Location**: `src/app/`
*   **Audio Engine**: Uses `AudioRecorder` (Web Audio API) to capture microphone input and resample it to 16kHz (Gemini's requirement). `AudioPlayer` manages the playback buffer for the 24kHz response.
*   **Communication**: Establishes a WebSocket connection to the Worker. All payloads are binary **Protocol Buffers** (not JSON) for performance.
*   **Key File**: `src/app/interview/[interviewId]/session/useInterviewSocket.ts` manages the connection lifecycle.

### **B. Backend (Business Logic)**
*   **Location**: `src/server/`
*   **Framework**: Next.js API Routes + tRPC.
*   **Responsibilities**:
    *   **CRUD**: Manages Users, Interviews, and Resumes via Prisma.
    *   **Auth**: Issues short-lived (5 min) **JWTs** for the Worker connection using `generateWorkerToken`.
    *   **Worker API**: Exposes a Protobuf-over-HTTP endpoint (`/api/worker`) for the Cloudflare Worker to submit transcripts and feedback securely.

### **C. Real-Time Edge (Cloudflare Worker)**
*   **Location**: `worker/`
*   **Core Logic**: The `GeminiSession` Durable Object is the "brain" of a live session.
    *   **Initialization**: Validates the JWT, then fetches the interview context (Job/Resume) from the Backend.
    *   **Streaming**: Proxies audio between the Frontend and Gemini Live API.
    *   **Reliability**: Implements the "Golden Path" for completion (see Section 5).

---

## 4. Data Models & Protocols

### **Database Schema (Prisma)**
*   **User**: Identity & Auth.
*   **Interview**: The central record. Contains `status` (PENDING, IN_PROGRESS, COMPLETED) and snapshots.
*   **TranscriptEntry**: Stores the full conversation history as a generic `Bytes` field (Protobuf blob).
*   **InterviewFeedback**: Structured analysis (Summary, Strengths, Weaknesses).

### **Protocol Buffers**
We use Protocol Buffers (protobufs) for all inter-service communication (e.g., Frontend <-> Worker, Worker <-> Backend). This ensures type safety, performance, and a consistent data contract across different environments (Node.js and Cloudflare Workers).

**Client <-> Worker (WebSocket)**
```protobuf
message ClientToServerMessage {
  oneof message {
    AudioChunk audio_chunk = 1; // 16kHz PCM
    EndRequest end_request = 2;
  }
}

message ServerToClientMessage {
  oneof message {
    TranscriptUpdate transcript_update = 1;
    AudioResponse audio_response = 2; // 24kHz PCM
    SessionEnded session_ended = 4;
  }
}
```

**Worker <-> Backend (HTTP)**
```protobuf
message WorkerApiRequest {
  oneof request {
    GetContextRequest get_context = 1;
    SubmitTranscriptRequest submit_transcript = 3;
    SubmitFeedbackRequest submit_feedback = 4;
  }
}
```

---

## 5. Reliability & Security

### **The "Golden Path" to Completion**
To prevent data loss, the interview completion process follows a strict sequence:
1.  **Atomic Save**: The Worker calls `submitTranscript`. The backend saves the data AND updates status to `COMPLETED` in a single transaction. This is the "Point of No Return".
2.  **Best-Effort Enrichment**: The Worker *then* attempts to generate and save feedback. If this fails, the interview is still safe and valid, just without the AI summary.
3.  **Handshake**: The Worker signals `session_ended` to the client only after step 1 succeeds.

### **Security Layers**
1.  **User Auth**: NextAuth.js (Google/Email).
2.  **Worker Auth**:
    *   **Frontend -> Worker**: 5-minute signed JWTs containing `userId` and `interviewId`.
    *   **Worker -> Backend**: `Authorization: Bearer <WORKER_SHARED_SECRET>` for privileged API access.

---

## 6. Project Structure

```
preppal/
├── src/
│   ├── app/
│   │   ├── api/worker/route.ts      # Protobuf API for Worker
│   │   ├── interview/               # Interview UI (Lobby, Session, Feedback)
│   │   └── ...
│   ├── server/api/routers/          # tRPC Routers
│   │   ├── interview.ts             # Main business logic
│   │   └── ...
│   ├── lib/audio/                   # Audio processing logic
│   └── lib/interview_pb.js          # Generated Protobuf code
├── worker/                          # Cloudflare Worker code
│   ├── src/
│   │   ├── gemini-session.ts        # Durable Object (The Session Controller)
│   │   ├── gemini-client.ts         # Google API Client
│   │   └── ...
├── proto/                           # Protocol Buffer definitions
├── prisma/                          # Database schema
└── docs/                            # Documentation
```