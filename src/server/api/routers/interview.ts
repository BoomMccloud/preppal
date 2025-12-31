import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  flexibleProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, type BlockLanguage } from "@prisma/client";
import { SignJWT } from "jose";
import { env } from "~/env";
import {
  generateGuestToken,
  getInterviewWithAccess,
} from "~/server/lib/interview-access";
import { JobDescriptionInput, ResumeInput } from "~/lib/schemas/interview";
import { getTemplate } from "~/lib/interview-templates";
import { fromBinary } from "@bufbuild/protobuf";
import { TranscriptSchema, Speaker } from "~/lib/proto/transcript_pb";

export const interviewRouter = createTRPCRouter({
  createSession: protectedProcedure
    .input(
      z.object({
        jobDescription: JobDescriptionInput,
        resume: ResumeInput,
        idempotencyKey: z.string().min(1),
        persona: z.string().optional(),
        duration: z
          .enum(["SHORT", "STANDARD", "EXTENDED"])
          .optional()
          .default("STANDARD"),
        templateId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // First, check if an interview with this idempotency key already exists
        const existingInterview = await ctx.db.interview.findUnique({
          where: {
            idempotencyKey: input.idempotencyKey,
          },
        });

        // If it exists, return the existing interview (idempotent behavior)
        if (existingInterview) {
          return existingInterview;
        }

        // Extract job description content or reference
        let jobDescriptionSnapshot: string | null = null;
        let jobDescriptionId: string | null = null;

        if (input.jobDescription.type === "text") {
          jobDescriptionSnapshot = input.jobDescription.content;
        } else {
          jobDescriptionId = input.jobDescription.jobDescriptionId;
          // Fetch the job description content from the reference
          const jd = await ctx.db.jobDescription.findUnique({
            where: { id: input.jobDescription.jobDescriptionId },
          });
          if (jd) {
            jobDescriptionSnapshot = jd.content;
          }
        }

        // Extract resume content or reference
        let resumeSnapshot: string | null = null;
        let resumeId: string | null = null;

        if (input.resume.type === "text") {
          resumeSnapshot = input.resume.content;
        } else {
          resumeId = input.resume.resumeId;
          // Fetch the resume content from the reference
          const resume = await ctx.db.resume.findUnique({
            where: { id: input.resume.resumeId },
          });
          if (resume) {
            resumeSnapshot = resume.content;
          }
        }

        // Check if template is provided and valid
        const template = input.templateId
          ? getTemplate(input.templateId)
          : null;
        const isBlockBased = template !== null;

        // Create new interview with PENDING status
        const interview = await ctx.db.interview.create({
          data: {
            userId: ctx.session.user.id,
            jobDescriptionSnapshot,
            jobDescriptionId,
            resumeSnapshot,
            resumeId,
            idempotencyKey: input.idempotencyKey,
            status: "PENDING",
            persona: input.persona,
            duration: input.duration,
            templateId: input.templateId ?? null,
            isBlockBased,
          },
        });

        // Create InterviewBlock records if template is provided
        if (template && isBlockBased) {
          const blockData = template.blocks.map((block, index) => ({
            interviewId: interview.id,
            blockNumber: index + 1, // 1-indexed
            language: block.language.toUpperCase() as BlockLanguage,
            questions: block.question.content, // Single question per block
            status: "PENDING" as const,
          }));

          await ctx.db.interviewBlock.createMany({
            data: blockData,
          });
        }

        return interview;
      } catch (error) {
        // Handle unique constraint violation (race condition case)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          // Fetch and return the existing interview
          const existingInterview = await ctx.db.interview.findUnique({
            where: {
              idempotencyKey: input.idempotencyKey,
            },
          });

          if (existingInterview) {
            return existingInterview;
          }
        }

        // Re-throw unexpected errors
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create interview",
        });
      }
    }),

  getHistory: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    // Fetch all interviews for the authenticated user
    const interviews = await ctx.db.interview.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        jobDescriptionSnapshot: true,
        isBlockBased: true,
        templateId: true,
      },
      orderBy: {
        createdAt: "desc", // Newest first
      },
    });

    // Transform to include jobTitleSnapshot (first 30 chars)
    return interviews.map((interview) => ({
      id: interview.id,
      status: interview.status,
      createdAt: interview.createdAt,
      jobTitleSnapshot:
        interview.jobDescriptionSnapshot?.substring(0, 30) ?? null,
      isBlockBased: interview.isBlockBased,
      templateId: interview.templateId,
    }));
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.interview.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
      return { success: true };
    }),

  createGuestLink: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the user owns this interview
      const interview = await ctx.db.interview.findUnique({
        where: {
          id: input.interviewId,
          userId: ctx.session.user.id,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // Generate token and set 24h expiry
      const guestToken = generateGuestToken();
      const guestExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await ctx.db.interview.update({
        where: { id: input.interviewId },
        data: { guestToken, guestExpiresAt },
      });

      return {
        token: guestToken,
        expiresAt: guestExpiresAt,
      };
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
        token: z.string().optional(),
        includeFeedback: z.boolean().optional().default(false),
        includeBlocks: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Check access via owner or guest token
      const access = await getInterviewWithAccess(
        ctx.db,
        input.id,
        ctx.session?.user?.id,
        input.token,
      );

      if (!access) {
        console.warn(
          `[Security] Unauthorized access attempt to interview ${input.id}`,
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // Fetch with optional relations
      const interview = await ctx.db.interview.findUnique({
        where: { id: input.id },
        include: {
          feedback: input.includeFeedback,
          blocks: input.includeBlocks,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // For guests, strip out the guest token (they shouldn't see it)
      // For owners, include guestToken/guestExpiresAt so they can see share status
      if (access.isGuest) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { guestToken: _omitted, ...interviewWithoutToken } = interview;
        return { ...interviewWithoutToken, isGuest: true };
      }

      return { ...interview, isGuest: false };
    }),

  getCurrent: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const interview = await ctx.db.interview.findFirst({
      where: {
        userId: ctx.session.user.id,
        status: "IN_PROGRESS",
      },
    });

    return interview;
  }),

  getFeedback: publicProcedure
    .input(z.object({ interviewId: z.string(), token: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Check access via owner or guest token
      const access = await getInterviewWithAccess(
        ctx.db,
        input.interviewId,
        ctx.session?.user?.id,
        input.token,
      );

      if (!access) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      const interview = await ctx.db.interview.findUnique({
        where: { id: input.interviewId },
        include: { feedback: true },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      return { ...interview, isGuest: access.isGuest };
    }),

  generateWsToken: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the interview belongs to the user
      const interview = await ctx.db.interview.findUnique({
        where: {
          id: input.interviewId,
          userId: ctx.session.user.id,
        },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // Generate JWT token valid for 1 hour
      const secret = new TextEncoder().encode(
        env.AUTH_SECRET ?? "fallback-secret-for-development",
      );

      const token = await new SignJWT({
        userId: ctx.session.user.id,
        interviewId: input.interviewId,
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret);

      return { token };
    }),

  generateWorkerToken: publicProcedure
    .input(z.object({ interviewId: z.string(), token: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Check access via owner or guest token
      const access = await getInterviewWithAccess(
        ctx.db,
        input.interviewId,
        ctx.session?.user?.id,
        input.token,
      );

      if (!access) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // Verify interview status
      // Standard interviews must be PENDING to start a session.
      // Block-based interviews can be PENDING (for first block) or IN_PROGRESS (for subsequent blocks).
      const isValidStatus =
        access.interview.status === "PENDING" ||
        (access.interview.isBlockBased &&
          access.interview.status === "IN_PROGRESS");

      if (!isValidStatus) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            access.interview.status === "COMPLETED"
              ? "Interview is already completed"
              : "Interview is not in a valid state to start",
        });
      }

      const interview = access.interview;

      // Get JWT secret from environment
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "JWT_SECRET not configured",
        });
      }

      // Generate JWT token with HS256, valid for 5 minutes using jose
      // For guests, use the interview owner's userId (interview belongs to them)
      const secret = new TextEncoder().encode(jwtSecret);
      const token = await new SignJWT({
        userId: interview.userId,
        interviewId: input.interviewId,
        isGuest: access.isGuest,
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(secret);

      return { token };
    }),

  updateStatus: flexibleProcedure
    .input(
      z.object({
        interviewId: z.string(),
        status: z.enum(["IN_PROGRESS", "COMPLETED", "ERROR"]),
        endedAt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log(
        `[UPDATE_STATUS] Called with interviewId: ${input.interviewId}, status: ${input.status}, authType: ${ctx.authType}`,
      );

      // Verify interview exists (and ownership if user auth)
      const whereClause =
        ctx.authType === "user"
          ? { id: input.interviewId, userId: ctx.session.user.id }
          : { id: input.interviewId };

      const interview = await ctx.db.interview.findUnique({
        where: whereClause,
      });

      console.log(`[UPDATE_STATUS] Found interview:`, interview);

      if (!interview) {
        console.log(
          `[UPDATE_STATUS] Interview not found for id: ${input.interviewId}`,
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // Prepare update data based on status
      const updateData: Prisma.InterviewUpdateInput = {
        status: input.status,
      };

      if (input.status === "IN_PROGRESS") {
        updateData.startedAt = new Date();
        console.log(
          `[UPDATE_STATUS] Setting startedAt for interview ${input.interviewId}`,
        );
      } else if (input.status === "COMPLETED" || input.status === "ERROR") {
        updateData.endedAt = input.endedAt
          ? new Date(input.endedAt)
          : new Date();
        console.log(
          `[UPDATE_STATUS] Setting endedAt for interview ${input.interviewId}`,
        );
      }

      console.log(
        `[UPDATE_STATUS] Updating interview ${input.interviewId} with data:`,
        updateData,
      );

      // Update the interview
      const updatedInterview = await ctx.db.interview.update({
        where: { id: input.interviewId },
        data: updateData,
      });

      console.log(
        `[UPDATE_STATUS] Successfully updated interview ${input.interviewId}:`,
        updatedInterview,
      );

      return updatedInterview;
    }),

  completeBlock: flexibleProcedure
    .input(
      z.object({
        interviewId: z.string(),
        blockNumber: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First, verify the interview exists and check authorization
      const interview = await ctx.db.interview.findUnique({
        where: { id: input.interviewId },
        select: { userId: true },
      });

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      // Check authorization: user must own the interview (workers bypass this check)
      if (ctx.authType === "user" && interview.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to complete this block",
        });
      }

      // Find and update the block
      const block = await ctx.db.interviewBlock.findUnique({
        where: {
          interviewId_blockNumber: {
            interviewId: input.interviewId,
            blockNumber: input.blockNumber,
          },
        },
      });

      if (!block) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Block ${input.blockNumber} not found`,
        });
      }

      // Mark block as COMPLETED
      const updatedBlock = await ctx.db.interviewBlock.update({
        where: {
          interviewId_blockNumber: {
            interviewId: input.interviewId,
            blockNumber: input.blockNumber,
          },
        },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        },
      });

      // Block marked as COMPLETED - that's all this API does
      // Interview completion is handled by the UI via updateStatus
      return updatedBlock;
    }),

  // DEV ONLY: Get transcript for debugging
  getTranscript: publicProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Only allow in development
      if (process.env.NODE_ENV === "production") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This endpoint is only available in development",
        });
      }

      const transcriptEntry = await ctx.db.transcriptEntry.findUnique({
        where: { interviewId: input.interviewId },
      });

      if (!transcriptEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transcript not found",
        });
      }

      // Deserialize the protobuf binary
      const transcript = fromBinary(
        TranscriptSchema,
        transcriptEntry.transcript,
      );

      // Convert Speaker enum to string
      const speakerToString = (speaker: Speaker): string => {
        switch (speaker) {
          case Speaker.USER:
            return "USER";
          case Speaker.AI:
            return "AI";
          default:
            return "UNKNOWN";
        }
      };

      // Format as readable turns
      const turns = transcript.turns.map((turn) => ({
        speaker: speakerToString(turn.speaker),
        content: turn.content,
        timestamp: new Date(Number(turn.timestampMs)),
      }));

      return {
        turns,
        plainText: turns.map((t) => `${t.speaker}: ${t.content}`).join("\n\n"),
      };
    }),
});
