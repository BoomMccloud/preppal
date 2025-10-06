import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CreateInterviewPage from "./page";

// Create mock functions with extended type
const mockMutate: any = vi.fn();
const mockPush = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the tRPC module
vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      createSession: {
        useMutation: (callbacks?: {
          onSuccess?: (data: unknown) => void;
          onError?: (error: unknown) => void;
        }) => {
          // Store the callbacks so we can trigger them in tests
          if (callbacks?.onSuccess) {
            mockMutate.onSuccess = callbacks.onSuccess;
          }
          if (callbacks?.onError) {
            mockMutate.onError = callbacks.onError;
          }
          return {
            mutate: mockMutate,
            isPending: false,
          };
        },
      },
    },
  },
}));

describe("CreateInterviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call mutation with discriminated union structure when form is submitted", async () => {
    render(<CreateInterviewPage />);

    // Fill out the form
    const jobDescriptionInput = screen.getByPlaceholderText(/paste the job description/i);
    const resumeInput = screen.getByPlaceholderText(/paste your resume/i);
    const submitButton = screen.getByRole("button", { name: /start interview/i });

    fireEvent.change(jobDescriptionInput, {
      target: { value: "We are looking for a senior frontend developer..." },
    });
    fireEvent.change(resumeInput, {
      target: { value: "John Doe - Senior Frontend Developer..." },
    });

    // Submit the form
    fireEvent.click(submitButton);

    // Assert mutation was called
    expect(mockMutate).toHaveBeenCalled();

    // Verify the mutation was called with discriminated union structure
    const callArgs = mockMutate.mock.calls[0]?.[0];
    expect(callArgs?.jobDescription).toEqual({
      type: "text",
      content: "We are looking for a senior frontend developer...",
    });
    expect(callArgs?.resume).toEqual({
      type: "text",
      content: "John Doe - Senior Frontend Developer...",
    });
    expect(callArgs?.idempotencyKey).toBeDefined();
    expect(typeof callArgs?.idempotencyKey).toBe("string");
  });

  it("should disable button when fields are empty", () => {
    render(<CreateInterviewPage />);

    const submitButton = screen.getByRole("button", { name: /start interview/i });

    // Button should be disabled when fields are empty
    expect(submitButton).toBeDisabled();
  });

  it("should enable button when both fields are filled", () => {
    render(<CreateInterviewPage />);

    const jobDescriptionInput = screen.getByPlaceholderText(/paste the job description/i);
    const resumeInput = screen.getByPlaceholderText(/paste your resume/i);
    const submitButton = screen.getByRole("button", { name: /start interview/i });

    // Fill out the form
    fireEvent.change(jobDescriptionInput, {
      target: { value: "Job description content" },
    });
    fireEvent.change(resumeInput, {
      target: { value: "Resume content" },
    });

    // Button should now be enabled
    expect(submitButton).not.toBeDisabled();
  });

  it("should redirect to lobby page on successful creation", async () => {
    render(<CreateInterviewPage />);

    const jobDescriptionInput = screen.getByPlaceholderText(/paste the job description/i);
    const resumeInput = screen.getByPlaceholderText(/paste your resume/i);
    const submitButton = screen.getByRole("button", { name: /start interview/i });

    // Fill out the form
    fireEvent.change(jobDescriptionInput, {
      target: { value: "Job description" },
    });
    fireEvent.change(resumeInput, {
      target: { value: "Resume content" },
    });

    // Submit the form
    fireEvent.click(submitButton);

    // Simulate successful mutation by calling the onSuccess callback
    const mockInterview = { id: "new-interview-123" };
    if (mockMutate.onSuccess) {
      mockMutate.onSuccess(mockInterview);
    }

    // Assert router.push was called with correct URL
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/interview/new-interview-123/lobby");
    });
  });

  it("should display error message on mutation failure", async () => {
    render(<CreateInterviewPage />);

    const jobDescriptionInput = screen.getByPlaceholderText(/paste the job description/i);
    const resumeInput = screen.getByPlaceholderText(/paste your resume/i);
    const submitButton = screen.getByRole("button", { name: /start interview/i });

    // Fill out the form
    fireEvent.change(jobDescriptionInput, {
      target: { value: "Job description" },
    });
    fireEvent.change(resumeInput, {
      target: { value: "Resume content" },
    });

    // Submit the form
    fireEvent.click(submitButton);

    // Simulate mutation error by calling the onError callback
    const mockError = new Error("Failed to create");
    if (mockMutate.onError) {
      mockMutate.onError(mockError);
    }

    // Assert error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to create interview/i)).toBeInTheDocument();
    });
  });
});
