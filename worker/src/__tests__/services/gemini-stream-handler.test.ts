import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiStreamHandler } from "../../services/gemini-stream-handler";
import type { GeminiMessage } from "../../interfaces";
import { Modality } from "@google/genai";

// Mock dependencies
const mockGeminiClient = {
  connect: vi.fn(),
  sendRealtimeInput: vi.fn(),
  sendClientContent: vi.fn(),
  close: vi.fn(),
};

const mockTranscriptManager = {
  getTranscript: vi.fn().mockReturnValue([]),
  addUserTranscript: vi.fn(),
  addAITranscript: vi.fn(),
  clear: vi.fn(),
};

const mockAudioConverter = {
  binaryToBase64: vi.fn((data) => "base64-data"),
  base64ToBinary: vi.fn(),
};

const mockGeminiMessageHandler = {
  handleMessage: vi.fn(),
};

// Mock constructors for dependencies
vi.mock("../../gemini-client", () => ({
  GeminiClient: vi.fn(() => mockGeminiClient),
}));

vi.mock("../../transcript-manager", () => ({
  TranscriptManager: vi.fn(() => mockTranscriptManager),
}));

vi.mock("../../audio-converter", () => ({
  AudioConverter: vi.fn(() => mockAudioConverter),
}));

vi.mock("../../handlers/gemini-message-handler", () => ({
  GeminiMessageHandler: vi.fn(() => mockGeminiMessageHandler),
}));

describe("GeminiStreamHandler", () => {
  let handler: GeminiStreamHandler;
  const mockApiKey = "test-api-key";
  const mockContext = {
    jobDescription: "Software Engineer",
    resume: "Resume content",
  };

  const mockCallbacks = {
    onAudio: vi.fn(),
    onUserTranscript: vi.fn(),
    onAITranscript: vi.fn(),
    onError: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GeminiStreamHandler(mockApiKey, mockCallbacks);
  });

  describe("connect", () => {
    it("should connect to GeminiClient with correct config", async () => {
      await handler.connect(mockContext);

      expect(mockGeminiClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.stringContaining("gemini-2.5"),
          config: expect.objectContaining({
            responseModalities: [Modality.AUDIO],
            systemInstruction: expect.stringContaining("Software Engineer"),
          }),
        })
      );
    });

    it("should send initial greeting after connection", async () => {
      await handler.connect(mockContext);

      expect(mockGeminiClient.sendClientContent).toHaveBeenCalledWith({
        turns: [
          expect.objectContaining({
            role: "user",
            parts: [{ text: "Hello, let's start the interview." }],
          }),
        ],
      });
    });
  });

  describe("processUserAudio", () => {
    it("should convert audio and send to GeminiClient", async () => {
      const mockAudioChunk = new Uint8Array([1, 2, 3]);
      await handler.processUserAudio(mockAudioChunk);

      expect(mockAudioConverter.binaryToBase64).toHaveBeenCalledWith(mockAudioChunk);
      expect(mockGeminiClient.sendRealtimeInput).toHaveBeenCalledWith({
        audio: {
          data: "base64-data",
          mimeType: "audio/pcm;rate=16000",
        },
      });
    });

    it("should ignore empty audio chunks", async () => {
      await handler.processUserAudio(new Uint8Array([]));
      expect(mockGeminiClient.sendRealtimeInput).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("should close GeminiClient", () => {
      handler.disconnect();
      expect(mockGeminiClient.close).toHaveBeenCalled();
    });
  });

  // Note: Testing the internal callbacks (onopen, onmessage, etc.) passed to GeminiClient
  // would require exposing them or triggering them via the mock.
  // For this unit test, we focus on the public API and orchestration.
});
