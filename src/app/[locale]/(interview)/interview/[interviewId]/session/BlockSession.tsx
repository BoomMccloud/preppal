"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "~/i18n/navigation";
import { api } from "~/trpc/react";
import { SessionContent } from "./SessionContent";
import { useTranslations } from "next-intl";
import type { InterviewBlock } from "@prisma/client";
import type { InterviewTemplate } from "~/lib/interview-templates/schema";
import { getRemainingSeconds, isTimeUp } from "~/lib/countdown-timer";

type Phase = "active" | "transition";

const IS_DEV = process.env.NODE_ENV === "development";

interface BlockSessionProps {
  interview: {
    id: string;
    isBlockBased: boolean;
    templateId: string | null;
  };
  blocks: InterviewBlock[];
  template: InterviewTemplate;
  guestToken?: string;
}

export function BlockSession({
  interview,
  blocks,
  template,
  guestToken,
}: BlockSessionProps) {
  const router = useRouter();
  const t = useTranslations("interview.blockSession");
  const completeBlock = api.interview.completeBlock.useMutation();

  // 1. Resumption Logic: Find first block that isn't completed
  const initialBlockIndex = blocks.findIndex((b) => b.status !== "COMPLETED");
  const [blockIndex, setBlockIndex] = useState(
    initialBlockIndex === -1 ? 0 : initialBlockIndex,
  );

  const [phase, setPhase] = useState<Phase>("active");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const block = blocks[blockIndex];
  const templateBlock = template.blocks[blockIndex];

  // Use shorter time limit in dev for easier testing
  const answerTimeLimit = IS_DEV ? 10 : template.answerTimeLimitSec;

  // Count-up approach: store start times, calculate remaining on render
  const [blockStartTime, setBlockStartTime] = useState(() => Date.now());
  const [answerStartTime, setAnswerStartTime] = useState(() => Date.now());

  // Single tick counter to trigger re-renders (one interval for everything)
  const [tick, setTick] = useState(0);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Track if timeouts have been handled to prevent duplicate triggers
  const answerTimeoutHandled = useRef(false);
  const blockEndHandled = useRef(false);

  const isLastBlock = blockIndex === blocks.length - 1;
  const blockDuration = templateBlock?.durationSec ?? 0;

  // Calculate remaining times from start times (derived state)
  const now = Date.now();
  const blockTimeRemaining = getRemainingSeconds(
    blockStartTime,
    blockDuration,
    now,
  );
  const answerTimeRemaining = isMicMuted
    ? 0
    : getRemainingSeconds(answerStartTime, answerTimeLimit, now);

  // Reset block timer when block changes
  useEffect(() => {
    setBlockStartTime(Date.now());
    blockEndHandled.current = false;
  }, [blockIndex]);

  // Reset answer timer when question changes
  useEffect(() => {
    setAnswerStartTime(Date.now());
    setIsMicMuted(false);
    answerTimeoutHandled.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
  }, [currentQuestionIndex]);

  // Single interval for re-rendering - the only interval we need
  useEffect(() => {
    if (phase !== "active") return;

    const intervalId = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [phase]);

  // Handle answer timeout
  const handleAnswerTimeout = useCallback(() => {
    if (answerTimeoutHandled.current) return;
    answerTimeoutHandled.current = true;

    console.log("Time's up for answer!");
    // Mute microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
    setIsMicMuted(true);

    // Re-enable mic after brief pause and move to next question
    setTimeout(() => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      setIsMicMuted(false);
      setCurrentQuestionIndex((prev) => prev + 1);
    }, 3000);
  }, []);

  // Check for answer timeout on each tick
  useEffect(() => {
    if (
      phase === "active" &&
      !isMicMuted &&
      !answerTimeoutHandled.current &&
      isTimeUp(answerStartTime, answerTimeLimit, Date.now())
    ) {
      handleAnswerTimeout();
    }
  }, [
    tick,
    phase,
    isMicMuted,
    answerStartTime,
    answerTimeLimit,
    handleAnswerTimeout,
  ]);

  // Handle block completion
  const handleBlockEnd = useCallback(async () => {
    if (!block || blockEndHandled.current) return;
    blockEndHandled.current = true;

    await completeBlock.mutateAsync({
      interviewId: interview.id,
      blockNumber: block.blockNumber,
    });

    if (isLastBlock) {
      const feedbackUrl = guestToken
        ? `/interview/${interview.id}/feedback?token=${guestToken}`
        : `/interview/${interview.id}/feedback`;
      router.push(feedbackUrl);
    } else {
      setPhase("transition");
    }
  }, [block, completeBlock, interview.id, isLastBlock, guestToken, router]);

  // Check for block timeout on each tick
  useEffect(() => {
    if (
      phase === "active" &&
      !blockEndHandled.current &&
      isTimeUp(blockStartTime, blockDuration, Date.now())
    ) {
      console.log("Block time limit reached!");
      void handleBlockEnd();
    }
  }, [tick, phase, blockStartTime, blockDuration, handleBlockEnd]);

  // Transition screen between blocks
  if (phase === "transition") {
    const nextBlockIndex = blockIndex + 1;
    const nextTemplateBlock = template.blocks[nextBlockIndex];

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("blockComplete", { number: blockIndex + 1 })}
          </h2>

          <div className="rounded-md bg-blue-50 p-4">
            <div className="mb-2 text-lg font-medium text-blue-800">
              {t("languageSwitchTitle")}
            </div>
            <p className="text-blue-600">
              {t("nextBlockLanguage", {
                language:
                  nextTemplateBlock?.language === "en"
                    ? t("english")
                    : t("chinese"),
              })}
            </p>
          </div>

          <div className="text-gray-600">
            <p>
              {t("blockDetails", {
                questions: nextTemplateBlock?.questions.length ?? 0,
                minutes: Math.floor((nextTemplateBlock?.durationSec ?? 0) / 60),
              })}
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => {
                setBlockIndex((i) => i + 1);
                setPhase("active");
                setCurrentQuestionIndex(0);
                // Reset timers for new block
                setAnswerStartTime(Date.now());
                answerTimeoutHandled.current = false;
              }}
              className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("continue")}
            </button>
            {/* Optional "Take a break" button could go here */}
          </div>
        </div>
      </div>
    );
  }

  if (!block || !templateBlock) {
    return <div>Error: Invalid block configuration</div>;
  }

  // Active session view
  return (
    <>
      {/* Progress & Timer overlay */}
      <div className="pointer-events-none fixed top-20 right-4 z-50 flex flex-col items-end space-y-2">
        <div className="rounded-full border border-gray-100 bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-md backdrop-blur-sm">
          {t("blockProgress", {
            current: blockIndex + 1,
            total: blocks.length,
          })}
        </div>
        <div
          className={`rounded-full px-4 py-2 text-sm font-bold shadow-md backdrop-blur-sm transition-colors duration-300 ${
            blockTimeRemaining < 60
              ? "animate-pulse bg-orange-500 text-white"
              : "border border-gray-100 bg-white/90 text-gray-900"
          }`}
        >
          {t("blockTimer", {
            minutes: Math.floor(blockTimeRemaining / 60),
            seconds: String(blockTimeRemaining % 60).padStart(2, "0"),
          })}
        </div>
        <div className="rounded-full border border-gray-100 bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-md backdrop-blur-sm">
          {t("questionProgress", {
            current: currentQuestionIndex + 1,
            total: templateBlock.questions.length,
          })}
        </div>
        <div
          className={`rounded-full px-4 py-2 text-sm font-bold shadow-md backdrop-blur-sm transition-colors duration-300 ${
            answerTimeRemaining < 30
              ? "animate-pulse bg-red-500 text-white"
              : "border border-gray-100 bg-white/90 text-gray-900"
          }`}
        >
          {t("timer", {
            minutes: Math.floor(answerTimeRemaining / 60),
            seconds: String(answerTimeRemaining % 60).padStart(2, "0"),
          })}
        </div>
      </div>

      {/* Time's up banner */}
      {isMicMuted && (
        <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="rounded-lg border border-yellow-400 bg-yellow-50 px-8 py-6 text-center shadow-xl">
            <div className="mb-2 text-3xl">⏱️</div>
            <h3 className="mb-1 text-xl font-bold text-yellow-800">
              {t("timesUpTitle")}
            </h3>
            <p className="text-yellow-700">{t("timesUpMessage")}</p>
          </div>
        </div>
      )}

      <SessionContent
        key={`block-${blockIndex}`}
        interviewId={interview.id}
        guestToken={guestToken}
        onSessionEnded={handleBlockEnd}
        disableStatusRedirect={true}
        blockNumber={block.blockNumber}
        onMediaStream={(stream) => {
          mediaStreamRef.current = stream;
        }}
      />
    </>
  );
}
