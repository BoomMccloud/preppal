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
    persona: "professional interviewer",
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
        }),
      );
    });

    it("should include persona in system instruction", async () => {
      const contextWithPersona = {
        jobDescription: "Backend Developer",
        resume: "Node.js expert",
        persona: "Senior Technical Lead",
      };

      await handler.connect(contextWithPersona);

      expect(mockGeminiClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: expect.stringContaining("Senior Technical Lead"),
          }),
        }),
      );
    });

    it("should include job description in system instruction", async () => {
      const contextWithJD = {
        jobDescription: "Full Stack Engineer at StartupXYZ",
        resume: "",
        persona: "HR Manager",
      };

      await handler.connect(contextWithJD);

      expect(mockGeminiClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: expect.stringContaining(
              "Full Stack Engineer at StartupXYZ",
            ),
          }),
        }),
      );
    });

    it("should include resume in system instruction", async () => {
      const contextWithResume = {
        jobDescription: "",
        resume: "10 years of Python development",
        persona: "Engineering Director",
      };

      await handler.connect(contextWithResume);

      expect(mockGeminiClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: expect.stringContaining(
              "10 years of Python development",
            ),
          }),
        }),
      );
    });

    it("should build correct prompt structure via buildSystemPrompt", async () => {
      const fullContext = {
        jobDescription: "DevOps Engineer",
        resume: "AWS certified",
        persona: "Infrastructure Lead",
      };

      await handler.connect(fullContext);

      const connectCall = mockGeminiClient.connect.mock.calls[0][0];
      const systemInstruction = connectCall.config.systemInstruction;

      // Verify buildSystemPrompt output structure
      expect(systemInstruction).toContain("You are a Infrastructure Lead.");
      expect(systemInstruction).toContain(
        "Your goal is to conduct a behavioral interview.",
      );
      expect(systemInstruction).toContain("JOB DESCRIPTION:");
      expect(systemInstruction).toContain("DevOps Engineer");
      expect(systemInstruction).toContain("CANDIDATE RESUME:");
      expect(systemInstruction).toContain("AWS certified");
      expect(systemInstruction).toContain(
        "Start by introducing yourself and asking the candidate to introduce themselves.",
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
      // Must connect first to set isConnected = true
      await handler.connect(mockContext);
      vi.clearAllMocks(); // Clear connect-related calls

      const mockAudioChunk = new Uint8Array([1, 2, 3]);
      handler.processUserAudio(mockAudioChunk);

      expect(mockAudioConverter.binaryToBase64).toHaveBeenCalledWith(
        mockAudioChunk,
      );
      expect(mockGeminiClient.sendRealtimeInput).toHaveBeenCalledWith({
        audio: {
          data: "base64-data",
          mimeType: "audio/pcm;rate=16000",
        },
      });
    });

    it("should ignore empty audio chunks", async () => {
      // Must connect first, then test empty chunk handling
      await handler.connect(mockContext);
      vi.clearAllMocks();

      handler.processUserAudio(new Uint8Array([]));
      expect(mockGeminiClient.sendRealtimeInput).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("should close GeminiClient", () => {
      handler.disconnect();
      expect(mockGeminiClient.close).toHaveBeenCalled();
    });

    it("should ignore audio after disconnect (self-protecting)", async () => {
      // First, connect to set isConnected = true
      await handler.connect(mockContext);
      mockGeminiClient.sendRealtimeInput.mockClear();

      // Disconnect
      handler.disconnect();

      // Try to send audio after disconnect
      const mockAudioChunk = new Uint8Array([1, 2, 3]);
      handler.processUserAudio(mockAudioChunk);

      // Should NOT call sendRealtimeInput
      expect(mockGeminiClient.sendRealtimeInput).not.toHaveBeenCalled();
    });
  });

  // Note: Testing the internal callbacks (onopen, onmessage, etc.) passed to GeminiClient
  // would require exposing them or triggering them via the mock.
  // For this unit test, we focus on the public API and orchestration.
});
