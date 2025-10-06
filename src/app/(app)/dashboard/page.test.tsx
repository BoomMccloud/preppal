import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DashboardPage from "./page";

// Mock the tRPC hook
const mockUseQuery = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      getHistory: {
        useQuery: () => mockUseQuery(),
      },
    },
  },
}));

describe("DashboardPage", () => {
  it("should display a loading message while fetching data", () => {
    // ARRANGE: Mock the hook to be in a loading state
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    // ACT
    render(<DashboardPage />);

    // ASSERT
    expect(screen.getByText(/loading sessions/i)).toBeInTheDocument();
  });

  it("should display an error message if fetching fails", () => {
    // ARRANGE: Mock the hook to be in an error state
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch history"),
    });

    // ACT
    render(<DashboardPage />);

    // ASSERT
    expect(screen.getByText(/failed to load sessions/i)).toBeInTheDocument();
  });

  it('should display an empty state message when there are no interviews', () => {
    // ARRANGE: Mock the hook to return an empty array
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    // ACT
    render(<DashboardPage />);

    // ASSERT
    expect(screen.getByText(/your recent interview sessions will appear here/i)).toBeInTheDocument();
    // Ensure no interview links are rendered
    expect(screen.queryByRole("link", { name: /session/i })).not.toBeInTheDocument();
  });

  it("should render a list of interviews with correct links", () => {
    // ARRANGE: Mock the hook to return a list of interviews
    const mockData = [
      {
        id: "int-123",
        status: "COMPLETED",
        jobTitleSnapshot: "Senior Frontend Developer...",
        createdAt: new Date(),
      },
      {
        id: "int-456",
        status: "PENDING",
        jobTitleSnapshot: "Backend Engineer...",
        createdAt: new Date(),
      },
    ];
    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    // ACT
    render(<DashboardPage />);

    // ASSERT
    // Check for the rendered text
    expect(screen.getByText("Senior Frontend Developer...")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer...")).toBeInTheDocument();

    // Check for the correct links
    const feedbackLink = screen.getByRole("link", { name: /view feedback/i });
    const lobbyLink = screen.getByRole("link", { name: /enter lobby/i });

    expect(feedbackLink).toHaveAttribute("href", "/interview/int-123/feedback");
    expect(lobbyLink).toHaveAttribute("href", "/interview/int-456/lobby");
  });

  it("should display the formatted date for each interview", () => {
    // ARRANGE: Mock data with a specific date
    const mockData = [
      {
        id: "int-123",
        status: "COMPLETED",
        jobTitleSnapshot: "Senior Frontend Developer...",
        createdAt: new Date("2023-10-27T10:00:00Z"),
      },
    ];
    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    // ACT
    render(<DashboardPage />);

    // ASSERT: Check for a user-friendly formatted date string
    // This assumes a format like "Month Day, Year"
    expect(screen.getByText(/october 27, 2023/i)).toBeInTheDocument();
  });
});
