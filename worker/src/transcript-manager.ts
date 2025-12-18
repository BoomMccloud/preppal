// ABOUTME: Transcript tracking for interview conversations
// ABOUTME: Maintains chronological history of user and AI speech with timestamps

import type {
  ITranscriptManager,
  TranscriptEntry,
} from "./interfaces/index.js";

/**
 * Manages conversation transcript tracking during an interview session
 */
export class TranscriptManager implements ITranscriptManager {
  private transcript: TranscriptEntry[] = [];

  /**
   * Add a user transcript entry
   */
  addUserTranscript(text: string): void {
    this.transcript.push({
      speaker: "USER",
      content: text,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add an AI transcript entry
   */
  addAITranscript(text: string): void {
    this.transcript.push({
      speaker: "AI",
      content: text,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get all transcript entries
   */
  getTranscript(): TranscriptEntry[] {
    return this.transcript;
  }

  /**
   * Clear all transcript entries
   */
  clear(): void {
    this.transcript = [];
  }
}
