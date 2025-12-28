/**
 * Interview Session Page - Routes to BlockSession or SessionContent based on interview type.
 */
"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { getTemplate } from "~/lib/interview-templates";
import { SessionContent } from "./SessionContent";
import { BlockSession } from "./BlockSession";

export default function InterviewSessionPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = React.use(params);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">{tCommon("loading")}</div>
      </div>
    );
  }

  // Standard interview - use existing SessionContent
  if (!interview?.isBlockBased || !interview.templateId) {
    return <SessionContent interviewId={interviewId} guestToken={token} />;
  }

  // Block-based interview - fetch template and render BlockSession
  const template = getTemplate(interview.templateId);

  if (!template) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-600">
          <h1 className="text-xl font-bold">Template Not Found</h1>
          <p className="mt-2">Template ID: {interview.templateId}</p>
        </div>
      </div>
    );
  }

  // Ensure blocks exist
  if (!interview.blocks || interview.blocks.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-600">
          <h1 className="text-xl font-bold">No Blocks Found</h1>
          <p className="mt-2">This interview has no blocks configured.</p>
        </div>
      </div>
    );
  }

  return (
    <BlockSession
      interview={interview}
      blocks={interview.blocks}
      template={template}
      guestToken={token}
    />
  );
}
