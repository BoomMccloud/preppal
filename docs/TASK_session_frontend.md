# CURRENT TASK: Implement Real-Time Interview Session (Frontend)

## Feature Spec

- Follow the frontend-related sections of the plan outlined in [FEAT15_session_page_spec.md](./FEAT15_session_page_spec.md).

## High-Level Plan

### Phase 2: Frontend (TDD & Implementation)
- [ ] **RED**: Create `src/app/(app)/interview/[interviewId]/session/page.test.tsx` and write failing tests for the state machine and UI rendering.
- [ ] **GREEN (Component Logic)**: Refactor `session/page.tsx` to implement the state machine and WebSocket connection logic. A `useInterviewSocket` custom hook is recommended to encapsulate WebSocket complexity.
- [ ] **GREEN (UI)**: Create the `TranscriptDisplay.tsx` component for rendering the conversation.
- [ ] **VERIFY**: Run all frontend tests and ensure they pass.
