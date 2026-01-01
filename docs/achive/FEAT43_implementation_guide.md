# Implementation Guide: Block & Interview Feedback System

**Based on Spec**: `FEAT43_block_interview_feedback_generation.md`
**Verification Report**: `FEAT43_verification_report.md`
**Generated**: 2026-01-01
**Estimated Total Time**: 4-5 hours

---

## 📋 Overview

### What You're Building

You're implementing a two-level feedback system for block-based interviews. When a user completes an interview block, the server immediately generates feedback for that block. When all blocks have feedback, the server automatically generates holistic interview feedback.

### 💡 Core Concept (The "North Star")

**"Worker = Dumb Pipe. Server = Brain."**

The Worker only delivers transcript data. The Server owns ALL business logic: storing transcripts, deciding when to generate feedback, and executing AI calls. This separation means the Worker never needs to know about other blocks or interview state—it just submits data and moves on.

**Two feedback levels, two triggers:**
- **Block Feedback**: Generated immediately when a block's transcript is submitted
- **Interview Feedback**: Generated when ALL blocks have their feedback

### Deliverables

After completing this guide, you will have:

- [ ] New `InterviewBlockFeedback` model in Prisma schema
- [ ] `transcript Bytes?` field added to `InterviewBlock`
- [ ] `GEMINI_API_KEY` environment variable accessible server-side
- [ ] Server-side transcript utilities (`src/server/lib/transcript-utils.ts`)
- [ ] Block feedback generation (`src/server/lib/block-feedback.ts`)
- [ ] Interview feedback generation (`src/server/lib/interview-feedback.ts`)
- [ ] Gemini client for server-side AI calls (`src/server/lib/gemini-client.ts`)
- [ ] Updated `submitTranscript` procedure to store transcripts and trigger feedback
- [ ] Worker feedback code removed (no longer generates feedback)

### Files You Will Modify

| File | Action | Summary |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `transcript Bytes?` to InterviewBlock, add InterviewBlockFeedback model |
| `src/env.js` | Modify | Add `GEMINI_API_KEY` environment variable |
| `src/server/lib/transcript-utils.ts` | **Create** | Server-side protobuf deserialization |
| `src/server/lib/gemini-client.ts` | **Create** | Gemini API client for feedback generation |
| `src/server/lib/block-feedback.ts` | **Create** | Block-level feedback generation logic |
| `src/server/lib/interview-feedback.ts` | **Create** | Interview-level feedback generation logic |
| `src/server/api/routers/interview-worker.ts` | Modify | Store transcript blob, trigger feedback generation |
| `worker/src/services/interview-lifecycle-manager.ts` | Modify | Remove feedback generation code |

### ⛔ Out of Scope - DO NOT MODIFY

These files/areas are **not part of this task**:

- `src/app/*` - No UI changes needed
- `worker/src/utils/feedback.ts` - Keep for reference, but don't call it
- `worker/src/transcript-manager.ts` - Already correct, no changes needed
- Any test files (tests are documented but optional for initial implementation)

If you think something outside this scope needs changing, **stop and ask**.

---

## 🔧 Prerequisites

Before starting, complete these checks:

### 1. Environment Setup

```bash
# Verify you're in the project root
pwd
# Should show: /path/to/preppal

# Install dependencies
pnpm install

# Verify the project builds
pnpm build
```

### 2. Verify Tests Pass

```bash
pnpm test
```

✅ All tests should pass before you start. If tests fail, **stop and report the issue**.

### 3. Create Your Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/block-interview-feedback
```

### 4. Verify Proto Files Exist

```bash
ls src/lib/proto/transcript_pb.ts
```

✅ This file should exist. It contains the protobuf definitions needed for transcript deserialization.

### 5. Verify Dependencies

```bash
grep "@bufbuild/protobuf" package.json
grep "@google/genai" package.json
```

✅ Both should show version entries (already installed).

---

## 📍 Phase 1: Schema & Environment (Est. 30 mins)

### [ ] Step 1.1: Add GEMINI_API_KEY to Environment

#### Goal

Make the Gemini API key accessible to the Next.js server for AI feedback generation.

#### 📁 File

`src/env.js`

#### 🔍 Find This Location

Open the file and navigate to **line 22**. You should see:

```javascript
// Line 20
    JWT_SECRET: z.string().min(32),
// Line 21
    WORKER_SHARED_SECRET: z.string().min(32),
// Line 22
    RESEND_API_KEY: z.string().optional(),
// Line 23
    EMAIL_FROM: z.string().email().optional(),
```

#### ✏️ Action: Add New Environment Variable

**Current (Lines 20-23):**
```javascript
    JWT_SECRET: z.string().min(32),
    WORKER_SHARED_SECRET: z.string().min(32),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
```

**Replace With:**
```javascript
    JWT_SECRET: z.string().min(32),
    WORKER_SHARED_SECRET: z.string().min(32),
    GEMINI_API_KEY: z.string().min(1),  // ← NEW: Required for feedback generation
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
```

#### 🔍 Find Second Location

Now navigate to **line 48**. You should see:

```javascript
// Line 47
    WORKER_SHARED_SECRET: process.env.WORKER_SHARED_SECRET,
// Line 48
    RESEND_API_KEY: process.env.RESEND_API_KEY,
// Line 49
    EMAIL_FROM: process.env.EMAIL_FROM,
```

#### ✏️ Action: Add Runtime Environment Mapping

**Current (Lines 47-49):**
```javascript
    WORKER_SHARED_SECRET: process.env.WORKER_SHARED_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
```

**Replace With:**
```javascript
    WORKER_SHARED_SECRET: process.env.WORKER_SHARED_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,  // ← NEW
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
```

#### ⚠️ Common Mistakes

**Mistake 1: Forgetting the runtimeEnv mapping**
```javascript
// ❌ WRONG - Only added to schema, not runtimeEnv
server: {
  GEMINI_API_KEY: z.string(),
},
// runtimeEnv section missing the variable

// ✅ CORRECT - Added to BOTH sections
server: {
  GEMINI_API_KEY: z.string(),
},
runtimeEnv: {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
},
```

**Mistake 2: Making it optional when it's required**
```javascript
// ❌ WRONG - Feedback generation will fail silently
GEMINI_API_KEY: z.string().optional(),

// ✅ CORRECT - Fail fast if not configured
GEMINI_API_KEY: z.string().min(1),
```

#### ✅ Verification Gate

```bash
# Verify the env file has no TypeScript errors
pnpm typecheck
```

⚠️ **Note**: The build will fail until you add `GEMINI_API_KEY` to your `.env` file. Add it now:

```bash
echo "GEMINI_API_KEY=your-api-key-here" >> .env
```

---

### [ ] Step 1.2: Add transcript Field to InterviewBlock

#### Goal

Add a `transcript Bytes?` field to store the actual transcript binary data. The existing `transcriptId` field is deprecated.

#### 📁 File

`prisma/schema.prisma`

#### 🔍 Find This Location

Open the file and navigate to **line 263**. You should see:

```prisma
// Line 261
  status      BlockStatus @default(PENDING)
// Line 262
// Line 263
  // Transcript stored separately (future: link to TranscriptEntry)
// Line 264
  transcriptId String? @unique
// Line 265
// Line 266
  @@unique([interviewId, blockNumber])
```

#### ✏️ Action: Add transcript Field

**Current (Lines 261-266):**
```prisma
  status      BlockStatus @default(PENDING)

  // Transcript stored separately (future: link to TranscriptEntry)
  transcriptId String? @unique

  @@unique([interviewId, blockNumber])
```

**Replace With:**
```prisma
  status      BlockStatus @default(PENDING)

  // DEPRECATED: Will be removed after migration
  transcriptId String? @unique

  // Transcript binary data (protobuf format)
  transcript   Bytes?

  // Block-level feedback (one per block)
  feedback     InterviewBlockFeedback?

  @@unique([interviewId, blockNumber])
```

#### ⚠️ Common Mistakes

**Mistake 1: Removing transcriptId immediately**
```prisma
// ❌ WRONG - Breaking change, existing data references this
transcript   Bytes?
// transcriptId removed

// ✅ CORRECT - Keep both during migration
transcriptId String? @unique  // DEPRECATED
transcript   Bytes?
```

**Mistake 2: Wrong field type**
```prisma
// ❌ WRONG - String can't store binary efficiently
transcript   String?

// ✅ CORRECT - Bytes is for binary data
transcript   Bytes?
```

---

### [ ] Step 1.3: Add InterviewBlockFeedback Model

#### Goal

Create a new model to store feedback for each interview block.

#### 📁 File

`prisma/schema.prisma`

#### 🔍 Find This Location

Navigate to the end of `InterviewBlock` model, **line 270**. You should see:

```prisma
// Line 268
  @@unique([interviewId, blockNumber])
// Line 269
  @@index([interviewId])
// Line 270
}
// Line 271
(end of file or empty line)
```

#### ✏️ Action: Add New Model After InterviewBlock

Insert the following at **line 272** (after the closing brace of InterviewBlock):

```prisma
// Block-level feedback generated after each block completes
model InterviewBlockFeedback {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  // Link to block (one-to-one)
  blockId   String   @unique
  block     InterviewBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)

  // Feedback content
  summary             String @default("")
  strengths           String @default("")
  areasForImprovement String @default("")

  @@index([blockId])
}
```

#### ⚠️ Common Mistakes

**Mistake 1: Forgetting @unique on blockId**
```prisma
// ❌ WRONG - Allows multiple feedback records per block
blockId   String
block     InterviewBlock @relation(...)

// ✅ CORRECT - Enforces one feedback per block
blockId   String   @unique
block     InterviewBlock @relation(...)
```

**Mistake 2: Wrong onDelete behavior**
```prisma
// ❌ WRONG - Orphaned feedback when block deleted
block     InterviewBlock @relation(fields: [blockId], references: [id])

// ✅ CORRECT - Cascade delete with block
block     InterviewBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)
```

---

### [ ] Step 1.4: Run Schema Migration

#### Goal

Apply the schema changes to your database and regenerate the Prisma client.

#### ✏️ Action: Run Migration Commands

```bash
# Generate Prisma client with new types
pnpm prisma generate

# Push schema changes to database (development)
pnpm db:push
```

#### ✅ Verification Gate

```bash
# Verify Prisma client has new types
pnpm typecheck
```

If you see errors about `InterviewBlockFeedback` not existing, run `pnpm prisma generate` again.

---

## 📍 Phase 2: Server-Side Utilities (Est. 45 mins)

### [ ] Step 2.1: Create Transcript Utilities

#### Goal

Create server-side utilities to deserialize protobuf transcript data and convert it to text for AI processing.

#### 📁 File

`src/server/lib/transcript-utils.ts` (**NEW FILE**)

#### ✏️ Action: Create New File

Create the file with this content:

```typescript
// ABOUTME: Server-side transcript deserialization utilities
// ABOUTME: Mirrors worker/src/transcript-manager.ts for server use

import { fromBinary } from "@bufbuild/protobuf";
import {
  TranscriptSchema,
  Speaker,
  type Transcript,
} from "~/lib/proto/transcript_pb";

/**
 * Deserialize binary protobuf to transcript object.
 * Server-side equivalent of worker's deserializeTranscript.
 */
export function deserializeTranscript(data: Buffer | Uint8Array): Transcript {
  const uint8 = data instanceof Buffer ? new Uint8Array(data) : data;
  return fromBinary(TranscriptSchema, uint8);
}

/**
 * Convert Speaker enum to display string
 */
function speakerToString(speaker: Speaker): string {
  switch (speaker) {
    case Speaker.USER:
      return "USER";
    case Speaker.AI:
      return "AI";
    default:
      return "UNKNOWN";
  }
}

/**
 * Format a deserialized transcript as plain text for feedback generation.
 */
export function formatTranscriptAsText(transcript: Transcript): string {
  return (transcript.turns ?? [])
    .map((t) => {
      const speaker = speakerToString(t.speaker ?? Speaker.SPEAKER_UNSPECIFIED);
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

#### ⚠️ Common Mistakes

**Mistake 1: Wrong import path for proto**
```typescript
// ❌ WRONG - Worker path, not accessible from server
import { TranscriptSchema } from "../../worker/src/lib/proto/transcript_pb";

// ✅ CORRECT - Shared location accessible by server
import { TranscriptSchema } from "~/lib/proto/transcript_pb";
```

**Mistake 2: Not handling Buffer type**
```typescript
// ❌ WRONG - Prisma returns Buffer, not Uint8Array
export function deserializeTranscript(data: Uint8Array): Transcript {
  return fromBinary(TranscriptSchema, data);
}

// ✅ CORRECT - Handle both types
export function deserializeTranscript(data: Buffer | Uint8Array): Transcript {
  const uint8 = data instanceof Buffer ? new Uint8Array(data) : data;
  return fromBinary(TranscriptSchema, uint8);
}
```

#### ✅ Verification Gate

```bash
pnpm typecheck
```

---

### [ ] Step 2.2: Create Gemini Client

#### Goal

Create a server-side Gemini API client following the pattern from `worker/src/utils/feedback.ts`.

#### 📁 File

`src/server/lib/gemini-client.ts` (**NEW FILE**)

#### ✏️ Action: Create New File

```typescript
// ABOUTME: Server-side Gemini API client for feedback generation
// ABOUTME: Follows pattern from worker/src/utils/feedback.ts

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "~/env";

// Schema for block-level feedback
const BlockFeedbackSchema = z.object({
  summary: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  strengths: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  areasForImprovement: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
});

export type BlockFeedbackData = z.infer<typeof BlockFeedbackSchema>;

// Schema for interview-level feedback (matches existing InterviewFeedback model)
const InterviewFeedbackSchema = z.object({
  summary: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  strengths: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  contentAndStructure: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  communicationAndDelivery: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  presentation: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
});

export type InterviewFeedbackData = z.infer<typeof InterviewFeedbackSchema>;

/**
 * Generate feedback for a single block's transcript.
 */
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

Provide concise, actionable feedback. Output JSON only.
`;

  try {
    const response = await (ai.models as any).generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = response.text?.trim() ?? "";
    const cleanText = text.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
    return BlockFeedbackSchema.parse(JSON.parse(cleanText));
  } catch (error) {
    console.error("[GeminiClient] Block feedback generation failed:", error);
    throw error;
  }
}

/**
 * Generate holistic feedback for the entire interview based on all block feedbacks.
 */
export async function callGeminiForInterviewFeedback(
  blockFeedbacks: Array<{ summary: string; strengths: string; areasForImprovement: string }>,
  context: { jobDescription: string; resume: string },
): Promise<InterviewFeedbackData> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = "gemini-2.0-flash";

  const blockSummaries = blockFeedbacks
    .map((bf, i) => `Block ${i + 1}:\nSummary: ${bf.summary}\nStrengths: ${bf.strengths}\nAreas: ${bf.areasForImprovement}`)
    .join("\n\n");

  const prompt = `
You are an expert interviewer. Based on the feedback from each interview block, provide holistic interview feedback.
Output JSON matching:
{
  "summary": "Overall interview summary",
  "strengths": "Key strengths across all blocks",
  "contentAndStructure": "Feedback on substance and organization of answers",
  "communicationAndDelivery": "Feedback on verbal communication style, pacing, clarity",
  "presentation": "Feedback on professional presence and non-verbal cues"
}

Context:
Job Description: ${context.jobDescription || "Not provided"}
Candidate Resume: ${context.resume || "Not provided"}

Block Feedbacks:
${blockSummaries}

Synthesize the block feedbacks into comprehensive interview feedback. Output JSON only.
`;

  try {
    const response = await (ai.models as any).generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = response.text?.trim() ?? "";
    const cleanText = text.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
    return InterviewFeedbackSchema.parse(JSON.parse(cleanText));
  } catch (error) {
    console.error("[GeminiClient] Interview feedback generation failed:", error);
    throw error;
  }
}
```

#### ⚠️ Common Mistakes

**Mistake 1: Using wrong API key source**
```typescript
// ❌ WRONG - apiKey not passed, uses undefined
const ai = new GoogleGenAI({});

// ❌ WRONG - process.env bypasses validation
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ✅ CORRECT - Use validated env
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
```

**Mistake 2: Not cleaning markdown code blocks**
```typescript
// ❌ WRONG - Gemini sometimes wraps JSON in ```json blocks
const json = JSON.parse(response.text);

// ✅ CORRECT - Strip potential markdown
const cleanText = text.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
const json = JSON.parse(cleanText);
```

#### ✅ Verification Gate

```bash
pnpm typecheck
```

---

## 📍 Phase 3: Feedback Generation Logic (Est. 60 mins)

### [ ] Step 3.1: Create Block Feedback Generator

#### Goal

Create a self-contained function that generates feedback for a single block. This function fetches its own data (queue-ready design).

#### 📁 File

`src/server/lib/block-feedback.ts` (**NEW FILE**)

#### ✏️ Action: Create New File

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
  console.log(`[BlockFeedback] Starting for block ${blockId}`);

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
  console.log(`[BlockFeedback] Transcript text length: ${transcriptText.length}`);

  // Generate feedback using Gemini
  const feedback = await callGeminiForBlockFeedback(transcriptText, {
    jobDescription: block.interview.jobDescriptionSnapshot ?? "",
    resume: block.interview.resumeSnapshot ?? "",
  });

  // Upsert to handle race conditions (second call becomes no-op)
  await db.interviewBlockFeedback.upsert({
    where: { blockId },
    create: {
      blockId,
      summary: feedback.summary,
      strengths: feedback.strengths,
      areasForImprovement: feedback.areasForImprovement,
    },
    update: {}, // No-op if already exists
  });

  console.log(`[BlockFeedback] Generated feedback for block ${blockId}`);
}
```

#### ⚠️ Common Mistakes

**Mistake 1: Passing transcript data instead of fetching**
```typescript
// ❌ WRONG - Not self-contained, can't queue easily
export async function generateBlockFeedback(
  db: PrismaClient,
  blockId: string,
  transcript: Buffer,  // Requires caller to have transcript
): Promise<void>

// ✅ CORRECT - Self-contained, only needs blockId
export async function generateBlockFeedback(
  db: PrismaClient,
  blockId: string,
): Promise<void>
```

**Mistake 2: Using create instead of upsert**
```typescript
// ❌ WRONG - Fails on race condition (duplicate key)
await db.interviewBlockFeedback.create({
  data: { blockId, ... }
});

// ✅ CORRECT - Idempotent, second call is no-op
await db.interviewBlockFeedback.upsert({
  where: { blockId },
  create: { blockId, ... },
  update: {}, // No-op
});
```

#### ✅ Verification Gate

```bash
pnpm typecheck
```

---

### [ ] Step 3.2: Create Interview Feedback Generator

#### Goal

Create a function that checks if all blocks have feedback and, if so, generates interview-level feedback.

#### 📁 File

`src/server/lib/interview-feedback.ts` (**NEW FILE**)

#### ✏️ Action: Create New File

```typescript
// ABOUTME: Generates holistic feedback for entire interview
// ABOUTME: Self-contained function - fetches own data, queue-ready

import type { PrismaClient } from "@prisma/client";
import { callGeminiForInterviewFeedback } from "./gemini-client";

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
  console.log(`[InterviewFeedback] Checking ${interviewId}`);

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

  if (!interview) {
    console.error(`[InterviewFeedback] Interview ${interviewId} not found`);
    return;
  }

  // Already has interview feedback - skip
  if (interview.feedback) {
    console.log(`[InterviewFeedback] Already exists for ${interviewId}`);
    return;
  }

  // Check if all blocks have feedback
  const allBlocksHaveFeedback = interview.blocks.every((b) => b.feedback !== null);

  if (!allBlocksHaveFeedback) {
    const complete = interview.blocks.filter((b) => b.feedback).length;
    console.log(`[InterviewFeedback] ${complete}/${interview.blocks.length} blocks have feedback - waiting`);
    return;
  }

  // All blocks complete - generate interview feedback
  console.log(`[InterviewFeedback] All blocks complete, generating for ${interviewId}`);

  const blockFeedbacks = interview.blocks.map((b) => ({
    summary: b.feedback!.summary,
    strengths: b.feedback!.strengths,
    areasForImprovement: b.feedback!.areasForImprovement,
  }));

  const feedback = await callGeminiForInterviewFeedback(blockFeedbacks, {
    jobDescription: interview.jobDescriptionSnapshot ?? "",
    resume: interview.resumeSnapshot ?? "",
  });

  // Use transaction to update feedback and status atomically
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
      update: {}, // No-op if exists
    }),
    db.interview.update({
      where: { id: interviewId },
      data: { status: "COMPLETED" },
    }),
  ]);

  console.log(`[InterviewFeedback] Generated and saved for ${interviewId}`);
}
```

#### ⚠️ Common Mistakes

**Mistake 1: Not checking if interview feedback already exists**
```typescript
// ❌ WRONG - Generates duplicate feedback
const allBlocksHaveFeedback = interview.blocks.every(b => b.feedback);
if (allBlocksHaveFeedback) {
  await generateFeedback(); // Could run twice!
}

// ✅ CORRECT - Check for existing feedback first
if (interview.feedback) {
  console.log("Already exists");
  return;
}
```

**Mistake 2: Forgetting to update interview status**
```typescript
// ❌ WRONG - Interview stays in IN_PROGRESS forever
await db.interviewFeedback.create({ ... });

// ✅ CORRECT - Atomically create feedback and update status
await db.$transaction([
  db.interviewFeedback.upsert({ ... }),
  db.interview.update({ data: { status: "COMPLETED" } }),
]);
```

#### ✅ Verification Gate

```bash
pnpm typecheck
```

---

## 📍 Phase 4: Wire Up the Router (Est. 30 mins)

### [ ] Step 4.1: Update submitTranscript Procedure

#### Goal

Modify the `submitTranscript` procedure to store the transcript blob and trigger feedback generation.

#### 📁 File

`src/server/api/routers/interview-worker.ts`

#### 🔍 Find This Location - Imports

Open the file and navigate to **line 1**. You should see:

```typescript
// Line 1
/**
// Line 2
 * Interview Worker Router
// ...
// Line 7
import { z } from "zod";
```

#### ✏️ Action: Add Imports

**Current (Lines 7-12):**
```typescript
import { z } from "zod";
import { createTRPCRouter, workerProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { DURATION_MS } from "~/server/lib/interview-access";
import { getTemplate } from "~/lib/interview-templates";
import { buildBlockPrompt } from "~/lib/interview-templates/prompt";
```

**Replace With:**
```typescript
import { z } from "zod";
import { createTRPCRouter, workerProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { DURATION_MS } from "~/server/lib/interview-access";
import { getTemplate } from "~/lib/interview-templates";
import { buildBlockPrompt } from "~/lib/interview-templates/prompt";
import { generateBlockFeedback } from "~/server/lib/block-feedback";
import { maybeGenerateInterviewFeedback } from "~/server/lib/interview-feedback";
```

#### 🔍 Find Second Location - submitTranscript Block Handler

Navigate to **line 124**. You should see:

```typescript
// Line 122
      // Block-based interview: save transcript to InterviewBlock
// Line 123
      if (input.blockNumber !== undefined) {
// Line 124
        // TODO(FEAT28): Implement proper block transcript storage.
// Line 125
        // Currently, the transcript binary data (transcriptBlob) is DISCARDED.
```

#### ✏️ Action: Replace Block Handler

**Current (Lines 122-152):**
```typescript
      // Block-based interview: save transcript to InterviewBlock
      if (input.blockNumber !== undefined) {
        // TODO(FEAT28): Implement proper block transcript storage.
        // Currently, the transcript binary data (transcriptBlob) is DISCARDED.
        // FEAT28 will introduce SegmentTranscript model to properly store:
        // - transcriptBinary (protobuf)
        // - transcriptText (plain text for display)
        // - answerSummary (AI-generated)
        // See: docs/todo/FEAT28_extended_feedback_dimensions.md
        const transcriptId = `block-${input.interviewId}-${input.blockNumber}-${Date.now()}`;

        // Update the block with transcript reference and endedAt, and mark as COMPLETED
        await ctx.db.interviewBlock.update({
          where: {
            interviewId_blockNumber: {
              interviewId: input.interviewId,
              blockNumber: input.blockNumber,
            },
          },
          data: {
            transcriptId,
            endedAt: new Date(input.endedAt),
            status: "COMPLETED",
          },
        });

        // Block marked as COMPLETED - that's all this endpoint does
        // Interview completion is handled by the UI via updateStatus
        return { success: true };
      }
```

**Replace With:**
```typescript
      // Block-based interview: save transcript and trigger feedback
      if (input.blockNumber !== undefined) {
        // 1. Store transcript binary in the block
        const block = await ctx.db.interviewBlock.update({
          where: {
            interviewId_blockNumber: {
              interviewId: input.interviewId,
              blockNumber: input.blockNumber,
            },
          },
          data: {
            transcript: transcriptBlob,
            endedAt: new Date(input.endedAt),
            status: "COMPLETED",
          },
        });

        // 2. Generate block feedback (fire and forget - don't block response)
        // Note: Errors are logged but don't fail the transcript submission
        generateBlockFeedback(ctx.db, block.id)
          .then(() => maybeGenerateInterviewFeedback(ctx.db, input.interviewId))
          .catch((err) => console.error("[submitTranscript] Feedback generation failed:", err));

        return { success: true };
      }
```

#### ⚠️ Common Mistakes

**Mistake 1: Awaiting feedback generation (blocks response)**
```typescript
// ❌ WRONG - Worker waits for feedback (slow, can timeout)
await generateBlockFeedback(ctx.db, block.id);
await maybeGenerateInterviewFeedback(ctx.db, interviewId);
return { success: true };

// ✅ CORRECT - Fire and forget (fast response)
generateBlockFeedback(ctx.db, block.id)
  .then(() => maybeGenerateInterviewFeedback(ctx.db, interviewId))
  .catch((err) => console.error("Feedback failed:", err));
return { success: true };
```

**Mistake 2: Not handling errors in fire-and-forget**
```typescript
// ❌ WRONG - Unhandled promise rejection
generateBlockFeedback(ctx.db, block.id)
  .then(() => maybeGenerateInterviewFeedback(ctx.db, interviewId));
// If it fails, Node crashes!

// ✅ CORRECT - Always catch errors
generateBlockFeedback(ctx.db, block.id)
  .then(() => maybeGenerateInterviewFeedback(ctx.db, interviewId))
  .catch((err) => console.error("Feedback failed:", err));
```

**Mistake 3: Using wrong variable name for block id**
```typescript
// ❌ WRONG - input.blockNumber is the number, not the DB id
await generateBlockFeedback(ctx.db, input.blockNumber);

// ✅ CORRECT - Use the block.id from the update result
const block = await ctx.db.interviewBlock.update({ ... });
await generateBlockFeedback(ctx.db, block.id);
```

#### ✅ Verification Gate

```bash
pnpm typecheck
```

---

## 📍 Phase 5: Clean Up Worker (Est. 15 mins)

### [ ] Step 5.1: Remove Feedback Code from Worker

#### Goal

Remove the feedback generation code from the worker. The server now handles all feedback logic.

#### 📁 File

`worker/src/services/interview-lifecycle-manager.ts`

#### 🔍 Find This Location - Import

Navigate to **line 10**. You should see:

```typescript
// Line 9
} from "../interfaces";
// Line 10
import { generateFeedback } from "../utils/feedback";
```

#### ✏️ Action: Remove Import

**Current (Line 10):**
```typescript
import { generateFeedback } from "../utils/feedback";
```

**Replace With:** (delete the line entirely)

#### 🔍 Find Second Location - Conditional Feedback Call

Navigate to **line 109**. You should see:

```typescript
// Line 105
      // Step 2: Generate and submit feedback - BEST EFFORT
// Line 106
      // For block-based interviews, we might skip full feedback generation per block
// Line 107
      // and instead do it at the very end of the interview.
// Line 108
      // For now, we only generate feedback if it's NOT a block-based session.
// Line 109
      if (!blockNumber) {
// Line 110
        await this.generateAndSubmitFeedback(
// Line 111
          interviewId,
// Line 112
          transcriptText,
// Line 113
          context,
// Line 114
        );
// Line 115
      }
```

#### ✏️ Action: Remove Conditional Block

**Current (Lines 105-115):**
```typescript
      // Step 2: Generate and submit feedback - BEST EFFORT
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

**Replace With:** (delete all these lines)

#### 🔍 Find Third Location - generateAndSubmitFeedback Method

Navigate to **line 165** (after your deletion, this will shift). Find the method:

```typescript
// Line 161
  /**
// Line 162
   * Generates and submits feedback for the transcript.
// Line 163
   * Failure here does not stop the session from being marked as COMPLETED.
// Line 164
   */
// Line 165
  private async generateAndSubmitFeedback(
```

#### ✏️ Action: Remove Entire Method

Delete the entire method from line 161 to line 192 (the closing brace before the final class brace):

```typescript
  /**
   * Generates and submits feedback for the transcript.
   * Failure here does not stop the session from being marked as COMPLETED.
   */
  private async generateAndSubmitFeedback(
    interviewId: string,
    transcriptText: string,
    context: InterviewContext,
  ): Promise<void> {
    try {
      console.log(`[InterviewLifecycleManager] Generating feedback...`);
      const feedback = await generateFeedback(
        transcriptText,
        context,
        this.geminiApiKey,
      );

      console.log(
        `[InterviewLifecycleManager] Feedback generated, submitting...`,
      );
      await this.apiClient.submitFeedback(interviewId, feedback);
      console.log(
        `[InterviewLifecycleManager] Feedback submitted successfully`,
      );
    } catch (feedbackError) {
      console.error(
        `[InterviewLifecycleManager] Failed to generate or submit feedback:`,
        feedbackError,
      );
      // Best effort - do not rethrow
    }
  }
```

#### 🔍 Find Fourth Location - Unused Variable

After removing the feedback call, find **line 89** where `transcriptText` is defined:

```typescript
// Line 86
      const serializedTranscript = transcriptManager.serializeTranscript();
// Line 87
// Line 88
      // Get formatted text for feedback generation
// Line 89
      const transcriptText = transcriptManager.formatAsText();
```

#### ✏️ Action: Remove Unused Variable

**Current (Lines 88-89):**
```typescript
      // Get formatted text for feedback generation
      const transcriptText = transcriptManager.formatAsText();
```

**Replace With:** (delete both lines)

#### ⚠️ Common Mistakes

**Mistake 1: Leaving the import (TypeScript error)**
```typescript
// ❌ WRONG - Unused import causes lint error
import { generateFeedback } from "../utils/feedback";

// ✅ CORRECT - Remove the import entirely
```

**Mistake 2: Leaving dead code**
```typescript
// ❌ WRONG - Dead code that never runs
const transcriptText = transcriptManager.formatAsText();
// ... later ...
// if (!blockNumber) { ... } // Removed

// ✅ CORRECT - Remove all related code
```

#### ✅ Verification Gate

```bash
# Verify worker builds
cd worker
pnpm build

# Return to root
cd ..

# Verify everything passes
pnpm check
```

---

## 🎯 Final Success Criteria

Before submitting your PR, verify the following:

### Functional Requirements

- [ ] **Block Feedback**: Each completed block automatically has feedback generated
- [ ] **Interview Feedback**: When all blocks have feedback, interview feedback is generated
- [ ] **Idempotent**: Submitting the same transcript twice doesn't create duplicate feedback
- [ ] **Status Update**: Interview status is set to COMPLETED when interview feedback is generated

### Technical Requirements

- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm check` passes (includes lint)
- [ ] `pnpm build` succeeds
- [ ] Worker builds: `cd worker && pnpm build`

### Manual Test (Optional)

1. Start a block-based interview
2. Complete block 1 → Check database for `InterviewBlockFeedback` record
3. Complete block 2 → Check for second feedback record
4. Complete block 3 → Check for interview-level `InterviewFeedback` and `status: COMPLETED`

---

## 🔍 Troubleshooting

### Error: "Cannot find module '~/server/lib/block-feedback'"

**Cause**: File not created or wrong path

**Fix**: Verify the file exists:
```bash
ls src/server/lib/block-feedback.ts
```

### Error: "Property 'transcript' does not exist on type 'InterviewBlock'"

**Cause**: Prisma client not regenerated after schema change

**Fix**:
```bash
pnpm prisma generate
```

### Error: "GEMINI_API_KEY is required"

**Cause**: Environment variable not set

**Fix**: Add to `.env`:
```bash
GEMINI_API_KEY=your-api-key-here
```

### Error: "Cannot find module '~/lib/proto/transcript_pb'"

**Cause**: Proto files not generated

**Fix**:
```bash
pnpm proto:generate
```

### Error in Worker Build: "Cannot find module '../utils/feedback'"

**Cause**: Still importing removed module

**Fix**: Verify line 10 in `interview-lifecycle-manager.ts` is deleted

### Block feedback not being generated

**Cause**: Fire-and-forget error being swallowed

**Debug**: Check server logs for `[BlockFeedback]` and `[submitTranscript]` messages

---

## ✅ Pre-Submission Checklist

Before creating your pull request:

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No lint errors: `pnpm check`
- [ ] Worker builds: `cd worker && pnpm build`
- [ ] Only modified files listed in this guide
- [ ] No `console.log` statements in production code (console.error/log in catch blocks OK)
- [ ] Branch is rebased on latest main
- [ ] Commit messages are clear

### Files Changed

Verify your changes match this list exactly:

| File | Status |
|------|--------|
| `prisma/schema.prisma` | Modified |
| `src/env.js` | Modified |
| `src/server/lib/transcript-utils.ts` | Created |
| `src/server/lib/gemini-client.ts` | Created |
| `src/server/lib/block-feedback.ts` | Created |
| `src/server/lib/interview-feedback.ts` | Created |
| `src/server/api/routers/interview-worker.ts` | Modified |
| `worker/src/services/interview-lifecycle-manager.ts` | Modified |

Run `git status` to verify. If you modified other files, **undo those changes**.

---

## 🆘 Getting Help

If you're stuck after:

1. Re-reading the step instructions
2. Checking "Common Mistakes"
3. Looking at "Troubleshooting"
4. Verifying line numbers (they may have shifted)

Then ask your mentor with:

- Which step you're on
- The exact error message (full text)
- What you've tried
- The relevant code snippet
