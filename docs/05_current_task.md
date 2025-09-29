---

### Previous Task: Frontend Implementation (Phase 2)

This plan outlines the steps to build the frontend of Preppal, following a Test-Driven Development (TDD) approach as specified in `docs/02_tdd.md`.

#### 1. [x] UI Component Development (TDD)

Build React components in isolation. For each component, we will follow the Red-Green-Refactor cycle.

- **Component: `StatusIndicator`**
  1.  **(Red)** Write a test asserting that given a specific status prop (e.g., `connecting`), the component renders the correct text ("Connecting...").
  2.  **(Green)** Create the `StatusIndicator` component to pass the test.
  3.  **(Refactor)** Clean up the component code.
  - _Files to create/modify: `src/app/_components/StatusIndicator.tsx`, `src/app/_components/StatusIndicator.test.tsx`_

- **Component: `InterviewControls` (Start/End buttons)**
  1.  **(Red)** Write a test to ensure "Start Interview" and "End Interview" buttons are rendered. Write another test to check that `onClick` handlers are called when buttons are clicked.
  2.  **(Green)** Create the `InterviewControls` component to pass the tests.
  3.  **(Refactor)** Refine component structure.
  - _Files to create/modify: `src/app/_components/InterviewControls.tsx`, `src/app/_components/InterviewControls.test.tsx`_

- **Component: `AudioVisualizer`**
  1.  **(Red)** Write a test to check that the component renders and visually changes based on an `audioLevel` prop.
  2.  **(Green)** Implement the `AudioVisualizer` component.
  3.  **(Refactor)** Optimize rendering.
  - _Files to create/modify: `src/app/_components/AudioVisualizer.tsx`, `src/app/_components/AudioVisualizer.test.tsx`_

- **Component: `TranscriptDisplay`**
  1.  **(Red)** Write a test that given a list of transcript entries, the component renders them correctly, distinguishing between 'USER' and 'AI' speakers.
  2.  **(Green)** Implement the `TranscriptDisplay` component.
  3.  **(Refactor)** Improve styling and structure.
  - _Files to create/modify: `src/app/_components/TranscriptDisplay.tsx`, `src/app/_components/TranscriptDisplay.test.tsx`_

#### 2. Global State Management

Implement a client-side state machine for the interview lifecycle using Zustand.

1.  **(Red)** Write a test for the state management store. The test should check that actions (e.g., `startInterview`, `connect`, `endInterview`) correctly transition the state (e.g., from `idle` to `initializing` to `connecting`).
2.  **(Green)** Implement the Zustand store (`useInterviewStore`) with the states and actions defined in `docs/04_states.md`.
3.  **(Refactor)** Organize the store logic.
    - _Files to create/modify: `src/lib/stores/interview.store.ts`, `src/lib/stores/interview.store.test.ts`_

#### 3. Page Composition and tRPC Integration

Integrate components and state into the main application page.

1.  **(Red - E2E)** Write a high-level Playwright test for the main page (`/`). The test will:
    - Visit the page.
    - Assert that the user's past interviews are displayed (this will fail).
    - Mock the tRPC `post.getAll` procedure using MSW to return mock data.
2.  **(Green)** Modify `src/app/page.tsx` to:
    - Use the tRPC client (`api.post.getAll.useQuery()`) to fetch interview history.
    - Render a list of past interviews.
    - Integrate the `StatusIndicator` and `InterviewControls` components.
    - Connect component actions and state store (e.g., clicking "Start" calls the `startInterview` action).
3.  **(Refactor)** Clean up the page component.

#### 4. WebSocket and Audio Handling

Implement the real-time communication logic.

1.  **WebSocket Client Service**
    1.  **(Red)** Write a test for a `WebSocketService`. Mock the browser's WebSocket API. Test that the service's `connect` method creates a WebSocket instance with the correct URL and that it can send and receive messages.
    2.  **(Green)** Implement the `WebSocketService` class/module. It should handle connection, disconnection, sending, and receiving messages.
    3.  **(Refactor)** Structure the service for clarity.
    - _Files to create/modify: `src/lib/websocket/interview.client.ts`, `src/lib/websocket/interview.client.test.ts`_

2.  **Audio Capture Service**
    1.  **(Red)** Write a test for an `AudioService`. Mock `navigator.mediaDevices.getUserMedia`. Test that `start` and `stop` methods correctly interact with the mock media stream.
    2.  **(Green)** Implement the `AudioService`.
    3.  **(Refactor)** Encapsulate audio logic cleanly.
    - _Files to create/modify: `src/lib/audio/audio.service.ts`, `src/lib/audio/audio.service.test.ts`_

3.  **Integration**
    1.  **(Red - Integration Test)** Write a test that integrates the state store, WebSocket service, and audio service.
        - When the state becomes `connecting`, the WebSocket service should be called.
        - When the state becomes `live`, the audio service should start capturing.
        - When audio data is received from the audio service, it should be encoded (mocked) and sent via the WebSocket service.
    2.  **(Green)** Update the state store actions to orchestrate these services.
    3.  **(Refactor)** Ensure the orchestration logic is robust.
