# E2E Testing Guide for Real-Time Audio Integration

This document explains how to run end-to-end tests for the real-time audio integration with the Cloudflare Worker.

## Test Structure

We have three levels of tests:

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test how components work together
3. **E2E Tests** - Test the complete user flow with real services

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run specific unit tests
pnpm test src/app/\(app\)/interview/\[interviewId\]/session/*.test.tsx
```

### Integration Tests

```bash
# Run integration tests
pnpm test src/app/\(app\)/interview/\[interviewId\]/session/useInterviewSocket.integration.test.ts
```

### E2E Tests

```bash
# Run E2E tests
pnpm test src/app/\(app\)/interview/\[interviewId\]/session/e2e.test.tsx
pnpm test src/app/\(app\)/interview/\[interviewId\]/session/e2e-audio.test.ts
pnpm test src/app/\(app\)/interview/\[interviewId\]/session/complete-e2e.test.ts
```

## Testing Against Deployed Services

### Local Development

For local development, you can run tests against:

1. **Local Next.js server**: `pnpm dev`
2. **Local Cloudflare Worker**: `pnpm dev:worker`

Make sure both services are running before running E2E tests.

### Production Environment

To test against deployed services:

1. Set the `NEXT_PUBLIC_WORKER_URL` environment variable to point to your deployed Cloudflare Worker
2. Run your tests with the production configuration

## Test Coverage

Our E2E tests cover:

1. ✅ **Authentication Flow**
   - Token generation with `generateWorkerToken`
   - WebSocket connection with proper URL construction
   - Error handling for authentication failures

2. ✅ **WebSocket Connection**
   - Connection establishment with Cloudflare Worker
   - Proper URL formatting with interview ID and token
   - Connection state management

3. ✅ **Audio Streaming**
   - Audio recording from microphone
   - Audio playback through speakers
   - Real-time audio chunk transmission
   - Protobuf message encoding/decoding

4. ✅ **Message Handling**
   - Transcript updates from AI
   - Audio responses from AI
   - Error messages
   - Session termination messages

5. ✅ **User Interface**
   - State transitions (connecting, live, ending, error)
   - Transcript display
   - Timer functionality
   - End interview button

6. ✅ **Session Lifecycle**
   - Starting a session
   - Ending a session
   - Graceful shutdown
   - Error recovery

## Manual Testing Checklist

When manually testing the E2E flow:

1. [ ] Create a new interview session
2. [ ] Join the session from the lobby
3. [ ] Verify WebSocket connection is established
4. [ ] Check that audio recording starts
5. [ ] Verify AI responses are received and played
6. [ ] Check that transcripts are displayed
7. [ ] End the interview session
8. [ ] Verify session ends properly
9. [ ] Check that feedback is generated

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Check that `NEXT_PUBLIC_WORKER_URL` is correctly set
   - Verify the Cloudflare Worker is running
   - Check authentication token validity

2. **Audio Issues**
   - Ensure microphone permissions are granted
   - Check browser audio settings
   - Verify audio worklet files are accessible

3. **Protobuf Errors**
   - Ensure protobuf definitions are up to date
   - Check that messages are properly encoded/decoded
   - Verify message schemas match between client and server

### Debugging Tips

1. Enable verbose logging in the browser console
2. Use browser WebSocket debugging tools
3. Check Cloudflare Worker logs
4. Monitor network traffic for message flow