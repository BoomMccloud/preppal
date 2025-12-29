# Interview Templates

This module provides a template system for structured, block-based interviews. Templates define multi-language interview blocks with predefined questions, time limits, and interviewer personas.

## Quick Reference

| File                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `index.ts`                        | Template registry with `getTemplate()` API   |
| `schema.ts`                       | Zod validation schemas and TypeScript types  |
| `prompt.ts`                       | System prompt builder for Gemini Live API    |
| `definitions/mba-behavioral-v1.ts`| Example: MBA behavioral interview template   |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TEMPLATE SYSTEM                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ definitions/                                                         │   │
│  │   mba-behavioral-v1.ts  ─┐                                          │   │
│  │   [future-template].ts  ─┼──→ InterviewTemplate objects             │   │
│  │   ...                   ─┘                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ index.ts (Registry)                                                  │   │
│  │                                                                       │   │
│  │   TEMPLATES Map ←── [template.id, template]                         │   │
│  │                                                                       │   │
│  │   getTemplate(id) ──→ InterviewTemplate | null                      │   │
│  │   listTemplates() ──→ InterviewTemplate[]                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Consumers                                                            │   │
│  │                                                                       │   │
│  │   interview.createSession    → Creates InterviewBlock records       │   │
│  │   interviewWorker.getContext → Builds block-specific system prompt  │   │
│  │   Client UI                  → Displays template selection          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Template Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        InterviewTemplate                                     │
│                                                                              │
│  id: "mba-behavioral-v1"                                                    │
│  name: "MBA Behavioral Interview"                                           │
│  description: "Standard MBA admissions behavioral interview"                │
│  persona: "Senior admissions officer at a top-10 MBA program..."           │
│  answerTimeLimitSec: 90                                                     │
│                                                                              │
│  blocks: [                                                                  │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │ Block 1                                                          │     │
│    │   language: "zh" (Mandarin Chinese)                             │     │
│    │   durationSec: 180 (3 minutes)                                  │     │
│    │   questions: [                                                   │     │
│    │     { content: "...", translation: "..." },                     │     │
│    │     { content: "...", translation: "..." },                     │     │
│    │   ]                                                              │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │ Block 2                                                          │     │
│    │   language: "en" (English)                                      │     │
│    │   durationSec: 180 (3 minutes)                                  │     │
│    │   questions: [                                                   │     │
│    │     { content: "..." },                                         │     │
│    │     { content: "..." },                                         │     │
│    │   ]                                                              │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│  ]                                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Schema Definitions

Defined in `schema.ts` using Zod for runtime validation:

### InterviewTemplate

```typescript
{
  id: string,                    // Unique identifier (e.g., "mba-behavioral-v1")
  name: string,                  // Display name
  description?: string,          // Optional description
  persona?: string,              // AI interviewer persona
  answerTimeLimitSec: number,    // Per-answer time limit (default: 180)
  blocks: InterviewBlock[],      // At least one block required
}
```

### InterviewBlock

```typescript
{
  language: "en" | "zh",         // Block language
  durationSec: number,           // Total block duration in seconds
  questions: InterviewQuestion[], // At least one question required
}
```

### InterviewQuestion

```typescript
{
  content: string,               // Question text (in block language)
  translation?: string,          // Optional translation for reference
}
```

### Supported Languages

```typescript
type Language = "en" | "zh";

// Language-specific AI instructions
const LANGUAGE_INSTRUCTIONS = {
  en: "Conduct this entire block in English only.",
  zh: "Conduct this entire block in Mandarin Chinese only (全程使用中文).",
};
```

## Registry API

### getTemplate(id)

Retrieves a template by its unique ID.

```typescript
import { getTemplate } from "~/lib/interview-templates";

const template = getTemplate("mba-behavioral-v1");
if (template) {
  console.log(template.name);  // "MBA Behavioral Interview"
  console.log(template.blocks.length);  // 2
}
```

### listTemplates()

Returns all registered templates.

```typescript
import { listTemplates } from "~/lib/interview-templates";

const templates = listTemplates();
// [{ id: "mba-behavioral-v1", name: "...", ... }]
```

## Prompt Builder

The `buildBlockPrompt()` function generates a system instruction for the Gemini Live API based on block context.

### Input (BlockContext)

```typescript
interface BlockContext {
  blockNumber: number,       // 1-indexed block number
  language: Language,        // "en" or "zh"
  durationSec: number,       // Block duration
  questions: string[],       // Question content strings
  answerTimeLimitSec: number, // Per-answer limit
  jobDescription: string,    // Candidate's target position
  candidateResume: string,   // Candidate's background
  persona: string,           // Interviewer persona
}
```

### Generated Prompt Structure

```
You are a {persona}.
{language instruction}

This is block {blockNumber} of a structured interview.
You have {duration} minutes for this block.

## Your Questions (ask in order)
1. "{question1}"
2. "{question2}"
...

## Per-Answer Time Limit
Each answer is limited to {answerLimit} minutes.
When you receive a message saying "time's up", acknowledge briefly and move to the next question.

## Interview Flow
1. Greet the candidate (first block only)
2. Ask Question 1
3. Listen to answer, ask 1-2 brief follow-up questions if needed
4. When signaled OR answer is complete, move to Question 2
5. Repeat for remaining questions
6. When all questions are done, thank the candidate

## Candidate Context
Position: {jobDescription}
Background: {candidateResume}

## Important Rules
- Stay focused on the assigned questions
- Ask questions in the specified order
- Keep follow-ups brief and relevant
- Be encouraging but professional
- When told time is up, move on promptly

Begin by greeting the candidate and asking the first question.
```

## Integration with Interview System

### 1. Interview Creation

When a user creates an interview with a `templateId`:

```typescript
// In interview.ts createSession
const template = input.templateId ? getTemplate(input.templateId) : null;
const isBlockBased = template !== null;

// Create interview
const interview = await ctx.db.interview.create({
  data: {
    // ...
    templateId: input.templateId ?? null,
    isBlockBased,
  },
});

// Create InterviewBlock records from template
if (template && isBlockBased) {
  const blockData = template.blocks.map((block, index) => ({
    interviewId: interview.id,
    blockNumber: index + 1,  // 1-indexed
    language: block.language.toUpperCase(),  // "EN" | "ZH"
    questions: block.questions.map(q => q.content),
    status: "PENDING",
  }));

  await ctx.db.interviewBlock.createMany({ data: blockData });
}
```

### 2. Context Retrieval

When the worker fetches context for a block:

```typescript
// In interview-worker.ts getContext
const template = interview.templateId ? getTemplate(interview.templateId) : null;
const templateBlock = template.blocks[input.blockNumber - 1];  // 1-indexed

// Build block-specific system prompt
const systemPrompt = buildBlockPrompt({
  blockNumber: input.blockNumber,
  language: templateBlock.language,
  durationSec: templateBlock.durationSec,
  questions: templateBlock.questions.map(q => q.content),
  answerTimeLimitSec: template.answerTimeLimitSec,
  jobDescription: interview.jobDescriptionSnapshot ?? "",
  candidateResume: interview.resumeSnapshot ?? "",
  persona: template.persona ?? "professional interviewer",
});

return {
  // ...
  systemPrompt,
  language: templateBlock.language,
};
```

### 3. Client-Side Block Navigation

The session state machine uses template data for block transitions:

```typescript
// Reducer context derived from template
const context: ReducerContext = {
  answerTimeLimit: template.answerTimeLimitSec,
  blockDuration: template.blocks[blockIndex].durationSec,
  totalBlocks: template.blocks.length,
};
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TEMPLATE DATA FLOW                                       │
│                                                                              │
│  1. INTERVIEW CREATION                                                      │
│                                                                              │
│     User selects template ──→ createSession(templateId)                     │
│                                      │                                       │
│                                      ▼                                       │
│                              getTemplate(templateId)                        │
│                                      │                                       │
│                                      ▼                                       │
│                              Create Interview record                        │
│                              Create InterviewBlock records                  │
│                                                                              │
│  2. SESSION START (per block)                                               │
│                                                                              │
│     Worker connects ──→ getContext(interviewId, blockNumber)                │
│                                      │                                       │
│                                      ▼                                       │
│                              getTemplate(templateId)                        │
│                              Get template.blocks[blockNumber - 1]           │
│                                      │                                       │
│                                      ▼                                       │
│                              buildBlockPrompt(blockContext)                 │
│                                      │                                       │
│                                      ▼                                       │
│                              Return { systemPrompt, language, ... }         │
│                                                                              │
│  3. GEMINI SESSION                                                          │
│                                                                              │
│     GeminiStreamHandler ──→ connect({ systemInstruction: systemPrompt })    │
│                                      │                                       │
│                                      ▼                                       │
│                              AI conducts interview in specified language    │
│                              AI asks questions in order                     │
│                              AI respects time limits                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Creating a New Template

### Step 1: Create Template Definition

Create a new file in `definitions/`:

```typescript
// definitions/tech-system-design-v1.ts
import type { InterviewTemplate } from "../schema";

export const techSystemDesignV1: InterviewTemplate = {
  id: "tech-system-design-v1",
  name: "Technical System Design Interview",
  description: "System design interview for senior engineers",
  persona: "Staff engineer at a major tech company. Technical, curious, evaluating system thinking.",
  answerTimeLimitSec: 300,  // 5 minutes per answer
  blocks: [
    {
      language: "en",
      durationSec: 600,  // 10 minutes
      questions: [
        {
          content: "Design a URL shortening service like bit.ly.",
        },
        {
          content: "How would you scale this to handle 1 billion requests per day?",
        },
      ],
    },
  ],
};
```

### Step 2: Register in Index

Add to the `TEMPLATES` map in `index.ts`:

```typescript
import { techSystemDesignV1 } from "./definitions/tech-system-design-v1";

const TEMPLATES = new Map<string, InterviewTemplate>([
  [mbaBehavioralV1.id, mbaBehavioralV1],
  [techSystemDesignV1.id, techSystemDesignV1],  // Add new template
]);
```

### Step 3: Use in UI

The template is now available via `listTemplates()` for selection in the UI.

## Template Design Guidelines

### Persona

Write a detailed persona that sets the tone:

```typescript
// Good: Specific and actionable
persona: "Senior admissions officer at a top-10 MBA program. Professional, warm, evaluating leadership potential."

// Avoid: Too generic
persona: "Professional interviewer"
```

### Questions

- Keep questions clear and focused
- Order questions from general to specific
- Include translations for non-English blocks (helps with reference)
- Aim for 2-4 questions per block

### Time Limits

- `durationSec`: Total block time (include buffer for greetings/transitions)
- `answerTimeLimitSec`: Per-answer limit (enforced by client-side state machine)

Typical configurations:
| Interview Type | Block Duration | Answer Limit |
| -------------- | -------------- | ------------ |
| Behavioral     | 3-5 minutes    | 90 seconds   |
| Technical      | 10-15 minutes  | 5 minutes    |
| Case Study     | 15-20 minutes  | 10 minutes   |

### Language Blocks

- One language per block (AI instructions enforce this)
- Mix languages across blocks for bilingual interviews
- Questions are asked in the block's language

## Validation

Templates are validated at runtime using Zod schemas:

```typescript
import { InterviewTemplateSchema } from "./schema";

// Validate a template object
const result = InterviewTemplateSchema.safeParse(templateData);
if (!result.success) {
  console.error("Invalid template:", result.error);
}
```

## Related Documentation

- [Interview Routers](../../../server/api/routers/README.md) - API integration
- [Interview Session](../../app/[locale]/(interview)/interview/[interviewId]/session/README.md) - Client-side state machine
- [Worker Architecture](../../../../worker/README.md) - Gemini Live API integration
