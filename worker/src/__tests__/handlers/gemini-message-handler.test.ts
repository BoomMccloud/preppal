import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeminiMessageHandler } from "../../handlers/gemini-message-handler";
import type {
  ITranscriptManager,
  IAudioConverter,
} from "../../interfaces/index.js";

describe("GeminiMessageHandler", () => {
  let handler: GeminiMessageHandler;
  let mockTranscriptManager: ITranscriptManager;
  let mockAudioConverter: IAudioConverter;

  beforeEach(() => {
    // Create mocks
    mockTranscriptManager = {
      addUserTranscript: vi.fn(),
      addAITranscript: vi.fn(),
      getTranscript: vi.fn(),
      clear: vi.fn(),
    };

    mockAudioConverter = {
      binaryToBase64: vi.fn(),
      base64ToBinary: vi.fn((base64) => new Uint8Array([1, 2, 3])),
    };

    handler = new GeminiMessageHandler(
      mockTranscriptManager,
      mockAudioConverter,
    );
  });

  it("should handle user transcript", () => {
    const message = {
      serverContent: {
        inputTranscription: { text: "Hello" },
      },
    };

    const result = handler.handleMessage(message);

    expect(mockTranscriptManager.addUserTranscript).toHaveBeenCalledWith(
      "Hello",
    );
    expect(result.userTranscript).toBeDefined();
    expect(result.userTranscript?.text).toBe("Hello");
    expect(result.userTranscript?.message).toBeDefined();
    expect(result.userTranscript?.message.length).toBeGreaterThan(0);
  });

  it("should handle AI transcript", () => {
    const message = {
      serverContent: {
        outputTranscription: { text: "Hi there" },
      },
    };

    const result = handler.handleMessage(message);

    expect(mockTranscriptManager.addAITranscript).toHaveBeenCalledWith(
      "Hi there",
    );
    expect(result.aiTranscript).toBeDefined();
    expect(result.aiTranscript?.text).toBe("Hi there");
    expect(result.aiTranscript?.message).toBeDefined();
    expect(result.aiTranscript?.message.length).toBeGreaterThan(0);
  });

  it("should handle audio data", () => {
    const message = {
      data: "base64audiodata",
    };

    const result = handler.handleMessage(message);

    expect(mockAudioConverter.base64ToBinary).toHaveBeenCalledWith(
      "base64audiodata",
    );
    expect(result.audio).toBeDefined();
    expect(result.audio?.data).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.audio?.message).toBeDefined();
    expect(result.audio?.message.length).toBeGreaterThan(0);
  });

  it("should handle combined message with transcript and audio", () => {
    const message = {
      serverContent: {
        outputTranscription: { text: "Speaking" },
      },
      data: "audiodata",
    };

    const result = handler.handleMessage(message);

    expect(result.aiTranscript).toBeDefined();
    expect(result.audio).toBeDefined();
  });

  it("should handle message with both user and AI transcripts", () => {
    const message = {
      serverContent: {
        inputTranscription: { text: "Question" },
        outputTranscription: { text: "Answer" },
      },
    };

    const result = handler.handleMessage(message);

    expect(mockTranscriptManager.addUserTranscript).toHaveBeenCalledWith(
      "Question",
    );
    expect(mockTranscriptManager.addAITranscript).toHaveBeenCalledWith(
      "Answer",
    );
    expect(result.userTranscript).toBeDefined();
    expect(result.aiTranscript).toBeDefined();
  });

  it("should handle empty message", () => {
    const message = {};
    const result = handler.handleMessage(message);

    expect(result).toEqual({});
  });

  it("should not call transcript manager for missing transcripts", () => {
    const message = {
      data: "audioonly",
    };

    handler.handleMessage(message);

    expect(mockTranscriptManager.addUserTranscript).not.toHaveBeenCalled();
    expect(mockTranscriptManager.addAITranscript).not.toHaveBeenCalled();
  });

  it("should not call audio converter for missing audio data", () => {
    const message = {
      serverContent: {
        inputTranscription: { text: "Text only" },
      },
    };

    handler.handleMessage(message);

    expect(mockAudioConverter.base64ToBinary).not.toHaveBeenCalled();
  });
});
