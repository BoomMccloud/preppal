# Audio Implementation

This directory contains the client-side audio processing implementation for the real-time interview feature.

## Components

### AudioRecorder
- Captures audio from the user's microphone
- Downsamples audio to 16kHz PCM
- Sends audio chunks to the WebSocket server

### AudioPlayer
- Receives audio chunks from the WebSocket server
- Plays back audio to the user
- Uses Web Audio API for smooth playback

### Audio Worklets
- `audio-processor.js`: Handles audio recording and downsampling
- `audio-player-processor.js`: Handles audio playback queuing

### Protobuf
- Generated TypeScript files for WebSocket message serialization
- Located in `interview_pb.js` and `interview_pb.d.ts`

## Testing

The audio implementation is tested at multiple levels:

1. **Unit Tests**: Individual component testing
   - `AudioRecorder.test.ts`: Tests audio recording functionality
   - `AudioPlayer.test.ts`: Tests audio playback functionality
   - `audioUtils.test.ts`: Tests core audio processing logic

2. **Integration Tests**: WebSocket hook integration
   - `useInterviewSocket.test.ts`: Tests audio integration with WebSocket

3. **Backend Tests**: Server-side echo functionality
   - `server.audio.test.ts`: Tests audio chunk echo functionality

4. **E2E Tests**: Full user journey
   - `audio-journey.spec.ts`: Tests the complete audio interview flow

## Development

### Prerequisites
- Node.js and pnpm
- Microphone access for testing

### Setup
1. Install dependencies: `pnpm install`
2. Generate protobuf files: `pnpm proto:generate`

### Running Tests
- Unit tests: `pnpm test`
- E2E tests: `pnpm playwright test e2e/audio-journey.spec.ts`