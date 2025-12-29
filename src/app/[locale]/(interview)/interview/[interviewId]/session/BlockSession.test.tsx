/**
 * BlockSession Component Tests
 * Tests UI rendering based on provided state (controlled component pattern)
 * State transition logic is tested in reducer.test.ts
 */
import { render, screen, act } from "@testing-library/react";
import { BlockSession } from "./BlockSession";
import { expect, test, vi, describe, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import type { SessionState } from "./types";

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
      if (key === "blockTimer")
        return `Section: ${values?.minutes}:${values?.seconds}`;
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
      return key;
    },
}));

// Mock TRPC
const mockCompleteBlockMutate = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      completeBlock: {
        useMutation: () => ({
          mutate: mockCompleteBlockMutate,
        }),
      },
    },
  },
}));

// Mock SessionContent - capture props to verify correct data is passed
let capturedSessionContentProps: Record<string, unknown> = {};

vi.mock("./SessionContent", () => ({
  SessionContent: (props: Record<string, unknown>) => {
    capturedSessionContentProps = props;
    return <div data-testid="session-content">Session Content Mock</div>;
  },
}));

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

const mockTemplate = {
  id: "template-abc",
  answerTimeLimitSec: 120,
  blocks: [
    {
      language: "zh" as const,
      durationSec: 600,
      questions: [{ content: "Chinese Q1" }, { content: "Chinese Q2" }],
    },
    {
      language: "en" as const,
      durationSec: 600,
      questions: [{ content: "English Q1" }],
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
    mockCompleteBlockMutate.mockClear();
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
    expect(capturedSessionContentProps.onConnectionReady).toBeDefined();
  });

  test("renders block progress and timers in ANSWERING state", () => {
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

    // Should show block progress
    expect(screen.getByText("Block 1 of 2")).toBeInTheDocument();
    // Should show timers (calculated from timestamps)
    expect(screen.getByText(/Section:/)).toBeInTheDocument();
    expect(screen.getByText(/Answer:/)).toBeInTheDocument();
  });

  test("shows Time's Up banner in ANSWER_TIMEOUT_PAUSE state", () => {
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

    expect(screen.getByText("Time's Up!")).toBeInTheDocument();
    expect(
      screen.getByText("Please wrap up your answer now."),
    ).toBeInTheDocument();
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

  test("calls completeBlock mutation when entering BLOCK_COMPLETE_SCREEN", () => {
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

    expect(mockCompleteBlockMutate).toHaveBeenCalledWith({
      interviewId: "interview-123",
      blockNumber: 1,
    });
  });

  test("resumes from first incomplete block", () => {
    const resumeBlocks = [
      {
        id: "block-1",
        blockNumber: 1,
        language: "ZH" as const,
        status: "COMPLETED" as const,
      },
      {
        id: "block-2",
        blockNumber: 2,
        language: "EN" as const,
        status: "PENDING" as const,
      },
    ];

    render(
      <BlockSession
        interview={mockInterview}
        blocks={resumeBlocks}
        template={mockTemplate}
        state={baseState}
        dispatch={mockDispatch}
      />,
    );

    // The onConnectionReady callback should use the correct initial block index
    expect(capturedSessionContentProps.onConnectionReady).toBeDefined();
    // Call onConnectionReady and check dispatch was called with correct block index
    const onConnectionReady =
      capturedSessionContentProps.onConnectionReady as () => void;
    onConnectionReady();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "CONNECTION_READY",
      initialBlockIndex: 1, // Block 2 (index 1) since block 1 is completed
    });
  });
});
