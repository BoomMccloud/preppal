/**
 * Authentication router for email OTP flow.
 * Handles code generation, verification, and session creation.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { checkRateLimit } from "~/server/lib/rate-limit";
import { sendOtpEmail } from "~/server/lib/email";
import {
  generateOtp,
  hashCode,
  verifyCodeConstantTime,
  OTP_TTL_MS,
} from "~/server/lib/otp";

export const authRouter = createTRPCRouter({
  /**
   * Send OTP code to an email address.
   * Generates a new code, invalidates any existing codes, and sends via email.
   */
  sendOtp: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      // Rate limit check
      const rateLimit = checkRateLimit(email);
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Too many attempts. Please wait a few minutes and try again.",
        });
      }

      // Invalidate any existing codes for this email
      await ctx.db.emailVerification.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Generate and store new code
      const code = generateOtp();
      const codeHash = hashCode(code);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      await ctx.db.emailVerification.create({
        data: { email, codeHash, expiresAt },
      });

      // Send email
      const result = await sendOtpEmail({ to: email, code });
      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We couldn't send the email. Please try again.",
        });
      }

      return { success: true, expiresAt };
    }),

  /**
   * Verify OTP code and authenticate user.
   * Creates or links account based on email, returns user ID for session creation.
   */
  verifyOtp: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const { email, code } = input;

      // Rate limit check
      const rateLimit = checkRateLimit(email);
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Too many attempts. Please wait a few minutes and try again.",
        });
      }

      // Find valid verification record
      const verification = await ctx.db.emailVerification.findFirst({
        where: {
          email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verification) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This code has expired. We'll send you a new one.",
        });
      }

      // Verify code with constant-time comparison
      const inputHash = hashCode(code);
      if (!verifyCodeConstantTime(inputHash, verification.codeHash)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That code didn't work. Please check and try again.",
        });
      }

      // Mark code as used
      await ctx.db.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      // Find or create user (account linking logic)
      let user = await ctx.db.user.findUnique({ where: { email } });

      if (user) {
        // Update emailVerified if not already set
        if (!user.emailVerified) {
          await ctx.db.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      } else {
        // Create new user
        user = await ctx.db.user.create({
          data: { email, emailVerified: new Date() },
        });
      }

      // Return user ID for client-side signIn()
      return { success: true, userId: user.id };
    }),
});
