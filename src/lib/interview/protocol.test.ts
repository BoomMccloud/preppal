/**
 * Unit tests for protocol utilities.
 */

import { describe, it, expect } from "vitest";
import {
  encodeAudioChunk,
  encodeEndRequest,
  decodeServerMessage,
} from "./protocol";
import { preppal } from "~/lib/interview_pb";

describe("protocol utilities", () => {
  describe("encodeAudioChunk", () => {
    it("should encode an audio chunk to a valid protobuf message", () => {
      const audioData = new ArrayBuffer(4);
      const view = new Uint8Array(audioData);
      view.set([1, 2, 3, 4]);

      const encoded = encodeAudioChunk(audioData);

      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);

      // Verify it can be decoded back
      const decoded = preppal.ClientToServerMessage.decode(encoded);
      expect(decoded.audioChunk).toBeDefined();
      expect(decoded.audioChunk?.audioContent).toEqual(
        new Uint8Array([1, 2, 3, 4]),
      );
    });

    it("should handle empty audio data", () => {
      const audioData = new ArrayBuffer(0);

      const encoded = encodeAudioChunk(audioData);

      expect(encoded).toBeInstanceOf(Uint8Array);
      const decoded = preppal.ClientToServerMessage.decode(encoded);
      expect(decoded.audioChunk).toBeDefined();
    });
  });

  describe("encodeEndRequest", () => {
    it("should encode an end request to a valid protobuf message", () => {
      const encoded = encodeEndRequest();

      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);

      // Verify it can be decoded back
      const decoded = preppal.ClientToServerMessage.decode(encoded);
      expect(decoded.endRequest).toBeDefined();
      expect(decoded.audioChunk).toBeNull();
    });
  });

  describe("decodeServerMessage", () => {
    it("should decode a transcript update message", () => {
      // Create and encode a server message
      const serverMessage = preppal.ServerToClientMessage.create({
        transcriptUpdate: {
          speaker: "AI",
          text: "Hello",
          isFinal: true,
        },
      });
      const buffer =
        preppal.ServerToClientMessage.encode(serverMessage).finish();

      // Decode using our utility
      const decoded = decodeServerMessage(buffer.buffer as ArrayBuffer);

      expect(decoded.transcriptUpdate).toBeDefined();
      expect(decoded.transcriptUpdate?.speaker).toBe("AI");
      expect(decoded.transcriptUpdate?.text).toBe("Hello");
      expect(decoded.transcriptUpdate?.isFinal).toBe(true);
    });

    it("should decode an audio response message", () => {
      const audioContent = new Uint8Array([10, 20, 30]);
      const serverMessage = preppal.ServerToClientMessage.create({
        audioResponse: { audioContent },
      });
      const buffer =
        preppal.ServerToClientMessage.encode(serverMessage).finish();

      const decoded = decodeServerMessage(buffer.buffer as ArrayBuffer);

      expect(decoded.audioResponse).toBeDefined();
      expect(decoded.audioResponse?.audioContent).toEqual(audioContent);
    });

    it("should decode a session ended message", () => {
      const serverMessage = preppal.ServerToClientMessage.create({
        sessionEnded: { reason: 1 },
      });
      const buffer =
        preppal.ServerToClientMessage.encode(serverMessage).finish();

      const decoded = decodeServerMessage(buffer.buffer as ArrayBuffer);

      expect(decoded.sessionEnded).toBeDefined();
      expect(decoded.sessionEnded?.reason).toBe(1);
    });

    it("should decode an error message", () => {
      const serverMessage = preppal.ServerToClientMessage.create({
        error: { message: "Something went wrong" },
      });
      const buffer =
        preppal.ServerToClientMessage.encode(serverMessage).finish();

      const decoded = decodeServerMessage(buffer.buffer as ArrayBuffer);

      expect(decoded.error).toBeDefined();
      expect(decoded.error?.message).toBe("Something went wrong");
    });
  });
});
