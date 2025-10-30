# FEAT17: Real-Time Audio Client Specification

## 1. Feature: Real-Time Audio Streaming in Interview Session

### Overview

This feature implements the client-side logic for a true, real-time audio pipeline. The user will use their microphone to speak with the AI, and the AI's responses will be streamed back as audio, along with real-time transcription.

This document provides a high-level overview of the feature and its related documentation. For the complete, unified specification including the backend and API contract, see `EPIC02_realtime_interview_session.md`.

---

## 2. Strategy: Parallel Development Against a Unified Contract

As defined in `EPIC02`, the development strategy is to build the frontend and backend in parallel against a single, unified API contract.

-   **Frontend (This Feature)**: Implements the full client-side experience, including audio capture, audio playback, and WebSocket communication, against a mock server provided by the backend team.
-   **Backend**: Simultaneously develops the production Cloudflare Worker that will handle real-time communication with the Gemini Live API.

This approach replaces the previous "echo-server" phased strategy.

---

## 3. Frontend Specification

### Core Components

1.  **Audio Capture (`AudioRecorder`)**: Captures raw audio from the user's microphone, downsamples it to 16kHz PCM, and provides it in chunks for WebSocket transmission.
2.  **Audio Playback (`AudioPlayer`)**: Receives audio chunks from the WebSocket and plays them back seamlessly using an `AudioWorklet` for performance.
3.  **WebSocket Communication (`useInterviewSocket`)**: Manages the WebSocket lifecycle, authentication, and real-time messaging according to the `EPIC02` contract.

### State Management

The `useInterviewSocket` hook manages the connection and session state.

-   **States**: `initializing`, `requestingPermissions`, `connecting`, `live`, `ending`, `error`.
-   **Permissions**: The hook will handle states for `permissionsDenied` and `noDeviceFound`.

---

## 4. Related Documents

This document should be used in conjunction with the following for a complete picture of the feature.

-   **[EPIC02_realtime_interview_session.md](./EPIC02_realtime_interview_session.md)**: The single source of truth for the unified API contract and overall architecture.
-   **[FEAT17_implementation_plan.md](./FEAT17_implementation_plan.md)**: The detailed, actionable plan for frontend development, including code-level guidance for implementing the new API contract.
-   **[FEAT17_progress.md](./FEAT17_progress.md)**: A summary of the implementation progress for this feature.
-   **[FEAT17_test_execution.md](./FEAT17_test_execution.md)**: A summary of the test execution status and coverage.
