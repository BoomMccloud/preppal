# Current Task: Block-Based Interview Architecture Tests (FEAT27)

## Status: 🟡 TDD In Progress - Phase 3 Complete

**Phase 3 (Prisma Schema)** complete. All unit tests passing. Integration tests pending Phase 4 (tRPC procedures).

## Branch
`feat/interview-templates`

---

## Test Files Summary

| File | Type | Tests | Status |
|------|------|-------|--------|
| `src/test/unit/interview-templates-schema.test.ts` | Unit | 11 | ✅ Passing |
| `src/test/unit/interview-templates.test.ts` | Unit | 10 | ✅ Passing |
| `src/test/unit/block-prompt.test.ts` | Unit | 4 | ✅ Passing |
| `src/test/integration/interview-blocks.test.ts` | Integration | 17 | ❌ Fails (14 fail, 3 pass) |
| `src/test/integration/block-interview-golden-path.test.ts` | Integration | 5 | ❌ Fails (schema/procedures missing) |

**Total: 47 tests** (25 unit + 22 integration)
- ✅ Passing: 25 tests
- ❌ Failing: 22 tests (awaiting implementation)

---

## Implementation Required to Pass Tests

### Phase 1: Source Files (Unit Tests)
- [x] `src/lib/interview-templates/schema.ts` - Zod schemas ✅
  - `LanguageSchema` (en, zh)
  - `InterviewQuestionSchema` (content, optional translation)
  - `InterviewBlockSchema` (language, durationSec, questions.min(1))
  - `InterviewTemplateSchema` (id.min(1), name.min(1), blocks.min(1), answerTimeLimitSec)
  - **Updated 2025-12-28**: Added `.min(1)` constraints for validation
- [x] `src/lib/interview-templates/index.ts` - Template registry ✅
  - `getTemplate(id)` - returns template or null
  - `listTemplates()` - returns all templates
- [x] `src/lib/interview-templates/definitions/mba-behavioral-v1.ts` ✅
- [x] `src/lib/interview-templates/prompt.ts` - Prompt builder ✅
  - `buildBlockPrompt(ctx: BlockContext)` - generates system prompt
  - `LANGUAGE_INSTRUCTIONS` - en/zh instructions
  - `BlockContext` type exported

### Phase 2: Config & Templates
- [x] ~~Create `config/interview-templates/` directory~~ **Changed to TypeScript constants**
- [x] `src/lib/interview-templates/definitions/mba-behavioral-v1.ts` ✅

### Phase 3: Prisma Schema & Proto
- [x] Update `proto/interview.proto` with `block_number` fields ✅
  - `GetContextRequest.block_number` (optional)
  - `GetContextResponse.system_prompt`, `language` (optional)
  - `SubmitTranscriptRequest.block_number` (optional)
- [x] Add `BlockLanguage` enum (`EN`, `ZH`) ✅
- [x] Add `BlockStatus` enum (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`) ✅
- [x] Add `InterviewBlock` model ✅
  - `id`, `interviewId`, `blockNumber`, `language`, `questions`
  - `startedAt`, `endedAt`, `durationSec`, `status`, `transcriptId`
- [x] Add to `Interview` model: ✅
  - `templateId: String?`
  - `isBlockBased: Boolean @default(false)`
  - `blocks: InterviewBlock[]`

### Phase 4: tRPC Procedures
- [ ] Extend `interview.createSession` to accept `templateId`, create blocks
- [ ] Extend `interviewWorker.getContext` to accept `blockNumber`, return `systemPrompt`, `language`
- [ ] Extend `interviewWorker.submitTranscript` to accept `blockNumber`
- [ ] Add `interview.completeBlock` mutation

---

## Running Tests

```bash
# Run all FEAT27 tests
pnpm test -- --testPathPattern="interview-templates|block-prompt|interview-blocks|block-interview"

# Run only unit tests
pnpm test -- --testPathPattern="interview-templates-schema|interview-templates\.test|block-prompt"

# Run only integration tests
pnpm test -- --testPathPattern="interview-blocks|block-interview-golden-path"
```

---

## Design Reference
Full specification: [docs/todo/FEAT27_interview_templates.md](./todo/FEAT27_interview_templates.md)

### Recent Updates (2025-12-28)

**Test Quality Improvements:**
- ✅ Added 7 new edge case tests to `interview-templates-schema.test.ts`:
  - Empty blocks array rejection
  - Empty questions array rejection
  - Negative/zero `durationSec` rejection
  - Empty `id`/`name` rejection
  - Custom `answerTimeLimitSec` preservation
- ✅ Added 5 new tests to `interview-templates.test.ts`:
  - Empty string template ID handling
  - Duplicate template ID detection
  - Split "valid block structure" into focused tests
- ✅ Fixed schema with `.min(1)` constraints for proper validation

**Spec Updates:**
- ✅ Added **Prerequisites** section for junior developers
- ✅ Clarified file paths (`src/lib/interview-templates/` directory structure)
- ✅ **Simplified per-answer timer**: Changed from "mic cutoff + text injection" to "mic mute only"
  - Gemini interprets silence as "user finished" and moves to next question
  - No `sendTextMessage()` or Worker text injection needed
- ✅ **Changed to TypeScript constants** instead of JSON files
  - No file I/O, no caching, no `_clearCache()` needed
  - Type-safe at compile time
  - Simpler deployment

---

## Previous Task: Email OTP Authentication (FEAT25)

**Status: ✅ Complete** - All phases implemented and ready for manual testing.

See [FEAT25 spec](./todo/FEAT25_email_otp_login.md) for details.
