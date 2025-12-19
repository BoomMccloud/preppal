import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { SessionContent } from "./SessionContent";
import { useInterviewSocket } from "./useInterviewSocket";

// Mock the hook
vi.mock("./useInterviewSocket", () => ({
  useInterviewSocket: vi.fn(),
}));

// Mock tRPC
const mockGetByIdQuery = vi.fn();
const mockGenerateWorkerTokenMutation = vi.fn();
const mockGetInterviewStatusQuery = vi.fn();

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
    debug: {
      getInterviewStatus: {
        useQuery: (params: any) => mockGetInterviewStatusQuery(params),
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
  const mockEndInterview = vi.fn();

  // Default hook return value
  const defaultHookReturn = {
    state: "live",
    transcript: [],
    elapsedTime: 0,
    error: null,
    endInterview: mockEndInterview,
    isAiSpeaking: false, // New property we expect
    debugInfo: {
      connectAttempts: 1,
      activeConnections: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Stub scrollIntoView for JSDOM environment
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    (useInterviewSocket as Mock).mockReturnValue(defaultHookReturn);
    mockGetInterviewStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  describe("Loading States", () => {
    it("should show loading state when interview data is loading", () => {
      mockGetByIdQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<SessionContent interviewId={mockInterviewId} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("should show connecting state when socket state is initializing", () => {
      mockGetByIdQuery.mockReturnValue({
        data: { id: mockInterviewId, status: "PENDING" },
        isLoading: false,
      });

      (useInterviewSocket as Mock).mockReturnValue({
        ...defaultHookReturn,
        state: "initializing",
      });

      render(<SessionContent interviewId={mockInterviewId} />);

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });
  });

  // Interview Status Validation tests were removed as they were outdated.

  describe("Visual Feedback", () => {
    beforeEach(() => {
      mockGetByIdQuery.mockReturnValue({
        data: { id: mockInterviewId, status: "PENDING" },
        isLoading: false,
      });
    });

    it("should display 'Listening' indicator when AI is not speaking", () => {
      (useInterviewSocket as Mock).mockReturnValue({
        ...defaultHookReturn,
        state: "live",
        isAiSpeaking: false,
      });

      render(<SessionContent interviewId={mockInterviewId} />);

      // We expect to see some indication of listening
      expect(screen.getByText(/listening/i)).toBeInTheDocument();
      // And definitely not speaking
      expect(screen.queryByText(/speaking/i)).not.toBeInTheDocument();
    });

    it("should display 'Speaking' indicator when AI is speaking", () => {
      (useInterviewSocket as Mock).mockReturnValue({
        ...defaultHookReturn,
        state: "live",
        isAiSpeaking: true,
      });

      render(<SessionContent interviewId={mockInterviewId} />);

      // We expect to see some indication of speaking
      expect(screen.getByText(/speaking/i)).toBeInTheDocument();
      // And definitely not listening (or at least the state changed)
      expect(screen.queryByText(/listening/i)).not.toBeInTheDocument();
    });
  });

  describe("End Interview", () => {
    it("should call endInterview when end button is clicked", () => {
      mockGetByIdQuery.mockReturnValue({
        data: { id: mockInterviewId, status: "PENDING" },
        isLoading: false,
      });

      render(<SessionContent interviewId={mockInterviewId} />);

      const endButton = screen.getByText(/end interview/i);
      fireEvent.click(endButton);

      expect(mockEndInterview).toHaveBeenCalled();
    });
  });
});
