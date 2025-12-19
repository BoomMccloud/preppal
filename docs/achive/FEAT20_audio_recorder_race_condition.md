# FEAT20: Fix Audio Recorder Race Condition

## Problem
A race condition exists in `src/lib/audio/AudioRecorder.ts` that causes the microphone to remain active even after the component is unmounted or the session is ended.

### Scenario
1. The user enters an interview session, triggering `AudioRecorder.start()`.
2. `start()` calls `navigator.mediaDevices.getUserMedia()` and awaits the user's permission.
3. **Trigger:** The user immediately navigates away (e.g., clicks "Back" or "Dashboard") *before* granting permission or *while* the stream is initializing.
4. The cleanup function (e.g., in `useEffect`) calls `AudioRecorder.stop()`.
5. `stop()` checks `this.stream`. Since `getUserMedia` hasn't resolved yet, `this.stream` is `null`. `stop()` effectively does nothing.
6. `getUserMedia` resolves with a media stream.
7. `start()` resumes execution, assigns `this.stream`, creates a new `AudioContext`, and starts processing audio.
8. **Result:** The microphone remains active (recording indicator stays on), and resources are leaked, as the `stop()` call was "missed".

### Why the Current Flag-Based Solution Is Incomplete
The current implementation uses an `isStopped` flag, but this approach is fragile:
- Requires checking the flag after **every** `await` statement
- Easy to forget when adding new async operations
- The second `await` (for `audioWorklet.addModule`) is not currently guarded

## Proposed Solution: AbortSignal
Use the web platform's standard `AbortSignal` API for cancellable async operations. This inverts control - the **caller** decides when to cancel, and the `AudioRecorder` simply reacts to the signal.

### Why AbortSignal Is Better
| Aspect | Flag Approach | AbortSignal |
|--------|---------------|-------------|
| Check after each await | Manual, error-prone | Standard pattern |
| Cleanup | Scattered | Centralized in catch block |
| Caller control | None | Full control |
| Web standard | No | Yes |
| Composable | No | Can combine multiple signals |

### Integration with Interview Duration

The **worker is the authoritative source** for the interview timeout. It already has a timer in `worker/src/gemini-session.ts` (lines 190-204) that:
1. Fires after `durationMs`
2. Sends `SessionEnded` message with `TIMEOUT` reason
3. Closes the WebSocket
4. **Submits the transcript** via `lifecycleManager.finalizeSession()` (same as user-initiated end)

**Note:** The worker's `handleTimeoutEnd()` and `handleEndRequest()` (user clicks "End Interview") both call `finalizeSession()` to save the transcript. No changes needed on the worker side.

The client should **react** to the worker's signal, not run its own parallel timer. This avoids clock drift and ensures the worker (which manages the Gemini connection) is in control.

```
┌─────────────────────────────────────────────────────────────┐
│                        WORKER                               │
│   setTimeout(durationMs) → SessionEnded(TIMEOUT) → close   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket message
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│   onMessage(SessionEnded) → abortController.abort()         │
│                                ↓                            │
│                      AudioRecorder stops                    │
└─────────────────────────────────────────────────────────────┘
```

The client's AbortSignal combines:
```
AbortSignal.any([
  userAbortController.signal,               // User ends / navigates / worker signals timeout
  AbortSignal.timeout(durationMs + 60000)   // Safety fallback (1 min grace period)
])
```

**One mechanism handles all cancellation scenarios:**
- User clicks "End Interview" → client calls `abort()`
- Worker timeout expires → client receives `SessionEnded`, calls `abort()`
- User navigates away → useEffect cleanup calls `abort()`
- Component unmounts → useEffect cleanup calls `abort()`
- WebSocket error/close → error handler calls `abort()`
- Client safety timeout → AbortSignal.timeout fires (fallback only, should never happen)

## Implementation Details

### 1. Update `AudioRecorder.ts`

```typescript
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  async start(onAudioData: (chunk: ArrayBuffer) => void, signal: AbortSignal) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      signal.throwIfAborted();

      this.stream = stream;
      this.audioContext = new AudioContext();
      await this.audioContext.audioWorklet.addModule("/audio-processor.js");
      signal.throwIfAborted();

      // ... rest of setup (worklet node, connections)

    } catch (error) {
      this.cleanup();
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("AudioRecorder: Aborted during initialization");
        return;
      }
      throw error;
    }
  }

  private cleanup() {
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.audioContext?.close();
    this.audioContext = null;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }
}
```

**Key changes:**
- Remove `isStopped` flag and `stop()` method
- Add required `signal: AbortSignal` parameter to `start()`
- Use `signal.throwIfAborted()` after each await
- Centralize cleanup in a private `cleanup()` method
- Handle `AbortError` gracefully in catch block

### 2. Add Duration Constants

Create `src/lib/constants/interview.ts`:

```typescript
export const INTERVIEW_DURATION_MS = {
  SHORT: 10 * 60 * 1000,    // 10 minutes
  STANDARD: 30 * 60 * 1000, // 30 minutes
  EXTENDED: 60 * 60 * 1000, // 60 minutes
} as const;

export type InterviewDuration = keyof typeof INTERVIEW_DURATION_MS;
```

### 3. Update `useInterviewSocket.ts`

```typescript
import { INTERVIEW_DURATION_MS } from "~/lib/constants/interview";

export function useInterviewSocket({
  interviewId,
  guestToken,
  duration,  // Add: "SHORT" | "STANDARD" | "EXTENDED"
  onSessionEnded,
}: UseInterviewSocketProps): UseInterviewSocketReturn {

  const abortControllerRef = useRef<AbortController | null>(null);

  // Audio setup effect
  useEffect(() => {
    const setupAudio = async () => {
      if (state === "live") {
        abortControllerRef.current = new AbortController();

        // Safety timeout: slightly longer than worker's timeout as fallback
        const durationMs = INTERVIEW_DURATION_MS[duration];
        const signal = AbortSignal.any([
          abortControllerRef.current.signal,
          AbortSignal.timeout(durationMs + 60000), // 1 min grace period
        ]);

        const audioRecorder = new AudioRecorder();
        await audioRecorder.start(handleAudioChunk, signal);
      }
    };

    void setupAudio();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [state, duration]);

  // WebSocket message handler - react to worker's SessionEnded
  ws.onmessage = async (event: MessageEvent) => {
    // ... existing message handling ...

    if (message.sessionEnded) {
      // Worker signaled session end (timeout, user-initiated, or gemini-ended)
      // Trigger abort to clean up AudioRecorder
      abortControllerRef.current?.abort();
      setState("ending");
      onSessionEnded();
    }

    if (message.error) {
      // Worker signaled an error - also trigger abort
      abortControllerRef.current?.abort();
      setError(message.error?.message ?? "Unknown error");
      setState("error");
    }
  };

  ws.onclose = () => {
    // WebSocket closed - ensure cleanup
    abortControllerRef.current?.abort();
    // ... existing close handling ...
  };

  ws.onerror = () => {
    // WebSocket error - ensure cleanup
    abortControllerRef.current?.abort();
    // ... existing error handling ...
  };

  const endInterview = () => {
    abortControllerRef.current?.abort();
    // ... send end request via WebSocket
  };
}
```

**Key integration points:**
- `sessionEnded` message from worker → calls `abort()`
- `error` message from worker → calls `abort()`
- WebSocket `close` event → calls `abort()`
- WebSocket `error` event → calls `abort()`
- User clicks "End Interview" → calls `abort()`
- useEffect cleanup (navigation/unmount) → calls `abort()`

### 4. Pass Duration to Session

Update `SessionContent.tsx` to fetch and pass the interview duration:

```typescript
const { data: interview } = api.interview.getById.useQuery({ id: interviewId });

const { state, transcript, ... } = useInterviewSocket({
  interviewId,
  guestToken,
  duration: interview.duration,  // Pass duration from DB
  onSessionEnded,
});
```

## Files to Modify
1. `src/lib/audio/AudioRecorder.ts` - Replace flag with AbortSignal
2. `src/lib/constants/interview.ts` - New file for duration constants
3. `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts` - Integrate AbortSignal
4. `src/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent.tsx` - Pass duration prop

## Impact
- **Race condition fixed:** All cancellation scenarios handled by one mechanism
- **Interview timer unified:** Duration setting from creation automatically enforced
- **Simpler code:** No manual flag checking, centralized cleanup
- **Future-proof:** Adding new async operations doesn't require remembering to check flags
