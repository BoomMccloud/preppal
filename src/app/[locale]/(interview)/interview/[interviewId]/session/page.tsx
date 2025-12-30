/**
 * Interview Session Page - Routes to BlockSession or SessionContent based on interview type.
 */
"use client";

import React, { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { getTemplate } from "~/lib/interview-templates";
import { SessionContent } from "./SessionContent";
import { BlockSession } from "./BlockSession";
import { useInterviewSession } from "./hooks/useInterviewSession";
import type { ReducerContext } from "./types";
import type { InterviewBlock } from "@prisma/client";
import type { InterviewTemplate } from "~/lib/interview-templates/schema";

// Type for interview from query (has extra fields like blocks, isGuest)
interface InterviewWithBlocks {
  id: string;
  status: string;
  blocks: InterviewBlock[];
}

// Block-based interview with state management
function BlockInterviewWithState({
  interview,
  blocks,
  template,
  token,
}: {
  interview: InterviewWithBlocks;
  blocks: InterviewBlock[];
  template: InterviewTemplate;
  token?: string;
}) {
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Find first incomplete block
  const initialBlockIndex = blocks.findIndex((b) => b.status !== "COMPLETED");
  const startBlockIndex = initialBlockIndex === -1 ? 0 : initialBlockIndex;

  // Calculate context (simplified - no per-block duration)
  const context: ReducerContext = {
    answerTimeLimit: template.answerTimeLimitSec,
    totalBlocks: blocks.length,
  };

  const { state, dispatch } = useInterviewSession(interview.id, token, {
    blockNumber: blocks[startBlockIndex]?.blockNumber ?? 1,
    context,
    onMediaStream: (stream) => {
      mediaStreamRef.current = stream;
    },
  });

  // Stop media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  return (
    <BlockSession
      interview={interview}
      blocks={blocks}
      template={template}
      guestToken={token}
      state={state}
      dispatch={dispatch}
    />
  );
}

// Standard interview with state management
function StandardInterviewWithState({
  interview,
  token,
}: {
  interview: { id: string };
  token?: string;
}) {
  const { state, dispatch } = useInterviewSession(interview.id, token);

  return (
    <SessionContent
      interviewId={interview.id}
      guestToken={token}
      state={state}
      dispatch={dispatch}
    />
  );
}

export default function InterviewSessionPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? undefined;
  const tCommon = useTranslations("common");

  // Query interview with blocks for routing decision
  const { data: interview, isLoading } = api.interview.getById.useQuery(
    {
      id: interviewId,
      token,
      includeBlocks: true,
    },
    {
      retry: false,
    },
  );

  // Redirect if already completed
  useEffect(() => {
    if (interview?.status === "COMPLETED") {
      const feedbackUrl = token
        ? `/interview/${interviewId}/feedback?token=${token}`
        : `/interview/${interviewId}/feedback`;
      router.push(feedbackUrl);
    }
  }, [interview?.status, interviewId, token, router]);

  // Loading state
  if (isLoading || interview?.status === "COMPLETED") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">{tCommon("loading")}</div>
      </div>
    );
  }

  // Interview not found
  if (!interview) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-danger text-center">
          <h1 className="text-xl font-bold">Interview Not Found</h1>
        </div>
      </div>
    );
  }

  // Block-based interview
  if (interview.isBlockBased && interview.templateId) {
    const template = getTemplate(interview.templateId);

    if (!template) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-danger text-center">
            <h1 className="text-xl font-bold">Template Not Found</h1>
            <p className="mt-2">Template ID: {interview.templateId}</p>
          </div>
        </div>
      );
    }

    if (!interview.blocks || interview.blocks.length === 0) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-danger text-center">
            <h1 className="text-xl font-bold">No Blocks Found</h1>
            <p className="mt-2">This interview has no blocks configured.</p>
          </div>
        </div>
      );
    }

    return (
      <BlockInterviewWithState
        interview={interview}
        blocks={interview.blocks}
        template={template}
        token={token}
      />
    );
  }

  // Standard interview
  return <StandardInterviewWithState interview={interview} token={token} />;
}
