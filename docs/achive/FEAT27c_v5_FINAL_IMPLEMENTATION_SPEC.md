# FEAT27c v5: Dumb Driver Implementation Spec

**Status:** Ready for Implementation
**Date:** 2025-12-29
**Estimated Time:** 14 hours
**Architecture:** Stateless "Dumb Driver" Pattern with Discriminated Union State

---

## Executive Summary

This specification guides the refactoring of `useInterviewSocket` from a stateful hook into a stateless "Dumb Driver" that reports events upward. All business logic and state management moves to a pure reducer function.

**Core Principle:** "The Reducer is the Brain. The Hook is the Hardware Driver."

**What Changes:**
- `useInterviewSocket`: Remove all `useState` (8 declarations), become stateless I/O driver
- `sessionReducer`: Expand existing discriminated union with new fields
- `BlockSession`: Orchestrate driver ↔ reducer communication
- `SessionContent`: Consume state from reducer instead of hook

**What Stays the Same:**
- Existing state machine structure (WAITING_FOR_CONNECTION, ANSWERING, etc.)
- TranscriptManager integration (remains in driver)
- All internal hook methods (just expose them differently)

---

## Phase 1: Type Definitions (1 hour)

### File: `src/app/[locale]/(interview)/interview/[interviewId]/session/types.ts`

**Current:** 44 lines with discriminated union SessionState
**Action:** Add new types and expand existing SessionState

#### Step 1.1: Move TranscriptEntry Interface

**Current Location:** useInterviewSocket.ts lines 20-24

**Action:** Move to types.ts

```typescript
// Add to types.ts
export interface TranscriptEntry {
  text: string;
  speaker: "AI" | "USER";
  is_final: boolean;
}
```

---

#### Step 1.2: Add Command Type

```typescript
// Add to types.ts
export type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "SETUP_AUDIO" }
  | { type: "STOP_AUDIO" };
```

---

#### Step 1.3: Add ReducerResult Interface

```typescript
// Add to types.ts
export interface ReducerResult {
  state: SessionState;
  commands: Command[];
}
```

---

#### Step 1.4: Add DriverEvents Interface

```typescript
// Add to types.ts
export interface DriverEvents {
  onConnectionOpen: () => void;
  onConnectionClose: (code: number) => void;
  onConnectionError: (error: string) => void;
  onTranscriptCommit: (entry: TranscriptEntry) => void;
  onTranscriptPending: (buffers: { user?: string; ai?: string }) => void;
  onAudioPlaybackChange: (isPlaying: boolean) => void;
  onMediaStream?: (stream: MediaStream) => void;
}
```

---

#### Step 1.5: Expand SessionEvent Union

**Current:** Lines 26-29

```typescript
// Current
export type SessionEvent =
  | { type: "CONNECTION_READY"; initialBlockIndex: number }
  | { type: "TICK" }
  | { type: "USER_CLICKED_CONTINUE" };
```

**Update to:**

```typescript
export type SessionEvent =
  // Existing events (keep these)
  | { type: "CONNECTION_READY"; initialBlockIndex: number }
  | { type: "TICK" }
  | { type: "USER_CLICKED_CONTINUE" }
  // New driver events
  | { type: "CONNECTION_ESTABLISHED" }
  | { type: "CONNECTION_CLOSED"; code: number }
  | { type: "CONNECTION_ERROR"; error: string }
  | { type: "TRANSCRIPT_COMMIT"; entry: TranscriptEntry }
  | { type: "TRANSCRIPT_PENDING"; buffers: { user?: string; ai?: string } }
  | { type: "AI_SPEAKING_CHANGED"; isSpeaking: boolean }
  | { type: "TIMER_TICK" };
```

---

#### Step 1.6: Expand SessionState with Common Fields

**Current:** Lines 4-24 (discriminated union with 5 variants)

**Strategy:** Use intersection types to avoid repetition

```typescript
// Add common fields type
type CommonStateFields = {
  connectionState: "initializing" | "connecting" | "live" | "ending" | "error";
  transcript: TranscriptEntry[];
  pendingUser?: string;
  pendingAI?: string;
  elapsedTime: number;
  error: string | null;
  isAiSpeaking: boolean;
  commands: Command[];
};

// Expand existing SessionState
export type SessionState =
  | ({ status: "WAITING_FOR_CONNECTION" } & CommonStateFields)
  | ({
      status: "ANSWERING";
      blockIndex: number;
      blockStartTime: number;
      answerStartTime: number;
    } & CommonStateFields)
  | ({
      status: "ANSWER_TIMEOUT_PAUSE";
      blockIndex: number;
      blockStartTime: number;
      pauseStartedAt: number;
    } & CommonStateFields)
  | ({
      status: "BLOCK_COMPLETE_SCREEN";
      completedBlockIndex: number;
    } & CommonStateFields)
  | ({ status: "INTERVIEW_COMPLETE" } & CommonStateFields);
```

**Verification:** Type check passes, existing reducer logic still works

---

## Phase 2: Reducer Updates (2 hours)

### File: `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

**Current:** 93 lines, returns `SessionState`
**Action:** Change return type, add event handlers, manage new fields

#### Step 2.1: Update Function Signature

**Current:** Line 9-14

```typescript
// Current
export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
  context: ReducerContext,
  now = Date.now(),
): SessionState {
```

**Update to:**

```typescript
export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
  context: ReducerContext,
  now = Date.now(),
): ReducerResult {  // ← Changed return type
```

---

#### Step 2.2: Update All Return Statements

**Current pattern:** `return { status: "...", ... };`
**New pattern:** `return { state: { status: "...", ... }, commands: [] };`

**Example from line 24-30:**

```typescript
// Current
case "CONNECTION_READY":
  return {
    status: "ANSWERING",
    blockIndex: event.initialBlockIndex,
    blockStartTime: now,
    answerStartTime: now,
  };

// Update to
case "CONNECTION_READY":
  return {
    state: {
      status: "ANSWERING",
      blockIndex: event.initialBlockIndex,
      blockStartTime: now,
      answerStartTime: now,
      // Add common fields with defaults
      connectionState: "initializing",
      transcript: [],
      pendingUser: "",
      pendingAI: "",
      elapsedTime: 0,
      error: null,
      isAiSpeaking: false,
      commands: [],
    },
    commands: [{ type: "START_CONNECTION", blockNumber: event.initialBlockIndex }],
  };
```

**Apply this pattern to all return statements in the file (~15 locations)**

---

#### Step 2.3: Add New Event Handlers

Add these new cases to the reducer:

```typescript
case "CONNECTION_ESTABLISHED":
  return {
    state: { ...state, connectionState: "live" },
    commands: [],
  };

case "CONNECTION_CLOSED":
  return {
    state: { ...state, connectionState: "ending" },
    commands: [{ type: "CLOSE_CONNECTION" }],
  };

case "CONNECTION_ERROR":
  return {
    state: {
      ...state,
      connectionState: "error",
      error: event.error,
    },
    commands: [],
  };

case "TRANSCRIPT_COMMIT":
  return {
    state: {
      ...state,
      transcript: [...state.transcript, event.entry],
    },
    commands: [],
  };

case "TRANSCRIPT_PENDING":
  return {
    state: {
      ...state,
      pendingUser: event.buffers.user,
      pendingAI: event.buffers.ai,
    },
    commands: [],
  };

case "AI_SPEAKING_CHANGED":
  return {
    state: { ...state, isAiSpeaking: event.isSpeaking },
    commands: [],
  };

case "TIMER_TICK":
  return {
    state: { ...state, elapsedTime: state.elapsedTime + 1 },
    commands: [],
  };
```

---

#### Step 2.4: Update State Transitions to Generate Commands

When transitioning to ANSWER_TIMEOUT_PAUSE, generate MUTE_MIC command:

```typescript
// Line 37-43 area
if (isTimeUp(state.answerStartTime, context.answerTimeLimit, now)) {
  return {
    state: {
      status: "ANSWER_TIMEOUT_PAUSE",
      blockIndex: state.blockIndex,
      blockStartTime: state.blockStartTime,
      pauseStartedAt: now,
      // ... common fields
    },
    commands: [{ type: "MUTE_MIC" }],  // ← Generate command
  };
}
```

When transitioning back to ANSWERING, generate UNMUTE_MIC command:

```typescript
// Line 61-68 area
if (elapsed >= TIMER_CONFIG.ANSWER_TIMEOUT_PAUSE_DURATION_MS) {
  return {
    state: {
      status: "ANSWERING",
      blockIndex: state.blockIndex,
      blockStartTime: state.blockStartTime,
      answerStartTime: now,
      // ... common fields
    },
    commands: [{ type: "UNMUTE_MIC" }],  // ← Generate command
  };
}
```

---

## Phase 3: Hook Refactor (4 hours)

### File: `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`

**Current:** 392 lines with 8 useState declarations
**Action:** Remove all state, change to event-driven API

#### Step 3.1: Delete useState Declarations

**Lines to delete:**

```typescript
// Line 57 - DELETE
const [state, setState] = useState<SessionState>("initializing");

// Lines 58-60 - DELETE
const [committedTranscript, setCommittedTranscript] = useState<TranscriptEntry[]>([]);

// Lines 61-63 - DELETE
const [pendingTranscript, setPendingTranscript] = useState<TranscriptEntry[]>([]);

// Line 64 - DELETE
const [elapsedTime, setElapsedTime] = useState(0);

// Line 65 - DELETE
const [error, setError] = useState<string | null>(null);

// Line 66 - DELETE
const [isAiSpeaking, setIsAiSpeaking] = useState(false);

// Lines 82-83 - DELETE
const [connectAttempts, setConnectAttempts] = useState(0);
const [activeConnections, setActiveConnections] = useState(0);
```

**Delete lines 68-71 (useMemo for transcript):**
```typescript
// DELETE
const transcript = useMemo(
  () => [...committedTranscript, ...pendingTranscript],
  [committedTranscript, pendingTranscript],
);
```

---

#### Step 3.2: Delete useEffect Declarations

**Line 74-76 - DELETE:**
```typescript
// DELETE
const stateRef = useRef(state);
useEffect(() => {
  stateRef.current = state;
}, [state]);
```

**Lines 102-112 - DELETE (barge-in detection):**
```typescript
// DELETE entire useEffect
useEffect(() => {
  const lastEntry = transcript[transcript.length - 1];
  if (lastEntry?.speaker === "USER" && isAiSpeaking) {
    if (audioSessionRef.current) {
      audioSessionRef.current.clearPlaybackQueue();
    }
  }
}, [transcript, isAiSpeaking]);
```

**Lines 142-210 - REFACTOR (audio setup, don't delete yet)**

**Lines 345-361 - REFACTOR (initial connection, don't delete yet)**

---

#### Step 3.3: Update Function Signature

**Current:** Lines 26-56

```typescript
// Current
interface UseInterviewSocketProps {
  interviewId: string;
  guestToken?: string;
  onSessionEnded: () => void;
  blockNumber?: number;
  onMediaStream?: (stream: MediaStream) => void;
}

interface UseInterviewSocketReturn {
  state: SessionState;
  transcript: TranscriptEntry[];
  elapsedTime: number;
  error: string | null;
  endInterview: () => void;
  isAiSpeaking: boolean;
  muteAudio: () => void;
  unmuteAudio: () => void;
  isAudioMuted: () => boolean;
  debugInfo: { connectAttempts: number; activeConnections: number };
}

export function useInterviewSocket({
  interviewId,
  guestToken,
  onSessionEnded,
  blockNumber,
  onMediaStream,
}: UseInterviewSocketProps): UseInterviewSocketReturn
```

**Replace with:**

```typescript
export function useInterviewSocket(
  interviewId: string,
  guestToken: string | undefined,
  blockNumber: number | undefined,
  events: DriverEvents
): {
  connect: () => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  isAudioMuted: () => boolean;
  debugInfo?: { connectAttempts: number; activeConnections: number };
}
```

**Delete the old interfaces (UseInterviewSocketProps, UseInterviewSocketReturn)**

---

#### Step 3.4: Update TranscriptManager to Fire Events

**Current:** Lines 88-99

```typescript
// Current
transcriptManagerRef.current ??= new TranscriptManager({
  onSentence: (speaker, text) => {
    setCommittedTranscript((prev) => [
      ...prev,
      { text, speaker: speaker === "USER" ? "USER" : "AI", is_final: true },
    ]);
  },
});
```

**Replace with:**

```typescript
transcriptManagerRef.current ??= new TranscriptManager({
  onSentence: (speaker, text) => {
    events.onTranscriptCommit({
      text,
      speaker: speaker === "USER" ? "USER" : "AI",
      is_final: true,
    });
  },
});
```

---

#### Step 3.5: Update generateToken Mutation

**Current:** Lines 114-123

```typescript
// Current
const { mutate: generateToken } = api.interview.generateWorkerToken.useMutation({
  onSuccess: (data) => {
    connectWebSocket(data.token);
  },
  onError: (err) => {
    setError(err.message);
    setState("error");
  },
});
```

**Replace with:**

```typescript
const { mutate: generateToken } = api.interview.generateWorkerToken.useMutation({
  onSuccess: (data) => {
    connectWebSocket(data.token);
  },
  onError: (err) => {
    events.onConnectionError(err.message);
  },
});
```

---

#### Step 3.6: Remove Timer Functions

**Lines 125-137 - DELETE:**

```typescript
// DELETE (timer moves to BlockSession)
const startTimer = () => {
  timerRef.current = setInterval(
    () => setElapsedTime((prev) => prev + 1),
    1000,
  );
};

const stopTimer = () => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};
```

---

#### Step 3.7: Extract setupAudio as Internal Function

**Current:** Lines 142-210 (inside useEffect)

**Action:** Extract the `setupAudio` function outside of useEffect, remove the useEffect wrapper

```typescript
// Add as internal function
const setupAudio = async () => {
  console.log("Setting up audio...");

  try {
    const audioSession = new AudioSession();
    audioSessionRef.current = audioSession;

    audioSession.onPlaybackStateChange = (isPlaying) => {
      events.onAudioPlaybackChange(isPlaying);  // ← Fire event instead of setState
    };

    await audioSession.start((audioChunk) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(encodeAudioChunk(audioChunk));
        } catch (err) {
          console.error("Error sending audio chunk:", err);
        }
      }
    });

    // Expose MediaStream if requested
    const stream = audioSession.getRecorder()?.getStream();
    if (stream && events.onMediaStream) {
      events.onMediaStream(stream);  // ← Fire event instead of callback
    }

    // Don't call startTimer() - timer is in BlockSession now
  } catch (err) {
    console.error("[setupAudio] Failed to initialize audio:", err);
    events.onConnectionError(
      err instanceof Error
        ? `Audio initialization failed: ${err.message}`
        : "Failed to initialize audio"
    );
  }
};

// DELETE the useEffect wrapper (lines 142-210)
```

---

#### Step 3.8: Update connectWebSocket to Fire Events

**Current:** Lines 212-330

**Replace all setState calls with event calls:**

```typescript
const connectWebSocket = (token: string) => {
  // ... existing setup logic ...

  ws.onopen = () => {
    // Remove: setActiveConnections((prev) => prev + 1);
    console.log(`[WebSocket] Connected successfully`);
    events.onConnectionOpen();  // ← Fire event instead of setState

    // Call setupAudio after connection opens
    void setupAudio();
  };

  ws.onmessage = (event: MessageEvent) => {
    if (!(event.data instanceof ArrayBuffer)) return;

    const message = decodeServerMessage(event.data);

    handleServerMessage(message, {
      onTranscript: (update) => {
        const tm = transcriptManagerRef.current;
        if (tm) {
          tm.process(update);

          // Fire pending event
          events.onTranscriptPending({
            user: tm.getBufferedText("USER"),
            ai: tm.getBufferedText("AI"),
          });
        }
      },
      onAudio: (audioData) => {
        audioSessionRef.current?.enqueueAudio(audioData);
      },
      onSessionEnded: (reason) => {
        console.log(`[WebSocket] Session ended with reason: ${reason}`);
        events.onConnectionClose(reason);  // ← Fire event
      },
      onError: (errorMessage) => {
        console.log(`[WebSocket] Error from server: ${errorMessage}`);
        events.onConnectionError(errorMessage);  // ← Fire event
      },
    });
  };

  ws.onerror = (event) => {
    console.error(`[WebSocket] Error:`, event);
    events.onConnectionError("Connection error.");  // ← Fire event
  };

  ws.onclose = (event) => {
    // Remove: setActiveConnections((prev) => Math.max(0, prev - 1));
    console.log(`[WebSocket] Closed with code ${event.code}`);

    switch (event.code) {
      case WS_CLOSE_USER_INITIATED:
      case WS_CLOSE_TIMEOUT:
      case WS_CLOSE_GEMINI_ENDED:
        events.onConnectionClose(event.code);  // ← Fire event
        break;
      case WS_CLOSE_ERROR:
        events.onConnectionError("Session error");  // ← Fire event
        break;
      default:
        // Remove stateRef check (no longer have state)
        events.onConnectionError("Connection lost");  // ← Fire event
    }
  };
};
```

---

#### Step 3.9: Remove endInterview Function

**Lines 332-343 - DELETE:**

```typescript
// DELETE (functionality moves to disconnect method)
const endInterview = () => {
  if (wsRef.current && state === "live") {
    setState("ending");
    try {
      wsRef.current.send(encodeEndRequest());
    } catch (err) {
      console.error("Error sending end request:", err);
    }
  }
};
```

---

#### Step 3.10: Refactor Initial Connection useEffect

**Lines 345-361 - REFACTOR:**

**Current:**
```typescript
useEffect(() => {
  if (!hasInitiatedConnection.current) {
    hasInitiatedConnection.current = true;
    generateToken({ interviewId, token: guestToken });
  }

  return () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };
}, [interviewId]);
```

**Replace with connect() method:**

```typescript
const connect = useCallback(() => {
  if (!hasInitiatedConnection.current) {
    hasInitiatedConnection.current = true;
    generateToken({ interviewId, token: guestToken });
  }
}, [interviewId, guestToken, generateToken]);
```

---

#### Step 3.11: Update Return Object

**Current:** Lines 376-390

```typescript
// Current
return {
  state,
  transcript,
  elapsedTime,
  error,
  endInterview,
  isAiSpeaking,
  muteAudio,
  unmuteAudio,
  isAudioMuted,
  debugInfo: { connectAttempts, activeConnections },
};
```

**Replace with:**

```typescript
return {
  connect,
  disconnect: useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.send(encodeEndRequest());
        wsRef.current.close();
      } catch (err) {
        console.error("Error during disconnect:", err);
      }
    }
    audioSessionRef.current?.stop();
    audioSessionRef.current = null;
  }, []),
  mute: useCallback(() => {
    audioSessionRef.current?.muteInput();
  }, []),
  unmute: useCallback(() => {
    audioSessionRef.current?.unmuteInput();
  }, []),
  isAudioMuted: useCallback(() => {
    return audioSessionRef.current?.isInputMuted() ?? false;
  }, []),
  debugInfo: {
    // These can be refs instead of state
    connectAttempts: 0,  // Remove state tracking or use ref
    activeConnections: 0, // Remove state tracking or use ref
  },
};
```

---

#### Step 3.12: Add Cleanup Effect

Add a cleanup effect to close connections on unmount:

```typescript
useEffect(() => {
  return () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioSessionRef.current?.stop();
    audioSessionRef.current = null;
  };
}, []);
```

---

## Phase 4: BlockSession Orchestration (3 hours)

### File: `src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx`

**Current:** 347 lines, uses `useReducer` but also consumes hook state
**Action:** Remove hook state consumption, add timer, wire events, execute commands

#### Step 4.1: Add Timer Management

**Add after line 100 (after existing useEffect for TICK):**

```typescript
// Add elapsedTime timer (global for entire session)
useEffect(() => {
  const interval = setInterval(() => {
    dispatch({ type: 'TIMER_TICK' });
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

**Note:** The existing TICK interval (line 94-100) is for the answer timer state machine. Keep it. The new TIMER_TICK is for global elapsed time.

---

#### Step 4.2: Initialize Driver with Events

**Current:** BlockSession doesn't directly use useInterviewSocket (SessionContent does)

**Action:** For this phase, changes will be in SessionContent (next phase). BlockSession just needs to ensure state includes commands field.

**Verify reducer state is being used correctly:**

```typescript
// No changes needed to BlockSession - it already uses reducer state
const [state, dispatch] = useReducer(reducer, { status: 'WAITING_FOR_CONNECTION' });

// Verify state has commands field (from reducer)
// Will be consumed in SessionContent
```

---

## Phase 5: SessionContent Updates (1 hour)

### File: `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent.tsx`

**Current:** 320 lines, consumes hook state directly
**Action:** Update hook call, consume state from props/context, execute commands

#### Step 5.1: Update useInterviewSocket Call

**Current:** Lines 103-126

```typescript
// Current
const {
  state,
  transcript,
  elapsedTime,
  error,
  endInterview,
  isAiSpeaking,
  debugInfo: wsDebugInfo,
} = useInterviewSocket({
  interviewId,
  guestToken,
  blockNumber,
  onMediaStream,
  onSessionEnded: () => {
    if (onSessionEnded) {
      onSessionEnded();
    } else {
      router.push(feedbackUrl);
    }
  },
});
```

**Replace with:**

```typescript
// Initialize reducer (add to component)
const [reducerState, dispatch] = useReducer(sessionReducer, {
  status: "WAITING_FOR_CONNECTION",
  connectionState: "initializing",
  transcript: [],
  pendingUser: "",
  pendingAI: "",
  elapsedTime: 0,
  error: null,
  isAiSpeaking: false,
  commands: [],
});

// Initialize driver with event callbacks
const driver = useInterviewSocket(
  interviewId,
  guestToken,
  blockNumber,
  {
    onConnectionOpen: () => dispatch({ type: 'CONNECTION_ESTABLISHED' }),
    onConnectionClose: (code) => {
      dispatch({ type: 'CONNECTION_CLOSED', code });
      // Handle navigation
      if (onSessionEnded) {
        onSessionEnded();
      } else {
        router.push(feedbackUrl);
      }
    },
    onConnectionError: (error) => dispatch({ type: 'CONNECTION_ERROR', error }),
    onTranscriptCommit: (entry) => dispatch({ type: 'TRANSCRIPT_COMMIT', entry }),
    onTranscriptPending: (buffers) => dispatch({ type: 'TRANSCRIPT_PENDING', buffers }),
    onAudioPlaybackChange: (isSpeaking) => dispatch({ type: 'AI_SPEAKING_CHANGED', isSpeaking }),
    onMediaStream,
  }
);

// Execute commands from reducer
useEffect(() => {
  reducerState.commands.forEach(cmd => {
    switch (cmd.type) {
      case 'START_CONNECTION':
        driver.connect();
        break;
      case 'CLOSE_CONNECTION':
        driver.disconnect();
        break;
      case 'MUTE_MIC':
        driver.mute();
        break;
      case 'UNMUTE_MIC':
        driver.unmute();
        break;
      // Add other commands as needed
    }
  });
}, [reducerState.commands, driver]);

// Get state from reducer
const { connectionState, transcript, elapsedTime, error, isAiSpeaking } = reducerState;

// Call connect on mount
useEffect(() => {
  driver.connect();
}, [driver]);
```

---

#### Step 5.2: Update State References

**Find all references to `state` (from hook) and update:**

```typescript
// Line 154-160 (Loading state)
// Current: if (isLoading) ...
// Keep as-is (interview query loading)

// Line 163 (Connecting state)
// Current: if (state === "initializing" || state === "connecting")
// Update to: if (connectionState === "initializing" || connectionState === "connecting")

// Line 194 (Error state)
// Current: if (state === "error")
// Update to: if (connectionState === "error")

// Line 214 onwards (Live interview state)
// Current: renders based on hook state
// Update to: use reducerState.connectionState
```

---

#### Step 5.3: Update endInterview References

**Lines 309-311:**

```typescript
// Current
<button onClick={endInterview} disabled={state === "ending"}>
  {state === "ending" ? t("ending") : t("endInterview")}
</button>

// Update to
<button onClick={() => driver.disconnect()} disabled={connectionState === "ending"}>
  {connectionState === "ending" ? t("ending") : t("endInterview")}
</button>
```

---

## Phase 6: Testing (3 hours)

### Test Plan

#### Unit Tests

**1. Test Reducer (Pure Function)**

Create: `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { sessionReducer } from './reducer';

describe('sessionReducer', () => {
  it('handles TRANSCRIPT_COMMIT event', () => {
    const state: SessionState = {
      status: "ANSWERING",
      transcript: [],
      // ... other fields
    };

    const result = sessionReducer(state, {
      type: 'TRANSCRIPT_COMMIT',
      entry: { text: 'Hello', speaker: 'USER', is_final: true }
    }, mockContext);

    expect(result.state.transcript).toHaveLength(1);
    expect(result.state.transcript[0].text).toBe('Hello');
  });

  it('generates MUTE_MIC command on ANSWER_TIMEOUT', () => {
    const state: SessionState = {
      status: "ANSWERING",
      answerStartTime: Date.now() - 121000, // Over time limit
      // ... other fields
    };

    const result = sessionReducer(state, { type: 'TICK' }, {
      answerTimeLimit: 120,
      blockDuration: 600,
      totalBlocks: 2,
    });

    expect(result.state.status).toBe('ANSWER_TIMEOUT_PAUSE');
    expect(result.commands).toContainEqual({ type: 'MUTE_MIC' });
  });

  // Add 20+ more tests for all state transitions
});
```

**2. Test Driver Methods**

Create: `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInterviewSocket } from './useInterviewSocket';

describe('useInterviewSocket', () => {
  it('fires onConnectionOpen when WebSocket opens', async () => {
    const mockEvents = {
      onConnectionOpen: vi.fn(),
      onConnectionClose: vi.fn(),
      onConnectionError: vi.fn(),
      onTranscriptCommit: vi.fn(),
      onTranscriptPending: vi.fn(),
      onAudioPlaybackChange: vi.fn(),
    };

    const { result } = renderHook(() =>
      useInterviewSocket('interview-id', undefined, 1, mockEvents)
    );

    result.current.connect();

    // Mock WebSocket connection
    await waitFor(() => {
      expect(mockEvents.onConnectionOpen).toHaveBeenCalled();
    });
  });

  it('mute() calls audioSession.muteInput()', () => {
    const mockEvents = { /* ... */ };
    const { result } = renderHook(() =>
      useInterviewSocket('interview-id', undefined, 1, mockEvents)
    );

    result.current.mute();

    // Verify audio session was muted (may need to mock AudioSession)
  });
});
```

---

#### Integration Tests

**3. Test Command Execution Flow**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BlockSession } from './BlockSession';

describe('BlockSession command execution', () => {
  it('executes MUTE_MIC command from reducer', async () => {
    render(<BlockSession {...mockProps} />);

    // Trigger state transition that generates MUTE_MIC command
    // Verify driver.mute() was called
  });
});
```

---

#### E2E Tests

**4. Full Interview Flow**

```typescript
describe('Interview session E2E', () => {
  it('completes full interview flow', async () => {
    // 1. Load interview page
    // 2. Connect WebSocket
    // 3. Receive transcript updates
    // 4. Complete answer timeout
    // 5. Verify mic muted
    // 6. Resume answering
    // 7. Complete block
    // 8. Navigate to next block
    // 9. End interview
  });
});
```

---

### Manual QA Checklist

- [ ] Interview loads and connects to WebSocket
- [ ] Transcript displays correctly (committed + pending)
- [ ] AI speaking indicator updates
- [ ] Timer counts up correctly
- [ ] Answer timeout mutes microphone
- [ ] Microphone unmutes after 3 seconds
- [ ] Block timer works correctly
- [ ] Block completion screen shows
- [ ] Next block loads correctly
- [ ] End interview navigates to feedback
- [ ] Error states display correctly
- [ ] No console errors
- [ ] No memory leaks (check Chrome DevTools)

---

## Verification Checklist

### Phase 1: Types ✅
- [ ] TranscriptEntry moved to types.ts
- [ ] Command type added with blockNumber parameter
- [ ] ReducerResult interface added
- [ ] DriverEvents interface added
- [ ] SessionEvent expanded with new events
- [ ] SessionState expanded with CommonStateFields using intersection types
- [ ] No TypeScript errors in types.ts

### Phase 2: Reducer ✅
- [ ] Function signature returns ReducerResult
- [ ] All return statements updated to { state, commands }
- [ ] All existing states include common fields
- [ ] New event handlers added (TRANSCRIPT_COMMIT, etc.)
- [ ] Commands generated on state transitions
- [ ] No TypeScript errors in reducer.ts
- [ ] Existing tests still pass

### Phase 3: Hook ✅
- [ ] All 8 useState declarations deleted
- [ ] All 4 useEffect declarations removed/refactored
- [ ] Function signature updated to positional params + events
- [ ] TranscriptManager fires events instead of setState
- [ ] generateToken fires events on error
- [ ] Timer functions deleted
- [ ] setupAudio extracted and fires events
- [ ] connectWebSocket fires events on all handlers
- [ ] endInterview function deleted
- [ ] connect() method created
- [ ] Return object updated to methods only
- [ ] Cleanup effect added
- [ ] No useState anywhere in file
- [ ] No TypeScript errors in useInterviewSocket.ts

### Phase 4: BlockSession ✅
- [ ] Timer management added (TIMER_TICK)
- [ ] Reducer state verified
- [ ] No TypeScript errors in BlockSession.tsx

### Phase 5: SessionContent ✅
- [ ] Reducer initialized
- [ ] Driver initialized with event callbacks
- [ ] Command execution useEffect added
- [ ] connect() called on mount
- [ ] State references updated (connectionState, etc.)
- [ ] endInterview references updated to driver.disconnect()
- [ ] No TypeScript errors in SessionContent.tsx

### Phase 6: Testing ✅
- [ ] Reducer unit tests written and passing
- [ ] Driver unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E test written and passing
- [ ] Manual QA completed
- [ ] No regressions in existing functionality

---

## Common Issues & Solutions

### Issue 1: "Property 'blockIndex' does not exist"

**Cause:** Discriminated union not properly narrowed

**Solution:** Use type guard
```typescript
if (state.status === "ANSWERING") {
  // TypeScript now knows blockIndex exists
  console.log(state.blockIndex);
}
```

---

### Issue 2: "Cannot read property 'muteInput' of null"

**Cause:** audioSessionRef not initialized yet

**Solution:** Use optional chaining
```typescript
audioSessionRef.current?.muteInput();
```

---

### Issue 3: Commands not executing

**Cause:** Missing useEffect dependency or command not in switch

**Solution:** Check useEffect deps and add missing command cases
```typescript
useEffect(() => {
  state.commands.forEach(cmd => {
    switch (cmd.type) {
      case 'MUTE_MIC':
        driver.mute();
        break;
      // Add all command types
    }
  });
}, [state.commands, driver]); // ← Ensure deps are correct
```

---

### Issue 4: Infinite re-render loop

**Cause:** Commands array reference changes every render

**Solution:** Use useMemo or ensure commands only change when needed
```typescript
// In reducer, only return new commands array if actually changed
if (shouldGenerateCommand) {
  return { state, commands: [{ type: 'MUTE_MIC' }] };
} else {
  return { state, commands: [] }; // Empty array is fine
}
```

---

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1: Types | 1 hour | | |
| Phase 2: Reducer | 2 hours | | |
| Phase 3: Hook | 4 hours | | |
| Phase 4: BlockSession | 3 hours | | |
| Phase 5: SessionContent | 1 hour | | |
| Phase 6: Testing | 3 hours | | |
| **Total** | **14 hours** | | |

---

## Success Criteria

✅ **All verifications passed**
✅ **No TypeScript errors**
✅ **All existing tests pass**
✅ **New tests written and passing**
✅ **Manual QA completed**
✅ **Code review approved**
✅ **No console errors in browser**
✅ **Interview flow works end-to-end**

---

## Handoff Complete

This specification is ready for implementation by an outside developer. All details, line numbers, and code examples are provided.

**Questions?** Refer to:
- [FEAT27c_v5.1_alignment_report.md](./FEAT27c_v5.1_alignment_report.md) - Detailed verification
- [FEAT27c_discriminated_union_analysis.md](./FEAT27c_discriminated_union_analysis.md) - Architecture rationale
- Current codebase - All line numbers verified

**Ready to implement!** 🚀
