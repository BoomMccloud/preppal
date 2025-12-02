### How to Use This Schema: A Typical Flow

This design enables a clear, stateful communication flow:

1.  **Connection Start**:
    - The client opens a WebSocket connection.
    - The very first message the client sends is a `ClientToServerMessage` containing a `StartRequest`.
    - `ClientToServerMessage { start_request: { auth_token: "...", interview_id: "...", audio_config: {...} } }`

2.  **Session Confirmation**:
    - The server receives the `StartRequest`, validates the token, finds the interview in the database, and connects to the Gemini Live API.
    - If successful, it sends back a `ServerToClientMessage` containing a `StartResponse`.
    - `ServerToClientMessage { start_response: { session_id: "..." } }`

3.  **Bi-directional Streaming**:
    - The client captures audio and sends a stream of `ClientToServerMessage` wrappers, each containing an `AudioChunk`.
    - Simultaneously, the server receives audio from the Gemini API and sends a stream of `ServerToClientMessage` wrappers, also containing `AudioChunk`s.
    - As the Gemini API processes speech, the server can also send `PartialTranscript` messages to show the user what the AI is hearing in real-time.

4.  **Connection End**:
    - The user clicks the "End Interview" button.
    - The client sends one final `ClientToServerMessage` containing an empty `EndRequest`.
    - The server receives this, gracefully closes its connection to the Gemini API, and sends a final `ServerToClientMessage` containing a `SessionEnded` message to the client before closing the WebSocket.
    - `ServerToClientMessage { session_ended: { reason: USER_INITIATED } }`

---

# Application State Management Guide

This document outlines the key states the application needs to manage throughout the user lifecycle. A well-defined state machine is crucial for building a predictable, bug-free, and user-friendly experience, especially given the real-time nature of the interview feature.

We will primarily focus on global or session-level states rather than transient local component states.

## 1. Authentication State

This global state manages the user's authentication status and is typically handled by a library like NextAuth.js.

| State Name        | Description                                                                     | User Sees                                                         | Triggers                                                   |
| :---------------- | :------------------------------------------------------------------------------ | :---------------------------------------------------------------- | :--------------------------------------------------------- |
| `unauthenticated` | The user is not logged in or the session has expired.                           | Login page or a "Sign In" button in the header.                   | Initial visit, user logs out.                              |
| `authenticating`  | The application is currently verifying a session or processing a login attempt. | A loading spinner or a disabled login button.                     | User submits login form, page loads with a session cookie. |
| `authenticated`   | The user is successfully logged in, and their profile data is available.        | The main application dashboard, user's name/avatar in the header. | Successful login, successful session verification.         |

## 2. Interview Lifecycle State

This is the core state machine of the application. It governs the entire flow from starting an interview to viewing the results.

| State Name                  | Description                                                                                                                    | User Sees                                                                                                                          | Triggers                                                                            |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **`idle`**                  | The user is authenticated and on the dashboard, ready to begin an interview.                                                   | The main dashboard with a "Start Interview" button.                                                                                | Successful login, completing a previous interview.                                  |
| **`initializing`**          | User has clicked "Start"; the app is making preliminary API calls (e.g., creating an interview record via tRPC).               | A loading indicator on the "Start" button or a brief screen overlay.                                                               | User clicks "Start Interview".                                                      |
| **`requestingPermissions`** | The application has requested access to the user's microphone.                                                                 | The browser's native permission prompt.                                                                                            | `initializing` state completes successfully.                                        |
| **`permissionsDenied`**     | The user has explicitly denied microphone access.                                                                              | An error message explaining that microphone access is required, with a button to retry or instructions to change browser settings. | User clicks "Block" on the permission prompt.                                       |
| **`connecting`**            | Permissions are granted. The client is establishing a WebSocket connection with the backend server.                            | A "Connecting..." status indicator or a subtle animation.                                                                          | User clicks "Allow" on the permission prompt.                                       |
| **`live`**                  | The WebSocket is connected, authenticated, and bi-directional audio streaming is active. **This is the main interview state.** | The full meeting UI. The AI is listening and responding. Visual feedback for speaking (e.g., glowing mic icon) is active.          | Server sends `StartResponse` message.                                               |
| **`reconnecting`**          | The WebSocket connection was lost unexpectedly. The application is attempting to reconnect.                                    | A "Reconnecting..." overlay or banner. The UI might be frozen.                                                                     | WebSocket `onclose` or `onerror` event is fired unexpectedly.                       |
| **`ending`**                | The user has clicked "End Interview"; the client has sent the `EndRequest` and is waiting for server confirmation.             | A "Ending session..." indicator. UI controls are disabled.                                                                         | User clicks "End Interview".                                                        |
| **`processingResults`**     | The session has ended successfully. The frontend is waiting for the backend to analyze the interview and generate feedback.    | A "Processing your results..." or "Analyzing interview..." screen.                                                                 | Server sends `SessionEnded` message.                                                |
| **`resultsReady`**          | The backend has finished processing, and the feedback is available to be viewed.                                               | The interview feedback/results page.                                                                                               | A tRPC call to check for results returns successfully, or a push event is received. |
| **`error`**                 | A critical, unrecoverable error occurred during the interview lifecycle.                                                       | A clear error message with an action, like "An error occurred. Please try starting a new interview."                               | WebSocket connection fails after multiple retries, server sends an `Error` message. |

## 3. Data Fetching State (tRPC)

This represents the state for any standard, non-real-time data fetching, such as loading the user's past interview history. This is often managed per-query.

| State Name    | Description                                              | User Sees                                                               |
| :------------ | :------------------------------------------------------- | :---------------------------------------------------------------------- |
| **`loading`** | A tRPC query is in flight to fetch data.                 | A skeleton loader or a loading spinner in the relevant UI area.         |
| **`success`** | The data has been successfully fetched and is available. | The UI is populated with the fetched data (e.g., a list of interviews). |
| **`error`**   | The tRPC query failed.                                   | An inline error message like "Could not load interview history."        |

---
