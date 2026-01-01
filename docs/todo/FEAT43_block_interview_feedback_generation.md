# FEAT43: Block & Interview Feedback System

> **Status:** Ready
> **Created:** 2025-12-31
> **Updated:** 2026-01-01
> **Verified:** 2026-01-01 (see FEAT43_verification_report.md)
>
> **Queue-Ready:** Yes - functions are self-contained, only require `blockId`/`interviewId`

## Overview

Implement a two-level feedback system for block-based interviews:
- **Block Feedback**: Generated immediately when each block completes
- **Interview Feedback**: Generated when all blocks have feedback

## Prerequisites

Before implementation, ensure:

1. **Protobuf files accessible from server**
   - Currently in `worker/src/lib/proto/`
   - Need to move/copy to shared location (e.g., `src/lib/proto/`)
   - Or configure build to make them available

2. **Dependencies for server**
   - `@bufbuild/protobuf` - already in worker, add to main package.json
   - `@google/genai` - already in worker, verify in main package.json

3. **Environment variable**
   - `GEMINI_API_KEY` must be accessible from server (check `src/env.js`)

## First-Principle Architecture

### The "Dumb Pipe" Principle

**Worker = Dumb Pipe**: Manages real-time Gemini session, submits transcript, done.

**Server = Business Logic**: Receives transcript, decides what to trigger, executes.

```
Worker                              Server
──────                              ──────
Session ends for Block 2
   │
   └─► submitTranscript(            receives transcript
         blockNumber: 2,               │
         transcript: binary            ├─► Store block transcript
       )                               │
                                       ├─► Generate block feedback (always)
       ┌───────────────────────────────┘
       │
       └─► Check: all blocks have feedback?
             ├─ No  → done
             └─ Yes → Generate interview feedback
```

### Why Server Triggers Everything

| Aspect | Worker Knows | Server Knows |
|--------|--------------|--------------|
| Transcript binary | ✅ | ✅ (after submit) |
| Block number | ✅ | ✅ |
| Other blocks' state | ❌ | ✅ |
| Interview context (JD, resume) | ❌ | ✅ |
| Existing feedback | ❌ | ✅ |

**Conclusion**: Server has complete picture → Server makes all decisions.

### Two Feedback Levels

| Level | Scope | Trigger | Purpose |
|-------|-------|---------|---------|
| **Block Feedback** | Single block | Transcript submitted | Immediate, specific feedback |
| **Interview Feedback** | All blocks | All blocks have feedback | Holistic assessment |

This separation provides:
1. **Immediate value**: User sees feedback after each block
2. **Single responsibility**: Each feedback type has one trigger
3. **Clean data model**: No "is this the last block?" logic

## Data Model

### Schema Changes

**File:** `prisma/schema.prisma`

**Note:** The current `InterviewBlock` model has `transcriptId String? @unique` which stores a reference ID.
We need to ADD `transcript Bytes?` to store the actual binary data. The `transcriptId` field will be deprecated.

```prisma
model InterviewBlock {
  // ... existing fields (id, interviewId, blockNumber, language, questions, etc.)

  // DEPRECATED: Will be removed after migration
  transcriptId String? @unique

  // NEW: Store transcript binary directly
  transcript   Bytes?

  // NEW: Block-level feedback (one per block)
  feedback     InterviewBlockFeedback?
}

// NEW MODEL
model InterviewBlockFeedback {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  // Link to block
  blockId   String   @unique
  block     InterviewBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)

  // Feedback content
  summary               String @default("")
  strengths             String @default("")
  areasForImprovement   String @default("")

  @@index([blockId])
}

// EXISTING MODEL - no changes needed
model InterviewFeedback {
  // ... existing fields (interview-level feedback)

  // VERIFIED: Already @unique - prevents duplicates ✅
  interviewId String @unique
}
```

### Entity Relationships

```
Interview (1) ──── (*) InterviewBlock
    │                      │
    │                      └── (1) InterviewBlockFeedback
    │
    └── (1) InterviewFeedback
```

## Implementation

### 1. Server: Handle Transcript Submission

**File:** `src/server/api/routers/interview-worker.ts`

```typescript
submitTranscript: workerProcedure
  .input(submitTranscriptSchema)
  .mutation(async ({ ctx, input }) => {
    const { interviewId, transcript, endedAt, blockNumber } = input;
    const transcriptBlob = Buffer.from(transcript, "base64");

    // Block-based interview
    if (blockNumber !== undefined) {
      // 1. Store block transcript
      const block = await ctx.db.interviewBlock.update({
        where: {
          interviewId_blockNumber: { interviewId, blockNumber },
        },
        data: {
          transcript: transcriptBlob,
          status: "COMPLETED",
          endedAt: new Date(endedAt),
        },
      });

      // 2. Generate block feedback (always, immediately)
      // Note: Function fetches its own data - queue-ready signature
      await generateBlockFeedback(ctx.db, block.id);

      // 3. Check if interview feedback should be generated
      await maybeGenerateInterviewFeedback(ctx.db, interviewId);

      return { success: true };
    }

    // Standard (non-block) interview: existing behavior
    // ...
  }),
```

### 2. Block Feedback Generation

**File:** `src/server/lib/block-feedback.ts`

```typescript
// ABOUTME: Generates feedback for a single interview block
// ABOUTME: Self-contained function - fetches own data, queue-ready

import type { PrismaClient } from "@prisma/client";
import { callGeminiForBlockFeedback } from "./gemini-client";
import { transcriptBinaryToText } from "./transcript-utils";

/**
 * Generate feedback for a single block.
 *
 * Design: Self-contained function that fetches its own data.
 * This makes it trivial to migrate to a job queue later:
 *   - Synchronous: await generateBlockFeedback(db, blockId)
 *   - Queue:       await queue.send({ blockId }) → handler calls same function
 *
 * Idempotent: uses upsert to prevent duplicates.
 */
export async function generateBlockFeedback(
  db: PrismaClient,
  blockId: string,
): Promise<void> {
  // Fetch block with transcript and interview context
  const block = await db.interviewBlock.findUnique({
    where: { id: blockId },
    include: {
      interview: {
        select: {
          jobDescriptionSnapshot: true,
          resumeSnapshot: true,
        },
      },
    },
  });

  if (!block) {
    console.error(`[BlockFeedback] Block ${blockId} not found`);
    return;
  }

  if (!block.transcript) {
    console.error(`[BlockFeedback] Block ${blockId} has no transcript`);
    return;
  }

  // Deserialize protobuf binary and format as text for Gemini
  const transcriptText = transcriptBinaryToText(block.transcript);

  const feedback = await callGeminiForBlockFeedback(transcriptText, {
    jobDescription: block.interview.jobDescriptionSnapshot ?? "",
    resume: block.interview.resumeSnapshot ?? "",
  });

  // Upsert to handle race conditions
  await db.interviewBlockFeedback.upsert({
    where: { blockId },
    create: {
      blockId,
      summary: feedback.summary,
      strengths: feedback.strengths,
      areasForImprovement: feedback.areasForImprovement,
    },
    update: {}, // No-op if exists
  });

  console.log(`[BlockFeedback] Generated for block ${blockId}`);
}
```

### 3. Interview Feedback Generation

**File:** `src/server/lib/interview-feedback.ts`

```typescript
// ABOUTME: Generates holistic feedback for entire interview
// ABOUTME: Self-contained function - fetches own data, queue-ready

import type { PrismaClient } from "@prisma/client";

/**
 * Check if all blocks have feedback. If yes, generate interview feedback.
 *
 * Design: Self-contained function that fetches its own data.
 * Only requires interviewId - trivial to call from queue handler.
 *
 * Idempotent: checks if feedback exists before generating.
 */
export async function maybeGenerateInterviewFeedback(
  db: PrismaClient,
  interviewId: string,
): Promise<void> {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: {
      blocks: {
        include: { feedback: true },
        orderBy: { blockNumber: "asc" },
      },
      feedback: { select: { id: true } },
    },
  });

  if (!interview) return;

  // Already has interview feedback
  if (interview.feedback) {
    console.log(`[InterviewFeedback] Already exists for ${interviewId}`);
    return;
  }

  // Check if all blocks have feedback
  const allBlocksHaveFeedback = interview.blocks.every(b => b.feedback !== null);

  if (!allBlocksHaveFeedback) {
    const complete = interview.blocks.filter(b => b.feedback).length;
    console.log(`[InterviewFeedback] ${complete}/${interview.blocks.length} blocks have feedback`);
    return;
  }

  // All blocks complete - generate interview feedback
  console.log(`[InterviewFeedback] Generating for ${interviewId}`);

  const blockFeedbacks = interview.blocks.map(b => b.feedback!);

  const feedback = await callGeminiForInterviewFeedback(blockFeedbacks, {
    jobDescription: interview.jobDescriptionSnapshot ?? "",
    resume: interview.resumeSnapshot ?? "",
  });

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
      update: {},
    }),
    db.interview.update({
      where: { id: interviewId },
      data: { status: "COMPLETED" },
    }),
  ]);
}
```

### 4. File Structure

```
src/server/lib/
├── block-feedback.ts       # Block-level feedback generation
├── interview-feedback.ts   # Interview-level feedback generation
├── transcript-utils.ts     # Server-side protobuf deserialization (NEW)
└── gemini-client.ts        # Gemini API calls (shared)
```

Each module:
- Has single responsibility
- Knows nothing about the other
- Uses dependency injection for testability

### 5. Server-Side Transcript Utilities

**File:** `src/server/lib/transcript-utils.ts`

**Why needed:** The `deserializeTranscript` function exists in `worker/src/transcript-manager.ts` but is not
accessible from the Next.js server. We need server-side protobuf utilities.

**Prerequisites:**
1. Install `@bufbuild/protobuf` as a server dependency (already in worker)
2. Ensure proto-generated files are accessible from server (may need to share or copy)

```typescript
// ABOUTME: Server-side transcript deserialization utilities
// ABOUTME: Mirrors worker/src/transcript-manager.ts for server use

import { fromBinary } from "@bufbuild/protobuf";
import {
  TranscriptSchema,
  Speaker,
  type Transcript,
} from "~/lib/proto/transcript_pb.js";  // Shared proto location

/**
 * Deserialize binary protobuf to transcript object.
 * Server-side equivalent of worker's deserializeTranscript.
 */
export function deserializeTranscript(data: Buffer | Uint8Array): Transcript {
  const uint8 = data instanceof Buffer ? new Uint8Array(data) : data;
  return fromBinary(TranscriptSchema, uint8);
}

/**
 * Format a deserialized transcript as plain text for feedback generation.
 */
export function formatTranscriptAsText(transcript: Transcript): string {
  return (transcript.turns ?? [])
    .map((t) => {
      const speaker = t.speaker === Speaker.USER ? "USER" : "AI";
      return `${speaker}: ${t.content ?? ""}`;
    })
    .join("\n");
}

/**
 * Convenience: Deserialize and format in one step.
 * This is what block-feedback.ts will use.
 */
export function transcriptBinaryToText(data: Buffer | Uint8Array): string {
  const transcript = deserializeTranscript(data);
  return formatTranscriptAsText(transcript);
}
```

**Implementation Note:** The proto files are currently in `worker/src/lib/proto/`. We need to either:
- Option A: Move proto files to a shared location (`src/lib/proto/`) accessible by both
- Option B: Copy the generated proto files to server location
- **Recommended:** Option A - consolidate proto files in shared location

## Data Flow

```
Block 1 completes
   └─► Worker.submitTranscript(block=1)
         └─► Server stores transcript
               └─► Server generates BlockFeedback for Block 1
                     └─► Check: 1/3 blocks have feedback → skip interview feedback

Block 2 completes
   └─► Worker.submitTranscript(block=2)
         └─► Server stores transcript
               └─► Server generates BlockFeedback for Block 2
                     └─► Check: 2/3 blocks have feedback → skip interview feedback

Block 3 completes
   └─► Worker.submitTranscript(block=3)
         └─► Server stores transcript
               └─► Server generates BlockFeedback for Block 3
                     └─► Check: 3/3 blocks have feedback → GENERATE InterviewFeedback
                           └─► Set interview status = COMPLETED
```

### 6. Gemini Client

**File:** `src/server/lib/gemini-client.ts`

**Reference implementation:** Follow the pattern in `worker/src/utils/feedback.ts`:
- Uses `@google/genai` (GoogleGenAI)
- Uses Zod schema for response validation
- Uses `gemini-2.0-flash` model
- Returns structured JSON via `responseMimeType: "application/json"`

```typescript
// ABOUTME: Server-side Gemini API client for feedback generation
// ABOUTME: Follows pattern from worker/src/utils/feedback.ts

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "~/env";

const BlockFeedbackSchema = z.object({
  summary: z.string().nullable().transform((v) => v ?? ""),
  strengths: z.string().nullable().transform((v) => v ?? ""),
  areasForImprovement: z.string().nullable().transform((v) => v ?? ""),
});

export type BlockFeedbackData = z.infer<typeof BlockFeedbackSchema>;

export async function callGeminiForBlockFeedback(
  transcriptText: string,
  context: { jobDescription: string; resume: string },
): Promise<BlockFeedbackData> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = "gemini-2.0-flash";

  const prompt = `
You are an expert interviewer. Analyze this interview block transcript.
Output JSON matching: { "summary": string, "strengths": string, "areasForImprovement": string }

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
  const cleanText = text.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
  return BlockFeedbackSchema.parse(JSON.parse(cleanText));
}

// Similar function for interview-level feedback (callGeminiForInterviewFeedback)
// Uses the existing InterviewFeedback schema fields
```

## Worker Changes

**Worker responsibility**: Submit transcript only. No feedback logic.

**File:** `worker/src/services/interview-lifecycle-manager.ts`

### Code to Remove

1. **Import** (line 10):
   ```typescript
   // DELETE THIS LINE
   import { generateFeedback } from "../utils/feedback";
   ```

2. **Conditional feedback logic** (lines 109-115):
   ```typescript
   // DELETE THIS BLOCK
   if (!blockNumber) {
     await this.generateAndSubmitFeedback(
       interviewId,
       transcriptText,
       context,
     );
   }
   ```

3. **Method** `generateAndSubmitFeedback` (lines 165-192):
   ```typescript
   // DELETE THIS ENTIRE METHOD
   private async generateAndSubmitFeedback(...): Promise<void> {
     // ... all of it
   }
   ```

### Simplified `finalizeSession` Method

After removal, the method becomes:

```typescript
async finalizeSession(
  interviewId: string,
  transcriptManager: ITranscriptManager,
  context: InterviewContext,
  blockNumber?: number,
): Promise<void> {
  try {
    const endedAt = new Date().toISOString();
    const serializedTranscript = transcriptManager.serializeTranscript();

    // Submit transcript - Server handles all feedback logic
    await this.apiClient.submitTranscript(
      interviewId,
      serializedTranscript,
      endedAt,
      blockNumber,
    );
    console.log(`[InterviewLifecycleManager] Transcript submitted`);

    // Update status (only for non-block interviews)
    if (!blockNumber) {
      await this.apiClient.updateStatus(interviewId, INTERVIEW_STATUS.COMPLETED);
    }
  } catch (error) {
    await this.handleError(interviewId, error as Error);
  }
}
```

**Note:** The file `worker/src/utils/feedback.ts` can remain for reference but is no longer imported.

## Race Condition Handling

### Block Feedback Race

```
Two requests arrive for same block simultaneously:

Request A: generates feedback → upsert creates record
Request B: generates feedback → upsert no-ops (record exists)

Result: Exactly one BlockFeedback record.
```

### Interview Feedback Race

```
Block 3 submitted twice simultaneously:

Request A: checks → 3/3 complete → generates interview feedback → upsert creates
Request B: checks → 3/3 complete → generates interview feedback → upsert no-ops

Result: Exactly one InterviewFeedback record.
```

Both handled by `@unique` constraints + upsert pattern.

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `InterviewBlockFeedback` model, add `transcript Bytes?` to `InterviewBlock` |
| `src/server/api/routers/interview-worker.ts` | Store transcript blob, call feedback generation |
| `src/server/lib/transcript-utils.ts` | **NEW** - Server-side protobuf deserialization |
| `src/server/lib/block-feedback.ts` | **NEW** - Block feedback generation |
| `src/server/lib/interview-feedback.ts` | **NEW** - Interview feedback generation |
| `src/server/lib/gemini-client.ts` | **NEW** - Gemini API client (follows worker pattern) |
| `worker/src/services/interview-lifecycle-manager.ts` | Remove import, conditional, and method |
| `src/lib/proto/` (or shared location) | Ensure proto files accessible from server |

## Testing Strategy

### Unit Tests

```typescript
// src/test/unit/block-feedback.test.ts

describe("generateBlockFeedback", () => {
  it("generates feedback for a single block", async () => {
    const mockDb = createMockDb({
      interviewBlock: {
        findUnique: vi.fn().mockResolvedValue({
          id: "block-1",
          transcript: Buffer.from("test transcript"),
          interview: { jobDescriptionSnapshot: "JD", resumeSnapshot: "Resume" },
        }),
      },
    });
    const mockGemini = vi.fn().mockResolvedValue({ summary: "Good job" });

    // Note: Only blockId needed - function fetches its own data
    await generateBlockFeedback(mockDb, "block-1", mockGemini);

    expect(mockDb.interviewBlockFeedback.upsert).toHaveBeenCalled();
  });

  it("skips if block has no transcript", async () => {
    const mockDb = createMockDb({
      interviewBlock: {
        findUnique: vi.fn().mockResolvedValue({ id: "block-1", transcript: null }),
      },
    });

    await generateBlockFeedback(mockDb, "block-1");

    expect(mockDb.interviewBlockFeedback.upsert).not.toHaveBeenCalled();
  });

  it("is idempotent - second call is no-op", async () => {
    // ...
  });
});
```

```typescript
// src/test/unit/interview-feedback.test.ts

describe("maybeGenerateInterviewFeedback", () => {
  it("skips if not all blocks have feedback", async () => {
    const interview = {
      blocks: [
        { feedback: { id: "1" } },
        { feedback: null }, // Missing!
        { feedback: { id: "3" } },
      ],
      feedback: null,
    };

    await maybeGenerateInterviewFeedback(mockDb, "interview-1");

    expect(mockGemini).not.toHaveBeenCalled();
  });

  it("generates when all blocks have feedback", async () => {
    const interview = {
      blocks: [
        { feedback: { id: "1" } },
        { feedback: { id: "2" } },
        { feedback: { id: "3" } },
      ],
      feedback: null,
    };

    await maybeGenerateInterviewFeedback(mockDb, "interview-1");

    expect(mockGemini).toHaveBeenCalled();
  });
});
```

### Integration Tests

1. Complete 3-block interview → verify 3 BlockFeedback + 1 InterviewFeedback
2. Complete only 2 blocks → verify 2 BlockFeedback, no InterviewFeedback
3. Submit same block twice → verify single BlockFeedback (idempotent)

## Acceptance Criteria

- [ ] Prerequisites complete (proto files shared, dependencies added)
- [ ] Schema migration applied successfully (transcript Bytes?, InterviewBlockFeedback)
- [ ] Server-side transcript utilities working (transcriptBinaryToText)
- [ ] Each completed block has `InterviewBlockFeedback` record
- [ ] Interview feedback generated only when all blocks have feedback
- [ ] No duplicate feedback records (race condition safe)
- [ ] Worker feedback code removed (import, conditional, method)
- [ ] Unit tests pass with >80% coverage

## First-Principle Checklist

| Principle | Requirement | Implementation |
|-----------|-------------|----------------|
| **Dumb Pipe** | Worker only delivers data | Worker submits transcript, nothing else |
| **Single Trigger** | Each feedback type has one trigger | Block: transcript submitted. Interview: all blocks have feedback |
| **Source of Truth** | Server owns all state | Server decides when to generate feedback |
| **Separation** | Two feedback types are independent | Separate modules, separate schemas |
| **Idempotency** | Safe against retries/races | Upsert + @unique constraints |
| **Testability** | Logic testable without mocks | Dependency injection for Gemini calls |
| **Queue-Ready** | Functions only need IDs | Self-contained functions fetch own data |

## Future: Queue Migration

When ready to migrate to a background queue (e.g., Inngest, BullMQ), the change is minimal:

### Current (Synchronous)

```typescript
// interview-worker.ts
await generateBlockFeedback(ctx.db, block.id);
await maybeGenerateInterviewFeedback(ctx.db, interviewId);
```

### Future (Queue)

```typescript
// interview-worker.ts
await inngest.send({ name: "block-feedback", data: { blockId: block.id } });

// inngest/functions.ts
inngest.createFunction(
  { id: "generate-block-feedback", retries: 3 },
  { event: "block-feedback" },
  async ({ event }) => {
    await generateBlockFeedback(db, event.data.blockId);  // Same function!
    await maybeGenerateInterviewFeedback(db, event.data.interviewId);
  }
);
```

**Why this works:**
1. Functions only need `blockId`/`interviewId` - serializable primitives
2. Functions fetch their own data from DB
3. Functions are idempotent - safe for retries
4. No request context required - works in any execution environment
