# Cloudflare Worker Refactoring Plan (Practical) - UPDATED

## Document Updates
This document has been updated based on analysis of the actual codebase at [worker/src](worker/src). All ambiguities have been resolved and the plan now accurately reflects the current implementation.

## Overview
This document provides a practical, focused refactoring plan for the Cloudflare Worker's `GeminiSession` Durable Object. Unlike over-engineered approaches, this plan respects the existing architecture while improving testability, type safety, and maintainability.

## Current State Analysis

### What's Already Good ✅
- Services are already extracted: `TranscriptManager`, `AudioConverter`, `ApiClient`
- Clear separation between WebSocket and Gemini handling
- `GeminiSession` as Durable Object coordinator (correct architecture)
- Good error handling and logging
- JWT authentication system in place ([worker/src/auth.ts](worker/src/auth.ts))
- Feedback generation system ([worker/src/utils/feedback.ts](worker/src/utils/feedback.ts))
- Message encoding/decoding utilities ([worker/src/messages.ts](worker/src/messages.ts))
- Interview context support (job description + resume)

### What Needs Improvement 🔧
1. **No interfaces** - can't mock dependencies for testing
2. **Gemini connection code mixed into GeminiSession** - should be extracted like ApiClient
3. **Type safety** - using `any` for Gemini session and messages (line 24, 407 in [worker/src/gemini-session.ts](worker/src/gemini-session.ts))
4. **AudioConverter uses static methods** - should be instance methods for consistency and testing (line 257, 553 in [worker/src/gemini-session.ts](worker/src/gemini-session.ts))
5. **Message handling logic** - could be extracted for clarity
6. **Error types** - generic Error instead of domain-specific errors

### Current File Structure
```
worker/src/
├── index.ts                    # Entry point, routes WebSocket connections
├── gemini-session.ts           # Durable Object (needs refactoring)
├── transcript-manager.ts       # ✅ Already well-structured
├── audio-converter.ts          # ⚠️ Uses static methods (need to convert to instance)
├── api-client.ts              # ✅ Already well-structured (has 4 methods)
├── messages.ts                 # ✅ Protobuf encoding/decoding utilities
├── auth.ts                     # ✅ JWT validation
├── utils/
│   └── feedback.ts            # ✅ Gemini feedback generation
├── lib/
│   ├── interview_pb.js        # Generated protobuf code
│   └── interview_pb.d.ts      # TypeScript definitions
└── __tests__/                  # Existing tests
    ├── api-client.test.ts
    ├── auth.test.ts
    ├── feedback.test.ts
    ├── gemini-integration.test.ts
    ├── gemini-session-feedback.test.ts
    └── messages.test.ts
```

## Key Architectural Principles

### ✅ DO
- Keep `GeminiSession` as the Durable Object coordinator
- Use constructor injection for dependencies
- Extract logic into handler classes
- Add interfaces for all services
- Use specific error types

### ❌ DON'T
- Create an "orchestrator" that replaces GeminiSession
- Break the Durable Object pattern
- Create new service instances inside methods
- Over-engineer with complex dependency injection frameworks

## Phase 1: Add Interfaces (No Breaking Changes)

### Goal
Add interfaces to existing services for testability WITHOUT changing any implementation.

### 1.1 Create Interfaces Directory
```typescript
// File: worker/src/interfaces/index.ts

/**
 * Interface for transcript management operations
 * Implementation: worker/src/transcript-manager.ts (already matches this interface)
 */
export interface ITranscriptManager {
  addUserTranscript(text: string): void;
  addAITranscript(text: string): void;
  getTranscript(): TranscriptEntry[];
  clear(): void;
}

/**
 * Interface for audio format conversion
 * Implementation: worker/src/audio-converter.ts
 * NOTE: Current implementation uses STATIC methods - will convert to instance methods in Phase 6
 */
export interface IAudioConverter {
  binaryToBase64(binary: Uint8Array): string;
  base64ToBinary(base64: string): Uint8Array;
}

/**
 * Transcript entry structure used across the system
 * Matches the structure in TranscriptManager and ApiClient
 */
export interface TranscriptEntry {
  speaker: "USER" | "AI";
  content: string;
  timestamp: string; // ISO 8601 format
}

/**
 * Interview context containing job description and resume
 * Used for personalized interview questions and feedback generation
 */
export interface InterviewContext {
  jobDescription: string;
  resume: string;
}

/**
 * Interface for API communication with Next.js backend via tRPC
 * Implementation: worker/src/api-client.ts (already matches this interface)
 */
export interface IApiClient {
  updateStatus(interviewId: string, status: string): Promise<void>;
  submitTranscript(
    interviewId: string,
    transcript: TranscriptEntry[],
    endedAt: string
  ): Promise<void>;
  submitFeedback(interviewId: string, feedback: FeedbackData): Promise<void>;
  getContext(interviewId: string): Promise<InterviewContext>;
}

/**
 * Feedback data structure for interview evaluation
 * Matches the structure from worker/src/utils/feedback.ts
 */
export interface FeedbackData {
  summary: string;
  strengths: string;
  contentAndStructure: string;
  communicationAndDelivery: string;
  presentation: string;
}

/**
 * Interface for Gemini Live API connection management
 * Will be implemented in Phase 2
 */
export interface IGeminiClient {
  connect(config: GeminiConfig): Promise<void>;
  sendRealtimeInput(input: { audio: { data: string; mimeType: string } }): void;
  sendClientContent(content: { turns: Array<ClientTurn> }): void;
  close(): void;
  isConnected(): boolean;
}

/**
 * Client turn structure for Gemini sendClientContent
 */
export interface ClientTurn {
  role: "user" | "model";
  parts: Array<{ text: string }>;
  turnComplete?: boolean;
}

/**
 * Configuration for Gemini Live API connection
 */
export interface GeminiConfig {
  model: string;
  config: {
    responseModalities: string[]; // e.g. ["AUDIO"]
    systemInstruction: string;
    outputAudioTranscription: Record<string, never>; // Empty object {}
    inputAudioTranscription: Record<string, never>; // Empty object {}
  };
  callbacks: {
    onopen: () => void;
    onmessage: (message: GeminiMessage) => void;
    onerror: (error: Error) => void;
    onclose: () => void;
  };
}

/**
 * Message received from Gemini Live API
 * Based on actual message structure from @google/genai SDK v0.21.0
 * See: gemini-session.ts lines 407-420, 503-557
 */
export interface GeminiMessage {
  serverContent?: {
    /** User's speech transcription */
    inputTranscription?: { text: string };
    /** AI's speech transcription */
    outputTranscription?: { text: string };
    /** Model turn with potential inline data (audio) */
    modelTurn?: {
      parts?: Array<{
        inlineData?: {
          data: string; // Base64 audio
          mimeType: string; // e.g. "audio/pcm"
        };
      }>;
    };
  };
  /** Base64 encoded audio data (alternative format) */
  data?: string;
}
```

### 1.2 Update Existing Services to Implement Interfaces

```typescript
// File: worker/src/transcript-manager.ts
import type { ITranscriptManager, TranscriptEntry } from "./interfaces";

export class TranscriptManager implements ITranscriptManager {
  // No changes needed - implementation already matches interface
}
```

```typescript
// File: worker/src/api-client.ts
import type { IApiClient, TranscriptEntry, InterviewContext, FeedbackData } from "./interfaces";

// Add import for FeedbackData type
import type { FeedbackData as FeedbackDataImport } from "./utils/feedback";

export class ApiClient implements IApiClient {
  // No changes needed - implementation already matches interface
  // NOTE: Current implementation has all 4 methods already
}
```

## Phase 2: Extract Gemini Client

### Goal
Extract Gemini connection logic into a separate client class, following the same pattern as `ApiClient`.

### 2.1 Create GeminiClient

```typescript
// File: worker/src/gemini-client.ts
import { GoogleGenAI } from "@google/genai";
import type { IGeminiClient, GeminiConfig, ClientTurn } from "./interfaces";

/**
 * Client for managing Gemini Live API connections
 * Wraps the Google GenAI SDK with a cleaner, testable interface
 *
 * Extracts Gemini connection logic from GeminiSession (lines 370-491)
 */
export class GeminiClient implements IGeminiClient {
  private session: any = null; // Type is internal to @google/genai SDK
  private connected = false;

  constructor(private apiKey: string) {}

  async connect(config: GeminiConfig): Promise<void> {
    if (this.connected) {
      throw new Error("GeminiClient is already connected");
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    this.session = await ai.live.connect({
      model: config.model,
      config: config.config,
      callbacks: config.callbacks,
    });

    this.connected = true;
  }

  sendRealtimeInput(input: { audio: { data: string; mimeType: string } }): void {
    if (!this.session) {
      throw new Error("GeminiClient is not connected");
    }
    this.session.sendRealtimeInput(input);
  }

  sendClientContent(content: { turns: Array<ClientTurn> }): void {
    if (!this.session) {
      throw new Error("GeminiClient is not connected");
    }
    this.session.sendClientContent(content);
  }

  close(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
```

## Phase 3: Extract Message Handlers

### Goal
Extract message handling logic into separate, testable handler classes.

### 3.1 WebSocket Message Handler

```typescript
// File: worker/src/handlers/websocket-message-handler.ts
import { preppal } from "../lib/interview_pb.js";
import { decodeClientMessage } from "../messages";

/**
 * Handles incoming WebSocket messages from the client
 * Decodes protobuf and routes to appropriate handlers
 *
 * Extracts logic from GeminiSession.handleBinaryMessage (lines 201-221)
 */
export class WebSocketMessageHandler {
  /**
   * Decode and parse a binary WebSocket message
   */
  decodeMessage(buffer: ArrayBuffer): preppal.ClientToServerMessage {
    return decodeClientMessage(buffer);
  }

  /**
   * Determine message type for routing
   */
  getMessageType(
    message: preppal.ClientToServerMessage
  ): "audio" | "end" | "unknown" {
    if (message.audioChunk) {
      return "audio";
    } else if (message.endRequest) {
      return "end";
    }
    return "unknown";
  }
}
```

### 3.2 Gemini Message Handler

```typescript
// File: worker/src/handlers/gemini-message-handler.ts
import type { GeminiMessage, TranscriptEntry } from "../interfaces";
import type { ITranscriptManager } from "../interfaces";
import type { IAudioConverter } from "../interfaces";
import {
  encodeServerMessage,
  createTranscriptUpdate,
  createAudioResponse,
} from "../messages";

/**
 * Result of processing a Gemini message
 * Contains both raw data and encoded protobuf messages ready to send
 */
export interface GeminiMessageResult {
  userTranscript?: {
    text: string;
    message: Uint8Array; // Encoded protobuf to send to client
  };
  aiTranscript?: {
    text: string;
    message: Uint8Array; // Encoded protobuf to send to client
  };
  audio?: {
    data: Uint8Array;
    message: Uint8Array; // Encoded protobuf to send to client
  };
}

/**
 * Handles messages received from Gemini Live API
 * Processes transcripts and audio, prepares messages for client
 *
 * Extracts logic from GeminiSession.handleGeminiMessage (lines 493-558)
 */
export class GeminiMessageHandler {
  constructor(
    private transcriptManager: ITranscriptManager,
    private audioConverter: IAudioConverter
  ) {}

  /**
   * Process a message from Gemini and prepare response for client
   * Returns structured results with both raw data and encoded messages
   */
  handleMessage(message: GeminiMessage): GeminiMessageResult {
    const result: GeminiMessageResult = {};

    // Handle user speech transcription
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      this.transcriptManager.addUserTranscript(text);

      const transcriptMsg = createTranscriptUpdate("USER", text, true);
      result.userTranscript = {
        text,
        message: encodeServerMessage(transcriptMsg),
      };
    }

    // Handle AI speech transcription
    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      this.transcriptManager.addAITranscript(text);

      const transcriptMsg = createTranscriptUpdate("AI", text, true);
      result.aiTranscript = {
        text,
        message: encodeServerMessage(transcriptMsg),
      };
    }

    // Handle AI audio response
    if (message.data) {
      const audioData = this.audioConverter.base64ToBinary(message.data);
      const audioMsg = createAudioResponse(audioData);

      result.audio = {
        data: audioData,
        message: encodeServerMessage(audioMsg),
      };
    }

    return result;
  }
}
```

## Phase 4: Custom Error Types

### Goal
Add domain-specific error types for better error handling.

```typescript
// File: worker/src/errors/index.ts

/**
 * Base error for all worker errors
 * Provides consistent error handling across the worker
 */
export class WorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error when Gemini connection fails
 */
export class GeminiConnectionError extends WorkerError {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

/**
 * Error when submitting transcript to backend
 */
export class TranscriptSubmissionError extends WorkerError {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

/**
 * Error when updating interview status
 */
export class StatusUpdateError extends WorkerError {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

/**
 * Error when authentication fails
 */
export class AuthenticationError extends WorkerError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error when WebSocket connection fails
 */
export class WebSocketError extends WorkerError {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

/**
 * Error when feedback generation fails
 */
export class FeedbackGenerationError extends WorkerError {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}
```

## Phase 5: Refactor GeminiSession

### Goal
Update `GeminiSession` to use the new interfaces, clients, and handlers while maintaining its role as the Durable Object coordinator.

### Key Changes from Current Implementation
1. Replace `this.geminiSession: any` with `this.geminiClient: IGeminiClient`
2. Replace static `AudioConverter` calls with instance methods
3. Use new handlers for message processing
4. Use custom error types
5. Maintain all existing functionality (context fetching, feedback generation)

```typescript
// File: worker/src/gemini-session.ts
import type { Env } from "./index";
import {
  encodeServerMessage,
  createErrorResponse,
  createSessionEnded,
} from "./messages";
import { preppal } from "./lib/interview_pb.js";
import { Modality } from "@google/genai";

// Import interfaces
import type {
  ITranscriptManager,
  IAudioConverter,
  IApiClient,
  IGeminiClient,
  GeminiMessage,
  InterviewContext,
} from "./interfaces";

// Import implementations
import { TranscriptManager } from "./transcript-manager";
import { AudioConverter } from "./audio-converter";
import { ApiClient } from "./api-client";
import { GeminiClient } from "./gemini-client";

// Import handlers
import { WebSocketMessageHandler } from "./handlers/websocket-message-handler";
import { GeminiMessageHandler } from "./handlers/gemini-message-handler";

// Import utilities
import { generateFeedback } from "./utils/feedback";

// Import errors
import {
  GeminiConnectionError,
  StatusUpdateError,
  AuthenticationError,
  FeedbackGenerationError,
} from "./errors";

/**
 * Durable Object managing individual Gemini Live API WebSocket sessions
 * Coordinates WebSocket connections, Gemini API interactions, and transcript management
 */
export class GeminiSession implements DurableObject {
  // Session state
  private userId?: string;
  private interviewId?: string;
  private isDebug = false;
  private userInitiatedClose = false;
  private sessionEnded = false;
  private interviewContext: InterviewContext = {
    jobDescription: "",
    resume: "",
  };

  // Metrics
  private audioChunksReceivedCount = 0;
  private audioResponsesReceivedCount = 0;

  // Dependencies (injected via constructor)
  private transcriptManager: ITranscriptManager;
  private audioConverter: IAudioConverter;
  private apiClient: IApiClient;
  private geminiClient: IGeminiClient;
  private wsMessageHandler: WebSocketMessageHandler;
  private geminiMessageHandler: GeminiMessageHandler;

  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {
    // Initialize services
    this.transcriptManager = new TranscriptManager();
    this.audioConverter = new AudioConverter();
    this.apiClient = new ApiClient(
      env.NEXT_PUBLIC_API_URL,
      env.WORKER_SHARED_SECRET
    );
    this.geminiClient = new GeminiClient(env.GEMINI_API_KEY);

    // Initialize handlers
    this.wsMessageHandler = new WebSocketMessageHandler();
    this.geminiMessageHandler = new GeminiMessageHandler(
      this.transcriptManager,
      this.audioConverter
    );
  }

  /**
   * Durable Object fetch handler - entry point for WebSocket connections
   */
  async fetch(request: Request): Promise<Response> {
    try {
      // Check for debug mode
      const url = new URL(request.url);
      if (this.env.DEV_MODE === "true" && url.pathname === "/debug/live-audio") {
        this.isDebug = true;
        console.log("[GeminiSession] Debug mode activated");
      }

      // Validate WebSocket upgrade
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      // Extract authentication context
      this.userId = request.headers.get("X-User-Id") ?? undefined;
      this.interviewId = request.headers.get("X-Interview-Id") ?? undefined;

      // Validate authentication (except in debug mode)
      if (!this.isDebug && (!this.userId || !this.interviewId)) {
        throw new AuthenticationError("Missing authentication context");
      }

      // Set debug credentials if needed
      if (this.isDebug) {
        this.userId = "debug-user";
        this.interviewId = `debug-interview-${Date.now()}`;
      }

      console.log(
        `[GeminiSession] WebSocket connection request - User: ${this.userId}, Interview: ${this.interviewId}`
      );

      // Create WebSocket pair
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);
      server.accept();

      // Fetch interview context (if not debug)
      if (!this.isDebug) {
        try {
          console.log(`[GeminiSession] Fetching context for interview ${this.interviewId}`);
          this.interviewContext = await this.apiClient.getContext(this.interviewId!);
          console.log(`[GeminiSession] Context fetched successfully`);
        } catch (error) {
          console.error(`[GeminiSession] Failed to fetch interview context:`, error);
          // Continue with empty context
        }
      }

      // Initialize Gemini connection
      await this.initializeGemini(server);

      // Update interview status
      if (!this.isDebug) {
        try {
          await this.apiClient.updateStatus(this.interviewId!, "IN_PROGRESS");
          console.log(`[GeminiSession] Status updated to IN_PROGRESS`);
        } catch (error) {
          throw new StatusUpdateError(
            "Failed to update status to IN_PROGRESS",
            error as Error
          );
        }
      }

      // Setup WebSocket event listeners
      this.setupWebSocketListeners(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      console.error("[GeminiSession] Failed to establish session:", error);

      // Update status to ERROR if we have interview ID
      if (!this.isDebug && this.interviewId) {
        try {
          await this.apiClient.updateStatus(this.interviewId, "ERROR");
        } catch (apiError) {
          console.error("[GeminiSession] Failed to update status to ERROR:", apiError);
        }
      }

      return new Response(
        error instanceof Error ? error.message : "Failed to establish session",
        { status: 500 }
      );
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupWebSocketListeners(ws: WebSocket): void {
    ws.addEventListener("message", async (event: MessageEvent) => {
      await this.handleWebSocketMessage(ws, event);
    });

    ws.addEventListener("close", () => {
      this.handleWebSocketClose();
    });

    ws.addEventListener("error", (event: ErrorEvent) => {
      this.handleWebSocketError(event);
    });
  }

  /**
   * Initialize Gemini Live API connection
   */
  private async initializeGemini(ws: WebSocket): Promise<void> {
    try {
      console.log(`[GeminiSession] Connecting to Gemini Live API`);

      const systemInstruction = `You are a professional interviewer. Your goal is to conduct a behavioral interview.
Context:
Job Description: ${this.interviewContext.jobDescription || "Not provided"}
Candidate Resume: ${this.interviewContext.resume || "Not provided"}

Start by introducing yourself and asking the candidate to introduce themselves.`;

      await this.geminiClient.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => this.handleGeminiOpen(),
          onmessage: (message: GeminiMessage) => this.handleGeminiMessage(ws, message),
          onerror: (error: Error) => this.handleGeminiError(ws, error),
          onclose: () => this.handleGeminiClose(ws),
        },
      });

      console.log(`[GeminiSession] Gemini connection established`);

      // Send initial greeting to start the interview
      this.geminiClient.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: "Hello, let's start the interview." }],
            turnComplete: true,
          },
        ],
      });

      console.log("[GeminiSession] Sent initial greeting to Gemini");
    } catch (error) {
      throw new GeminiConnectionError(
        "Failed to initialize Gemini connection",
        error as Error
      );
    }
  }

  /**
   * Handle WebSocket message from client
   */
  private async handleWebSocketMessage(
    ws: WebSocket,
    event: MessageEvent
  ): Promise<void> {
    try {
      if (!(event.data instanceof ArrayBuffer)) {
        console.warn(
          `[GeminiSession] Received non-binary message, ignoring for interview ${this.interviewId}`
        );
        return;
      }

      // Decode message
      const message = this.wsMessageHandler.decodeMessage(event.data);
      const messageType = this.wsMessageHandler.getMessageType(message);

      // Route message
      switch (messageType) {
        case "audio":
          this.audioChunksReceivedCount++;
          await this.handleAudioChunk(ws, message.audioChunk!);
          break;
        case "end":
          console.log(
            `[GeminiSession] Handling end request for interview ${this.interviewId}`
          );
          await this.handleEndRequest(ws);
          break;
        default:
          console.warn(
            `[GeminiSession] Received unknown message type for interview ${this.interviewId}`
          );
      }
    } catch (error) {
      console.error(
        `[GeminiSession] Error handling message for interview ${this.interviewId}:`,
        error
      );
      const errorMsg = createErrorResponse(5000, "Internal error processing message");
      this.safeSend(ws, encodeServerMessage(errorMsg));
    }
  }

  /**
   * Handle audio chunk from client
   */
  private async handleAudioChunk(
    ws: WebSocket,
    audioChunk: preppal.IAudioChunk
  ): Promise<void> {
    // Don't process if session ended
    if (this.sessionEnded) {
      return;
    }

    const audioContent = audioChunk.audioContent;
    if (!audioContent || audioContent.length === 0) {
      if (this.audioChunksReceivedCount === 1) {
        console.warn(
          `[GeminiSession] Received empty audio chunk for interview ${this.interviewId}`
        );
      }
      return;
    }

    // Log meaningful chunks
    if (
      (this.audioChunksReceivedCount === 1 && audioContent.length > 1000) ||
      (this.audioChunksReceivedCount % 100 === 0 && audioContent.length > 1000)
    ) {
      console.log(
        `[GeminiSession] Sending audio chunk #${this.audioChunksReceivedCount} to Gemini (size: ${audioContent.length} bytes)`
      );
    }

    // Convert and send to Gemini
    try {
      const base64Audio = this.audioConverter.binaryToBase64(
        new Uint8Array(audioContent)
      );

      if (this.audioChunksReceivedCount === 1) {
        console.log(
          `[GeminiSession] Sending first audio chunk to Gemini for interview ${this.interviewId}`
        );
      }

      this.geminiClient.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (error) {
      console.error(
        `[GeminiSession] Failed to send audio chunk to Gemini for interview ${this.interviewId}:`,
        error
      );
    }
  }

  /**
   * Handle end request from client
   */
  private async handleEndRequest(ws: WebSocket): Promise<void> {
    console.log(
      `[GeminiSession] Received end request for interview ${this.interviewId}`
    );

    this.userInitiatedClose = true;
    this.sessionEnded = true;

    // Close Gemini connection
    this.geminiClient.close();
    console.log(
      `[GeminiSession] Closed Gemini connection for interview ${this.interviewId}`
    );

    // Send session ended message and close WebSocket
    const endedMsg = createSessionEnded(preppal.SessionEnded.Reason.USER_INITIATED);
    this.safeSend(ws, encodeServerMessage(endedMsg));
    ws.close(1000, "Interview ended by user");

    // Skip background processing in debug mode
    if (this.isDebug) return;

    // Background processing (Transcript + Feedback)
    try {
      const transcript = this.transcriptManager.getTranscript();
      const endedAt = new Date().toISOString();

      // Step 1: Save transcript - CRITICAL
      console.log(
        `[GeminiSession] Submitting transcript for interview ${this.interviewId} (${transcript.length} entries)`
      );
      await this.apiClient.submitTranscript(
        this.interviewId!,
        transcript,
        endedAt
      );
      console.log(`[GeminiSession] Transcript submitted for interview ${this.interviewId}`);

      // Step 2: Generate and submit feedback - BEST EFFORT
      try {
        console.log(`[GeminiSession] Generating feedback...`);
        const feedback = await generateFeedback(
          transcript,
          this.interviewContext,
          this.env.GEMINI_API_KEY
        );
        console.log(`[GeminiSession] Feedback generated, submitting...`);
        await this.apiClient.submitFeedback(this.interviewId!, feedback);
        console.log(`[GeminiSession] Feedback submitted successfully`);
      } catch (feedbackError) {
        console.error(
          `[GeminiSession] Failed to generate/submit feedback:`,
          feedbackError
        );
        // Continue - interview is still COMPLETED even if feedback fails
      }

      // Step 3: Update status to COMPLETED
      await this.apiClient.updateStatus(this.interviewId!, "COMPLETED");
      console.log(
        `[GeminiSession] Interview ${this.interviewId} status updated to COMPLETED`
      );
    } catch (error) {
      console.error(
        `[GeminiSession] Failed to submit transcript or update status for interview ${this.interviewId}:`,
        error
      );
      // If transcript submission failed, mark as ERROR
      try {
        await this.apiClient.updateStatus(this.interviewId!, "ERROR");
      } catch (statusError) {
        console.error(
          `[GeminiSession] Failed to set ERROR status:`,
          statusError
        );
      }
    }
  }

  /**
   * Handle Gemini connection opened
   */
  private handleGeminiOpen(): void {
    console.log(
      `[GeminiSession] Gemini Live connected for interview ${this.interviewId}`
    );
  }

  /**
   * Handle message from Gemini
   */
  private handleGeminiMessage(ws: WebSocket, message: GeminiMessage): void {
    // Don't process if session ended
    if (this.sessionEnded) {
      return;
    }

    // Process message through handler
    const result = this.geminiMessageHandler.handleMessage(message);

    // Send user transcript to client
    if (result.userTranscript) {
      console.log(
        `[GeminiSession] Received input transcription for interview ${this.interviewId}: ${result.userTranscript.text}`
      );
      this.safeSend(ws, result.userTranscript.message);
    }

    // Send AI transcript to client
    if (result.aiTranscript) {
      console.log(
        `[GeminiSession] Received output transcription for interview ${this.interviewId}: ${result.aiTranscript.text}`
      );
      this.safeSend(ws, result.aiTranscript.message);
    }

    // Send audio to client
    if (result.audio) {
      this.audioResponsesReceivedCount++;
      if (this.audioResponsesReceivedCount === 1) {
        console.log(
          `[GeminiSession] Received first audio response for interview ${this.interviewId}. Subsequent logs suppressed.`
        );
      }
      this.safeSend(ws, result.audio.message);
    }
  }

  /**
   * Handle Gemini error
   */
  private async handleGeminiError(ws: WebSocket, error: Error): Promise<void> {
    console.error(
      `[GeminiSession] Gemini Live API error for interview ${this.interviewId}:`,
      error
    );

    // Update status to ERROR
    if (!this.isDebug) {
      try {
        await this.apiClient.updateStatus(this.interviewId!, "ERROR");
      } catch (apiError) {
        console.error(
          `[GeminiSession] Failed to update status to ERROR for interview ${this.interviewId}:`,
          apiError
        );
      }
    }

    // Send error to client
    const errorMsg = createErrorResponse(4002, "AI service error");
    this.safeSend(ws, encodeServerMessage(errorMsg));
  }

  /**
   * Handle Gemini connection closed
   */
  private async handleGeminiClose(ws: WebSocket): Promise<void> {
    console.log(
      `[GeminiSession] Gemini connection closed for interview ${this.interviewId}`
    );

    this.sessionEnded = true;

    // Only update status if unexpected close
    if (!this.userInitiatedClose && !this.isDebug) {
      try {
        await this.apiClient.updateStatus(this.interviewId!, "ERROR");
        console.log(
          `[GeminiSession] Interview ${this.interviewId} status updated to ERROR (unexpected close)`
        );
      } catch (apiError) {
        console.error(
          `[GeminiSession] Failed to update status to ERROR for interview ${this.interviewId}:`,
          apiError
        );
      }
    }

    // Send session ended message if not user-initiated
    if (!this.userInitiatedClose) {
      const endMsg = createSessionEnded(preppal.SessionEnded.Reason.GEMINI_ENDED);
      this.safeSend(ws, encodeServerMessage(endMsg));
      ws.close(1000, "AI ended session");
    }
  }

  /**
   * Handle WebSocket closed
   */
  private handleWebSocketClose(): void {
    console.log(
      `[GeminiSession] WebSocket closed for interview ${this.interviewId}`
    );
    this.cleanup();
  }

  /**
   * Handle WebSocket error
   */
  private handleWebSocketError(event: ErrorEvent): void {
    console.error(
      `[GeminiSession] WebSocket error for interview ${this.interviewId}:`,
      event
    );
  }

  /**
   * Cleanup session resources
   */
  private cleanup(): void {
    console.log(
      `[GeminiSession] Cleaning up session for interview ${this.interviewId}`
    );
    this.sessionEnded = true;
    this.geminiClient.close();
  }

  /**
   * Safely send data to WebSocket
   * NOTE: Cloudflare Workers use WebSocket.READY_STATE_OPEN (not WebSocket.OPEN)
   */
  private safeSend(ws: WebSocket, data: ArrayBuffer | string | Uint8Array): void {
    try {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(data);
      }
    } catch (error) {
      console.error(
        `[GeminiSession] Failed to send message to WebSocket for interview ${this.interviewId}:`,
        error
      );
    }
  }
}
```

## Phase 6: Update AudioConverter to Use Instance Methods

### Goal
Convert AudioConverter from static methods to instance methods for consistency with other services.

### Current Implementation (BEFORE)
```typescript
// File: worker/src/audio-converter.ts (CURRENT)
export class AudioConverter {
  static binaryToBase64(audioData: Uint8Array): string {
    // ... implementation
  }

  static base64ToBinary(base64Audio: string): Uint8Array {
    // ... implementation
  }
}
```

### Updated Implementation (AFTER)
```typescript
// File: worker/src/audio-converter.ts (UPDATED)
import type { IAudioConverter } from "./interfaces";

/**
 * Service for converting audio between binary and base64 formats
 */
export class AudioConverter implements IAudioConverter {
  /**
   * Convert binary audio (Uint8Array) to base64 string for Gemini
   */
  binaryToBase64(binary: Uint8Array): string {
    if (binary.length === 0) {
      return "";
    }

    let binaryString = "";
    for (let i = 0; i < binary.length; i++) {
      binaryString += String.fromCharCode(binary[i]);
    }

    return btoa(binaryString);
  }

  /**
   * Convert base64 audio string from Gemini to binary (Uint8Array)
   */
  base64ToBinary(base64: string): Uint8Array {
    if (base64.length === 0) {
      return new Uint8Array([]);
    }

    const binaryString = atob(base64);
    const audioData = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      audioData[i] = binaryString.charCodeAt(i);
    }

    return audioData;
  }
}
```

## Phase 7: Testing Strategy

### Goal
Enable comprehensive testing of all components.

### 7.1 Test Infrastructure Setup

The project already has tests in [worker/src/__tests__](worker/src/__tests__). We'll follow the existing patterns:

```json
// File: worker/package.json (partial)
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^latest",
    "@vitest/coverage-v8": "^latest"
  }
}
```

### 7.2 Unit Tests for Services

```typescript
// File: worker/src/__tests__/transcript-manager.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { TranscriptManager } from "../transcript-manager";

describe("TranscriptManager", () => {
  let manager: TranscriptManager;

  beforeEach(() => {
    manager = new TranscriptManager();
  });

  it("should add user transcript", () => {
    manager.addUserTranscript("Hello");
    const transcript = manager.getTranscript();

    expect(transcript).toHaveLength(1);
    expect(transcript[0].speaker).toBe("USER");
    expect(transcript[0].content).toBe("Hello");
  });

  it("should add AI transcript", () => {
    manager.addAITranscript("Hi there");
    const transcript = manager.getTranscript();

    expect(transcript).toHaveLength(1);
    expect(transcript[0].speaker).toBe("AI");
    expect(transcript[0].content).toBe("Hi there");
  });

  it("should maintain transcript order", () => {
    manager.addUserTranscript("Question");
    manager.addAITranscript("Answer");
    const transcript = manager.getTranscript();

    expect(transcript).toHaveLength(2);
    expect(transcript[0].content).toBe("Question");
    expect(transcript[1].content).toBe("Answer");
  });

  it("should clear transcript", () => {
    manager.addUserTranscript("Test");
    manager.clear();

    expect(manager.getTranscript()).toHaveLength(0);
  });
});
```

```typescript
// File: worker/src/__tests__/audio-converter.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { AudioConverter } from "../audio-converter";

describe("AudioConverter", () => {
  let converter: AudioConverter;

  beforeEach(() => {
    converter = new AudioConverter();
  });

  it("should convert binary to base64", () => {
    const binary = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const base64 = converter.binaryToBase64(binary);

    expect(base64).toBe("SGVsbG8=");
  });

  it("should convert base64 to binary", () => {
    const base64 = "SGVsbG8="; // "Hello"
    const binary = converter.base64ToBinary(base64);

    expect(binary).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("should handle empty binary", () => {
    const binary = new Uint8Array([]);
    const base64 = converter.binaryToBase64(binary);

    expect(base64).toBe("");
  });

  it("should handle empty base64", () => {
    const base64 = "";
    const binary = converter.base64ToBinary(base64);

    expect(binary).toEqual(new Uint8Array([]));
  });

  it("should round-trip correctly", () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const base64 = converter.binaryToBase64(original);
    const result = converter.base64ToBinary(base64);

    expect(result).toEqual(original);
  });
});
```

### 7.3 Unit Tests for Handlers

```typescript
// File: worker/src/__tests__/handlers/gemini-message-handler.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeminiMessageHandler } from "../../handlers/gemini-message-handler";
import type { ITranscriptManager, IAudioConverter } from "../../interfaces";

describe("GeminiMessageHandler", () => {
  let handler: GeminiMessageHandler;
  let mockTranscriptManager: ITranscriptManager;
  let mockAudioConverter: IAudioConverter;

  beforeEach(() => {
    // Create mocks
    mockTranscriptManager = {
      addUserTranscript: vi.fn(),
      addAITranscript: vi.fn(),
      getTranscript: vi.fn(),
      clear: vi.fn(),
    };

    mockAudioConverter = {
      binaryToBase64: vi.fn(),
      base64ToBinary: vi.fn((base64) => new Uint8Array([1, 2, 3])),
    };

    handler = new GeminiMessageHandler(
      mockTranscriptManager,
      mockAudioConverter
    );
  });

  it("should handle user transcript", () => {
    const message = {
      serverContent: {
        inputTranscription: { text: "Hello" },
      },
    };

    const result = handler.handleMessage(message);

    expect(mockTranscriptManager.addUserTranscript).toHaveBeenCalledWith("Hello");
    expect(result.userTranscript).toBeDefined();
    expect(result.userTranscript?.text).toBe("Hello");
  });

  it("should handle AI transcript", () => {
    const message = {
      serverContent: {
        outputTranscription: { text: "Hi there" },
      },
    };

    const result = handler.handleMessage(message);

    expect(mockTranscriptManager.addAITranscript).toHaveBeenCalledWith("Hi there");
    expect(result.aiTranscript).toBeDefined();
    expect(result.aiTranscript?.text).toBe("Hi there");
  });

  it("should handle audio data", () => {
    const message = {
      data: "base64audiodata",
    };

    const result = handler.handleMessage(message);

    expect(mockAudioConverter.base64ToBinary).toHaveBeenCalledWith("base64audiodata");
    expect(result.audio).toBeDefined();
    expect(result.audio?.data).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("should handle combined message", () => {
    const message = {
      serverContent: {
        outputTranscription: { text: "Speaking" },
      },
      data: "audiodata",
    };

    const result = handler.handleMessage(message);

    expect(result.aiTranscript).toBeDefined();
    expect(result.audio).toBeDefined();
  });

  it("should handle empty message", () => {
    const message = {};
    const result = handler.handleMessage(message);

    expect(result).toEqual({});
  });
});
```

### 7.4 Unit Tests for GeminiClient

```typescript
// File: worker/src/__tests__/gemini-client.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeminiClient } from "../gemini-client";

// Mock the @google/genai module
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    live: {
      connect: vi.fn().mockResolvedValue({
        sendRealtimeInput: vi.fn(),
        sendClientContent: vi.fn(),
        close: vi.fn(),
      }),
    },
  })),
  Modality: {
    AUDIO: "AUDIO",
    TEXT: "TEXT",
  },
}));

describe("GeminiClient", () => {
  let client: GeminiClient;

  beforeEach(() => {
    client = new GeminiClient("test-api-key");
  });

  it("should not be connected initially", () => {
    expect(client.isConnected()).toBe(false);
  });

  it("should connect to Gemini", async () => {
    await client.connect({
      model: "test-model",
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: "Test",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });

    expect(client.isConnected()).toBe(true);
  });

  it("should throw if connecting when already connected", async () => {
    await client.connect({
      model: "test-model",
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: "Test",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });

    await expect(
      client.connect({
        model: "test-model",
        config: {
          responseModalities: ["AUDIO"],
          systemInstruction: "Test",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {},
          onmessage: () => {},
          onerror: () => {},
          onclose: () => {},
        },
      })
    ).rejects.toThrow("already connected");
  });

  it("should close connection", async () => {
    await client.connect({
      model: "test-model",
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: "Test",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });

    client.close();

    expect(client.isConnected()).toBe(false);
  });
});
```

## Migration Steps

### Step 1: Add Interfaces
1. Create `worker/src/interfaces/index.ts` with all interfaces
2. Update existing services to implement interfaces (no code changes, just add `implements`)
3. Run existing tests to ensure no breaking changes
4. Commit: "Add interfaces for services"

### Step 2: Extract GeminiClient
1. Create `worker/src/gemini-client.ts`
2. Write unit tests for GeminiClient
3. Run tests to verify
4. Commit: "Extract Gemini client"

### Step 3: Extract Handlers
1. Create `worker/src/handlers/websocket-message-handler.ts`
2. Create `worker/src/handlers/gemini-message-handler.ts`
3. Write unit tests for handlers
4. Run tests to verify
5. Commit: "Extract message handlers"

### Step 4: Add Error Types
1. Create `worker/src/errors/index.ts`
2. Commit: "Add custom error types"

### Step 5: Update AudioConverter
1. Modify `worker/src/audio-converter.ts` to use instance methods
2. Update tests if needed
3. Run tests to verify
4. Commit: "Update AudioConverter to use instance methods"

### Step 6: Refactor GeminiSession
1. Update `worker/src/gemini-session.ts` to use new structure
2. Run all tests
3. Test in development environment (use /debug/live-audio endpoint)
4. Commit: "Refactor GeminiSession to use interfaces and handlers"

### Step 7: Add Tests
1. Write comprehensive unit tests for all new code
2. Update integration tests if needed
3. Achieve >80% code coverage
4. Commit: "Add comprehensive test suite"

### Step 8: Deploy
1. Test in local development
2. Test with debug endpoint
3. Deploy to production
4. Monitor for errors
5. Rollback if issues occur (redeploy previous version)

## Expected Benefits

1. **Testability** ✅
   - All services have interfaces for mocking
   - Handlers are isolated and testable
   - GeminiSession can be tested with mock dependencies

2. **Type Safety** ✅
   - No more `any` types for Gemini messages
   - Clear interfaces for all contracts
   - TypeScript catches errors at compile time

3. **Maintainability** ✅
   - Clear separation of concerns
   - Each class has a single responsibility
   - Easy to understand and modify

4. **Clarity** ✅
   - Obvious ownership (GeminiSession coordinates everything)
   - Clear data flow through handlers
   - Well-documented with comments

5. **No Over-Engineering** ✅
   - Respects Durable Object architecture
   - Simple dependency injection
   - No unnecessary abstraction layers

## Key Differences from Original Plan

1. **No Orchestrator** - GeminiSession remains the coordinator (it's the Durable Object!)
2. **No ServiceContainer** - Simple constructor injection is sufficient
3. **Reuses Existing Services** - Doesn't recreate TranscriptManager, AudioConverter, ApiClient
4. **Simpler Architecture** - Fewer layers, clearer ownership
5. **Practical** - Can be implemented incrementally
6. **Complete Context** - Maintains interview context fetching and feedback generation

## Questions & Answers

**Q: Why not use an orchestrator pattern?**
A: GeminiSession IS the orchestrator - it's a Durable Object and must coordinate everything.

**Q: Why not use a DI container?**
A: Constructor injection is simpler and sufficient for this use case.

**Q: Should AudioConverter be static or instance methods?**
A: Instance methods for consistency with other services and easier testing.

**Q: How do I test WebSocket code?**
A: Mock the WebSocket in tests - the handlers are isolated and easy to test independently.

**Q: What if I need to add a new feature?**
A: Add a new service/handler, inject it into GeminiSession, use it in the appropriate method.

**Q: What about the feedback generation and context fetching?**
A: These are maintained in the refactored version. GeminiSession still handles all existing functionality.

**Q: Is `WebSocket.READY_STATE_OPEN` correct?**
A: Yes! Cloudflare Workers use this constant. The original spec was incorrect.

## For Junior Developers

### Getting Started
1. Read the existing code first: [worker/src/gemini-session.ts](worker/src/gemini-session.ts)
2. Understand what services already exist
3. Follow the migration steps in order
4. Write tests before changing implementation
5. Ask questions if anything is unclear

### Key Concepts
- **Durable Object**: Cloudflare's stateful worker - GeminiSession is one
- **Interface**: TypeScript contract for a class
- **Dependency Injection**: Passing dependencies to constructor
- **Handler**: Class that processes a specific type of message
- **Mock**: Fake implementation of an interface for testing

### Common Pitfalls to Avoid
- ❌ Don't create service instances inside methods
- ❌ Don't create an orchestrator that replaces GeminiSession
- ❌ Don't over-engineer with complex DI frameworks
- ❌ Don't break the Durable Object pattern
- ✅ Do inject dependencies via constructor
- ✅ Do keep GeminiSession as the coordinator
- ✅ Do write tests for each change
- ✅ Do follow the existing patterns

## Changes from Original Spec

### Resolved Ambiguities
1. ✅ **AudioConverter** - Confirmed uses static methods, needs conversion to instance methods
2. ✅ **ApiClient methods** - Added `submitFeedback` and `getContext` methods
3. ✅ **Message helper functions** - Documented all functions from messages.ts
4. ✅ **Protobuf types** - All types are correct and well-defined
5. ✅ **Gemini message types** - Properly typed based on actual SDK
6. ✅ **WebSocket constant** - `WebSocket.READY_STATE_OPEN` is correct for Cloudflare Workers
7. ✅ **Interview context** - Added support for job description and resume
8. ✅ **Feedback generation** - Included in the refactored implementation
9. ✅ **Testing infrastructure** - Documented existing test setup with vitest

### Additional Files Documented
1. [worker/src/auth.ts](worker/src/auth.ts) - JWT authentication
2. [worker/src/utils/feedback.ts](worker/src/utils/feedback.ts) - Feedback generation
3. [worker/src/index.ts](worker/src/index.ts) - Entry point and routing
4. Existing test files in `worker/src/__tests__/`
