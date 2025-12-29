# FEAT27d Implementation: Fix Split Brain State

## ✅ STATUS: COMPLETE (2024-12-29)

**Goal:** Fix timer synchronization and state consistency bugs by centralizing state management.

**Root Cause:** Two reducer instances (BlockSession.tsx:76 and SessionContent.tsx:130) create independent state machines that don't communicate.

**Solution:** Single reducer instance in custom hook, shared by all components.

---

## Implementation Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Fix Reducer Guards | ✅ Complete | Guards at lines 107-109, 136-139, 171-174 |
| Phase 2: Create useInterviewSession Hook | ✅ Complete | `hooks/useInterviewSession.ts` |
| Phase 3: Update page.tsx to Use Hook | ✅ Complete | `BlockInterviewWithState`, `StandardInterviewWithState` |
| Phase 4: Convert Components to Controlled | ✅ Complete | Both components accept `state`/`dispatch` props |

### Implementation Notes

**SessionContent.tsx** is now a pure controlled component:
- Receives `state` and `dispatch` from parent (via `useInterviewSession` hook)
- Removed legacy props: `onSessionEnded`, `disableStatusRedirect`, `blockNumber`, `onMediaStream`
- Navigation to feedback handled by `useInterviewSession` hook
- Only retained prop: `onConnectionReady` (used by BlockSession to trigger CONNECTION_READY event)

**Verification:**
```bash
pnpm check  # Passes with only 1 unrelated warning
```

---

## Original Spec (4 Phases)

### Phase 1: Fix Reducer Guards (10 min)
### Phase 2: Create useInterviewSession Hook (40 min)
### Phase 3: Update page.tsx to Use Hook (20 min)
### Phase 4: Convert Components to Controlled (20 min)

---

## Phase 1: Fix Reducer Guards

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/reducer.ts`

### Change 1.1: CONNECTION_ERROR Should End Interview

**Location:** Line 70-78

**Replace:**
```typescript
case "CONNECTION_ERROR":
  return {
    state: {
      ...state,
      connectionState: "error",
      error: event.error,
    },
    commands: [],
  };
```

**With:**
```typescript
case "CONNECTION_ERROR":
  return {
    state: {
      ...state,
      connectionState: "error",
      error: event.error,
      status: "INTERVIEW_COMPLETE",
    },
    commands: [{ type: "STOP_AUDIO" }],
  };
```

### Change 1.2: Guard TIMER_TICK from Running When Complete

**Location:** Line 105-109

**Replace:**
```typescript
case "TIMER_TICK":
  return {
    state: { ...state, elapsedTime: state.elapsedTime + 1 },
    commands: [],
  };
```

**With:**
```typescript
case "TIMER_TICK":
  if (state.status === "INTERVIEW_COMPLETE") {
    return { state, commands: [] };
  }
  return {
    state: { ...state, elapsedTime: state.elapsedTime + 1 },
    commands: [],
  };
```

### Change 1.3: Guard TICK in ANSWERING State

**Location:** Line 132 (start of TICK handler in ANSWERING case)

**Add this at the beginning of the TICK handler:**
```typescript
case "ANSWERING":
  if (event.type === "TICK") {
    if (state.status === "INTERVIEW_COMPLETE") {
      return { state, commands: [] };
    }

    // Existing logic continues...
    if (isTimeUp(state.blockStartTime, context.blockDuration, now)) {
```

### Change 1.4: Guard TICK in ANSWER_TIMEOUT_PAUSE State

**Location:** Line 163 (start of TICK handler in ANSWER_TIMEOUT_PAUSE case)

**Add this at the beginning of the TICK handler:**
```typescript
case "ANSWER_TIMEOUT_PAUSE":
  if (event.type === "TICK") {
    if (state.status === "INTERVIEW_COMPLETE") {
      return { state, commands: [] };
    }

    // Existing logic continues...
    const elapsed = now - state.pauseStartedAt;
```

**Test Phase 1:**
```bash
pnpm test reducer.test.ts
```

---

## Phase 2: Create useInterviewSession Hook

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/hooks/useInterviewSession.ts` (NEW FILE)

```typescript
import { useReducer, useEffect, useCallback, useRef } from "react";
import { useRouter } from "~/i18n/navigation";
import { useInterviewSocket } from "../useInterviewSocket";
import { sessionReducer } from "../reducer";
import { TIMER_CONFIG } from "../constants";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  Command,
} from "../types";

interface UseInterviewSessionConfig {
  blockNumber?: number;
  context?: ReducerContext;
  onMediaStream?: (stream: MediaStream) => void;
}

const defaultContext: ReducerContext = {
  answerTimeLimit: 120,
  blockDuration: 600,
  totalBlocks: 1,
};

export function useInterviewSession(
  interviewId: string,
  token?: string,
  config?: UseInterviewSessionConfig,
) {
  const router = useRouter();
  const context = config?.context ?? defaultContext;

  // Capture commands from reducer
  const pendingCommandsRef = useRef<Command[]>([]);

  // Single reducer instance
  const [state, dispatch] = useReducer(
    (state: SessionState, event: SessionEvent) => {
      const result = sessionReducer(state, event, context);
      pendingCommandsRef.current = result.commands;
      return result.state;
    },
    {
      status: "WAITING_FOR_CONNECTION",
      connectionState: "initializing",
      transcript: [],
      pendingUser: "",
      pendingAI: "",
      elapsedTime: 0,
      error: null,
      isAiSpeaking: false,
    },
  );

  // Driver initialization
  const driver = useInterviewSocket(
    interviewId,
    token,
    config?.blockNumber,
    {
      onConnectionOpen: useCallback(() => {
        dispatch({ type: "CONNECTION_ESTABLISHED" });
      }, []),
      onConnectionClose: useCallback((code: number) => {
        dispatch({ type: "CONNECTION_CLOSED", code });
      }, []),
      onConnectionError: useCallback((error: string) => {
        dispatch({ type: "CONNECTION_ERROR", error });
      }, []),
      onTranscriptCommit: useCallback((entry) => {
        dispatch({ type: "TRANSCRIPT_COMMIT", entry });
      }, []),
      onTranscriptPending: useCallback((buffers) => {
        dispatch({ type: "TRANSCRIPT_PENDING", buffers });
      }, []),
      onAudioPlaybackChange: useCallback((isSpeaking: boolean) => {
        dispatch({ type: "AI_SPEAKING_CHANGED", isSpeaking });
      }, []),
      onMediaStream: config?.onMediaStream,
    },
  );

  // Command executor
  const executeCommand = useCallback(
    (cmd: Command) => {
      switch (cmd.type) {
        case "START_CONNECTION":
          driver.connect();
          break;
        case "CLOSE_CONNECTION":
          driver.disconnect();
          break;
        case "MUTE_MIC":
          driver.mute();
          break;
        case "UNMUTE_MIC":
          driver.unmute();
          break;
        case "STOP_AUDIO":
          driver.stopAudio();
          break;
      }
    },
    [driver],
  );

  // Execute commands after state updates
  useEffect(() => {
    const commands = pendingCommandsRef.current;
    pendingCommandsRef.current = [];

    if (commands.length > 0) {
      console.log("[useInterviewSession] Executing commands:", commands);
      commands.forEach(executeCommand);
    }
  }, [state, executeCommand]);

  // Timer intervals
  useEffect(() => {
    const tickInterval = setInterval(() => {
      dispatch({ type: "TICK" });
    }, TIMER_CONFIG.TICK_INTERVAL_MS);

    const timerInterval = setInterval(() => {
      dispatch({ type: "TIMER_TICK" });
    }, 1000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(timerInterval);
    };
  }, []);

  // Navigate to feedback when interview completes
  useEffect(() => {
    if (state.status === "INTERVIEW_COMPLETE") {
      const feedbackUrl = token
        ? `/interview/${interviewId}/feedback?token=${token}`
        : `/interview/${interviewId}/feedback`;
      router.push(feedbackUrl);
    }
  }, [state.status, interviewId, token, router]);

  return { state, dispatch, driver };
}
```

**Create directory:**
```bash
mkdir -p src/app/[locale]/\(interview\)/interview/[interviewId]/session/hooks
```

---

## Phase 3: Update page.tsx to Use Hook

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/page.tsx`

### Change 3.1: Add Imports

**Location:** After line 13

```typescript
import { useRef } from "react";
import { useInterviewSession } from "./hooks/useInterviewSession";
import type { ReducerContext } from "./types";
```

### Change 3.2: Replace Rendering Logic

**Location:** Replace lines 57-95

```typescript
// Loading state
if (isLoading || interview?.status === "COMPLETED") {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-lg">{tCommon("loading")}</div>
    </div>
  );
}

// Interview not found
if (!interview) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center text-red-600">
        <h1 className="text-xl font-bold">Interview Not Found</h1>
      </div>
    </div>
  );
}

// Block-based interview
if (interview.isBlockBased && interview.templateId) {
  const template = getTemplate(interview.templateId);

  if (!template) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-600">
          <h1 className="text-xl font-bold">Template Not Found</h1>
          <p className="mt-2">Template ID: {interview.templateId}</p>
        </div>
      </div>
    );
  }

  if (!interview.blocks || interview.blocks.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-600">
          <h1 className="text-xl font-bold">No Blocks Found</h1>
          <p className="mt-2">This interview has no blocks configured.</p>
        </div>
      </div>
    );
  }

  return (
    <BlockInterviewWithState
      interview={interview}
      blocks={interview.blocks}
      template={template}
      token={token}
    />
  );
}

// Standard interview
return <StandardInterviewWithState interview={interview} token={token} />;
```

### Change 3.3: Add BlockInterviewWithState Component

**Location:** Before the main SessionPage component (around line 15)

```typescript
// Block-based interview with state management
function BlockInterviewWithState({
  interview,
  blocks,
  template,
  token,
}: {
  interview: any;
  blocks: any[];
  template: any;
  token?: string;
}) {
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Find first incomplete block
  const initialBlockIndex = blocks.findIndex((b) => b.status !== "COMPLETED");
  const startBlockIndex = initialBlockIndex === -1 ? 0 : initialBlockIndex;

  // Calculate context for current block
  const getContext = (blockIndex: number): ReducerContext => {
    const currentTemplateBlock = template.blocks[blockIndex];
    return {
      answerTimeLimit: template.answerTimeLimitSec,
      blockDuration: currentTemplateBlock?.durationSec ?? 600,
      totalBlocks: blocks.length,
    };
  };

  const { state, dispatch } = useInterviewSession(interview.id, token, {
    blockNumber: blocks[startBlockIndex]?.blockNumber ?? 1,
    context: getContext(startBlockIndex),
    onMediaStream: (stream) => {
      mediaStreamRef.current = stream;
    },
  });

  // Stop media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  return (
    <BlockSession
      interview={interview}
      blocks={blocks}
      template={template}
      guestToken={token}
      state={state}
      dispatch={dispatch}
      mediaStreamRef={mediaStreamRef}
    />
  );
}
```

### Change 3.4: Add StandardInterviewWithState Component

**Location:** Before the main SessionPage component (after BlockInterviewWithState)

```typescript
// Standard interview with state management
function StandardInterviewWithState({
  interview,
  token,
}: {
  interview: any;
  token?: string;
}) {
  const { state, dispatch } = useInterviewSession(interview.id, token);

  return (
    <SessionContent
      interviewId={interview.id}
      guestToken={token}
      state={state}
      dispatch={dispatch}
    />
  );
}
```

**Note:** Add missing import for useEffect:
```typescript
import React, { useEffect, useRef } from "react";
```

---

## Phase 4: Convert Components to Controlled

### Phase 4.1: Update BlockSession.tsx

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/BlockSession.tsx`

#### Step 1: Update Imports

**Location:** Line 3

**Replace:**
```typescript
import { useReducer, useEffect, useRef, useCallback, useState } from "react";
```

**With:**
```typescript
import { useEffect, useRef, useCallback } from "react";
```

#### Step 2: Add Props Interface

**Location:** Before line 15

```typescript
interface BlockSessionProps {
  interview: any;
  blocks: any[];
  template: any;
  guestToken?: string;
  state: SessionState;
  dispatch: React.Dispatch<SessionEvent>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
}
```

#### Step 3: Update Function Signature

**Location:** Line 15

**Replace:**
```typescript
export function BlockSession({
  interview,
  blocks,
  template,
  guestToken,
}: BlockSessionProps) {
```

**With:**
```typescript
export function BlockSession({
  interview,
  blocks,
  template,
  guestToken,
  state,
  dispatch,
  mediaStreamRef,
}: BlockSessionProps) {
```

#### Step 4: Delete Local State Management

**Location:** Lines 31-106

**DELETE:**
- Lines 35-74: reducer wrapper function
- Lines 76-85: useReducer call
- Lines 87-89: tick state
- Lines 92-98: TICK interval useEffect
- Lines 101-106: TIMER_TICK interval useEffect

**KEEP:**
- Lines 25-28: initialBlockIndex and startBlockIndex calculation
- Line 29: answerTimeLimit

**DELETE:**
- Line 31: mediaStreamRef (now comes from props)

#### Step 5: Update handleConnectionReady

**Location:** Lines 109-114

**Replace:**
```typescript
const handleConnectionReady = useCallback(() => {
  dispatch({
    type: "CONNECTION_READY",
    initialBlockIndex: startBlockIndex,
  });
}, [startBlockIndex]);
```

**With:**
```typescript
const handleConnectionReady = useCallback(() => {
  dispatch({
    type: "CONNECTION_READY",
    initialBlockIndex: startBlockIndex,
  });
}, [startBlockIndex, dispatch]);
```

#### Step 6: Delete Navigation Effect

**Location:** Lines 146-163

**DELETE** the entire useEffect that handles navigation to feedback (parent handles this now).

#### Step 7: Update SessionContent Renders

**Location:** Lines ~187-204 and ~331-347

**First render (WAITING_FOR_CONNECTION):**
```typescript
<SessionContent
  key="waiting-for-connection"
  interviewId={interview.id}
  guestToken={guestToken}
  state={state}
  dispatch={dispatch}
  onConnectionReady={handleConnectionReady}
/>
```

**Second render (ANSWERING/PAUSE):**
```typescript
<SessionContent
  key={`block-${blockIdx}`}
  interviewId={interview.id}
  guestToken={guestToken}
  state={state}
  dispatch={dispatch}
  onConnectionReady={handleConnectionReady}
/>
```

---

### Phase 4.2: Update SessionContent.tsx

**File:** `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent.tsx`

#### Step 1: Update Props Interface

**Location:** Lines 27-36

**Replace:**
```typescript
interface SessionContentProps {
  interviewId: string;
  guestToken?: string;
  // Block mode overrides
  onSessionEnded?: () => void;
  disableStatusRedirect?: boolean;
  onMediaStream?: (stream: MediaStream) => void;
  blockNumber?: number;
  onConnectionReady?: () => void;
}
```

**With:**
```typescript
interface SessionContentProps {
  interviewId: string;
  guestToken?: string;
  state: SessionState;
  dispatch: React.Dispatch<SessionEvent>;
  onConnectionReady?: () => void;
}
```

#### Step 2: Update Function Signature

**Location:** Lines 38-46

**Replace:**
```typescript
export function SessionContent({
  interviewId,
  guestToken,
  onSessionEnded,
  disableStatusRedirect,
  onMediaStream,
  blockNumber,
  onConnectionReady,
}: SessionContentProps) {
```

**With:**
```typescript
export function SessionContent({
  interviewId,
  guestToken,
  state,
  dispatch,
  onConnectionReady,
}: SessionContentProps) {
```

#### Step 3: Delete Local Reducer

**Location:** Lines 116-149

**DELETE:**
- Lines 118-125: defaultContext
- Lines 128-149: useReducer with command capture

#### Step 4: Delete Driver Initialization

**Location:** Lines 152-184

**DELETE** the entire `useInterviewSocket` call and driver variable.

#### Step 5: Delete Command Executor

**Location:** Lines 186-216

**DELETE** the entire useEffect that executes commands.

#### Step 6: Delete Auto-Connect

**Location:** Lines 219-221

**DELETE** the useEffect that calls `driver.connect()`.

#### Step 7: Update State Destructuring

**Location:** Line 224

**Replace:**
```typescript
const { connectionState, transcript, elapsedTime, error, isAiSpeaking } =
  reducerState;
```

**With:**
```typescript
const { connectionState, transcript, elapsedTime, error, isAiSpeaking } = state;
```

#### Step 8: Update Navigation Effect

**Location:** Lines 98-114

**Replace:**
```typescript
useEffect(() => {
  if (!isLoading && interview && !disableStatusRedirect) {
    if (interview.status === "COMPLETED") {
      const feedbackUrl = guestToken
        ? `/interview/${interviewId}/feedback?token=${guestToken}`
        : `/interview/${interviewId}/feedback`;
      router.push(feedbackUrl);
    }
  }
}, [
  interview,
  isLoading,
  router,
  interviewId,
  guestToken,
  disableStatusRedirect,
]);
```

**With:**
```typescript
useEffect(() => {
  if (!isLoading && interview && interview.status === "COMPLETED") {
    const feedbackUrl = guestToken
      ? `/interview/${interviewId}/feedback?token=${guestToken}`
      : `/interview/${interviewId}/feedback`;
    router.push(feedbackUrl);
  }
}, [interview, isLoading, router, interviewId, guestToken]);
```

#### Step 9: Remove Debug Info References

**Location:** Lines 320-333

**Replace:**
```typescript
<div className="flex items-center gap-4">
  {IS_DEV && driver.debugInfo && (
    <div className="text-xs text-gray-600">
      WS: {driver.debugInfo.connectAttempts} attempts |{" "}
      <span
        className={
          driver.debugInfo.activeConnections > 1
            ? "font-bold text-red-600"
            : "text-green-600"
        }
      >
        {driver.debugInfo.activeConnections} active
      </span>
    </div>
  )}
  <StatusIndicator status={isAiSpeaking ? "speaking" : "listening"} />
  <div className="font-mono text-lg">{formatTime(elapsedTime)}</div>
</div>
```

**With:**
```typescript
<div className="flex items-center gap-4">
  <StatusIndicator status={isAiSpeaking ? "speaking" : "listening"} />
  <div className="font-mono text-lg">{formatTime(elapsedTime)}</div>
</div>
```

---

## Testing

### Unit Tests
```bash
pnpm test reducer.test.ts
pnpm test goldenPath.test.ts
```

### Type Check
```bash
pnpm typecheck
```

### Manual Testing

**Standard Interview:**
1. Start interview → verify connection
2. Check timer counts up
3. Verify transcript appears
4. Click "End Interview" → verify immediate mic shutoff
5. Verify navigation to feedback

**Block Interview:**
1. Verify timer overlays show
2. Check block timer and answer timer count correctly
3. Test answer timeout → mic mutes for 3 seconds
4. Complete block → verify transition screen
5. Continue to next block
6. End interview → verify everything stops immediately

**Connection Error:**
1. Disconnect network during interview
2. Verify timer stops immediately
3. Verify status shows "INTERVIEW_COMPLETE"
4. Verify navigation to feedback

---

## Summary

**Files Modified:** 4
**Files Created:** 1

| File | Before | After | Change |
|------|--------|-------|--------|
| reducer.ts | 211 lines | 220 lines | +9 lines |
| useInterviewSession.ts | 0 lines | 150 lines | +150 lines (new) |
| page.tsx | 97 lines | 160 lines | +63 lines |
| BlockSession.tsx | 364 lines | 280 lines | -84 lines |
| SessionContent.tsx | 416 lines | 320 lines | -96 lines |

**Net Impact:** +42 lines

**Architecture:**
- ✅ Single reducer instance per interview session
- ✅ State management centralized in custom hook
- ✅ Components are purely controlled (props in, JSX out)
- ✅ Clear separation: hook handles state, components handle UI
