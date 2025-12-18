// ABOUTME: Tests for Next.js API client that communicates with backend tRPC endpoints
// ABOUTME: Validates status updates and transcript submission with proper authentication

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiClient } from "../api-client";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ApiClient", () => {
  let apiClient: ApiClient;
  const mockApiUrl = "https://api.example.com";
  const mockWorkerSecret = "test-worker-secret";

  beforeEach(() => {
    apiClient = new ApiClient(mockApiUrl, mockWorkerSecret);
    mockFetch.mockClear();
  });

  describe("updateStatus", () => {
    it("should send POST request to update interview status", async () => {
      const interviewId = "interview-123";
      const status = "IN_PROGRESS";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Map([["content-type", "application/json"]]),
        text: vi.fn().mockResolvedValue(JSON.stringify({ result: { data: {} } })),
      });

      await apiClient.updateStatus(interviewId, status);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/api/trpc/interview.updateStatus",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockWorkerSecret}`,
          },
          body: JSON.stringify({
            json: { interviewId, status },
          }),
        },
      );
    });

    it("should include worker secret in request headers", async () => {
      const interviewId = "interview-123";
      const status = "COMPLETED";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Map([["content-type", "application/json"]]),
        text: vi.fn().mockResolvedValue(JSON.stringify({ result: { data: {} } })),
      });

      await apiClient.updateStatus(interviewId, status);

      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      expect(callArgs?.headers["Authorization"]).toBe(
        `Bearer ${mockWorkerSecret}`,
      );
    });

    it("should throw error when API request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Map([["content-type", "application/json"]]),
        text: vi.fn().mockResolvedValue("Database connection failed"),
      });

      await expect(
        apiClient.updateStatus("interview-123", "IN_PROGRESS"),
      ).rejects.toThrow(
        "HTTP error calling updateStatus: 500 Internal Server Error - Database connection failed",
      );
    });
  });

  describe("submitTranscript", () => {
    it("should send POST request to submit transcript", async () => {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ result: { data: {} } }),
      });

      await apiClient.submitTranscript(interviewId, transcript, endedAt);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/api/trpc/interview.submitTranscript",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockWorkerSecret}`,
          },
          body: JSON.stringify({
            json: { interviewId, transcript, endedAt },
          }),
        },
      );
    });

    it("should include worker secret in request headers", async () => {
      const interviewId = "interview-123";
      const transcript = [
        {
          speaker: "USER" as const,
          content: "Test",
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];
      const endedAt = "2024-01-01T00:00:01Z";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn().mockResolvedValue({ result: { data: {} } }),
      });

      await apiClient.submitTranscript(interviewId, transcript, endedAt);

      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      expect(callArgs?.headers["Authorization"]).toBe(
        `Bearer ${mockWorkerSecret}`,
      );
    });

    it("should throw error when API request fails", async () => {
      const transcript = [
        {
          speaker: "USER" as const,
          content: "Test",
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];
      const endedAt = "2024-01-01T00:00:01Z";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: vi.fn().mockResolvedValue("Interview not found"),
      });

      await expect(
        apiClient.submitTranscript("interview-123", transcript, endedAt),
      ).rejects.toThrow(
        "HTTP error calling submitTranscript: 404 Not Found - Interview not found",
      );
    });
  });

  describe("getContext", () => {
    it("should send GET request to fetch interview context", async () => {
      const interviewId = "interview-123";
      const mockContext = {
        jobDescription: "Software Engineer at Acme Corp",
        resume: "5 years of experience in TypeScript",
        persona: "Senior Technical Interviewer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([
          {
            result: {
              data: mockContext,
            },
          },
        ]),
      });

      const result = await apiClient.getContext(interviewId);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://api.example.com/api/trpc/interview.getContext",
        ),
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockWorkerSecret}`,
          },
        }),
      );
    });

    it("should return context with persona field", async () => {
      const interviewId = "interview-123";
      const mockContext = {
        jobDescription: "Frontend Developer",
        resume: "React expert",
        persona: "HR Manager",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([
          {
            result: {
              data: mockContext,
            },
          },
        ]),
      });

      const result = await apiClient.getContext(interviewId);

      expect(result).toEqual(mockContext);
      expect(result.persona).toBe("HR Manager");
      expect(result.jobDescription).toBe("Frontend Developer");
      expect(result.resume).toBe("React expert");
    });

    it("should include worker secret in request headers", async () => {
      const mockContext = {
        jobDescription: "",
        resume: "",
        persona: "professional interviewer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([
          {
            result: {
              data: mockContext,
            },
          },
        ]),
      });

      await apiClient.getContext("interview-123");

      const callArgs = mockFetch.mock.calls?.[0]?.[1];
      expect(callArgs?.headers["Authorization"]).toBe(
        `Bearer ${mockWorkerSecret}`,
      );
    });

    it("should throw error when API request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue("Interview not found"),
      });

      await expect(apiClient.getContext("interview-123")).rejects.toThrow(
        "HTTP 404: Interview not found",
      );
    });

    it("should throw error when tRPC returns error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([
          {
            error: {
              json: {
                message: "Interview not found",
              },
            },
          },
        ]),
      });

      await expect(apiClient.getContext("interview-123")).rejects.toThrow(
        "tRPC error: Interview not found",
      );
    });
  });
});
