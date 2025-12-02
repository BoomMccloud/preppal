import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
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

describe("Interview Session Core Functionality", () => {
  const mockInterviewId = "interview-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("should show connecting state when interview is PENDING", () => {
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

  it("should initiate token generation for PENDING interviews", () => {
    mockGetByIdQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "PENDING",
      },
      isLoading: false,
    });

    const mockMutate = vi.fn();
    mockGenerateWorkerTokenMutation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });

    render(<SessionContent interviewId={mockInterviewId} />);

    // Verify the mutate function was called with correct argument
    expect(mockMutate).toHaveBeenCalledTimes(1);
    const callArgs = mockMutate.mock.calls[0];
    expect(callArgs[0]).toEqual({ interviewId: mockInterviewId });
  });
});