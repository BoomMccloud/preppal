// ABOUTME: Tests for protobuf message encoding and decoding
// ABOUTME: Validates message serialization for client-server WebSocket communication

import { describe, it, expect } from "vitest";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  decodeClientMessage,
  encodeServerMessage,
  createTranscriptUpdate,
  createAudioResponse,
  createErrorResponse,
  createSessionEnded,
  SessionEnded_Reason,
} from "../messages";
import {
  ClientToServerMessageSchema,
  ServerToClientMessageSchema,
  AudioChunkSchema,
  EndRequestSchema,
} from "../lib/proto/interview_pb.js";

describe("Message Encoding/Decoding", () => {
  describe("Client to Server Messages", () => {
    it("should decode an AudioChunk message", () => {
      const audioData = new Uint8Array([1, 2, 3, 4, 5]);
      const message = create(ClientToServerMessageSchema, {
        payload: {
          case: "audioChunk",
          value: create(AudioChunkSchema, { audioContent: audioData }),
        },
      });

      const encoded = toBinary(ClientToServerMessageSchema, message);
      // Convert to ArrayBuffer for decoding
      const buffer = encoded.buffer.slice(
        encoded.byteOffset,
        encoded.byteOffset + encoded.byteLength,
      ) as ArrayBuffer;
      const decoded = decodeClientMessage(buffer);

      expect(decoded.payload.case).toBe("audioChunk");
      if (decoded.payload.case === "audioChunk") {
        expect(decoded.payload.value.audioContent).toEqual(audioData);
      }
    });

    it("should decode an EndRequest message", () => {
      const message = create(ClientToServerMessageSchema, {
        payload: {
          case: "endRequest",
          value: create(EndRequestSchema, {}),
        },
      });

      const encoded = toBinary(ClientToServerMessageSchema, message);
      const buffer = encoded.buffer.slice(
        encoded.byteOffset,
        encoded.byteOffset + encoded.byteLength,
      ) as ArrayBuffer;
      const decoded = decodeClientMessage(buffer);

      expect(decoded.payload.case).toBe("endRequest");
    });
  });

  describe("Server to Client Messages", () => {
    it("should create and encode a TranscriptUpdate message", () => {
      const message = createTranscriptUpdate("USER", "Hello world", true);
      const encoded = encodeServerMessage(message);

      expect(encoded).toBeInstanceOf(Uint8Array);

      const decoded = fromBinary(ServerToClientMessageSchema, encoded);
      expect(decoded.payload.case).toBe("transcriptUpdate");
      if (decoded.payload.case === "transcriptUpdate") {
        expect(decoded.payload.value.speaker).toBe("USER");
        expect(decoded.payload.value.text).toBe("Hello world");
        expect(decoded.payload.value.isFinal).toBe(true);
      }
    });

    it("should create and encode an AudioResponse message", () => {
      const audioData = new Uint8Array([10, 20, 30, 40, 50]);
      const message = createAudioResponse(audioData);
      const encoded = encodeServerMessage(message);

      expect(encoded).toBeInstanceOf(Uint8Array);

      const decoded = fromBinary(ServerToClientMessageSchema, encoded);
      expect(decoded.payload.case).toBe("audioResponse");
      if (decoded.payload.case === "audioResponse") {
        expect(Array.from(decoded.payload.value.audioContent ?? [])).toEqual(
          Array.from(audioData),
        );
      }
    });

    it("should create and encode an ErrorResponse message", () => {
      const message = createErrorResponse(4001, "Authentication failed");
      const encoded = encodeServerMessage(message);

      expect(encoded).toBeInstanceOf(Uint8Array);

      const decoded = fromBinary(ServerToClientMessageSchema, encoded);
      expect(decoded.payload.case).toBe("error");
      if (decoded.payload.case === "error") {
        expect(decoded.payload.value.code).toBe(4001);
        expect(decoded.payload.value.message).toBe("Authentication failed");
      }
    });

    it("should create and encode a SessionEnded message", () => {
      const message = createSessionEnded(SessionEnded_Reason.USER_INITIATED);
      const encoded = encodeServerMessage(message);

      expect(encoded).toBeInstanceOf(Uint8Array);

      const decoded = fromBinary(ServerToClientMessageSchema, encoded);
      expect(decoded.payload.case).toBe("sessionEnded");
      if (decoded.payload.case === "sessionEnded") {
        expect(decoded.payload.value.reason).toBe(
          SessionEnded_Reason.USER_INITIATED,
        );
      }
    });

    it("should handle all SessionEnded reasons", () => {
      const reasons = [
        SessionEnded_Reason.REASON_UNSPECIFIED,
        SessionEnded_Reason.USER_INITIATED,
        SessionEnded_Reason.GEMINI_ENDED,
        SessionEnded_Reason.TIMEOUT,
      ];

      reasons.forEach((reason) => {
        const message = createSessionEnded(reason);
        const encoded = encodeServerMessage(message);
        const decoded = fromBinary(ServerToClientMessageSchema, encoded);

        if (decoded.payload.case === "sessionEnded") {
          expect(decoded.payload.value.reason).toBe(reason);
        }
      });
    });
  });

  describe("Round-trip encoding", () => {
    it("should preserve data through encode/decode cycle", () => {
      const original = createTranscriptUpdate(
        "AI",
        "This is a test message",
        false,
      );
      const encoded = encodeServerMessage(original);
      const decoded = fromBinary(ServerToClientMessageSchema, encoded);

      if (decoded.payload.case === "transcriptUpdate") {
        expect(decoded.payload.value.speaker).toBe("AI");
        expect(decoded.payload.value.text).toBe("This is a test message");
        expect(decoded.payload.value.isFinal).toBe(false);
      }
    });
  });
});
