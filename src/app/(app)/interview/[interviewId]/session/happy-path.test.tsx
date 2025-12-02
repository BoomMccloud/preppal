import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionContent } from "./SessionContent";

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

describe("Happy Path Interview Session", () => {
  const mockInterviewId = "interview-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show connecting state initially", () => {
    // Setup mock responses
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

    // Render component
    render(<SessionContent interviewId={mockInterviewId} />);

    // Should show connecting state initially
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it("should redirect to dashboard if interview is IN_PROGRESS", () => {
    // Setup mock responses
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

    // Render component
    render(<SessionContent interviewId={mockInterviewId} />);

    // Should redirect to dashboard
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("should redirect to dashboard if interview is COMPLETED", () => {
    // Setup mock responses
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

    // Render component
    render(<SessionContent interviewId={mockInterviewId} />);

    // Should redirect to dashboard
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});