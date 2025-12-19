// ABOUTME: Unit tests for TranscriptManager turn-based aggregation
// ABOUTME: Tests pure logic without mocks - aggregation, serialization, formatting

import { describe, it, expect, beforeEach } from "vitest";
import {
  TranscriptManager,
  deserializeTranscript,
  formatTranscriptAsText,
} from "../transcript-manager";
import { Speaker } from "../lib/proto/transcript_pb.js";

describe("TranscriptManager", () => {
  let manager: TranscriptManager;

  beforeEach(() => {
    manager = new TranscriptManager();
  });

  describe("turn aggregation", () => {
    it("should append to existing turn for same speaker", () => {
      manager.addUserTranscript("Hello ");
      manager.addUserTranscript("world");

      const text = manager.formatAsText();
      expect(text).toBe("USER: Hello world");
    });

    it("should create new turn when speaker changes", () => {
      manager.addUserTranscript("Hello");
      manager.addAITranscript("Hi there");

      const text = manager.formatAsText();
      expect(text).toBe("USER: Hello\nAI: Hi there");
    });

    it("should create new turn after markTurnComplete for same speaker", () => {
      manager.addUserTranscript("First message");
      manager.markTurnComplete();
      manager.addUserTranscript("Second message");

      const text = manager.formatAsText();
      expect(text).toBe("USER: First message\nUSER: Second message");
    });

    it("should handle rapid speaker switching", () => {
      manager.addUserTranscript("A");
      manager.addAITranscript("B");
      manager.addUserTranscript("C");
      manager.addAITranscript("D");

      const text = manager.formatAsText();
      expect(text).toBe("USER: A\nAI: B\nUSER: C\nAI: D");
    });

    it("should aggregate multiple deltas within same turn", () => {
      // Simulate streaming: "H", "He", "Hel", "Hell", "Hello"
      manager.addAITranscript("H");
      manager.addAITranscript("e");
      manager.addAITranscript("l");
      manager.addAITranscript("l");
      manager.addAITranscript("o");

      const text = manager.formatAsText();
      expect(text).toBe("AI: Hello");
    });
  });

  describe("serialization", () => {
    it("should serialize empty transcript to valid protobuf", () => {
      const serialized = manager.serializeTranscript();
      // protobufjs may return Buffer or Uint8Array depending on environment
      expect(serialized.length).toBeDefined();

      // Should be decodable
      const decoded = deserializeTranscript(serialized);
      expect(decoded.turns).toEqual([]);
    });

    it("should roundtrip single turn correctly", () => {
      manager.addUserTranscript("Test message");

      const serialized = manager.serializeTranscript();
      const decoded = deserializeTranscript(serialized);

      expect(decoded.turns).toHaveLength(1);
      expect(decoded.turns[0]?.speaker).toBe(Speaker.USER);
      expect(decoded.turns[0]?.content).toBe("Test message");
      // timestampMs may be Long or number depending on protobufjs config
      expect(Number(decoded.turns[0]?.timestampMs)).toBeGreaterThan(0);
    });

    it("should roundtrip multiple turns correctly", () => {
      manager.addUserTranscript("Hello");
      manager.addAITranscript("Hi there");
      manager.addUserTranscript("How are you?");

      const serialized = manager.serializeTranscript();
      const decoded = deserializeTranscript(serialized);

      expect(decoded.turns).toHaveLength(3);
      expect(decoded.turns[0]?.speaker).toBe(Speaker.USER);
      expect(decoded.turns[0]?.content).toBe("Hello");
      expect(decoded.turns[1]?.speaker).toBe(Speaker.AI);
      expect(decoded.turns[1]?.content).toBe("Hi there");
      expect(decoded.turns[2]?.speaker).toBe(Speaker.USER);
      expect(decoded.turns[2]?.content).toBe("How are you?");
    });

    it("should preserve timestamps in serialization", () => {
      const beforeTime = Date.now();
      manager.addUserTranscript("Test");
      const afterTime = Date.now();

      const serialized = manager.serializeTranscript();
      const decoded = deserializeTranscript(serialized);

      const timestampMs = Number(decoded.turns[0]?.timestampMs);
      expect(timestampMs).toBeGreaterThanOrEqual(beforeTime);
      expect(timestampMs).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("formatAsText", () => {
    it("should return empty string for empty transcript", () => {
      expect(manager.formatAsText()).toBe("");
    });

    it("should format single turn correctly", () => {
      manager.addUserTranscript("Hello");
      expect(manager.formatAsText()).toBe("USER: Hello");
    });

    it("should format AI turn correctly", () => {
      manager.addAITranscript("Hello, I am AI");
      expect(manager.formatAsText()).toBe("AI: Hello, I am AI");
    });

    it("should join multiple turns with newlines", () => {
      manager.addUserTranscript("Question?");
      manager.addAITranscript("Answer.");
      manager.addUserTranscript("Follow up?");

      expect(manager.formatAsText()).toBe(
        "USER: Question?\nAI: Answer.\nUSER: Follow up?",
      );
    });
  });

  describe("formatTranscriptAsText utility", () => {
    it("should format deserialized transcript correctly", () => {
      manager.addUserTranscript("Hello");
      manager.addAITranscript("Hi");

      const serialized = manager.serializeTranscript();
      const decoded = deserializeTranscript(serialized);
      const text = formatTranscriptAsText(decoded);

      expect(text).toBe("USER: Hello\nAI: Hi");
    });

    it("should handle empty transcript", () => {
      const serialized = manager.serializeTranscript();
      const decoded = deserializeTranscript(serialized);
      const text = formatTranscriptAsText(decoded);

      expect(text).toBe("");
    });
  });

  describe("clear", () => {
    it("should clear all transcript data", () => {
      manager.addUserTranscript("Hello");
      manager.addAITranscript("Hi");
      manager.clear();

      expect(manager.formatAsText()).toBe("");
      const serialized = manager.serializeTranscript();
      const decoded = deserializeTranscript(serialized);
      expect(decoded.turns).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty text gracefully", () => {
      manager.addUserTranscript("");
      manager.addUserTranscript("actual content");

      // Empty string should still create/append to turn
      const text = manager.formatAsText();
      expect(text).toBe("USER: actual content");
    });

    it("should handle very long content", () => {
      const longText = "a".repeat(10000);
      manager.addUserTranscript(longText);

      const serialized = manager.serializeTranscript();
      const decoded = deserializeTranscript(serialized);

      expect(decoded.turns[0]?.content).toBe(longText);
    });

    it("should handle special characters", () => {
      manager.addUserTranscript("Hello! 你好 🎉 \n\t special");

      const serialized = manager.serializeTranscript();
      const decoded = deserializeTranscript(serialized);

      expect(decoded.turns[0]?.content).toBe("Hello! 你好 🎉 \n\t special");
    });

    it("should handle markTurnComplete on empty transcript", () => {
      // Should not throw
      manager.markTurnComplete();
      expect(manager.formatAsText()).toBe("");
    });

    it("should handle multiple markTurnComplete calls", () => {
      manager.addUserTranscript("A");
      manager.markTurnComplete();
      manager.markTurnComplete();
      manager.markTurnComplete();
      manager.addUserTranscript("B");

      const text = manager.formatAsText();
      expect(text).toBe("USER: A\nUSER: B");
    });
  });
});
