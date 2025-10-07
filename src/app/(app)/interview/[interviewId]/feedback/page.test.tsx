import { redirect } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FeedbackPage from "./page";

// Mock the server-side API client
const mockGetById = vi.fn();
vi.mock("~/trpc/server", () => ({
  api: {
    interview: {
      getById: (params: { id: string; includeFeedback?: boolean }) => mockGetById(params),
    },
  },
}));

// Mock the redirect function from next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock the FeedbackPolling component
vi.mock("./_components/FeedbackPolling", () => ({
  default: ({ interviewId }: { interviewId: string }) => (
    <div data-testid="feedback-polling">Polling for interview {interviewId}</div>
  ),
}));

describe("FeedbackPage (Server Component)", () => {
  const mockInterviewId = "clxmaef5j000008l4hy45g37g";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render an error component when the API throws a NOT_FOUND error", async () => {
    // Arrange
    mockGetById.mockRejectedValue(
      new TRPCError({ code: "NOT_FOUND", message: "Interview not found" }),
    );

    // Act
    const Page = await FeedbackPage({
      params: Promise.resolve({ interviewId: mockInterviewId }),
    });
    render(Page);

    // Assert
    expect(
      screen.getByText("Feedback not found or you don't have access"),
    ).toBeInTheDocument();
  });

  it("should redirect to the lobby if the interview status is PENDING", async () => {
    // Arrange
    mockGetById.mockResolvedValue({
      id: mockInterviewId,
      status: "PENDING",
      jobDescriptionSnapshot: "Test Job Description",
      feedback: null,
    });

    // Act
    await FeedbackPage({
      params: Promise.resolve({ interviewId: mockInterviewId }),
    });

    // Assert
    expect(redirect).toHaveBeenCalledWith(
      `/interview/${mockInterviewId}/lobby`,
    );
  });

  it("should redirect to the lobby if the interview status is IN_PROGRESS", async () => {
    // Arrange
    mockGetById.mockResolvedValue({
      id: mockInterviewId,
      status: "IN_PROGRESS",
      jobDescriptionSnapshot: "Test Job Description",
      feedback: null,
    });

    // Act
    await FeedbackPage({
      params: Promise.resolve({ interviewId: mockInterviewId }),
    });

    // Assert
    expect(redirect).toHaveBeenCalledWith(
      `/interview/${mockInterviewId}/lobby`,
    );
  });

  it("should render the FeedbackPolling component if the interview is COMPLETED but feedback is null", async () => {
    // Arrange
    mockGetById.mockResolvedValue({
      id: mockInterviewId,
      status: "COMPLETED",
      jobDescriptionSnapshot: "Test Job Description",
      feedback: null,
    });

    // Act
    const Page = await FeedbackPage({
      params: Promise.resolve({ interviewId: mockInterviewId }),
    });
    render(Page);

    // Assert
    expect(screen.getByTestId("feedback-polling")).toBeInTheDocument();
    expect(
      screen.getByText(`Polling for interview ${mockInterviewId}`),
    ).toBeInTheDocument();
  });

  it("should render the FeedbackTabs component when feedback data is present", async () => {
    // Arrange
    const mockFeedback = {
      id: "feedback-id",
      interviewId: mockInterviewId,
      overallScore: 85,
      summary: "Great interview performance",
      strengths: "Strong technical skills",
      contentAndStructure: "Well organized responses",
      communicationAndDelivery: "Clear communication",
      presentation: "Professional demeanor",
      createdAt: new Date(),
    };

    mockGetById.mockResolvedValue({
      id: mockInterviewId,
      status: "COMPLETED",
      jobDescriptionSnapshot: "Test Job Description",
      feedback: mockFeedback,
    });

    // Act
    const Page = await FeedbackPage({
      params: Promise.resolve({ interviewId: mockInterviewId }),
    });
    render(Page);

    // Assert
    expect(screen.getByText("Interview Feedback")).toBeInTheDocument();
    expect(screen.getByText("Great interview performance")).toBeInTheDocument();
    expect(screen.getByText("Strong technical skills")).toBeInTheDocument();
  });

  it("should call getById with includeFeedback: true", async () => {
    // Arrange
    mockGetById.mockResolvedValue({
      id: mockInterviewId,
      status: "COMPLETED",
      jobDescriptionSnapshot: "Test Job Description",
      feedback: null,
    });

    // Act
    await FeedbackPage({
      params: Promise.resolve({ interviewId: mockInterviewId }),
    });

    // Assert
    expect(mockGetById).toHaveBeenCalledWith({
      id: mockInterviewId,
      includeFeedback: true,
    });
  });
});
