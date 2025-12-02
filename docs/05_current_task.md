# Current Task: FEAT17 - Real-Time Client Audio Integration

**Date:** December 2, 2025
**Status:** In Progress (TDD / Hook Refactoring)

## Overview
We are integrating the frontend with the new real-time audio backend (Cloudflare Worker). The backend and core frontend audio services (`AudioRecorder`, `AudioPlayer`) are complete. The remaining work is strictly in the **WebSocket integration layer** (`useInterviewSocket`) and **UI connection**.

We are following a **TDD approach**: Writing failing tests for the new hook logic before implementing it.

---

## Progress Dashboard

### Completed ✅
- **Backend**: Cloudflare Worker & Gemini integration (FEAT16).
- **Audio Services**: `AudioRecorder` and `AudioPlayer` implemented & tested (100% coverage).
- **Protobuf**: Definitions and generated types ready.
- **Session UI**: Basic layout and navigation (FEAT15).

### In Progress ⚠️
- **WebSocket Hook (`useInterviewSocket`)**: Currently being refactored to support Protobuf & new Auth flow.
- **Hook Tests**: `session/page.test.tsx` needs to be rewritten to match new specs.

### Pending ⏳
- **UI Integration**: displaying live transcripts and connection states.
- **E2E Testing**: Full flow verification against the local worker.

---

## Immediate Next Steps

1.  **Update Config**: Add `NEXT_PUBLIC_WORKER_URL` to `.env` and `env.js`.
2.  **Write Tests**: Rewrite `src/app/(app)/interview/[interviewId]/session/page.test.tsx` to fail against the current implementation (expecting Protobuf/New URL).
3.  **Refactor Hook**: Update `useInterviewSocket.ts` to pass the new tests.
    - Use `generateWorkerToken`.
    - Implement Protobuf encoding/decoding.
    - Wire up Audio services.

---

## Reference Documents
- **Plan**: [FEAT17_implementation_plan.md](./FEAT17_implementation_plan.md) (Technical Specs)
- **Design**: [01_design.md](./01_design.md)
- **Protobuf**: `proto/interview.proto`