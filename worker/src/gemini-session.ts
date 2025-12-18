// ABOUTME: Durable Object managing individual Gemini Live API WebSocket sessions
// ABOUTME: Handles WebSocket connections, protobuf message processing, and user authentication

import type { Env } from "./index";
import {
  encodeServerMessage,
  createErrorResponse,
  createSessionEnded,
} from "./messages";
import { preppal } from "./lib/interview_pb.js";
import { ApiClient } from "./api-client";
import { InterviewLifecycleManager } from "./services/interview-lifecycle-manager";
import { GeminiStreamHandler } from "./services/gemini-stream-handler";
import { WebSocketMessageHandler } from "./handlers/websocket-message-handler";

import {
  WS_CLOSE_NORMAL,
  ERROR_CODE_INTERNAL,
  ERROR_CODE_AI_SERVICE,
} from "./constants";

// Import interfaces
import type { IApiClient, InterviewContext } from "./interfaces/index.js";

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
    persona: "professional interviewer",
  };

  // Dependencies (injected via constructor)
  private apiClient: IApiClient;
  private lifecycleManager: InterviewLifecycleManager;
  private streamHandler!: GeminiStreamHandler;
  private wsMessageHandler: WebSocketMessageHandler;

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {
    // Initialize services
    this.apiClient = new ApiClient(
      env.NEXT_PUBLIC_API_URL,
      env.WORKER_SHARED_SECRET,
    );

    this.lifecycleManager = new InterviewLifecycleManager(
      this.apiClient,
      env.GEMINI_API_KEY,
    );

    // Stream handler will be initialized with callbacks that need the WebSocket
    // Since we don't have the WS in constructor, we defer setup slightly or use a closure.
    // However, the cleanest way is to pass the WS to the methods that need it,
    // OR create the stream handler when we have the WS.
    // Given the architecture, we'll initialize a "dummy" handler or wait until fetch.
    // Better: Initialize it here but with callbacks that check for active WS.

    this.wsMessageHandler = new WebSocketMessageHandler();

    // NOTE: StreamHandler needs to be created per-request/connection if we want to bind specific WS
    // OR we bind it to 'this' and update the target WS.
    // For DOs, 'fetch' is called per request. We'll instantiate StreamHandler in initializeSession
    // to ensure it binds to the current WebSocket connection properly.
  }

  /**
   * Durable Object fetch handler - entry point for WebSocket connections
   */
  async fetch(request: Request): Promise<Response> {
    try {
      this.checkDebugMode(request);

      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      this.extractAuthentication(request);

      console.log(
        `[GeminiSession] WebSocket connection request - User: ${this.userId}, Interview: ${this.interviewId}`,
      );

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);
      server.accept();

      await this.initializeSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      console.error("[GeminiSession] Failed to establish session:", error);

      if (!this.isDebug && this.interviewId) {
        await this.lifecycleManager.handleError(
          this.interviewId,
          error as Error,
        );
      }

      return new Response(
        error instanceof Error ? error.message : "Failed to establish session",
        { status: 500 },
      );
    }
  }

  private checkDebugMode(request: Request): void {
    const url = new URL(request.url);
    if (this.env.DEV_MODE === "true" && url.pathname === "/debug/live-audio") {
      this.isDebug = true;
      console.log("[GeminiSession] Debug mode activated");
    }
  }

  private extractAuthentication(request: Request): void {
    this.userId = request.headers.get("X-User-Id") ?? undefined;
    this.interviewId = request.headers.get("X-Interview-Id") ?? undefined;

    if (!this.isDebug && (!this.userId || !this.interviewId)) {
      throw new Error("Missing authentication context");
    }

    if (this.isDebug) {
      this.userId = "debug-user";
      this.interviewId = `debug-interview-${Date.now()}`;

      // Read context from debug headers
      this.interviewContext = {
        jobDescription: request.headers.get("X-Debug-Job-Description") ?? "",
        resume: request.headers.get("X-Debug-Resume") ?? "",
        persona:
          request.headers.get("X-Debug-Persona") ?? "professional interviewer",
      };
      console.log(
        `[GeminiSession] Debug context loaded: persona="${this.interviewContext.persona}"`,
      );
    }
  }

  private async initializeSession(ws: WebSocket): Promise<void> {
    // 1. Initialize Lifecycle
    if (!this.isDebug) {
      this.interviewContext = await this.lifecycleManager.initializeSession(
        this.interviewId!,
      );
    }

    // 2. Initialize Stream Handler
    this.streamHandler = new GeminiStreamHandler(this.env.GEMINI_API_KEY, {
      onAudio: (data) => this.safeSend(ws, data),
      onUserTranscript: (data) => this.safeSend(ws, data),
      onAITranscript: (data) => this.safeSend(ws, data),
      onError: (err) => this.handleStreamError(ws, err),
      onClose: () => this.handleStreamClose(ws),
    });

    await this.streamHandler.connect(this.interviewContext);

    // 3. Setup Client Listeners
    this.setupWebSocketListeners(ws);
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
   * Handle WebSocket message from client
   */
  private async handleWebSocketMessage(
    ws: WebSocket,
    event: MessageEvent,
  ): Promise<void> {
    try {
      if (!(event.data instanceof ArrayBuffer)) {
        return;
      }

      const message = this.wsMessageHandler.decodeMessage(event.data);
      const messageType = this.wsMessageHandler.getMessageType(message);

      switch (messageType) {
        case "audio":
          if (message.audioChunk?.audioContent) {
            await this.streamHandler.processUserAudio(
              message.audioChunk.audioContent,
            );
          }
          break;
        case "end":
          await this.handleEndRequest(ws);
          break;
        default:
          console.warn(
            `[GeminiSession] Received unknown message type for interview ${this.interviewId}`,
          );
      }
    } catch (error) {
      console.error(
        `[GeminiSession] Error handling message for interview ${this.interviewId}:`,
        error,
      );
      const errorMsg = createErrorResponse(
        ERROR_CODE_INTERNAL,
        "Internal error processing message",
      );
      this.safeSend(ws, encodeServerMessage(errorMsg));
    }
  }

  /**
   * Handle end request from client
   */
  private async handleEndRequest(ws: WebSocket): Promise<void> {
    console.log(
      `[GeminiSession] Received end request for interview ${this.interviewId}`,
    );

    this.userInitiatedClose = true;
    this.sessionEnded = true;

    // Close Gemini connection via handler
    this.streamHandler.disconnect();

    // Send session ended message and close WebSocket
    const endedMsg = createSessionEnded(
      preppal.SessionEnded.Reason.USER_INITIATED,
    );
    this.safeSend(ws, encodeServerMessage(endedMsg));
    ws.close(WS_CLOSE_NORMAL, "Interview ended by user");

    // Offload finalize session to lifecycle manager
    if (!this.isDebug) {
      const transcript = this.streamHandler.getTranscript();
      await this.lifecycleManager.finalizeSession(
        this.interviewId!,
        transcript,
        this.interviewContext,
      );
    }
  }

  /**
   * Handle Stream Error
   */
  private async handleStreamError(ws: WebSocket, error: Error): Promise<void> {
    console.error(
      `[GeminiSession] Stream error for interview ${this.interviewId}:`,
      error,
    );

    if (!this.isDebug) {
      await this.lifecycleManager.handleError(this.interviewId!, error);
    }

    const errorMsg = createErrorResponse(
      ERROR_CODE_AI_SERVICE,
      "AI service error",
    );
    this.safeSend(ws, encodeServerMessage(errorMsg));
  }

  /**
   * Handle Stream Close
   */
  private async handleStreamClose(ws: WebSocket): Promise<void> {
    console.log(
      `[GeminiSession] Stream closed for interview ${this.interviewId}`,
    );

    this.sessionEnded = true;

    if (!this.userInitiatedClose && !this.isDebug) {
      await this.lifecycleManager.handleError(
        this.interviewId!,
        new Error("Gemini connection closed unexpectedly"),
      );
    }

    if (!this.userInitiatedClose) {
      const endMsg = createSessionEnded(
        preppal.SessionEnded.Reason.GEMINI_ENDED,
      );
      this.safeSend(ws, encodeServerMessage(endMsg));
      ws.close(WS_CLOSE_NORMAL, "AI ended session");
    }
  }

  /**
   * Handle WebSocket closed
   */
  private handleWebSocketClose(): void {
    console.log(
      `[GeminiSession] WebSocket closed for interview ${this.interviewId}`,
    );
    this.cleanup();
  }

  /**
   * Handle WebSocket error
   */
  private handleWebSocketError(event: ErrorEvent): void {
    console.error(
      `[GeminiSession] WebSocket error for interview ${this.interviewId}:`,
      event,
    );
  }

  /**
   * Cleanup session resources
   */
  private cleanup(): void {
    console.log(
      `[GeminiSession] Cleaning up session for interview ${this.interviewId}`,
    );
    this.sessionEnded = true;
    if (this.streamHandler) {
      this.streamHandler.disconnect();
    }
  }

  /**
   * Safely send data to WebSocket
   * NOTE: Cloudflare Workers use WebSocket.READY_STATE_OPEN (not WebSocket.OPEN)
   */
  private safeSend(
    ws: WebSocket,
    data: ArrayBuffer | string | Uint8Array,
  ): void {
    try {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(data);
      }
    } catch (error) {
      console.error(
        `[GeminiSession] Failed to send message to WebSocket for interview ${this.interviewId}:`,
        error,
      );
    }
  }
}
