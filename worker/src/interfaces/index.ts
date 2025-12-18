/**
 * Type definitions and interfaces for the Cloudflare Worker
 *
 * This file provides interfaces for dependency injection and testing,
 * allowing services to be mocked without changing implementations.
 */

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
 * Interview context containing job description, resume, and persona
 * Used for personalized interview questions and feedback generation
 */
export interface InterviewContext {
  jobDescription: string;
  resume: string;
  persona: string;
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
 * Interface for API communication with Next.js backend via tRPC
 * Implementation: worker/src/api-client.ts (already matches this interface)
 */
export interface IApiClient {
  updateStatus(interviewId: string, status: string): Promise<void>;
  submitTranscript(
    interviewId: string,
    transcript: TranscriptEntry[],
    endedAt: string,
  ): Promise<void>;
  submitFeedback(interviewId: string, feedback: FeedbackData): Promise<void>;
  getContext(interviewId: string): Promise<InterviewContext>;
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
    turnComplete?: boolean;
  };
  /** Base64 encoded audio data (alternative format) */
  data?: string;
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
