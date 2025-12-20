/**
 * Golden Path Test - The Single Most Important Test
 *
 * This test verifies the complete user journey:
 * 1. User creates an interview session
 * 2. Worker processes the interview (simulated via API calls)
 * 3. User views their feedback
 *
 * If this test passes, you can deploy with confidence.
 * If this test fails, nothing else matters.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { User } from "@prisma/client";

// Mock the auth module to prevent environment errors
vi.mock("~/server/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

// Mock the env module to prevent client/server environment errors
vi.mock("~/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
  },
}));

import { appRouter } from "~/server/api/root";
import { db } from "~/server/db";

describe("Golden Path: Complete Interview Journey", () => {
  let testUser: User;

  beforeAll(async () => {
    testUser = await db.user.create({
      data: {
        email: `golden-path-${Date.now()}@example.com`,
        name: "Golden Path User",
      },
    });
  });

  afterAll(async () => {
    // Clean up: delete feedback, interviews, then user
    const interviews = await db.interview.findMany({
      where: { userId: testUser.id },
      select: { id: true },
    });
    const interviewIds = interviews.map((i) => i.id);

    if (interviewIds.length > 0) {
      await db.transcriptEntry.deleteMany({
        where: { interviewId: { in: interviewIds } },
      });
      await db.interviewFeedback.deleteMany({
        where: { interviewId: { in: interviewIds } },
      });
      await db.interview.deleteMany({
        where: { id: { in: interviewIds } },
      });
    }

    await db.user.delete({ where: { id: testUser.id } });
  });

  it("user can complete an interview and view feedback", async () => {
    // ========================================
    // STEP 1: User creates an interview session
    // ========================================
    const userCaller = appRouter.createCaller({
      db,
      session: {
        user: {
          id: testUser.id,
          name: testUser.name,
          email: testUser.email,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      headers: new Headers(),
    });

    const interview = await userCaller.interview.createSession({
      jobDescription: {
        type: "text",
        content:
          "We are looking for a Senior Software Engineer with 5+ years of experience in TypeScript and React.",
      },
      resume: {
        type: "text",
        content:
          "Jane Doe - 7 years of experience building web applications with React, Node.js, and TypeScript.",
      },
      idempotencyKey: `golden-path-test-${Date.now()}`,
    });

    expect(interview.status).toBe("PENDING");
    expect(interview.userId).toBe(testUser.id);

    // ========================================
    // STEP 2: Worker starts the interview
    // ========================================
    const workerHeaders = new Headers();
    workerHeaders.set(
      "Authorization",
      `Bearer ${process.env.WORKER_SHARED_SECRET}`,
    );

    const workerCaller = appRouter.createCaller({
      db,
      session: null,
      headers: workerHeaders,
    });

    await workerCaller.interview.updateStatus({
      interviewId: interview.id,
      status: "IN_PROGRESS",
    });

    // Verify status changed
    const inProgressInterview = await userCaller.interview.getById({
      id: interview.id,
    });
    expect(inProgressInterview?.status).toBe("IN_PROGRESS");

    // ========================================
    // STEP 3: Worker submits transcript
    // ========================================
    // Create a minimal valid transcript (base64 encoded)
    const mockTranscript = Buffer.from(
      JSON.stringify({
        turns: [
          {
            speaker: 1,
            content: "Tell me about your experience with React.",
            timestampMs: Date.now(),
          },
          {
            speaker: 2,
            content:
              "I have 7 years of experience building complex web applications with React...",
            timestampMs: Date.now() + 5000,
          },
        ],
      }),
    ).toString("base64");

    await workerCaller.interviewWorker.submitTranscript({
      interviewId: interview.id,
      transcript: mockTranscript,
      endedAt: new Date().toISOString(),
    });

    // ========================================
    // STEP 4: Worker submits feedback
    // ========================================
    await workerCaller.interviewWorker.submitFeedback({
      interviewId: interview.id,
      summary:
        "Strong candidate with excellent technical depth and clear communication.",
      strengths:
        "- Deep React expertise\n- Clear articulation of complex concepts\n- Good problem-solving approach",
      contentAndStructure:
        "Answers were well-organized with clear examples from past experience.",
      communicationAndDelivery:
        "Confident and articulate. Maintained good pace throughout.",
      presentation: "Professional demeanor. Engaged actively with questions.",
    });

    // ========================================
    // STEP 5: Worker completes the interview
    // ========================================
    await workerCaller.interview.updateStatus({
      interviewId: interview.id,
      status: "COMPLETED",
      endedAt: new Date().toISOString(),
    });

    // ========================================
    // STEP 6: User views their feedback (THE REAL TEST)
    // ========================================
    const result = await userCaller.interview.getFeedback({
      interviewId: interview.id,
    });

    // This is what matters: can the user see their feedback?
    expect(result).toBeDefined();
    expect(result.feedback).not.toBeNull();
    expect(result.feedback?.summary).toContain("Strong candidate");
    expect(result.feedback?.strengths).toContain("React expertise");

    // ========================================
    // STEP 7: Interview appears in history as COMPLETED
    // ========================================
    const history = await userCaller.interview.getHistory();
    const completedInterview = history.find(
      (i: { id: string }) => i.id === interview.id,
    );

    expect(completedInterview).toBeDefined();
    expect(completedInterview?.status).toBe("COMPLETED");
  }, 30000); // 30 second timeout for multiple DB calls
});
