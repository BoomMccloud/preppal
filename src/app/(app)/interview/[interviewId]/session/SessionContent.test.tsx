import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
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
  url: string;
  send: vi.Mock<any, any>;

  constructor(url: string) {
    this.url = url;
    this.send = vi.fn();
  }

  connect() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event("open"));
    }
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

describe("SessionContent", () => {
  const mockInterviewId = "interview-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading States", () => {
    it("should show loading state when interview data is loading", () => {
      mockGetByIdQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      mockGenerateWorkerTokenMutation.mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });

      render(<SessionContent interviewId={mockInterviewId} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("should show connecting state initially when interview is pending", () => {
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

      render(<SessionContent interviewId={mockInterviewId} />);

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });
  });

  describe("Interview Status Validation", () => {
    it("should redirect to dashboard if interview is IN_PROGRESS", () => {
      mockGetByIdQuery.mockReturnValue({
        data: {
          id: mockInterviewId,
          status: "IN_PROGRESS",
        },
        isLoading: false,
      });

      mockGenerateWorkerTokenMutation.mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });

      render(<SessionContent interviewId={mockInterviewId} />);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("should redirect to dashboard if interview is COMPLETED", () => {
      mockGetByIdQuery.mockReturnValue({
        data: {
          id: mockInterviewId,
          status: "COMPLETED",
        },
        isLoading: false,
      });

      mockGenerateWorkerTokenMutation.mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });

      render(<SessionContent interviewId={mockInterviewId} />);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});