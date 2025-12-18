# Cloudflare Worker for Preppal

This worker handles real-time communication between the Preppal frontend and the Gemini Live API.

## Architecture

- **Entry Point (`src/index.ts`)**: Handles initial HTTP requests, health checks, and WebSocket upgrades. It validates JWT tokens before routing to Durable Objects.
- **Durable Object (`src/gemini-session.ts`)**: Manages individual interview sessions. It maintains the WebSocket connection with the client and coordinates with the Gemini Live API.
- **Audio Conversion (`src/audio-converter.ts`)**: Handles the conversion of audio formats between the client and the Gemini API.
- **Transcript Management (`src/transcript-manager.ts`)**: Manages the accumulation and processing of conversation transcripts.

## Communication Protocol

The worker uses Protobufs (defined in `proto/interview.proto`) for structured communication over WebSockets.

## Development

- `pnpm dev:worker`: Start the local development environment using Wrangler.
- `pnpm test`: Run the worker tests.

## Environment Variables

- `GEMINI_API_KEY`: API key for accessing the Gemini Live API.
- `JWT_SECRET`: Secret used for validating JWT tokens from the backend.
- `WORKER_SHARED_SECRET`: Shared secret for backend-to-worker communication.
- `NEXT_PUBLIC_API_URL`: URL of the Next.js backend API.
