import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const interviewRouter = createTRPCRouter({
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
});