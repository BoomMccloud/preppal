import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { BlockSession } from "./BlockSession";
import { expect, test, vi, describe, beforeEach, afterEach } from "vitest";
import type { ComponentProps } from "react";

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
    if (key === "questionProgress")
      return `Question ${values?.current} of ${values?.total}`;
    if (key === "timer") return `Answer: ${values?.minutes}:${values?.seconds}`;
    if (key === "blockComplete") return `Block ${values?.number} Complete`;
    if (key === "nextBlockLanguage")
      return `next block will be in ${values?.language}`;
    if (key === "english") return "English";
    if (key === "chinese") return "Chinese";
    if (key === "timesUpTitle") return "Time's up for this answer!";
    if (key === "continue") return "Continue";
    return key;
  },
}));

// Mock TRPC
const mockCompleteBlockMutateAsync = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    interview: {
      completeBlock: {
        useMutation: () => ({
          mutateAsync: mockCompleteBlockMutateAsync,
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

// Mock Date for stable timer testing if needed, but we'll use fake timers
vi.useFakeTimers();

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
  answerTimeLimitSec: 10, // Short time for testing
  blocks: [
    {
      language: "zh",
      durationSec: 600,
      questions: [{ content: "Chinese Q1" }, { content: "Chinese Q2" }],
    },
    {
      language: "en",
      durationSec: 600,
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
    mockCompleteBlockMutateAsync.mockClear();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders initial block state correctly", () => {
    render(
      <BlockSession
        interview={mockInterview as any}
        blocks={mockBlocks as any}
        template={mockTemplate as any}
      />,
    );

    // Check overlay info
    expect(screen.getByText("Block 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();

    // Check SessionContent rendered
    expect(screen.getByTestId("session-content")).toBeInTheDocument();
  });

  test("timer decrements and handles time's up", async () => {
    // Mock MediaStream
    const mockAudioTrack = { enabled: true };
    const mockStream = {
      getAudioTracks: () => [mockAudioTrack],
    };

    render(
      <BlockSession
        interview={mockInterview as any}
        blocks={mockBlocks as any}
        template={mockTemplate as any}
      />,
    );

    // Simulate SessionContent passing up the stream
    act(() => {
      if (capturedSessionContentProps.onMediaStream) {
        capturedSessionContentProps.onMediaStream(mockStream);
      }
    });

    // Advance time close to limit (limit is 10s)
    // Initial render might take a tick
    act(() => {
      vi.advanceTimersByTime(9000);
    });

    // Should still be active
    expect(mockAudioTrack.enabled).toBe(true);
    expect(screen.queryByText(/Time's up/)).not.toBeInTheDocument();

    // Advance past limit
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // NOW: Time's up
    expect(mockAudioTrack.enabled).toBe(false); // Mic muted
    expect(screen.getByText(/Time's up/)).toBeInTheDocument();

    // Advance 3s pause
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should be next question and unmutes
    expect(mockAudioTrack.enabled).toBe(true);
    expect(screen.queryByText(/Time's up/)).not.toBeInTheDocument();
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
  });

  test("handles block completion and transition", async () => {
    render(
      <BlockSession
        interview={mockInterview as any}
        blocks={mockBlocks as any}
        template={mockTemplate as any}
      />,
    );

    // Simulate block end (triggered by SessionContent)
    await act(async () => {
      if (capturedSessionContentProps.onSessionEnded) {
        await capturedSessionContentProps.onSessionEnded();
      }
    });

    // Should call mutation
    expect(mockCompleteBlockMutateAsync).toHaveBeenCalledWith({
      interviewId: "interview-123",
      blockNumber: 1,
    });

    // Should show transition screen
    expect(screen.getByText("Block 1 Complete")).toBeInTheDocument();
    expect(
      screen.getByText("next block will be in", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText(/English/)).toBeInTheDocument();

    // Click continue
    const continueBtn = screen.getByText("Continue");
    fireEvent.click(continueBtn);

    // Should show Block 2
    expect(screen.getByText("Block 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
  });

  test("redirects to feedback after last block", async () => {
    render(
      <BlockSession
        interview={mockInterview as any}
        blocks={mockBlocks as any}
        template={mockTemplate as any}
      />,
    );

    // Fast forward to Block 2
    // 1. Finish Block 1
    await act(async () => {
      if (capturedSessionContentProps.onSessionEnded) {
        await capturedSessionContentProps.onSessionEnded();
      }
    });

    // 2. Click Continue
    fireEvent.click(screen.getByText("Continue"));

    // 3. Finish Block 2
    await act(async () => {
      // Need to re-capture props because SessionContent re-rendered with new key
      if (capturedSessionContentProps.onSessionEnded) {
        await capturedSessionContentProps.onSessionEnded();
      }
    });

    // Should call mutation for block 2
    expect(mockCompleteBlockMutateAsync).toHaveBeenCalledWith({
      interviewId: "interview-123",
      blockNumber: 2,
    });

    // Should redirect
    expect(mockPush).toHaveBeenCalledWith("/interview/interview-123/feedback");
  });

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

    // Should start at Block 2
    expect(screen.getByText("Block 2 of 2")).toBeInTheDocument();
    // Block 2 template has 1 question
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
  });
});
