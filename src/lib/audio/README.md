# Audio Pipeline

Client-side audio processing for real-time interview sessions. Handles microphone capture, speaker playback, and transcript management using the Web Audio API.

## Quick Reference

| File                    | Lines | Purpose                                          |
| ----------------------- | ----- | ------------------------------------------------ |
| `AudioSession.ts`       | 119   | Unified controller for recorder + player         |
| `AudioRecorder.ts`      | 110   | Microphone capture with 16kHz resampling         |
| `AudioPlayer.ts`        | 149   | Audio playback with buffer scheduling            |
| `RawAudioClient.ts`     | 160   | WebSocket client with protobuf messaging         |
| `TranscriptManager.ts`  | 88    | Rolling buffer for real-time captions            |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUDIO PIPELINE                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ AudioSession (Unified Controller)                                    │   │
│  │                                                                       │   │
│  │   start(onAudioData) ──→ Initialize recorder + player               │   │
│  │   stop() ──→ Release all resources                                  │   │
│  │   enqueueAudio(pcm) ──→ Forward to player                           │   │
│  │   muteInput() / unmuteInput() ──→ Control recorder                  │   │
│  │                                                                       │   │
│  │   ┌─────────────────────┐     ┌─────────────────────┐              │   │
│  │   │   AudioRecorder     │     │    AudioPlayer      │              │   │
│  │   │                     │     │                     │              │   │
│  │   │  Microphone ──→     │     │     ──→ Speaker    │              │   │
│  │   │  16kHz PCM chunks   │     │  24kHz PCM input    │              │   │
│  │   └─────────────────────┘     └─────────────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Alternative: RawAudioClient (standalone WebSocket client for testing)      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Audio Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER → AI (Recording)                               │
│                                                                              │
│  Microphone ──→ MediaStream ──→ AudioWorklet ──→ 16kHz PCM ──→ Callback    │
│                                 (resampling)                                 │
│                                                                              │
│  AudioRecorder.start(onAudioData):                                          │
│    1. getUserMedia({ audio: true }) → Get microphone stream                 │
│    2. Create AudioContext                                                   │
│    3. Load audio-processor.js worklet                                       │
│    4. Connect: source → worklet → callback (not destination)               │
│    5. Worklet resamples native rate → 16kHz                                │
│    6. Callback receives ArrayBuffer chunks                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI → USER (Playback)                                │
│                                                                              │
│  24kHz PCM ──→ Int16 → Float32 ──→ AudioBuffer ──→ Scheduled Source ──→ 🔊 │
│                                                                              │
│  AudioPlayer.enqueue(pcmData):                                              │
│    1. Resume AudioContext if suspended                                      │
│    2. Handle leftover bytes (16-bit alignment)                              │
│    3. Convert Int16 PCM → Float32 (-1.0 to 1.0)                            │
│    4. Create AudioBuffer with sample data                                   │
│    5. Schedule playback at nextPlayTime                                     │
│    6. Update nextPlayTime += buffer.duration                                │
│    7. Track playing state via source.onended                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### AudioSession

Unified controller that manages `AudioRecorder` and `AudioPlayer` as a single unit.

```typescript
class AudioSession {
  // Lifecycle
  async start(onAudioData: (chunk: ArrayBuffer) => void): Promise<void>;
  stop(): void;

  // Playback
  enqueueAudio(pcmData: Uint8Array): void;
  clearPlaybackQueue(): void;

  // Microphone control
  muteInput(): void;
  unmuteInput(): void;
  isInputMuted(): boolean;

  // Callbacks
  onPlaybackStateChange: (isPlaying: boolean) => void;
}
```

**Usage in interview session:**
```typescript
const audioSession = new AudioSession();

// Start audio (prompts for mic permission)
await audioSession.start((chunk) => {
  // Send chunk to WebSocket
  socket.send(encodeAudioChunk(chunk));
});

// Play AI response
audioSession.enqueueAudio(aiAudioData);

// Mute during answer timeout
audioSession.muteInput();

// Cleanup
audioSession.stop();
```

### AudioRecorder

Captures microphone audio and resamples to 16kHz PCM.

```typescript
class AudioRecorder {
  async start(onAudioData: (chunk: ArrayBuffer) => void): Promise<void>;
  stop(): void;
  getStream(): MediaStream | null;
  mute(): void;
  unmute(): void;
  isMicMuted(): boolean;
}
```

**Key implementation details:**

- Uses `getUserMedia()` for microphone access
- Resamples via AudioWorklet (`/public/audio-processor.js`)
- Native sample rate (typically 44.1kHz or 48kHz) → 16kHz
- Doesn't connect to destination (user doesn't hear themselves)
- Mute/unmute by disabling MediaStream tracks (fast toggle)

### AudioPlayer

Plays back 24kHz PCM audio with smooth buffer scheduling.

```typescript
class AudioPlayer {
  constructor(sampleRate = 24000);

  async start(): Promise<void>;
  async resume(): Promise<void>;
  stop(): void;
  clear(): void;
  async enqueue(pcm16Data: Uint8Array): Promise<void>;

  onPlaybackStateChange: (isPlaying: boolean) => void;
}
```

**Key implementation details:**

- Creates AudioContext at specified sample rate (24kHz for Gemini)
- Handles byte alignment (16-bit PCM = 2 bytes per sample)
- Converts Int16 → Float32 for Web Audio API
- Schedules buffers at precise times to avoid gaps/overlaps
- Tracks active sources to detect when playback ends
- `clear()` stops all scheduled audio (for barge-in)

### RawAudioClient

Standalone WebSocket client for testing the audio pipeline directly.

```typescript
interface RawClientCallbacks {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onTranscriptUpdate?: (transcript: TranscriptUpdate) => void;
  onError?: (error: string) => void;
}

class RawAudioClient {
  constructor(callbacks: RawClientCallbacks);
  async connect(url: string): Promise<void>;
  disconnect(): void;
}
```

**Protocol handling:**
- Encodes audio chunks as protobuf `ClientToServerMessage`
- Decodes `ServerToClientMessage` for audio/transcript responses
- Used primarily for development testing (`/dev/audio-test`)

### TranscriptManager

Rolling buffer for real-time caption display.

```typescript
interface TranscriptManagerCallbacks {
  onSentence: (speaker: string, text: string) => void;
}

class TranscriptManager {
  constructor(callbacks: TranscriptManagerCallbacks, maxLength?: number);
  process(update: TranscriptUpdate): void;
  getBufferedText(speaker: string): string;
  clear(): void;
}
```

**Behavior:**
- Accumulates text per speaker (USER, AI)
- Emits when: turn completes OR buffer exceeds maxLength (default: 200)
- Closed-caption style: immediate feedback, no sentence detection

## Sample Rates

| Direction | Sample Rate | Format | Why |
|-----------|-------------|--------|-----|
| Recording | 16kHz | 16-bit PCM | Gemini Live API requirement |
| Playback | 24kHz | 16-bit PCM | Gemini Live API output format |

## Audio Worklet

The `audio-processor.js` worklet (in `/public/`) handles resampling:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUDIO WORKLET                                        │
│                                                                              │
│  Input: Native sample rate (44.1kHz / 48kHz)                                │
│                    │                                                         │
│                    ▼                                                         │
│  resampling-processor:                                                      │
│    - Receives Float32 audio frames                                          │
│    - Downsamples to 16kHz                                                   │
│    - Converts to Int16 PCM                                                  │
│    - Posts ArrayBuffer to main thread                                       │
│                    │                                                         │
│                    ▼                                                         │
│  Output: 16kHz PCM chunks (ArrayBuffer)                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Integration with Interview Session

The audio pipeline integrates with the session via `useInterviewSocket`:

```typescript
// In useInterviewSocket.ts
const audioSession = useRef<AudioSession | null>(null);

// Start audio when connecting
audioSession.current = new AudioSession();
await audioSession.current.start((chunk) => {
  // Encode and send via WebSocket
  const message = encodeAudioChunk(chunk);
  ws.send(message);
});

// Handle incoming audio
if (message.payload.case === "audioResponse") {
  audioSession.current?.enqueueAudio(message.payload.value.audioContent);
}

// Mute during answer timeout
audioSession.current?.muteInput();

// Clear queue on barge-in (user interrupts AI)
audioSession.current?.clearPlaybackQueue();
```

## Browser Compatibility

- **AudioContext**: All modern browsers
- **AudioWorklet**: Chrome 66+, Firefox 76+, Safari 14.1+
- **getUserMedia**: Requires HTTPS (or localhost)

## Error Handling

| Error | Cause | Handling |
|-------|-------|----------|
| NotAllowedError | Mic permission denied | Show permission request UI |
| NotFoundError | No microphone available | Show error message |
| AudioContext suspended | Auto-play policy | Call `resume()` on user interaction |

## Testing

```bash
# Unit tests
pnpm test

# Test files
# - AudioRecorder.test.ts
# - AudioPlayer.test.ts
# - useInterviewSocket.test.ts
```

## Related Documentation

- [Interview Session](../../app/[locale]/(interview)/interview/[interviewId]/session/README.md) - State machine that controls audio
- [Worker Architecture](../../../worker/README.md) - Server-side audio handling
- [Protocol Definitions](../../../proto/README.md) - Protobuf message formats
