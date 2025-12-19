import { describe, it, expect, vi, beforeEach } from "vitest";
import { InterviewLifecycleManager } from "../../services/interview-lifecycle-manager";
import { INTERVIEW_STATUS } from "../../constants";
import type { IApiClient, TranscriptEntry } from "../../interfaces";

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
  const mockContext = {
    jobDescription: "Software Engineer",
    resume: "Experienced developer",
    persona: "professional interviewer",
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
    const mockTranscript: TranscriptEntry[] = [
      { speaker: "AI", content: "Hello", timestamp: "2024-01-01T00:00:00Z" },
    ];
    const mockFeedback = {
      summary: "Good",
      strengths: "Coding",
      contentAndStructure: "Clear",
      communicationAndDelivery: "Fluent",
      presentation: "Professional",
    };

    it("should submit transcript, generate feedback, and complete session", async () => {
      vi.mocked(generateFeedback).mockResolvedValue(mockFeedback);

      await manager.finalizeSession(
        mockInterviewId,
        mockTranscript,
        mockContext,
      );

      // 1. Submit Transcript
      expect(mockApiClient.submitTranscript).toHaveBeenCalledWith(
        mockInterviewId,
        mockTranscript,
        expect.any(String), // endedAt timestamp
      );

      // 2. Generate Feedback
      expect(generateFeedback).toHaveBeenCalledWith(
        mockTranscript,
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
      vi.mocked(generateFeedback).mockRejectedValue(new Error("AI Error"));

      await manager.finalizeSession(
        mockInterviewId,
        mockTranscript,
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
      vi.mocked(mockApiClient.submitTranscript).mockRejectedValue(
        new Error("DB Error"),
      );

      await manager.finalizeSession(
        mockInterviewId,
        mockTranscript,
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
