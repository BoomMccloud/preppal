import { z } from "zod";
import { createTRPCRouter, protectedProcedure, flexibleProcedure, workerProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { SignJWT } from "jose";
import { env } from "~/env";
import jwt from "jsonwebtoken";

// Discriminated union for job description input
const JobDescriptionInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("reference"),
    jobDescriptionId: z.string(),
  }),
]);

// Discriminated union for resume input
const ResumeInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("reference"),
    resumeId: z.string(),
  }),
]);

export const interviewRouter = createTRPCRouter({
  createSession: protectedProcedure
    .input(
      z.object({
        jobDescription: JobDescriptionInput,
        resume: ResumeInput,
        idempotencyKey: z.string().min(1),
      })
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
          },
        });

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

  getHistory: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
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
        jobTitleSnapshot: interview.jobDescriptionSnapshot?.substring(0, 30) ?? null,
      }));
    }),

  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        includeFeedback: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      // Query with BOTH id AND userId for security (prevents enumeration)
      const interview = await ctx.db.interview.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          feedback: input.includeFeedback,
        },
      });

      // If not found, log for security monitoring and throw error
      if (!interview) {
        console.warn(
          `[Security] Unauthorized access attempt - User ${ctx.session.user.id} attempted to access interview ${input.id}`
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      return interview;
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

  getFeedback: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const interview = await ctx.db.interview.findUnique({
          where: {
            id: input.interviewId,
            userId: ctx.session.user.id, // Ensure user can only access their own interviews
          },
          include: {
            feedback: true,
          },
        });

        if (interview) {
          return interview;
        }
      } catch {
        console.log("Database not available, using mock data");
      }

      // Fallback to mock data for development
      if (input.interviewId === "demo-123" || input.interviewId.startsWith("demo-")) {
        return {
          id: input.interviewId,
          createdAt: new Date(Date.now() - 7200000), // 2 hours ago
          updatedAt: new Date(Date.now() - 3600000), // 1 hour ago
          startedAt: new Date(Date.now() - 3600000), // 1 hour ago
          endedAt: new Date(Date.now() - 1800000), // 30 minutes ago
          status: "COMPLETED" as const,
          jobTitleSnapshot: "Senior Frontend Developer",
          jobDescriptionSnapshot: "We are looking for a senior frontend developer with React experience...",
          jobDescriptionId: null,
          resumeId: null,
          userId: ctx.session.user.id,
          feedback: {
            id: "feedback-" + input.interviewId,
            createdAt: new Date(Date.now() - 1800000),
            summary: "The candidate demonstrated strong technical skills and problem-solving abilities. They showed good understanding of React concepts and were able to implement clean, readable code. Communication was clear and they explained their thought process well throughout the interview.",
            strengths: `• **Strong React Knowledge**: Demonstrated deep understanding of React hooks, state management, and component lifecycle
• **Clean Code**: Wrote well-structured, readable code with proper naming conventions
• **Problem-Solving**: Approached problems methodically and considered edge cases
• **Communication**: Clearly explained thought process and asked clarifying questions when needed
• **Time Management**: Completed tasks efficiently within the given timeframe`,
            contentAndStructure: `The candidate showed excellent understanding of component architecture and data flow. They properly structured their React components with clear separation of concerns and implemented appropriate state management patterns.

**Strengths:**
- Used proper component composition
- Implemented correct prop passing and state lifting
- Demonstrated understanding of when to use different hooks
- Good understanding of component lifecycle

**Areas for improvement:**
- Could have discussed more advanced optimization techniques like memoization
- Missed opportunity to talk about accessibility considerations
- Could have explored more complex state management patterns`,
            communicationAndDelivery: `The candidate communicated effectively throughout the interview. They spoke clearly, maintained good pace, and engaged well with the interviewer.

**Strengths:**
- Clear and articulate explanations
- Good use of technical vocabulary
- Asked thoughtful clarifying questions
- Maintained professional demeanor

**Areas for improvement:**
- Could have been more confident when explaining complex concepts
- Sometimes hesitated before answering, could work on reducing uncertainty
- Could benefit from providing more concrete examples when explaining concepts`,
            presentation: `The candidate presented themselves professionally and maintained good engagement throughout the session.

**Strengths:**
- Maintained good eye contact (when camera was on)
- Professional appearance and setup
- Good posture and body language
- Engaged actively with the interviewer

**Areas for improvement:**
- Could have used more gestures to emphasize points
- Screen sharing setup could be improved for better visibility
- Could have prepared a more organized workspace for coding demonstrations`,
            interviewId: input.interviewId,
          }
        };
      }

      throw new Error("Interview not found");
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
        env.AUTH_SECRET ?? "fallback-secret-for-development"
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

  generateWorkerToken: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the interview belongs to the user and is in PENDING status
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

      // Verify interview is in PENDING state
      if (interview.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Interview is not in PENDING state",
        });
      }

      // Get JWT secret from environment
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "JWT_SECRET not configured",
        });
      }

      // Generate JWT token with HS256, valid for 5 minutes
      const token = jwt.sign(
        {
          userId: ctx.session.user.id,
          interviewId: input.interviewId,
        },
        jwtSecret,
        {
          algorithm: "HS256",
          expiresIn: "5m",
        }
      );

      return { token };
    }),

  updateStatus: flexibleProcedure
    .input(
      z.object({
        interviewId: z.string(),
        status: z.enum(["IN_PROGRESS", "COMPLETED", "ERROR"]),
        endedAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Authorization logic depends on auth type
      if (ctx.authType === "user") {
        // User auth: verify ownership
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
      } else {
        // Worker auth: only verify existence
        const interview = await ctx.db.interview.findUnique({
          where: { id: input.interviewId },
        });

        if (!interview) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Interview not found",
          });
        }
      }

      // Prepare update data based on status
      const updateData: Prisma.InterviewUpdateInput = {
        status: input.status,
      };

      if (input.status === "IN_PROGRESS") {
        updateData.startedAt = new Date();
      } else if (input.status === "COMPLETED" || input.status === "ERROR") {
        updateData.endedAt = input.endedAt ? new Date(input.endedAt) : new Date();
      }

      // Update the interview
      const updatedInterview = await ctx.db.interview.update({
        where: { id: input.interviewId },
        data: updateData,
      });

      return updatedInterview;
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
          })
        ),
        endedAt: z.string(),
      })
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
});