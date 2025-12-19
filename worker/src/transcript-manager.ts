// ABOUTME: Turn-based transcript aggregation for interview conversations
// ABOUTME: Aggregates streaming deltas into complete turns, serializes to protobuf for storage

import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  TranscriptSchema,
  TurnSchema,
  Speaker,
  type Transcript,
} from "./lib/proto/transcript_pb.js";
import type { ITranscriptManager } from "./interfaces/index.js";

/** Internal representation of a turn (in-memory) */
interface InMemoryTurn {
  speaker: Speaker;
  content: string;
  timestamp: Date;
  isComplete: boolean;
}

/**
 * Manages conversation transcript with turn-based aggregation.
 *
 * Design: Streaming deltas from the same speaker are aggregated into a single turn.
 * A new turn is created when:
 * 1. Speaker changes (USER -> AI or AI -> USER)
 * 2. markTurnComplete() is called (forces new turn for same speaker)
 *
 * This reduces database bloat from hundreds of fragment rows to one row per interview.
 */
export class TranscriptManager implements ITranscriptManager {
  private turns: InMemoryTurn[] = [];

  /**
   * Add user transcript delta (appends to current user turn or creates new)
   */
  addUserTranscript(text: string): void {
    this.addTranscript(Speaker.USER, text);
  }

  /**
   * Add AI transcript delta (appends to current AI turn or creates new)
   */
  addAITranscript(text: string): void {
    this.addTranscript(Speaker.AI, text);
  }

  /**
   * Mark the current turn as complete.
   * Next add for the same speaker will create a new turn.
   */
  markTurnComplete(): void {
    const lastTurn = this.turns[this.turns.length - 1];
    if (lastTurn) {
      lastTurn.isComplete = true;
    }
  }

  /**
   * Serialize transcript to binary protobuf for database storage.
   */
  serializeTranscript(): Uint8Array {
    const protoTurns = this.turns.map((t) =>
      create(TurnSchema, {
        speaker: t.speaker,
        content: t.content,
        timestampMs: BigInt(t.timestamp.getTime()),
      })
    );

    const transcript = create(TranscriptSchema, { turns: protoTurns });
    return toBinary(TranscriptSchema, transcript);
  }

  /**
   * Format transcript as plain text for feedback generation.
   * Returns "SPEAKER: content" format, one turn per line.
   */
  formatAsText(): string {
    return this.turns
      .map((t) => `${speakerToString(t.speaker)}: ${t.content}`)
      .join("\n");
  }

  /**
   * Clear all transcript entries
   */
  clear(): void {
    this.turns = [];
  }

  /**
   * Internal: Add transcript delta with turn aggregation logic
   */
  private addTranscript(speaker: Speaker, text: string): void {
    const lastTurn = this.turns[this.turns.length - 1];

    // Append to existing turn if: same speaker AND not marked complete
    if (lastTurn && lastTurn.speaker === speaker && !lastTurn.isComplete) {
      lastTurn.content += text;
    } else {
      // Start a new turn
      this.turns.push({
        speaker,
        content: text,
        timestamp: new Date(),
        isComplete: false,
      });
    }
  }
}

/**
 * Convert Speaker enum to display string
 */
function speakerToString(speaker: Speaker): string {
  switch (speaker) {
    case Speaker.USER:
      return "USER";
    case Speaker.AI:
      return "AI";
    default:
      return "UNKNOWN";
  }
}

/**
 * Deserialize binary protobuf to transcript object.
 * Useful for reading transcript from database.
 */
export function deserializeTranscript(data: Uint8Array): Transcript {
  return fromBinary(TranscriptSchema, data);
}

/**
 * Format a deserialized transcript as plain text.
 * Useful for feedback generation from stored transcript.
 */
export function formatTranscriptAsText(transcript: Transcript): string {
  return (transcript.turns ?? [])
    .map(
      (t) =>
        `${speakerToString(t.speaker ?? Speaker.SPEAKER_UNSPECIFIED)}: ${t.content ?? ""}`,
    )
    .join("\n");
}
