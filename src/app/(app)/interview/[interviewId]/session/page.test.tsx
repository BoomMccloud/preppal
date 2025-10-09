import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionContent } from "./SessionContent";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send = vi.fn();
  close = vi.fn();
}

// Mock tRPC
const mockGetByIdQuery = vi.fn();
const mockGenerateWsTokenMutation = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      getById: {
        useQuery: (params: any) => mockGetByIdQuery(params),
      },
      generateWsToken: {
        useMutation: () => mockGenerateWsTokenMutation(),
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

describe("SessionContent", () => {
  const mockInterviewId = "interview-123";
  let mockWs: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup global WebSocket mock
    mockWs = new MockWebSocket("ws://localhost:3001");
    global.WebSocket = vi.fn(() => mockWs) as any;

    // Mock environment
    process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3001";
  });

  it("should render 'Connecting...' status initially", () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    mockGenerateWsTokenMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    });

    // Act
    render(<SessionContent interviewId={mockInterviewId} />);

    // Assert
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it("should redirect to dashboard if interview status is IN_PROGRESS", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "IN_PROGRESS",
      },
      isLoading: false,
    });

    // Act
    render(<SessionContent interviewId={mockInterviewId} />);

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("should redirect to dashboard if interview status is COMPLETED", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "COMPLETED",
      },
      isLoading: false,
    });

    // Act
    render(<SessionContent interviewId={mockInterviewId} />);

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("should send StartRequest when WebSocket connection opens", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    const mockMutate = vi.fn((params, options) => {
      options?.onSuccess?.({ token: "test-jwt-token" });
    });

    mockGenerateWsTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    // Act
    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for WebSocket to open
    await waitFor(() => {
      expect(mockWs.send).toHaveBeenCalled();
    });

    // Assert
    const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
    expect(sentMessage).toMatchObject({
      start_request: {
        auth_token: "test-jwt-token",
        interview_id: mockInterviewId,
      },
    });
  });

  it("should transition to 'live' state and start timer when StartResponse is received", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    const mockMutate = vi.fn((params, options) => {
      options?.onSuccess?.({ token: "test-jwt-token" });
    });

    mockGenerateWsTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    // Act
    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Simulate StartResponse
    const startResponse = {
      start_response: {
        session_id: "session-123",
      },
    };
    mockWs.onmessage?.(new MessageEvent("message", { data: JSON.stringify(startResponse) }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/00:00/)).toBeInTheDocument(); // Timer started at 00:00
    });
  });

  it("should update transcript when PartialTranscript messages are received", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    const mockMutate = vi.fn((params, options) => {
      options?.onSuccess?.({ token: "test-jwt-token" });
    });

    mockGenerateWsTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection and send StartResponse
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    const startResponse = {
      start_response: { session_id: "session-123" },
    };
    mockWs.onmessage?.(new MessageEvent("message", { data: JSON.stringify(startResponse) }));

    // Act - Send transcript message
    const transcriptMessage = {
      partial_transcript: {
        text: "Hello! Tell me about yourself.",
        speaker: "AI",
        is_final: true,
      },
    };
    mockWs.onmessage?.(new MessageEvent("message", { data: JSON.stringify(transcriptMessage) }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Hello! Tell me about yourself.")).toBeInTheDocument();
    });
  });

  it("should send EndRequest when 'End Interview' button is clicked", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    const mockMutate = vi.fn((params, options) => {
      options?.onSuccess?.({ token: "test-jwt-token" });
    });

    mockGenerateWsTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection and transition to live state
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    const startResponse = {
      start_response: { session_id: "session-123" },
    };
    mockWs.onmessage?.(new MessageEvent("message", { data: JSON.stringify(startResponse) }));

    await waitFor(() => {
      expect(screen.getByText(/end interview/i)).toBeInTheDocument();
    });

    // Act - Click end button
    const endButton = screen.getByText(/end interview/i);
    fireEvent.click(endButton);

    // Assert
    await waitFor(() => {
      const calls = mockWs.send.mock.calls;
      const endRequestCall = calls.find((call) => {
        const message = JSON.parse(call[0]);
        return message.end_request !== undefined;
      });
      expect(endRequestCall).toBeDefined();
    });
  });

  it("should redirect to feedback page when SessionEnded message is received", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    const mockMutate = vi.fn((params, options) => {
      options?.onSuccess?.({ token: "test-jwt-token" });
    });

    mockGenerateWsTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection and transition to live state
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    const startResponse = {
      start_response: { session_id: "session-123" },
    };
    mockWs.onmessage?.(new MessageEvent("message", { data: JSON.stringify(startResponse) }));

    // Act - Send SessionEnded message
    const sessionEndedMessage = {
      session_ended: {
        reason: "USER_INITIATED",
        message: "Interview ended by user",
      },
    };
    mockWs.onmessage?.(new MessageEvent("message", { data: JSON.stringify(sessionEndedMessage) }));

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/interview/${mockInterviewId}/feedback`);
    });
  });

  it("should display error state when connection fails", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    const mockMutate = vi.fn((params, options) => {
      options?.onSuccess?.({ token: "test-jwt-token" });
    });

    mockGenerateWsTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Act - Trigger error
    mockWs.onerror?.(new Event("error"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
    });
  });

  it("should display error message when Error message is received", async () => {
    // Arrange
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    const mockMutate = vi.fn((params, options) => {
      options?.onSuccess?.({ token: "test-jwt-token" });
    });

    mockGenerateWsTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Act - Send Error message
    const errorMessage = {
      error: {
        code: 401,
        message: "Authentication failed",
      },
    };
    mockWs.onmessage?.(new MessageEvent("message", { data: JSON.stringify(errorMessage) }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
  });
});
