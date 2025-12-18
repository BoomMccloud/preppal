# Refactor GeminiSession - Extract Stream Handler

**Status**: In Progress

## Objective
Further reduce `GeminiSession` complexity by extracting the AI stream orchestration logic into a `GeminiStreamHandler`. This service will manage the real-time loop with Gemini, utilizing existing low-level handlers.

## Deliverables
- [x] Extract `InterviewLifecycleManager` (Completed)
- [ ] Create failing tests for `GeminiStreamHandler`
- [ ] Implement `worker/src/services/gemini-stream-handler.ts`
- [ ] Integrate `GeminiStreamHandler` into `GeminiSession`
- [ ] Verify all tests pass

## Context
`GeminiSession` currently mixes WebSocket transport with the complex Gemini event loop.
- Existing `handlers/` (like `GeminiMessageHandler`) provide *logic* for processing individual messages.
- The new `GeminiStreamHandler` will provide *orchestration* (connecting, maintaining state, routing audio).