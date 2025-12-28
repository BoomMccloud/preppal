/**
 * Integration tests for interview block management.
 * Tests the tRPC handlers for block-based interviews including:
 * - Creating interviews with templates
 * - Getting context for specific blocks
 * - Submitting block transcripts
 * - Completing blocks
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
    WORKER_SHARED_SECRET: process.env.WORKER_SHARED_SECRET,
  },
}));

import { appRouter } from "~/server/api/root";
import { db } from "~/server/db";

// =============================================================================
// Test Setup
// =============================================================================

describe("Interview Block Management", () => {
  let testUser: User;
  let userCaller: ReturnType<typeof appRouter.createCaller>;
  let workerCaller: ReturnType<typeof appRouter.createCaller>;
  const createdInterviewIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: `block-test-${Date.now()}@example.com`,
        name: "Block Test User",
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
      // Delete interview blocks first (when schema exists)
      // await db.interviewBlock.deleteMany({
      //   where: { interviewId: { in: createdInterviewIds } },
      // });

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
  // Tests: startInterview with template
  // ===========================================================================

  describe("startInterview with template", () => {
    it("should create interview with isBlockBased=true when templateId provided", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Software Engineer at Google",
        },
        resume: {
          type: "text",
          content: "5 years experience",
        },
        idempotencyKey: `block-template-${Date.now()}`,
        templateId: "mba-behavioral-v1", // Template ID from config
      });

      createdInterviewIds.push(interview.id);

      expect(interview.isBlockBased).toBe(true);
      expect(interview.templateId).toBe("mba-behavioral-v1");
    });

    it("should create InterviewBlock records for each template block", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Product Manager at Meta",
        },
        resume: {
          type: "text",
          content: "3 years PM experience",
        },
        idempotencyKey: `block-records-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Query for blocks (when schema exists)
      const blocks = await db.interviewBlock.findMany({
        where: { interviewId: interview.id },
        orderBy: { blockNumber: "asc" },
      });

      // MBA behavioral template has 2 blocks (Chinese + English)
      expect(blocks).toHaveLength(2);
      expect(blocks[0]?.blockNumber).toBe(1);
      expect(blocks[0]?.language).toBe("ZH");
      expect(blocks[1]?.blockNumber).toBe(2);
      expect(blocks[1]?.language).toBe("EN");
    });

    it("should set blocks to PENDING status initially", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Data Scientist",
        },
        resume: {
          type: "text",
          content: "ML experience",
        },
        idempotencyKey: `block-pending-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      const blocks = await db.interviewBlock.findMany({
        where: { interviewId: interview.id },
      });

      for (const block of blocks) {
        expect(block.status).toBe("PENDING");
      }
    });

    it("should store templateId on interview", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Backend Engineer",
        },
        resume: {
          type: "text",
          content: "Go and Rust experience",
        },
        idempotencyKey: `block-templateid-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      const dbInterview = await db.interview.findUnique({
        where: { id: interview.id },
      });

      expect(dbInterview?.templateId).toBe("mba-behavioral-v1");
    });

    it("should create standard interview when templateId not provided", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Frontend Developer",
        },
        resume: {
          type: "text",
          content: "React and Vue experience",
        },
        idempotencyKey: `no-template-${Date.now()}`,
        // No templateId
      });

      createdInterviewIds.push(interview.id);

      expect(interview.isBlockBased).toBe(false);
      expect(interview.templateId).toBeNull();
    });
  });

  // ===========================================================================
  // Tests: getContext with block_number
  // ===========================================================================

  describe("getContext with block_number", () => {
    it("should return block-specific system prompt when block_number provided", async () => {
      // First create an interview with template
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "MBA Admissions Interview",
        },
        resume: {
          type: "text",
          content: "Business background",
        },
        idempotencyKey: `context-block-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Worker requests context for block 1
      const context = await workerCaller.interviewWorker.getContext({
        interviewId: interview.id,
        blockNumber: 1,
      });

      expect(context.systemPrompt).toBeDefined();
      expect(context.systemPrompt).toContain("block 1");
    });

    it("should return block language in response", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Interview for language test",
        },
        resume: {
          type: "text",
          content: "Bilingual candidate",
        },
        idempotencyKey: `context-lang-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Block 1 should be Chinese
      const context1 = await workerCaller.interviewWorker.getContext({
        interviewId: interview.id,
        blockNumber: 1,
      });
      expect(context1.language).toBe("zh");

      // Block 2 should be English
      const context2 = await workerCaller.interviewWorker.getContext({
        interviewId: interview.id,
        blockNumber: 2,
      });
      expect(context2.language).toBe("en");
    });

    it("should return block duration", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Duration test",
        },
        resume: {
          type: "text",
          content: "Test resume",
        },
        idempotencyKey: `context-duration-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      const context = await workerCaller.interviewWorker.getContext({
        interviewId: interview.id,
        blockNumber: 1,
      });

      // Template specifies 600 seconds (10 min) per block
      expect(context.durationMs).toBe(600 * 1000);
    });

    it("should mark block as IN_PROGRESS when context requested", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Status test",
        },
        resume: {
          type: "text",
          content: "Status resume",
        },
        idempotencyKey: `context-status-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Request context for block 1
      await workerCaller.interviewWorker.getContext({
        interviewId: interview.id,
        blockNumber: 1,
      });

      // Check block status
      const block = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      expect(block?.status).toBe("IN_PROGRESS");
      expect(block?.startedAt).not.toBeNull();
    });

    it("should fallback to standard flow when block_number not provided", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Standard flow test",
        },
        resume: {
          type: "text",
          content: "Standard resume",
        },
        idempotencyKey: `context-fallback-${Date.now()}`,
        // No templateId - standard interview
      });

      createdInterviewIds.push(interview.id);

      const context = await workerCaller.interviewWorker.getContext({
        interviewId: interview.id,
        // No blockNumber
      });

      // Should return standard context without block-specific prompt
      expect(context.systemPrompt).toBeUndefined();
      expect(context.language).toBeUndefined();
    });
  });

  // ===========================================================================
  // Tests: submitTranscript with block_number
  // ===========================================================================

  describe("submitTranscript with block_number", () => {
    it("should save transcript to InterviewBlock when block_number provided", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Transcript block test",
        },
        resume: {
          type: "text",
          content: "Transcript resume",
        },
        idempotencyKey: `transcript-block-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      const mockTranscript = Buffer.from('{"test": "data"}').toString("base64");

      await workerCaller.interviewWorker.submitTranscript({
        interviewId: interview.id,
        transcript: mockTranscript,
        endedAt: new Date().toISOString(),
        blockNumber: 1,
      });

      // Check transcript was saved to block
      const block = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      expect(block?.transcriptId).not.toBeNull();
    });

    it("should save transcript to Interview when block_number not provided", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Transcript standard test",
        },
        resume: {
          type: "text",
          content: "Standard transcript resume",
        },
        idempotencyKey: `transcript-standard-${Date.now()}`,
        // No templateId
      });

      createdInterviewIds.push(interview.id);

      const mockTranscript = Buffer.from('{"standard": "transcript"}').toString(
        "base64",
      );

      await workerCaller.interviewWorker.submitTranscript({
        interviewId: interview.id,
        transcript: mockTranscript,
        endedAt: new Date().toISOString(),
        // No blockNumber
      });

      // Check transcript was saved to interview (existing behavior)
      const transcriptEntry = await db.transcriptEntry.findUnique({
        where: { interviewId: interview.id },
      });

      expect(transcriptEntry).not.toBeNull();
    });

    it("should update block endedAt timestamp", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "EndedAt test",
        },
        resume: {
          type: "text",
          content: "EndedAt resume",
        },
        idempotencyKey: `transcript-endedat-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      const endedAt = new Date().toISOString();
      const mockTranscript = Buffer.from('{"ended": true}').toString("base64");

      await workerCaller.interviewWorker.submitTranscript({
        interviewId: interview.id,
        transcript: mockTranscript,
        endedAt,
        blockNumber: 1,
      });

      const block = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      expect(block?.endedAt).not.toBeNull();
    });
  });

  // ===========================================================================
  // Tests: completeBlock mutation
  // ===========================================================================

  describe("completeBlock mutation", () => {
    it("should mark block as COMPLETED", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Complete block test",
        },
        resume: {
          type: "text",
          content: "Complete resume",
        },
        idempotencyKey: `complete-block-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      await userCaller.interview.completeBlock({
        interviewId: interview.id,
        blockNumber: 1,
      });

      const block = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      expect(block?.status).toBe("COMPLETED");
    });

    it("should reject if block not found", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Block not found test",
        },
        resume: {
          type: "text",
          content: "Not found resume",
        },
        idempotencyKey: `complete-notfound-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      await expect(
        userCaller.interview.completeBlock({
          interviewId: interview.id,
          blockNumber: 999, // Non-existent block
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should reject if not authorized", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Auth test",
        },
        resume: {
          type: "text",
          content: "Auth resume",
        },
        idempotencyKey: `complete-auth-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Create another user
      const otherUser = await db.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          name: "Other User",
        },
      });

      const otherUserCaller = appRouter.createCaller({
        db,
        session: {
          user: {
            id: otherUser.id,
            name: otherUser.name,
            email: otherUser.email,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        headers: new Headers(),
      });

      await expect(
        otherUserCaller.interview.completeBlock({
          interviewId: interview.id,
          blockNumber: 1,
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });

      // Clean up other user
      await db.user.delete({ where: { id: otherUser.id } });
    });

    it("should allow worker to complete block", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Worker complete test",
        },
        resume: {
          type: "text",
          content: "Worker resume",
        },
        idempotencyKey: `complete-worker-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Worker should be able to complete blocks
      await workerCaller.interview.completeBlock({
        interviewId: interview.id,
        blockNumber: 1,
      });

      const block = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      expect(block?.status).toBe("COMPLETED");
    });
  });
});
