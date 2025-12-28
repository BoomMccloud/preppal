# Current Task: Block-Based Interview Architecture Tests (FEAT27)

## Status: 🔴 TDD Red Phase Complete

All tests written and verified to fail. Ready for implementation.

## Branch
`feat/email-otp-utils` (continuing from FEAT25)

---

## Test Files Created

| File | Type | Tests | Status |
|------|------|-------|--------|
| `src/test/unit/interview-templates-schema.test.ts` | Unit | 24 | ❌ Fails (module not found) |
| `src/test/unit/interview-templates.test.ts` | Unit | 11 | ❌ Fails (module not found) |
| `src/test/unit/block-prompt.test.ts` | Unit | 23 | ❌ Fails (module not found) |
| `src/test/integration/interview-blocks.test.ts` | Integration | 17 | ❌ Fails (schema/procedures missing) |
| `src/test/integration/block-interview-golden-path.test.ts` | Integration | 4 | ❌ Fails (schema/procedures missing) |

**Total: 79 new tests**

---

## Implementation Required to Pass Tests

### Phase 1: Source Files (Unit Tests)
- [ ] `src/lib/interview-templates/schema.ts` - Zod schemas
  - `LanguageSchema` (en, zh)
  - `InterviewQuestionSchema` (content, optional translation)
  - `InterviewBlockSchema` (language, durationSec, questions)
  - `InterviewTemplateSchema` (id, name, blocks, answerTimeLimitSec)
- [ ] `src/lib/interview-templates/loader.ts` - Template loading
  - `getTemplate(id)` - returns template or null
  - `listTemplates()` - returns all templates
  - `_clearCache()`, `_getCache()` - test helpers
- [ ] `src/lib/interview-templates/prompt.ts` - Prompt builder
  - `buildBlockPrompt(ctx: BlockContext)` - generates system prompt
  - `LANGUAGE_INSTRUCTIONS` - en/zh instructions

### Phase 2: Config & Templates
- [ ] Create `config/interview-templates/` directory
- [ ] Add `mba-behavioral-v1.json` template file

### Phase 3: Prisma Schema
- [ ] Add `BlockLanguage` enum (`EN`, `ZH`)
- [ ] Add `BlockStatus` enum (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`)
- [ ] Add `InterviewBlock` model
  - `id`, `interviewId`, `blockNumber`, `language`, `questions`
  - `startedAt`, `endedAt`, `durationSec`, `status`, `transcriptId`
- [ ] Add to `Interview` model:
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

---

## Previous Task: Email OTP Authentication (FEAT25)

**Status: ✅ Complete** - All phases implemented and ready for manual testing.

See [FEAT25 spec](./todo/FEAT25_email_otp_login.md) for details.
