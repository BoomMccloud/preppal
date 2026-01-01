/**
 * Interview Worker Router
 *
 * tRPC procedures called exclusively by the Cloudflare Worker.
 * These handle interview context retrieval, transcript submission, and feedback storage.
 */
import { z } from "zod";
import { createTRPCRouter, workerProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { DURATION_MS } from "~/server/lib/interview-access";
import { getTemplate } from "~/lib/interview-templates";
import { buildBlockPrompt } from "~/lib/interview-templates/prompt";
import { generateBlockFeedback } from "~/server/lib/block-feedback";
import { maybeGenerateInterviewFeedback } from "~/server/lib/interview-feedback";

export const interviewWorkerRouter = createTRPCRouter({
  getContext: workerProcedure
    .input(
      z.object({
        interviewId: z.string(),
        blockNumber: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const interview = await ctx.db.interview.findUnique({
        where: { id: input.interviewId },
        select: {
          jobDescriptionSnapshot: true,
          resumeSnapshot: true,
          persona: true,
          duration: true,
          isBlockBased: true,
          templateId: true,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // Standard interview (no block) - return existing behavior
      if (!interview.isBlockBased || input.blockNumber === undefined) {
        return {
          jobDescription: interview.jobDescriptionSnapshot ?? "",
          resume: interview.resumeSnapshot ?? "",
          persona: interview.persona ?? "professional interviewer",
          durationMs: DURATION_MS[interview.duration],
          systemPrompt: undefined,
          language: undefined,
        };
      }

      // Block-based interview - get template and build block-specific prompt
      const template = interview.templateId
        ? getTemplate(interview.templateId)
        : null;

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview template not found",
        });
      }

      const templateBlock = template.blocks[input.blockNumber - 1]; // 1-indexed
      if (!templateBlock) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Block ${input.blockNumber} not found in template`,
        });
      }

      // Mark block as IN_PROGRESS and set startedAt
      await ctx.db.interviewBlock.update({
        where: {
          interviewId_blockNumber: {
            interviewId: input.interviewId,
            blockNumber: input.blockNumber,
          },
        },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      // Build block-specific system prompt
      const systemPrompt = buildBlockPrompt({
        blockNumber: input.blockNumber,
        totalBlocks: template.blocks.length,
        language: templateBlock.language,
        question: templateBlock.question.content,
        answerTimeLimitSec: template.answerTimeLimitSec,
        jobDescription: interview.jobDescriptionSnapshot ?? "",
        candidateResume: interview.resumeSnapshot ?? "",
        persona: template.persona ?? "professional interviewer",
      });

      return {
        jobDescription: interview.jobDescriptionSnapshot ?? "",
        resume: interview.resumeSnapshot ?? "",
        persona: template.persona ?? "professional interviewer",
        durationMs: template.answerTimeLimitSec * 1000, // Use answer time limit
        systemPrompt,
        language: templateBlock.language,
      };
    }),

  submitTranscript: workerProcedure
    .input(
      z.object({
        interviewId: z.string(),
        transcript: z.string(), // Base64-encoded protobuf blob
        endedAt: z.string(),
        blockNumber: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Decode base64 transcript to buffer
      const transcriptBlob = Buffer.from(input.transcript, "base64");

      // Block-based interview: save transcript and trigger feedback
      if (input.blockNumber !== undefined) {
        // 1. Store transcript binary in the block
        const block = await ctx.db.interviewBlock.update({
          where: {
            interviewId_blockNumber: {
              interviewId: input.interviewId,
              blockNumber: input.blockNumber,
            },
          },
          data: {
            transcript: transcriptBlob,
            endedAt: new Date(input.endedAt),
            status: "COMPLETED",
          },
        });

        // 2. Generate block feedback (fire and forget - don't block response)
        // Note: Errors are logged but don't fail the transcript submission
        generateBlockFeedback(ctx.db, block.id)
          .then(() => maybeGenerateInterviewFeedback(ctx.db, input.interviewId))
          .catch((err) =>
            console.error(
              "[submitTranscript] Feedback generation failed:",
              err,
            ),
          );

        return { success: true };
      }

      // Standard interview: existing behavior - save transcript + update status
      await ctx.db.$transaction([
        ctx.db.transcriptEntry.upsert({
          where: { interviewId: input.interviewId },
          update: { transcript: transcriptBlob },
          create: {
            interviewId: input.interviewId,
            transcript: transcriptBlob,
          },
        }),
        ctx.db.interview.update({
          where: { id: input.interviewId },
          data: {
            status: "COMPLETED",
            endedAt: new Date(input.endedAt),
          },
        }),
      ]);

      return { success: true };
    }),

  submitFeedback: workerProcedure
    .input(
      z.object({
        interviewId: z.string(),
        summary: z.string(),
        strengths: z.string(),
        contentAndStructure: z.string(),
        communicationAndDelivery: z.string(),
        presentation: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { interviewId, ...feedbackData } = input;

      // Check if interview exists
      const interview = await ctx.db.interview.findUnique({
        where: { id: interviewId },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // Create or update feedback (idempotent)
      const feedback = await ctx.db.interviewFeedback.upsert({
        where: { interviewId },
        update: feedbackData,
        create: {
          interviewId,
          ...feedbackData,
        },
      });

      return feedback;
    }),
});
