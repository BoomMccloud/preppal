# Feature Specification: Block-Based Interview Architecture

## Implementation Status

> **Branch:** TBD
> **Last Updated:** 2025-12-28

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1: Proto & Schema** | Pending | Update interview.proto, Prisma models |
| **Phase 2: Config & Templates** | Pending | JSON templates, Zod schema, template loading |
| **Phase 3: Backend** | Pending | getContext/submitTranscript handlers, block management |
| **Phase 4: Worker** | Pending | ~10 lines: parse block param, populate proto fields |
| **Phase 5: Frontend** | Pending | BlockSession component, mic cutoff, WebSocket URL |

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session architecture | **Fresh Gemini session per language block** | Minimum sessions needed for reliable language switching (2 sessions for MVP) |
| Per-answer time limit | **Frontend mic cutoff + prompt injection** | Simpler than per-question sessions; Gemini API doesn't interrupt users |
| Template storage | **JSON config file + Zod** | Admin-managed, version controlled, no CRUD UI needed for MVP |
| Data model | **Simplified** | No `QuestionBank`, `Question` models; questions stored in config file |
| Language support | **en/zh only** | KISS - add more languages when needed |
| Context passing | **Preserved within block** | Better follow-up questions within language block |
| Frontend routing | **Conditional in /session/** | Backward compatible, single URL pattern |
| Frontend components | **Single BlockSession** | Handles active session with per-answer timer |

### Future Migration Path

> **Note:** If the 2-session (per-language-block) approach doesn't work well in practice (e.g., Gemini doesn't follow question order reliably, or per-question transcripts are needed), we can migrate to **per-question sessions** with minimal code changes. The block abstraction is designed to make this transition trivial - just change the template config from 2 blocks to 6+ blocks.

---

## 1. Overview

Replace the current single continuous interview session with a **block-based architecture** where each language block is a separate Gemini session. This enables:

- **Question templates** - Teacher-defined questions guaranteed to be asked
- **Per-answer time limits** - Hard 3-minute cap via frontend mic cutoff
- **Language switching** - Each block has different language settings
- **Better control** - Deterministic interview flow vs. AI-driven

## 2. Problem Statement

Channel partner feedback:
- "Interview content needs to be based on materials provided by the teacher"
- "Interview: first 10 minutes Chinese, last 10 minutes English, timed switching"
- "Single answer should not exceed 3 minutes"
- "Next interview should include 30% previous questions, 70% new" (future feature)

Current architecture limitations:
- Single 30-min Gemini session - can't reliably switch languages mid-interview
- No per-answer time enforcement (Gemini doesn't interrupt)
- Questions are AI-generated, not teacher-controlled
- No structured question repetition across interviews

## 3. Architecture Design

### 3.1 Current vs. Proposed

```
CURRENT: Single Session
┌─────────────────────────────────────────────────────┐
│ Interview (30 min)                                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Single Gemini WebSocket Session                 │ │
│ │ - AI decides questions                          │ │
│ │ - No time limits per answer                     │ │
│ │ - Single language throughout                    │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

PROPOSED: Block-Based Sessions (MVP: 2 blocks)
┌─────────────────────────────────────────────────────┐
│ Interview (20 min, 2 blocks)                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Block 1: Chinese (10 min)                       │ │
│ │ - Questions 1, 2, 3 (3 min each, mic cutoff)    │ │
│ │ - Single Gemini session                         │ │
│ │ - Context preserved for follow-ups              │ │
│ └─────────────────────────────────────────────────┘ │
│                        ↓                            │
│              [Language Switch Screen]               │
│                        ↓                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Block 2: English (10 min)                       │ │
│ │ - Questions 4, 5, 6 (3 min each, mic cutoff)    │ │
│ │ - Fresh Gemini session (new language)           │ │
│ │ - Context preserved for follow-ups              │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 3.2 Block Flow with Per-Answer Timer

```
┌─────────────────────────────────────────────────────────────┐
│  User clicks "Start Interview"                              │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Block 1 (Chinese, 10 min)                           │    │
│  │ 1. Create Gemini session (language: Chinese)        │    │
│  │ 2. Inject: Questions 1-3 + candidate context        │    │
│  │                                                     │    │
│  │   ┌─────────────────────────────────────────────┐   │    │
│  │   │ Question 1                                  │   │    │
│  │   │ - Gemini asks Q1                            │   │    │
│  │   │ - Start 3-min per-answer timer              │   │    │
│  │   │ - User answers                              │   │    │
│  │   │ - Timer expires → MIC CUTOFF                │   │    │
│  │   │ - Send: "Time's up, move to next question"  │   │    │
│  │   │ - Reset timer for Q2                        │   │    │
│  │   └─────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │   (Repeat for Q2, Q3 within same session)           │    │
│  │                                                     │    │
│  │ 3. Block timer expires OR all questions done        │    │
│  │ 4. Close Gemini session                             │    │
│  │ 5. Store block transcript                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                         ↓                                   │
│              [Language Switch Screen]                       │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Block 2 (English, 10 min)                           │    │
│  │ 1. Create NEW Gemini session (language: English)    │    │
│  │ 2. Inject: Questions 4-6 + candidate context        │    │
│  │ ... (same per-answer timer flow) ...                │    │
│  └─────────────────────────────────────────────────────┘    │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Interview Complete                                  │    │
│  │ 1. Aggregate block transcripts                      │    │
│  │ 2. Generate unified feedback                        │    │
│  │ 3. Redirect to feedback page                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Per-Answer Mic Cutoff (Key Innovation)

The Gemini API doesn't interrupt users. We enforce the 3-minute limit via frontend:

```typescript
// Frontend mic cutoff logic
const PER_ANSWER_LIMIT_MS = 180_000; // 3 minutes

function handleAnswerTimeout() {
  // 1. Stop sending audio to Gemini
  mediaStream.getAudioTracks().forEach(track => track.enabled = false);

  // 2. Show "time's up" UI to user
  setShowTimeUpBanner(true);

  // 3. Send text prompt to Gemini to move on
  sendTextMessage(
    "The candidate's time for this question is up. " +
    "Please acknowledge briefly and move to the next question."
  );

  // 4. Re-enable mic after Gemini responds (for next question)
  // Triggered by detecting Gemini's acknowledgment
}
```

## 4. Data Model

### 4.1 Design Decision: JSON Config File

**Decision:** Store interview templates as a JSON config file, not in the database.

**Rationale:**
- Admin-managed templates (not user-created for MVP)
- Version controlled with git (v1, v2, v3...)
- No CRUD API or template builder UI needed
- Simple deployment to update templates

**Future:** If teachers need self-service template creation, migrate to database storage.

### 4.2 Template Config Files

**Location:** `config/interview-templates/`

**File Naming Convention:**
```
{position-type}-{company?}-{version-or-id}.json
```

Examples:
- `mba-behavioral-v1.json`
- `software-engineer-l4-google-abc123.json`
- `product-manager-meta-v2.json`

**Directory Structure:**
```
config/interview-templates/
├── mba-behavioral-v1.json
├── mba-behavioral-v2.json
├── software-engineer-l4-google-abc123.json
└── product-manager-v1.json
```

**Example Template File:** `config/interview-templates/mba-behavioral-v1.json`

```json
{
  "id": "mba-behavioral-v1",
  "name": "MBA Behavioral Interview",
  "description": "Standard MBA admissions behavioral interview",
  "persona": "Senior admissions officer at a top-10 MBA program. Professional, warm, evaluating leadership potential.",
  "answerTimeLimitSec": 180,
  "blocks": [
    {
      "language": "zh",
      "durationSec": 600,
      "questions": [
        {
          "content": "Tell me about a time you led a team through a difficult period.",
          "translation": "请描述一次你带领团队度过困难时期的经历。"
        },
        {
          "content": "Describe a situation where you failed and what you learned from it.",
          "translation": "请描述一个你失败的情况，以及你从中学到了什么。"
        },
        {
          "content": "Why do you want to pursue an MBA at this point in your career?",
          "translation": "为什么你想在职业生涯的这个阶段攻读MBA？"
        }
      ]
    },
    {
      "language": "en",
      "durationSec": 600,
      "questions": [
        {
          "content": "Tell me about a time you had to influence someone without formal authority."
        },
        {
          "content": "What is your greatest professional achievement?"
        },
        {
          "content": "Where do you see yourself in 10 years?"
        }
      ]
    }
  ]
}
```

### 4.3 TypeScript Types (Zod Schema)

```typescript
// src/lib/interview-templates.schema.ts

import { z } from "zod";

const LanguageSchema = z.enum(["en", "zh"]);

const InterviewQuestionSchema = z.object({
  content: z.string(),                 // Primary language text (English)
  translation: z.string().optional(),  // Translation for display (not spoken)
});

const InterviewBlockSchema = z.object({
  language: LanguageSchema,
  durationSec: z.number().int().positive(),
  questions: z.array(InterviewQuestionSchema),
});

const InterviewTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  persona: z.string().optional(),
  answerTimeLimitSec: z.number().int().positive().default(180),
  blocks: z.array(InterviewBlockSchema).min(1),
});

export type Language = z.infer<typeof LanguageSchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type InterviewBlock = z.infer<typeof InterviewBlockSchema>;
export type InterviewTemplate = z.infer<typeof InterviewTemplateSchema>;

export { InterviewTemplateSchema, InterviewBlockSchema };
```

```typescript
// src/lib/interview-templates.ts

import fs from 'fs';
import path from 'path';
import { InterviewTemplateSchema, type InterviewTemplate } from './interview-templates.schema';

const TEMPLATES_DIR = path.join(process.cwd(), 'config/interview-templates');

// Cache templates in memory (loaded once at startup)
let templatesCache: Map<string, InterviewTemplate> | null = null;

function loadTemplates(): Map<string, InterviewTemplate> {
  if (templatesCache) return templatesCache;

  templatesCache = new Map();
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8');
    const parsed = JSON.parse(content);
    const template = InterviewTemplateSchema.parse(parsed); // Zod validation
    templatesCache.set(template.id, template);
  }

  return templatesCache;
}

export function getTemplate(templateId: string): InterviewTemplate | null {
  return loadTemplates().get(templateId) ?? null;
}

export function listTemplates(): InterviewTemplate[] {
  return Array.from(loadTemplates().values());
}
```

### 4.4 Prisma Schema Additions

```prisma
// ============================================
// INTERVIEW BLOCKS
// ============================================

enum BlockLanguage {
  EN
  ZH
}

model InterviewBlock {
  id            String   @id @default(cuid())
  interviewId   String
  interview     Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  // Block info
  blockNumber   Int              // 1, 2 (for MVP: Chinese block, English block)
  language      BlockLanguage
  questions     Json             // Array of question texts for this block

  // Timing
  startedAt     DateTime?
  endedAt       DateTime?
  durationSec   Int?             // Actual duration

  // Status
  status        BlockStatus @default(PENDING)

  // Transcript stored separately (see FEAT28)
  transcriptId  String?  @unique

  @@unique([interviewId, blockNumber])
  @@index([interviewId])
}

enum BlockStatus {
  PENDING      // Not started
  IN_PROGRESS  // Currently active
  COMPLETED    // Finished normally
  SKIPPED      // User skipped
}

// ============================================
// UPDATED INTERVIEW MODEL
// ============================================

model Interview {
  // ... existing fields ...

  // New: Template ID (references config file, not DB)
  templateId    String?

  // New: Block mode flag
  isBlockBased  Boolean  @default(false)

  // New: Blocks relation
  blocks        InterviewBlock[]

  // ... existing relations ...
}
```

### 4.5 Context Within Blocks

Each block runs as an **independent Gemini session**, but context is **preserved within the block** for better follow-up questions.

```typescript
interface BlockContext {
  // Current block
  blockNumber: number;
  language: "en" | "zh";
  durationSec: number;
  questions: string[];       // All questions for this block
  answerTimeLimitSec: number;

  // Interview context (static, from interview setup)
  jobDescription: string;
  candidateResume: string;
  persona: string;
}
```

> **Design Decision:** Context is preserved within blocks (for follow-ups) but NOT between blocks.
> Block 2 starts fresh - it doesn't know what was discussed in Block 1.

## 5. System Prompt per Block

```typescript
const LANGUAGE_INSTRUCTIONS = {
  en: 'Conduct this entire block in English only.',
  zh: 'Conduct this entire block in Mandarin Chinese only (全程使用中文).',
} as const;

function buildBlockPrompt(ctx: BlockContext): string {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[ctx.language];
  const questionList = ctx.questions
    .map((q, i) => `${i + 1}. "${q}"`)
    .join('\n');

  return `
You are a ${ctx.persona}.
${languageInstruction}

This is block ${ctx.blockNumber} of a structured interview.
You have ${Math.floor(ctx.durationSec / 60)} minutes for this block.

## Your Questions (ask in order)
${questionList}

## Per-Answer Time Limit
Each answer is limited to ${Math.floor(ctx.answerTimeLimitSec / 60)} minutes.
When you receive a message saying "time's up", acknowledge briefly and move to the next question.

## Interview Flow
1. Greet the candidate (first block only)
2. Ask Question 1
3. Listen to answer, ask 1-2 brief follow-up questions if needed
4. When signaled OR answer is complete, move to Question 2
5. Repeat for remaining questions
6. When all questions are done, thank the candidate

## Candidate Context
Position: ${ctx.jobDescription}
Background: ${ctx.candidateResume}

## Important Rules
- Stay focused on the assigned questions
- Ask questions in the specified order
- Keep follow-ups brief and relevant
- Be encouraging but professional
- When told time is up, move on promptly

Begin by greeting the candidate and asking the first question.
`;
}
```

## 6. User Interface

> **Note:** Template Builder UI is not needed for MVP. Templates are managed via JSON config file.

### 6.1 Interview Session UI (Block-Based)

```
┌─────────────────────────────────────────────────────────────┐
│  Interview Session                          Block 1 of 2    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │                   [Video Feed]                      │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Current Question: 2 of 3                                   │
│  "请描述一个你失败的经历，以及你从中学到了什么？"               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Answer Time Remaining                              │    │
│  │  ██████████████████░░░░░░░░░░░░░░  2:15            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Block Time Remaining: 7:42                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Language: 中文 (Chinese)                                   │
│                                                             │
│  Progress: ●●○ (Questions)    ●○ (Blocks)                  │
│                                                             │
│  [Skip to Next Question]              [End Block Early]     │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Answer Time's Up Banner

```
┌─────────────────────────────────────────────────────────────┐
│  ⏱️ Time's up for this answer!                              │
│  Moving to the next question...                             │
│  (Your microphone will re-enable shortly)                   │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Block Transition / Language Switch Screen

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                   Block 1 Complete                          │
│                                                             │
│         ┌─────────────────────────────────────┐             │
│         │  Great job on the Chinese section!  │             │
│         │                                     │             │
│         │  🌐 Language Switch                 │             │
│         │                                     │             │
│         │  The next block will be in:         │             │
│         │         🇺🇸 English                  │             │
│         │                                     │             │
│         │  3 questions, 10 minutes total      │             │
│         │                                     │             │
│         │  [Continue]     [Take a Break]      │             │
│         └─────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 7. Frontend Implementation

### 7.1 BlockSession Component

```tsx
// src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "~/i18n/navigation";
import { api } from "~/trpc/react";
import { SessionContent } from "./SessionContent";

type Phase = "active" | "transition";

interface BlockSessionProps {
  interview: Interview;
  blocks: InterviewBlock[];
  template: InterviewTemplate;
  guestToken?: string;
}

export function BlockSession({ interview, blocks, template, guestToken }: BlockSessionProps) {
  const router = useRouter();
  const completeBlock = api.interview.completeBlock.useMutation();

  const [blockIndex, setBlockIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("active");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerTimeRemaining, setAnswerTimeRemaining] = useState(template.answerTimeLimitSec);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sendTextMessageRef = useRef<(msg: string) => void>(() => {});

  const block = blocks[blockIndex];
  const templateBlock = template.blocks[blockIndex];
  const isLastBlock = blockIndex === blocks.length - 1;

  // Per-answer timer with mic cutoff
  useEffect(() => {
    if (phase !== "active" || isMicMuted) return;

    const timer = setInterval(() => {
      setAnswerTimeRemaining(prev => {
        if (prev <= 1) {
          // TIME'S UP - cut the mic!
          handleAnswerTimeout();
          return template.answerTimeLimitSec; // Reset for next question
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isMicMuted, currentQuestionIndex]);

  const handleAnswerTimeout = useCallback(() => {
    // 1. Mute microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
    setIsMicMuted(true);

    // 2. Tell Gemini to move on
    sendTextMessageRef.current(
      "The candidate's time for this question is up. " +
      "Please acknowledge briefly and move to the next question."
    );

    // 3. Re-enable mic after delay (Gemini needs time to respond)
    setTimeout(() => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
      }
      setIsMicMuted(false);
      setCurrentQuestionIndex(prev => prev + 1);
    }, 3000); // 3 seconds for Gemini to acknowledge
  }, []);

  // Handle block completion
  const handleBlockEnd = async () => {
    await completeBlock.mutateAsync({
      interviewId: interview.id,
      blockNumber: block.blockNumber,
    });

    if (isLastBlock) {
      const feedbackUrl = guestToken
        ? `/interview/${interview.id}/feedback?token=${guestToken}`
        : `/interview/${interview.id}/feedback`;
      router.push(feedbackUrl);
    } else {
      setPhase("transition");
    }
  };

  // Transition screen between blocks
  if (phase === "transition") {
    const nextBlock = blocks[blockIndex + 1];
    const nextTemplateBlock = template.blocks[blockIndex + 1];

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold">
            Block {blockIndex + 1} Complete
          </h2>

          <div className="text-lg text-blue-600">
            🌐 Language Switch
          </div>

          <p className="text-xl">
            Next block: {nextTemplateBlock?.language === "en" ? "🇺🇸 English" : "🇨🇳 中文"}
          </p>

          <p className="text-gray-600">
            {nextTemplateBlock?.questions.length} questions,{" "}
            {Math.floor((nextTemplateBlock?.durationSec ?? 0) / 60)} minutes
          </p>

          <div className="flex gap-4 justify-center mt-6">
            <button
              onClick={() => {
                setBlockIndex(i => i + 1);
                setPhase("active");
                setCurrentQuestionIndex(0);
                setAnswerTimeRemaining(template.answerTimeLimitSec);
              }}
              className="btn btn-primary"
            >
              Continue
            </button>
            <button className="btn btn-secondary">
              Take a Break
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active session view
  return (
    <>
      {/* Progress & Timer overlay */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        <div className="bg-white/90 px-3 py-1 rounded-full shadow">
          Block {blockIndex + 1} of {blocks.length}
        </div>
        <div className="bg-white/90 px-3 py-1 rounded-full shadow">
          Question {currentQuestionIndex + 1} of {templateBlock?.questions.length}
        </div>
        <div className={`px-3 py-1 rounded-full shadow ${
          answerTimeRemaining < 30 ? "bg-red-500 text-white" : "bg-white/90"
        }`}>
          Answer: {Math.floor(answerTimeRemaining / 60)}:{String(answerTimeRemaining % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Time's up banner */}
      {isMicMuted && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-6 py-4 rounded-lg shadow-lg">
            ⏱️ Time's up for this answer!<br />
            Moving to the next question...
          </div>
        </div>
      )}

      <SessionContent
        key={`block-${blockIndex}`}
        interviewId={interview.id}
        guestToken={guestToken}
        onSessionEnded={handleBlockEnd}
        disableStatusRedirect
        duration={templateBlock?.durationSec ? templateBlock.durationSec * 1000 : undefined}
        onMediaStream={(stream) => { mediaStreamRef.current = stream; }}
        onSendTextMessage={(fn) => { sendTextMessageRef.current = fn; }}
      />
    </>
  );
}
```

### 7.2 Required Props for SessionContent

```tsx
// Additional props needed for SessionContent
interface SessionContentProps {
  interviewId: string;
  guestToken?: string;

  // Block mode overrides
  onSessionEnded?: () => void;
  disableStatusRedirect?: boolean;
  duration?: number;

  // NEW: For mic cutoff feature
  onMediaStream?: (stream: MediaStream) => void;
  onSendTextMessage?: (fn: (msg: string) => void) => void;
}
```

### 7.3 File Structure

```
config/interview-templates/            # Template definitions (admin-managed)
├── mba-behavioral-v1.json
└── software-engineer-v1.json

src/
├── lib/
│   ├── interview-templates.schema.ts  # Zod schema for templates
│   └── interview-templates.ts         # Template loading helpers
│
└── app/[locale]/(interview)/interview/[interviewId]/
    └── session/
        ├── page.tsx                   # Conditional: BlockSession or SessionContent
        ├── SessionContent.tsx         # Add optional props for block mode
        ├── BlockSession.tsx           # NEW: Block-based interview component
        └── useInterviewSocket.ts      # Expose sendTextMessage for prompt injection
```

## 8. Worker-Backend Communication (Protobuf)

### 8.1 Proto Changes

Update `proto/interview.proto` with optional `block_number` field:

```protobuf
// ---- getContext ----
message GetContextRequest {
  string interview_id = 1;
  optional int32 block_number = 2;  // NEW: Which block to get context for
}

message GetContextResponse {
  string job_description = 1;
  string resume = 2;
  string persona = 3;
  int32 duration_ms = 4;
  optional string system_prompt = 5;  // NEW: Block-specific system prompt
  optional string language = 6;       // NEW: "en" or "zh" for Gemini config
}

// ---- submitTranscript ----
message SubmitTranscriptRequest {
  string interview_id = 1;
  bytes transcript = 2;
  string ended_at = 3;
  optional int32 block_number = 4;  // NEW: Which block's transcript
}
```

### 8.2 Worker Changes (Minimal)

The Worker parses `block` from URL and populates proto fields:

```typescript
// Worker: on WebSocket connect
const url = new URL(request.url);
const interviewId = url.pathname.split('/')[1];
const blockNumber = url.searchParams.get('block');

// Get context (proto handles optional field)
const contextRequest: GetContextRequest = {
  interviewId,
  blockNumber: blockNumber ? parseInt(blockNumber) : undefined,
};
const context = await api.getContext(contextRequest);

// Use context.systemPrompt if provided, else build default
const systemPrompt = context.systemPrompt ?? buildDefaultPrompt(context);

// ... run Gemini session ...

// On session end: save transcript
const transcriptRequest: SubmitTranscriptRequest = {
  interviewId,
  transcript: encodedTranscript,
  endedAt: new Date().toISOString(),
  blockNumber: blockNumber ? parseInt(blockNumber) : undefined,  // Same block
};
await api.submitTranscript(transcriptRequest);
```

**Total Worker changes:** ~10 lines (parse URL param, populate proto fields)

### 8.3 Backend Handling

```typescript
// Backend: getContext handler
async function handleGetContext(req: GetContextRequest): Promise<GetContextResponse> {
  const { interviewId, blockNumber } = req;

  const interview = await db.interview.findUnique({
    where: { id: interviewId },
  });

  // Standard interview (no block)
  if (!interview.isBlockBased || blockNumber === undefined) {
    return {
      jobDescription: interview.jobDescription,
      resume: interview.resume,
      persona: interview.persona,
      durationMs: interview.durationMs,
      // systemPrompt omitted - Worker uses default
    };
  }

  // Block-based interview
  const template = getTemplate(interview.templateId);
  const templateBlock = template.blocks[blockNumber - 1];

  // Mark block as IN_PROGRESS
  await db.interviewBlock.update({
    where: { interviewId_blockNumber: { interviewId, blockNumber } },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  return {
    jobDescription: interview.jobDescription,
    resume: interview.resume,
    persona: template.persona,
    durationMs: templateBlock.durationSec * 1000,
    systemPrompt: buildBlockPrompt({
      blockNumber,
      language: templateBlock.language,
      questions: templateBlock.questions.map(q => q.content),
      durationSec: templateBlock.durationSec,
      answerTimeLimitSec: template.answerTimeLimitSec,
      persona: template.persona,
      jobDescription: interview.jobDescription,
      resume: interview.resume,
    }),
    language: templateBlock.language,
  };
}
```

### 8.4 Transcript Storage Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ BLOCK 1 ENDS                                                        │
│                                                                     │
│ 1. Block timer expires OR frontend closes WebSocket                 │
│                                                                     │
│ 2. Worker detects WebSocket close                                   │
│                                                                     │
│ 3. Worker calls submitTranscript:                                   │
│    {                                                                │
│      interview_id: "abc123",                                        │
│      block_number: 1,              ← Identifies which block         │
│      transcript: <binary>,                                          │
│      ended_at: "2025-01-15T10:30:00Z"                               │
│    }                                                                │
│                                                                     │
│ 4. Backend routes based on block_number:                            │
│    - If block_number present → save to InterviewBlock               │
│    - If absent → save to Interview (standard flow)                  │
│                                                                     │
│ 5. Frontend calls completeBlock mutation                            │
│    → Backend marks block COMPLETED                                  │
│                                                                     │
│ 6. Frontend shows transition screen                                 │
│                                                                     │
│ 7. User clicks "Continue" → Block 2 starts                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.5 Backend: submitTranscript Handler

```typescript
// Backend: submitTranscript handler
async function handleSubmitTranscript(req: SubmitTranscriptRequest): Promise<SubmitTranscriptResponse> {
  const { interviewId, blockNumber, transcript, endedAt } = req;

  if (blockNumber !== undefined) {
    // Block-based: save to InterviewBlock
    await db.interviewBlock.update({
      where: {
        interviewId_blockNumber: { interviewId, blockNumber }
      },
      data: {
        transcript: transcript,  // Store as bytes or reference
        endedAt: new Date(endedAt),
      },
    });
  } else {
    // Standard: save to Interview (existing behavior)
    await db.interview.update({
      where: { id: interviewId },
      data: {
        transcript: transcript,
        endedAt: new Date(endedAt),
      },
    });
  }

  return { success: true };
}
```

### 8.6 Backward Compatibility

| Scenario | block_number | Behavior |
|----------|--------------|----------|
| Standard interview | `undefined` | Existing flow unchanged |
| Block-based interview | `1`, `2`, etc. | Block-specific prompt & transcript |

The `optional` proto fields ensure old Workers (without block support) continue to work with standard interviews.

---

## 9. Implementation Phases

### Phase 1: Proto & Schema
- Update `proto/interview.proto` with `block_number` fields (see Section 8.1)
- Run `pnpm proto:generate` to regenerate TypeScript types
- Create Zod schema (`src/lib/interview-templates.schema.ts`)
- Add Prisma models (`InterviewBlock`, `BlockLanguage`, `BlockStatus`)
- Add `templateId` and `isBlockBased` fields to `Interview` model

### Phase 2: Config & Templates
- Create `config/interview-templates/` directory
- Add initial template(s) (e.g., `mba-behavioral-v1.json`)
- Add template loading helpers (`src/lib/interview-templates.ts`)

### Phase 3: Backend - Block Management
- Modify `getContext` handler to return block-specific system prompt
- Modify `submitTranscript` handler to route to InterviewBlock
- Add `completeBlock` mutation for frontend to mark blocks done
- Add block creation logic in `startInterview` mutation

### Phase 4: Worker Updates (~10 lines)
- Parse `block` query param from WebSocket URL
- Pass `blockNumber` to `getContext` proto request
- Pass `blockNumber` to `submitTranscript` proto request
- Use `systemPrompt` from response (if provided)

### Phase 5: Frontend Session UI
- `BlockSession` component with per-answer timer
- Mic cutoff implementation (disable audio tracks)
- Text message injection for "time's up" prompt
- Construct WebSocket URL with `&block=N` param
- Conditional routing in `/session/page.tsx` based on `isBlockBased` flag

## 10. Migration Strategy

- `isBlockBased` flag on Interview allows gradual rollout
- Old interviews continue with single-session mode
- New templates automatically use block-based mode

## 11. Future: Per-Question Sessions

If the 2-block approach doesn't work well (e.g., Gemini doesn't follow question order), migration to per-question sessions is trivial:

```json
// Change template from 2 blocks to 6 blocks
{
  "blocks": [
    { "language": "zh", "durationSec": 180, "questions": ["Q1"] },
    { "language": "zh", "durationSec": 180, "questions": ["Q2"] },
    { "language": "zh", "durationSec": 180, "questions": ["Q3"] },
    { "language": "en", "durationSec": 180, "questions": ["Q4"] },
    { "language": "en", "durationSec": 180, "questions": ["Q5"] },
    { "language": "en", "durationSec": 180, "questions": ["Q6"] }
  ]
}
```

The `BlockSession` component already iterates through blocks - whether 2 or 6 is just configuration. No code changes needed.

## 12. Dependencies

- **FEAT28 (Results Storage)** - Block transcripts, aggregated feedback
- Worker deployment for text message handling

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini doesn't follow question order | Medium | Medium | Strong prompting; fallback to per-question sessions |
| Mic cutoff feels abrupt to users | Medium | Low | Show countdown warning at 30s, friendly "time's up" message |
| Text prompt injection doesn't work | Low | High | Test thoroughly; ensure WebSocket supports text messages |
| SessionContent changes break existing flow | Low | High | Props are optional, defaults preserve behavior |

---

## 14. References

- Partner feedback: "3-min per answer", "10 min Chinese + 10 min English"
- Consolidates: Bilingual mode, time limits, question templates
- Related: FEAT28 (Results Storage)
