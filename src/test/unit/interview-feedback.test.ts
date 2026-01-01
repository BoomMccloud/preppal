/**
 * Unit tests for interview feedback generation.
 * Tests the maybeGenerateInterviewFeedback function in isolation.
 *
 * ABOUTME: Tests FEAT43 interview-level feedback generation logic
 * ABOUTME: Verifies conditions for generating holistic interview feedback
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { User } from "@prisma/client";

// Mock Gemini client to avoid real API calls
vi.mock("~/server/lib/gemini-client", () => ({
  callGeminiForInterviewFeedback: vi.fn(async () => ({
    summary: "Mock interview summary",
    strengths: "Mock interview strengths",
    contentAndStructure: "Mock content feedback",
    communicationAndDelivery: "Mock communication feedback",
    presentation: "Mock presentation feedback",
  })),
}));

// Mock the env module to prevent client/server environment errors
vi.mock("~/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
    GEMINI_API_KEY: "test-key",
  },
}));

import { db } from "~/server/db";
import { maybeGenerateInterviewFeedback } from "~/server/lib/interview-feedback";
import { callGeminiForInterviewFeedback } from "~/server/lib/gemini-client";

// =============================================================================
// Test Setup
// =============================================================================

describe("maybeGenerateInterviewFeedback", () => {
  let testUser: User;
  const createdInterviewIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: `interview-feedback-unit-${Date.now()}@example.com`,
        name: "Interview Feedback Unit Test User",
      },
    });
  });

  afterAll(async () => {
    // Clean up
    if (createdInterviewIds.length > 0) {
      await db.interviewBlockFeedback.deleteMany({
        where: {
          block: {
            interviewId: { in: createdInterviewIds },
          },
        },
      });

      await db.interviewBlock.deleteMany({
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
  // Tests: Skips if interview feedback already exists
  // ===========================================================================

  describe("Interview feedback already exists", () => {
    it("should skip generation if interview feedback already exists", async () => {
      const interview = await db.interview.create({
        data: {
          userId: testUser.id,
          jobDescriptionSnapshot: "Existing feedback test",
          resumeSnapshot: "Resume data",
          status: "COMPLETED",
          isBlockBased: true,
          idempotencyKey: `unit-test-${Date.now()}-existing`,
        },
      });

      createdInterviewIds.push(interview.id);

      // Create blocks with feedback
      const block1 = await db.interviewBlock.create({
        data: {
          interviewId: interview.id,
          blockNumber: 1,
          language: "EN",
          status: "COMPLETED",
          questions: [],
        },
      });

      await db.interviewBlockFeedback.create({
        data: {
          blockId: block1.id,
          summary: "Block 1 feedback",
          strengths: "Strengths",
          areasForImprovement: "Areas",
        },
      });

      // Create interview feedback manually
      await db.interviewFeedback.create({
        data: {
          interviewId: interview.id,
          summary: "Existing interview feedback",
          strengths: "Existing strengths",
          contentAndStructure: "Existing content",
          communicationAndDelivery: "Existing communication",
          presentation: "Existing presentation",
        },
      });

      // Reset mock call count
      vi.mocked(callGeminiForInterviewFeedback).mockClear();

      // Call maybeGenerateInterviewFeedback - should skip
      await maybeGenerateInterviewFeedback(db, interview.id);

      // Verify Gemini was NOT called
      expect(callGeminiForInterviewFeedback).not.toHaveBeenCalled();

      // Verify existing feedback is unchanged
      const feedback = await db.interviewFeedback.findUnique({
        where: { interviewId: interview.id },
      });

      expect(feedback?.summary).toBe("Existing interview feedback");
    });
  });

  // ===========================================================================
  // Tests: Skips if not all blocks have feedback
  // ===========================================================================

  describe("Not all blocks have feedback", () => {
    it("should skip generation if some blocks lack feedback", async () => {
      const interview = await db.interview.create({
        data: {
          userId: testUser.id,
          jobDescriptionSnapshot: "Partial feedback test",
          resumeSnapshot: "Resume data",
          status: "IN_PROGRESS",
          isBlockBased: true,
          idempotencyKey: `unit-test-${Date.now()}-partial`,
        },
      });

      createdInterviewIds.push(interview.id);

      // Create 3 blocks
      const block1 = await db.interviewBlock.create({
        data: {
          interviewId: interview.id,
          blockNumber: 1,
          language: "EN",
          status: "COMPLETED",
          questions: [],
        },
      });

      const block2 = await db.interviewBlock.create({
        data: {
          interviewId: interview.id,
          blockNumber: 2,
          language: "EN",
          status: "COMPLETED",
          questions: [],
        },
      });

      await db.interviewBlock.create({
        data: {
          interviewId: interview.id,
          blockNumber: 3,
          language: "EN",
          status: "PENDING", // Not completed
          questions: [],
        },
      });

      // Only create feedback for first 2 blocks
      await db.interviewBlockFeedback.create({
        data: {
          blockId: block1.id,
          summary: "Block 1 feedback",
          strengths: "Strengths 1",
          areasForImprovement: "Areas 1",
        },
      });

      await db.interviewBlockFeedback.create({
        data: {
          blockId: block2.id,
          summary: "Block 2 feedback",
          strengths: "Strengths 2",
          areasForImprovement: "Areas 2",
        },
      });

      // Reset mock call count
      vi.mocked(callGeminiForInterviewFeedback).mockClear();

      // Call maybeGenerateInterviewFeedback - should skip
      await maybeGenerateInterviewFeedback(db, interview.id);

      // Verify Gemini was NOT called
      expect(callGeminiForInterviewFeedback).not.toHaveBeenCalled();

      // Verify no interview feedback was created
      const feedback = await db.interviewFeedback.findUnique({
        where: { interviewId: interview.id },
      });

      expect(feedback).toBeNull();
    });
  });

  // ===========================================================================
  // Tests: Generates when all blocks have feedback
  // ===========================================================================

  describe("All blocks have feedback", () => {
    it("should generate interview feedback when all blocks have feedback", async () => {
      const interview = await db.interview.create({
        data: {
          userId: testUser.id,
          jobDescriptionSnapshot: "Complete feedback test",
          resumeSnapshot: "Resume with experience",
          status: "IN_PROGRESS",
          isBlockBased: true,
          idempotencyKey: `unit-test-${Date.now()}-complete`,
        },
      });

      createdInterviewIds.push(interview.id);

      // Create 2 blocks with feedback
      const block1 = await db.interviewBlock.create({
        data: {
          interviewId: interview.id,
          blockNumber: 1,
          language: "EN",
          status: "COMPLETED",
          questions: [],
        },
      });

      const block2 = await db.interviewBlock.create({
        data: {
          interviewId: interview.id,
          blockNumber: 2,
          language: "EN",
          status: "COMPLETED",
          questions: [],
        },
      });

      await db.interviewBlockFeedback.create({
        data: {
          blockId: block1.id,
          summary: "Block 1 summary",
          strengths: "Block 1 strengths",
          areasForImprovement: "Block 1 areas",
        },
      });

      await db.interviewBlockFeedback.create({
        data: {
          blockId: block2.id,
          summary: "Block 2 summary",
          strengths: "Block 2 strengths",
          areasForImprovement: "Block 2 areas",
        },
      });

      // Reset mock call count
      vi.mocked(callGeminiForInterviewFeedback).mockClear();

      // Call maybeGenerateInterviewFeedback - should generate
      await maybeGenerateInterviewFeedback(db, interview.id);

      // Verify Gemini WAS called
      expect(callGeminiForInterviewFeedback).toHaveBeenCalledTimes(1);

      // Verify interview feedback was created with mock data
      const feedback = await db.interviewFeedback.findUnique({
        where: { interviewId: interview.id },
      });

      expect(feedback).not.toBeNull();
      expect(feedback?.summary).toBe("Mock interview summary");
      expect(feedback?.strengths).toBe("Mock interview strengths");
      expect(feedback?.contentAndStructure).toBe("Mock content feedback");
      expect(feedback?.communicationAndDelivery).toBe(
        "Mock communication feedback",
      );
      expect(feedback?.presentation).toBe("Mock presentation feedback");
    });
  });

  // ===========================================================================
  // Tests: Updates interview status to COMPLETED
  // ===========================================================================

  describe("Interview status update", () => {
    it("should update interview status to COMPLETED when generating feedback", async () => {
      const interview = await db.interview.create({
        data: {
          userId: testUser.id,
          jobDescriptionSnapshot: "Status update test",
          resumeSnapshot: "Resume data",
          status: "IN_PROGRESS", // Initially IN_PROGRESS
          isBlockBased: true,
          idempotencyKey: `unit-test-${Date.now()}-status`,
        },
      });

      createdInterviewIds.push(interview.id);

      // Create 2 blocks with feedback
      const block1 = await db.interviewBlock.create({
        data: {
          interviewId: interview.id,
          blockNumber: 1,
          language: "EN",
          status: "COMPLETED",
          questions: [],
        },
      });

      const block2 = await db.interviewBlock.create({
        data: {
          interviewId: interview.id,
          blockNumber: 2,
          language: "EN",
          status: "COMPLETED",
          questions: [],
        },
      });

      await db.interviewBlockFeedback.create({
        data: {
          blockId: block1.id,
          summary: "Summary 1",
          strengths: "Strengths 1",
          areasForImprovement: "Areas 1",
        },
      });

      await db.interviewBlockFeedback.create({
        data: {
          blockId: block2.id,
          summary: "Summary 2",
          strengths: "Strengths 2",
          areasForImprovement: "Areas 2",
        },
      });

      // Call maybeGenerateInterviewFeedback
      await maybeGenerateInterviewFeedback(db, interview.id);

      // Verify interview status is now COMPLETED
      const updatedInterview = await db.interview.findUnique({
        where: { id: interview.id },
      });

      expect(updatedInterview?.status).toBe("COMPLETED");
    });
  });

  // ===========================================================================
  // Tests: Handles non-existent interview
  // ===========================================================================

  describe("Non-existent interview", () => {
    it("should handle non-existent interview gracefully", async () => {
      const fakeInterviewId = "non-existent-interview-id";

      // Reset mock call count
      vi.mocked(callGeminiForInterviewFeedback).mockClear();

      // Should not throw, just log error and return
      await maybeGenerateInterviewFeedback(db, fakeInterviewId);

      // Verify Gemini was NOT called
      expect(callGeminiForInterviewFeedback).not.toHaveBeenCalled();
    });
  });
});
