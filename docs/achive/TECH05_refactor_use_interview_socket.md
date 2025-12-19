# TECH05: Refactor useInterviewSocket Hook

## Problem Statement
The `useInterviewSocket` hook (~366 lines) handles WebSocket, audio, transcripts, and timer logic. While it already delegates to extracted classes (`AudioSession`, `TranscriptManager`), some inline code could be extracted for better testability.

## Current State (What's Already Good)
The hook already uses:
- `AudioSession` class for recording/playback
- `TranscriptManager` class for transcript merging
- `preppal` module for protobuf definitions

## Refactoring Goals
1. **Extract protocol utilities** - Move encode/decode logic to plain functions
2. **Extract message handler** - Move `ws.onmessage` logic to a testable function
3. **Keep orchestration in the hook** - No new hooks, no synchronization complexity

## Proposed Architecture

### 1. Protocol Utilities (Plain Functions)
Location: `src/lib/interview/protocol.ts`

```typescript
import { preppal } from "~/lib/interview_pb";

export function encodeAudioChunk(audio: ArrayBuffer): Uint8Array {
  const message = preppal.ClientToServerMessage.create({
    audioChunk: { audioContent: new Uint8Array(audio) },
  });
  return preppal.ClientToServerMessage.encode(message).finish();
}

export function encodeEndRequest(): Uint8Array {
  const message = preppal.ClientToServerMessage.create({ endRequest: {} });
  return preppal.ClientToServerMessage.encode(message).finish();
}

export function decodeServerMessage(data: ArrayBuffer): preppal.ServerToClientMessage {
  return preppal.ServerToClientMessage.decode(new Uint8Array(data));
}
```

### 2. Message Handler (Plain Function)
Location: `src/lib/interview/handleServerMessage.ts`

```typescript
import { preppal } from "~/lib/interview_pb";

interface MessageHandlers {
  onTranscript: (update: preppal.ITranscriptUpdate) => void;
  onAudio: (data: Uint8Array) => void;
  onSessionEnded: (reason: number) => void;
  onError: (message: string) => void;
}

export function handleServerMessage(
  message: preppal.ServerToClientMessage,
  handlers: MessageHandlers
): void {
  if (message.transcriptUpdate) {
    handlers.onTranscript(message.transcriptUpdate);
  } else if (message.audioResponse?.audioContent?.length) {
    handlers.onAudio(message.audioResponse.audioContent);
  } else if (message.sessionEnded) {
    handlers.onSessionEnded(message.sessionEnded.reason ?? 0);
  } else if (message.error) {
    handlers.onError(message.error.message ?? "Unknown error");
  }
}
```

### 3. Timer Logic
**Keep inline.** It's 12 lines. Extracting to a hook adds overhead for no benefit.

## Implementation Plan

### Step 1: Create Protocol Utilities
- Create `src/lib/interview/protocol.ts`
- Add `encodeAudioChunk`, `encodeEndRequest`, `decodeServerMessage`
- Add unit tests

### Step 2: Create Message Handler
- Create `src/lib/interview/handleServerMessage.ts`
- Extract logic from `ws.onmessage` callback
- Add unit tests

### Step 3: Update useInterviewSocket
- Import and use the new utilities
- Replace inline encode/decode calls with utility functions
- Replace `ws.onmessage` body with `handleServerMessage` call

### Step 4: Verify
- Run existing integration tests
- Ensure no regressions

## Benefits
| Aspect | Before | After |
|--------|--------|-------|
| Protocol logic | Inline in hook | Testable pure functions |
| Message handling | 50-line callback | Testable pure function |
| New files | 0 | 2 utility files |
| New hooks | 0 | 0 |
| Synchronization concerns | None | None (no change) |

## What This Avoids
- **No new hooks** - Avoids `useEffect` dependency complexity
- **No hook synchronization** - No need to coordinate state between hooks
- **No ref stability concerns** - Plain functions don't have closure issues
- **Minimal changes** - Hook structure stays the same, just cleaner
