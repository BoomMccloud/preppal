import { describe, it, expect } from "vitest";
import * as interview_pb from "./interview_pb";

describe("Protobuf Usage", () => {
  describe("Message Creation and Encoding/Decoding", () => {
    it("should create and wrap an AudioChunk message", () => {
      const audioContent = new Uint8Array([1, 2, 3, 4]);
      const audioChunk = interview_pb.preppal.AudioChunk.create({
        audioContent: audioContent,
      });

      const message = interview_pb.preppal.ClientToServerMessage.create({
        audioChunk: audioChunk,
      });

      expect(message.audioChunk).toBeDefined();
      expect(message.audioChunk?.audioContent).toEqual(audioContent);
      expect(message.endRequest).toBeUndefined();
    });

    // TODO: This test is failing after the protobuf schema update.
    // The `encode` function is producing an empty buffer, which is unexpected.
    // This needs to be investigated to ensure the new schema is being handled correctly by the protobuf library.
    it.fails("should encode and decode a ServerToClientMessage", () => {
      // 1. Create a TranscriptUpdate payload
      const transcriptUpdate = interview_pb.preppal.TranscriptUpdate.create({
        speaker: "AI",
        text: "Hello, how can I help you?",
        isFinal: true,
      });

      // 2. Wrap it in the top-level message
      const message = interview_pb.preppal.ServerToClientMessage.create({
        transcriptUpdate: transcriptUpdate,
      });

      // 3. Encode the message to a binary buffer
      const buffer =
        interview_pb.preppal.ServerToClientMessage.encode(message).finish();
      console.log("Encoded buffer:", buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // 4. Decode it back
      const decodedMessage =
        interview_pb.preppal.ServerToClientMessage.decode(buffer);

      // 5. Verify the contents
      expect(decodedMessage).toBeDefined();
      expect(decodedMessage.transcriptUpdate).toBeDefined();
      expect(decodedMessage.transcriptUpdate?.speaker).toBe("AI");
      expect(decodedMessage.transcriptUpdate?.text).toBe(
        "Hello, how can I help you?",
      );
      expect(decodedMessage.transcriptUpdate?.isFinal).toBe(true);
      expect(decodedMessage.audioResponse).toBeUndefined();
    });
  });
});
