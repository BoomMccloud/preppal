// ABOUTME: Durable Object managing individual Gemini Live API WebSocket sessions
// ABOUTME: Handles WebSocket connections, protobuf message processing, and user authentication

import type { Env } from "./index";
import {
  encodeServerMessage,
  createErrorResponse,
  createSessionEnded,
} from "./messages";
import { preppal } from "./lib/interview_pb.js";
import { AudioConverter } from "./audio-converter";
import { TranscriptManager } from "./transcript-manager";
import { Modality } from "@google/genai";
import { ApiClient } from "./api-client";
import { GeminiClient } from "./gemini-client";
import { generateFeedback } from "./utils/feedback";
import { WebSocketMessageHandler } from "./handlers/websocket-message-handler";
import { GeminiMessageHandler } from "./handlers/gemini-message-handler";

// Import interfaces
import type {
  ITranscriptManager,
  IAudioConverter,
  IApiClient,
  IGeminiClient,
  GeminiMessage,
  InterviewContext,
} from "./interfaces/index.js";

// Import error types
import {
  GeminiConnectionError,
  StatusUpdateError,
  AuthenticationError,
} from "./errors/index.js";

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
  private apiClient: IApiClient;
  private geminiClient: IGeminiClient;
  private wsMessageHandler: WebSocketMessageHandler;
  private geminiMessageHandler: GeminiMessageHandler;

  // NOTE: AudioConverter is NOT injected yet - Phase 6 will convert it to instance methods
  // For now, we use static methods via AudioConverter class directly

  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {
    // Initialize services
    this.transcriptManager = new TranscriptManager();
    this.apiClient = new ApiClient(
      env.NEXT_PUBLIC_API_URL,
      env.WORKER_SHARED_SECRET
    );
    this.geminiClient = new GeminiClient(env.GEMINI_API_KEY);

    // Initialize handlers
    // NOTE: GeminiMessageHandler uses AudioConverter static methods for now
    const audioConverter = {
      binaryToBase64: (binary: Uint8Array) =>
        AudioConverter.binaryToBase64(binary),
      base64ToBinary: (base64: string) => AudioConverter.base64ToBinary(base64),
    };
    this.wsMessageHandler = new WebSocketMessageHandler();
    this.geminiMessageHandler = new GeminiMessageHandler(
      this.transcriptManager,
      audioConverter
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
      const base64Audio = AudioConverter.binaryToBase64(
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
