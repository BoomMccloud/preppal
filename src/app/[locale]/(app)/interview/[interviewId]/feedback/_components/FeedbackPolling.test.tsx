import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeedbackPolling from "./FeedbackPolling";

// Mock the tRPC client
const mockUseQuery = vi.fn();
const mockRefresh = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      getById: {
        useQuery: (params: any, options: any) => mockUseQuery(params, options),
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe("FeedbackPolling (Client Component)", () => {
  const mockInterviewId = "clxmaef5j000008l4hy45g37g";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call useQuery with includeFeedback: true and refetchInterval: 3000", () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    });

    // Act
    render(<FeedbackPolling interviewId={mockInterviewId} />);

    // Assert
    expect(mockUseQuery).toHaveBeenCalledWith(
      {
        id: mockInterviewId,
        includeFeedback: true,
      },
      expect.objectContaining({
        refetchInterval: 3000,
      }),
    );
  });

  it("should call router.refresh() when feedback data becomes available", async () => {
    // Arrange - start with no feedback
    mockUseQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "COMPLETED",
        feedback: null,
      },
      error: null,
      isLoading: false,
    });

    const { rerender } = render(
      <FeedbackPolling interviewId={mockInterviewId} />,
    );

    // Act - simulate feedback becoming available
    mockUseQuery.mockReturnValue({
      data: {
        id: mockInterviewId,
        status: "COMPLETED",
        feedback: {
          id: "feedback-id",
          summary: "Great interview",
          strengths: "Strong technical skills",
        },
      },
      error: null,
      isLoading: false,
    });

    rerender(<FeedbackPolling interviewId={mockInterviewId} />);

    // Assert
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should display loading message while polling", () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    });

    // Act
    render(<FeedbackPolling interviewId={mockInterviewId} />);

    // Assert
    expect(
      screen.getByText(/your feedback is being generated/i),
    ).toBeInTheDocument();
  });

  it("should display error message when query fails", () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      data: null,
      error: { message: "Failed to fetch" },
      isLoading: false,
    });

    // Act
    render(<FeedbackPolling interviewId={mockInterviewId} />);

    // Assert
    expect(
      screen.getByText(/could not retrieve feedback/i),
    ).toBeInTheDocument();
  });

  it("should use FeedbackCard component for styling consistency", () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    });

    // Act
    const { container } = render(
      <FeedbackPolling interviewId={mockInterviewId} />,
    );

    // Assert - check for FeedbackCard-like structure
    expect(container.querySelector(".bg-secondary")).toBeInTheDocument();
  });
});
