# Cloudflare Worker Refactoring Plan (Practical)

## Overview
This document provides a practical, focused refactoring plan for the Cloudflare Worker's `GeminiSession` Durable Object. Unlike over-engineered approaches, this plan respects the existing architecture while improving testability, type safety, and maintainability.

## Current State Analysis

### What's Already Good ✅
- Services are already extracted: `TranscriptManager`, `AudioConverter`, `ApiClient`
- Clear separation between WebSocket and Gemini handling
- `GeminiSession` as Durable Object coordinator (correct architecture)
- Good error handling and logging

### What Needs Improvement 🔧
1. **No interfaces** - can't mock dependencies for testing
2. **Gemini connection code mixed into GeminiSession** - should be extracted like ApiClient
3. **Type safety** - using `any` for Gemini session and messages
4. **Message handling logic** - could be extracted for clarity
5. **Error types** - generic Error instead of domain-specific errors

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
 */
export interface ITranscriptManager {
  addUserTranscript(text: string): void;
  addAITranscript(text: string): void;
  getTranscript(): Array<{
    speaker: "USER" | "AI";
    content: string;
    timestamp: string;
  }>;
  clear(): void;
}

/**
 * Interface for audio format conversion
 */
export interface IAudioConverter {
  binaryToBase64(binary: Uint8Array): string;
  base64ToBinary(base64: string): Uint8Array;
}

/**
 * Interface for API communication with Next.js backend
 */
export interface IApiClient {
  updateStatus(interviewId: string, status: string): Promise<void>;
  submitTranscript(
    interviewId: string,
    transcript: Array<{
      speaker: "USER" | "AI";
      content: string;
      timestamp: string;
    }>,
    endedAt: string
  ): Promise<void>;
}

/**
 * Interface for Gemini Live API connection management
 */
export interface IGeminiClient {
  connect(config: GeminiConfig): Promise<void>;
  sendRealtimeInput(input: { audio: { data: string; mimeType: string } }): void;
  sendClientContent(content: { turns: Array<any> }): void;
  close(): void;
  isConnected(): boolean;
}

/**
 * Configuration for Gemini Live API connection
 */
export interface GeminiConfig {
  model: string;
  config: {
    responseModalities: string[];
    systemInstruction: string;
    outputAudioTranscription: Record<string, any>;
    inputAudioTranscription: Record<string, any>;
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
 */
export interface GeminiMessage {
  serverContent?: {
    inputTranscription?: { text: string };
    outputTranscription?: { text: string };
    modelTurn?: {
      parts?: Array<{ inlineData?: any }>;
    };
  };
  data?: string; // Base64 encoded audio
}
```

### 1.2 Update Existing Services to Implement Interfaces

```typescript
// File: worker/src/transcript-manager.ts
import type { ITranscriptManager } from "./interfaces";

export class TranscriptManager implements ITranscriptManager {
  // Existing implementation - no changes needed
}
```

```typescript
// File: worker/src/audio-converter.ts
import type { IAudioConverter } from "./interfaces";

export class AudioConverter implements IAudioConverter {
  // Existing implementation - no changes needed
  // Note: Make methods instance methods instead of static if they are currently static
}
```

```typescript
// File: worker/src/api-client.ts
import type { IApiClient } from "./interfaces";

export class ApiClient implements IApiClient {
  // Existing implementation - no changes needed
}
```

## Phase 2: Extract Gemini Client

### Goal
Extract Gemini connection logic into a separate client class, following the same pattern as `ApiClient`.

### 2.1 Create GeminiClient

```typescript
// File: worker/src/gemini-client.ts
import { GoogleGenAI, Modality } from "@google/genai";
import type { IGeminiClient, GeminiConfig, GeminiMessage } from "./interfaces";

/**
 * Client for managing Gemini Live API connections
 * Wraps the Google GenAI SDK with a cleaner interface
 */
export class GeminiClient implements IGeminiClient {
  private session: any = null;
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

  sendClientContent(content: { turns: Array<any> }): void {
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
import type { GeminiMessage } from "../interfaces";
import type { ITranscriptManager } from "../interfaces";
import type { IAudioConverter } from "../interfaces";
import {
  encodeServerMessage,
  createTranscriptUpdate,
  createAudioResponse,
} from "../messages";

/**
 * Result of processing a Gemini message
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
```

## Phase 5: Refactor GeminiSession

### Goal
Update `GeminiSession` to use the new interfaces, clients, and handlers while maintaining its role as the Durable Object coordinator.

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
} from "./interfaces";

// Import implementations
import { TranscriptManager } from "./transcript-manager";
import { AudioConverter } from "./audio-converter";
import { ApiClient } from "./api-client";
import { GeminiClient } from "./gemini-client";

// Import handlers
import { WebSocketMessageHandler } from "./handlers/websocket-message-handler";
import { GeminiMessageHandler } from "./handlers/gemini-message-handler";

// Import errors
import {
  GeminiConnectionError,
  StatusUpdateError,
  AuthenticationError,
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

      await this.geminiClient.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction:
            "You are a professional interviewer. Your goal is to conduct a behavioral interview. Start by introducing yourself and asking the candidate to introduce themselves.",
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

    // Submit transcript and update status (if not debug)
    if (!this.isDebug) {
      try {
        // Submit transcript
        const transcript = this.transcriptManager.getTranscript();
        const endedAt = new Date().toISOString();

        console.log(
          `[GeminiSession] Submitting transcript for interview ${this.interviewId} (${transcript.length} entries)`
        );
        await this.apiClient.submitTranscript(
          this.interviewId!,
          transcript,
          endedAt
        );
        console.log(
          `[GeminiSession] Transcript submitted for interview ${this.interviewId}`
        );

        // Update status
        console.log(
          `[GeminiSession] Updating status to COMPLETED for interview ${this.interviewId}`
        );
        await this.apiClient.updateStatus(this.interviewId!, "COMPLETED");
        console.log(
          `[GeminiSession] Interview ${this.interviewId} status updated to COMPLETED`
        );
      } catch (error) {
        console.error(
          `[GeminiSession] Failed to submit transcript or update status for interview ${this.interviewId}:`,
          error
        );
      }
    }

    // Send session ended message and close WebSocket
    const endedMsg = createSessionEnded(preppal.SessionEnded.Reason.USER_INITIATED);
    this.safeSend(ws, encodeServerMessage(endedMsg));
    ws.close(1000, "Interview ended by user");
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

## Phase 6: Update Existing Services

### Goal
Update existing services to match new interfaces (if needed).

### 6.1 AudioConverter - Make Methods Instance Methods

```typescript
// File: worker/src/audio-converter.ts
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

### 7.1 Unit Tests for Services

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

### 7.2 Unit Tests for Handlers

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

### 7.3 Integration Test Setup

```typescript
// File: worker/src/__tests__/gemini-session.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeminiSession } from "../gemini-session";
import type { DurableObjectState } from "@cloudflare/workers-types";

// Mock environment
const mockEnv = {
  GEMINI_API_KEY: "test-key",
  NEXT_PUBLIC_API_URL: "http://localhost:3000",
  WORKER_SHARED_SECRET: "test-secret",
  DEV_MODE: "false",
};

describe("GeminiSession", () => {
  let session: GeminiSession;
  let mockState: DurableObjectState;

  beforeEach(() => {
    // Create mock state
    mockState = {
      id: { toString: () => "test-id" },
    } as any;

    session = new GeminiSession(mockState, mockEnv as any);
  });

  it("should reject non-WebSocket requests", async () => {
    const request = new Request("http://localhost/", {
      headers: {},
    });

    const response = await session.fetch(request);

    expect(response.status).toBe(426);
    expect(await response.text()).toBe("Expected WebSocket");
  });

  it("should require authentication headers", async () => {
    const request = new Request("http://localhost/", {
      headers: {
        Upgrade: "websocket",
      },
    });

    const response = await session.fetch(request);

    expect(response.status).toBe(500);
  });

  // Additional integration tests would require mocking WebSocketPair,
  // which is environment-specific
});
```

## Migration Steps

### Step 1: Add Interfaces (Day 1)
1. Create `worker/src/interfaces/index.ts`
2. Run tests to ensure no breaking changes
3. Commit: "Add interfaces for services"

### Step 2: Extract GeminiClient (Day 1-2)
1. Create `worker/src/gemini-client.ts`
2. Write unit tests for GeminiClient
3. Commit: "Extract Gemini client"

### Step 3: Extract Handlers (Day 2)
1. Create `worker/src/handlers/websocket-message-handler.ts`
2. Create `worker/src/handlers/gemini-message-handler.ts`
3. Write unit tests for handlers
4. Commit: "Extract message handlers"

### Step 4: Add Error Types (Day 2)
1. Create `worker/src/errors/index.ts`
2. Commit: "Add custom error types"

### Step 5: Update AudioConverter (Day 3)
1. Modify `worker/src/audio-converter.ts` to use instance methods
2. Update any existing usages (should be minimal)
3. Run tests
4. Commit: "Update AudioConverter to use instance methods"

### Step 6: Refactor GeminiSession (Day 3-4)
1. Update `worker/src/gemini-session.ts` to use new structure
2. Run all tests
3. Test in development environment
4. Commit: "Refactor GeminiSession to use interfaces and handlers"

### Step 7: Add Tests (Day 4-5)
1. Write comprehensive unit tests
2. Write integration tests
3. Achieve >80% code coverage
4. Commit: "Add comprehensive test suite"

### Step 8: Deploy (Day 5)
1. Test in staging environment
2. Deploy to production
3. Monitor for errors
4. Rollback if issues occur

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
5. **Practical** - Can be implemented in 1 week by a junior developer

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

## For Junior Developers

### Getting Started
1. Read the existing code first: `worker/src/gemini-session.ts`
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
