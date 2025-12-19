/**
 * @file src/lib/audio/TranscriptManager.ts
 * @description Rolling buffer caption manager for real-time transcripts.
 * Uses closed-caption style display - appends text immediately and emits chunks.
 */
import type { TranscriptUpdate } from "~/lib/proto/interview_pb";

interface TranscriptManagerCallbacks {
  /** Called when a chunk of text is ready for display */
  onSentence: (speaker: string, text: string) => void;
}

/** Default max characters to keep in the buffer before emitting */
const DEFAULT_MAX_LENGTH = 200;

/**
 * Manages rolling buffer captions for real-time transcript display.
 *
 * Design: Uses closed-caption style - text accumulates in a buffer and is
 * emitted when the turn completes or buffer reaches max size. Simpler than
 * sentence-boundary detection and provides immediate feedback.
 */
export class TranscriptManager {
  private buffers: Record<string, string> = {
    USER: "",
    AI: "",
  };
  private callbacks: TranscriptManagerCallbacks;
  private maxLength: number;

  constructor(
    callbacks: TranscriptManagerCallbacks,
    maxLength: number = DEFAULT_MAX_LENGTH,
  ) {
    this.callbacks = callbacks;
    this.maxLength = maxLength;
  }

  /**
   * Process incoming transcript update.
   * Appends text to buffer and emits when turn completes or buffer is full.
   */
  public process(update: TranscriptUpdate | null | undefined): void {
    if (!update?.speaker || !update?.text) {
      return;
    }

    const { speaker, text, turnComplete } = update;

    // Ensure buffer exists
    this.buffers[speaker] ??= "";

    // Append new text
    this.buffers[speaker] += text;

    // Emit and clear if buffer exceeds limit
    if ((this.buffers[speaker]?.length ?? 0) > this.maxLength) {
      const content = this.buffers[speaker] ?? "";
      if (content.trim()) {
        this.callbacks.onSentence(speaker, content.trim());
      }
      this.buffers[speaker] = "";
    }

    // Emit and clear buffer on turn complete
    if (turnComplete) {
      const content = this.buffers[speaker] ?? "";
      if (content.trim()) {
        this.callbacks.onSentence(speaker, content.trim());
      }
      this.buffers[speaker] = "";
    }
  }

  /**
   * Get the current buffered text for a speaker.
   */
  public getBufferedText(speaker: string): string {
    return this.buffers[speaker] ?? "";
  }

  /**
   * Clear all buffers.
   */
  public clear(): void {
    this.buffers = { USER: "", AI: "" };
  }
}
