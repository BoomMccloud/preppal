// ABOUTME: Protobuf message encoding and decoding for client-server WebSocket communication
// ABOUTME: Handles AudioChunk, EndRequest, TranscriptUpdate, AudioResponse, ErrorResponse, and SessionEnded messages

import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  type ClientToServerMessage,
  ClientToServerMessageSchema,
  type ServerToClientMessage,
  ServerToClientMessageSchema,
  TranscriptUpdateSchema,
  AudioResponseSchema,
  ErrorResponseSchema,
  SessionEndedSchema,
  SessionEnded_Reason,
} from "./lib/proto/interview_pb.js";

/**
 * Decodes a binary message from the client
 */
export function decodeClientMessage(buffer: ArrayBuffer): ClientToServerMessage {
  const uint8Array = new Uint8Array(buffer);
  return fromBinary(ClientToServerMessageSchema, uint8Array);
}

/**
 * Encodes a server message to binary for sending to client
 */
export function encodeServerMessage(message: ServerToClientMessage): Uint8Array {
  return toBinary(ServerToClientMessageSchema, message);
}

/**
 * Creates a transcript update message
 */
export function createTranscriptUpdate(
  speaker: string,
  text: string,
  isFinal: boolean,
  turnComplete: boolean = false,
): ServerToClientMessage {
  return create(ServerToClientMessageSchema, {
    payload: {
      case: "transcriptUpdate",
      value: create(TranscriptUpdateSchema, {
        speaker,
        text,
        isFinal,
        turnComplete,
      }),
    },
  });
}

/**
 * Creates an audio response message
 */
export function createAudioResponse(
  audioContent: Uint8Array,
): ServerToClientMessage {
  return create(ServerToClientMessageSchema, {
    payload: {
      case: "audioResponse",
      value: create(AudioResponseSchema, {
        audioContent,
      }),
    },
  });
}

/**
 * Creates an error response message
 */
export function createErrorResponse(
  code: number,
  message: string,
): ServerToClientMessage {
  return create(ServerToClientMessageSchema, {
    payload: {
      case: "error",
      value: create(ErrorResponseSchema, {
        code,
        message,
      }),
    },
  });
}

/**
 * Creates a session ended message
 */
export function createSessionEnded(
  reason: SessionEnded_Reason,
): ServerToClientMessage {
  return create(ServerToClientMessageSchema, {
    payload: {
      case: "sessionEnded",
      value: create(SessionEndedSchema, {
        reason,
      }),
    },
  });
}

// Re-export SessionEnded_Reason for use in other modules
export { SessionEnded_Reason };
