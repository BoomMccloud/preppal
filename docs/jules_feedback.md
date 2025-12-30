# Session State Machine Architectural Analysis

This document provides a deep architectural analysis of the interview session state machine, primarily located in `src/app/[locale]/(interview)/interview/[interviewId]/session/useInterviewSocket.ts`. The evaluation is based on the 'Source of Truth Topology' and 'Side-Effect Control Flow' principles.

## 1. State Serialization

The core application state managed by `useState` is fully serializable. This includes:

- `state`: A string literal type (`"initializing" | "connecting" | "live" | "ending" | "error"`).
- `committedTranscript` & `pendingTranscript`: Arrays of objects with serializable fields (`text`, `speaker`, `is_final`).
- `elapsedTime`: A number.
- `error`: A string or null.
- `isAiSpeaking`: A boolean.

However, the component's full state is not serializable due to the use of `useRef` to hold non-serializable objects like `WebSocket`, `AudioSession`, and timer instances. This is standard practice in React for managing side effects and does not violate the principle of serializable application state, as these refs are treated as ephemeral, runtime-specific handles.

## 2. UI/Reducer State Synchronization ('Split-Brain' Scenarios)

The current implementation uses multiple `useState` hooks, which decentralizes state management. This creates potential for desynchronization:

- **Multiple `setState` Calls**: State transitions are often triggered by multiple `setState` calls in different parts of the code. For example, an error can be set from a tRPC mutation, a WebSocket event, or an audio initialization failure. This makes it difficult to trace the exact flow of state and can lead to inconsistencies.
- **Stale Closures**: The hook uses `stateRef.current = state` to provide the WebSocket `onclose` handler with the latest state. This is a common workaround for stale closures in event handlers but is a clear indicator of a potential desync scenario. If this pattern is not applied carefully everywhere, handlers can act on stale state.
- **Derived State Complexity**: The transcript is split into `committed` and `pending` states and then combined with `useMemo`. While efficient, this adds another layer of complexity where `setCommittedTranscript` and `setPendingTranscript` must be managed correctly to avoid an inconsistent view of the transcript.

A centralized reducer would eliminate these issues by providing a single point for state updates and removing the need for `stateRef`.

## 3. Side-Effect Architecture

The architecture is not a formal command-based system but rather a reactive one, where side effects are triggered by `useEffect` hooks observing state changes.

- **Coupling**: Side effects are tightly coupled to state. The primary `useEffect` hook that observes the `state` variable is responsible for starting and stopping the `AudioSession` and timer. While this works, it intertwines the _what_ (state change) with the _how_ (starting audio).
- **Intents vs. Effects**: The `endInterview` function is a user "intent." It directly sets the state to `"ending"` and sends a WebSocket message. A more decoupled architecture would dispatch an `END_INTERVIEW` action. The reducer would handle the state transition, and a separate effect handler would be responsible for the WebSocket communication.
- **Barge-in Logic**: The user barge-in feature is handled by a `useEffect` that directly calls a method on the `audioSessionRef`. This is a direct side effect triggered by a change in the `transcript` state, further coupling the state management with the audio playback logic.

## 4. Race Conditions and Edge Cases

The state transitions between `initializing`, `connecting`, `live`, `ending`, and `error` have several potential race conditions:

- **Connection vs. Unmount**: If the component unmounts while a WebSocket connection is in progress, the `onopen`, `onerror`, or `onclose` events might fire after the component has unmounted, leading to React state update warnings.
- **Rapid Transitions**: A quick transition from `live` -> `ending` (user clicks "End") immediately followed by a network error (`onclose`) could create a race condition. The `onclose` handler logic depends on `stateRef.current`. If the state is already `"ending"`, it might ignore a legitimate connection error that should be surfaced to the user.
- **Error Handling Priority**: An error can occur from multiple sources simultaneously (e.g., audio fails to start at the same time the WebSocket closes unexpectedly). The current logic may only capture and display the first error that gets set, potentially hiding the root cause.

## 5. Recommendations for Improvement

To improve testability and robustness, the following changes are recommended:

1.  **Adopt `useReducer`**: Centralize all state transitions into a single, pure reducer function. This will make the state logic predictable, eliminate the need for `stateRef`, and simplify the overall flow. State transitions would be triggered by dispatching explicit actions (e.g., `{ type: 'CONNECTION_SUCCESS' }`, `{ type: 'END_INTERVIEW' }`).
2.  **Decouple Side Effects**: Continue using `useEffect` to listen for state changes from the reducer, but ensure that the logic within these effects is focused solely on managing side effects (e.g., WebSocket messages, audio session). This separates the "what" from the "how."
3.  **Formalize Actions**: Create a clear set of action types that represent all possible events and intents in the session lifecycle. This improves readability and makes the state machine's behavior explicit.
4.  **Unit Test the Reducer**: A pure reducer function is easy to test. All state transitions, edge cases, and error conditions can be verified with simple unit tests without requiring a browser environment or complex mocking.
5.  **Improve Error State**: Instead of a simple string, the `error` state could be an object containing an error code and a message. This would allow the UI to provide more specific and helpful feedback to the user.
