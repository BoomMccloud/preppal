# FEAT43: Block Interview Feedback Generation

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

Additionally, the current `submitTranscript` handler **discards** block transcript binary data (see `interview-worker.ts` lines 125-131), making transcript aggregation impossible.

## Architecture Decision

**Move feedback orchestration from Worker to Backend.**

| Before | After |
|--------|-------|
| Worker decides when to generate feedback | Worker just submits transcripts |
| Worker has business logic (`if !blockNumber`) | Backend checks "all blocks complete?" |
| Feedback skipped for all blocks | Feedback generated when last block submits |
| Block transcript binary discarded | Block transcript binary stored |

**Why Backend?**
- Backend has all block data (can check completion)
- Single source of truth for interview state
- Worker stays "dumb" (just a pipe)

## Solution

### 0. Schema: Store block transcript binary

**File:** `prisma/schema.prisma`

The current `InterviewBlock` model only has `transcriptId` (a string reference). The actual transcript binary is discarded. We need to store it.

```prisma
model InterviewBlock {
  // ... existing fields

  // ADD: Store transcript binary for aggregation
  transcript   Bytes?

  // Existing field (keep for backwards compat)
  transcriptId String? @unique
}
```

Run `pnpm db:push` after this change.

### 1. Worker: Remove feedback logic

**File:** `worker/src/services/interview-lifecycle-manager.ts`

```typescript
// BEFORE
async finalizeSession(...) {
  await this.apiClient.submitTranscript(...);

  if (!blockNumber) {
    await this.generateAndSubmitFeedback(...);  // DELETE
  }

  if (!blockNumber) {
    await this.apiClient.updateStatus(interviewId, COMPLETED);  // DELETE
  }
}

// AFTER
async finalizeSession(
  interviewId: string,
  transcriptManager: ITranscriptManager,
  context: InterviewContext,
  blockNumber?: number,
): Promise<void> {
  const serializedTranscript = transcriptManager.serializeTranscript();

  // Worker only submits transcript - backend handles everything else
  await this.apiClient.submitTranscript(
    interviewId,
    serializedTranscript,
    new Date().toISOString(),
    blockNumber,
  );
}
```

### 2. Backend: Generate feedback after last block (with race condition protection)

**File:** `src/server/api/routers/interview-worker.ts`

**Critical**: Use a database transaction to prevent duplicate feedback generation when multiple blocks complete simultaneously.

```typescript
submitTranscript: workerProcedure
  .input(submitTranscriptSchema)
  .mutation(async ({ ctx, input }) => {
    const { interviewId, transcript, endedAt, blockNumber } = input;
    const transcriptBlob = Buffer.from(transcript, "base64");

    if (blockNumber !== undefined) {
      // Block-based: use transaction to prevent race conditions
      await ctx.db.$transaction(async (tx) => {
        // Step 1: Save block transcript
        await tx.interviewBlock.update({
          where: {
            interviewId_blockNumber: { interviewId, blockNumber },
          },
          data: {
            transcript: transcriptBlob,  // Store binary
            transcriptId: `block-${interviewId}-${blockNumber}-${Date.now()}`,
            status: "COMPLETED",
            endedAt: new Date(endedAt),
          },
        });

        // Step 2: Check completion status (within same transaction)
        const interview = await tx.interview.findUnique({
          where: { id: interviewId },
          include: {
            blocks: { select: { blockNumber: true, transcript: true } },
            feedback: { select: { id: true } },
          },
        });

        if (!interview) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });
        }

        // Step 3: Skip if feedback already exists (idempotent)
        if (interview.feedback) {
          return;
        }

        // Step 4: Check if all blocks have transcripts
        const allBlocksComplete = interview.blocks.every(b => b.transcript !== null);
        if (!allBlocksComplete) {
          return;
        }

        // Step 5: Generate and save feedback (within transaction)
        await generateInterviewFeedback(tx, interview);
      });

      return { success: true };
    }

    // Standard interview: existing logic unchanged
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

    // Standard interviews still use Worker for feedback (no change)
    return { success: true };
  }),
```

### 3. New module: Backend feedback generation

**File:** `src/server/lib/feedback.ts` (NEW)

Create a backend version of feedback generation. This mirrors `worker/src/utils/feedback.ts` but runs on the backend with server-side env access.

```typescript
// ABOUTME: Backend feedback generation for block-based interviews
// ABOUTME: Aggregates block transcripts and calls Gemini for analysis

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "~/env";
import { Transcript } from "~/proto/transcript_pb";

const FeedbackSchema = z.object({
  summary: z.string().nullable().transform((v) => v ?? ""),
  strengths: z.string().nullable().transform((v) => v ?? ""),
  contentAndStructure: z.string().nullable().transform((v) => v ?? ""),
  communicationAndDelivery: z.string().nullable().transform((v) => v ?? ""),
  presentation: z.string().nullable().transform((v) => v ?? ""),
});

export type FeedbackData = z.infer<typeof FeedbackSchema>;

/**
 * Deserialize protobuf transcript binary to text format.
 */
export function deserializeTranscript(binary: Buffer): string {
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
 * Check if all blocks have transcripts (pure function for testability).
 */
export function shouldGenerateFeedback(
  blocks: { transcript: Buffer | null }[],
  existingFeedback: boolean,
): boolean {
  if (existingFeedback) return false;
  return blocks.every((b) => b.transcript !== null);
}

/**
 * Aggregate block transcripts into a single text for feedback generation.
 */
export function aggregateBlockTranscripts(
  blocks: { blockNumber: number; transcript: Buffer | null }[],
): string {
  return blocks
    .filter((b) => b.transcript !== null)
    .sort((a, b) => a.blockNumber - b.blockNumber)
    .map((b, idx) => {
      const text = deserializeTranscript(b.transcript!);
      return `## Block ${idx + 1}\n\n${text}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Generate feedback from transcript text via Gemini.
 */
export async function generateFeedback(
  transcriptText: string,
  context: { jobDescription: string; resume: string },
): Promise<FeedbackData> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = "gemini-2.0-flash";

  const prompt = `
You are an expert technical interviewer. Analyze the following transcript of a behavioral interview.
Force your output to be a valid JSON object matching this schema:
{
  "summary": "High-level summary of the interview",
  "strengths": "Markdown list of strengths",
  "contentAndStructure": "Detailed feedback on the substance and organization of answers",
  "communicationAndDelivery": "Feedback on verbal communication style, pacing, and clarity",
  "presentation": "Feedback on non-verbal cues and professional presence"
}

Context:
Job Description: ${context.jobDescription || "Not provided"}
Candidate Resume: ${context.resume || "Not provided"}

Transcript:
${transcriptText}

Output JSON only.
`;

  const response = await (ai.models as any).generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const text = response.text?.trim() ?? "";
  const cleanText = text.startsWith("```")
    ? text.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "")
    : text;

  return FeedbackSchema.parse(JSON.parse(cleanText));
}
```

### 4. Helper function in router

**File:** `src/server/api/routers/interview-worker.ts`

```typescript
import {
  generateFeedback,
  aggregateBlockTranscripts,
} from "~/server/lib/feedback";

type InterviewWithBlocks = {
  id: string;
  jobDescriptionSnapshot: string | null;
  resumeSnapshot: string | null;
  blocks: { blockNumber: number; transcript: Buffer | null }[];
};

/**
 * Generate and save feedback for a completed block-based interview.
 * Called within a transaction to ensure atomicity.
 */
async function generateInterviewFeedback(
  tx: Prisma.TransactionClient,
  interview: InterviewWithBlocks,
): Promise<void> {
  // Aggregate all block transcripts
  const aggregatedTranscript = aggregateBlockTranscripts(interview.blocks);

  // Generate feedback via Gemini
  const feedback = await generateFeedback(aggregatedTranscript, {
    jobDescription: interview.jobDescriptionSnapshot ?? "",
    resume: interview.resumeSnapshot ?? "",
  });

  // Save feedback
  await tx.interviewFeedback.create({
    data: {
      interviewId: interview.id,
      summary: feedback.summary,
      strengths: feedback.strengths,
      contentAndStructure: feedback.contentAndStructure,
      communicationAndDelivery: feedback.communicationAndDelivery,
      presentation: feedback.presentation,
    },
  });

  // Update interview status
  await tx.interview.update({
    where: { id: interview.id },
    data: { status: "COMPLETED" },
  });
}
```

## Data Flow After Fix

```
Block 1 ends → submitTranscript(block=1) → save transcript → check: 1/3 complete → skip
Block 2 ends → submitTranscript(block=2) → save transcript → check: 2/3 complete → skip
Block 3 ends → submitTranscript(block=3) → save transcript → check: 3/3 complete → GENERATE
                                                                                      ↓
                                                                Transaction commits →
                                                                                      ↓
                                                               Frontend polls → displays
```

**Race Condition Protection:**
```
Block 2 & 3 complete simultaneously:
  Thread A: BEGIN TRANSACTION
  Thread A: save block 2 → check: 2/3 → skip → COMMIT
  Thread B: BEGIN TRANSACTION
  Thread B: save block 3 → check: 3/3 → generate → COMMIT ✓

Even if both see 3/3:
  Thread A: sees no feedback → generates → creates feedback → COMMIT ✓
  Thread B: sees no feedback → generates → tries to create →
           UNIQUE CONSTRAINT VIOLATION (interviewId) → transaction fails gracefully
```

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `transcript Bytes?` to `InterviewBlock` |
| `worker/src/services/interview-lifecycle-manager.ts` | Remove feedback generation and status update logic |
| `src/server/api/routers/interview-worker.ts` | Add transaction-based completion check and feedback generation |
| `src/server/lib/feedback.ts` | **NEW** - Backend feedback generation utilities |

## Unit Tests

**File:** `src/test/unit/feedback.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { shouldGenerateFeedback, aggregateBlockTranscripts } from "~/server/lib/feedback";

describe("shouldGenerateFeedback", () => {
  it("returns false if feedback already exists", () => {
    const blocks = [{ transcript: Buffer.from("data") }];
    expect(shouldGenerateFeedback(blocks, true)).toBe(false);
  });

  it("returns false if any block missing transcript", () => {
    const blocks = [
      { transcript: Buffer.from("data") },
      { transcript: null },
    ];
    expect(shouldGenerateFeedback(blocks, false)).toBe(false);
  });

  it("returns true if all blocks have transcripts and no feedback", () => {
    const blocks = [
      { transcript: Buffer.from("data1") },
      { transcript: Buffer.from("data2") },
    ];
    expect(shouldGenerateFeedback(blocks, false)).toBe(true);
  });
});

describe("aggregateBlockTranscripts", () => {
  it("sorts blocks by blockNumber", () => {
    // Test with mock protobuf data
  });

  it("skips blocks without transcripts", () => {
    // Test filtering
  });
});
```

## Verification

1. Start a 3-block interview
2. Complete all 3 blocks (let them timeout or click Next)
3. After block 3, should navigate to feedback page
4. Feedback should appear within ~10 seconds (Gemini generation time)
5. No "Processing Feedback" infinite spinner

**Race condition test:**
1. Set up 2-block interview
2. Use browser dev tools to delay one block's submitTranscript
3. Trigger both blocks to complete nearly simultaneously
4. Verify only ONE feedback record is created

## Future: Per-Block Scoring

This spec generates **one feedback for the entire interview**. Per-block scoring (FEAT28) can be added later:

```typescript
// After saving each block transcript:
void generateBlockScore(interviewId, blockNumber);  // Fire-and-forget

// Final feedback includes block scores:
{
  summary: "...",
  blockScores: [
    { block: 1, title: "Technical", score: 85 },
    { block: 2, title: "Behavioral", score: 78 },
  ]
}
```

## Why This Is Maintainable

**6 months from now, new developer asks: "Where does feedback get generated?"**

Answer: `submitTranscript` handler in `interview-worker.ts`. After saving each block transcript, it checks if all blocks are done within a transaction. If yes, generates feedback atomically.

**Key architectural properties:**
- **Single source of truth**: Backend owns completion logic
- **Race-safe**: Transaction prevents duplicate feedback
- **Testable**: Pure functions for completion check and aggregation
- **Dumb worker**: Worker just submits transcripts, no business logic
