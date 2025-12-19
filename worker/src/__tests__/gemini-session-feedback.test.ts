import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiSession } from "../gemini-session";
import * as feedbackUtils from "../utils/feedback";

// Mock dependencies
vi.mock("../utils/feedback", () => ({
  generateFeedback: vi.fn(),
}));

vi.mock("../api-client", () => {
  return {
    ApiClient: vi.fn().mockImplementation(() => ({
      submitTranscript: vi.fn().mockResolvedValue(undefined),
      submitFeedback: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

describe("GeminiSession.handleEndRequest - P0 Critical Tests", () => {
  let session: any;
  let mockWs: any;
  let mockEnv: any;
  let mockState: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
    };

    mockEnv = {
      NEXT_PUBLIC_API_URL: "http://localhost:3000",
      WORKER_SHARED_SECRET: "secret",
      GEMINI_API_KEY: "api-key",
    };

    mockState = {
      waitUntil: vi.fn((promise) => promise),
    };

    session = new GeminiSession(mockState, mockEnv);
    (session as any).interviewId = "test-interview-id";
    (session as any).transcriptManager = {
      getTranscript: vi
        .fn()
        .mockReturnValue([{ speaker: "USER", content: "test" }]),
    };
    (session as any).interviewContext = {
      jobDescription: "test jd",
      resume: "test resume",
    };
    (session as any).streamHandler = {
      disconnect: vi.fn(),
      getTranscript: vi.fn().mockReturnValue([]),
    };
  });

  it("should close WebSocket immediately and then process background tasks", async () => {
    await session.handleEndRequest(mockWs);

    // WebSocket should be closed
    expect(mockWs.close).toHaveBeenCalled();

    // Background tasks should have been triggered
    expect((session as any).apiClient.submitTranscript).toHaveBeenCalled();
    expect(feedbackUtils.generateFeedback).toHaveBeenCalled();
    expect((session as any).apiClient.submitFeedback).toHaveBeenCalled();
  });

  it("should continue to save transcript even if feedback generation fails", async () => {
    vi.mocked(feedbackUtils.generateFeedback).mockRejectedValue(
      new Error("AI error"),
    );

    await session.handleEndRequest(mockWs);

    // Transcript MUST still be submitted
    expect((session as any).apiClient.submitTranscript).toHaveBeenCalled();
    // Feedback submission should NOT have happened (or at least handled error)
    expect((session as any).apiClient.submitFeedback).not.toHaveBeenCalled();
  });

  it("should not proceed to feedback if transcript submission fails", async () => {
    vi.mocked((session as any).apiClient.submitTranscript).mockRejectedValue(
      new Error("DB error"),
    );

    await session.handleEndRequest(mockWs);

    expect((session as any).apiClient.submitTranscript).toHaveBeenCalled();
    expect(feedbackUtils.generateFeedback).not.toHaveBeenCalled();
  });
});
