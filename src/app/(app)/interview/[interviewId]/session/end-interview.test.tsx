import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
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

// Mock WebSocket
const mockWebSocket = {
  close: vi.fn(),
  send: vi.fn(),
  readyState: WebSocket.OPEN,
};

// Mock useInterviewSocket hook
const mockUseInterviewSocket = vi.fn();

vi.mock("./useInterviewSocket", () => ({
  useInterviewSocket: (props: any) => mockUseInterviewSocket(props),
}));

describe("End Interview Functionality", () => {
  const mockInterviewId = "interview-123";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock responses
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
  });

  it("should disable the End Interview button when state is 'ending'", () => {
    // Mock the hook to return ending state
    mockUseInterviewSocket.mockReturnValue({
      state: "ending",
      transcript: [],
      elapsedTime: 0,
      error: null,
      endInterview: vi.fn(),
      isAiSpeaking: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    const endButton = screen.getByRole("button", { name: "Ending..." });
    expect(endButton).toBeDisabled();
  });

  it("should enable the End Interview button when state is 'live'", () => {
    // Mock the hook to return live state
    mockUseInterviewSocket.mockReturnValue({
      state: "live",
      transcript: [],
      elapsedTime: 30,
      error: null,
      endInterview: vi.fn(),
      isAiSpeaking: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    const endButton = screen.getByRole("button", { name: "End Interview" });
    expect(endButton).toBeEnabled();
  });

  it("should call endInterview function when button is clicked", () => {
    const mockEndInterview = vi.fn();

    // Mock the hook to return live state with endInterview function
    mockUseInterviewSocket.mockReturnValue({
      state: "live",
      transcript: [],
      elapsedTime: 30,
      error: null,
      endInterview: mockEndInterview,
      isAiSpeaking: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    const endButton = screen.getByRole("button", { name: "End Interview" });
    fireEvent.click(endButton);

    expect(mockEndInterview).toHaveBeenCalledTimes(1);
  });

  it("should show 'Ending...' text when state is 'ending'", () => {
    // Mock the hook to return ending state
    mockUseInterviewSocket.mockReturnValue({
      state: "ending",
      transcript: [],
      elapsedTime: 30,
      error: null,
      endInterview: vi.fn(),
      isAiSpeaking: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    expect(screen.getByText("Ending...")).toBeInTheDocument();
  });
});
