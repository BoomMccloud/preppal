// ABOUTME: Tests for block-based interview support in the worker
// ABOUTME: Validates block_number handling in API requests and URL parsing

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  GetContextRequestSchema,
  SubmitTranscriptRequestSchema,
  WorkerApiRequestSchema,
  WorkerApiResponseSchema,
  GetContextResponseSchema,
  SubmitTranscriptResponseSchema,
} from "../lib/proto/interview_pb.js";

describe("Block Support - Protobuf Messages", () => {
  describe("GetContextRequest with block_number", () => {
    it("should encode request without block_number (backward compatible)", () => {
      const request = create(GetContextRequestSchema, {
        interviewId: "interview-123",
      });

      const encoded = toBinary(GetContextRequestSchema, request);
      const decoded = fromBinary(GetContextRequestSchema, encoded);

      expect(decoded.interviewId).toBe("interview-123");
      expect(decoded.blockNumber).toBeUndefined();
    });

    it("should encode request with block_number", () => {
      const request = create(GetContextRequestSchema, {
        interviewId: "interview-123",
        blockNumber: 1,
      });

      const encoded = toBinary(GetContextRequestSchema, request);
      const decoded = fromBinary(GetContextRequestSchema, encoded);

      expect(decoded.interviewId).toBe("interview-123");
      expect(decoded.blockNumber).toBe(1);
    });

    it("should encode request with block_number = 2", () => {
      const request = create(GetContextRequestSchema, {
        interviewId: "interview-456",
        blockNumber: 2,
      });

      const encoded = toBinary(GetContextRequestSchema, request);
      const decoded = fromBinary(GetContextRequestSchema, encoded);

      expect(decoded.interviewId).toBe("interview-456");
      expect(decoded.blockNumber).toBe(2);
    });
  });

  describe("SubmitTranscriptRequest with block_number", () => {
    it("should encode request without block_number (backward compatible)", () => {
      const transcript = new Uint8Array([1, 2, 3, 4, 5]);
      const request = create(SubmitTranscriptRequestSchema, {
        interviewId: "interview-123",
        transcript,
        endedAt: "2025-01-15T10:30:00Z",
      });

      const encoded = toBinary(SubmitTranscriptRequestSchema, request);
      const decoded = fromBinary(SubmitTranscriptRequestSchema, encoded);

      expect(decoded.interviewId).toBe("interview-123");
      expect(decoded.transcript).toEqual(transcript);
      expect(decoded.endedAt).toBe("2025-01-15T10:30:00Z");
      expect(decoded.blockNumber).toBeUndefined();
    });

    it("should encode request with block_number", () => {
      const transcript = new Uint8Array([1, 2, 3, 4, 5]);
      const request = create(SubmitTranscriptRequestSchema, {
        interviewId: "interview-123",
        transcript,
        endedAt: "2025-01-15T10:30:00Z",
        blockNumber: 1,
      });

      const encoded = toBinary(SubmitTranscriptRequestSchema, request);
      const decoded = fromBinary(SubmitTranscriptRequestSchema, encoded);

      expect(decoded.interviewId).toBe("interview-123");
      expect(decoded.transcript).toEqual(transcript);
      expect(decoded.endedAt).toBe("2025-01-15T10:30:00Z");
      expect(decoded.blockNumber).toBe(1);
    });
  });

  describe("GetContextResponse with block fields", () => {
    it("should include systemPrompt and language for block-based interviews", () => {
      const response = create(GetContextResponseSchema, {
        jobDescription: "Software Engineer",
        resume: "10 years experience",
        persona: "Senior interviewer",
        durationMs: 600000,
        systemPrompt: "You are a professional interviewer...",
        language: "zh",
      });

      const encoded = toBinary(GetContextResponseSchema, response);
      const decoded = fromBinary(GetContextResponseSchema, encoded);

      expect(decoded.jobDescription).toBe("Software Engineer");
      expect(decoded.resume).toBe("10 years experience");
      expect(decoded.persona).toBe("Senior interviewer");
      expect(decoded.durationMs).toBe(600000);
      expect(decoded.systemPrompt).toBe(
        "You are a professional interviewer...",
      );
      expect(decoded.language).toBe("zh");
    });

    it("should work without systemPrompt and language (standard interview)", () => {
      const response = create(GetContextResponseSchema, {
        jobDescription: "Software Engineer",
        resume: "10 years experience",
        persona: "Senior interviewer",
        durationMs: 1800000,
      });

      const encoded = toBinary(GetContextResponseSchema, response);
      const decoded = fromBinary(GetContextResponseSchema, encoded);

      expect(decoded.jobDescription).toBe("Software Engineer");
      // Optional proto fields return undefined when not set
      expect(decoded.systemPrompt).toBeUndefined();
      expect(decoded.language).toBeUndefined();
    });
  });
});

describe("Block Support - URL Parsing", () => {
  /**
   * Parses block number from WebSocket URL query params.
   * This is the function we'll implement in the worker.
   */
  function parseBlockNumber(url: URL): number | undefined {
    const blockParam = url.searchParams.get("block");
    if (!blockParam) return undefined;
    const parsed = parseInt(blockParam, 10);
    if (isNaN(parsed) || parsed < 1) return undefined;
    return parsed;
  }

  it("should return undefined when block param is missing", () => {
    const url = new URL("wss://worker.example.com/interview-123?token=abc");
    expect(parseBlockNumber(url)).toBeUndefined();
  });

  it("should parse block=1 correctly", () => {
    const url = new URL(
      "wss://worker.example.com/interview-123?token=abc&block=1",
    );
    expect(parseBlockNumber(url)).toBe(1);
  });

  it("should parse block=2 correctly", () => {
    const url = new URL(
      "wss://worker.example.com/interview-123?token=abc&block=2",
    );
    expect(parseBlockNumber(url)).toBe(2);
  });

  it("should return undefined for invalid block values", () => {
    const invalidUrls = [
      "wss://worker.example.com/interview-123?token=abc&block=",
      "wss://worker.example.com/interview-123?token=abc&block=abc",
      "wss://worker.example.com/interview-123?token=abc&block=0",
      "wss://worker.example.com/interview-123?token=abc&block=-1",
    ];

    for (const urlStr of invalidUrls) {
      const url = new URL(urlStr);
      expect(parseBlockNumber(url)).toBeUndefined();
    }
  });

  it("should parse decimal block values as integers (parseInt behavior)", () => {
    // parseInt("1.5", 10) returns 1 - this is acceptable behavior
    const url = new URL(
      "wss://worker.example.com/interview-123?token=abc&block=1.5",
    );
    expect(parseBlockNumber(url)).toBe(1);
  });

  it("should handle block param with other query params", () => {
    const url = new URL(
      "wss://worker.example.com/interview-123?token=abc123&block=2&debug=true",
    );
    expect(parseBlockNumber(url)).toBe(2);
  });
});

describe("Block Support - WorkerApiRequest", () => {
  it("should encode getContext request with block_number in wrapper", () => {
    const request = create(WorkerApiRequestSchema, {
      request: {
        case: "getContext",
        value: create(GetContextRequestSchema, {
          interviewId: "interview-123",
          blockNumber: 1,
        }),
      },
    });

    const encoded = toBinary(WorkerApiRequestSchema, request);
    const decoded = fromBinary(WorkerApiRequestSchema, encoded);

    expect(decoded.request.case).toBe("getContext");
    if (decoded.request.case === "getContext") {
      expect(decoded.request.value.interviewId).toBe("interview-123");
      expect(decoded.request.value.blockNumber).toBe(1);
    }
  });

  it("should encode submitTranscript request with block_number in wrapper", () => {
    const transcript = new Uint8Array([1, 2, 3]);
    const request = create(WorkerApiRequestSchema, {
      request: {
        case: "submitTranscript",
        value: create(SubmitTranscriptRequestSchema, {
          interviewId: "interview-123",
          transcript,
          endedAt: "2025-01-15T10:30:00Z",
          blockNumber: 2,
        }),
      },
    });

    const encoded = toBinary(WorkerApiRequestSchema, request);
    const decoded = fromBinary(WorkerApiRequestSchema, encoded);

    expect(decoded.request.case).toBe("submitTranscript");
    if (decoded.request.case === "submitTranscript") {
      expect(decoded.request.value.interviewId).toBe("interview-123");
      expect(decoded.request.value.blockNumber).toBe(2);
    }
  });
});

/**
 * Tests for ApiClient with block number support.
 * These tests verify the API client correctly includes blockNumber in requests.
 */
describe("Block Support - ApiClient", () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;
  let capturedRequest: { body: Uint8Array } | null = null;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    capturedRequest = null;

    mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      // Capture the request body for verification
      if (init?.body) {
        const buffer = init.body as ArrayBuffer;
        capturedRequest = { body: new Uint8Array(buffer) };
      }

      // Create mock response based on request type
      const requestData = capturedRequest
        ? fromBinary(WorkerApiRequestSchema, capturedRequest.body)
        : null;

      let responsePayload;
      if (requestData?.request.case === "getContext") {
        responsePayload = create(WorkerApiResponseSchema, {
          response: {
            case: "getContext",
            value: create(GetContextResponseSchema, {
              jobDescription: "Test Job",
              resume: "Test Resume",
              persona: "Test Persona",
              durationMs: 600000,
              systemPrompt: "Block system prompt",
              language: "zh",
            }),
          },
        });
      } else if (requestData?.request.case === "submitTranscript") {
        responsePayload = create(WorkerApiResponseSchema, {
          response: {
            case: "submitTranscript",
            value: create(SubmitTranscriptResponseSchema, { success: true }),
          },
        });
      } else {
        throw new Error("Unknown request type");
      }

      const responseBuffer = toBinary(WorkerApiResponseSchema, responsePayload);
      return new Response(responseBuffer, {
        status: 200,
        headers: { "Content-Type": "application/x-protobuf" },
      });
    });

    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("getContext with blockNumber", () => {
    it("should work without blockNumber (backward compatible)", async () => {
      const { ApiClient } = await import("../api-client.js");
      const client = new ApiClient("https://api.example.com", "test-secret");

      await client.getContext("interview-123");

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(capturedRequest).not.toBeNull();

      const decoded = fromBinary(WorkerApiRequestSchema, capturedRequest!.body);
      expect(decoded.request.case).toBe("getContext");
      if (decoded.request.case === "getContext") {
        expect(decoded.request.value.interviewId).toBe("interview-123");
        expect(decoded.request.value.blockNumber).toBeUndefined();
      }
    });

    it("should include blockNumber=1 in getContext request", async () => {
      const { ApiClient } = await import("../api-client.js");
      const client = new ApiClient("https://api.example.com", "test-secret");

      // Call getContext with blockNumber - THIS WILL FAIL until implemented
      await client.getContext("interview-123", 1);

      expect(mockFetch).toHaveBeenCalledOnce();
      const decoded = fromBinary(WorkerApiRequestSchema, capturedRequest!.body);
      expect(decoded.request.case).toBe("getContext");
      if (decoded.request.case === "getContext") {
        expect(decoded.request.value.interviewId).toBe("interview-123");
        expect(decoded.request.value.blockNumber).toBe(1);
      }
    });

    it("should include blockNumber=2 in getContext request", async () => {
      const { ApiClient } = await import("../api-client.js");
      const client = new ApiClient("https://api.example.com", "test-secret");

      await client.getContext("interview-456", 2);

      const decoded = fromBinary(WorkerApiRequestSchema, capturedRequest!.body);
      if (decoded.request.case === "getContext") {
        expect(decoded.request.value.blockNumber).toBe(2);
      }
    });

    it("should return systemPrompt and language for block-based context", async () => {
      const { ApiClient } = await import("../api-client.js");
      const client = new ApiClient("https://api.example.com", "test-secret");

      // After implementation, getContext should return systemPrompt and language
      const context = await client.getContext("interview-123", 1);

      expect(context.jobDescription).toBe("Test Job");
      expect(context.persona).toBe("Test Persona");
      expect(context.durationMs).toBe(600000);
      // These fields should be returned for block-based interviews
      expect(context.systemPrompt).toBe("Block system prompt");
      expect(context.language).toBe("zh");
    });
  });

  describe("submitTranscript with blockNumber", () => {
    it("should work without blockNumber (backward compatible)", async () => {
      const { ApiClient } = await import("../api-client.js");
      const client = new ApiClient("https://api.example.com", "test-secret");

      const transcript = new Uint8Array([1, 2, 3, 4, 5]);
      await client.submitTranscript(
        "interview-123",
        transcript,
        "2025-01-15T10:30:00Z",
      );

      expect(mockFetch).toHaveBeenCalledOnce();
      const decoded = fromBinary(WorkerApiRequestSchema, capturedRequest!.body);
      expect(decoded.request.case).toBe("submitTranscript");
      if (decoded.request.case === "submitTranscript") {
        expect(decoded.request.value.interviewId).toBe("interview-123");
        expect(decoded.request.value.blockNumber).toBeUndefined();
      }
    });

    it("should include blockNumber=1 in submitTranscript request", async () => {
      const { ApiClient } = await import("../api-client.js");
      const client = new ApiClient("https://api.example.com", "test-secret");

      const transcript = new Uint8Array([1, 2, 3, 4, 5]);
      // Call with blockNumber - THIS WILL FAIL until implemented
      await client.submitTranscript(
        "interview-123",
        transcript,
        "2025-01-15T10:30:00Z",
        1,
      );

      const decoded = fromBinary(WorkerApiRequestSchema, capturedRequest!.body);
      expect(decoded.request.case).toBe("submitTranscript");
      if (decoded.request.case === "submitTranscript") {
        expect(decoded.request.value.interviewId).toBe("interview-123");
        expect(decoded.request.value.blockNumber).toBe(1);
      }
    });

    it("should include blockNumber=2 in submitTranscript request", async () => {
      const { ApiClient } = await import("../api-client.js");
      const client = new ApiClient("https://api.example.com", "test-secret");

      const transcript = new Uint8Array([1, 2, 3]);
      await client.submitTranscript(
        "interview-456",
        transcript,
        "2025-01-15T11:00:00Z",
        2,
      );

      const decoded = fromBinary(WorkerApiRequestSchema, capturedRequest!.body);
      if (decoded.request.case === "submitTranscript") {
        expect(decoded.request.value.blockNumber).toBe(2);
      }
    });
  });
});

/**
 * Tests for InterviewLifecycleManager with block number support.
 * Verifies that blockNumber is passed through the lifecycle to API calls.
 */
describe("Block Support - InterviewLifecycleManager", () => {
  describe("initializeSession with blockNumber", () => {
    it("should pass blockNumber to getContext", async () => {
      // Mock API client
      const mockApiClient = {
        getContext: vi.fn().mockResolvedValue({
          jobDescription: "Test Job",
          resume: "Test Resume",
          persona: "Test Persona",
          durationMs: 600000,
          systemPrompt: "Block prompt",
          language: "zh",
        }),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        submitTranscript: vi.fn().mockResolvedValue(undefined),
        submitFeedback: vi.fn().mockResolvedValue(undefined),
      };

      const { InterviewLifecycleManager } = await import(
        "../services/interview-lifecycle-manager.js"
      );
      const manager = new InterviewLifecycleManager(
        mockApiClient,
        "test-gemini-key",
      );

      // Call initializeSession with blockNumber - THIS WILL FAIL until implemented
      await manager.initializeSession("interview-123", 1);

      // Verify getContext was called with blockNumber
      expect(mockApiClient.getContext).toHaveBeenCalledWith("interview-123", 1);
    });

    it("should work without blockNumber (backward compatible)", async () => {
      const mockApiClient = {
        getContext: vi.fn().mockResolvedValue({
          jobDescription: "Test Job",
          resume: "Test Resume",
          persona: "Test Persona",
          durationMs: 1800000,
        }),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        submitTranscript: vi.fn().mockResolvedValue(undefined),
        submitFeedback: vi.fn().mockResolvedValue(undefined),
      };

      const { InterviewLifecycleManager } = await import(
        "../services/interview-lifecycle-manager.js"
      );
      const manager = new InterviewLifecycleManager(
        mockApiClient,
        "test-gemini-key",
      );

      await manager.initializeSession("interview-123");

      // Verify getContext was called without blockNumber
      expect(mockApiClient.getContext).toHaveBeenCalledWith(
        "interview-123",
        undefined,
      );
    });
  });

  describe("finalizeSession with blockNumber", () => {
    it("should pass blockNumber to submitTranscript", async () => {
      const mockApiClient = {
        getContext: vi.fn().mockResolvedValue({
          jobDescription: "Test Job",
          resume: "Test Resume",
          persona: "Test Persona",
          durationMs: 600000,
        }),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        submitTranscript: vi.fn().mockResolvedValue(undefined),
        submitFeedback: vi.fn().mockResolvedValue(undefined),
      };

      const mockTranscriptManager = {
        serializeTranscript: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
        formatAsText: vi.fn().mockReturnValue("USER: Hello\nAI: Hi"),
        addUserTranscript: vi.fn(),
        addAITranscript: vi.fn(),
        markTurnComplete: vi.fn(),
        clear: vi.fn(),
      };

      const { InterviewLifecycleManager } = await import(
        "../services/interview-lifecycle-manager.js"
      );
      const manager = new InterviewLifecycleManager(
        mockApiClient,
        "test-gemini-key",
      );

      const context = {
        jobDescription: "Test Job",
        resume: "Test Resume",
        persona: "Test Persona",
        durationMs: 600000,
      };

      // Call finalizeSession with blockNumber - THIS WILL FAIL until implemented
      await manager.finalizeSession(
        "interview-123",
        mockTranscriptManager,
        context,
        1,
      );

      // Verify submitTranscript was called with blockNumber
      expect(mockApiClient.submitTranscript).toHaveBeenCalledWith(
        "interview-123",
        expect.any(Uint8Array),
        expect.any(String),
        1,
      );
    });

    it("should work without blockNumber (backward compatible)", async () => {
      const mockApiClient = {
        getContext: vi.fn().mockResolvedValue({
          jobDescription: "Test Job",
          resume: "Test Resume",
          persona: "Test Persona",
          durationMs: 1800000,
        }),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        submitTranscript: vi.fn().mockResolvedValue(undefined),
        submitFeedback: vi.fn().mockResolvedValue(undefined),
      };

      const mockTranscriptManager = {
        serializeTranscript: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
        formatAsText: vi.fn().mockReturnValue("USER: Hello\nAI: Hi"),
        addUserTranscript: vi.fn(),
        addAITranscript: vi.fn(),
        markTurnComplete: vi.fn(),
        clear: vi.fn(),
      };

      const { InterviewLifecycleManager } = await import(
        "../services/interview-lifecycle-manager.js"
      );
      const manager = new InterviewLifecycleManager(
        mockApiClient,
        "test-gemini-key",
      );

      const context = {
        jobDescription: "Test Job",
        resume: "Test Resume",
        persona: "Test Persona",
        durationMs: 1800000,
      };

      await manager.finalizeSession(
        "interview-123",
        mockTranscriptManager,
        context,
      );

      // Verify submitTranscript was called without blockNumber (4 args with undefined)
      expect(mockApiClient.submitTranscript).toHaveBeenCalledWith(
        "interview-123",
        expect.any(Uint8Array),
        expect.any(String),
        undefined,
      );
    });
  });
});
