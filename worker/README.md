# Cloudflare Worker for Preppal

This worker handles real-time communication between the Preppal frontend and the Gemini Live API. It runs as a Cloudflare Durable Object, maintaining stateful WebSocket connections for each interview session.

## Quick Reference

| File                                      | Purpose                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `src/index.ts`                            | Entry point - HTTP routing, JWT validation, DO dispatch  |
| `src/gemini-session.ts`                   | Durable Object - session orchestration, WebSocket server |
| `src/services/gemini-stream-handler.ts`   | Gemini Live API connection and audio streaming           |
| `src/services/interview-lifecycle-manager.ts` | Backend API coordination (status, transcript, feedback) |
| `src/handlers/gemini-message-handler.ts`  | Processes Gemini responses → protobuf messages           |
| `src/handlers/websocket-message-handler.ts` | Decodes client protobuf messages                        |
| `src/transcript-manager.ts`               | Turn-based transcript aggregation and serialization      |
| `src/api-client.ts`                       | Protobuf API client for Next.js backend communication    |
| `src/gemini-client.ts`                    | Google GenAI SDK wrapper                                 |
| `src/audio-converter.ts`                  | Binary ↔ Base64 audio conversion                         |
| `src/messages.ts`                         | Protobuf message encoding/decoding helpers               |
| `src/auth.ts`                             | JWT token validation                                     |
| `src/constants.ts`                        | WebSocket codes, error codes, configuration              |
| `src/interfaces/index.ts`                 | Type definitions and interfaces for DI                   |
| `src/utils/build-system-prompt.ts`        | Dynamic system instruction generation                    |
| `src/utils/feedback.ts`                   | AI feedback generation from transcript                   |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUDFLARE WORKER                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ index.ts (Entry Point)                                               │   │
│  │                                                                       │   │
│  │  Request → /health?        → Health check response                   │   │
│  │          → /<interviewId>? → JWT validation                          │   │
│  │                             → Route to Durable Object                │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ GeminiSession (Durable Object)                                       │   │
│  │                                                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │ Services                                                       │  │   │
│  │  │  • InterviewLifecycleManager  → Backend API coordination      │  │   │
│  │  │  • GeminiStreamHandler        → Gemini Live API streaming     │  │   │
│  │  │  • WebSocketMessageHandler    → Client message decoding       │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  WebSocket ←──────────────────────────────────────────→ Client       │   │
│  │       ↓                                                              │   │
│  │  GeminiStreamHandler ←─────────────────────────────→ Gemini Live API │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Durable Object Per Interview

Each interview session gets its own Durable Object instance, identified by `interviewId`. This provides:
- Isolated state per interview
- Persistent WebSocket connections
- Automatic cleanup when connection closes

```typescript
// In index.ts - route to named Durable Object
const id = env.GEMINI_SESSION.idFromName(interviewId);
const stub = env.GEMINI_SESSION.get(id);
return stub.fetch(request);
```

### 2. Service-Oriented Design

The Durable Object delegates to specialized services:

```typescript
// GeminiSession orchestrates services
class GeminiSession {
  private apiClient: IApiClient;              // Backend communication
  private lifecycleManager: InterviewLifecycleManager;  // Session lifecycle
  private streamHandler: GeminiStreamHandler; // Gemini streaming
  private wsMessageHandler: WebSocketMessageHandler;    // Client messages
}
```

### 3. Protobuf for All Communication

Binary protobuf messages are used for:
- **Client ↔ Worker**: `ClientToServerMessage`, `ServerToClientMessage`
- **Worker ↔ Backend**: `WorkerApiRequest`, `WorkerApiResponse`
- **Transcript Storage**: `Transcript` with `Turn` entries

```typescript
// Client sends audio chunk (protobuf)
{ payload: { case: "audioChunk", value: { audioContent: Uint8Array } } }

// Worker sends transcript update (protobuf)
{ payload: { case: "transcriptUpdate", value: { speaker, text, isFinal } } }
```

### 4. Callback-Based Event Flow

Gemini events flow through callbacks to the Durable Object:

```typescript
this.streamHandler = new GeminiStreamHandler(apiKey, {
  onAudio: (data) => this.safeSend(ws, data),
  onUserTranscript: (data) => this.safeSend(ws, data),
  onAITranscript: (data) => this.safeSend(ws, data),
  onError: (err) => this.handleStreamError(ws, err),
  onClose: () => this.handleStreamClose(ws),
});
```

## Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SESSION LIFECYCLE                                │
│                                                                          │
│  1. CONNECTION                                                          │
│     Client → WebSocket upgrade request with JWT token                   │
│            │                                                             │
│            ▼                                                             │
│     index.ts validates JWT, extracts userId/interviewId                 │
│            │                                                             │
│            ▼                                                             │
│     GeminiSession.fetch() called                                        │
│            │                                                             │
│            ▼                                                             │
│     initializeSession():                                                │
│       • lifecycleManager.initializeSession() → fetch context from API  │
│       • Update interview status to IN_PROGRESS                          │
│       • Create GeminiStreamHandler → connect to Gemini Live API        │
│       • Setup WebSocket event listeners                                 │
│       • Start duration timeout                                          │
│                                                                          │
│  2. STREAMING (Active Interview)                                        │
│                                                                          │
│     ┌──────────────┐    Audio Chunks     ┌──────────────────┐          │
│     │    Client    │ ─────────────────→  │  GeminiSession   │          │
│     │  (Browser)   │                      │ (Durable Object) │          │
│     └──────────────┘                      └────────┬─────────┘          │
│            ▲                                       │                     │
│            │                                       ▼                     │
│            │                              ┌──────────────────┐          │
│            │                              │ GeminiStreamHandler│         │
│            │                              └────────┬─────────┘          │
│            │                                       │                     │
│            │                                       ▼                     │
│            │                              ┌──────────────────┐          │
│            │    Audio + Transcripts       │ Gemini Live API  │          │
│            │ ◀─────────────────────────── │                  │          │
│            │                              └──────────────────┘          │
│                                                                          │
│  3. TERMINATION                                                         │
│                                                                          │
│     Triggers:                                                           │
│       • User clicks "End Interview" → EndRequest message               │
│       • Duration timeout expires                                        │
│       • Gemini closes connection                                        │
│       • WebSocket error                                                 │
│                                                                          │
│     Finalization:                                                       │
│       • Disconnect from Gemini                                          │
│       • Send SessionEnded message with reason                          │
│       • Submit transcript to backend (protobuf binary)                 │
│       • Generate and submit feedback (for non-block interviews)        │
│       • Update interview status to COMPLETED                           │
│       • Close WebSocket with appropriate code                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Audio Flow (User → AI)

```
┌──────────┐   Protobuf    ┌──────────────┐   Base64    ┌──────────────┐
│  Client  │ ──────────→   │ GeminiSession │ ─────────→ │ Gemini Live  │
│ (Browser)│  AudioChunk   │              │   PCM       │     API      │
└──────────┘   Binary      └──────────────┘             └──────────────┘

1. Client captures audio via AudioRecorder (PCM 16kHz)
2. Sends as protobuf AudioChunk (binary)
3. Worker converts to Base64
4. Forwards to Gemini via sendRealtimeInput()
```

### Audio Flow (AI → User)

```
┌──────────────┐   Base64    ┌──────────────┐   Protobuf   ┌──────────┐
│ Gemini Live  │ ─────────→  │ GeminiSession │ ──────────→ │  Client  │
│     API      │   PCM       │              │ AudioResponse│ (Browser)│
└──────────────┘             └──────────────┘              └──────────┘

1. Gemini sends audio in message.data (Base64)
2. GeminiMessageHandler converts to binary
3. Creates AudioResponse protobuf message
4. Sends to client for playback
```

### Transcript Flow

```
┌──────────────┐                ┌───────────────────┐
│ Gemini Live  │ ──────────→    │ GeminiMessageHandler │
│     API      │  Transcripts   │                   │
└──────────────┘                └─────────┬─────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
            TranscriptManager      TranscriptUpdate     Client WebSocket
            (aggregation)          (protobuf msg)       (real-time display)
                     │
                     ▼
            serializeTranscript()
                     │
                     ▼
            Submit to Backend (protobuf binary blob)
```

## WebSocket Close Codes

Custom codes (4000-4999 range) signal session end reason atomically:

| Code | Constant                  | Meaning                    |
| ---- | ------------------------- | -------------------------- |
| 1000 | `WS_CLOSE_NORMAL`         | Normal closure             |
| 4001 | `WS_CLOSE_USER_INITIATED` | User clicked "End"         |
| 4002 | `WS_CLOSE_TIMEOUT`        | Duration limit reached     |
| 4003 | `WS_CLOSE_GEMINI_ENDED`   | Gemini closed unexpectedly |
| 4004 | `WS_CLOSE_ERROR`          | Error occurred             |

## Key Types

```typescript
// Interview context from backend
interface InterviewContext {
  jobDescription: string;
  resume: string;
  persona: string;        // e.g., "professional interviewer"
  durationMs: number;     // Session duration limit
  systemPrompt?: string;  // Custom system instruction (for templates)
  language?: string;      // Language for speech recognition/synthesis
}

// Client → Worker messages
type ClientToServerMessage =
  | { payload: { case: "audioChunk"; value: { audioContent: Uint8Array } } }
  | { payload: { case: "endRequest"; value: {} } };

// Worker → Client messages
type ServerToClientMessage =
  | { payload: { case: "transcriptUpdate"; value: TranscriptUpdate } }
  | { payload: { case: "audioResponse"; value: { audioContent: Uint8Array } } }
  | { payload: { case: "error"; value: { code: number; message: string } } }
  | { payload: { case: "sessionEnded"; value: { reason: SessionEnded_Reason } } };

// Session end reasons
enum SessionEnded_Reason {
  USER_INITIATED = 1,
  TIMEOUT = 2,
  GEMINI_ENDED = 3,
}

// Transcript turn (stored in DB as protobuf)
interface Turn {
  speaker: Speaker;       // USER or AI
  content: string;
  timestampMs: bigint;
}
```

## File Details

### index.ts

Entry point that:
- Handles `/health` endpoint for monitoring
- Validates JWT tokens from query parameters
- Extracts `userId`, `interviewId`, `blockNumber` from token/URL
- Routes WebSocket connections to named Durable Objects
- Supports debug mode (`/debug/live-audio`) for development

### gemini-session.ts

Durable Object that:
- Manages WebSocket connection lifecycle
- Coordinates all services (lifecycle, streaming, message handling)
- Enforces duration timeout
- Handles all termination scenarios
- Cleans up resources on disconnect

### services/gemini-stream-handler.ts

Stream orchestrator that:
- Connects to Gemini Live API via `GeminiClient`
- Sends initial greeting to start interview
- Processes user audio (binary → base64 → Gemini)
- Delegates Gemini responses to `GeminiMessageHandler`
- Fires callbacks for audio, transcripts, errors, close

### services/interview-lifecycle-manager.ts

Backend coordinator that:
- Fetches interview context (job description, resume, persona)
- Updates interview status (IN_PROGRESS, COMPLETED, ERROR)
- Submits serialized transcript to backend
- Generates and submits AI feedback (for non-block interviews)
- Reports errors to backend

### handlers/gemini-message-handler.ts

Message processor that:
- Handles `inputTranscription` (user speech → text)
- Handles `outputTranscription` (AI speech → text)
- Handles audio data (base64 → binary)
- Updates `TranscriptManager` with turn data
- Creates protobuf messages for client

### handlers/websocket-message-handler.ts

Client message decoder that:
- Decodes binary protobuf from client
- Routes based on message type (`audioChunk`, `endRequest`)

### transcript-manager.ts

Turn-based aggregator that:
- Aggregates streaming deltas into complete turns
- Creates new turn on speaker change or `markTurnComplete()`
- Serializes to protobuf binary for DB storage
- Formats as text for feedback generation

### api-client.ts

Protobuf API client that:
- Communicates with Next.js backend via `/api/worker` endpoint
- Uses binary protobuf encoding for all requests/responses
- Authenticates via `WORKER_SHARED_SECRET`
- Handles: `getContext`, `updateStatus`, `submitTranscript`, `submitFeedback`

### gemini-client.ts

SDK wrapper that:
- Wraps `@google/genai` SDK for testability
- Manages connection state
- Provides `sendRealtimeInput()` for audio
- Provides `sendClientContent()` for text turns

### audio-converter.ts

Format converter that:
- Converts `Uint8Array` → Base64 (for sending to Gemini)
- Converts Base64 → `Uint8Array` (for sending to client)
- Required because Gemini API uses Base64, client uses binary

### messages.ts

Protobuf helpers that:
- Decodes `ClientToServerMessage` from binary
- Encodes `ServerToClientMessage` to binary
- Factory functions for creating response messages

### auth.ts

JWT validator that:
- Uses `jose` library (Cloudflare Workers compatible)
- Validates token signature with `JWT_SECRET`
- Extracts `userId`, `interviewId` from payload
- Throws on invalid/expired tokens

### utils/build-system-prompt.ts

Prompt builder that:
- Constructs system instruction for Gemini
- Includes persona, job description, resume
- Used when template doesn't provide custom `systemPrompt`

### utils/feedback.ts

Feedback generator that:
- Uses `gemini-2.0-flash` model for analysis
- Generates structured feedback (summary, strengths, areas for improvement)
- Validates output with Zod schema

## Block-Based Interview Support

For interviews with templates, the worker supports block-based sessions:

```typescript
// Block number passed via query param and header
const block = url.searchParams.get("block");
headers.set("X-Block-Number", block);

// Context fetched with block number
context = await this.apiClient.getContext(interviewId, blockNumber);

// Transcript submitted per block
await this.apiClient.submitTranscript(interviewId, transcript, endedAt, blockNumber);
```

Key differences for block-based:
- `systemPrompt` provided by template (not dynamically built)
- `language` may vary per block
- Transcript submitted per block (not full interview)
- Feedback generated at end of all blocks (not per block)

## Communication Protocol

All messages use protobuf defined in `proto/interview.proto`:

### Client → Worker

```protobuf
message ClientToServerMessage {
  oneof payload {
    AudioChunk audio_chunk = 1;
    EndRequest end_request = 2;
  }
}
```

### Worker → Client

```protobuf
message ServerToClientMessage {
  oneof payload {
    TranscriptUpdate transcript_update = 1;
    AudioResponse audio_response = 2;
    ErrorResponse error = 3;
    SessionEnded session_ended = 4;
  }
}
```

### Worker ↔ Backend

```protobuf
message WorkerApiRequest {
  oneof request {
    GetContextRequest get_context = 1;
    UpdateStatusRequest update_status = 2;
    SubmitTranscriptRequest submit_transcript = 3;
    SubmitFeedbackRequest submit_feedback = 4;
  }
}
```

## Environment Variables

| Variable               | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `GEMINI_API_KEY`       | API key for Gemini Live API                  |
| `JWT_SECRET`           | Secret for validating client JWT tokens      |
| `WORKER_SHARED_SECRET` | Secret for authenticating to Next.js backend |
| `NEXT_PUBLIC_API_URL`  | URL of the Next.js backend API               |
| `DEV_MODE`             | Set to `"true"` to enable debug routes       |

## Development

```bash
# Start local development server
pnpm dev:worker

# Run tests
pnpm test

# Generate protobuf types
pnpm proto:generate
```

## Testing

Services use interface-based dependency injection for testability:

```typescript
// Interfaces enable mocking
interface IApiClient { ... }
interface IGeminiClient { ... }
interface ITranscriptManager { ... }
interface IAudioConverter { ... }

// Test with mocks
const mockApiClient: IApiClient = {
  getContext: vi.fn().mockResolvedValue(mockContext),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  // ...
};
```

See `src/__tests__/` for test examples.

## Common Tasks

### Adding a new client message type

1. Add to `ClientToServerMessage` in `proto/interview.proto`
2. Run `pnpm proto:generate`
3. Add case to `WebSocketMessageHandler.getMessageType()`
4. Handle in `GeminiSession.handleWebSocketMessage()`

### Adding a new server message type

1. Add to `ServerToClientMessage` in `proto/interview.proto`
2. Run `pnpm proto:generate`
3. Add factory function in `messages.ts`
4. Send via `this.safeSend(ws, encodeServerMessage(msg))`

### Adding a new API endpoint

1. Add request/response to `proto/interview.proto`
2. Run `pnpm proto:generate`
3. Add method to `IApiClient` interface
4. Implement in `ApiClient` class
5. Handle in Next.js `/api/worker` route

### Modifying transcript format

1. Update `proto/transcript.proto` if changing schema
2. Run `pnpm proto:generate`
3. Update `TranscriptManager` serialization
4. Update backend deserialization in `src/lib/transcript.ts`

## Related Documentation

- [Interview Session Architecture](../src/app/[locale]/(interview)/interview/[interviewId]/session/README.md) - Client-side state management
- [Protocol Definitions](../proto/README.md) - Protobuf schema documentation
- [Backend API](../src/server/api/README.md) - tRPC router documentation
