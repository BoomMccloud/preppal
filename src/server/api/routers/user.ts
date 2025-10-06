import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true, email: true },
      });

      return {
        name: user?.name ?? null,
        email: user?.email ?? null,
      };
    }),
});
