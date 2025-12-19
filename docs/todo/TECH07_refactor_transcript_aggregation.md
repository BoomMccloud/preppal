# TECH07: Refactor Transcript Aggregation

## Status: Design Finalized

## Problem Statement
The current implementation of `GeminiSession` and `TranscriptManager` treats every streaming update from the Gemini Live API as a discrete transcript entry.
- **Input**: Streaming deltas (e.g., "H", "He", "Hel", "Hello").
- **Current Behavior**: Saves each delta as a new `TranscriptEntry` in the array.
- **Consequences**:
    1.  **Database Bloat**: Hundreds/thousands of rows for a single sentence.
    2.  **Poor Feedback Quality**: The `generateFeedback` function concatenates these fragments, resulting in repetitive, stuttering text input for the evaluator (e.g., "USER: H\nUSER: He\n...").

## Investigation Findings

The streaming transcript data flows through **three distinct paths** with different parsing logic:

### 1. On-Screen Captions (Frontend)

**Files:**
- `src/lib/audio/TranscriptManager.ts`
- `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

**Current Behavior:**
- Uses **sentence-detection aggregation** with regex `/(?<=[.?!])\s*/`
- Buffers partial text in `transcriptBuffers[speaker]`
- Only emits complete sentences via `onSentence` callback
- Maintains "committed" (final) vs "pending" (buffered) state for display
- **Status:** Most advanced implementation, but still has issues (e.g., sentence boundary detection is imperfect)

```typescript
// Splits by sentence-ending punctuation
const sentences = (this.transcriptBuffers[speaker] ?? "").split(/(?<=[.?!])\s*/);
if (sentences.length > 1) {
  // Emit complete sentences
  this.callbacks.onSentence(speaker, sentence.trim());
}
```

### 2. Database Storage (Worker)

**Files:**
- `worker/src/transcript-manager.ts`
- `worker/src/handlers/gemini-message-handler.ts`
- `prisma/schema.prisma` (TranscriptEntry model)

**Current Behavior:**
- Uses **raw streaming append** - every delta becomes a new entry
- No sentence boundary logic or aggregation
- Direct push to array on every message

```typescript
addUserTranscript(text: string): void {
  this.transcript.push({
    speaker: "USER",
    content: text,  // Raw delta, no aggregation
    timestamp: new Date().toISOString(),
  });
}
```

**Status:** BROKEN - causes database bloat (hundreds/thousands of rows per sentence)

### 3. Feedback Submission (Worker)

**Files:**
- `worker/src/utils/feedback.ts`
- `worker/src/services/interview-lifecycle-manager.ts`

**Current Behavior:**
- Takes raw `TranscriptEntry` array from database
- Simple line-by-line concatenation: `${speaker}: ${content}`
- Sends fragmented text directly to Gemini evaluator

```typescript
const transcriptText = transcript
  .map((e) => `${e.speaker}: ${e.content}`)
  .join("\n");
// Results in: "USER: H\nUSER: He\nUSER: Hel\nUSER: Hello\n..."
```

**Status:** BROKEN - poor AI feedback quality due to stuttering input

### Comparison Table

| Aspect | On-Screen Captions | Database Storage | Feedback Input |
|--------|-------------------|------------------|----------------|
| **File** | `src/lib/audio/TranscriptManager.ts` | `worker/src/transcript-manager.ts` | `worker/src/utils/feedback.ts` |
| **Aggregation** | YES (sentence regex) | NO (raw append) | NO (raw concat) |
| **Data Unit** | Complete sentences | Streaming deltas | Raw DB entries |
| **Quality** | Most advanced, but imperfect | BROKEN - Bloated | BROKEN - Poor |

### Root Cause

The frontend and worker have **separate TranscriptManager implementations** with different logic:
- Frontend: Smart sentence aggregation (works)
- Worker: Dumb delta append (broken)

The fix must apply turn-based aggregation to the **worker** `TranscriptManager` before storing to DB.

## Objective
Refactor the transcript handling to store **one row per interview** containing the complete transcript as a protobuf binary blob. The same data should be used for both database storage and feedback generation.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Data Format** | Protobuf binary | Schema-enforced, compact, future-proof |
| **Storage** | Binary `Bytes` (BLOB) | Most efficient, no encoding overhead |
| **Write Strategy** | On session end only | Data loss acceptable if worker crashes (interview restarts) |
| **Database** | Modify existing `TranscriptEntry` model | No existing data to migrate |
| **Proto Location** | New file `proto/transcript.proto` | Separate concern from existing protos |
| **Turn Fields** | `speaker`, `content`, `timestamp` | Minimal metadata; `isComplete` is in-memory only |
| **Frontend UX** | Rolling buffer (closed caption style) | Simpler than sentence parsing, immediate feedback |
| **`turnComplete` Signal** | Assume always sent | Simplifies implementation |
| **Backward Compat** | Not needed | No existing consumers |

## Technical Design

### Architecture Overview

```
Streaming Deltas -> Worker Memory (turn-based aggregation) -> Session End -> DB (1 row, protobuf blob)
                                                                          |
                                                              Feedback Generation (deserialize, format as text)
```

### 1. Protobuf Schema Definition
Create `proto/transcript.proto`:

```protobuf
syntax = "proto3";

package preppal.transcript;

// Complete transcript for an interview session
message Transcript {
  repeated Turn turns = 1;
}

// A single conversational turn by one speaker
message Turn {
  Speaker speaker = 1;
  string content = 2;
  int64 timestamp_ms = 3;  // Unix milliseconds - simpler than google.protobuf.Timestamp
}

// Speaker identity
enum Speaker {
  SPEAKER_UNSPECIFIED = 0;
  USER = 1;
  AI = 2;
}
```

### 2. Database Schema Update
Update `prisma/schema.prisma`:

```prisma
model TranscriptEntry {
  id          String   @id @default(cuid())
  interviewId String   @unique  // One per interview (changed from non-unique)
  transcript  Bytes    // Protobuf binary blob (replaces individual fields)
  createdAt   DateTime @default(now())

  interview   Interview @relation(fields: [interviewId], references: [id])
}
```

**Migration:** Delete all existing `TranscriptEntry` rows before applying schema changes (they contain invalid fragment data).

### 3. Worker TranscriptManager Refactor
Update `worker/src/transcript-manager.ts`:

- Maintain an in-memory array of turns (not raw deltas)
- Aggregate deltas: append to current turn if same speaker, new turn on speaker change
- On `turnComplete` signal: mark current turn as complete
- Provide `serializeTranscript()` method that returns protobuf binary
- Provide `formatAsText()` method for feedback generation

```typescript
import { Transcript, Turn, Speaker } from "./generated/transcript_pb";

interface InMemoryTurn {
  speaker: Speaker;
  content: string;
  timestamp: Date;
  isComplete: boolean;
}

class TranscriptManager {
  private turns: InMemoryTurn[] = [];

  addTranscript(speaker: Speaker, text: string): void {
    const lastTurn = this.turns[this.turns.length - 1];
    if (lastTurn && lastTurn.speaker === speaker && !lastTurn.isComplete) {
      // Append to existing turn
      lastTurn.content += text;
    } else {
      // Start new turn
      this.turns.push({
        speaker,
        content: text,
        timestamp: new Date(),
        isComplete: false,
      });
    }
  }

  markTurnComplete(): void {
    const lastTurn = this.turns[this.turns.length - 1];
    if (lastTurn) lastTurn.isComplete = true;
  }

  serializeTranscript(): Uint8Array {
    const transcript = new Transcript();
    transcript.turns = this.turns.map((t) => {
      const turn = new Turn();
      turn.speaker = t.speaker;
      turn.content = t.content;
      turn.timestampMs = BigInt(t.timestamp.getTime());
      return turn;
    });
    return transcript.toBinary();
  }

  formatAsText(): string {
    return this.turns
      .map((t) => `${speakerToString(t.speaker)}: ${t.content}`)
      .join("\n");
  }
}

function speakerToString(speaker: Speaker): string {
  switch (speaker) {
    case Speaker.USER: return "USER";
    case Speaker.AI: return "AI";
    default: return "UNKNOWN";
  }
}
```

### 4. Interface Updates
Update `worker/src/interfaces/index.ts`:

```typescript
export interface ITranscriptManager {
  addUserTranscript(text: string): void;
  addAITranscript(text: string): void;
  markTurnComplete(): void;
  serializeTranscript(): Uint8Array;  // For DB storage
  formatAsText(): string;              // For feedback generation
}
```

### 5. Handler Integration
Update `worker/src/handlers/gemini-message-handler.ts`:
- Call `markTurnComplete()` when `message.serverContent.turnComplete === true`

### 6. Session End / DB Submission
Update `worker/src/services/interview-lifecycle-manager.ts` (or equivalent):
- On session end, call `transcriptManager.serializeTranscript()`
- Submit as single `TranscriptEntry` row with protobuf binary in `transcript` field

### 7. Feedback Generation
Update `worker/src/utils/feedback.ts`:
- Deserialize protobuf from `TranscriptEntry.transcript`
- Format as plain text for the evaluator prompt
- Or use `formatAsText()` directly from the in-memory manager before serialization

### 8. On-Screen Captions (Frontend)
Update `src/lib/audio/TranscriptManager.ts` to use a **closed caption style** rolling buffer:

- **No sentence parsing** - just append chunks and trim old text
- **Two independent buffers** - one for USER, one for AI (each fills continuously)
- **Rolling buffer** - display last N characters that fit on screen
- **Immediate display** - show text as it arrives, no waiting for sentence boundaries
- **No turn-complete handling** - buffers just keep filling; `turnComplete` signal is ignored for display

```typescript
class CaptionBuffer {
  private buffer: string = "";
  private maxLength: number = 100; // chars that fit in caption box

  append(text: string): string {
    this.buffer += text;
    if (this.buffer.length > this.maxLength) {
      this.buffer = this.buffer.slice(-this.maxLength);
    }
    return this.buffer;
  }

  clear(): void {
    this.buffer = "";
  }
}

// Usage: two independent instances
const userCaptions = new CaptionBuffer();
const aiCaptions = new CaptionBuffer();
```

**Benefits:**
- Simpler than sentence detection regex
- Immediate feedback to user
- Familiar UX (like YouTube live captions or TV closed captions)
- No edge cases with punctuation parsing

## Implementation Steps
1.  [x] Create design doc (this file)
2.  [x] Investigate and document the three transcript handling paths
3.  [x] Finalize design decisions (protobuf, storage format, UX)
4.  [ ] Create `proto/transcript.proto` with Transcript, Turn, Speaker definitions
5.  [ ] Generate TypeScript bindings from protobuf
6.  [ ] Delete all existing `TranscriptEntry` rows from database
7.  [ ] Update `prisma/schema.prisma` - modify TranscriptEntry model
8.  [ ] Update `worker/src/interfaces/index.ts` with new interface methods
9.  [ ] Refactor `worker/src/transcript-manager.ts` with turn-based aggregation
10. [ ] Update `worker/src/handlers/gemini-message-handler.ts` to call `markTurnComplete`
11. [ ] Update session end logic to submit single protobuf transcript row
12. [ ] Update `worker/src/utils/feedback.ts` to deserialize and format transcript
13. [ ] Refactor frontend captions to use rolling buffer (closed caption style)
14. [ ] Add tests (following anti-pattern guidelines - NO mocks for pure logic):

**Pure Logic Tests** (`worker/src/__tests__/transcript-manager.test.ts`) - NO mocks:
- [ ] Turn aggregation: same speaker appends to existing turn
- [ ] Turn aggregation: speaker change creates new turn
- [ ] Turn aggregation: `markTurnComplete()` forces new turn for same speaker
- [ ] Protobuf roundtrip: serialize → deserialize preserves all fields
- [ ] `formatAsText()`: correct "SPEAKER: content" format
- [ ] Edge case: empty transcript returns empty string / valid empty protobuf
- [ ] Edge case: single turn
- [ ] Edge case: rapid speaker switching (A→B→A→B)

**Integration Test** (`src/test/integration/transcript.test.ts`) - Real DB, no mocks:
- [ ] Full flow: TranscriptManager → serialize → DB write → DB read → deserialize → verify

**What NOT to test** (anti-patterns):
- ❌ "mock.addTranscript was called with X" - tests mock behavior, not real behavior
- ❌ Mocking TranscriptManager internals - it's pure logic, no mocks needed
- ❌ Asserting on mock existence - proves nothing about real code

## Benefits
- **Single Source of Truth:** One row per interview, same data for DB and feedback
- **Clean Data:** Database stores structured conversation, not fragments
- **Better AI Feedback:** Evaluator receives natural conversation history
- **Efficiency:** Drastically reduced storage (1 row vs hundreds/thousands)
- **Schema Enforcement:** Protobuf ensures data integrity
- **Future-Proof:** Structured data allows analytics, playback, editing later
- **Simpler Frontend:** Rolling buffer approach eliminates sentence parsing complexity