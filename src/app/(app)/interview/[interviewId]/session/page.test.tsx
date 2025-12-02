import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as interview_pb from "~/lib/interview_pb";
import { SessionContent } from "./SessionContent";

// Mock AudioRecorder and AudioPlayer
const mockAudioRecorderStart = vi.fn();
const mockAudioRecorderStop = vi.fn();
const mockAudioPlayerStart = vi.fn();
const mockAudioPlayerStop = vi.fn();
const mockAudioPlayerEnqueue = vi.fn();

vi.mock("~/lib/audio/AudioRecorder", () => {
  return {
    AudioRecorder: vi.fn().mockImplementation(() => ({
      start: mockAudioRecorderStart,
      stop: mockAudioRecorderStop,
    })),
  };
});

vi.mock("~/lib/audio/AudioPlayer", () => {
  return {
    AudioPlayer: vi.fn().mockImplementation(() => ({
      start: mockAudioPlayerStart,
      stop: mockAudioPlayerStop,
      enqueue: mockAudioPlayerEnqueue,
    })),
  };
});

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
  url: string;
  send: vi.Mock<any, any>;

  constructor(url: string) {
    this.url = url;
    this.send = vi.fn();
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  close = vi.fn();
}

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

describe("SessionContent (Protobuf/WebSocket Worker)", () => {
  const mockInterviewId = "interview-123";
  let mockWs: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup global WebSocket mock
    mockWs = new MockWebSocket(`http://localhost:8787/${mockInterviewId}?token=test-jwt-token`);
    global.WebSocket = vi.fn(() => mockWs) as any;
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
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

  it("should connect to WebSocket with correct URL including token", async () => {
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    // Act
    render(<SessionContent interviewId={mockInterviewId} />);

    // Assert
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledWith(
        `http://localhost:8787/${mockInterviewId}?token=test-jwt-token`
      );
    });
  });

  it("should start AudioRecorder and AudioPlayer when WebSocket connection opens", async () => {
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    // Act
    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for WebSocket to open
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Assert
    expect(mockAudioRecorderStart).toHaveBeenCalled();
    expect(mockAudioPlayerStart).toHaveBeenCalled();
  });

  it("should update transcript when TranscriptUpdate messages are received", async () => {
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Act - Send transcript message
    const transcriptUpdate = interview_pb.preppal.TranscriptUpdate.create({
      speaker: "AI",
      text: "Hello! Tell me about yourself.",
      is_final: true,
    });

    const message = interview_pb.preppal.ServerToClientMessage.create({
      transcript_update: transcriptUpdate,
    });

    const buffer = interview_pb.preppal.ServerToClientMessage.encode(message).finish();

    // Create a Blob with the buffer data
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    mockWs.onmessage?.(new MessageEvent("message", { data: blob }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Hello! Tell me about yourself.")).toBeInTheDocument();
    });
  });

  it("should enqueue audio when AudioResponse messages are received", async () => {
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Act - Send audio response message
    const audioContent = new Uint8Array([1, 2, 3, 4]);
    const audioResponse = interview_pb.preppal.AudioResponse.create({
      audio_content: audioContent,
    });

    const message = interview_pb.preppal.ServerToClientMessage.create({
      audio_response: audioResponse,
    });

    const buffer = interview_pb.preppal.ServerToClientMessage.encode(message).finish();

    // Create a Blob with the buffer data
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    mockWs.onmessage?.(new MessageEvent("message", { data: blob }));

    // Assert
    await waitFor(() => {
      expect(mockAudioPlayerEnqueue).toHaveBeenCalledWith(audioContent.buffer);
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Act - Send SessionEnded message
    const sessionEnded = interview_pb.preppal.SessionEnded.create({
      reason: interview_pb.preppal.SessionEnded.Reason.USER_INITIATED,
    });

    const message = interview_pb.preppal.ServerToClientMessage.create({
      session_ended: sessionEnded,
    });

    const buffer = interview_pb.preppal.ServerToClientMessage.encode(message).finish();

    // Create a Blob with the buffer data
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    mockWs.onmessage?.(new MessageEvent("message", { data: blob }));

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/interview/${mockInterviewId}/feedback`);
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Act - Send Error message
    const errorResponse = interview_pb.preppal.ErrorResponse.create({
      code: 401,
      message: "Authentication failed",
    });

    const message = interview_pb.preppal.ServerToClientMessage.create({
      error: errorResponse,
    });

    const buffer = interview_pb.preppal.ServerToClientMessage.encode(message).finish();

    // Create a Blob with the buffer data
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    mockWs.onmessage?.(new MessageEvent("message", { data: blob }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
  });

  it("should send audio chunks from AudioRecorder to WebSocket", async () => {
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    // Mock the AudioRecorder callback
    let audioDataCallback: ((chunk: ArrayBuffer) => void) | undefined;
    mockAudioRecorderStart.mockImplementation((callback: (chunk: ArrayBuffer) => void) => {
      audioDataCallback = callback;
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Act - Simulate audio data from recorder
    const audioChunkData = new ArrayBuffer(8);
    if (audioDataCallback) {
      audioDataCallback(audioChunkData);
    }

    // Assert
    await waitFor(() => {
      expect(mockWs.send).toHaveBeenCalled();
    });

    // Verify it's sending a protobuf message
    const sentData = mockWs.send.mock.calls[0][0];
    expect(sentData).toBeInstanceOf(ArrayBuffer);
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Wait for connection and transition to live state
    await waitFor(() => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });

    // Wait for the end button to appear
    await waitFor(() => {
      expect(screen.getByText(/end interview/i)).toBeInTheDocument();
    });

    // Act - Click end button
    const endButton = screen.getByText(/end interview/i);
    fireEvent.click(endButton);

    // Assert
    await waitFor(() => {
      expect(mockWs.send).toHaveBeenCalled();
    });

    // Verify it's sending an EndRequest protobuf message
    const sentData = mockWs.send.mock.calls[0][0];
    expect(sentData).toBeInstanceOf(ArrayBuffer);

    // Decode and verify the message
    const decodedMessage = interview_pb.preppal.ClientToServerMessage.decode(new Uint8Array(sentData as ArrayBuffer));
    expect(decodedMessage.end_request).toBeDefined();
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

    mockGenerateWorkerTokenMutation.mockReturnValue({
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
});