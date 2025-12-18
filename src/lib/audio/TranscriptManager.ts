/**
 * @file src/lib/audio/TranscriptManager.ts
 * @description Manages buffering and sentence detection for real-time transcripts.
 */
import type { preppal } from "~/lib/interview_pb";

type TranscriptUpdate = preppal.TranscriptUpdate;

interface TranscriptManagerCallbacks {
  onSentence: (speaker: string, sentence: string) => void;
}

export class TranscriptManager {
  private transcriptBuffers: Record<string, string> = {
    USER: "",
    AI: "",
  };
  private callbacks: TranscriptManagerCallbacks;

  constructor(callbacks: TranscriptManagerCallbacks) {
    this.callbacks = callbacks;
  }

  public process(update: TranscriptUpdate | null | undefined): void {
    if (!update?.speaker || !update?.text) {
      return;
    }

    const { speaker, text, turnComplete } = update;
    this.transcriptBuffers[speaker] += text;

    // Split by sentence-ending punctuation followed by optional whitespace.
    const sentences = this.transcriptBuffers[speaker].split(/(?<=[.?!])\s*/);

    if (sentences.length > 1) {
      for (let i = 0; i < sentences.length - 1; i++) {
        this.callbacks.onSentence(speaker, sentences[i].trim());
      }
      this.transcriptBuffers[speaker] = sentences[sentences.length - 1];
    }

    // If the turn is complete, flush the remaining buffer
    if (turnComplete && this.transcriptBuffers[speaker].trim()) {
      this.callbacks.onSentence(
        speaker,
        this.transcriptBuffers[speaker].trim(),
      );
      this.transcriptBuffers[speaker] = "";
    }
  }

  public getBufferedText(speaker: string): string {
    return this.transcriptBuffers[speaker] ?? "";
  }
}
