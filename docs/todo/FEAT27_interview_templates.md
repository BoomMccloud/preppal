# Feature Specification: Block-Based Interview Architecture

## Implementation Status

> **Branch:** `feat/interview-templates`
> **Last Updated:** 2025-12-28

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1: Proto & Schema** | ✅ Done | [proto/interview.proto](../../proto/interview.proto), [schema.ts](../../src/lib/interview-templates/schema.ts) |
| **Phase 2: Config & Templates** | ✅ Done | [definitions/](../../src/lib/interview-templates/definitions/), [index.ts](../../src/lib/interview-templates/index.ts) |
| **Phase 3: Backend** | ✅ Done | `getContext`, `submitTranscript`, `completeBlock` with block routing |
| **Phase 4: Worker** | ✅ Done | Block number support, system prompt & language injection |
| **Phase 5: Frontend** | ✅ Done | [BlockSession.tsx](../../src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx) |

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session architecture | **Fresh Gemini session per language block** | Minimum sessions needed for reliable language switching (2 sessions for MVP) |
| Per-answer time limit | **Frontend mic mute** | Mute audio track when timer expires; Gemini interprets silence as "done" and moves on |
| Template storage | **TypeScript constants** | Type-safe, no file I/O, simpler deployment; admin-managed via code |
| Data model | **Simplified** | No `QuestionBank`, `Question` models; questions stored in config file |
| Language support | **en/zh only** | KISS - add more languages when needed |
| Context passing | **Preserved within block** | Better follow-up questions within language block |
| Frontend routing | **Conditional in /session/** | Backward compatible, single URL pattern |
| Frontend components | **Single BlockSession** | Handles active session with per-answer timer |

### Future Migration Path

> **Note:** If the 2-session (per-language-block) approach doesn't work well in practice (e.g., Gemini doesn't follow question order reliably, or per-question transcripts are needed), we can migrate to **per-question sessions** with minimal code changes. The block abstraction is designed to make this transition trivial - just change the template config from 2 blocks to 6+ blocks.

---

## Prerequisites

Before implementing this feature, you should understand the following existing systems:

### Existing Codebase Knowledge

#### 1. Interview Model (Prisma)

The `Interview` model already exists in `prisma/schema.prisma` with these relevant fields. The new fields (`templateId`, `isBlockBased`, `blocks` relation) have been added.

See: [prisma/schema.prisma](../../prisma/schema.prisma)

#### 2. tRPC Router Structure

The backend uses tRPC routers in `src/server/api/routers/`:

- **`interview.ts`** - User-facing procedures (`createSession`, `getById`, `completeBlock`, etc.)
- **`interview-worker.ts`** - Worker-facing procedures (`getContext`, `submitTranscript`, `updateStatus`)

The Worker calls `interview-worker` procedures via HTTP POST to `/api/worker`.

#### 3. Worker Architecture

The "Worker" is a **Cloudflare Worker** in the `worker/` directory that:

1. Receives WebSocket connections from the frontend
2. Calls backend tRPC procedures to get interview context
3. Connects to Gemini Live API for real-time audio
4. Submits transcripts back to the backend when done

```
Frontend (browser) ←WebSocket→ Worker (Cloudflare) ←HTTP→ Backend (Next.js)
                                    ↕
                              Gemini Live API
```

#### 4. Protobuf Communication

The Worker and Backend communicate using **Protocol Buffers** (protobuf) for type-safe serialization:

- Proto definitions: [proto/interview.proto](../../proto/interview.proto)
- Generated TypeScript: `src/lib/proto/interview_pb.ts` and `worker/src/lib/proto/interview_pb.ts`
- Regenerate after changes: `pnpm proto:generate`

### File Structure

```
src/lib/interview-templates/
├── schema.ts              # Zod schemas and types
├── index.ts               # Registry: getTemplate(), listTemplates()
├── prompt.ts              # Prompt building (buildBlockPrompt)
└── definitions/           # One file per template
    └── mba-behavioral-v1.ts
```

### Key Technical Concepts

| Concept | Explanation |
|---------|-------------|
| **Zod** | Runtime schema validation library. `schema.parse(data)` throws on invalid data; `schema.safeParse(data)` returns `{ success, data/error }` |
| **Block numbers** | **1-indexed** in the database and API. When accessing template arrays, use `blocks[blockNumber - 1]` |
| **Template registry** | A simple `Map<string, InterviewTemplate>` built at module load time |

### Adding a New Template

1. Create `src/lib/interview-templates/definitions/my-new-template.ts`
2. Export a const that satisfies `InterviewTemplate` type
3. Import and add to the `TEMPLATES` Map in `index.ts`

No caching, no file I/O, no `_clearCache()` needed for tests

---

## 1. Overview

Replace the current single continuous interview session with a **block-based architecture** where each language block is a separate Gemini session. This enables:

- **Question templates** - Teacher-defined questions guaranteed to be asked
- **Per-answer time limits** - Hard 3-minute cap via frontend mic mute
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
┌─────────────────────────────────────────────────────────┐
│ Interview (30 min)                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Single Gemini WebSocket Session                     │ │
│ │ - AI decides questions                              │ │
│ │ - No time limits per answer                         │ │
│ │ - Single language throughout                        │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

PROPOSED: Block-Based Sessions (MVP: 2 blocks)
┌─────────────────────────────────────────────────────────┐
│ Interview (20 min, 2 blocks)                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Block 1: Chinese (10 min)                           │ │
│ │ - Questions 1, 2, 3 (3 min each, mic mute)          │ │
│ │ - Single Gemini session                             │ │
│ │ - Context preserved for follow-ups                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                        ↓                                │
│              [Language Switch Screen]                   │
│                        ↓                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Block 2: English (10 min)                           │ │
│ │ - Questions 4, 5, 6 (3 min each, mic mute)          │ │
│ │ - Fresh Gemini session (new language)               │ │
│ │ - Context preserved for follow-ups                  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
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
│  │   │ - Timer expires → MIC MUTE                  │   │    │
│  │   │ - Gemini hears silence → moves to Q2        │   │    │
│  │   │ - Reset timer, unmute mic for Q2            │   │    │
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

### 3.3 Per-Answer Mic Mute

The Gemini API doesn't interrupt users. We enforce the 3-minute limit by muting the mic.

**Implementation:** See [BlockSession.tsx:82-105](../../src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx#L82-L105)

**Why mute instead of disconnect?**
- Instant re-enable (no permission re-request)
- No WebRTC renegotiation needed
- Smoother UX

## 4. Data Model

### 4.1 Design Decision: TypeScript Config

**Decision:** Store interview templates as TypeScript constants, not in the database.

**Rationale:**
- Admin-managed templates (not user-created for MVP)
- Version controlled with git (v1, v2, v3...)
- No CRUD API or template builder UI needed
- Simple deployment to update templates

**Future:** If teachers need self-service template creation, migrate to database storage.

### 4.2 Template Definitions

**Location:** `src/lib/interview-templates/definitions/`

**Example:** See [mba-behavioral-v1.ts](../../src/lib/interview-templates/definitions/mba-behavioral-v1.ts)

### 4.3 TypeScript Types (Zod Schema)

**Implementation:** See [schema.ts](../../src/lib/interview-templates/schema.ts)

### 4.4 Template Registry

**Implementation:** See [index.ts](../../src/lib/interview-templates/index.ts)

### 4.5 Prisma Schema

**Implementation:** See [schema.prisma](../../prisma/schema.prisma) - `InterviewBlock` model (lines 247-270)

### 4.6 Context Within Blocks

Each block runs as an **independent Gemini session**, but context is **preserved within the block** for better follow-up questions.

> **Design Decision:** Context is preserved within blocks (for follow-ups) but NOT between blocks.
> Block 2 starts fresh - it doesn't know what was discussed in Block 1.

## 5. System Prompt per Block

**Implementation:** See [prompt.ts](../../src/lib/interview-templates/prompt.ts) - `buildBlockPrompt()` function

## 6. User Interface

> **Note:** Template Builder UI is not needed for MVP. Templates are managed via TypeScript config.

### 6.1 Interview Session UI (Block-Based)

**Implementation:** See [BlockSession.tsx](../../src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx)

Features implemented:
- Block progress indicator (lines 188-213)
- Question progress indicator
- Per-answer countdown timer with red pulse at <30s
- Time's up banner with mic mute indicator (lines 216-226)
- Language transition screen (lines 127-178)

## 7. Worker-Backend Communication (Protobuf)

### 7.1 Proto Schema

**Implementation:** See [interview.proto](../../proto/interview.proto)

Key fields added for block support:
- `GetContextRequest.block_number` (line 97)
- `GetContextResponse.system_prompt` (line 105)
- `GetContextResponse.language` (line 106)
- `SubmitTranscriptRequest.block_number` (line 132)

### 7.2 Worker Changes

**Tests:** See [block-support.test.ts](../../worker/src/__tests__/block-support.test.ts)

The Worker parses `block` from URL and populates proto fields (~10 lines of changes):

```typescript
// Worker: on WebSocket connect
const url = new URL(request.url);
const interviewId = url.pathname.split('/')[1];
const blockNumber = url.searchParams.get('block');

// Get context (proto handles optional field)
const context = await api.getContext(interviewId, blockNumber ? parseInt(blockNumber) : undefined);

// Use context.systemPrompt if provided, else build default
const systemPrompt = context.systemPrompt ?? buildDefaultPrompt(context);
```

### 7.3 Backend Handling

**Implementation:** See [interview-worker.ts](../../src/server/api/routers/interview-worker.ts)

`getContext` handler (lines 22-108):
- Checks if `blockNumber` is provided
- Loads template and builds block-specific prompt using `buildBlockPrompt()`
- Marks block as `IN_PROGRESS` with `startedAt` timestamp
- Returns `systemPrompt` and `language` for Gemini config

`submitTranscript` handler (lines 110-171):
- Routes to `InterviewBlock` when `blockNumber` is provided
- Stores `transcriptId` and `endedAt` on the block record
- Falls back to standard `Interview` transcript storage when no block

Block creation in `createSession` (see [interview.ts:105-118](../../src/server/api/routers/interview.ts#L105-L118)):
- Creates `InterviewBlock` records when template is provided
- Maps template blocks to database records with 1-indexed `blockNumber`

### 7.4 Backward Compatibility

| Scenario | block_number | Behavior |
|----------|--------------|----------|
| Standard interview | `undefined` | Existing flow unchanged |
| Block-based interview | `1`, `2`, etc. | Block-specific prompt & transcript |

The `optional` proto fields ensure old Workers (without block support) continue to work with standard interviews.

---

## 8. Implementation Complete

All phases of FEAT27 are now implemented:

- ✅ Phase 1: Proto & Schema
- ✅ Phase 2: Config & Templates
- ✅ Phase 3: Backend
- ✅ Phase 4: Worker
- ✅ Phase 5: Frontend

### Future Enhancements (Not MVP)

- [ ] Skip Question - Add `SkipRequest` to proto for manual question skipping
- [ ] End Interview Early - Allow users to skip remaining blocks
- [ ] More templates - Add additional interview templates

See also: **FEAT28 (Results Storage)** for proper block transcript storage

## 9. Migration Strategy

- `isBlockBased` flag on Interview allows gradual rollout
- Old interviews continue with single-session mode
- New templates automatically use block-based mode

## 10. Future: Per-Question Sessions

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

The `BlockSession` component already iterates through blocks - whether 2 or 6 is just configuration.

## 11. Dependencies

- **FEAT28 (Results Storage)** - Block transcripts, aggregated feedback
- Worker deployment with block_number support

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini doesn't follow question order | Medium | Medium | Strong prompting; fallback to per-question sessions |
| Mic mute feels abrupt to users | Medium | Low | Show countdown warning at 30s, friendly "time's up" UI |
| Gemini slow to transition after silence | Low | Medium | Show "processing" UI; extend unmute delay if needed |
| SessionContent changes break existing flow | Low | High | Props are optional, defaults preserve behavior |

---

## 13. References

- Partner feedback: "3-min per answer", "10 min Chinese + 10 min English"
- Consolidates: Bilingual mode, time limits, question templates
- Related: FEAT28 (Results Storage)

---

## Addendum 1: Dual-Timer Architecture

To ensure strict time management and robust session closure, `BlockSession` implements a **Dual-Timer** system.

### 1. The Question Timer (Pacer)
- **Scope:** Runs for each question (e.g., 3 minutes).
- **Behavior:**
    - Counts down while user is speaking.
    - At 0:00: **Mutes the microphone** for 3 seconds.
    - Effect: Gemini detects silence -> advances to next question.
    - Reset: Resets when moving to the next question index.

**Implementation:** See [BlockSession.tsx:65-80](../../src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx#L65-L80)

### 2. The Block Timer (Master Clock)
- **Scope:** Runs for the entire block (e.g., 10 minutes).
- **Behavior:**
    - Counts down continuously from block start.
    - At 0:00: **Terminates the session immediately.**
    - Effect: Overrides the Question Timer. Even if the user is mid-sentence in Question 2, the block ends.
    - Logic: Calls `handleBlockEnd()` to close the WebSocket.

**Implementation:** See [BlockSession.tsx:98-115](../../src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx#L98-L115)

### 3. Session Closure Logic
The block is considered "Complete" when EITHER:
1.  The **Block Timer** hits zero (Time limit reached).
2.  The **Question Timer** expires on the *last question* of the block (All questions answered).

---

## Addendum 2: Explicit Controls & Session Management

### 1. Manual User Actions

| Action | UI Element | Technical Behavior | Status |
|--------|------------|-------------------|--------|
| **Skip Question** | `[Skip Question]` Button | Sends `SkipRequest` to Gemini; resets Question Timer. | Future |
| **End Block Early** | `[Finish Block]` Button | Closes current WebSocket; moves to Transition Phase. | Future |
| **End Interview** | `[End Interview]` Button | Closes WebSocket; skips remaining blocks; redirects to Feedback. | Future |

### 2. Resumption Logic (Page Reloads)

✅ **Implemented** - If a user refreshes the page, `BlockSession` resumes from the current block.

**Implementation:** See [BlockSession.tsx:36-40](../../src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx#L36-L40)

1.  **Frontend Initialization**:
    - `BlockSession` inspects the `blocks` array from `api.interview.getById`.
    - Identifies the first block where `status !== 'COMPLETED'`.
    - Sets `initialBlockIndex` to that block's index.
2.  **Backend Integrity**:
    - `submitTranscript` marks blocks as `COMPLETED` when transcript is submitted.

### 3. UX Refinements

- **30-Second Warning**: ✅ Implemented - Answer Timer turns red and pulses when `< 30s` remain
- **Block Timer Warning**: ✅ Implemented - Block Timer turns orange and pulses when `< 60s` remain
- **Transition Screen**: ✅ Implemented - Shows language switch info between blocks
- **"Processing" State**: ✅ Implemented - Shows "time's up" indicator when mic is muted

### 4. Block Status Mapping

| Scenario | Resulting Block Status | Resulting Interview Status |
|----------|------------------------|---------------------------|
| Timer expires on last question | `COMPLETED` | `COMPLETED` (if last block) |
| User clicks "End Block Early" | `COMPLETED` | `IN_PROGRESS` |
| User clicks "End Interview" | `SKIPPED` (for current + remaining) | `COMPLETED` |
| Connection lost (timeout) | `IN_PROGRESS` (until cleanup) | `ERROR` (after heartbeat fail) |
