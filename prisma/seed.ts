import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
    },
  });

  // Create a test interview with feedback
  const interview = await prisma.interview.upsert({
    where: { id: "demo-123" },
    update: {},
    create: {
      id: "demo-123",
      userId: user.id,
      status: "COMPLETED",
      jobTitleSnapshot: "Senior Frontend Developer",
      jobDescriptionSnapshot: "We are looking for a senior frontend developer...",
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      endedAt: new Date(Date.now() - 1800000), // 30 minutes ago
    },
  });

  // Create feedback for the interview
  await prisma.interviewFeedback.upsert({
    where: { interviewId: interview.id },
    update: {},
    create: {
      interviewId: interview.id,
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
    },
  });

  console.log("Seed data created successfully!");
  console.log(`Test user: ${user.email}`);
  console.log(`Test interview: ${interview.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });