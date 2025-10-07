import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { User, Interview, InterviewFeedback } from "@prisma/client";

// Mock the auth module to prevent environment errors
vi.mock("~/server/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)), // Default mock
}));

// Mock the env module to prevent client/server environment errors
vi.mock("~/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "file:./db.sqlite",
  },
}));

import { appRouter } from "~/server/api/root";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";

describe("Feedback Page Integration Tests", () => {
  let testUser: User;
  let otherUser: User;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Create dedicated users for this test run
    [testUser, otherUser] = await Promise.all([
      db.user.create({
        data: {
          email: `feedback-test-user-${Date.now()}@example.com`,
          name: "Feedback Test User",
        },
      }),
      db.user.create({
        data: {
          email: `feedback-other-user-${Date.now()}@example.com`,
          name: "Feedback Other User",
        },
      }),
    ]);

    // Create a tRPC caller authenticated as the main test user
    caller = appRouter.createCaller({
      db,
      session: {
        user: { id: testUser.id, name: testUser.name, email: testUser.email },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      headers: new Headers(),
    });
  });

  afterAll(async () => {
    // Clean up interviews and feedback to avoid foreign key constraint issues
    const userIds = [testUser.id, otherUser.id];
    const interviews = await db.interview.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const interviewIds = interviews.map((i) => i.id);

    if (interviewIds.length > 0) {
      await db.interviewFeedback.deleteMany({
        where: { interviewId: { in: interviewIds } },
      });
      await db.interview.deleteMany({
        where: { id: { in: interviewIds } },
      });
    }

    // Clean up the users
    await db.user.deleteMany({
      where: { id: { in: userIds } },
    });
  });

  it("should fetch a COMPLETED interview with its feedback when includeFeedback is true", async () => {
    // ARRANGE: Create a completed interview with feedback
    const interview = await db.interview.create({
      data: {
        userId: testUser.id,
        status: "COMPLETED",
        jobTitleSnapshot: "Test Job",
        jobDescriptionSnapshot: "Test JD",
        idempotencyKey: `feedback-test-${Date.now()}`,
      },
    });
    const feedback = await db.interviewFeedback.create({
      data: {
        interviewId: interview.id,
        summary: "Great job!",
        strengths: "Clear communication.",
        contentAndStructure: "Well-structured answers.",
        communicationAndDelivery: "Confident delivery.",
        presentation: "Professional appearance.",
      },
    });

    // ACT: Fetch the interview with feedback
    const result = await caller.interview.getById({
      id: interview.id,
      includeFeedback: true,
    });

    // ASSERT
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.id).toBe(interview.id);
    expect(result!.status).toBe("COMPLETED");
    expect(result!.feedback).toBeDefined();
    expect(result!.feedback).not.toBeNull();
    expect(result!.feedback!.summary).toBe(feedback.summary);
    expect(result!.feedback!.interviewId).toBe(interview.id);
  });

  it("should return null feedback if it has not been generated yet", async () => {
    // ARRANGE: Create a completed interview without feedback
    const interview = await db.interview.create({
      data: {
        userId: testUser.id,
        status: "COMPLETED",
        jobTitleSnapshot: "No Feedback Job",
        jobDescriptionSnapshot: "Test JD",
        idempotencyKey: `no-feedback-test-${Date.now()}`,
      },
    });

    // ACT: Fetch the interview
    const result = await caller.interview.getById({
      id: interview.id,
      includeFeedback: true,
    });

    // ASSERT
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.id).toBe(interview.id);
    expect(result!.status).toBe("COMPLETED");
    expect(result!.feedback).toBeNull();
  });

  it("should return the interview but with null feedback if status is not COMPLETED", async () => {
    // ARRANGE: Create a pending interview
    const interview = await caller.interview.createSession({
      jobDescription: { type: "text", content: "Pending Interview" },
      resume: { type: "text", content: "Test Resume" },
      idempotencyKey: `feedback-pending-test-${Date.now()}`,
    });

    // ACT: Attempt to fetch with includeFeedback: true
    const result = await caller.interview.getById({
      id: interview.id,
      includeFeedback: true,
    });

    // ASSERT: The interview is returned, but feedback is null because the relation shouldn't exist
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.status).toBe("PENDING");
    expect(result!.feedback).toBeNull();
  });

  it("should throw a NOT_FOUND error when trying to access another user's feedback", async () => {
    // ARRANGE: Create a completed interview with feedback for the main test user
    const interview = await db.interview.create({
      data: {
        userId: testUser.id,
        status: "COMPLETED",
        jobTitleSnapshot: "Private Job",
        jobDescriptionSnapshot: "Private JD",
        idempotencyKey: `private-test-${Date.now()}`,
      },
    });
    await db.interviewFeedback.create({
      data: {
        interviewId: interview.id,
        summary: "This is private feedback.",
        strengths: "N/A",
        contentAndStructure: "N/A",
        communicationAndDelivery: "N/A",
        presentation: "N/A",
      },
    });

    // ARRANGE: Create a caller for the other user
    const otherUserCaller = appRouter.createCaller({
      db,
      session: {
        user: { id: otherUser.id, name: otherUser.name, email: otherUser.email },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      headers: new Headers(),
    });

    // ACT & ASSERT: Attempt to access the interview and expect a TRPCError
    await expect(
      otherUserCaller.interview.getById({
        id: interview.id,
        includeFeedback: true,
      })
    ).rejects.toThrow(TRPCError);

    await expect(
      otherUserCaller.interview.getById({
        id: interview.id,
        includeFeedback: true,
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("should not return feedback when includeFeedback is false, even if it exists", async () => {
    // ARRANGE: Create a completed interview with feedback
    const interview = await db.interview.create({
      data: {
        userId: testUser.id,
        status: "COMPLETED",
        jobTitleSnapshot: "No Include Job",
        jobDescriptionSnapshot: "Test JD",
        idempotencyKey: `no-include-test-${Date.now()}`,
      },
    });
    await db.interviewFeedback.create({
      data: {
        interviewId: interview.id,
        summary: "You shouldn't see this.",
        strengths: "N/A",
        contentAndStructure: "N/A",
        communicationAndDelivery: "N/A",
        presentation: "N/A",
      },
    });

    // ACT: Fetch the interview with includeFeedback: false
    const result = await caller.interview.getById({
      id: interview.id,
      includeFeedback: false, // Explicitly false
    });

    // ASSERT
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.id).toBe(interview.id);
    // The 'feedback' property should not be on the object
    expect(result).not.toHaveProperty("feedback");
  });
});
