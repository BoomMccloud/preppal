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

export const interviewWorkerRouter = createTRPCRouter({
  getContext: workerProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.db.interview.findUnique({
        where: { id: input.interviewId },
        select: {
          jobDescriptionSnapshot: true,
          resumeSnapshot: true,
          persona: true,
          duration: true,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      return {
        jobDescription: interview.jobDescriptionSnapshot ?? "",
        resume: interview.resumeSnapshot ?? "",
        persona: interview.persona ?? "professional interviewer",
        durationMs: DURATION_MS[interview.duration],
      };
    }),

  submitTranscript: workerProcedure
    .input(
      z.object({
        interviewId: z.string(),
        transcript: z.array(
          z.object({
            speaker: z.enum(["USER", "AI"]),
            content: z.string(),
            timestamp: z.string(),
          }),
        ),
        endedAt: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Perform atomic transaction: save transcript + update status
      await ctx.db.$transaction([
        ctx.db.transcriptEntry.createMany({
          data: input.transcript.map((entry) => ({
            interviewId: input.interviewId,
            speaker: entry.speaker,
            content: entry.content,
            timestamp: new Date(entry.timestamp),
          })),
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
