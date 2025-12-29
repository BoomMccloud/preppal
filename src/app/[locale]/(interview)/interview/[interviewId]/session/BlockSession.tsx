"use client";

import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "~/i18n/navigation";
import { api } from "~/trpc/react";
import { SessionContent } from "./SessionContent";
import { useTranslations } from "next-intl";
import type { InterviewBlock } from "@prisma/client";
import type { InterviewTemplate } from "~/lib/interview-templates/schema";
import { getRemainingSeconds } from "~/lib/countdown-timer";
import { sessionReducer } from "./reducer";
import { TIMER_CONFIG } from "./constants";
import type { SessionState, SessionEvent, ReducerContext } from "./types";

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

  // Resumption Logic: Find first block that isn't completed
  const initialBlockIndex = blocks.findIndex((b) => b.status !== "COMPLETED");
  const startBlockIndex = initialBlockIndex === -1 ? 0 : initialBlockIndex;

  // Use shorter time limit in dev for easier testing
  const answerTimeLimit = IS_DEV ? 10 : template.answerTimeLimitSec;

  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Wrap the pure reducer in a useCallback closure that injects configuration
  // v5: Extract state from ReducerResult (commands are handled in SessionContent)
  const reducer = useCallback(
    (state: SessionState, event: SessionEvent) => {
      // Get blockIndex from current state
      let currentBlockIndex = startBlockIndex;
      if (
        state.status === "ANSWERING" ||
        state.status === "ANSWER_TIMEOUT_PAUSE"
      ) {
        currentBlockIndex = state.blockIndex;
      } else if (state.status === "BLOCK_COMPLETE_SCREEN") {
        currentBlockIndex = state.completedBlockIndex;
      }

      const currentBlock = blocks[currentBlockIndex];
      const currentTemplateBlock = template.blocks[currentBlockIndex];

      // Validate: fail fast if blockIndex is invalid
      if (!currentBlock || !currentTemplateBlock) {
        console.error("[BlockSession] Invalid blockIndex:", {
          blockIndex: currentBlockIndex,
          totalBlocks: blocks.length,
          state,
        });
        // Return state unchanged to prevent crash
        return state;
      }

      const context: ReducerContext = {
        blockDuration: currentTemplateBlock.durationSec,
        answerTimeLimit: answerTimeLimit,
        totalBlocks: blocks.length,
      };

      // v5: sessionReducer returns ReducerResult { state, commands }
      // Extract state for BlockSession (commands handled in SessionContent)
      const result = sessionReducer(state, event, context);
      return result.state;
    },
    [blocks, template.blocks, answerTimeLimit, startBlockIndex],
  );

  const [state, dispatch] = useReducer(reducer, {
    status: "WAITING_FOR_CONNECTION",
    connectionState: "initializing",
    transcript: [],
    pendingUser: "",
    pendingAI: "",
    elapsedTime: 0,
    error: null,
    isAiSpeaking: false,
  });

  // Tick counter to force re-renders for timer display updates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tick, setTick] = useState(0);

  // Standard React dispatch - interval for TICK events (answer/block timers)
  useEffect(() => {
    const interval: NodeJS.Timeout = setInterval(() => {
      dispatch({ type: "TICK" });
      setTick((t) => t + 1); // Force re-render for timer display
    }, TIMER_CONFIG.TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // v5: Add TIMER_TICK interval for global elapsed time
  useEffect(() => {
    const interval: NodeJS.Timeout = setInterval(() => {
      dispatch({ type: "TIMER_TICK" });
    }, 1000); // 1 second for elapsed time
    return () => clearInterval(interval);
  }, []);

  // Handler for when Gemini connection is ready
  const handleConnectionReady = useCallback(() => {
    dispatch({
      type: "CONNECTION_READY",
      initialBlockIndex: startBlockIndex,
    });
  }, [startBlockIndex]);

  // Side Effect: Sync Block Completion to DB
  const lastCompletedRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.status === "BLOCK_COMPLETE_SCREEN") {
      const blockIdx = state.completedBlockIndex;

      // Guard: prevent duplicate calls on re-render or Strict Mode
      if (lastCompletedRef.current === blockIdx) {
        return;
      }
      lastCompletedRef.current = blockIdx;

      const block = blocks[blockIdx];
      if (!block) {
        console.error(
          "[BlockSession] Invalid block index for completion:",
          blockIdx,
        );
        return;
      }

      completeBlock.mutate({
        interviewId: interview.id,
        blockNumber: block.blockNumber,
      });
    }
  }, [state, blocks, interview.id, completeBlock]);

  // Side Effect: Navigate to feedback when interview is complete
  useEffect(() => {
    if (state.status === "INTERVIEW_COMPLETE") {
      const feedbackUrl = guestToken
        ? `/interview/${interview.id}/feedback?token=${guestToken}`
        : `/interview/${interview.id}/feedback`;
      router.push(feedbackUrl);
    }
  }, [state.status, interview.id, guestToken, router]);

  // Side Effect: Control microphone based on ANSWER_TIMEOUT_PAUSE state
  useEffect(() => {
    if (state.status === "ANSWER_TIMEOUT_PAUSE") {
      // Mute microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    } else if (state.status === "ANSWERING") {
      // Unmute microphone
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
    }
  }, [state.status]);

  // Render: WAITING_FOR_CONNECTION
  if (state.status === "WAITING_FOR_CONNECTION") {
    return (
      <SessionContent
        key="waiting-for-connection"
        interviewId={interview.id}
        guestToken={guestToken}
        onSessionEnded={() => {
          // This shouldn't be called in waiting state, but provide a no-op
          console.warn(
            "[BlockSession] onSessionEnded called in WAITING_FOR_CONNECTION state",
          );
        }}
        disableStatusRedirect={true}
        blockNumber={blocks[startBlockIndex]?.blockNumber ?? 1}
        onMediaStream={(stream) => {
          mediaStreamRef.current = stream;
        }}
        onConnectionReady={handleConnectionReady}
      />
    );
  }

  // Render: BLOCK_COMPLETE_SCREEN (transition between blocks)
  if (state.status === "BLOCK_COMPLETE_SCREEN") {
    const nextBlockIndex = state.completedBlockIndex + 1;
    const nextTemplateBlock = template.blocks[nextBlockIndex];

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("blockComplete", { number: state.completedBlockIndex + 1 })}
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
                dispatch({ type: "USER_CLICKED_CONTINUE" });
              }}
              className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("continue")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: ANSWERING or ANSWER_TIMEOUT_PAUSE
  if (state.status === "ANSWERING" || state.status === "ANSWER_TIMEOUT_PAUSE") {
    const blockIdx = state.blockIndex;
    const block = blocks[blockIdx];
    const templateBlock = template.blocks[blockIdx];

    if (!block || !templateBlock) {
      return <div>Error: Invalid block configuration</div>;
    }

    // Calculate remaining times from state timestamps
    const now = Date.now();
    const blockTimeRemaining = getRemainingSeconds(
      state.blockStartTime,
      templateBlock.durationSec,
      now,
    );
    const answerTimeRemaining =
      state.status === "ANSWER_TIMEOUT_PAUSE"
        ? 0
        : getRemainingSeconds(state.answerStartTime, answerTimeLimit, now);

    const isMicMuted = state.status === "ANSWER_TIMEOUT_PAUSE";

    // Active session view
    return (
      <>
        {/* Progress & Timer overlay */}
        <div className="pointer-events-none fixed top-20 right-4 z-50 flex flex-col items-end space-y-2">
          <div className="rounded-full border border-gray-100 bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-md backdrop-blur-sm">
            {t("blockProgress", {
              current: blockIdx + 1,
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
          key={`block-${blockIdx}`}
          interviewId={interview.id}
          guestToken={guestToken}
          onSessionEnded={() => {
            // Block ended manually via SessionContent (shouldn't happen with reducer)
            console.warn(
              "[BlockSession] onSessionEnded called during ANSWERING/PAUSE",
            );
          }}
          disableStatusRedirect={true}
          blockNumber={block.blockNumber}
          onMediaStream={(stream) => {
            mediaStreamRef.current = stream;
          }}
          onConnectionReady={handleConnectionReady}
        />
      </>
    );
  }

  // Render: INTERVIEW_COMPLETE (shouldn't be visible due to navigation effect, but just in case)
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900">
          Interview Complete!
        </h2>
        <p className="text-gray-600">Redirecting to feedback...</p>
      </div>
    </div>
  );
}
