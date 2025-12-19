import { describe, it, expect, beforeEach } from "vitest";
import { create, toBinary } from "@bufbuild/protobuf";
import { WebSocketMessageHandler } from "../../handlers/websocket-message-handler";
import {
  ClientToServerMessageSchema,
  AudioChunkSchema,
  EndRequestSchema,
} from "../../lib/proto/interview_pb.js";

describe("WebSocketMessageHandler", () => {
  let handler: WebSocketMessageHandler;

  beforeEach(() => {
    handler = new WebSocketMessageHandler();
  });

  it("should decode binary message", () => {
    // Create a test message
    const testMessage = create(ClientToServerMessageSchema, {
      payload: {
        case: "audioChunk",
        value: create(AudioChunkSchema, {
          audioContent: new Uint8Array([1, 2, 3]),
        }),
      },
    });

    // Encode it
    const encoded = toBinary(ClientToServerMessageSchema, testMessage);

    // Convert to ArrayBuffer
    const buffer = encoded.buffer.slice(
      encoded.byteOffset,
      encoded.byteOffset + encoded.byteLength,
    );

    // Decode it
    const decoded = handler.decodeMessage(buffer);

    expect(decoded.payload.case).toBe("audioChunk");
    if (decoded.payload.case === "audioChunk") {
      expect(decoded.payload.value.audioContent).toEqual(new Uint8Array([1, 2, 3]));
    }
  });

  it("should identify audio message type", () => {
    const message = create(ClientToServerMessageSchema, {
      payload: {
        case: "audioChunk",
        value: create(AudioChunkSchema, {
          audioContent: new Uint8Array([1, 2, 3]),
        }),
      },
    });

    const type = handler.getMessageType(message);

    expect(type).toBe("audio");
  });

  it("should identify end message type", () => {
    const message = create(ClientToServerMessageSchema, {
      payload: {
        case: "endRequest",
        value: create(EndRequestSchema, {}),
      },
    });

    const type = handler.getMessageType(message);

    expect(type).toBe("end");
  });

  it("should identify unknown message type", () => {
    const message = create(ClientToServerMessageSchema, {});

    const type = handler.getMessageType(message);

    expect(type).toBe("unknown");
  });
});
