/**
 * BlockSession - Controlled component for block-based interviews
 * Receives state and dispatch from parent (page.tsx via useInterviewSession hook)
 * Manages block UI and completion side effects
 */
"use client";

import React from "react";
import { SessionContent } from "./SessionContent";
import { useTranslations } from "next-intl";
import type { InterviewBlock } from "@prisma/client";
import type { InterviewTemplate } from "~/lib/interview-templates/schema";
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

  const answerTimeLimit = template.answerTimeLimitSec;

  // Render: WAITING_FOR_CONNECTION
  if (state.status === "WAITING_FOR_CONNECTION") {
    return (
      <SessionContent
        key="waiting-for-connection"
        interviewId={interview.id}
        guestToken={guestToken}
        state={state}
        dispatch={dispatch}
        totalBlocks={blocks.length}
        answerTimeLimit={answerTimeLimit}
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

    // Active session view - timer/controls are now handled by SessionContent components
    return (
      <SessionContent
        key={`block-${blockIdx}`}
        interviewId={interview.id}
        guestToken={guestToken}
        state={state}
        dispatch={dispatch}
        totalBlocks={blocks.length}
        answerTimeLimit={answerTimeLimit}
      />
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
