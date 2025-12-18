// ABOUTME: Tests for protobuf-based API client that communicates with Next.js backend
// ABOUTME: Validates binary protobuf encoding/decoding and proper authentication

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiClient } from "../api-client";
import { preppal } from "../lib/interview_pb.js";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * Helper to create a mock protobuf response
 */
function createMockProtobufResponse(response: preppal.IWorkerApiResponse): {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
} {
  const encoded = preppal.WorkerApiResponse.encode(response).finish();
  return {
    ok: true,
    status: 200,
    arrayBuffer: vi
      .fn()
      .mockResolvedValue(
        encoded.buffer.slice(
          encoded.byteOffset,
          encoded.byteOffset + encoded.byteLength,
        ),
      ),
  };
}

/**
 * Helper to create a mock error response
 */
function createMockErrorResponse(
  code: number,
  message: string,
): {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
} {
  return createMockProtobufResponse({
    error: { code, message },
  });
}

describe("ApiClient", () => {
  let apiClient: ApiClient;
  const mockApiUrl = "https://api.example.com";
  const mockWorkerSecret = "test-worker-secret";

  beforeEach(() => {
    apiClient = new ApiClient(mockApiUrl, mockWorkerSecret);
    mockFetch.mockClear();
  });

  describe("updateStatus", () => {
    it("should send POST request to protobuf endpoint", async () => {
      const interviewId = "interview-123";
      const status = "IN_PROGRESS";

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse({
          updateStatus: { success: true },
        }),
      );

      await apiClient.updateStatus(interviewId, status);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/api/worker",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-protobuf",
            Authorization: `Bearer ${mockWorkerSecret}`,
          },
        }),
      );
    });

    it("should encode request as protobuf", async () => {
      const interviewId = "interview-123";
      const status = "COMPLETED";

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse({
          updateStatus: { success: true },
        }),
      );

      await apiClient.updateStatus(interviewId, status);

      // Verify the body can be decoded as protobuf
      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      const requestBuffer = callArgs?.body as ArrayBuffer;
      const decoded = preppal.WorkerApiRequest.decode(
        new Uint8Array(requestBuffer),
      );
      expect(decoded.updateStatus?.interviewId).toBe(interviewId);
      expect(decoded.updateStatus?.status).toBe(
        preppal.InterviewStatus.COMPLETED,
      );
    });

    it("should throw error when API returns error response", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(404, "Interview not found"),
      );

      await expect(
        apiClient.updateStatus("interview-123", "IN_PROGRESS"),
      ).rejects.toThrow("API Error (404): Interview not found");
    });
  });

  describe("submitTranscript", () => {
    it("should send POST request with transcript entries", async () => {
      const interviewId = "interview-123";
      const transcript = [
        {
          speaker: "USER" as const,
          content: "Hello",
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          speaker: "AI" as const,
          content: "Hi there!",
          timestamp: "2024-01-01T00:00:01Z",
        },
      ];
      const endedAt = "2024-01-01T00:00:02Z";

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse({
          submitTranscript: { success: true },
        }),
      );

      await apiClient.submitTranscript(interviewId, transcript, endedAt);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify the request body contains transcript entries
      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      const requestBuffer = callArgs?.body as ArrayBuffer;
      const decoded = preppal.WorkerApiRequest.decode(
        new Uint8Array(requestBuffer),
      );

      expect(decoded.submitTranscript?.interviewId).toBe(interviewId);
      expect(decoded.submitTranscript?.entries).toHaveLength(2);
      expect(decoded.submitTranscript?.entries?.[0]?.speaker).toBe("USER");
      expect(decoded.submitTranscript?.entries?.[0]?.content).toBe("Hello");
      expect(decoded.submitTranscript?.endedAt).toBe(endedAt);
    });

    it("should throw error when API returns error response", async () => {
      const transcript = [
        {
          speaker: "USER" as const,
          content: "Test",
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(404, "Interview not found"),
      );

      await expect(
        apiClient.submitTranscript(
          "interview-123",
          transcript,
          "2024-01-01T00:00:01Z",
        ),
      ).rejects.toThrow("API Error (404): Interview not found");
    });
  });

  describe("getContext", () => {
    it("should send POST request and return context", async () => {
      const interviewId = "interview-123";
      const mockContext = {
        jobDescription: "Software Engineer at Acme Corp",
        resume: "5 years of experience in TypeScript",
        persona: "Senior Technical Interviewer",
      };

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse({
          getContext: mockContext,
        }),
      );

      const result = await apiClient.getContext(interviewId);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/api/worker",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-protobuf",
            Authorization: `Bearer ${mockWorkerSecret}`,
          },
        }),
      );

      expect(result).toEqual(mockContext);
    });

    it("should return context with persona field", async () => {
      const mockContext = {
        jobDescription: "Frontend Developer",
        resume: "React expert",
        persona: "HR Manager",
      };

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse({
          getContext: mockContext,
        }),
      );

      const result = await apiClient.getContext("interview-123");

      expect(result.persona).toBe("HR Manager");
      expect(result.jobDescription).toBe("Frontend Developer");
      expect(result.resume).toBe("React expert");
    });

    it("should include worker secret in request headers", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse({
          getContext: {
            jobDescription: "",
            resume: "",
            persona: "professional interviewer",
          },
        }),
      );

      await apiClient.getContext("interview-123");

      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      expect(callArgs?.headers["Authorization"]).toBe(
        `Bearer ${mockWorkerSecret}`,
      );
    });

    it("should throw error when API returns error response", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(404, "Interview not found"),
      );

      await expect(apiClient.getContext("interview-123")).rejects.toThrow(
        "API Error (404): Interview not found",
      );
    });
  });

  describe("submitFeedback", () => {
    it("should send POST request with feedback data", async () => {
      const interviewId = "interview-123";
      const feedback = {
        summary: "Good interview",
        strengths: "Strong communication",
        contentAndStructure: "Well organized",
        communicationAndDelivery: "Clear and concise",
        presentation: "Professional",
      };

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse({
          submitFeedback: { success: true },
        }),
      );

      await apiClient.submitFeedback(interviewId, feedback);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify the request body contains feedback
      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      const requestBuffer = callArgs?.body as ArrayBuffer;
      const decoded = preppal.WorkerApiRequest.decode(
        new Uint8Array(requestBuffer),
      );

      expect(decoded.submitFeedback?.interviewId).toBe(interviewId);
      expect(decoded.submitFeedback?.summary).toBe(feedback.summary);
      expect(decoded.submitFeedback?.strengths).toBe(feedback.strengths);
    });

    it("should throw error when API returns error response", async () => {
      const feedback = {
        summary: "Good",
        strengths: "Strong",
        contentAndStructure: "Organized",
        communicationAndDelivery: "Clear",
        presentation: "Professional",
      };

      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(404, "Interview not found"),
      );

      await expect(
        apiClient.submitFeedback("interview-123", feedback),
      ).rejects.toThrow("API Error (404): Interview not found");
    });
  });
});
