# System Design

### Architectural Evolution: Introducing Cloudflare Workers

The original design proposed a monolithic backend where the Next.js server would handle both standard API requests (tRPC) and manage stateful, long-lived WebSocket connections for real-time audio streaming.

Upon review, we have evolved this design to a more robust, scalable, and cost-effective architecture by introducing **Cloudflare Workers with Durable Objects**.

**Why the Change?**

1.  **Separation of Concerns**: This new architecture creates a clean separation. The Next.js application excels at handling business logic, data persistence, and serving the frontend, while Cloudflare's global network is purpose-built for high-performance, real-time communication at the edge.
2.  **Scalability & Statefulness**: Serverless functions (like Vercel's) are not optimized for long-lived, stateful connections like a 30-minute interview. Cloudflare Durable Objects are designed specifically for this, providing a stateful, single-threaded environment for each interview session that can scale massively.
3.  **Cost-Effectiveness**: Billing for Durable Objects is based on active use, which is a more efficient model for this use case than keeping a serverless function warm or running for extended periods.

This strategic shift allows us to use the best tool for each job, resulting in a more resilient and efficient system.

```
+--------------------------------+      (2) WebSocket + Token      +---------------------------------+
|                                |-------------------------------->|                                 |
|    Frontend (Next.js/React)    |                                |  Cloudflare Worker (Edge)       |
|                                |      +------------------------->|   - WebSocket Termination       |
|  - UI / Audio / Protobuf       |      | (5) Transcript          |   - Gemini API Client           |
|  - tRPC Client (Business Logic)|      |     Submission          |   - Durable Object for State    |
+---------------+----------------+      |                         +----------------+----------------+
                |                       |                                          | (3) Bi-directional
(1) tRPC for    |                       |                                          |     Audio Stream
    Auth/Data   |                       |                                          |
                |                       |                         +----------------+----------------+
+---------------+----------------+      |                         |                                 |
|                                |      |                         |   Gemini Live API (Google Cloud)|
|      Backend (Next.js)         |<-----+                         |                                 |
|                                |                                +---------------------------------+
|  - tRPC Router (Business Logic)|
|  - Prisma ORM                  |
|  - User/Interview DB Mgmt      |
+---------------+----------------+
                |
(4) Prisma ORM  |
    Queries     |
+---------------+--+
|                  |
|   User Database  |
|   (SQLite/Postgres)|
|                  |
+------------------+
```

### **Core Technologies**

- **Frontend**: Next.js (React)
- **Backend (Business Logic)**: Next.js (API Routes with tRPC)
- **Backend (Real-time)**: Cloudflare Workers with Durable Objects
- **Database**: SQLite (for MVP) with Prisma ORM
- **Real-time Communication**: WebSockets for the bi-directional audio stream
- **API (Non-real-time)**: tRPC for standard data fetching (user profiles, etc.)
- **Data Serialization**: Protocol Buffers (Protobufs) for all real-time audio data
- **Authentication**: NextAuth.js

### **Component Breakdown**

#### **1. Frontend (Client-Side)**

- **Responsibilities**:
  - **User Interface**: Renders the meeting screen, controls, and feedback display.
  - **Authentication**: Uses NextAuth.js to handle user sign-in and session management.
  - **Business Logic API**: Uses tRPC to communicate with the Next.js backend for all non-real-time data (e.g., creating an interview, fetching history, generating connection tokens).
  - **Real-time Communication**:
    - Establishes and manages a WebSocket connection to the **Cloudflare Worker** for the duration of the interview.
    - Captures microphone audio, encodes it into Protobuf messages.
    - Streams the Protobuf-encoded audio data to the Cloudflare Worker via the WebSocket.
    - Receives Protobuf-encoded audio from the Worker, decodes it, and plays it back to the user.

#### **2. Backend - Next.js (Business Logic Server)**

- **Framework**: Hosted on Vercel as a standard Next.js application.
- **Responsibilities**:
  - **tRPC API**: Handles all standard CRUD operations and business logic.
    - `user.getProfile`, `interview.getHistory`
    - **`interview.generateWorkerToken`**: A new, critical endpoint that authorizes a user to connect to the real-time service.
    - **`interview.submitTranscript`**: A new, internal-only endpoint for the Cloudflare Worker to post the completed interview data back to the database.
  - **Database Management**: The sole owner of the database connection (via Prisma). It persists all user and interview data.
  - **Authentication**: Manages user sessions via NextAuth.js.

#### **3. Backend - Cloudflare Worker (Real-time Server)**

- **Framework**: Deployed on the Cloudflare Edge network.
- **Responsibilities**:
  - **WebSocket Server**: Listens for incoming WebSocket connections from the frontend. It uses a **Durable Object** to manage the state for each individual interview session.
  - **Gemini Live API Client**: The Durable Object initiates and maintains a bi-directional stream with the Google Gemini Live API for the duration of the call.
  - **Proxy & State Management**: It acts as a secure proxy, forwarding audio data between the user and the Gemini API. It also buffers the transcript and other session metadata within the Durable Object.
  - **Data Persistence**: Upon interview completion, it calls the `interview.submitTranscript` tRPC endpoint on the Next.js backend to persist the final data.

#### **4. Database**

- **ORM**: Prisma handles all database communication with full type safety, exclusively through the Next.js backend.
- **Responsibilities**:
  - Store user profile information.
  - Persist metadata and the final transcript for each interview session.

#### **5. Protobufs: The Communication Schema**

This remains the unchanged contract for real-time data between the client and the real-time server (the Cloudflare Worker).

**Example `audio.proto` file:**

```protobuf
syntax = "proto3";

package interview_prep;

// Sent from client to server and from server to Gemini
message ClientAudioChunk {
  bytes audio_content = 1; // A chunk of raw audio data
  uint64 timestamp = 2;
}

// Sent from Gemini to server and from server to client
message ServerAudioChunk {
  bytes audio_content = 1; // A chunk of raw audio data from the AI
  uint64 timestamp = 2;
}
```

### **Data Flow for a Live Interview**

1.  **Initialization**: A user clicks "Start Interview." The frontend makes a tRPC call (`interview.createSession`) to the Next.js backend to create an interview record in the database.
2.  **Authorization**: The frontend then calls a new tRPC mutation, `interview.generateWorkerToken`, passing the `interviewId`. The Next.js backend verifies ownership and returns a short-lived JWT.
3.  **WebSocket Connection**: The frontend establishes a WebSocket connection to the **Cloudflare Worker**, passing the `interviewId` and the JWT for authentication.
4.  **Durable Object Activation**: The Worker validates the token and forwards the connection to the specific Durable Object instance responsible for this `interviewId`.
5.  **Gemini Connection**: The Durable Object receives the connection and initiates its own bi-directional stream to the Gemini Live API.
6.  **Client-to-AI Stream**:
    - The frontend captures audio, serializes it via Protobuf, and sends it to the Durable Object.
    - The Durable Object deserializes it and forwards the raw audio to the Gemini Live API.
7.  **AI-to-Client Stream**:
    - The Gemini API sends audio back to the Durable Object.
    - The Durable Object serializes it via Protobuf and sends it down to the frontend.
    - The frontend deserializes and plays the audio.
8.  **Termination & Data Persistence**: When the user ends the interview, the WebSocket is closed. The Durable Object bundles the full transcript and makes a secure, server-to-server `fetch` call to the `interview.submitTranscript` tRPC endpoint on the Next.js backend to save the data.
