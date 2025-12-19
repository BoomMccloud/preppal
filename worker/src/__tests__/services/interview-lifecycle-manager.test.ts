import { describe, it, expect, vi, beforeEach } from "vitest";
import { InterviewLifecycleManager } from "../../services/interview-lifecycle-manager";
import { INTERVIEW_STATUS } from "../../constants";
import type { IApiClient, ITranscriptManager, InterviewContext } from "../../interfaces";

// Mock generateFeedback
vi.mock("../../utils/feedback", () => ({
  generateFeedback: vi.fn(),
}));

import { generateFeedback } from "../../utils/feedback";

describe("InterviewLifecycleManager", () => {
  let manager: InterviewLifecycleManager;
  let mockApiClient: IApiClient;
  const mockApiKey = "test-api-key";
  const mockInterviewId = "test-interview-id";
  const mockContext: InterviewContext = {
    jobDescription: "Software Engineer",
    resume: "Experienced developer",
    persona: "professional interviewer",
    durationMs: 1800000,
  };

  beforeEach(() => {
    // Setup Mock ApiClient
    mockApiClient = {
      updateStatus: vi.fn(),
      submitTranscript: vi.fn(),
      submitFeedback: vi.fn(),
      getContext: vi.fn(),
    };

    manager = new InterviewLifecycleManager(mockApiClient, mockApiKey);

    // Reset mocks
    vi.mocked(generateFeedback).mockReset();
  });

  describe("initializeSession", () => {
    it("should fetch context and update status to IN_PROGRESS", async () => {
      vi.mocked(mockApiClient.getContext).mockResolvedValue(mockContext);

      const result = await manager.initializeSession(mockInterviewId);

      expect(mockApiClient.getContext).toHaveBeenCalledWith(mockInterviewId);
      expect(mockApiClient.updateStatus).toHaveBeenCalledWith(
        mockInterviewId,
        INTERVIEW_STATUS.IN_PROGRESS,
      );
      expect(result).toEqual(mockContext);
    });

    it("should throw error if updateStatus fails", async () => {
      vi.mocked(mockApiClient.getContext).mockResolvedValue(mockContext);
      vi.mocked(mockApiClient.updateStatus).mockRejectedValue(
        new Error("API Error"),
      );

      await expect(manager.initializeSession(mockInterviewId)).rejects.toThrow(
        "API Error",
      );
    });

    it("should return empty context if getContext fails (graceful degradation)", async () => {
      vi.mocked(mockApiClient.getContext).mockRejectedValue(
        new Error("Context Error"),
      );

      const result = await manager.initializeSession(mockInterviewId);

      expect(mockApiClient.getContext).toHaveBeenCalled();
      expect(result).toEqual({
        jobDescription: "",
        resume: "",
        persona: "professional interviewer",
        durationMs: 30 * 60 * 1000,
      });
    });
  });

  describe("finalizeSession", () => {
    const mockSerializedTranscript = new Uint8Array([1, 2, 3, 4, 5]);
    const mockTranscriptText = "USER: Hello\nAI: Hi there";

    // Create a mock transcript manager
    const createMockTranscriptManager = (): ITranscriptManager => ({
      addUserTranscript: vi.fn(),
      addAITranscript: vi.fn(),
      markTurnComplete: vi.fn(),
      serializeTranscript: vi.fn().mockReturnValue(mockSerializedTranscript),
      formatAsText: vi.fn().mockReturnValue(mockTranscriptText),
      clear: vi.fn(),
    });

    const mockFeedback = {
      summary: "Good",
      strengths: "Coding",
      contentAndStructure: "Clear",
      communicationAndDelivery: "Fluent",
      presentation: "Professional",
    };

    it("should submit transcript, generate feedback, and complete session", async () => {
      const mockTranscriptManager = createMockTranscriptManager();
      vi.mocked(generateFeedback).mockResolvedValue(mockFeedback);

      await manager.finalizeSession(
        mockInterviewId,
        mockTranscriptManager,
        mockContext,
      );

      // 1. Submit Transcript (with serialized binary data)
      expect(mockTranscriptManager.serializeTranscript).toHaveBeenCalled();
      expect(mockApiClient.submitTranscript).toHaveBeenCalledWith(
        mockInterviewId,
        mockSerializedTranscript,
        expect.any(String), // endedAt timestamp
      );

      // 2. Generate Feedback (with formatted text)
      expect(mockTranscriptManager.formatAsText).toHaveBeenCalled();
      expect(generateFeedback).toHaveBeenCalledWith(
        mockTranscriptText,
        mockContext,
        mockApiKey,
      );

      // 3. Submit Feedback
      expect(mockApiClient.submitFeedback).toHaveBeenCalledWith(
        mockInterviewId,
        mockFeedback,
      );

      // 4. Update Status
      expect(mockApiClient.updateStatus).toHaveBeenCalledWith(
        mockInterviewId,
        INTERVIEW_STATUS.COMPLETED,
      );
    });

    it("should complete session even if feedback generation fails", async () => {
      const mockTranscriptManager = createMockTranscriptManager();
      vi.mocked(generateFeedback).mockRejectedValue(new Error("AI Error"));

      await manager.finalizeSession(
        mockInterviewId,
        mockTranscriptManager,
        mockContext,
      );

      expect(mockApiClient.submitTranscript).toHaveBeenCalled();
      expect(generateFeedback).toHaveBeenCalled();
      // Should NOT submit feedback
      expect(mockApiClient.submitFeedback).not.toHaveBeenCalled();
      // But SHOULD still complete the session
      expect(mockApiClient.updateStatus).toHaveBeenCalledWith(
        mockInterviewId,
        INTERVIEW_STATUS.COMPLETED,
      );
    });

    it("should set status to ERROR if transcript submission fails", async () => {
      const mockTranscriptManager = createMockTranscriptManager();
      vi.mocked(mockApiClient.submitTranscript).mockRejectedValue(
        new Error("DB Error"),
      );

      await manager.finalizeSession(
        mockInterviewId,
        mockTranscriptManager,
        mockContext,
      );

      // Should attempt to set status to ERROR
      expect(mockApiClient.updateStatus).toHaveBeenCalledWith(
        mockInterviewId,
        INTERVIEW_STATUS.ERROR,
      );
    });
  });

  describe("handleError", () => {
    it("should update status to ERROR", async () => {
      await manager.handleError(mockInterviewId, new Error("Test error"));

      expect(mockApiClient.updateStatus).toHaveBeenCalledWith(
        mockInterviewId,
        INTERVIEW_STATUS.ERROR,
      );
    });
  });
});
