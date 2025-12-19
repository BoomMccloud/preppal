/**
 * Protocol utilities for encoding/decoding interview WebSocket messages.
 * Provides type-safe wrappers around protobuf operations.
 */

import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  type ServerToClientMessage,
  ServerToClientMessageSchema,
  ClientToServerMessageSchema,
  AudioChunkSchema,
  EndRequestSchema,
} from "~/lib/proto/interview_pb";

/**
 * Encodes an audio chunk for sending to the server.
 */
export function encodeAudioChunk(audio: ArrayBuffer): Uint8Array {
  const message = create(ClientToServerMessageSchema, {
    payload: {
      case: "audioChunk",
      value: create(AudioChunkSchema, { audioContent: new Uint8Array(audio) }),
    },
  });
  return toBinary(ClientToServerMessageSchema, message);
}

/**
 * Encodes an end request for sending to the server.
 */
export function encodeEndRequest(): Uint8Array {
  const message = create(ClientToServerMessageSchema, {
    payload: {
      case: "endRequest",
      value: create(EndRequestSchema, {}),
    },
  });
  return toBinary(ClientToServerMessageSchema, message);
}

/**
 * Decodes a server message from binary data.
 */
export function decodeServerMessage(data: ArrayBuffer): ServerToClientMessage {
  return fromBinary(ServerToClientMessageSchema, new Uint8Array(data));
}
