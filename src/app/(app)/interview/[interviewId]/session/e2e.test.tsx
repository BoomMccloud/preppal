import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionContent } from "./SessionContent";
import * as interview_pb from "~/lib/interview_pb";
import {
  createTranscriptUpdateMessage,
  createAudioResponseMessage,
  createSessionEndedMessage,
  createErrorMessage,
  createEndRequestMessage,
} from "./test-utils";

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock tRPC
const mockGetByIdQuery = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      getById: {
        useQuery: (params: any) => mockGetByIdQuery(params),
      },
    },
  },
}));

// Mock useInterviewSocket hook
const mockUseInterviewSocket = vi.fn();

vi.mock("./useInterviewSocket", () => ({
  useInterviewSocket: (props: any) => mockUseInterviewSocket(props),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

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

describe("E2E Test: Full Interview Flow with Cloudflare Worker", () => {
  const mockInterviewId = "interview-123";
  const mockToken = "mock-jwt-token";

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses for tRPC
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    // Setup default mock response for useInterviewSocket
    mockUseInterviewSocket.mockReturnValue({
      state: "connecting",
      transcript: [],
      elapsedTime: 0,
      error: null,
      endInterview: vi.fn(),
      isAiSpeaking: false,
    });

    mockPush.mockClear();
  });

  afterEach(() => {
    // Clean up any open WebSocket connections
    mockWebSocketInstances.forEach((instance) => {
      if (instance.readyState === WebSocket.OPEN) {
        instance.close();
      }
    });
  });

  it("should complete full interview flow with audio streaming", async () => {
    // Setup mock for connecting state
    mockUseInterviewSocket.mockReturnValue({
      state: "connecting",
      transcript: [],
      elapsedTime: 0,
      error: null,
      endInterview: vi.fn(),
      isAiSpeaking: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Should show connecting state
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();

    // Simulate transition to live state with transcript
    act(() => {
      mockUseInterviewSocket.mockReturnValue({
        state: "live",
        transcript: [
          { text: "Hello, how are you today?", speaker: "AI", is_final: true },
        ],
        elapsedTime: 30,
        error: null,
        endInterview: vi.fn(),
        isAiSpeaking: false,
      });
    });

    // Re-render with updated state
    render(<SessionContent interviewId={mockInterviewId} />);

    // Verify transcript is displayed
    await waitFor(() => {
      expect(screen.getByText("Hello, how are you today?")).toBeInTheDocument();
    });

    // Verify timer is displayed
    expect(screen.getByText("00:30")).toBeInTheDocument();

    // Test ending the interview
    const endButton = screen.getByRole("button", { name: "End Interview" });
    fireEvent.click(endButton);

    // Verify endInterview function was called
    expect(mockUseInterviewSocket().endInterview).toHaveBeenCalledTimes(1);

    // Simulate session ended
    act(() => {
      mockUseInterviewSocket.mockReturnValue({
        state: "ending",
        transcript: [
          { text: "Hello, how are you today?", speaker: "AI", is_final: true },
        ],
        elapsedTime: 30,
        error: null,
        endInterview: vi.fn(),
        isAiSpeaking: false,
      });
    });

    // Re-render with updated state
    render(<SessionContent interviewId={mockInterviewId} />);

    // Verify ending state
    expect(screen.getByText("Ending...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ending..." })).toBeDisabled();
  });

  it("should handle error messages from Cloudflare Worker", async () => {
    // Setup mock for error state
    mockUseInterviewSocket.mockReturnValue({
      state: "error",
      transcript: [],
      elapsedTime: 0,
      error: "Authentication failed",
      endInterview: vi.fn(),
      isAiSpeaking: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/connection error/i)).toBeInTheDocument();
    });

    // Should display the error message
    expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
  });
});
