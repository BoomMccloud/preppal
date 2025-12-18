// ABOUTME: Client for managing Gemini Live API connections
// ABOUTME: Wraps Google GenAI SDK with a cleaner, testable interface

import { GoogleGenAI } from "@google/genai";
import type {
  IGeminiClient,
  GeminiConfig,
  ClientTurn,
} from "./interfaces/index.js";

/**
 * Client for managing Gemini Live API connections
 * Wraps the Google GenAI SDK with a cleaner, testable interface
 *
 * Extracts Gemini connection logic from GeminiSession for better testability
 */
export class GeminiClient implements IGeminiClient {
  private session: any = null; // Type is internal to @google/genai SDK
  private connected = false;

  constructor(private apiKey: string) {}

  /**
   * Connect to Gemini Live API with configuration
   * @throws Error if already connected or connection fails
   */
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

  /**
   * Send realtime audio input to Gemini
   * @throws Error if not connected
   */
  sendRealtimeInput(input: {
    audio: { data: string; mimeType: string };
  }): void {
    if (!this.session) {
      throw new Error("GeminiClient is not connected");
    }
    this.session.sendRealtimeInput(input);
  }

  /**
   * Send client content (text turns) to Gemini
   * @throws Error if not connected
   */
  sendClientContent(content: { turns: Array<ClientTurn> }): void {
    if (!this.session) {
      throw new Error("GeminiClient is not connected");
    }
    this.session.sendClientContent(content);
  }

  /**
   * Close the Gemini connection
   */
  close(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
      this.connected = false;
    }
  }

  /**
   * Check if currently connected to Gemini
   */
  isConnected(): boolean {
    return this.connected;
  }
}
