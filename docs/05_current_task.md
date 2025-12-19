# Current Task: Refactor Transcript Aggregation

## Status
- [x] Create design doc `docs/todo/TECH07_refactor_transcript_aggregation.md`
- [x] Investigate and document the three transcript handling paths
- [ ] Update `worker/src/interfaces/index.ts` with new interface methods
- [ ] Refactor `worker/src/transcript-manager.ts` with turn-based aggregation
- [ ] Update `worker/src/handlers/gemini-message-handler.ts` to call `markTurnComplete`
- [ ] Update session end logic to submit single formatted transcript row
- [ ] Update `worker/src/utils/feedback.ts` to read plain text directly
- [ ] Refactor frontend captions to use rolling buffer (closed caption style)
- [ ] Update/add tests for new behavior

## Objective
Refactor transcript handling to store **one row per interview** as plain text. Same data used for DB storage and feedback generation.

### Design Decisions
- **Data Format:** Plain text (`"USER: Hello\nAI: Hi there..."`)
- **Write Strategy:** On session end only (in-memory during interview)
- **Database:** Keep `TranscriptEntry` model, 1 row per interview

## Context
Currently, every partial update from the Gemini API (e.g., "H", "He", "Hel") is stored as a separate row. This causes:
1.  Massive database bloat (thousands of rows per session).
2.  Degraded feedback quality due to "stuttering" input text.

## Investigation Summary (Completed)

Confirmed three distinct transcript handling paths with different parsing logic:

| Path | File | Aggregation | Status |
|------|------|-------------|--------|
| **On-Screen Captions** | `src/lib/audio/TranscriptManager.ts` | YES (sentence regex) | ⚠️ Best available, but imperfect |
| **Database Storage** | `worker/src/transcript-manager.ts` | NO (raw append) | ❌ Bloated |
| **Feedback Submission** | `worker/src/utils/feedback.ts` | NO (raw concat) | ❌ Poor quality |

**Root Cause:** Frontend and worker have separate `TranscriptManager` implementations. Frontend uses smart sentence aggregation; worker uses dumb delta append.

## Implementation Plan
Follow the detailed specification in **[docs/todo/TECH07_refactor_transcript_aggregation.md](./todo/TECH07_refactor_transcript_aggregation.md)**.
