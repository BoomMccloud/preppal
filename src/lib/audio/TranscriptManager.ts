/**
 * @file src/lib/audio/TranscriptManager.ts
 * @description Manages buffering and sentence detection for real-time transcripts.
 */
import type { preppal } from "~/lib/interview_pb";

type TranscriptUpdate = preppal.ITranscriptUpdate;

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

    // Ensure the buffer exists for this speaker
    if (this.transcriptBuffers[speaker] === undefined) {
      this.transcriptBuffers[speaker] = "";
    }

    this.transcriptBuffers[speaker] += text;

    // Split by sentence-ending punctuation followed by optional whitespace.
    const sentences = (this.transcriptBuffers[speaker] ?? "").split(
      /(?<=[.?!])\s*/,
    );

    if (sentences.length > 1) {
      for (let i = 0; i < sentences.length - 1; i++) {
        const sentence = sentences[i];
        if (sentence) {
          this.callbacks.onSentence(speaker, sentence.trim());
        }
      }
      this.transcriptBuffers[speaker] = sentences[sentences.length - 1] ?? "";
    }

    // If the turn is complete, flush the remaining buffer
    const currentBuffer = this.transcriptBuffers[speaker] ?? "";
    if (turnComplete && currentBuffer.trim()) {
      this.callbacks.onSentence(speaker, currentBuffer.trim());
      this.transcriptBuffers[speaker] = "";
    }
  }

  public getBufferedText(speaker: string): string {
    return this.transcriptBuffers[speaker] ?? "";
  }
}
