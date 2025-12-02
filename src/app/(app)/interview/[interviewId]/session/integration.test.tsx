import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionContent } from "./SessionContent";

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock tRPC
const mockGetByIdQuery = vi.fn();
const mockGenerateWorkerTokenMutation = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      getById: {
        useQuery: (params: any) => mockGetByIdQuery(params),
      },
      generateWorkerToken: {
        useMutation: () => mockGenerateWorkerTokenMutation(),
      },
    },
  },
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
    readyState: WebSocket.CONNECTING as number,
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

describe("Integration Test: Cloudflare Worker Connection", () => {
  const mockInterviewId = "interview-123";
  const mockToken = "mock-jwt-token";

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketInstances = [];
    mockWebSocketSendCalls = [];

    // Setup default mock responses
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
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
    // Setup token generation to return a mock token
    const mockMutate = vi.fn((params) => {
      // Simulate successful token generation by calling the onSuccess callback directly
      const callbacks = Array.from(mockGenerateWorkerTokenMutation.mock.calls).pop()?.[1];
      if (callbacks && callbacks.onSuccess) {
        callbacks.onSuccess({ token: mockToken });
      }
    });

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      isSuccess: true,
      isError: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for component to render and initiate token generation
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    // Wait for WebSocket to be created with correct URL
    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalledTimes(1);
    });

    const expectedUrl = `http://localhost:8787/${mockInterviewId}?token=${encodeURIComponent(mockToken)}`;
    expect(MockWebSocket).toHaveBeenCalledWith(expectedUrl);

    // Wait for WebSocket to connect
    await waitFor(() => {
      expect(mockWebSocketInstances[0].readyState).toBe(WebSocket.OPEN);
    });
  });

  it("should handle authentication errors gracefully", async () => {
    // Setup token generation to fail
    const mockMutate = vi.fn((params, callbacks) => {
      if (callbacks && callbacks.onError) {
        callbacks.onError(new Error("Authentication failed"));
      }
    });

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for the error to be handled
    await waitFor(() => {
      expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
    });
  });

  it("should handle WebSocket connection errors gracefully", async () => {
    // Setup successful token generation
    const mockMutate = vi.fn((params, callbacks) => {
      if (callbacks && callbacks.onSuccess) {
        callbacks.onSuccess({ token: mockToken });
      }
    });

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for WebSocket to be created
    await waitFor(() => {
      expect(MockWebSocket).toHaveBeenCalledTimes(1);
    });

    // Simulate connection error
    await waitFor(() => {
      expect(mockWebSocketInstances[0]).toBeDefined();
    });

    act(() => {
      if (mockWebSocketInstances[0].onerror) {
        mockWebSocketInstances[0].onerror();
      }
    });

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
    });
  });
});
