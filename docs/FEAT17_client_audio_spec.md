# FEAT17: Real-Time Audio Streaming Specification

## Feature: Real-Time Audio Streaming in Interview Session

### Overview

This feature replaces the mock, pre-scripted text stream from the MVP with a true, real-time audio pipeline. The user will now use their microphone to speak with the AI, and the AI's responses will be streamed back as audio. This is the core of the interactive experience and involves significant work on both the client-side audio processing and the backend infrastructure.

---

## Strategy: From Mock to Reality

### Why This is the Next Step

The MVP successfully validated the entire application infrastructure, from authentication to the real-time WebSocket channel and database state management. The critical missing piece is the real-time interaction. This feature builds directly on the MVP's foundation, swapping out the mock components for a production-ready audio stream.

### Phased Approach

1.  **Phase 1 (This Feature):** Implement the full client-side audio capture and playback logic. The backend will be updated to receive the client's audio stream and echo it back for testing purposes. This allows us to perfect the audio pipeline without introducing the complexity of the AI API.
2.  **Phase 2 (Next Epic):** Integrate the backend with the real Gemini Live API. The backend will forward the client's audio stream to the API and stream the AI's audio response back to the client.

---

## API Specification

This feature continues to use the same tRPC and WebSocket APIs from the MVP, but with a focus on the previously unused `AudioChunk` message.

### 1. tRPC API

- **`interview.getCurrent`**: No changes. Still used to check session status on page load.
- **`interview.generateWsToken`**: No changes. Still used to generate the JWT for WebSocket authentication.

### 2. WebSocket API

- **Endpoint**: `ws://localhost:3001` (during development)
- **Protocol**: Adheres to `proto/interview.proto`.

#### Backend Requirements (WebSocket Server)

1.  **Handle Client Audio (`AudioChunk`)**:
    - The server must now be able to receive and process `ClientToServerMessage` payloads containing `AudioChunk`.
    - **For this feature's scope (Phase 1):** The server will implement an "echo" functionality. When it receives an `AudioChunk` from the client, it will immediately wrap it in a `ServerToClientMessage` and send it back to the same client. This is crucial for testing the entire audio pipeline round-trip.

2.  **Protobuf Integration**:
    - The server must use the `protobuf-js` library to decode incoming `ClientToServerMessage` messages and encode outgoing `ServerToClientMessage` messages. The MVP's JSON-based communication will be fully replaced.

---

## Frontend Specification

### Feature Scope & Clarifications

1.  **Microphone Permissions**: The app will now request microphone access as the first step in the connection process.
2.  **Audio Capture**: The client will capture raw audio, downsample it to 16kHz PCM, and send it in chunks.
3.  **Audio Playback**: The client will be able to receive audio chunks from the server and play them back seamlessly.
4.  **State Management**: The global `InterviewLifecycleState` will be expanded to include `requestingPermissions` and `permissionsDenied`.
5.  **No Reconnection Logic**: For this feature, connection failures will still result in a terminal error state.

### Page Details

- **Route**: `/interview/[interviewId]/session`
- **Component Type**: **Client Component** (`"use client"`).

### State Management

The `useInterviewSocket` hook will be updated to manage the new states.

- **New States**:
  - `requestingPermissions`: The browser's permission prompt is active.
  - `permissionsDenied`: The user has explicitly blocked the microphone permission request.
  - `noDeviceFound`: The user has granted permission, but no microphone hardware was detected.
- **Existing States**: `initializing`, `connecting`, `live`, `ending`, `error`.

---

## Implementation Guidance (For Junior Developers)

This section provides concrete code examples for the most complex parts of the feature.

### 1. Protobuf Usage

After generating the code with `pnpm proto:generate`, you will have `interview_pb.js` and `interview_pb.d.ts`. Here is how you use them.

**Client-Side: Encoding and Sending a Message**

```typescript
// In useInterviewSocket.ts
import { ClientToServerMessage, StartRequest, AudioConfig } from '@/lib/interview_pb';

// 1. Create the payload message
const startRequestPayload = StartRequest.create({
  interviewId: 'some-interview-id',
  authToken: 'some-jwt',
  audioConfig: AudioConfig.create({
    sampleRateHertz: 16000,
    encoding: AudioConfig.AudioEncoding.LINEAR_PCM,
  }),
});

// 2. Create the top-level wrapper message
const message = ClientToServerMessage.create({
  startRequest: startRequestPayload,
});

// 3. Encode the message to a Uint8Array (binary buffer)
const buffer = ClientToServerMessage.encode(message).finish();

// 4. Send it over the WebSocket
webSocket.send(buffer);
```

**Server-Side: Receiving and Decoding a Message**

```typescript
// In src/server/ws/server.ts
import { ClientToServerMessage } from '@/lib/interview_pb'; // Assuming same path

ws.on('message', (data: Buffer) => {
  // 1. The 'data' is a raw buffer. Decode it into a message object.
  const message = ClientToServerMessage.decode(new Uint8Array(data));

  // 2. Use the 'oneof' field to determine the payload type
  if (message.startRequest) {
    console.log('Received Start Request:', message.startRequest.interviewId);
    // Handle start request...
  } else if (message.audioChunk) {
    console.log('Received Audio Chunk of size:', message.audioChunk.audioContent.length);
    // Handle audio chunk...
  }
});
```

### 2. Web Audio API: Capturing and Downsampling

This is best done using an `AudioWorklet`, which runs in a separate thread and won't block the UI.

**Step 1: Create the Worklet Processor**

This file must be publicly accessible, so place it in the `/public` directory.

`/public/audio-processor.js`
```javascript
class ResamplingProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // The sample rates are passed from the main thread.
    this.nativeSampleRate = options.processorOptions.nativeSampleRate;
    this.targetSampleRate = options.processorOptions.targetSampleRate;
    this.inputBuffer = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const audioData = input[0]; // This is a Float32Array

      // Downsample by taking every Nth sample.
      const ratio = this.nativeSampleRate / this.targetSampleRate;
      const downsampled = new Float32Array(Math.floor(audioData.length / ratio));
      for (let i = 0, j = 0; j < downsampled.length; i += ratio, j++) {
        downsampled[j] = audioData[Math.floor(i)];
      }

      // Convert from Float32 (-1.0 to 1.0) to 16-bit PCM (-32768 to 32767)
      const pcm16 = new Int16Array(downsampled.length);
      for (let i = 0; i < downsampled.length; i++) {
        pcm16[i] = downsampled[i] * 32767;
      }

      // Post the raw buffer back to the main thread
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true; // Keep processor alive
  }
}

registerProcessor('resampling-processor', ResamplingProcessor);
```

**Step 2: Create the `AudioRecorder` Service**

`src/lib/audio/AudioRecorder.ts`
```typescript
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  async start(onAudioData: (chunk: ArrayBuffer) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    
    // IMPORTANT: The worklet file must be served publicly
    await this.audioContext.audioWorklet.addModule('/audio-processor.js');

    const source = this.audioContext.createMediaStreamSource(this.stream);
    
    this.workletNode = new AudioWorkletNode(this.audioContext, 'resampling-processor', {
      processorOptions: {
        nativeSampleRate: this.audioContext.sampleRate, // The browser's native sample rate
        targetSampleRate: 16000, // Our target
      },
    });

    // The worklet will post messages (audio chunks) back to us
    this.workletNode.port.onmessage = (event) => {
      onAudioData(event.data); // event.data is the ArrayBuffer
    };

    source.connect(this.workletNode);
    // We don't connect to the destination, to avoid the user hearing themselves.
  }

  stop() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
  }
}
```

### 3. Web Audio API: Playing Back Real-Time Audio

To ensure smooth, glitch-free playback that is resilient to UI lag, we will use an `AudioWorklet` for playback as well. This mirrors the recording architecture.

**Step 1: Create the Player Worklet Processor**

This processor runs in a separate thread. It receives audio chunks from the main application and queues them to be sent to the audio hardware at the correct time.

Place this file in the `/public` directory.

`/public/audio-player-processor.js`
```javascript
class AudioPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // A buffer to hold all incoming audio chunks.
    this.chunks = [];
    // An offset to track our position within the first chunk in the queue.
    this.chunkOffset = 0;

    // Listen for chunks sent from the main thread.
    this.port.onmessage = (event) => {
      const chunk = event.data; // This is a Float32Array
      this.chunks.push(chunk);
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    let samplesWritten = 0;
    // Keep writing samples until the output channel is full.
    while (samplesWritten < channel.length) {
      if (this.chunks.length === 0) {
        // No more data to play; fill the rest with silence.
        for (let i = samplesWritten; i < channel.length; i++) {
          channel[i] = 0;
        }
        break; // Exit the while loop
      }

      // Get the current chunk we're reading from.
      const currentChunk = this.chunks[0];
      const remainingInChunk = currentChunk.length - this.chunkOffset;
      const toWrite = Math.min(channel.length - samplesWritten, remainingInChunk);

      // Copy the data from our chunk to the output buffer.
      for (let i = 0; i < toWrite; i++) {
        channel[samplesWritten + i] = currentChunk[this.chunkOffset + i];
      }

      this.chunkOffset += toWrite;
      samplesWritten += toWrite;

      // If we've finished reading the current chunk, discard it.
      if (this.chunkOffset >= currentChunk.length) {
        this.chunks.shift();
        this.chunkOffset = 0;
      }
    }

    // Return true to keep the processor alive.
    return true;
  }
}

registerProcessor('audio-player-processor', AudioPlayerProcessor);
```

**Step 2: Create the `AudioPlayer` Service**

This service runs on the main thread and provides a simple API for the application to use.

`src/lib/audio/AudioPlayer.ts`
```typescript
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sampleRate: number;

  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
  }

  public async start() {
    if (this.audioContext) return;

    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    
    // The worklet file must be served publicly.
    await this.audioContext.audioWorklet.addModule('/audio-player-processor.js');

    this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-player-processor');
    this.workletNode.connect(this.audioContext.destination);
  }

  public stop() {
    this.audioContext?.close().then(() => {
      this.audioContext = null;
      this.workletNode = null;
    });
  }

  // Receives a raw 16-bit PCM ArrayBuffer from the WebSocket.
  public enqueue(pcm16ArrayBuffer: ArrayBuffer) {
    if (!this.workletNode) return;

    // 1. Convert the 16-bit PCM data into the Float32 format the Web Audio API needs.
    const pcm16 = new Int16Array(pcm16ArrayBuffer);
    const pcm32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      pcm32[i] = pcm16[i] / 32768.0; // Convert to -1.0 to 1.0 range
    }

    // 2. Post the Float32Array to the worklet.
    // The second argument makes this a "zero-copy" transfer for high performance.
    this.workletNode.port.postMessage(pcm32, [pcm32.buffer]);
  }
}
```

---

## Implementation Checklist & TDD Plan

### Phase 1: Protobuf Code Generation

- [ ] **Install Deps**: `pnpm add protobufjs` and `pnpm add -D protobufjs-cli`.
- [ ] **Script**: Add a `proto:generate` script to `package.json` to compile the `.proto` file into TypeScript modules (`src/lib/interview_pb.js` and `src/lib/interview_pb.d.ts`).
- [ ] **Generate**: Run the script and verify the output files are created correctly.

### Phase 2: Client-Side Audio Service (TDD)

- [ ] **RED**: Create `src/lib/audio/AudioRecorder.test.ts`. Write failing tests for requesting permissions, starting, and stopping recording.
- [ ] **GREEN**: Create `src/lib/audio/AudioRecorder.ts` and `/public/audio-processor.js` using the guidance above to make the tests pass.
- [ ] **REFACTOR**: Clean up the implementation.

### Phase 3: Update WebSocket Hook (`useInterviewSocket`)

- [ ] **RED**: Update tests in `session/page.test.tsx`.
    - Add a test to check the state transitions to `requestingPermissions` and `permissionsDenied`.
    - Add a test to verify that `ClientToServerMessage` with an `AudioChunk` is sent when the audio service provides data.
    - Add a test to verify that incoming `AudioChunk` messages are passed to an audio playback utility.
- [ ] **GREEN**: Modify `useInterviewSocket.ts`.
    - Integrate the `AudioRecorder` service.
    - Add the new permission-related states.
    - Update the `connect` method to handle the permissions flow.
    - In the `onmessage` handler, add logic to handle incoming `AudioChunk` messages and play them.
    - Modify the `send` logic to serialize all outgoing messages using the generated Protobuf classes.
- [ ] **REFACTOR**: Ensure the hook is clean and the logic is well-structured.

### Phase 4: UI Integration

- [ ] **Connect**: In `SessionContent.tsx`, update the UI to reflect the new states (e.g., show a message while waiting for permissions).
- [ ] **Visual Feedback**: Connect the `AudioVisualizer` component to the live microphone stream to give the user visual feedback that their voice is being captured.

---

## Test Requirements

This feature's success is validated by a multi-layered testing strategy. Each layer builds confidence in a different part of the system.

### Layer 1: Unit Tests (Validating the Building Blocks)

**Why:** These tests verify the logic of individual components in isolation. They are fast, precise, and ensure that our core algorithms and state machines work as expected before we try to connect them.

-   **Location**: `src/server/ws/server.test.ts` (Backend)
    -   **Test Cases**:
        -   (RED) Update tests to send binary Protobuf messages instead of JSON.
        -   (RED) Write a test to verify that when the server receives an `AudioChunk`, it correctly decodes it and sends the same `AudioChunk` back to the client (echo functionality).
    -   **Confidence Gained**: The backend can correctly handle the binary Protobuf protocol.

-   **Location**: `src/lib/audio/AudioRecorder.test.ts` (Frontend)
    -   **Strategy**: Mock the browser's `navigator.mediaDevices` API.
    -   **Test Cases**:
        -   (RED) Test that the service correctly requests microphone permissions.
        -   (RED) Test that it handles both granting and denial of permission.
    -   **Confidence Gained**: The audio capture service correctly interacts with the browser API.

-   **Location**: `src/lib/audio/*.test.ts` (Audio Processing Logic)
    -   **Strategy**: The core logic inside the `AudioWorkletProcessor` files (e.g., the downsampling algorithm, the playback queue management) will be extracted into pure, standalone functions. These functions can be imported directly into a standard Jest test file.
    -   **Test Cases**:
        -   (RED) Test the resampling logic with a known `Float32Array` input and assert that the output `Int16Array` has the correct values and length.
        -   (RED) Test the playback queue logic to ensure it correctly buffers incoming chunks and outputs them in the correct order.
    -   **Confidence Gained**: The fundamental audio processing algorithms are mathematically correct and robust, independent of their browser environment.

-   **Location**: `src/app/(app)/interview/[interviewId]/session/page.test.tsx` (Frontend Logic)
    -   **Strategy**: Mock the `AudioRecorder` service and the global `WebSocket` object.
    -   **Test Cases**:
        -   (RED) Test the new state flow: `initializing` -> `requestingPermissions` -> `connecting` -> `live`.
        -   (RED) Test the `permissionsDenied` state is handled correctly in the UI.
        -   (RED) Test that `AudioChunk` messages from the mocked `AudioRecorder` are correctly serialized to Protobuf and sent.
        -   (RED) Test that binary `AudioChunk` messages from the mocked WebSocket are received, deserialized, and passed to a playback function.
    -   **Confidence Gained**: The core frontend state machine works correctly and can properly serialize/deserialize data.

### Layer 2: End-to-End (E2E) Tests (Validating the Full User Journey)

**Why:** This is the ultimate validation. It ensures all the individual units, which we've already tested, work together seamlessly in a real-world scenario. This test simulates a real user in a real browser, verifying the entire flow from microphone to server and back.

-   **Location**: `src/test/e2e/core-journey.spec.ts`
-   **Strategy**: Use Playwright to launch a real browser. We will grant microphone permissions automatically and use network interception to "spy" on the WebSocket traffic.
-   **Test Case**:
    -   (RED) Create a new test named "should handle a full real-time audio interview".
    -   The test will log in, create an interview, and navigate to the session page.
    -   **Assert**: That the browser requests microphone permissions.
    -   **Assert**: That after granting permission, the WebSocket connection is established.
    -   **Assert**: By inspecting network traffic, that binary `ClientToServerMessage` frames containing `AudioChunk` are being sent.
    -   **Assert**: By inspecting network traffic, that binary `ServerToClientMessage` frames containing `AudioChunk` are being received (the echo).
    -   **Assert**: That the UI displays a "Live" status.
    -   The test will click "End Interview".
    -   **Assert**: That the user is redirected to the feedback page.
-   **Confidence Gained**: The entire feature works from the user's perspective. The data pipeline is confirmed to be fully functional.
