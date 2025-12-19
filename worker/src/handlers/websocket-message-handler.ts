// ABOUTME: Handles incoming WebSocket messages from the client
// ABOUTME: Decodes protobuf and routes to appropriate handlers

import { type ClientToServerMessage } from "../lib/proto/interview_pb.js";
import { decodeClientMessage } from "../messages.js";

/**
 * Handles incoming WebSocket messages from the client
 * Decodes protobuf and routes to appropriate handlers
 *
 * Extracts logic from GeminiSession.handleBinaryMessage
 */
export class WebSocketMessageHandler {
  /**
   * Decode and parse a binary WebSocket message
   */
  decodeMessage(buffer: ArrayBuffer): ClientToServerMessage {
    return decodeClientMessage(buffer);
  }

  /**
   * Determine message type for routing
   */
  getMessageType(
    message: ClientToServerMessage,
  ): "audio" | "end" | "unknown" {
    if (message.payload.case === "audioChunk") {
      return "audio";
    } else if (message.payload.case === "endRequest") {
      return "end";
    }
    return "unknown";
  }
}
