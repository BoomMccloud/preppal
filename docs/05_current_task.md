# Dynamic Gemini System Prompt Feature

**Status**: In Progress (Steps 1-7 Complete)

## Objective
Implement dynamic system prompt generation for the Gemini Live API, allowing the prompt to be constructed based on job description, user resume, and interviewer persona.

## Progress

### Completed (Steps 1-7)
- [x] Database schema update - Added `persona` field to Interview model
- [x] tRPC `getContext` procedure - Returns `persona` with default "professional interviewer"
- [x] `InterviewContext` interface - Includes `persona: string`
- [x] `buildSystemPrompt` utility function - Created at `worker/src/utils/build-system-prompt.ts`
- [x] `GeminiStreamHandler.connect()` - Uses `buildSystemPrompt(context)`
- [x] E2E verification - Tested via `/raw-worker-test` page with context inputs

### Remaining (Steps 8-9)
- [ ] Integrate into production app - Ensure persona is set when creating interviews
- [ ] Write unit tests for `buildSystemPrompt`

## Documentation Tasks
- [x] Consolidate `DEV_LOGIN.md` into `07_devops.md` for a unified development and production guide.

## Key Files
- `prisma/schema.prisma` - `persona String?` on Interview model
- `src/server/api/routers/interview.ts` - `getContext` returns persona
- `worker/src/utils/build-system-prompt.ts` - Prompt builder function
- `worker/src/services/gemini-stream-handler.ts` - Uses buildSystemPrompt
- `src/app/(app)/raw-worker-test/page.tsx` - Debug UI with context inputs

## Reference
See `docs/todo/FEAT_dynamic_prompt.md` for full implementation plan.
