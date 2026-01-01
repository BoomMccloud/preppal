/**
 * Block-Based Interview Golden Path Test
 *
 * This test verifies the complete user journey for block-based interviews:
 * 1. User creates an interview with a template (6 blocks: 3 Chinese, 3 English)
 * 2. Worker processes block 1 (Chinese)
 * 3. Frontend completes block 1
 * 4. Worker processes block 4 (first English block)
 * 5. Frontend completes block 4
 * 6. Worker submits aggregated feedback
 * 7. User views their feedback
 *
 * Also tests backward compatibility with non-block interviews.
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

describe("Block-Based Interview Golden Path", () => {
  let testUser: User;
  let userCaller: ReturnType<typeof appRouter.createCaller>;
  let workerCaller: ReturnType<typeof appRouter.createCaller>;
  const createdInterviewIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: `block-golden-${Date.now()}@example.com`,
        name: "Block Golden Path User",
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
    // Clean up in reverse dependency order
    if (createdInterviewIds.length > 0) {
      // Delete interview blocks (when schema exists)
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
  // Golden Path: Complete Multi-Block Interview with Both Languages
  // ===========================================================================

  it("user can complete a block-based interview with Chinese and English blocks", async () => {
    // ========================================
    // STEP 1: User creates interview with template
    // ========================================
    const interview = await userCaller.interview.createSession({
      jobDescription: {
        type: "text",
        content:
          "MBA Admissions - Looking for candidates with strong leadership and communication skills.",
      },
      resume: {
        type: "text",
        content:
          "John Doe - 5 years management consulting experience at McKinsey. Led cross-functional teams.",
      },
      idempotencyKey: `block-golden-path-${Date.now()}`,
      templateId: "mba-behavioral-v1",
    });

    createdInterviewIds.push(interview.id);

    expect(interview.status).toBe("PENDING");
    expect(interview.isBlockBased).toBe(true);
    expect(interview.templateId).toBe("mba-behavioral-v1");

    // Verify blocks were created
    const initialBlocks = await db.interviewBlock.findMany({
      where: { interviewId: interview.id },
      orderBy: { blockNumber: "asc" },
    });

    expect(initialBlocks).toHaveLength(6); // One block per question
    expect(initialBlocks[0]?.language).toBe("ZH"); // First 3 are Chinese
    expect(initialBlocks[0]?.status).toBe("PENDING");
    expect(initialBlocks[3]?.language).toBe("EN"); // Last 3 are English
    expect(initialBlocks[3]?.status).toBe("PENDING");

    // ========================================
    // STEP 2: Worker gets context for block 1 (Chinese)
    // ========================================
    const block1Context = await workerCaller.interviewWorker.getContext({
      interviewId: interview.id,
      blockNumber: 1,
    });

    expect(block1Context.systemPrompt).toBeDefined();
    expect(block1Context.language).toBe("zh");
    expect(block1Context.durationMs).toBe(90 * 1000); // answerTimeLimitSec

    // Verify system prompt has Chinese instructions
    expect(
      block1Context.systemPrompt?.includes("中文") ||
        block1Context.systemPrompt?.toLowerCase().includes("chinese") ||
        block1Context.systemPrompt?.toLowerCase().includes("mandarin"),
    ).toBe(true);

    // Block 1 should be IN_PROGRESS
    const block1InProgress = await db.interviewBlock.findFirst({
      where: { interviewId: interview.id, blockNumber: 1 },
    });
    expect(block1InProgress?.status).toBe("IN_PROGRESS");

    // ========================================
    // STEP 3: Worker starts interview
    // ========================================
    await workerCaller.interview.updateStatus({
      interviewId: interview.id,
      status: "IN_PROGRESS",
    });

    // ========================================
    // STEP 4: Worker submits block 1 transcript
    // ========================================
    const block1Transcript = Buffer.from(
      JSON.stringify({
        turns: [
          {
            speaker: 1,
            content: "请描述一次你带领团队的经历。",
            timestampMs: Date.now(),
          },
          {
            speaker: 2,
            content:
              "在麦肯锡工作期间，我带领一个10人团队完成了一个重要项目...",
            timestampMs: Date.now() + 5000,
          },
        ],
      }),
    ).toString("base64");

    await workerCaller.interviewWorker.submitTranscript({
      interviewId: interview.id,
      transcript: block1Transcript,
      endedAt: new Date().toISOString(),
      blockNumber: 1,
    });

    // ========================================
    // STEP 5: Frontend calls completeBlock for block 1
    // ========================================
    await userCaller.interview.completeBlock({
      interviewId: interview.id,
      blockNumber: 1,
    });

    const block1Completed = await db.interviewBlock.findFirst({
      where: { interviewId: interview.id, blockNumber: 1 },
    });
    expect(block1Completed?.status).toBe("COMPLETED");

    // ========================================
    // STEP 6: Worker gets context for block 4 (first English block)
    // ========================================
    const block4Context = await workerCaller.interviewWorker.getContext({
      interviewId: interview.id,
      blockNumber: 4,
    });

    expect(block4Context.systemPrompt).toBeDefined();
    expect(block4Context.language).toBe("en");

    // Verify system prompt has English instructions
    expect(block4Context.systemPrompt?.toLowerCase()).toContain("english");

    // Block 4 should be IN_PROGRESS
    const block4InProgress = await db.interviewBlock.findFirst({
      where: { interviewId: interview.id, blockNumber: 4 },
    });
    expect(block4InProgress?.status).toBe("IN_PROGRESS");

    // ========================================
    // STEP 7: Worker submits block 4 transcript
    // ========================================
    const block4Transcript = Buffer.from(
      JSON.stringify({
        turns: [
          {
            speaker: 1,
            content: "What is your greatest professional achievement?",
            timestampMs: Date.now(),
          },
          {
            speaker: 2,
            content:
              "My greatest achievement was leading a digital transformation initiative at McKinsey...",
            timestampMs: Date.now() + 5000,
          },
        ],
      }),
    ).toString("base64");

    await workerCaller.interviewWorker.submitTranscript({
      interviewId: interview.id,
      transcript: block4Transcript,
      endedAt: new Date().toISOString(),
      blockNumber: 4,
    });

    // ========================================
    // STEP 8: Frontend calls completeBlock for block 4
    // ========================================
    await userCaller.interview.completeBlock({
      interviewId: interview.id,
      blockNumber: 4,
    });

    const block4Completed = await db.interviewBlock.findFirst({
      where: { interviewId: interview.id, blockNumber: 4 },
    });
    expect(block4Completed?.status).toBe("COMPLETED");

    // ========================================
    // STEP 9: Worker submits aggregated feedback
    // ========================================
    await workerCaller.interviewWorker.submitFeedback({
      interviewId: interview.id,
      summary:
        "Strong candidate with excellent bilingual communication skills. Demonstrated clear leadership experience in both Chinese and English portions.",
      strengths:
        "- Fluent in both Chinese and English\n- Clear examples of leadership\n- Structured thinking",
      contentAndStructure:
        "Answers were well-organized with specific examples from McKinsey experience.",
      communicationAndDelivery:
        "Confident in both languages. Natural code-switching between Chinese and English.",
      presentation:
        "Professional demeanor throughout. Maintained composure during language transitions.",
    });

    // ========================================
    // STEP 10: Worker marks interview as COMPLETED
    // ========================================
    await workerCaller.interview.updateStatus({
      interviewId: interview.id,
      status: "COMPLETED",
      endedAt: new Date().toISOString(),
    });

    // ========================================
    // STEP 11: User views aggregated feedback (THE REAL TEST)
    // ========================================
    const result = await userCaller.interview.getFeedback({
      interviewId: interview.id,
    });

    expect(result).toBeDefined();
    expect(result.feedback).not.toBeNull();
    expect(result.feedback?.summary).toContain("bilingual");
    expect(result.feedback?.strengths).toContain("Chinese and English");

    // ========================================
    // STEP 12: Interview appears in history as COMPLETED
    // ========================================
    const history = await userCaller.interview.getHistory();
    const completedInterview = history.find(
      (i: { id: string }) => i.id === interview.id,
    );

    expect(completedInterview).toBeDefined();
    expect(completedInterview?.status).toBe("COMPLETED");
    expect(completedInterview?.isBlockBased).toBe(true);
  }, 60000); // 60 second timeout for complete flow

  // ===========================================================================
  // Backward Compatibility: Non-Block Interview
  // ===========================================================================

  it("should handle backward compatibility with non-block interviews", async () => {
    // ========================================
    // STEP 1: Create interview WITHOUT template
    // ========================================
    const interview = await userCaller.interview.createSession({
      jobDescription: {
        type: "text",
        content: "Software Engineer - Standard interview format",
      },
      resume: {
        type: "text",
        content: "Developer with 3 years experience",
      },
      idempotencyKey: `standard-compat-${Date.now()}`,
      // No templateId
    });

    createdInterviewIds.push(interview.id);

    // Verify it's NOT block-based
    expect(interview.isBlockBased).toBe(false);
    expect(interview.templateId).toBeNull();

    // No blocks should exist
    const blocks = await db.interviewBlock.findMany({
      where: { interviewId: interview.id },
    });
    expect(blocks).toHaveLength(0);

    // ========================================
    // STEP 2: Worker gets standard context (no block)
    // ========================================
    const context = await workerCaller.interviewWorker.getContext({
      interviewId: interview.id,
      // No blockNumber
    });

    // Standard flow - no block-specific fields
    expect(context.systemPrompt).toBeUndefined();
    expect(context.language).toBeUndefined();
    expect(context.jobDescription).toBeDefined();
    expect(context.resume).toBeDefined();

    // ========================================
    // STEP 3: Standard interview flow
    // ========================================
    await workerCaller.interview.updateStatus({
      interviewId: interview.id,
      status: "IN_PROGRESS",
    });

    const standardTranscript = Buffer.from(
      JSON.stringify({
        turns: [
          { speaker: 1, content: "Tell me about yourself.", timestampMs: 0 },
          { speaker: 2, content: "I am a developer...", timestampMs: 5000 },
        ],
      }),
    ).toString("base64");

    await workerCaller.interviewWorker.submitTranscript({
      interviewId: interview.id,
      transcript: standardTranscript,
      endedAt: new Date().toISOString(),
      // No blockNumber - standard flow
    });

    // Transcript should be on Interview, not InterviewBlock
    const transcriptEntry = await db.transcriptEntry.findUnique({
      where: { interviewId: interview.id },
    });
    expect(transcriptEntry).not.toBeNull();

    // ========================================
    // STEP 4: Complete standard interview
    // ========================================
    await workerCaller.interviewWorker.submitFeedback({
      interviewId: interview.id,
      summary: "Good candidate for the role.",
      strengths: "- Technical skills\n- Clear communication",
      contentAndStructure: "Well-structured answers",
      communicationAndDelivery: "Clear and concise",
      presentation: "Professional",
    });

    await workerCaller.interview.updateStatus({
      interviewId: interview.id,
      status: "COMPLETED",
      endedAt: new Date().toISOString(),
    });

    // User can view feedback
    const result = await userCaller.interview.getFeedback({
      interviewId: interview.id,
    });
    expect(result.feedback?.summary).toContain("Good candidate");
  }, 30000);

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle partial block completion gracefully", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Partial completion test",
        },
        resume: {
          type: "text",
          content: "Test resume",
        },
        idempotencyKey: `partial-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Complete only block 1
      await workerCaller.interviewWorker.getContext({
        interviewId: interview.id,
        blockNumber: 1,
      });

      await userCaller.interview.completeBlock({
        interviewId: interview.id,
        blockNumber: 1,
      });

      // Block 1 completed, block 2 still pending
      const blocks = await db.interviewBlock.findMany({
        where: { interviewId: interview.id },
        orderBy: { blockNumber: "asc" },
      });

      expect(blocks[0]?.status).toBe("COMPLETED");
      expect(blocks[1]?.status).toBe("PENDING");
    });

    it("should track block timings correctly", async () => {
      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "Timing test",
        },
        resume: {
          type: "text",
          content: "Timing resume",
        },
        idempotencyKey: `timing-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      const beforeStart = new Date();

      // Start block 1
      await workerCaller.interviewWorker.getContext({
        interviewId: interview.id,
        blockNumber: 1,
      });

      const afterStart = new Date();

      // End block 1
      await workerCaller.interviewWorker.submitTranscript({
        interviewId: interview.id,
        transcript: Buffer.from("{}").toString("base64"),
        endedAt: new Date().toISOString(),
        blockNumber: 1,
      });

      const afterEnd = new Date();

      const block = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      // startedAt should be between beforeStart and afterStart
      expect(block?.startedAt).not.toBeNull();
      expect(block?.startedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeStart.getTime(),
      );
      expect(block?.startedAt!.getTime()).toBeLessThanOrEqual(
        afterStart.getTime(),
      );

      // endedAt should be between afterStart and afterEnd
      expect(block?.endedAt).not.toBeNull();
      expect(block?.endedAt!.getTime()).toBeGreaterThanOrEqual(
        afterStart.getTime(),
      );
      expect(block?.endedAt!.getTime()).toBeLessThanOrEqual(afterEnd.getTime());
    });
  });

  // ===========================================================================
  // Block Completion via Commands (FEAT31)
  // ===========================================================================

  describe("Block Completion via Commands (FEAT31)", () => {
    it("should complete block via command-driven architecture", async () => {
      // This test verifies the FEAT31 architectural fix:
      // BEFORE: useEffect reactively called completeBlock.mutate()
      // AFTER: Reducer emits COMPLETE_BLOCK command → executor calls completeBlock.mutate()
      //
      // Note: FEAT44 unified connection commands (START_CONNECTION + RECONNECT_FOR_BLOCK
      // merged into CONNECT_FOR_BLOCK), but this doesn't affect block completion flow.
      //
      // Integration test verifies end-to-end data flow:
      // Frontend event → Reducer → Command → tRPC → Database

      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "FEAT31 command-driven architecture test",
        },
        resume: {
          type: "text",
          content: "Testing command-based block completion",
        },
        idempotencyKey: `feat31-command-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Verify blocks created as PENDING
      const initialBlocks = await db.interviewBlock.findMany({
        where: { interviewId: interview.id },
        orderBy: { blockNumber: "asc" },
      });

      expect(initialBlocks).toHaveLength(6); // One block per question
      expect(initialBlocks[0]?.status).toBe("PENDING");
      expect(initialBlocks[5]?.status).toBe("PENDING");

      // Simulate the command-driven flow:
      // 1. Reducer detects block timeout (unit test verifies this)
      // 2. Reducer emits COMPLETE_BLOCK command (unit test verifies this)
      // 3. Command executor calls completeBlock.mutate() (integration test verifies this)
      // 4. tRPC procedure updates database (integration test verifies this)
      //
      // Note: Block transitions also use CONNECT_FOR_BLOCK command (FEAT44) to reconnect
      // for the next block, but that's frontend-only and not tested here.

      await userCaller.interview.completeBlock({
        interviewId: interview.id,
        blockNumber: 1,
      });

      // Verify database was updated correctly
      const block1 = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      expect(block1?.status).toBe("COMPLETED");

      // Block 2 should still be PENDING
      const block2 = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 2 },
      });

      expect(block2?.status).toBe("PENDING");
    });

    it("should handle last block completion correctly", async () => {
      // This test verifies the FEAT31 fix for feedback generation:
      // BEFORE: Reducer didn't emit CLOSE_CONNECTION on last block → no feedback
      // AFTER: Reducer emits CLOSE_CONNECTION → worker receives EndRequest → feedback generated
      //
      // Note: FEAT44 unified connection commands. Block transitions now use
      // CONNECT_FOR_BLOCK instead of RECONNECT_FOR_BLOCK, but the last block
      // still emits CLOSE_CONNECTION (not CONNECT_FOR_BLOCK) to end the interview.
      //
      // Integration test verifies:
      // - All blocks can be completed sequentially
      // - Database state is correct after last block completion
      // - (CLOSE_CONNECTION command execution verified in unit tests)

      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "FEAT31 last block completion test",
        },
        resume: {
          type: "text",
          content: "Testing feedback generation after last block",
        },
        idempotencyKey: `feat31-last-block-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Complete all 6 blocks
      for (let i = 1; i <= 6; i++) {
        await userCaller.interview.completeBlock({
          interviewId: interview.id,
          blockNumber: i,
        });
      }

      // Verify all blocks completed in database
      const blocks = await db.interviewBlock.findMany({
        where: { interviewId: interview.id },
        orderBy: { blockNumber: "asc" },
      });

      expect(blocks).toHaveLength(6); // One block per question
      expect(blocks[0]?.status).toBe("COMPLETED");
      expect(blocks[0]?.blockNumber).toBe(1);
      expect(blocks[5]?.status).toBe("COMPLETED");
      expect(blocks[5]?.blockNumber).toBe(6);

      // Note: The CLOSE_CONNECTION command that triggers feedback generation
      // is verified in unit tests (session-golden-path.test.ts).
      // This integration test verifies the database side effects are correct.
      //
      // FEAT44 note: Connection commands are now unified (CONNECT_FOR_BLOCK),
      // but this test only verifies block completion, not connection logic.
    }, 15000); // 15s timeout for completing 6 blocks

    it("should allow multiple blocks to complete independently", async () => {
      // This test verifies blocks can be completed in any state:
      // - Block 1 completed while block 2 still pending
      // - Non-sequential completion order
      // - Each block completion is independent

      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "FEAT31 independent block completion test",
        },
        resume: {
          type: "text",
          content: "Testing independent block state management",
        },
        idempotencyKey: `feat31-independent-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Complete only block 1
      await userCaller.interview.completeBlock({
        interviewId: interview.id,
        blockNumber: 1,
      });

      const blocks = await db.interviewBlock.findMany({
        where: { interviewId: interview.id },
        orderBy: { blockNumber: "asc" },
      });

      // Block 1 completed, block 2 still pending
      expect(blocks[0]?.status).toBe("COMPLETED");
      expect(blocks[1]?.status).toBe("PENDING");

      // Now complete block 2
      await userCaller.interview.completeBlock({
        interviewId: interview.id,
        blockNumber: 2,
      });

      const blocksAfter = await db.interviewBlock.findMany({
        where: { interviewId: interview.id },
        orderBy: { blockNumber: "asc" },
      });

      // Both blocks now completed
      expect(blocksAfter[0]?.status).toBe("COMPLETED");
      expect(blocksAfter[1]?.status).toBe("COMPLETED");
    }, 15000); // 15s timeout for multiple block operations

    it("should maintain block completion idempotency", async () => {
      // This test verifies calling completeBlock multiple times is safe:
      // - First call: PENDING → COMPLETED
      // - Second call: COMPLETED → COMPLETED (idempotent)
      // - No errors thrown on duplicate completion

      const interview = await userCaller.interview.createSession({
        jobDescription: {
          type: "text",
          content: "FEAT31 idempotency test",
        },
        resume: {
          type: "text",
          content: "Testing duplicate block completion calls",
        },
        idempotencyKey: `feat31-idempotent-${Date.now()}`,
        templateId: "mba-behavioral-v1",
      });

      createdInterviewIds.push(interview.id);

      // Complete block 1 first time
      await userCaller.interview.completeBlock({
        interviewId: interview.id,
        blockNumber: 1,
      });

      const blockFirstCall = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      expect(blockFirstCall?.status).toBe("COMPLETED");

      // Complete block 1 again (idempotent operation)
      await userCaller.interview.completeBlock({
        interviewId: interview.id,
        blockNumber: 1,
      });

      const blockSecondCall = await db.interviewBlock.findFirst({
        where: { interviewId: interview.id, blockNumber: 1 },
      });

      // Should still be COMPLETED, no error
      expect(blockSecondCall?.status).toBe("COMPLETED");
    });
  });
});
