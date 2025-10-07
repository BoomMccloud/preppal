import { redirect } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LobbyPage from "./page";

// Mock the server-side API client
const mockGetById = vi.fn();
vi.mock("~/trpc/server", () => ({
  api: {
    interview: {
      getById: (params: { id: string }) => mockGetById(params),
    },
  },
}));

// Mock the redirect function from next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("LobbyPage (Server Component)", () => {
  const mockInterviewId = "clxmaef5j000008l4hy45g37g";

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it("should render an error component if the interview is not found", async () => {
    // Arrange
    mockGetById.mockRejectedValue(
      new TRPCError({ code: "NOT_FOUND", message: "Interview not found" }),
    );

    // Act
    const Page = await LobbyPage({ params: { interviewId: mockInterviewId } });
    render(Page);

    // Assert
    expect(
      screen.getByText("Interview not found or you don't have access"),
    ).toBeInTheDocument();
    expect(screen.getByText("Return to Dashboard")).toBeInTheDocument();
  });

  it("should redirect to the feedback page if the interview status is COMPLETED", async () => {
    // Arrange
    mockGetById.mockResolvedValue({
      id: mockInterviewId,
      status: "COMPLETED",
      jobDescriptionSnapshot: "Test Job Description",
    });

    // Act
    await LobbyPage({ params: { interviewId: mockInterviewId } });

    // Assert
    expect(redirect).toHaveBeenCalledWith(
      `/interview/${mockInterviewId}/feedback`,
    );
  });

  it("should render an error component if the interview status is IN_PROGRESS", async () => {
    // Arrange
    mockGetById.mockResolvedValue({
      id: mockInterviewId,
      status: "IN_PROGRESS",
      jobDescriptionSnapshot: "Test Job Description",
    });

    // Act
    const Page = await LobbyPage({ params: { interviewId: mockInterviewId } });
    render(Page);

    // Assert
    expect(
      screen.getByText(
        "This interview is already in progress. Please refresh or contact support.",
      ),
    ).toBeInTheDocument();
  });

  it("should render an error component if the interview status is ERROR", async () => {
    // Arrange
    mockGetById.mockResolvedValue({
      id: mockInterviewId,
      status: "ERROR",
      jobDescriptionSnapshot: "Test Job Description",
    });

    // Act
    const Page = await LobbyPage({ params: { interviewId: mockInterviewId } });
    render(Page);

    // Assert
    expect(
      screen.getByText(
        "This interview has encountered an error. Please contact support.",
      ),
    ).toBeInTheDocument();
  });

  describe("when status is PENDING", () => {
    const longDescription =
      "This is a very long job description that is definitely over one hundred characters long to ensure that the truncation logic is working as expected. We need to test this thoroughly.";
    const shortDescription = "A short description.";

    it("should render the main lobby UI", async () => {
      // Arrange
      mockGetById.mockResolvedValue({
        id: mockInterviewId,
        status: "PENDING",
        jobDescriptionSnapshot: shortDescription,
      });

      // Act
      const Page = await LobbyPage({ params: { interviewId: mockInterviewId } });
      render(Page);

      // Assert
      expect(
        screen.getByRole("heading", { name: /Interview Lobby/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(shortDescription)).toBeInTheDocument();
    });

    it("should render a 'Start Interview' link pointing to the session URL", async () => {
      // Arrange
      mockGetById.mockResolvedValue({
        id: mockInterviewId,
        status: "PENDING",
        jobDescriptionSnapshot: shortDescription,
      });

      // Act
      const Page = await LobbyPage({ params: { interviewId: mockInterviewId } });
      render(Page);

      // Assert
      const startLink = screen.getByRole("link", { name: /Start Interview/i });
      expect(startLink).toBeInTheDocument();
      expect(startLink).toHaveAttribute(
        "href",
        `/interview/${mockInterviewId}/session`,
      );
    });

    it("should truncate a long job description with '...'", async () => {
      // Arrange
      mockGetById.mockResolvedValue({
        id: mockInterviewId,
        status: "PENDING",
        jobDescriptionSnapshot: longDescription,
      });

      // Act
      const Page = await LobbyPage({ params: { interviewId: mockInterviewId } });
      render(Page);

      // Assert
      const expectedText = longDescription.substring(0, 100) + "...";
      expect(screen.getByText(expectedText)).toBeInTheDocument();
      expect(screen.queryByText(longDescription)).not.toBeInTheDocument();
    });

    it("should not truncate a short job description", async () => {
        // Arrange
        mockGetById.mockResolvedValue({
          id: mockInterviewId,
          status: "PENDING",
          jobDescriptionSnapshot: shortDescription,
        });
  
        // Act
        const Page = await LobbyPage({ params: { interviewId: mockInterviewId } });
        render(Page);
  
        // Assert
        expect(screen.getByText(shortDescription)).toBeInTheDocument();
        expect(screen.queryByText(shortDescription + "...")).not.toBeInTheDocument();
      });
  });
});
