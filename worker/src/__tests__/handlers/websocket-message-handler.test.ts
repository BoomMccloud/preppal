import { describe, it, expect, beforeEach } from "vitest";
import { WebSocketMessageHandler } from "../../handlers/websocket-message-handler";
import { preppal } from "../../lib/interview_pb.js";

describe("WebSocketMessageHandler", () => {
  let handler: WebSocketMessageHandler;

  beforeEach(() => {
    handler = new WebSocketMessageHandler();
  });

  it("should decode binary message", () => {
    // Create a test message
    const testMessage = preppal.ClientToServerMessage.create({
      audioChunk: {
        audioContent: new Uint8Array([1, 2, 3]),
      },
    });

    // Encode it
    const encoded = preppal.ClientToServerMessage.encode(testMessage).finish();

    // Convert to ArrayBuffer
    const buffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);

    // Decode it
    const decoded = handler.decodeMessage(buffer);

    expect(decoded.audioChunk).toBeDefined();
    expect(decoded.audioChunk?.audioContent).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("should identify audio message type", () => {
    const message = preppal.ClientToServerMessage.create({
      audioChunk: {
        audioContent: new Uint8Array([1, 2, 3]),
      },
    });

    const type = handler.getMessageType(message);

    expect(type).toBe("audio");
  });

  it("should identify end message type", () => {
    const message = preppal.ClientToServerMessage.create({
      endRequest: {},
    });

    const type = handler.getMessageType(message);

    expect(type).toBe("end");
  });

  it("should identify unknown message type", () => {
    const message = preppal.ClientToServerMessage.create({});

    const type = handler.getMessageType(message);

    expect(type).toBe("unknown");
  });
});
