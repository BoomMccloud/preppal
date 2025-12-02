import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as interview_pb from "~/lib/interview_pb";
import {
  createTranscriptUpdateMessage,
  createAudioResponseMessage,
  createSessionEndedMessage,
  createErrorMessage,
  createEndRequestMessage,
} from "./test-utils";

// Mock environment
process.env.NEXT_PUBLIC_WORKER_URL = "http://localhost:8787";

// Store references to WebSocket instances for testing
let mockWebSocketInstances: any[] = [];
let mockWebSocketSendCalls: any[] = [];

// Mock WebSocket constructor
const MockWebSocket = vi.fn((url: string) => {
  const instance = {
    url,
    readyState: WebSocket.CONNECTING,
    onopen: null as (() => void) | null,
    onmessage: null as ((event: any) => void) | null,
    onerror: null as (() => void) | null,
    onclose: null as (() => void) | null,
    send: vi.fn((data: any) => {
      mockWebSocketSendCalls.push({ instance, data });
    }),
    close: vi.fn(() => {
      instance.readyState = WebSocket.CLOSED;
      if (instance.onclose) instance.onclose();
    }),
  };

  mockWebSocketInstances.push(instance);

  // Simulate connection opening after a short delay
  setTimeout(() => {
    instance.readyState = WebSocket.OPEN;
    if (instance.onopen) instance.onopen();
  }, 10);

  return instance;
});

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

// Mock tRPC
const mockApi = {
  interview: {
    generateWorkerToken: {
      useMutation: vi.fn(),
    },
  },
};

vi.mock("~/trpc/react", () => ({
  api: mockApi,
}));

// Mock Audio APIs
const mockAudioContext = {
  audioWorklet: {
    addModule: vi.fn().mockResolvedValue(undefined),
  },
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  close: vi.fn(),
  sampleRate: 44100,
};

const mockAudioWorkletNode = {
  port: {
    onmessage: null as ((event: any) => void) | null,
    postMessage: vi.fn(),
  },
  connect: vi.fn(),
};

const mockMediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: vi.fn().mockReturnValue([]),
  }),
};

// Apply mocks
Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

Object.defineProperty(window, "AudioWorkletNode", {
  writable: true,
  value: vi.fn(() => mockAudioWorkletNode),
});

Object.defineProperty(navigator, "mediaDevices", {
  writable: true,
  value: mockMediaDevices,
});

// Import the hook after mocks are set up
const { useInterviewSocket } = await import("./useInterviewSocket");

describe("useInterviewSocket Integration Test", () => {
  const mockInterviewId = "interview-123";
  const mockToken = "mock-jwt-token";
  const mockOnSessionEnded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketInstances = [];
    mockWebSocketSendCalls = [];

    // Setup default mock response for generateWorkerToken
    const mockMutate = vi.fn((params, callbacks) => {
      if (callbacks && callbacks.onSuccess) {
        callbacks.onSuccess({ token: mockToken });
      }
    });

    mockApi.interview.generateWorkerToken.useMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  });

  afterEach(() => {
    // Clean up any open WebSocket connections
    mockWebSocketInstances.forEach((instance) => {
      if (instance.readyState === WebSocket.OPEN) {
        instance.close();
      }
    });
  });

  it("should authenticate with Cloudflare Worker and establish WebSocket connection", async () => {
    const { result } = renderHook(() =>
      useInterviewSocket({
        interviewId: mockInterviewId,
        onSessionEnded: mockOnSessionEnded,
      }),
    );

    // Initial state should be initializing
    expect(result.current.state).toBe("initializing");

    // Wait for token generation and WebSocket connection
    await act(async () => {
      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Should have called generateWorkerToken
    expect(
      mockApi.interview.generateWorkerToken.useMutation().mutate,
    ).toHaveBeenCalledWith({ interviewId: mockInterviewId });

    // Should have created WebSocket with correct URL
    expect(MockWebSocket).toHaveBeenCalledWith(
      `http://localhost:8787/${mockInterviewId}?token=${encodeURIComponent(mockToken)}`,
    );

    // Wait for connection to open
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Should be in live state after connection
    expect(result.current.state).toBe("live");
  });

  it("should handle authentication errors gracefully", async () => {
    // Setup token generation to fail
    const mockMutate = vi.fn((params, callbacks) => {
      if (callbacks && callbacks.onError) {
        callbacks.onError(new Error("Authentication failed"));
      }
    });

    mockApi.interview.generateWorkerToken.useMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useInterviewSocket({
        interviewId: mockInterviewId,
        onSessionEnded: mockOnSessionEnded,
      }),
    );

    // Wait for error
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Should be in error state
    expect(result.current.state).toBe("error");
    expect(result.current.error).toBe("Authentication failed");
  });

  it("should handle WebSocket connection errors gracefully", async () => {
    // Override the WebSocket mock to simulate connection error
    const MockWebSocketWithError = vi.fn((url: string) => {
      const instance = {
        url,
        readyState: WebSocket.CONNECTING,
        onopen: null as (() => void) | null,
        onmessage: null as ((event: any) => void) | null,
        onerror: null as (() => void) | null,
        onclose: null as (() => void) | null,
        send: vi.fn(),
        close: vi.fn(() => {
          instance.readyState = WebSocket.CLOSED;
          if (instance.onclose) instance.onclose();
        }),
      };

      mockWebSocketInstances.push(instance);

      // Simulate connection error after a short delay
      setTimeout(() => {
        if (instance.onerror) instance.onerror();
      }, 10);

      return instance;
    });

    global.WebSocket = MockWebSocketWithError as any;

    const { result } = renderHook(() =>
      useInterviewSocket({
        interviewId: mockInterviewId,
        onSessionEnded: mockOnSessionEnded,
      }),
    );

    // Wait for connection attempt and error
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Should be in error state
    expect(result.current.state).toBe("error");
    expect(result.current.error).toBe(
      "Connection lost. Please return to the dashboard.",
    );
  });
});
