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
        text: vi.fn().mockResolvedValue(""),
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
            interviewId,
            status,
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
        text: vi.fn().mockResolvedValue(""),
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
        text: vi.fn().mockResolvedValue("Database connection failed"),
      });

      await expect(
        apiClient.updateStatus("interview-123", "IN_PROGRESS"),
      ).rejects.toThrow("Failed to update status: 500 Internal Server Error - Database connection failed");
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
        text: vi.fn().mockResolvedValue(""),
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
            interviewId,
            transcript,
            endedAt,
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
        text: vi.fn().mockResolvedValue(""),
      });

      await apiClient.submitTranscript(interviewId, transcript, endedAt);

      const callArgs = mockFetch.mock.calls?.[0]?.[1]; // Added optional chaining
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
      ).rejects.toThrow("Failed to submit transcript: 404 Not Found - Interview not found");
    });
  });
});
