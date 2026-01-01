/**
 * Integration tests for block and interview feedback generation.
 * Tests the complete flow from submitting transcripts to generating feedback.
 *
 * ABOUTME: Tests FEAT43 Block & Interview Feedback System
 * ABOUTME: Verifies block feedback creation and interview feedback generation when all blocks complete
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { User } from "@prisma/client";

// Mock the auth module to prevent environment errors
vi.mock("~/server/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

// Mock Gemini client to avoid real API calls
vi.mock("~/server/lib/gemini-client", () => ({
  callGeminiForBlockFeedback: vi.fn(async () => ({
    summary: "Test block feedback summary",
    strengths: "Test strengths",
    areasForImprovement: "Test areas for improvement",
  })),
  callGeminiForInterviewFeedback: vi.fn(async () => ({
    summary: "Test interview feedback summary",
    strengths: "Test interview strengths",
    contentAndStructure: "Test content feedback",
    communicationAndDelivery: "Test communication feedback",
    presentation: "Test presentation feedback",
  })),
}));

// Mock the env module to prevent client/server environment errors
vi.mock("~/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
    WORKER_SHARED_SECRET: process.env.WORKER_SHARED_SECRET,
    GEMINI_API_KEY: "test-key",
  },
}));

import { appRouter } from "~/server/api/root";
import { db } from "~/server/db";
import { create, toBinary } from "@bufbuild/protobuf";
import { TranscriptSchema, Speaker } from "~/lib/proto/transcript_pb";

// =============================================================================
// Test Setup
// =============================================================================

describe("Block & Interview Feedback Generation", () => {
  let testUser: User;
  let userCaller: ReturnType<typeof appRouter.createCaller>;
  let workerCaller: ReturnType<typeof appRouter.createCaller>;
  const createdInterviewIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: `feedback-test-${Date.now()}@example.com`,
        name: "Feedback Test User",
      },
    });

    // Create authenticated user caller
    userCaller = appRouter.createCaller({
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

    // Create worker caller with authorization
    const workerHeaders = new Headers();
    workerHeaders.set(
      "Authorization",
      `Bearer ${process.env.WORKER_SHARED_SECRET}`,
    );

    workerCaller = appRouter.createCaller({
      db,
      session: null,
      headers: workerHeaders,
    });
  });

  afterAll(async () => {
    // Clean up: delete blocks, feedback, transcripts, interviews, then user
    if (createdInterviewIds.length > 0) {
      // Delete block feedback first (cascades)
      await db.interviewBlockFeedback.deleteMany({
        where: {
          block: {
            interviewId: { in: createdInterviewIds },
          },
        },
      });

      await db.transcriptEntry.deleteMany({
        where: { interviewId: { in: createdInterviewIds } },
      });
      await db.interviewFeedback.deleteMany({
        where: { interviewId: { in: createdInterviewIds } },
      });
      await db.interview.deleteMany({
        where: { id: { in: createdInterviewIds } },
      });
    }

    await db.user.delete({ where: { id: testUser.id } });
  });

  // ===========================================================================
  // Helper Functions
  // ===========================================================================

  /**
   * Helper to create a valid protobuf transcript
   */
  function createValidTranscript(blockNumber: number): string {
    const transcript = create(TranscriptSchema, {
      turns: [
        {
          speaker: Speaker.USER,
          content: `User response for block ${blockNumber}`,
          timestampMs: BigInt(Date.now()),
        },
        {
          speaker: Speaker.AI,
          content: `AI question for block ${blockNumber}`,
          timestampMs: BigInt(Date.now() + 1000),
        },
      ],
    });

    const binary = toBinary(TranscriptSchema, transcript);
    return Buffer.from(binary).toString("base64");
  }

  /**
   * Helper to submit a transcript for a block and wait for feedback generation
   */
  async function submitBlockTranscript(
    interviewId: string,
    blockNumber: number,
  ) {
    const mockTranscript = createValidTranscript(blockNumber);

    await workerCaller.interviewWorker.submitTranscript({
      interviewId,
      transcript: mockTranscript,
      endedAt: new Date().toISOString(),
      blockNumber,
    });

    // Wait for fire-and-forget feedback generation to complete
    // Need to wait long enough for both block and interview feedback
    // Increased to 1500ms to handle DB operations and Gemini API mocks
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // ===========================================================================
  // Tests: Complete 3-block interview creates 3 block feedbacks
  // ===========================================================================

  describe("Complete 3-block interview", () => {
    it(
      "should create 3 InterviewBlockFeedback records when all 3 blocks complete",
      async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Software Engineer role",
        },
        resume: {
          type: "text",
          content: "5 years experience",
        },
        idempotencyKey: `feedback-3blocks-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Get first 3 blocks from the interview
      const blocks = await db.interviewBlock.findMany({
        where: { interviewId: interview.id },
        orderBy: { blockNumber: "asc" },
        take: 3,
      });

      // Submit transcripts for first 3 blocks
      for (const block of blocks) {
        await submitBlockTranscript(interview.id, block.blockNumber);
      }

      // Verify 3 block feedback records were created
      const blockFeedbacks = await db.interviewBlockFeedback.findMany({
        where: {
          block: {
            interviewId: interview.id,
          },
        },
      });

      expect(blockFeedbacks).toHaveLength(3);

      // Verify each feedback has content (from mock)
      for (const feedback of blockFeedbacks) {
        expect(feedback.summary).toBe("Test block feedback summary");
        expect(feedback.strengths).toBe("Test strengths");
        expect(feedback.areasForImprovement).toBe(
          "Test areas for improvement",
        );
      }
      },
      15000, // 3 blocks * 1.5s = 4.5s + buffer for DB operations
    );
  });

  // ===========================================================================
  // Tests: Partial completion (2 of 3 blocks)
  // ===========================================================================

  describe("Partial block completion", () => {
    it(
      "should create 2 block feedbacks and NO interview feedback when only 2 of 6 blocks complete",
      async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Product Manager role",
        },
        resume: {
          type: "text",
          content: "3 years PM experience",
        },
        idempotencyKey: `feedback-partial-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Submit transcripts for only first 2 blocks
      await submitBlockTranscript(interview.id, 1);
      await submitBlockTranscript(interview.id, 2);

      // Verify 2 block feedback records were created
      const blockFeedbacks = await db.interviewBlockFeedback.findMany({
        where: {
          block: {
            interviewId: interview.id,
          },
        },
      });

      expect(blockFeedbacks).toHaveLength(2);

      // Verify NO interview feedback exists (not all blocks complete)
      const interviewFeedback = await db.interviewFeedback.findUnique({
        where: { interviewId: interview.id },
      });

      expect(interviewFeedback).toBeNull();

      // Verify interview status is NOT COMPLETED (should be PENDING or IN_PROGRESS)
      const dbInterview = await db.interview.findUnique({
        where: { id: interview.id },
      });

      expect(dbInterview?.status).not.toBe("COMPLETED");
      },
      12000, // 2 blocks * 1.5s = 3s + buffer
    );
  });

  // ===========================================================================
  // Tests: Idempotency - submit same block twice
  // ===========================================================================

  describe("Idempotency", () => {
    it(
      "should create only 1 feedback record when same block submitted twice",
      async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Data Scientist role",
        },
        resume: {
          type: "text",
          content: "ML experience",
        },
        idempotencyKey: `feedback-idempotent-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Submit transcript for block 1 twice
      await submitBlockTranscript(interview.id, 1);
      await submitBlockTranscript(interview.id, 1);

      // Verify only 1 block feedback record exists
      const blockFeedbacks = await db.interviewBlockFeedback.findMany({
        where: {
          block: {
            interviewId: interview.id,
            blockNumber: 1,
          },
        },
      });

      expect(blockFeedbacks).toHaveLength(1);
      },
      10000, // 2 submissions * 1.5s = 3s + buffer
    );
  });

  // ===========================================================================
  // Tests: All blocks complete creates interview feedback
  // ===========================================================================

  describe("Interview feedback generation", () => {
    it(
      "should create InterviewFeedback and set status=COMPLETED when all blocks have feedback",
      async () => {
        const interview = await userCaller.interview.createSession({
          jobDescription: {
            type: "text",
            content: "Backend Engineer role",
          },
          resume: {
            type: "text",
            content: "Go and Rust experience",
          },
          idempotencyKey: `feedback-complete-${Date.now()}`,
          templateId: "mba-behavioral-v1",
        });

        createdInterviewIds.push(interview.id);

        // Get all blocks (template has 6 blocks)
        const blocks = await db.interviewBlock.findMany({
          where: { interviewId: interview.id },
          orderBy: { blockNumber: "asc" },
        });

        expect(blocks).toHaveLength(6);

        // Submit transcripts for all 6 blocks
        for (const block of blocks) {
          await submitBlockTranscript(interview.id, block.blockNumber);
        }

        // Extra wait for interview feedback generation to complete after last block
        // The last block triggers both block feedback AND interview feedback generation
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify all 6 block feedbacks exist
        const blockFeedbacks = await db.interviewBlockFeedback.findMany({
          where: {
            block: {
              interviewId: interview.id,
            },
          },
        });

        expect(blockFeedbacks).toHaveLength(6);

        // Verify interview feedback was created
        const interviewFeedback = await db.interviewFeedback.findUnique({
          where: { interviewId: interview.id },
        });

        expect(interviewFeedback).not.toBeNull();
        expect(interviewFeedback?.summary).toBe(
          "Test interview feedback summary",
        );
        expect(interviewFeedback?.strengths).toBe("Test interview strengths");
        expect(interviewFeedback?.contentAndStructure).toBe(
          "Test content feedback",
        );
        expect(interviewFeedback?.communicationAndDelivery).toBe(
          "Test communication feedback",
        );
        expect(interviewFeedback?.presentation).toBe(
          "Test presentation feedback",
        );

        // Verify interview status is COMPLETED
        const dbInterview = await db.interview.findUnique({
          where: { id: interview.id },
        });

        expect(dbInterview?.status).toBe("COMPLETED");
      },
      20000, // Increased timeout for 6 blocks (6 * 2s = 12s + buffer)
    );
  });
});
