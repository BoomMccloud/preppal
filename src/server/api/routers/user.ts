import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { name: true, email: true, uiLanguage: true },
    });

    return {
      name: user?.name ?? null,
      email: user?.email ?? null,
      uiLanguage: user?.uiLanguage ?? "en",
    };
  }),

  updateLanguage: protectedProcedure
    .input(z.object({ uiLanguage: z.enum(["en", "es", "zh"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { uiLanguage: input.uiLanguage },
      });
      return { success: true };
    }),
});
