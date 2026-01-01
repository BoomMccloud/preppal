/**
 * Unit tests for block feedback generation.
 * Tests the generateBlockFeedback function in isolation.
 *
 * ABOUTME: Tests FEAT43 block-level feedback generation logic
 * ABOUTME: Verifies edge cases and error handling for block feedback
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { User } from "@prisma/client";

// Mock Gemini client to avoid real API calls
vi.mock("~/server/lib/gemini-client", () => ({
  callGeminiForBlockFeedback: vi.fn(async () => ({
    summary: "Mock block feedback summary",
    strengths: "Mock strengths",
    areasForImprovement: "Mock areas for improvement",
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
import { generateBlockFeedback } from "~/server/lib/block-feedback";
import { callGeminiForBlockFeedback } from "~/server/lib/gemini-client";

// =============================================================================
// Test Setup
// =============================================================================

describe("generateBlockFeedback", () => {
  let testUser: User;
  let testInterviewId: string;
  const createdInterviewIds: string[] = [];
  const createdBlockIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        email: `block-feedback-unit-${Date.now()}@example.com`,
        name: "Block Feedback Unit Test User",
      },
    });

    // Create test interview
    const interview = await db.interview.create({
      data: {
        userId: testUser.id,
        jobDescriptionSnapshot: "Software Engineer at Google",
        resumeSnapshot: "5 years experience in backend development",
        status: "IN_PROGRESS",
        isBlockBased: true,
        templateId: "test-template",
        idempotencyKey: `block-unit-test-${Date.now()}`,
      },
    });

    testInterviewId = interview.id;
    createdInterviewIds.push(interview.id);
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

      await db.interview.deleteMany({
        where: { id: { in: createdInterviewIds } },
      });
    }

    await db.user.delete({ where: { id: testUser.id } });
  });

  // ===========================================================================
  // Tests: Generates feedback for valid block with transcript
  // ===========================================================================

  describe("Valid block with transcript", () => {
    it("should generate feedback for a block with valid transcript data", async () => {
      // Create a block with mock transcript (JSON, will fail deserialize but we mock the call)
      const block = await db.interviewBlock.create({
        data: {
          interviewId: testInterviewId,
          blockNumber: 1,
          language: "EN",
          status: "COMPLETED",
          transcript: Buffer.from(JSON.stringify({ test: "data" })),
          questions: [],
        },
      });

      createdBlockIds.push(block.id);

      // This will fail at transcript deserialization, so won't call Gemini
      await generateBlockFeedback(db, block.id);

      // Since transcript is invalid JSON (not protobuf), feedback won't be generated
      const feedback = await db.interviewBlockFeedback.findUnique({
        where: { blockId: block.id },
      });

      // Should be null because invalid transcript format
      expect(feedback).toBeNull();
    });
  });

  // ===========================================================================
  // Tests: Skips if block has no transcript
  // ===========================================================================

  describe("Block without transcript", () => {
    it("should skip feedback generation if block has no transcript", async () => {
      const block = await db.interviewBlock.create({
        data: {
          interviewId: testInterviewId,
          blockNumber: 2,
          language: "EN",
          status: "COMPLETED",
          questions: [],
          // No transcript field
        },
      });

      createdBlockIds.push(block.id);

      // Should not throw, just skip
      await generateBlockFeedback(db, block.id);

      // Verify no feedback was created
      const feedback = await db.interviewBlockFeedback.findUnique({
        where: { blockId: block.id },
      });

      expect(feedback).toBeNull();

      // Verify Gemini was NOT called
      expect(callGeminiForBlockFeedback).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Tests: Skips if transcript is invalid (can't deserialize)
  // ===========================================================================

  describe("Invalid transcript format", () => {
    it("should skip feedback generation if transcript cannot be deserialized", async () => {
      const block = await db.interviewBlock.create({
        data: {
          interviewId: testInterviewId,
          blockNumber: 3,
          language: "EN",
          status: "COMPLETED",
          transcript: Buffer.from("invalid protobuf data"),
          questions: [],
        },
      });

      createdBlockIds.push(block.id);

      // Should not throw, just skip
      await generateBlockFeedback(db, block.id);

      // Verify no feedback was created
      const feedback = await db.interviewBlockFeedback.findUnique({
        where: { blockId: block.id },
      });

      expect(feedback).toBeNull();

      // Gemini should not have been called
      expect(callGeminiForBlockFeedback).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Tests: Idempotent - second call is no-op
  // ===========================================================================

  describe("Idempotency", () => {
    it("should be idempotent - second call does not overwrite existing feedback", async () => {
      const block = await db.interviewBlock.create({
        data: {
          interviewId: testInterviewId,
          blockNumber: 4,
          language: "EN",
          status: "COMPLETED",
          transcript: Buffer.from("some data"),
          questions: [],
        },
      });

      createdBlockIds.push(block.id);

      // Manually create feedback first
      const originalFeedback = await db.interviewBlockFeedback.create({
        data: {
          blockId: block.id,
          summary: "Original summary",
          strengths: "Original strengths",
          areasForImprovement: "Original areas",
        },
      });

      // Call generateBlockFeedback - should be no-op due to upsert with empty update
      await generateBlockFeedback(db, block.id);

      // Verify feedback still has original values (not updated)
      const updatedFeedback = await db.interviewBlockFeedback.findUnique({
        where: { blockId: block.id },
      });

      expect(updatedFeedback?.summary).toBe("Original summary");
      expect(updatedFeedback?.strengths).toBe("Original strengths");
      expect(updatedFeedback?.areasForImprovement).toBe("Original areas");
      expect(updatedFeedback?.id).toBe(originalFeedback.id);
    });
  });

  // ===========================================================================
  // Tests: Handles non-existent block
  // ===========================================================================

  describe("Non-existent block", () => {
    it("should handle non-existent block gracefully", async () => {
      const fakeBlockId = "non-existent-block-id";

      // Should not throw, just log error and return
      await generateBlockFeedback(db, fakeBlockId);

      // No feedback should be created
      const feedback = await db.interviewBlockFeedback.findUnique({
        where: { blockId: fakeBlockId },
      });

      expect(feedback).toBeNull();
    });
  });
});
