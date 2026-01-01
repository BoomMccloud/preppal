// ABOUTME: Generates feedback for a single interview block
// ABOUTME: Self-contained function - fetches own data, queue-ready

import type { PrismaClient } from "@prisma/client";
import { callGeminiForBlockFeedback } from "./gemini-client";
import { transcriptBinaryToText } from "./transcript-utils";

/**
 * Generate feedback for a single block.
 *
 * Design: Self-contained function that fetches its own data.
 * This makes it trivial to migrate to a job queue later:
 *   - Synchronous: await generateBlockFeedback(db, blockId)
 *   - Queue:       await queue.send({ blockId }) → handler calls same function
 *
 * Idempotent: uses upsert to prevent duplicates.
 */
export async function generateBlockFeedback(
  db: PrismaClient,
  blockId: string,
): Promise<void> {
  console.log(`[BlockFeedback] Starting for block ${blockId}`);

  // Fetch block with transcript and interview context
  const block = await db.interviewBlock.findUnique({
    where: { id: blockId },
    include: {
      interview: {
        select: {
          jobDescriptionSnapshot: true,
          resumeSnapshot: true,
        },
      },
    },
  });

  if (!block) {
    console.error(`[BlockFeedback] Block ${blockId} not found`);
    return;
  }

  if (!block.transcript) {
    console.error(`[BlockFeedback] Block ${blockId} has no transcript`);
    return;
  }

  // Deserialize protobuf binary and format as text for Gemini
  let transcriptText: string;
  try {
    transcriptText = transcriptBinaryToText(block.transcript);
  } catch {
    // Invalid protobuf data (e.g., test mocks) - skip feedback generation
    console.warn(
      `[BlockFeedback] Block ${blockId} has invalid transcript format, skipping`,
    );
    return;
  }

  if (!transcriptText || transcriptText.trim().length === 0) {
    console.warn(`[BlockFeedback] Block ${blockId} has empty transcript`);
    return;
  }

  console.log(
    `[BlockFeedback] Transcript text length: ${transcriptText.length}`,
  );

  // Generate feedback using Gemini
  const feedback = await callGeminiForBlockFeedback(transcriptText, {
    jobDescription: block.interview.jobDescriptionSnapshot ?? "",
    resume: block.interview.resumeSnapshot ?? "",
  });

  // Upsert to handle race conditions (second call becomes no-op)
  await db.interviewBlockFeedback.upsert({
    where: { blockId },
    create: {
      blockId,
      summary: feedback.summary,
      strengths: feedback.strengths,
      areasForImprovement: feedback.areasForImprovement,
    },
    update: {}, // No-op if already exists
  });

  console.log(`[BlockFeedback] Generated feedback for block ${blockId}`);
}
