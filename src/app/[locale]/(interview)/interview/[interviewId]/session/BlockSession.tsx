/**
 * BlockSession - Controlled component for block-based interviews
 * Receives state and dispatch from parent (page.tsx via useInterviewSession hook)
 * Manages block UI and completion side effects
 */
"use client";

import { useCallback } from "react";
import { SessionContent } from "./SessionContent";
import { useTranslations } from "next-intl";
import type { InterviewBlock } from "@prisma/client";
import type { InterviewTemplate } from "~/lib/interview-templates/schema";
import { getRemainingSeconds } from "~/lib/countdown-timer";
import type { SessionState, SessionEvent } from "./types";
import type { Dispatch } from "react";

interface BlockSessionProps {
  interview: { id: string; status: string };
  blocks: InterviewBlock[];
  template: InterviewTemplate;
  guestToken?: string;
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
}

export function BlockSession({
  interview,
  blocks,
  template,
  guestToken,
  state,
  dispatch,
}: BlockSessionProps) {
  const t = useTranslations("interview.blockSession");

  // Resumption Logic: Find first block that isn't completed
  const initialBlockIndex = blocks.findIndex((b) => b.status !== "COMPLETED");
  const startBlockIndex = initialBlockIndex === -1 ? 0 : initialBlockIndex;

  const answerTimeLimit = template.answerTimeLimitSec;

  // Handler for when Gemini connection is ready
  const handleConnectionReady = useCallback(() => {
    dispatch({
      type: "CONNECTION_READY",
      initialBlockIndex: startBlockIndex,
    });
  }, [startBlockIndex, dispatch]);

  // Render: WAITING_FOR_CONNECTION
  if (state.status === "WAITING_FOR_CONNECTION") {
    return (
      <SessionContent
        key="waiting-for-connection"
        interviewId={interview.id}
        guestToken={guestToken}
        state={state}
        dispatch={dispatch}
        onConnectionReady={handleConnectionReady}
      />
    );
  }

  // Render: BLOCK_COMPLETE_SCREEN (transition between blocks)
  if (state.status === "BLOCK_COMPLETE_SCREEN") {
    const nextBlockIndex = state.completedBlockIndex + 1;
    const nextTemplateBlock = template.blocks[nextBlockIndex];

    return (
      <div className="bg-secondary flex min-h-screen items-center justify-center">
        <div className="bg-primary w-full max-w-lg space-y-6 rounded-lg p-8 text-center shadow-lg">
          <h2 className="text-primary-text text-2xl font-bold">
            {t("blockComplete", { number: state.completedBlockIndex + 1 })}
          </h2>

          <div className="bg-info/10 rounded-md p-4">
            <div className="text-info mb-2 text-lg font-medium">
              {t("languageSwitchTitle")}
            </div>
            <p className="text-info">
              {t("nextBlockLanguage", {
                language:
                  nextTemplateBlock?.language === "en"
                    ? t("english")
                    : t("chinese"),
              })}
            </p>
          </div>

          <div className="text-secondary-text">
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
              className="bg-info hover:bg-info/80 rounded-full px-8 py-3 font-semibold text-white transition-colors"
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
          <div className="border-secondary bg-primary/90 text-primary-text rounded-full border px-4 py-2 text-sm font-medium shadow-md backdrop-blur-sm">
            {t("blockProgress", {
              current: blockIdx + 1,
              total: blocks.length,
            })}
          </div>
          <div
            className={`rounded-full px-4 py-2 text-sm font-bold shadow-md backdrop-blur-sm transition-colors duration-300 ${
              blockTimeRemaining < 60
                ? "bg-warning animate-pulse text-white"
                : "border-secondary bg-primary/90 text-primary-text border"
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
                ? "bg-danger animate-pulse text-white"
                : "border-secondary bg-primary/90 text-primary-text border"
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
            <div className="border-warning bg-warning/10 rounded-lg border px-8 py-6 text-center shadow-xl">
              <div className="mb-2 text-3xl">⏱️</div>
              <h3 className="text-warning mb-1 text-xl font-bold">
                {t("timesUpTitle")}
              </h3>
              <p className="text-warning">{t("timesUpMessage")}</p>
            </div>
          </div>
        )}

        <SessionContent
          key={`block-${blockIdx}`}
          interviewId={interview.id}
          guestToken={guestToken}
          state={state}
          dispatch={dispatch}
          onConnectionReady={handleConnectionReady}
        />
      </>
    );
  }

  // Render: INTERVIEW_COMPLETE (shouldn't be visible due to navigation effect, but just in case)
  return (
    <div className="bg-secondary flex min-h-screen items-center justify-center">
      <div className="bg-primary w-full max-w-lg space-y-6 rounded-lg p-8 text-center shadow-lg">
        <h2 className="text-primary-text text-2xl font-bold">
          Interview Complete!
        </h2>
        <p className="text-secondary-text">Redirecting to feedback...</p>
      </div>
    </div>
  );
}
