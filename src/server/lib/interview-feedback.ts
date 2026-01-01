// ABOUTME: Generates holistic feedback for entire interview
// ABOUTME: Self-contained function - fetches own data, queue-ready

import type { PrismaClient } from "@prisma/client";
import { callGeminiForInterviewFeedback } from "./gemini-client";

/**
 * Check if all blocks have feedback. If yes, generate interview feedback.
 *
 * Design: Self-contained function that fetches its own data.
 * Only requires interviewId - trivial to call from queue handler.
 *
 * Idempotent: checks if feedback exists before generating.
 */
export async function maybeGenerateInterviewFeedback(
  db: PrismaClient,
  interviewId: string,
): Promise<void> {
  console.log(`[InterviewFeedback] Checking ${interviewId}`);

  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: {
      blocks: {
        include: { feedback: true },
        orderBy: { blockNumber: "asc" },
      },
      feedback: { select: { id: true } },
    },
  });

  if (!interview) {
    console.error(`[InterviewFeedback] Interview ${interviewId} not found`);
    return;
  }

  // Already has interview feedback - skip
  if (interview.feedback) {
    console.log(`[InterviewFeedback] Already exists for ${interviewId}`);
    return;
  }

  // Check if all blocks have feedback
  const allBlocksHaveFeedback = interview.blocks.every(
    (b) => b.feedback !== null,
  );

  if (!allBlocksHaveFeedback) {
    const complete = interview.blocks.filter((b) => b.feedback).length;
    console.log(
      `[InterviewFeedback] ${complete}/${interview.blocks.length} blocks have feedback - waiting`,
    );
    return;
  }

  // All blocks complete - generate interview feedback
  console.log(
    `[InterviewFeedback] All blocks complete, generating for ${interviewId}`,
  );

  const blockFeedbacks = interview.blocks.map((b) => ({
    summary: b.feedback!.summary,
    strengths: b.feedback!.strengths,
    areasForImprovement: b.feedback!.areasForImprovement,
  }));

  const feedback = await callGeminiForInterviewFeedback(blockFeedbacks, {
    jobDescription: interview.jobDescriptionSnapshot ?? "",
    resume: interview.resumeSnapshot ?? "",
  });

  // Use transaction to update feedback and status atomically
  await db.$transaction([
    db.interviewFeedback.upsert({
      where: { interviewId },
      create: {
        interviewId,
        summary: feedback.summary,
        strengths: feedback.strengths,
        contentAndStructure: feedback.contentAndStructure,
        communicationAndDelivery: feedback.communicationAndDelivery,
        presentation: feedback.presentation,
      },
      update: {}, // No-op if exists
    }),
    db.interview.update({
      where: { id: interviewId },
      data: { status: "COMPLETED" },
    }),
  ]);

  console.log(`[InterviewFeedback] Generated and saved for ${interviewId}`);
}
