import { render, screen, act } from "@testing-library/react";
import { BlockSession } from "./BlockSession";
import { expect, test, vi, describe, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";

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
  useTranslations: () => (key: string, values?: Record<string, any>) => {
    if (key === "blockProgress")
      return `Block ${values?.current} of ${values?.total}`;
    if (key === "blockTimer")
      return `Section: ${values?.minutes}:${values?.seconds}`;
    if (key === "timer") return `Answer: ${values?.minutes}:${values?.seconds}`;
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

// Mock SessionContent
// We need to capture the props passed to it to trigger callbacks
let capturedSessionContentProps: any = {};

vi.mock("./SessionContent", () => ({
  SessionContent: (props: any) => {
    capturedSessionContentProps = props;
    return <div data-testid="session-content">Session Content Mock</div>;
  },
}));

// Mock Date for stable timer testing
vi.useFakeTimers();

// Mock timer utilities for controlled testing
const mockGetRemainingSeconds = vi.fn();

vi.mock("~/lib/countdown-timer", () => ({
  getRemainingSeconds: (...args: unknown[]) => mockGetRemainingSeconds(...args),
  isTimeUp: (startTime: number, limitSec: number, now: number) => {
    // Simple implementation for tests
    const elapsedMs = now - startTime;
    return elapsedMs >= limitSec * 1000;
  },
}));

// --- Types (Mocking them locally since Phase 1 might not be done) ---
// In a real scenario, these would import from Prisma/Zod types

type Interview = {
  id: string;
  templateId: string | null;
  isBlockBased: boolean;
};

type InterviewBlock = {
  id: string;
  blockNumber: number;
  language: "EN" | "ZH";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
};

type InterviewTemplate = {
  id: string;
  answerTimeLimitSec: number;
  blocks: {
    language: "en" | "zh";
    durationSec: number;
    questions: { content: string }[];
  }[];
};

// --- Test Data ---

const mockInterview: Interview = {
  id: "interview-123",
  templateId: "template-abc",
  isBlockBased: true,
};

const mockTemplate: InterviewTemplate = {
  id: "template-abc",
  answerTimeLimitSec: 10, // Short time for testing (10s)
  blocks: [
    {
      language: "zh",
      durationSec: 30, // 30 seconds for testing (longer than answer + pause)
      questions: [{ content: "Chinese Q1" }, { content: "Chinese Q2" }],
    },
    {
      language: "en",
      durationSec: 30,
      questions: [{ content: "English Q1" }],
    },
  ],
};

const mockBlocks: InterviewBlock[] = [
  { id: "block-1", blockNumber: 1, language: "ZH", status: "PENDING" },
  { id: "block-2", blockNumber: 2, language: "EN", status: "PENDING" },
];

describe("BlockSession", () => {
  beforeEach(() => {
    capturedSessionContentProps = {};
    mockPush.mockClear();
    mockCompleteBlockMutate.mockClear();
    mockGetRemainingSeconds.mockClear().mockReturnValue(10);
    vi.clearAllTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders initial WAITING_FOR_CONNECTION state correctly", () => {
    render(
      <BlockSession
        interview={mockInterview as any}
        blocks={mockBlocks as any}
        template={mockTemplate as any}
      />,
    );

    // Should render SessionContent
    expect(screen.getByTestId("session-content")).toBeInTheDocument();

    // Should have onConnectionReady callback
    expect(capturedSessionContentProps.onConnectionReady).toBeDefined();
  });

  test("transitions to ANSWERING state when connection is ready", async () => {
    mockGetRemainingSeconds.mockReturnValue(30); // Full block time

    render(
      <BlockSession
        interview={mockInterview as any}
        blocks={mockBlocks as any}
        template={mockTemplate as any}
      />,
    );

    // Trigger connection ready
    await act(async () => {
      if (capturedSessionContentProps.onConnectionReady) {
        capturedSessionContentProps.onConnectionReady();
      }
    });

    // Should show block progress (no question progress per spec)
    expect(screen.getByText("Block 1 of 2")).toBeInTheDocument();
  });

  test("handles answer timeout with 3-second pause", async () => {
    // Mock MediaStream
    const mockAudioTrack = { enabled: true };
    const mockStream = {
      getAudioTracks: () => [mockAudioTrack],
    };

    mockGetRemainingSeconds.mockReturnValue(10);

    render(
      <BlockSession
        interview={mockInterview as any}
        blocks={mockBlocks as any}
        template={mockTemplate as any}
      />,
    );

    // Trigger connection ready and provide media stream
    await act(async () => {
      if (capturedSessionContentProps.onMediaStream) {
        capturedSessionContentProps.onMediaStream(mockStream);
      }
      if (capturedSessionContentProps.onConnectionReady) {
        capturedSessionContentProps.onConnectionReady();
      }
    });

    // Initial state - mic should be enabled
    expect(mockAudioTrack.enabled).toBe(true);
    expect(screen.queryByText(/Time's Up!/)).not.toBeInTheDocument();

    // Advance time by 10+ seconds (answer timeout at 10s)
    await act(async () => {
      vi.advanceTimersByTime(10100); // 10.1 seconds
    });

    // Should show time's up banner and mute mic
    expect(screen.getByText(/Time's Up!/)).toBeInTheDocument();
    expect(mockAudioTrack.enabled).toBe(false);

    // Advance 3+ seconds (pause duration)
    await act(async () => {
      vi.advanceTimersByTime(3100); // 3.1 seconds
    });

    // Should resume to ANSWERING and unmute mic
    expect(screen.queryByText(/Time's Up!/)).not.toBeInTheDocument();
    expect(mockAudioTrack.enabled).toBe(true);
  });

  // Note: Complex timer-based state transitions are thoroughly tested in reducer.test.ts
  // These component tests focus on integration and basic functionality

  test("resumes from the first incomplete block", () => {
    const resumeBlocks: InterviewBlock[] = [
      {
        id: "block-1",
        blockNumber: 1,
        language: "ZH",
        status: "COMPLETED",
      },
      {
        id: "block-2",
        blockNumber: 2,
        language: "EN",
        status: "PENDING",
      },
    ];

    render(
      <BlockSession
        interview={mockInterview as any}
        blocks={resumeBlocks as any}
        template={mockTemplate as any}
      />,
    );

    // Should pass correct blockNumber to SessionContent (block 2)
    expect(capturedSessionContentProps.blockNumber).toBe(2);
  });

  // Note: Duplicate block completion prevention is tested via reducer unit tests
  // Testing this in component tests with fake timers is complex and unnecessary
});
