// ABOUTME: Orchestrates the real-time AI stream with Gemini Live API
// ABOUTME: Manages connection, audio streaming, and message handling delegation

import { Modality } from "@google/genai";
import { GeminiClient } from "../gemini-client";
import { TranscriptManager } from "../transcript-manager";
import { AudioConverter } from "../audio-converter";
import { GeminiMessageHandler } from "../handlers/gemini-message-handler";
import { GEMINI_MODEL } from "../constants";

import type {
  IGeminiClient,
  ITranscriptManager,
  IAudioConverter,
  GeminiMessage,
  InterviewContext,
} from "../interfaces";
import { buildSystemPrompt } from "../utils/build-system-prompt";

export interface StreamCallbacks {
  onAudio: (data: Uint8Array) => void;
  onUserTranscript: (data: Uint8Array) => void;
  onAITranscript: (data: Uint8Array) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export class GeminiStreamHandler {
  private geminiClient: IGeminiClient;
  private transcriptManager: ITranscriptManager;
  private audioConverter: IAudioConverter;
  private messageHandler: GeminiMessageHandler;

  private isConnected = false;
  private audioChunksReceivedCount = 0;
  private audioResponsesReceivedCount = 0;

  constructor(
    private apiKey: string,
    private callbacks: StreamCallbacks,
  ) {
    this.geminiClient = new GeminiClient(apiKey);
    this.transcriptManager = new TranscriptManager();
    this.audioConverter = new AudioConverter();
    this.messageHandler = new GeminiMessageHandler(
      this.transcriptManager,
      this.audioConverter,
    );
  }

  /**
   * Connects to the Gemini Live API with the provided context
   */
  async connect(context: InterviewContext): Promise<void> {
    const systemInstruction = buildSystemPrompt(context);

    await this.geminiClient.connect({
      model: GEMINI_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => this.handleOpen(),
        onmessage: (msg) => this.handleMessage(msg),
        onerror: (err) => this.callbacks.onError(err),
        onclose: () => this.callbacks.onClose(),
      },
    });

    this.isConnected = true;

    // Send initial greeting
    this.geminiClient.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: "Hello, let's start the interview." }],
          turnComplete: true,
        },
      ],
    });
  }

  /**
   * Processes an incoming user audio chunk.
   * Safe to call after disconnect - will silently return.
   */
  processUserAudio(chunk: Uint8Array): void {
    if (!this.isConnected) return;
    if (!chunk || chunk.length === 0) return;

    this.audioChunksReceivedCount++;

    // Log initial activity
    if (this.audioChunksReceivedCount === 1) {
      console.log(`[GeminiStreamHandler] Sending first audio chunk to Gemini`);
    }

    const base64Audio = this.audioConverter.binaryToBase64(chunk);
    this.geminiClient.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }

  /**
   * Closes the Gemini connection
   */
  disconnect(): void {
    this.isConnected = false;
    this.geminiClient.close();
  }

  /**
   * Returns the transcript manager for serialization/formatting
   */
  getTranscriptManager(): ITranscriptManager {
    return this.transcriptManager;
  }

  private handleOpen(): void {
    console.log(`[GeminiStreamHandler] Connected to Gemini Live API`);
  }

  private handleMessage(message: GeminiMessage): void {
    const result = this.messageHandler.handleMessage(message);

    if (result.userTranscript) {
      this.callbacks.onUserTranscript(result.userTranscript.message);
    }

    if (result.aiTranscript) {
      this.callbacks.onAITranscript(result.aiTranscript.message);
    }

    if (result.audio) {
      this.audioResponsesReceivedCount++;
      if (this.audioResponsesReceivedCount === 1) {
        console.log(`[GeminiStreamHandler] Received first audio response`);
      }
      this.callbacks.onAudio(result.audio.message);
    }
  }
}
