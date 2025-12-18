// ABOUTME: Handles incoming WebSocket messages from the client
// ABOUTME: Decodes protobuf and routes to appropriate handlers

import { preppal } from "../lib/interview_pb.js";
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
  decodeMessage(buffer: ArrayBuffer): preppal.ClientToServerMessage {
    return decodeClientMessage(buffer);
  }

  /**
   * Determine message type for routing
   */
  getMessageType(
    message: preppal.ClientToServerMessage,
  ): "audio" | "end" | "unknown" {
    if (message.audioChunk) {
      return "audio";
    } else if (message.endRequest) {
      return "end";
    }
    return "unknown";
  }
}
