# System Design

```
+--------------------------------+
|                                |
|    Frontend (Next.js/React)    |
|                                |
|  - UI / Meeting Screen         |
|  - Audio Capture/Playback      |
|  - Protobuf Encoding/Decoding  |
|  - tRPC Client (User Data)     |
|                                |
+---------------+----------------+
                |
(1) tRPC for    | (2) Protobuf over WebSocket
    User Data   |     for Live Audio Stream
                |
+---------------+----------------+
|                                |
|      Backend (Next.js)         |
|                                |
|  - tRPC Router (User Mgmt)     |
|  - WebSocket Server            |
|  - Gemini Live API Client      |
|  - Protobuf Encoding/Decoding  |
|                                |
+---------------+----------------+
                |                |
(3) Prisma ORM  |                | (4) Bi-directional
    Queries     |                |     Audio Stream
                |                |
+---------------+--+      +------+-----------------+
|                  |      |                        |
|   User Database  |      |   Gemini Live API      |
|   (PostgreSQL)   |      |   (Google Cloud)       |
|                  |      |                        |
+------------------+      +------------------------+
```

### **Core Technologies**

- **Frontend**: Next.js (React)
- **Backend**: Next.js (API Routes with a custom WebSocket server)
- **Database**: SQLite (for MVP) with Prisma ORM
- **Real-time Communication**: WebSockets for the bi-directional audio stream
- **API (Non-real-time)**: tRPC for standard data fetching (user profiles, etc.)
- **Data Serialization**: Protocol Buffers (Protobufs) for all real-time audio data
- **Authentication**: NextAuth.js (included in T3 boilerplate)

### **Component Breakdown**

#### **1. Frontend (Client-Side)**

- **Framework**: Built with Next.js and React, as provided by the T3 boilerplate.
- **Responsibilities**:
  - **User Interface**: Renders the meeting screen, controls, and feedback display.
  - **Authentication**: Uses NextAuth.js to handle user sign-in and session management.
  - **Standard Data Fetching**: Uses tRPC to fetch and update user profile information and past interview history from the backend. This is for non-real-time data.
  - **Real-time Communication**:
    - Establishes and manages a WebSocket connection to the backend server for the duration of the interview.
    - Captures microphone audio, encodes it into Protobuf messages using a library like `protobuf.js`.
    - Streams the Protobuf-encoded audio data to the backend via the WebSocket.
    - Receives Protobuf-encoded audio from the backend, decodes it, and plays it back to the user in real-time.

#### **2. Backend (Server-Side)**

- **Framework**: Hosted within the Next.js application, either via API Routes with a custom server setup to handle WebSockets or as a standalone Node.js server.
- **Responsibilities**:
  - **tRPC API**: Handles standard CRUD (Create, Read, Update, Delete) operations for user data. For example, `user.getProfile` or `interview.getHistory`. This leverages the existing T3 stack patterns.
  - **WebSocket Server**:
    - Listens for incoming WebSocket connections from the frontend.
    - Manages the lifecycle of each interview session.
  - **Gemini Live API Client**:
    - Upon receiving a WebSocket connection, it initiates and maintains a bi-directional stream with the Google Gemini Live API.
    - It acts as a proxy, forwarding audio data between the user and the Gemini API.
  - **Data Handling**:
    - Receives Protobuf messages from the client, decodes them, and forwards the raw audio data to the Gemini Live API.
    - Receives audio data from the Gemini Live API, encodes it into Protobuf messages, and sends it to the client via the WebSocket.

#### **3. Database**

- **ORM**: Prisma handles all database communication with full type safety.
- **Responsibilities**:
  - Store user profile information (name, goals, etc.).
  - Persist metadata about each interview session (e.g., start time, end time, topics discussed, AI-generated feedback summary after the call).
  - The actual audio stream is not stored in the database to keep the MVP simple and efficient.

#### **4. Protobufs: The Communication Schema**

This is the core of your real-time communication. You would define a `.proto` file that specifies the structure of the messages being sent.

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

1.  **Initialization**: A user signs in (via NextAuth.js) and clicks "Start Interview." The frontend might make a tRPC call (`interview.startSession`) to the backend to create an interview record in the database via Prisma.
2.  **WebSocket Connection**: The frontend establishes a WebSocket connection to the backend server.
3.  **Gemini Connection**: The backend receives the WebSocket connection, authenticates the user, and initiates a bi-directional stream to the Gemini Live API.
4.  **Client-to-AI Stream**:
    - The frontend captures a chunk of audio from the user's microphone.
    - It serializes this audio chunk using the `ClientAudioChunk` Protobuf schema.
    - The Protobuf message is sent through the WebSocket to the backend.
    - The backend receives and deserializes the message and immediately forwards the raw audio chunk to the Gemini Live API.
5.  **AI-to-Client Stream**:
    - The Gemini Live API sends a chunk of AI-generated audio back to the backend.
    - The backend serializes this audio using the `ServerAudioChunk` Protobuf schema.
    - The Protobuf message is sent through the WebSocket to the frontend.
    - The frontend receives and deserializes the message and plays the audio chunk to the user.
6.  **Termination**: When the user ends the interview, the WebSocket is closed. The frontend can make a final tRPC call (`interview.endSession`) to update the interview record with duration and any final metadata.
