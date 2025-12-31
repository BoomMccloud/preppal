# FEAT43: Block Interview Feedback Generation (Phase 1)

> **Status:** Ready
> **Created:** 2025-12-31
> **Related:** FEAT31 (Original Bug), FEAT41 (Block Completion Flow)

## Problem Statement

Block-based interviews get stuck on "Processing Feedback" indefinitely because feedback generation is skipped when `blockNumber` is set.

## Root Cause

In `worker/src/services/interview-lifecycle-manager.ts` lines 106-115:

```typescript
// For block-based interviews, we might skip full feedback generation per block
// and instead do it at the very end of the interview.
// For now, we only generate feedback if it's NOT a block-based session.
if (!blockNumber) {
  await this.generateAndSubmitFeedback(
    interviewId,
    transcriptText,
    context,
  );
}
```

When any block completes, `blockNumber` is set, so feedback is **always skipped** for block-based interviews.

Additionally, `submitTranscript` in `interview-worker.ts` **discards** block transcript binary data (lines 125-131), making transcript aggregation impossible.

## First-Principle Analysis

### Alternative Approaches Considered

| Approach | Description | Verdict |
|----------|-------------|---------|
| **A: Backend-Driven** | Backend stores transcripts, checks completion, generates feedback | ✅ Selected |
| **B: Worker-Driven** | Worker detects "last block", aggregates, generates | ❌ Risk of out-of-order blocks |
| **C: Event-Driven** | Queue consumer handles feedback generation | ❌ Overkill for current scale |
| **D: Hybrid** | Worker signals `isLast`, Backend generates | ❌ Tight coupling |
| **E: Background Job** | Cron polls for complete interviews | ❌ Up to 30s latency |

### Why Approach A (Backend-Driven)?

1. **Single Source of Truth** - Backend owns all interview state; no split-brain risk
2. **Immediate Feedback** - No polling latency; good UX
3. **Minimal Changes** - Worker code unchanged; low risk
4. **No New Infrastructure** - No queues, crons, or new services

### Design Principles Applied

| Principle | Status | Notes |
|-----------|--------|-------|
| Source of Truth Topology | ✅ | Backend is single authority for completion |
| Side-Effect Control Flow | ✅ | Intent-based: `submitTranscript` → check → generate |
| Hardware Driver Pattern | ✅ | Gemini abstracted with dependency injection |
| Lifecycle & Concurrency | ✅ | Race condition handled with upsert |
| Testability | ✅ | Pure functions + injectable dependencies |

## Architecture Decision

**Backend generates feedback for block interviews.**

| Aspect | Before | After |
|--------|--------|-------|
| Block transcript binary | Discarded | Stored in `InterviewBlock.transcript` |
| Block feedback trigger | Never (skipped) | Backend checks "all blocks complete?" |
| Standard interviews | Worker generates | Worker generates (unchanged) |
| Worker responsibility | Mixed (transcript + feedback) | Transcript only (for blocks) |

**Why Backend for blocks?**
- Backend has all block data (can check completion)
- Single source of truth for interview state
- No extra API call needed (data already there)
- Worker code for standard interviews stays untouched (risk reduction)

**Phase 2 (future):** Move standard interview feedback to Backend too, fully simplifying Worker.

## Solution

### 0. Schema: Store block transcript binary

**File:** `prisma/schema.prisma`

```prisma
model InterviewBlock {
  // ... existing fields

  // ADD: Store transcript binary for aggregation
  transcript   Bytes?

  // Existing field (keep for backwards compat)
  transcriptId String? @unique
}

model InterviewFeedback {
  // ... existing fields

  // VERIFY: This must be @unique to prevent duplicate feedback (race condition protection)
  interviewId String @unique
}
```

Run `pnpm db:push` after this change.

### 1. Backend: Store transcript and generate feedback when complete

**File:** `src/server/api/routers/interview-worker.ts`

```typescript
import {
  generateFeedbackFromTranscript,
  shouldGenerateFeedback,
  type InterviewWithBlocks,
} from "~/server/lib/feedback";

submitTranscript: workerProcedure
  .input(submitTranscriptSchema)
  .mutation(async ({ ctx, input }) => {
    const { interviewId, transcript, endedAt, blockNumber } = input;
    const transcriptBlob = Buffer.from(transcript, "base64");

    // Block-based interview
    if (blockNumber !== undefined) {
      // Step 1: Store block transcript (no longer discarded!)
      await ctx.db.interviewBlock.update({
        where: {
          interviewId_blockNumber: { interviewId, blockNumber },
        },
        data: {
          transcript: transcriptBlob,
          transcriptId: `block-${interviewId}-${blockNumber}-${Date.now()}`,
          status: "COMPLETED",
          endedAt: new Date(endedAt),
        },
      });

      // Step 2: Check if all blocks complete and generate feedback
      await maybeGenerateBlockFeedback(ctx.db, interviewId);

      return { success: true };
    }

    // Standard interview: UNCHANGED (Worker still generates feedback)
    await ctx.db.$transaction([
      ctx.db.transcriptEntry.upsert({
        where: { interviewId },
        update: { transcript: transcriptBlob },
        create: { interviewId, transcript: transcriptBlob },
      }),
      ctx.db.interview.update({
        where: { id: interviewId },
        data: { status: "COMPLETED", endedAt: new Date(endedAt) },
      }),
    ]);

    return { success: true };
  }),
```

### 2. Helper: Check completion and generate feedback

**File:** `src/server/api/routers/interview-worker.ts` (same file, add helper)

```typescript
import type { PrismaClient } from "@prisma/client";

/**
 * Check if all blocks have transcripts. If yes, generate and save feedback.
 * Idempotent: uses upsert to prevent duplicate feedback on race conditions.
 */
async function maybeGenerateBlockFeedback(
  db: PrismaClient,
  interviewId: string,
): Promise<void> {
  // Fetch interview with blocks and existing feedback
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: {
      blocks: {
        select: { blockNumber: true, transcript: true },
        orderBy: { blockNumber: "asc" },
      },
      feedback: { select: { id: true } },
    },
  });

  if (!interview) {
    console.error(`[Feedback] Interview ${interviewId} not found`);
    return;
  }

  // Use pure function to check if we should generate feedback
  if (!shouldGenerateFeedback(interview)) {
    const complete = interview.blocks.filter((b) => b.transcript).length;
    console.log(
      `[Feedback] Skipping ${interviewId}: ${interview.feedback ? "feedback exists" : `${complete}/${interview.blocks.length} blocks complete`}`
    );
    return;
  }

  // All blocks complete - generate feedback
  console.log(`[Feedback] All ${interview.blocks.length} blocks complete for ${interviewId}, generating feedback`);

  try {
    await generateFeedbackFromTranscript(db, interviewId, interview.blocks);
    console.log(`[Feedback] Successfully generated for ${interviewId}`);
  } catch (error) {
    console.error(`[Feedback] Failed for ${interviewId}:`, error);
    // Best effort - don't throw, interview still marked complete
  }
}
```

### 3. New module: Backend feedback utilities

**File:** `src/server/lib/feedback.ts` (NEW)

```typescript
// ABOUTME: Backend feedback generation for block-based interviews
// ABOUTME: Aggregates block transcripts and calls Gemini for analysis

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "~/env";
import { Transcript } from "~/proto/transcript_pb";
import type { PrismaClient } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export type BlockWithTranscript = {
  blockNumber: number;
  transcript: Buffer | null;
};

export type InterviewWithBlocks = {
  blocks: BlockWithTranscript[];
  feedback: { id: string } | null;
};

type FeedbackContext = {
  jobDescription: string;
  resume: string;
};

type FeedbackResult = z.infer<typeof FeedbackSchema>;

// Dependency injection type for testability
export type FeedbackGenerator = (
  transcript: string,
  context: FeedbackContext,
) => Promise<FeedbackResult>;

// ============================================================================
// Schema
// ============================================================================

const FeedbackSchema = z.object({
  summary: z.string().nullable().transform((v) => v ?? ""),
  strengths: z.string().nullable().transform((v) => v ?? ""),
  contentAndStructure: z.string().nullable().transform((v) => v ?? ""),
  communicationAndDelivery: z.string().nullable().transform((v) => v ?? ""),
  presentation: z.string().nullable().transform((v) => v ?? ""),
});

// ============================================================================
// Prompt Template (extracted for testability)
// ============================================================================

export const FEEDBACK_PROMPT_TEMPLATE = {
  systemRole: "expert technical interviewer",
  instruction: `Analyze the following transcript of a behavioral interview.

Return a JSON object with these fields:
- summary: High-level summary of the interview (2-3 sentences)
- strengths: Markdown bullet list of candidate strengths
- contentAndStructure: Feedback on substance and organization of answers
- communicationAndDelivery: Feedback on verbal communication, pacing, clarity
- presentation: Feedback on professionalism and presence`,
};

export function buildFeedbackPrompt(
  transcriptText: string,
  context: FeedbackContext,
): string {
  return `You are an ${FEEDBACK_PROMPT_TEMPLATE.systemRole}. ${FEEDBACK_PROMPT_TEMPLATE.instruction}

Context:
Job Description: ${context.jobDescription || "Not provided"}
Candidate Resume: ${context.resume || "Not provided"}

Transcript:
${transcriptText}

Return valid JSON only.`;
}

// ============================================================================
// Pure Functions (testable without mocks)
// ============================================================================

/**
 * Pure function: Determine if feedback should be generated.
 * Returns true only if:
 * - No feedback exists yet
 * - All blocks have transcripts
 */
export function shouldGenerateFeedback(interview: InterviewWithBlocks): boolean {
  if (interview.feedback !== null) {
    return false;
  }
  return interview.blocks.every((b) => b.transcript !== null);
}

/**
 * Deserialize protobuf transcript binary to text format.
 */
function deserializeTranscript(binary: Buffer): string {
  try {
    const transcript = Transcript.fromBinary(new Uint8Array(binary));
    return transcript.turns
      .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join("\n");
  } catch {
    return "[Unable to deserialize transcript]";
  }
}

/**
 * Aggregate block transcripts into a single text for feedback generation.
 * Blocks are sorted by blockNumber and concatenated with separators.
 */
export function aggregateBlockTranscripts(blocks: BlockWithTranscript[]): string {
  return blocks
    .filter((b): b is BlockWithTranscript & { transcript: Buffer } => b.transcript !== null)
    .sort((a, b) => a.blockNumber - b.blockNumber)
    .map((b, idx) => {
      const text = deserializeTranscript(b.transcript);
      return `## Block ${idx + 1}\n\n${text}`;
    })
    .join("\n\n---\n\n");
}

// ============================================================================
// Infrastructure (Gemini Driver)
// ============================================================================

/**
 * Generate feedback from aggregated transcript text via Gemini.
 * This is the default implementation; can be replaced in tests.
 */
export async function callGeminiForFeedback(
  transcriptText: string,
  context: FeedbackContext,
): Promise<FeedbackResult> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = buildFeedbackPrompt(transcriptText, context);

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" },
  });

  const text = response.text?.trim() ?? "{}";
  const cleanText = text.startsWith("```")
    ? text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    : text;

  return FeedbackSchema.parse(JSON.parse(cleanText));
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Generate and save feedback for a completed block-based interview.
 *
 * @param db - Prisma client
 * @param interviewId - Interview ID
 * @param blocks - Blocks with transcripts
 * @param feedbackGenerator - Optional: inject mock for testing (defaults to Gemini)
 */
export async function generateFeedbackFromTranscript(
  db: PrismaClient,
  interviewId: string,
  blocks: BlockWithTranscript[],
  feedbackGenerator: FeedbackGenerator = callGeminiForFeedback,
): Promise<void> {
  // Get interview context
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    select: {
      jobDescriptionSnapshot: true,
      resumeSnapshot: true,
    },
  });

  if (!interview) {
    throw new Error(`Interview ${interviewId} not found`);
  }

  // Aggregate transcripts
  const aggregatedTranscript = aggregateBlockTranscripts(blocks);

  // Generate feedback via injected generator (Gemini by default)
  const feedback = await feedbackGenerator(aggregatedTranscript, {
    jobDescription: interview.jobDescriptionSnapshot ?? "",
    resume: interview.resumeSnapshot ?? "",
  });

  // Save feedback using UPSERT to prevent race condition duplicates
  // The @unique constraint on interviewId is the safety net
  await db.$transaction([
    db.interviewFeedback.upsert({
      where: { interviewId },
      create: {
        interviewId,
        summary: feedback.summary,
        strengths: feedback.strengths,
        contentAndStructure: feedback.contentAndStructure,
        communicationAndDelivery: feedback.communicationAndDelivery,
        presentation: feedback.presentation,
      },
      update: {}, // No-op if already exists (idempotent)
    }),
    db.interview.update({
      where: { id: interviewId },
      data: { status: "COMPLETED" },
    }),
  ]);
}
```

### 4. Worker: No changes for Phase 1

The Worker code remains **unchanged**. It still:
- Submits transcripts (works for both standard and block)
- Generates feedback for standard interviews
- Skips feedback for block interviews (Backend now handles this)

Phase 2 will remove Worker feedback code entirely.

## Data Flow After Fix

```
Block 1 ends → Worker.submitTranscript(block=1)
                  → Backend stores transcript
                  → Backend checks: 1/3 complete → skip feedback

Block 2 ends → Worker.submitTranscript(block=2)
                  → Backend stores transcript
                  → Backend checks: 2/3 complete → skip feedback

Block 3 ends → Worker.submitTranscript(block=3)
                  → Backend stores transcript
                  → Backend checks: 3/3 complete → GENERATE FEEDBACK
                  → Backend upserts feedback (race-safe)
                  → Backend sets status=COMPLETED
                  → Frontend polls → displays feedback
```

### Race Condition Handling

```
Concurrent requests for Block 3:

Request A: checks → 3/3 complete → generates feedback
Request B: checks → 3/3 complete → generates feedback

Request A: upsert → creates feedback record
Request B: upsert → no-op (record exists) ← SAFE!

Result: Exactly one feedback record. No duplicates.
```

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `transcript Bytes?` to InterviewBlock, verify `interviewId @unique` on InterviewFeedback |
| `src/server/api/routers/interview-worker.ts` | Store transcript, call `maybeGenerateBlockFeedback` |
| `src/server/lib/feedback.ts` | **NEW** - Backend feedback generation |

**No Worker changes required.**

## Unit Tests

**File:** `src/test/unit/backend-feedback.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  aggregateBlockTranscripts,
  shouldGenerateFeedback,
  buildFeedbackPrompt,
  generateFeedbackFromTranscript,
  type BlockWithTranscript,
  type InterviewWithBlocks,
} from "~/server/lib/feedback";
import { Transcript, Turn } from "~/proto/transcript_pb";

// ============================================================================
// Test Helpers
// ============================================================================

function mockTranscript(content: string): Buffer {
  const transcript = new Transcript();
  const turn = new Turn();
  turn.role = "user";
  turn.content = content;
  transcript.turns = [turn];
  return Buffer.from(transcript.toBinary());
}

function createMockDb(overrides: Partial<{
  interview: object;
  existingFeedback: boolean;
}> = {}) {
  return {
    interview: {
      findUnique: vi.fn().mockResolvedValue(overrides.interview ?? {
        jobDescriptionSnapshot: "Test JD",
        resumeSnapshot: "Test Resume",
      }),
    },
    interviewFeedback: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation((ops) => Promise.all(ops)),
  };
}

// ============================================================================
// Pure Function Tests
// ============================================================================

describe("shouldGenerateFeedback", () => {
  it("returns false if feedback already exists", () => {
    const interview: InterviewWithBlocks = {
      blocks: [
        { blockNumber: 1, transcript: mockTranscript("test") },
      ],
      feedback: { id: "existing-feedback" },
    };

    expect(shouldGenerateFeedback(interview)).toBe(false);
  });

  it("returns false if any block missing transcript", () => {
    const interview: InterviewWithBlocks = {
      blocks: [
        { blockNumber: 1, transcript: mockTranscript("test") },
        { blockNumber: 2, transcript: null },
        { blockNumber: 3, transcript: mockTranscript("test") },
      ],
      feedback: null,
    };

    expect(shouldGenerateFeedback(interview)).toBe(false);
  });

  it("returns true when all blocks complete and no feedback exists", () => {
    const interview: InterviewWithBlocks = {
      blocks: [
        { blockNumber: 1, transcript: mockTranscript("test1") },
        { blockNumber: 2, transcript: mockTranscript("test2") },
        { blockNumber: 3, transcript: mockTranscript("test3") },
      ],
      feedback: null,
    };

    expect(shouldGenerateFeedback(interview)).toBe(true);
  });

  it("returns true for empty blocks array (edge case)", () => {
    const interview: InterviewWithBlocks = {
      blocks: [],
      feedback: null,
    };

    // Array.every on empty array returns true
    expect(shouldGenerateFeedback(interview)).toBe(true);
  });
});

describe("aggregateBlockTranscripts", () => {
  it("sorts blocks by blockNumber", () => {
    const blocks: BlockWithTranscript[] = [
      { blockNumber: 3, transcript: mockTranscript("block 3") },
      { blockNumber: 1, transcript: mockTranscript("block 1") },
      { blockNumber: 2, transcript: mockTranscript("block 2") },
    ];

    const result = aggregateBlockTranscripts(blocks);

    expect(result).toContain("## Block 1");
    expect(result).toContain("## Block 2");
    expect(result).toContain("## Block 3");
    expect(result.indexOf("Block 1")).toBeLessThan(result.indexOf("Block 2"));
    expect(result.indexOf("Block 2")).toBeLessThan(result.indexOf("Block 3"));
  });

  it("skips blocks without transcripts and re-indexes", () => {
    const blocks: BlockWithTranscript[] = [
      { blockNumber: 1, transcript: mockTranscript("block 1") },
      { blockNumber: 2, transcript: null },
      { blockNumber: 3, transcript: mockTranscript("block 3") },
    ];

    const result = aggregateBlockTranscripts(blocks);

    // Block 1 content present, Block 3 becomes "Block 2" in output
    expect(result).toContain("## Block 1");
    expect(result).toContain("## Block 2"); // Re-indexed from block 3
    expect(result).not.toContain("## Block 3");
  });

  it("returns empty string for no transcripts", () => {
    const blocks: BlockWithTranscript[] = [
      { blockNumber: 1, transcript: null },
      { blockNumber: 2, transcript: null },
    ];

    const result = aggregateBlockTranscripts(blocks);
    expect(result).toBe("");
  });

  it("handles single block", () => {
    const blocks: BlockWithTranscript[] = [
      { blockNumber: 1, transcript: mockTranscript("only block") },
    ];

    const result = aggregateBlockTranscripts(blocks);
    expect(result).toContain("## Block 1");
    expect(result).toContain("only block");
    expect(result).not.toContain("---"); // No separator for single block
  });
});

describe("buildFeedbackPrompt", () => {
  it("includes transcript and context", () => {
    const prompt = buildFeedbackPrompt("Test transcript", {
      jobDescription: "Software Engineer",
      resume: "10 years experience",
    });

    expect(prompt).toContain("Test transcript");
    expect(prompt).toContain("Software Engineer");
    expect(prompt).toContain("10 years experience");
    expect(prompt).toContain("expert technical interviewer");
  });

  it("handles missing context gracefully", () => {
    const prompt = buildFeedbackPrompt("Test transcript", {
      jobDescription: "",
      resume: "",
    });

    expect(prompt).toContain("Not provided");
  });
});

// ============================================================================
// Integration Tests (with mocked dependencies)
// ============================================================================

describe("generateFeedbackFromTranscript", () => {
  it("calls feedback generator with aggregated transcript", async () => {
    const mockGenerator = vi.fn().mockResolvedValue({
      summary: "Test summary",
      strengths: "Test strengths",
      contentAndStructure: "Test content",
      communicationAndDelivery: "Test communication",
      presentation: "Test presentation",
    });

    const mockDb = createMockDb() as any;
    const blocks: BlockWithTranscript[] = [
      { blockNumber: 1, transcript: mockTranscript("block 1") },
      { blockNumber: 2, transcript: mockTranscript("block 2") },
    ];

    await generateFeedbackFromTranscript(
      mockDb,
      "interview-123",
      blocks,
      mockGenerator,
    );

    expect(mockGenerator).toHaveBeenCalledTimes(1);
    const [transcript, context] = mockGenerator.mock.calls[0];
    expect(transcript).toContain("Block 1");
    expect(transcript).toContain("Block 2");
    expect(context.jobDescription).toBe("Test JD");
  });

  it("uses upsert to prevent duplicate feedback", async () => {
    const mockGenerator = vi.fn().mockResolvedValue({
      summary: "Test",
      strengths: "",
      contentAndStructure: "",
      communicationAndDelivery: "",
      presentation: "",
    });

    const mockDb = createMockDb() as any;
    const blocks: BlockWithTranscript[] = [
      { blockNumber: 1, transcript: mockTranscript("test") },
    ];

    await generateFeedbackFromTranscript(
      mockDb,
      "interview-123",
      blocks,
      mockGenerator,
    );

    // Verify upsert was called (not create)
    expect(mockDb.interviewFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { interviewId: "interview-123" },
        create: expect.any(Object),
        update: {}, // No-op update for idempotency
      }),
    );
  });

  it("throws if interview not found", async () => {
    const mockDb = createMockDb({ interview: null }) as any;
    mockDb.interview.findUnique = vi.fn().mockResolvedValue(null);

    const blocks: BlockWithTranscript[] = [
      { blockNumber: 1, transcript: mockTranscript("test") },
    ];

    await expect(
      generateFeedbackFromTranscript(mockDb, "nonexistent", blocks),
    ).rejects.toThrow("Interview nonexistent not found");
  });
});
```

## Acceptance Criteria (Phase 1 → Phase 2 Gate)

Before proceeding to Phase 2 (moving standard interview feedback to Backend):

- [ ] Schema migration applied successfully
- [ ] `InterviewFeedback.interviewId` has `@unique` constraint
- [ ] 10+ block interviews complete with feedback generated
- [ ] No duplicate feedback records in database
- [ ] Feedback quality matches Worker-generated feedback (spot check)
- [ ] No errors in logs related to feedback generation
- [ ] Standard interviews still work (unchanged path)
- [ ] Unit tests pass with >80% coverage on feedback.ts

## Verification

### Manual Testing

1. Start a 3-block interview
2. Complete all 3 blocks
3. After block 3, verify:
   - All 3 `InterviewBlock` records have `transcript` populated
   - `InterviewFeedback` record created
   - Interview status is `COMPLETED`
   - Frontend displays feedback (no infinite spinner)

### Edge Cases

1. **Incomplete interview**: Complete only 2 of 3 blocks, verify no feedback generated
2. **Retry block**: Complete block 2 twice, verify transcript updated (not duplicated)
3. **Race condition**: Simulate concurrent block 3 submissions, verify single feedback record
4. **Slow Gemini**: Verify frontend polling handles delay gracefully

### Database Verification

```sql
-- Check for duplicate feedback (should return 0)
SELECT interviewId, COUNT(*) as count
FROM InterviewFeedback
GROUP BY interviewId
HAVING count > 1;

-- Verify all completed block interviews have feedback
SELECT i.id, i.status, f.id as feedbackId
FROM Interview i
LEFT JOIN InterviewFeedback f ON i.id = f.interviewId
WHERE i.status = 'COMPLETED'
AND EXISTS (SELECT 1 FROM InterviewBlock b WHERE b.interviewId = i.id);
```

## Phase 2 Preview

Once Phase 1 is validated, Phase 2 will:

1. Move standard interview feedback from Worker to Backend
2. Simplify Worker's `finalizeSession` to only submit transcripts
3. Delete `worker/src/utils/feedback.ts` (or keep for reference)
4. Single code path for all feedback generation

This keeps Phase 1 low-risk while setting up for a cleaner architecture.

## Appendix: First-Principle Checklist

| Principle | Requirement | Implementation |
|-----------|-------------|----------------|
| **Source of Truth** | Single owner for feedback state | Backend owns; Worker just submits |
| **Side-Effect Control** | Intent-based, not reactive | `submitTranscript` → check → generate |
| **Driver Pattern** | Infrastructure is dumb | Gemini call abstracted, injectable |
| **Concurrency** | Handle race conditions | Upsert + @unique constraint |
| **Testability** | Logic testable without mocks | Pure `shouldGenerateFeedback`, injectable generator |
