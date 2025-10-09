# Application State Management Guide

This document outlines the key states the application needs to manage throughout the user lifecycle. A well-defined state machine is crucial for building a predictable, bug-free, and user-friendly experience.

We will primarily focus on global or session-level states rather than transient local component states.

## 1. Authentication State

This global state is managed by NextAuth.js and is not part of the core interview lifecycle state machine.

| State Name | Description |
| :--- | :--- |
| `unauthenticated` | The user is not logged in or the session has expired. |
| `authenticating` | The application is currently verifying a session or processing a login attempt. |
| `authenticated` | The user is successfully logged in. |

## 2. Simplified Interview Lifecycle State

This is the core state machine of the application. It has been simplified to focus on the distinct UI views the user interacts with. Transient error conditions are handled by notifications that reset the user to a safe state (usually `Idle`), rather than having their own dedicated states.

| State Name | Description | User Sees |
| :--- | :--- | :--- |
| **`Idle`** | The user is on the dashboard, ready to begin an interview. | The main application dashboard. |
| **`Preparing`** | The app is setting up the session (creating DB record, connecting). | A loading indicator or setup screen. |
| **`Live`** | The interview is active with real-time communication. | The main interview UI. |
| **`Processing`** | The user has ended the interview and the system is analyzing the results. | A "Processing your results..." screen. |
| **`Results`** | The feedback report is ready to view. | The interview feedback/results page. |

**Note**: The session page (`/interview/[interviewId]/session`) uses **local component state** rather than the global Zustand store, as it represents a single-use flow that doesn't need to be shared across the application.

### State Transitions

Here is how the application moves between the states based on user actions and system events.

(Details omitted for brevity in this section, see full plan below)

## 3. Data Fetching State (tRPC)

This represents the state for any standard, non-real-time data fetching. This is managed per-query by `react-query` (which is used by tRPC) and does not need to be part of our central state.

| State Name | Description |
| :--- | :--- |
| **`loading`** | A tRPC query is in flight to fetch data. |
| **`success`** | The data has been successfully fetched. |
| **`error`** | The tRPC query failed. |

## 4. Implementation Plan (Zustand)

We will use **Zustand** to implement the simplified lifecycle state. It's recommended for its minimal boilerplate, excellent performance, and simple API.

### Step 1: Installation

First, add Zustand to the project.
```bash
pnpm add zustand
```

### Step 2: Create the Store

Create a new file, for example `src/app/stores/interview-store.ts`, to define the state machine.

```typescript
import { create } from 'zustand';

// Define the states as a type for type-safety
type InterviewStatus = 'Idle' | 'Preparing' | 'Live' | 'Processing' | 'Results';

// Define the shape of the store's state and actions
// Note: This store handles ONLY UI state. Business data (like interviewId)
// should be fetched via tRPC to maintain separation of concerns.
interface InterviewUIState {
  status: InterviewStatus;

  // Actions to transition between states
  startPreparing: () => void;
  setLive: () => void;
  startProcessing: () => void;
  setResults: () => void;
  reset: () => void;
}

// Create the store
export const useInterviewStore = create<InterviewUIState>((set) => ({
  // Initial state
  status: 'Idle',

  // Define the actions
  startPreparing: () => set({ status: 'Preparing' }),
  setLive: () => set({ status: 'Live' }),
  startProcessing: () => set({ status: 'Processing' }),
  setResults: () => set({ status: 'Results' }),
  reset: () => set({ status: 'Idle' }),
}));
```

### Step 3: Use the Store in Components

Components can now subscribe to the store to get the current UI status or to trigger state transitions. Business data should be fetched separately via tRPC.

**Example: A component to display the main UI based on the state.**

```tsx
'use client';

import { useInterviewStore } from '~/app/stores/interview-store';
import { Dashboard } from './Dashboard';
import { InterviewLobby } from './InterviewLobby'; // Shows 'Preparing' UI
import { InterviewSession } from './InterviewSession'; // Shows 'Live' UI

export function MainApp() {
  const status = useInterviewStore((state) => state.status);

  switch (status) {
    case 'Idle':
      return <Dashboard />;
    case 'Preparing':
      return <InterviewLobby />;
    case 'Live':
      return <InterviewSession />;
    case 'Processing':
      return <ProcessingScreen />;
    case 'Results':
      return <ResultsPage />;
    default:
      return <Dashboard />;
  }
}
```

**Example: A button to start the interview with separated concerns.**

```tsx
'use client';

import { useInterviewStore } from '~/app/stores/interview-store';
import { api } from '~/trpc/react';

export function StartButton() {
  const startPreparing = useInterviewStore((state) => state.startPreparing);
  const setLive = useInterviewStore((state) => state.setLive);
  const reset = useInterviewStore((state) => state.reset);

  // Business data handled by tRPC
  const { mutate: createInterview } = api.interview.create.useMutation();

  const handleClick = () => {
    // 1. Set UI state to 'Preparing'
    startPreparing();

    // 2. Create interview (business logic)
    createInterview(undefined, {
      onSuccess: (interview) => {
        // 3. Interview created successfully - transition UI to live
        // The interview ID is now managed by tRPC cache, not UI store
        setLive();
        // Next step: get permissions and connect to WebSocket
      },
      onError: (error) => {
        // 4. On failure, show notification and reset UI state
        showToast('Error starting interview!');
        reset();
      },
    });
  };

  return <button onClick={handleClick}>Start Interview</button>;
}
```

**Example: Using interview data in a component.**

```tsx
'use client';

import { useInterviewStore } from '~/app/stores/interview-store';
import { api } from '~/trpc/react';

export function InterviewSession() {
  // UI state from Zustand
  const status = useInterviewStore((state) => state.status);

  // Business data from tRPC
  const { data: currentInterview } = api.interview.getCurrent.useQuery();

  if (status !== 'Live' || !currentInterview) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Interview Session</h1>
      <p>Interview ID: {currentInterview.id}</p>
      <p>Status: {currentInterview.status}</p>
    </div>
  );
}
```

## Key Benefits of This Approach

This separation of concerns provides several advantages:

1. **Single Responsibility**: Zustand handles only UI state, tRPC handles only business data
2. **Better Caching**: tRPC's React Query integration provides automatic caching and synchronization
3. **Simpler Testing**: UI state and business logic can be tested independently
4. **Reduced Complexity**: No mixed responsibilities in the state store
5. **Type Safety**: Full end-to-end type safety from database to UI

This approach provides a robust, performant, and maintainable system that follows KISS principles for the entire interview lifecycle.
