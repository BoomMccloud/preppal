// ABOUTME: Server-side transcript deserialization utilities
// ABOUTME: Mirrors worker/src/transcript-manager.ts for server use

import { fromBinary } from "@bufbuild/protobuf";
import {
  TranscriptSchema,
  Speaker,
  type Transcript,
} from "~/lib/proto/transcript_pb";

/**
 * Deserialize binary protobuf to transcript object.
 * Server-side equivalent of worker's deserializeTranscript.
 */
export function deserializeTranscript(data: Buffer | Uint8Array): Transcript {
  const uint8 = data instanceof Buffer ? new Uint8Array(data) : data;
  return fromBinary(TranscriptSchema, uint8);
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
 * Format a deserialized transcript as plain text for feedback generation.
 */
export function formatTranscriptAsText(transcript: Transcript): string {
  return (transcript.turns ?? [])
    .map((t) => {
      const speaker = speakerToString(t.speaker ?? Speaker.SPEAKER_UNSPECIFIED);
      return `${speaker}: ${t.content ?? ""}`;
    })
    .join("\n");
}

/**
 * Convenience: Deserialize and format in one step.
 * This is what block-feedback.ts will use.
 */
export function transcriptBinaryToText(data: Buffer | Uint8Array): string {
  const transcript = deserializeTranscript(data);
  return formatTranscriptAsText(transcript);
}
