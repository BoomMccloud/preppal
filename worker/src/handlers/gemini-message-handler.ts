// ABOUTME: Handles messages received from Gemini Live API
// ABOUTME: Processes transcripts and audio, prepares messages for client

import type { GeminiMessage, TranscriptEntry } from "../interfaces/index.js";
import type { ITranscriptManager } from "../interfaces/index.js";
import type { IAudioConverter } from "../interfaces/index.js";
import {
  encodeServerMessage,
  createTranscriptUpdate,
  createAudioResponse,
} from "../messages.js";

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
 * Extracts logic from GeminiSession.handleGeminiMessage
 */
export class GeminiMessageHandler {
  constructor(
    private transcriptManager: ITranscriptManager,
    private audioConverter: IAudioConverter,
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
