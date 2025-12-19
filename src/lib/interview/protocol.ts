/**
 * Protocol utilities for encoding/decoding interview WebSocket messages.
 * Provides type-safe wrappers around protobuf operations.
 */

import { preppal } from "~/lib/interview_pb";

/**
 * Encodes an audio chunk for sending to the server.
 */
export function encodeAudioChunk(audio: ArrayBuffer): Uint8Array {
  const message = preppal.ClientToServerMessage.create({
    audioChunk: { audioContent: new Uint8Array(audio) },
  });
  return preppal.ClientToServerMessage.encode(message).finish();
}

/**
 * Encodes an end request for sending to the server.
 */
export function encodeEndRequest(): Uint8Array {
  const message = preppal.ClientToServerMessage.create({ endRequest: {} });
  return preppal.ClientToServerMessage.encode(message).finish();
}

/**
 * Decodes a server message from binary data.
 */
export function decodeServerMessage(
  data: ArrayBuffer,
): preppal.ServerToClientMessage {
  return preppal.ServerToClientMessage.decode(new Uint8Array(data));
}
