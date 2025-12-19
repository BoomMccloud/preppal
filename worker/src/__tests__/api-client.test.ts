// ABOUTME: Tests for protobuf-based API client that communicates with Next.js backend
// ABOUTME: Validates binary protobuf encoding/decoding and proper authentication

import { describe, it, expect, beforeEach, vi } from "vitest";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import { ApiClient } from "../api-client";
import {
  WorkerApiRequestSchema,
  WorkerApiResponseSchema,
  GetContextResponseSchema,
  UpdateStatusResponseSchema,
  SubmitTranscriptResponseSchema,
  SubmitFeedbackResponseSchema,
  ApiErrorSchema,
  InterviewStatus,
} from "../lib/proto/interview_pb.js";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * Helper to create a mock protobuf response
 */
function createMockProtobufResponse(
  responseCase: "getContext" | "updateStatus" | "submitTranscript" | "submitFeedback" | "error",
  value: unknown,
): {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
} {
  let response;
  switch (responseCase) {
    case "getContext":
      response = create(WorkerApiResponseSchema, {
        response: {
          case: "getContext",
          value: create(GetContextResponseSchema, value as Record<string, unknown>),
        },
      });
      break;
    case "updateStatus":
      response = create(WorkerApiResponseSchema, {
        response: {
          case: "updateStatus",
          value: create(UpdateStatusResponseSchema, value as Record<string, unknown>),
        },
      });
      break;
    case "submitTranscript":
      response = create(WorkerApiResponseSchema, {
        response: {
          case: "submitTranscript",
          value: create(SubmitTranscriptResponseSchema, value as Record<string, unknown>),
        },
      });
      break;
    case "submitFeedback":
      response = create(WorkerApiResponseSchema, {
        response: {
          case: "submitFeedback",
          value: create(SubmitFeedbackResponseSchema, value as Record<string, unknown>),
        },
      });
      break;
    case "error":
      response = create(WorkerApiResponseSchema, {
        response: {
          case: "error",
          value: create(ApiErrorSchema, value as Record<string, unknown>),
        },
      });
      break;
  }

  const encoded = toBinary(WorkerApiResponseSchema, response);
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
  return createMockProtobufResponse("error", { code, message });
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
        createMockProtobufResponse("updateStatus", { success: true }),
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
        createMockProtobufResponse("updateStatus", { success: true }),
      );

      await apiClient.updateStatus(interviewId, status);

      // Verify the body can be decoded as protobuf
      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      const requestBuffer = callArgs?.body as ArrayBuffer;
      const decoded = fromBinary(
        WorkerApiRequestSchema,
        new Uint8Array(requestBuffer),
      );
      expect(decoded.request.case).toBe("updateStatus");
      if (decoded.request.case === "updateStatus") {
        expect(decoded.request.value.interviewId).toBe(interviewId);
        expect(decoded.request.value.status).toBe(InterviewStatus.COMPLETED);
      }
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
    it("should send POST request with transcript blob", async () => {
      const interviewId = "interview-123";
      const transcript = new Uint8Array([1, 2, 3, 4, 5]); // Serialized protobuf transcript
      const endedAt = "2024-01-01T00:00:02Z";

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse("submitTranscript", { success: true }),
      );

      await apiClient.submitTranscript(interviewId, transcript, endedAt);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify the request body contains transcript
      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      const requestBuffer = callArgs?.body as ArrayBuffer;
      const decoded = fromBinary(
        WorkerApiRequestSchema,
        new Uint8Array(requestBuffer),
      );

      expect(decoded.request.case).toBe("submitTranscript");
      if (decoded.request.case === "submitTranscript") {
        expect(decoded.request.value.interviewId).toBe(interviewId);
        expect(decoded.request.value.transcript).toEqual(transcript);
        expect(decoded.request.value.endedAt).toBe(endedAt);
      }
    });

    it("should throw error when API returns error response", async () => {
      const transcript = new Uint8Array([1, 2, 3]);

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
        durationMs: 1800000,
      };

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse("getContext", mockContext),
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
        durationMs: 1800000,
      };

      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse("getContext", mockContext),
      );

      const result = await apiClient.getContext("interview-123");

      expect(result.persona).toBe("HR Manager");
      expect(result.jobDescription).toBe("Frontend Developer");
      expect(result.resume).toBe("React expert");
    });

    it("should include worker secret in request headers", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockProtobufResponse("getContext", {
          jobDescription: "",
          resume: "",
          persona: "professional interviewer",
          durationMs: 1800000,
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
        createMockProtobufResponse("submitFeedback", { success: true }),
      );

      await apiClient.submitFeedback(interviewId, feedback);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify the request body contains feedback
      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      const requestBuffer = callArgs?.body as ArrayBuffer;
      const decoded = fromBinary(
        WorkerApiRequestSchema,
        new Uint8Array(requestBuffer),
      );

      expect(decoded.request.case).toBe("submitFeedback");
      if (decoded.request.case === "submitFeedback") {
        expect(decoded.request.value.interviewId).toBe(interviewId);
        expect(decoded.request.value.summary).toBe(feedback.summary);
        expect(decoded.request.value.strengths).toBe(feedback.strengths);
      }
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
