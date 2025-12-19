import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProfilePage from "./page";

// Create mock function
const mockUseQuery = vi.fn();

// Mock the tRPC module
vi.mock("~/trpc/react", () => ({
  api: {
    user: {
      getProfile: {
        useQuery: () => mockUseQuery(),
      },
    },
  },
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display user name and email from getProfile query", () => {
    // Mock the useQuery hook to return test data
    mockUseQuery.mockReturnValue({
      data: {
        name: "John Doe",
        email: "john@example.com",
      },
      isLoading: false,
      error: null,
    });

    // This will fail because ProfilePage doesn't use the query yet
    render(<ProfilePage />);

    // Assert that the name and email are displayed
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
  });

  it("should display loading state while fetching profile", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ProfilePage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
