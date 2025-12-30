/**
 * SessionContentDev Component Integration Tests
 * Tests the Dev Mode Controls feature (FEAT30) - Block Controls section
 *
 * These tests verify:
 * 1. Block Controls section renders in the dev console
 * 2. "Skip Block" and "Answer Timeout" buttons are present
 * 3. Buttons are enabled/disabled based on SessionState
 * 4. Clicking buttons dispatches the correct events
 *
 * Following TDD: These tests are written BEFORE implementation and will FAIL
 * until the feature is implemented according to the spec.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi, describe, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import type { SessionState } from "~/app/[locale]/(interview)/interview/[interviewId]/session/types";

// --- Mocks ---

// Mock i18n navigation (SessionContentDev uses useRouter from ~/i18n/navigation)
vi.mock("~/i18n/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock tRPC - SessionContentDev uses api.interview.getById and api.debug.getInterviewStatus
vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      getById: {
        useQuery: vi.fn(() => ({
          data: {
            id: "test-interview-id",
            status: "PENDING",
            templateId: "test-template",
            userId: "test-user",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          isLoading: false,
          error: null,
        })),
      },
    },
    debug: {
      getInterviewStatus: {
        useQuery: vi.fn(() => ({
          data: { status: "PENDING" },
        })),
      },
    },
  },
}));

// Mock StatusIndicator component
vi.mock("~/app/_components/StatusIndicator", () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <div data-testid="status-indicator">{status}</div>
  ),
}));

// Mock AIAvatar component
vi.mock("~/app/_components/AIAvatar", () => ({
  AIAvatar: ({ status }: { status: string }) => (
    <div data-testid="ai-avatar">{status}</div>
  ),
}));

// Import after mocks are defined (mocks are hoisted automatically)
import { SessionContentDev } from "~/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev";

// --- Test Data ---

const mockDispatch = vi.fn();

// Helper: Create base state with common fields
const createBaseState = (
  overrides: Partial<SessionState> = {},
): SessionState => ({
  status: "WAITING_FOR_CONNECTION",
  connectionState: "initializing",
  transcript: [],
  pendingUser: "",
  pendingAI: "",
  elapsedTime: 0,
  error: null,
  isAiSpeaking: false,
  ...overrides,
});

const mockProps = {
  interviewId: "test-interview-id",
  guestToken: undefined,
  dispatch: mockDispatch,
  onConnectionReady: undefined,
  onToggleProdView: undefined,
};

describe("SessionContentDev - Block Controls Integration Tests (FEAT30)", () => {
  beforeEach(() => {
    mockDispatch.mockClear();

    // Mock scrollIntoView (not implemented in JSDOM)
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe("Block Controls Section Rendering", () => {
    test("should render Block Controls section in the Actions area", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now() - 10000,
        answerStartTime: Date.now() - 5000,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      // Verify Block Controls heading exists
      expect(
        screen.getByText("Block Controls", { exact: false }),
      ).toBeInTheDocument();
    });

    test("should render Skip Block button", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now() - 10000,
        answerStartTime: Date.now() - 5000,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      expect(screen.getByText("Skip Block")).toBeInTheDocument();
    });

    test("should render Answer Timeout button", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now() - 10000,
        answerStartTime: Date.now() - 5000,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      expect(screen.getByText("Answer Timeout")).toBeInTheDocument();
    });

    test("should render both buttons in the Actions section", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now() - 10000,
        answerStartTime: Date.now() - 5000,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      // Verify both buttons exist alongside existing "Log Status to Console" button
      expect(screen.getByText("Skip Block")).toBeInTheDocument();
      expect(screen.getByText("Answer Timeout")).toBeInTheDocument();
      expect(screen.getByText("Log Status to Console")).toBeInTheDocument();
    });
  });

  describe("Skip Block Button - Event Dispatching", () => {
    test("should dispatch DEV_FORCE_BLOCK_COMPLETE when Skip Block is clicked in ANSWERING state", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: Date.now() - 30000,
        answerStartTime: Date.now() - 15000,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");
      fireEvent.click(skipButton);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "DEV_FORCE_BLOCK_COMPLETE",
      });
    });

    test("should dispatch DEV_FORCE_BLOCK_COMPLETE when clicked in ANSWER_TIMEOUT_PAUSE state", () => {
      const state = createBaseState({
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 0,
        blockStartTime: Date.now() - 60000,
        pauseStartedAt: Date.now() - 2000,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");
      fireEvent.click(skipButton);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "DEV_FORCE_BLOCK_COMPLETE",
      });
    });
  });

  describe("Skip Block Button - Enabled/Disabled States", () => {
    test("should be enabled when state is ANSWERING", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now(),
        answerStartTime: Date.now(),
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");
      expect(skipButton).not.toBeDisabled();
    });

    test("should be enabled when state is ANSWER_TIMEOUT_PAUSE", () => {
      const state = createBaseState({
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 1,
        blockStartTime: Date.now() - 60000,
        pauseStartedAt: Date.now() - 1000,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");
      expect(skipButton).not.toBeDisabled();
    });

    test("should be disabled when state is WAITING_FOR_CONNECTION", () => {
      const state = createBaseState({
        status: "WAITING_FOR_CONNECTION",
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");
      expect(skipButton).toBeDisabled();
    });

    test("should be disabled when state is BLOCK_COMPLETE_SCREEN", () => {
      const state = createBaseState({
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");
      expect(skipButton).toBeDisabled();
    });

    test("should be disabled when state is INTERVIEW_COMPLETE", () => {
      const state = createBaseState({
        status: "INTERVIEW_COMPLETE",
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");
      expect(skipButton).toBeDisabled();
    });
  });

  describe("Answer Timeout Button - Event Dispatching", () => {
    test("should dispatch DEV_FORCE_ANSWER_TIMEOUT when Answer Timeout is clicked in ANSWERING state", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 2,
        blockStartTime: Date.now() - 45000,
        answerStartTime: Date.now() - 20000,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const timeoutButton = screen.getByText("Answer Timeout");
      fireEvent.click(timeoutButton);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "DEV_FORCE_ANSWER_TIMEOUT",
      });
    });
  });

  describe("Answer Timeout Button - Enabled/Disabled States", () => {
    test("should be enabled when state is ANSWERING", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now(),
        answerStartTime: Date.now(),
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const timeoutButton = screen.getByText("Answer Timeout");
      expect(timeoutButton).not.toBeDisabled();
    });

    test("should be disabled when state is ANSWER_TIMEOUT_PAUSE", () => {
      const state = createBaseState({
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 0,
        blockStartTime: Date.now() - 60000,
        pauseStartedAt: Date.now() - 1500,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const timeoutButton = screen.getByText("Answer Timeout");
      expect(timeoutButton).toBeDisabled();
    });

    test("should be disabled when state is WAITING_FOR_CONNECTION", () => {
      const state = createBaseState({
        status: "WAITING_FOR_CONNECTION",
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const timeoutButton = screen.getByText("Answer Timeout");
      expect(timeoutButton).toBeDisabled();
    });

    test("should be disabled when state is BLOCK_COMPLETE_SCREEN", () => {
      const state = createBaseState({
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 1,
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const timeoutButton = screen.getByText("Answer Timeout");
      expect(timeoutButton).toBeDisabled();
    });

    test("should be disabled when state is INTERVIEW_COMPLETE", () => {
      const state = createBaseState({
        status: "INTERVIEW_COMPLETE",
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const timeoutButton = screen.getByText("Answer Timeout");
      expect(timeoutButton).toBeDisabled();
    });
  });

  describe("Button Interaction - Multiple Clicks", () => {
    test("should dispatch event on each click of Skip Block button", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now(),
        answerStartTime: Date.now(),
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");

      fireEvent.click(skipButton);
      expect(mockDispatch).toHaveBeenCalledTimes(1);

      fireEvent.click(skipButton);
      expect(mockDispatch).toHaveBeenCalledTimes(2);

      fireEvent.click(skipButton);
      expect(mockDispatch).toHaveBeenCalledTimes(3);

      // All calls should have the same event
      expect(mockDispatch).toHaveBeenNthCalledWith(1, {
        type: "DEV_FORCE_BLOCK_COMPLETE",
      });
      expect(mockDispatch).toHaveBeenNthCalledWith(2, {
        type: "DEV_FORCE_BLOCK_COMPLETE",
      });
      expect(mockDispatch).toHaveBeenNthCalledWith(3, {
        type: "DEV_FORCE_BLOCK_COMPLETE",
      });
    });

    test("should dispatch event on each click of Answer Timeout button", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: Date.now(),
        answerStartTime: Date.now(),
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const timeoutButton = screen.getByText("Answer Timeout");

      fireEvent.click(timeoutButton);
      fireEvent.click(timeoutButton);

      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenNthCalledWith(1, {
        type: "DEV_FORCE_ANSWER_TIMEOUT",
      });
      expect(mockDispatch).toHaveBeenNthCalledWith(2, {
        type: "DEV_FORCE_ANSWER_TIMEOUT",
      });
    });
  });

  describe("State Transitions - Button States Update", () => {
    test("should update button states when state changes from ANSWERING to ANSWER_TIMEOUT_PAUSE", () => {
      const { rerender } = render(
        <SessionContentDev
          {...mockProps}
          state={createBaseState({
            status: "ANSWERING",
            blockIndex: 0,
            blockStartTime: Date.now(),
            answerStartTime: Date.now(),
          })}
        />,
      );

      // Initially both buttons enabled
      expect(screen.getByText("Skip Block")).not.toBeDisabled();
      expect(screen.getByText("Answer Timeout")).not.toBeDisabled();

      // Transition to ANSWER_TIMEOUT_PAUSE
      rerender(
        <SessionContentDev
          {...mockProps}
          state={createBaseState({
            status: "ANSWER_TIMEOUT_PAUSE",
            blockIndex: 0,
            blockStartTime: Date.now() - 60000,
            pauseStartedAt: Date.now(),
          })}
        />,
      );

      // Skip Block still enabled, Answer Timeout disabled
      expect(screen.getByText("Skip Block")).not.toBeDisabled();
      expect(screen.getByText("Answer Timeout")).toBeDisabled();
    });

    test("should disable both buttons when state changes to BLOCK_COMPLETE_SCREEN", () => {
      const { rerender } = render(
        <SessionContentDev
          {...mockProps}
          state={createBaseState({
            status: "ANSWERING",
            blockIndex: 0,
            blockStartTime: Date.now(),
            answerStartTime: Date.now(),
          })}
        />,
      );

      // Initially both buttons enabled
      expect(screen.getByText("Skip Block")).not.toBeDisabled();
      expect(screen.getByText("Answer Timeout")).not.toBeDisabled();

      // Transition to BLOCK_COMPLETE_SCREEN
      rerender(
        <SessionContentDev
          {...mockProps}
          state={createBaseState({
            status: "BLOCK_COMPLETE_SCREEN",
            completedBlockIndex: 0,
          })}
        />,
      );

      // Both buttons disabled
      expect(screen.getByText("Skip Block")).toBeDisabled();
      expect(screen.getByText("Answer Timeout")).toBeDisabled();
    });

    test("should re-enable both buttons when state changes back to ANSWERING", () => {
      const { rerender } = render(
        <SessionContentDev
          {...mockProps}
          state={createBaseState({
            status: "BLOCK_COMPLETE_SCREEN",
            completedBlockIndex: 0,
          })}
        />,
      );

      // Initially both buttons disabled
      expect(screen.getByText("Skip Block")).toBeDisabled();
      expect(screen.getByText("Answer Timeout")).toBeDisabled();

      // Transition back to ANSWERING (next block)
      rerender(
        <SessionContentDev
          {...mockProps}
          state={createBaseState({
            status: "ANSWERING",
            blockIndex: 1,
            blockStartTime: Date.now(),
            answerStartTime: Date.now(),
          })}
        />,
      );

      // Both buttons enabled again
      expect(screen.getByText("Skip Block")).not.toBeDisabled();
      expect(screen.getByText("Answer Timeout")).not.toBeDisabled();
    });
  });

  describe("Edge Cases", () => {
    test("should not call dispatch when disabled Skip Block button is clicked", () => {
      const state = createBaseState({
        status: "WAITING_FOR_CONNECTION",
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");
      expect(skipButton).toBeDisabled();

      fireEvent.click(skipButton);

      // Dispatch should not be called because button is disabled
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    test("should not call dispatch when disabled Answer Timeout button is clicked", () => {
      const state = createBaseState({
        status: "INTERVIEW_COMPLETE",
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const timeoutButton = screen.getByText("Answer Timeout");
      expect(timeoutButton).toBeDisabled();

      fireEvent.click(timeoutButton);

      // Dispatch should not be called because button is disabled
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    test("should handle rapid clicking without breaking", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now(),
        answerStartTime: Date.now(),
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      const skipButton = screen.getByText("Skip Block");

      // Rapid fire 10 clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(skipButton);
      }

      expect(mockDispatch).toHaveBeenCalledTimes(10);
      // All calls should be identical
      mockDispatch.mock.calls.forEach((call) => {
        expect(call[0]).toEqual({ type: "DEV_FORCE_BLOCK_COMPLETE" });
      });
    });
  });

  describe("Integration with Existing Dev Console", () => {
    test("should render Block Controls alongside existing Actions section elements", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now(),
        answerStartTime: Date.now(),
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      // Verify all Actions section elements are present
      expect(screen.getByText("Actions")).toBeInTheDocument();
      expect(screen.getByText("Block Controls")).toBeInTheDocument();
      expect(screen.getByText("Skip Block")).toBeInTheDocument();
      expect(screen.getByText("Answer Timeout")).toBeInTheDocument();
      expect(screen.getByText("Log Status to Console")).toBeInTheDocument();
    });

    test("should render Block Controls in the dev console sidebar", () => {
      const state = createBaseState({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now(),
        answerStartTime: Date.now(),
      });

      render(<SessionContentDev {...mockProps} state={state} />);

      // Verify dev console elements are present
      expect(screen.getByText("Dev Console")).toBeInTheDocument();
      expect(screen.getByText("State Monitor")).toBeInTheDocument();
      expect(screen.getByText("Raw Buffers")).toBeInTheDocument();
      expect(screen.getByText("State Inspector")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
      expect(screen.getByText("Block Controls")).toBeInTheDocument();
    });
  });
});
