// ABOUTME: Durable Object managing individual Gemini Live API WebSocket sessions
// ABOUTME: Handles WebSocket connections, protobuf message processing, and user authentication

import type { Env } from "./index";
import {
  decodeClientMessage,
  encodeServerMessage,
  createErrorResponse,
  createSessionEnded,
  createTranscriptUpdate,
  createAudioResponse,
} from "./messages";
import { preppal } from "./lib/interview_pb.js";
import { AudioConverter } from "./audio-converter";
import { TranscriptManager } from "./transcript-manager";
import { GoogleGenAI, Modality } from "@google/genai";
import { ApiClient } from "./api-client";

export class GeminiSession implements DurableObject {
  private userId?: string;
  private interviewId?: string;
  private transcriptManager: TranscriptManager;
  private geminiSession: any;
  private apiClient: ApiClient;
  private userInitiatedClose = false;
  private audioChunksReceivedCount = 0;
  private audioResponsesReceivedCount = 0;
  private sessionEnded = false;
  private isDebug = false;

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {
    this.transcriptManager = new TranscriptManager();
    this.apiClient = new ApiClient(
      env.NEXT_PUBLIC_API_URL,
      env.WORKER_SHARED_SECRET,
    );
  }

  private safeSend(ws: WebSocket, data: ArrayBuffer | string) {
    try {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(data);
      } else {
        // console.warn(
        //   `[GeminiSession] Attempted to send message to closed WebSocket for interview ${this.interviewId}`,
        // );
      }
    } catch (error) {
      console.error(
        `[GeminiSession] Failed to send message to WebSocket for interview ${this.interviewId}:`,
        error,
      );
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (this.env.DEV_MODE === "true" && url.pathname === "/debug/live-audio") {
      this.isDebug = true;
      console.log("[GeminiSession] Debug mode activated.");
    }
    // Handle WebSocket upgrade
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    // Extract user context from headers (set by the main worker after JWT validation)
    this.userId = request.headers.get("X-User-Id") ?? undefined;
    this.interviewId = request.headers.get("X-Interview-Id") ?? undefined;

    if (!this.isDebug && (!this.userId || !this.interviewId)) {
      return new Response("Missing authentication context", { status: 401 });
    }

    if (this.isDebug) {
      this.userId = "debug-user";
      this.interviewId = `debug-interview-${new Date().getTime()}`;
    }

    console.log(
      `[GeminiSession] Step 1: WebSocket connection request received. User: ${this.userId}, Interview: ${this.interviewId}`,
    );

    // Create WebSocket pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();
    console.log(`[GeminiSession] Step 2: WebSocket connection accepted.`);

    // Initialize Gemini connection
    try {
      console.log(
        `[GeminiSession] Step 3: Attempting to initialize Gemini connection for interview ${this.interviewId}`,
      );
      await this.initializeGemini(client, server);
      console.log(
        `[GeminiSession] Step 4: Gemini connection initialized successfully for interview ${this.interviewId}`,
      );

      // Update interview status to IN_PROGRESS
      if (!this.isDebug) {
        console.log(`[GeminiSession] Step 5: Updating status to IN_PROGRESS`);
        await this.apiClient.updateStatus(this.interviewId!, "IN_PROGRESS");
        console.log(`[GeminiSession] Step 6: Status updated to IN_PROGRESS`);
      }
    } catch (error) {
      console.error("[GeminiSession] Failed to initialize Gemini:", error);

      // Update status to ERROR
      if (!this.isDebug) {
        try {
          await this.apiClient.updateStatus(this.interviewId!, "ERROR");
        } catch (apiError) {
          console.error(
            "[GeminiSession] Failed to update status to ERROR:",
            apiError,
          );
        }
      }

      // In case of initialization error, we still need to handle messages
      // but we'll send an error message and close the connection
    }

    // Handle messages
    server.addEventListener("message", async (event: MessageEvent) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          // Log only non-audio binary messages or periodic audio logs if needed?
          // For now, let handleBinaryMessage manage the noise.
          await this.handleBinaryMessage(server, event.data);
        } else {
          console.warn(
            `[GeminiSession] Received non-binary message, ignoring for interview ${this.interviewId}`,
          );
        }
      } catch (error) {
        console.error(
          `[GeminiSession] Error handling message for interview ${this.interviewId}:`,
          error,
        );
        const errorMsg = createErrorResponse(
          5000,
          "Internal error processing message",
        );
        this.safeSend(server, encodeServerMessage(errorMsg));
      }
    });

    server.addEventListener("close", () => {
      console.log(
        `[GeminiSession] WebSocket closed for interview ${this.interviewId}`,
      );
      this.cleanup();
    });

    server.addEventListener("error", (event: ErrorEvent) => {
      console.error(
        `[GeminiSession] WebSocket error for interview ${this.interviewId}:`,
        event,
      );
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleBinaryMessage(
    ws: WebSocket,
    buffer: ArrayBuffer,
  ): Promise<void> {
    const message = decodeClientMessage(buffer);

    if (message.audioChunk) {
      // Increment counter before handling the chunk
      this.audioChunksReceivedCount++;
      // Log every 1000th audio chunk to track progress without spam (about once per second at 1000+ chunks/second)
      if (this.audioChunksReceivedCount === 1 || this.audioChunksReceivedCount % 1000 === 0) {
        console.log(
          `[GeminiSession] Audio chunk #${this.audioChunksReceivedCount} received from client for interview ${this.interviewId}`,
        );
      }
      await this.handleAudioChunk(ws, message.audioChunk);
    } else if (message.endRequest) {
      console.log(
        `[GeminiSession] Handling end request for interview ${this.interviewId}`,
      );
      await this.handleEndRequest(ws);
    } else {
      console.warn(
        `[GeminiSession] Received unknown message type for interview ${this.interviewId}`,
      );
    }
  }

  private async handleAudioChunk(
    ws: WebSocket,
    audioChunk: preppal.IAudioChunk,
  ): Promise<void> {
    // Don't process audio chunks if the session has ended
    if (this.sessionEnded) {
      // console.warn(
      //   `[GeminiSession] Received audio chunk after session ended for interview ${this.interviewId}`,
      // );
      return;
    }

    const audioContent = audioChunk.audioContent;
    if (!audioContent || audioContent.length === 0) {
      // Only log empty audio chunk warning once
      if (this.audioChunksReceivedCount === 1) {
        console.warn(
          `[GeminiSession] Received empty audio chunk for interview ${this.interviewId}`,
        );
      }
      return;
    }

    // Log first non-empty chunk and every 100th non-empty chunk
    if (this.audioChunksReceivedCount === 1 || this.audioChunksReceivedCount % 100 === 0) {
      console.log(
        `[GeminiSession] Sending audio chunk #${this.audioChunksReceivedCount} to Gemini for interview ${this.interviewId} (size: ${audioContent.length} bytes)`,
      );
    }

    // Convert binary audio to base64 for Gemini
    const base64Audio = AudioConverter.binaryToBase64(
      new Uint8Array(audioContent),
    );

    // Send to Gemini (will be implemented when we add Gemini connection)
    if (this.geminiSession) {
      if (this.audioChunksReceivedCount === 1) {
        console.log(
          `[GeminiSession] Sending first audio chunk to Gemini for interview ${this.interviewId}`,
        );
      }
      try {
        this.geminiSession.sendRealtimeInput({
          audio: {
            data: base64Audio,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } catch (error) {
        console.error(
          `[GeminiSession] Failed to send audio chunk to Gemini for interview ${this.interviewId}:`,
          error,
        );
      }
    } else {
      console.warn(
        `[GeminiSession] Gemini session not initialized, audio chunk dropped for interview ${this.interviewId}`,
      );
    }
  }

  private async handleEndRequest(ws: WebSocket): Promise<void> {
    console.log(
      `[GeminiSession] Received end request for interview ${this.interviewId}`,
    );

    // Mark as user-initiated close
    this.userInitiatedClose = true;
    this.sessionEnded = true;

    // Close Gemini connection if exists
    if (this.geminiSession) {
      console.log(
        `[GeminiSession] Closing Gemini connection for interview ${this.interviewId}`,
      );
      this.geminiSession.close();
    }
    if (!this.isDebug) {
      // Submit transcript to Next.js API
      try {
        const transcript = this.transcriptManager.getTranscript();
        const endedAt = new Date().toISOString();

        console.log(
          `[GeminiSession] Submitting transcript for interview ${this.interviewId} (${transcript.length} entries)`,
        );
        await this.apiClient.submitTranscript(
          this.interviewId!,
          transcript,
          endedAt,
        );
        console.log(
          `[GeminiSession] Transcript submitted for interview ${this.interviewId} (${transcript.length} entries)`,
        );
      } catch (error) {
        console.error(
          `[GeminiSession] Failed to submit transcript for interview ${this.interviewId}:`,
          error,
        );
      }

      // Update status to COMPLETED
      try {
        console.log(
          `[GeminiSession] Updating status to COMPLETED for interview ${this.interviewId}`,
        );
        await this.apiClient.updateStatus(this.interviewId!, "COMPLETED");
        console.log(
          `[GeminiSession] Interview ${this.interviewId} status updated to COMPLETED`,
        );
      } catch (error) {
        console.error(
          `[GeminiSession] Failed to update status to COMPLETED for interview ${this.interviewId}:`,
          error,
        );
      }
    }

    // Send session ended message
    const endedMsg = createSessionEnded(
      preppal.SessionEnded.Reason.USER_INITIATED,
    );

    this.safeSend(ws, encodeServerMessage(endedMsg));

    // Close the WebSocket
    ws.close(1000, "Interview ended by user");
  }

  private async initializeGemini(
    clientSideWs: WebSocket,
    serverSideWs: WebSocket,
  ): Promise<void> {
    console.log(
      `[GeminiSession] Initializing Gemini with API key: ${this.env.GEMINI_API_KEY ? "PRESENT" : "MISSING"}`,
    );

    const ai = new GoogleGenAI({ apiKey: this.env.GEMINI_API_KEY });
    const model = "gemini-2.5-flash-native-audio-preview-09-2025";

    const config = {
      // IMPORTANT: Use Modality.AUDIO OR Modality.TEXT, never both
      responseModalities: [Modality.AUDIO],
      systemInstruction:
        "You are a professional interviewer. Your goal is to conduct a behavioral interview. Start by introducing yourself and asking the candidate to introduce themselves.",
      outputAudioTranscription: {},
    };

    console.log(
      `[GeminiSession] Connecting to Gemini Live API for interview ${this.interviewId}`,
    );

    this.geminiSession = await ai.live.connect({
      model,
      config,
      callbacks: {
        onopen: () => {
          console.log(
            `[GeminiSession] Gemini Live connected for interview ${this.interviewId}`,
          );
        },
        onmessage: (message: any) => {
          // Log simplified message type to reduce noise, unless it's a specific event
          if (
            message.serverContent?.modelTurn?.parts?.some(
              (p: any) => p.inlineData,
            )
          ) {
            // It's audio, suppressed in handleGeminiMessage usually, but good to know we got message
          } else {
            console.log(
              `[GeminiSession] Received message from Gemini (type: ${Object.keys(message).join(",")})`,
            );
          }
          this.handleGeminiMessage(serverSideWs, message);
        },
        onerror: async (error: any) => {
          console.error(
            `[GeminiSession] Gemini Live API error for interview ${this.interviewId}:`,
            error,
          );
          if (!this.isDebug) {
            // Update status to ERROR
            try {
              await this.apiClient.updateStatus(this.interviewId!, "ERROR");
            } catch (apiError) {
              console.error(
                `[GeminiSession] Failed to update status to ERROR for interview ${this.interviewId}:`,
                apiError,
              );
            }
          }

          const errorMsg = createErrorResponse(4002, "AI service error");
          this.safeSend(serverSideWs, encodeServerMessage(errorMsg));
        },
        onclose: async () => {
          console.log(
            `[GeminiSession] Gemini connection closed for interview ${this.interviewId}`,
          );

          // Mark session as ended
          this.sessionEnded = true;

          // Only update status to ERROR if this was an unexpected close
          if (!this.userInitiatedClose && !this.isDebug) {
            try {
              await this.apiClient.updateStatus(this.interviewId!, "ERROR");
              console.log(
                `[GeminiSession] Interview ${this.interviewId} status updated to ERROR (unexpected close)`,
              );
            } catch (apiError) {
              console.error(
                `[GeminiSession] Failed to update status to ERROR for interview ${this.interviewId}:`,
                apiError,
              );
            }
          }

          if (!this.userInitiatedClose) {
            const endMsg = createSessionEnded(
              preppal.SessionEnded.Reason.GEMINI_ENDED,
            );
            this.safeSend(serverSideWs, encodeServerMessage(endMsg));
            serverSideWs.close(1000, "AI ended session"); // Close serverSideWs
          }
        },
      },
    });

    console.log(
      `[GeminiSession] Gemini connection established for interview ${this.interviewId}`,
    );

    // Send initial greeting to trigger the AI to speak first
    this.geminiSession.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: "Hello, let's start the interview." }],
          turnComplete: true,
        },
      ],
    });
    console.log("[GeminiSession] Sent initial greeting to Gemini");
  }

  private handleGeminiMessage(serverSideWs: WebSocket, message: any): void {
    // Don't process messages if the session has ended
    if (this.sessionEnded) {
      // console.warn(
      //   `[GeminiSession] Received Gemini message after session ended for interview ${this.interviewId}`,
      // );
      return;
    }

    // Handle input transcription (user speech)
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      console.log(
        `[GeminiSession] Received input transcription for interview ${this.interviewId}: ${text}`,
      );

      // Save to transcript
      this.transcriptManager.addUserTranscript(text);

      // Send to client
      const transcriptMsg = createTranscriptUpdate("USER", text, true);
      this.safeSend(serverSideWs, encodeServerMessage(transcriptMsg));
    }

    // Handle output transcription (AI speech)
    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      console.log(
        `[GeminiSession] Received output transcription for interview ${this.interviewId}: ${text}`,
      );

      // Save to transcript
      this.transcriptManager.addAITranscript(text);

      // Send to client
      const transcriptMsg = createTranscriptUpdate("AI", text, true);
      this.safeSend(serverSideWs, encodeServerMessage(transcriptMsg));
    }

    // Handle AI text response
    // NOTE: Commented out to avoid SDK warning about non-text parts (inlineData)
    // We're using AUDIO modality, so text transcription is handled via outputTranscription
    // if (message.text) {
    //   console.log(
    //     `[GeminiSession] Received text response for interview ${this.interviewId}: ${message.text}`,
    //   );
    //   const transcriptMsg = createTranscriptUpdate("AI", message.text, true);
    //   this.safeSend(serverSideWs, encodeServerMessage(transcriptMsg));
    // }

    // Handle AI audio response
    if (message.data) {
      this.audioResponsesReceivedCount++;
      if (this.audioResponsesReceivedCount === 1) {
        console.log(
          `[GeminiSession] Received first audio response for interview ${this.interviewId} (length: ${message.data.length}). Subsequent logs suppressed.`,
        );
      }
      // message.data is base64 encoded audio from Gemini
      // Convert base64 to Uint8Array for protobuf
      const audioData = AudioConverter.base64ToBinary(message.data);

      const audioMsg = createAudioResponse(audioData);
      this.safeSend(serverSideWs, encodeServerMessage(audioMsg));
    }
  }

  private cleanup(): void {
    console.log(
      `[GeminiSession] Cleaning up session for interview ${this.interviewId}`,
    );
    // Mark session as ended
    this.sessionEnded = true;

    if (this.geminiSession) {
      this.geminiSession.close();
    }
  }
}
