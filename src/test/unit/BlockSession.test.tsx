/**
 * BlockSession Component Tests (v6: One Block = One Question)
 * Tests UI rendering based on provided state (controlled component pattern)
 * State transition logic is tested in reducer.test.ts
 */
import { render, screen, act } from "@testing-library/react";
import { BlockSession } from "~/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession";
import { expect, test, vi, describe, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import type { SessionState } from "~/app/[locale]/(interview)/interview/[interviewId]/session/types";

// --- Mocks ---

// Mock useRouter
const mockPush = vi.fn();
vi.mock("~/i18n/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, values?: Record<string, string | number>) => {
      if (key === "blockProgress")
        return `Block ${values?.current} of ${values?.total}`;
      if (key === "timer")
        return `Answer: ${values?.minutes}:${values?.seconds}`;
      if (key === "blockComplete") return `Block ${values?.number} Complete`;
      if (key === "nextBlockLanguage")
        return `next block will be in ${values?.language}`;
      if (key === "english") return "English";
      if (key === "chinese") return "Chinese";
      if (key === "timesUpTitle") return "Time's Up!";
      if (key === "timesUpMessage") return "Please wrap up your answer now.";
      if (key === "continue") return "Continue to Next Block";
      if (key === "nextQuestion") return "Next Question";
      return key;
    },
}));

// Mock TRPC (completeBlock is now called via commands, not directly)
vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      completeBlock: {
        useMutation: () => ({
          mutate: vi.fn(),
        }),
      },
    },
  },
}));

// Mock SessionContent - capture props to verify correct data is passed
let capturedSessionContentProps: Record<string, unknown> = {};

vi.mock(
  "~/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent",
  () => ({
    SessionContent: (props: Record<string, unknown>) => {
      capturedSessionContentProps = props;
      return <div data-testid="session-content">Session Content Mock</div>;
    },
  }),
);

// Mock Date for stable timer testing
vi.useFakeTimers();

// Mock timer utilities
vi.mock("~/lib/countdown-timer", () => ({
  getRemainingSeconds: (startTime: number, limitSec: number, now: number) => {
    const elapsedMs = now - startTime;
    return Math.max(0, limitSec - Math.floor(elapsedMs / 1000));
  },
  isTimeUp: (startTime: number, limitSec: number, now: number) => {
    const elapsedMs = now - startTime;
    return elapsedMs >= limitSec * 1000;
  },
}));

// --- Test Data ---

const mockInterview = {
  id: "interview-123",
  status: "PENDING",
};

// Updated template: single question per block (no durationSec)
const mockTemplate = {
  id: "template-abc",
  answerTimeLimitSec: 120,
  blocks: [
    {
      language: "zh" as const,
      question: { content: "Chinese Q1" },
    },
    {
      language: "en" as const,
      question: { content: "English Q1" },
    },
  ],
};

const mockBlocks = [
  {
    id: "block-1",
    blockNumber: 1,
    language: "ZH" as const,
    status: "PENDING" as const,
  },
  {
    id: "block-2",
    blockNumber: 2,
    language: "EN" as const,
    status: "PENDING" as const,
  },
];

// Base state for tests
const baseState: SessionState = {
  status: "WAITING_FOR_CONNECTION",
  connectionState: "initializing",
  transcript: [],
  pendingUser: "",
  pendingAI: "",
  elapsedTime: 0,
  error: null,
  isAiSpeaking: false,
};

describe("BlockSession", () => {
  const mockDispatch = vi.fn();
  const baseTime = new Date("2024-01-01T00:00:00Z").getTime();

  beforeEach(() => {
    capturedSessionContentProps = {};
    mockPush.mockClear();
    mockDispatch.mockClear();
    vi.clearAllTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders SessionContent in WAITING_FOR_CONNECTION state", () => {
    render(
      <BlockSession
        interview={mockInterview}
        blocks={mockBlocks}
        template={mockTemplate}
        state={baseState}
        dispatch={mockDispatch}
      />,
    );

    expect(screen.getByTestId("session-content")).toBeInTheDocument();
    // Note: onConnectionReady is no longer used - auto-transition happens on CONNECTION_ESTABLISHED
    expect(capturedSessionContentProps.totalBlocks).toBe(2);
    expect(capturedSessionContentProps.answerTimeLimit).toBe(120);
  });

  test("passes correct props to SessionContent in ANSWERING state", () => {
    const answeringState: SessionState = {
      ...baseState,
      status: "ANSWERING",
      connectionState: "live",
      blockIndex: 0,
      blockStartTime: baseTime,
      answerStartTime: baseTime,
    };

    render(
      <BlockSession
        interview={mockInterview}
        blocks={mockBlocks}
        template={mockTemplate}
        state={answeringState}
        dispatch={mockDispatch}
      />,
    );

    // Verify correct props are passed to SessionContent
    expect(screen.getByTestId("session-content")).toBeInTheDocument();
    expect(capturedSessionContentProps.state).toEqual(answeringState);
    expect(capturedSessionContentProps.dispatch).toBe(mockDispatch);
    expect(capturedSessionContentProps.totalBlocks).toBe(2);
    expect(capturedSessionContentProps.answerTimeLimit).toBe(120);
  });

  test("passes state and dispatch to SessionContent in ANSWER_TIMEOUT_PAUSE state", () => {
    const pauseState: SessionState = {
      ...baseState,
      status: "ANSWER_TIMEOUT_PAUSE",
      connectionState: "live",
      blockIndex: 0,
      blockStartTime: baseTime,
      answerStartTime: baseTime,
      pauseStartedAt: baseTime,
    };

    render(
      <BlockSession
        interview={mockInterview}
        blocks={mockBlocks}
        template={mockTemplate}
        state={pauseState}
        dispatch={mockDispatch}
      />,
    );

    // Verify correct props are passed to SessionContent
    expect(screen.getByTestId("session-content")).toBeInTheDocument();
    expect(capturedSessionContentProps.state).toEqual(pauseState);
    expect(capturedSessionContentProps.dispatch).toBe(mockDispatch);
  });

  test("renders block completion screen in BLOCK_COMPLETE_SCREEN state", () => {
    const completeState: SessionState = {
      ...baseState,
      status: "BLOCK_COMPLETE_SCREEN",
      connectionState: "live",
      blockIndex: 0,
      completedBlockIndex: 0,
      blockStartTime: baseTime,
      answerStartTime: baseTime,
    };

    render(
      <BlockSession
        interview={mockInterview}
        blocks={mockBlocks}
        template={mockTemplate}
        state={completeState}
        dispatch={mockDispatch}
      />,
    );

    expect(screen.getByText("Block 1 Complete")).toBeInTheDocument();
    expect(
      screen.getByText(/next block will be in English/),
    ).toBeInTheDocument();
    expect(screen.getByText("Continue to Next Block")).toBeInTheDocument();
  });

  test("dispatches USER_CLICKED_CONTINUE when continue button is clicked", async () => {
    const completeState: SessionState = {
      ...baseState,
      status: "BLOCK_COMPLETE_SCREEN",
      connectionState: "live",
      blockIndex: 0,
      completedBlockIndex: 0,
      blockStartTime: baseTime,
      answerStartTime: baseTime,
    };

    render(
      <BlockSession
        interview={mockInterview}
        blocks={mockBlocks}
        template={mockTemplate}
        state={completeState}
        dispatch={mockDispatch}
      />,
    );

    const continueButton = screen.getByText("Continue to Next Block");
    await act(async () => {
      continueButton.click();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "USER_CLICKED_CONTINUE",
    });
  });

  // Note: Resumption from incomplete blocks is now handled via targetBlockIndex in
  // useInterviewSession hook, which is tested in session-reducer.test.ts
});
