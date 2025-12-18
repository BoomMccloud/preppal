# Support Different Languages

**Status**: In Progress

## Objective
Enable multi-language support for the interview experience, allowing users to practice interviews in languages other than English.

## Progress

### Planned
- [ ] Identify supported languages (e.g., Spanish, French, German, Chinese, Japanese)
- [ ] Update database schema to store preferred language for an interview session
- [ ] Update tRPC procedures to handle language selection
- [ ] Modify `buildSystemPrompt` to include language instructions
- [ ] Update Gemini Live API configuration for specific language models or hints if applicable
- [ ] Update UI to allow users to select their preferred language during interview creation
- [ ] Ensure frontend components (Transcript, etc.) handle different character sets correctly

## Key Files
- `prisma/schema.prisma`
- `src/server/api/routers/interview.ts`
- `worker/src/utils/build-system-prompt.ts`
- `src/app/(app)/create-interview/page.tsx`

## Reference
TBD