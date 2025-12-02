import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const debugRouter = createTRPCRouter({
  getInterviewStatus: publicProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ input }) => {
      console.log(`[DEBUG] Getting status for interview ${input.interviewId}`);
      const interview = await db.interview.findUnique({
        where: { id: input.interviewId },
        select: { status: true, startedAt: true, endedAt: true },
      });
      console.log(`[DEBUG] Found interview status:`, interview);
      return interview;
    }),
});