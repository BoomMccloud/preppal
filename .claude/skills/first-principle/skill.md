---
name: first-principle
description: Guide architectural discussions for new features using first-principle thinking. Use when planning implementation of complex features to ensure clean separation of concerns, testable code, and robust state management. Trigger when discussing feature architecture, state management approaches, or debugging complex state issues.
---

# First-Principle Architecture Analysis

This skill provides a structured framework for analyzing and designing feature implementations using first-principle thinking. Apply these principles when planning new features, reviewing architectural decisions, or debugging complex state management issues.

## When to Use This Skill

**Trigger conditions:**

- Planning implementation of a new feature with complex state
- Reviewing architectural decisions for state management
- Debugging issues related to state synchronization, race conditions, or side effects
- Refactoring existing features that have grown complex
- User asks about "clean architecture", "state management", or "separation of concerns"

**Approach:**

Walk through each of the five principles below, asking questions and analyzing the proposed or existing architecture against these criteria.

## The Five Principles

### 1. The "Source of Truth" Topology

**Core Questions:**

- **"Is there more than one component acting as the 'Brain' for this feature?"**
  - Risk: Conflicting states (Split Brain)
  - Goal: One authoritative owner (Parent/Container/Store) for the feature's lifecycle. Child components and hooks should be "Limbs" (UI/Logic) or "Sensors" (Inputs), not decision-makers.

- **"Can the entire feature state be serialized (JSON.stringify)?"**
  - Risk: Hidden, transient state in closures or localized hooks that makes debugging impossible
  - Goal: A single state tree that represents the complete UI reality. If you reload the page with this JSON, you should be back exactly where you were.

**Analysis Approach:**

1. Identify all components/hooks that maintain state for this feature
2. Map which component "owns" each piece of state
3. Check for duplicate or derived state living in multiple places
4. Verify that the complete feature state can be represented as a single serializable object

**Red Flags:**

- Multiple components calling the same API independently
- State synchronized via props drilling or context
- Derived state calculated in multiple places
- State that exists in closures but not in the state tree

### 2. The Side-Effect Control Flow

**Core Questions:**

- **"Are we reacting to *history* (state changed) or executing *intent* (commands)?"**
  - Risk: useEffect / watch chains that trigger unintended cascades (Infinite loops, race conditions)
  - Goal: Prefer Intent-Based Architecture. "User clicked Save" -> "Dispatch SAVE command" -> "Execute API Call". Avoid "User clicked Save" -> "State.saving = true" -> "Effect sees saving=true" -> "Effect calls API".

- **"Is the business logic coupled to the delivery mechanism?"**
  - Risk: You can't test the logic without mocking the network/DOM/API
  - Goal: Logic should be pure functions (State + Event = New State + Commands). The "Driver" (API/DOM) just executes the commands.

**Analysis Approach:**

1. Map all side effects (API calls, timers, event listeners, etc.)
2. Identify what triggers each side effect
3. Determine if side effects are triggered by state changes (reactive) or by commands (imperative)
4. Check if business logic is mixed with infrastructure code

**Red Flags:**

- useEffect that depends on state and triggers API calls
- Multiple useEffect hooks watching the same state
- Business logic inside API client code
- Conditional logic based on loading/error states scattered across components

**Recommended Pattern:**

```typescript
// Good: Intent-Based
function handleSave() {
  dispatch({ type: 'SAVE_REQUESTED' })
  // Reducer updates state, returns command
  // Effect executes command, dispatches result
}

// Bad: Reactive
function handleSave() {
  setSaving(true) // Effect will see this and trigger API
}
```

### 3. The "Hardware Driver" Pattern (Infrastructure Abstraction)

**Core Questions:**

- **"Does the Infrastructure Layer (API/Socket/Audio) contain Business Logic?"**
  - Risk: Refactoring infrastructure breaks business rules. Logic duplication. "Smart" clients that decide when to retry or redirect.
  - Goal: Infrastructure code should be "Dumb Drivers". They provide methods (connect, fetch, play) and emit events (onMessage, onError). They never decide what to do, only how to do it.

- **"Does the Driver manage its own lifecycle state?"**
  - Risk: The Driver thinks it's Connected, the UI thinks it's Disconnected
  - Goal: The Driver reports status; the UI owns the status

**Analysis Approach:**

1. Identify all "drivers" (API clients, WebSocket managers, audio players, etc.)
2. Check what decisions each driver makes autonomously
3. Verify that drivers only expose methods and emit events
4. Confirm that lifecycle state lives in the business layer, not the driver

**Red Flags:**

- API client that decides when to retry
- WebSocket manager that maintains connection state internally
- Audio player that decides when to play/pause based on events
- Driver code with conditional logic based on application state

**Recommended Pattern:**

```typescript
// Good: Dumb Driver
class AudioDriver {
  play(url: string): void { /* ... */ }
  pause(): void { /* ... */ }
  dispose(): void { /* ... */ }
  onStatusChange: (status: 'playing' | 'paused' | 'error') => void
}

// Bad: Smart Driver
class AudioDriver {
  private autoRetry: boolean
  private connectionState: 'connected' | 'disconnected'

  play(url: string) {
    if (this.connectionState === 'disconnected') {
      this.reconnect()
    }
    // Business logic in infrastructure!
  }
}
```

### 4. Lifecycle & Concurrency

**Core Questions:**

- **"What happens if the feature is destroyed (unmounted) while active?"**
  - Risk: Memory leaks, zombie connections, audio playing in background, state updates on unmounted components
  - Goal: Deterministic Teardown. Every "Driver" must have a synchronous dispose() or abort() method that guarantees silence/cleanup.

- **"What happens if the User spams the action?"**
  - Risk: Race conditions, duplicate requests, inconsistent state
  - Goal: State Machine Guardrails. The State Machine should reject events that are invalid for the current state (e.g., ignoring 'CLICK' while 'SUBMITTING').

**Analysis Approach:**

1. Identify all async operations (API calls, timers, event listeners)
2. Trace what happens on component unmount
3. Verify cleanup/disposal mechanisms exist
4. Test rapid action sequences (double-click, spam, etc.)
5. Check if state machine prevents invalid transitions

**Red Flags:**

- Missing cleanup in useEffect return functions
- API calls without AbortController
- Event listeners not removed on unmount
- No state machine guards for concurrent actions
- setTimeout/setInterval without clearTimeout/clearInterval

**Recommended Pattern:**

```typescript
// Good: Deterministic Cleanup
useEffect(() => {
  const controller = new AbortController()

  api.fetch({ signal: controller.signal })

  return () => {
    controller.abort() // Synchronous cleanup
  }
}, [])

// State machine with guards
function reducer(state, event) {
  if (state.status === 'submitting' && event.type === 'SUBMIT') {
    return state // Ignore duplicate submit
  }
  // ...
}
```

### 5. Testability

**Core Question:**

- **"Can I test the entire complex flow without rendering a single component?"**
  - Risk: Slow, brittle integration tests (Selenium/Playwright) are required to verify basic logic
  - Goal: Headless Logic Tests. You should be able to instantiate the Logic (Reducer/Store) + Mock Driver and run through the entire user journey in milliseconds.

**Analysis Approach:**

1. Identify the core business logic
2. Check if logic can be tested independently of React
3. Verify that drivers can be easily mocked
4. Confirm that user journeys can be simulated without UI

**Red Flags:**

- Business logic tightly coupled to React hooks
- Tests that require mounting components
- Inability to mock infrastructure without complex setup
- Integration tests as the primary verification method

**Recommended Pattern:**

```typescript
// Good: Testable Logic
describe('Feature Logic', () => {
  it('handles complete user journey', () => {
    const mockDriver = createMockDriver()
    const state = reducer(initialState, { type: 'START' })

    // Simulate entire flow without React
    const state2 = reducer(state, { type: 'SUBMIT', data: {...} })
    const state3 = reducer(state2, { type: 'SUCCESS' })

    expect(state3.status).toBe('completed')
  })
})
```

## The Litmus Test

**"If I delete the UI layer and replace the Network layer with a Mock, can I still run the entire business process in a console script?"**

- **If Yes**: Your architecture is solid. Logic is decoupled from UI and infrastructure.
- **If No**: Your logic is leaked into the UI or Infrastructure. Refactor to extract business logic.

## Application Workflow

When analyzing or designing a feature:

### Step 1: Initial Assessment

Ask the user to describe the feature and its requirements. Then walk through each principle:

1. "Let's identify the source of truth for this feature..."
2. "Now let's think about side effects and control flow..."
3. "What infrastructure layers will we need?"
4. "How will we handle lifecycle and concurrency?"
5. "How will we test this?"

### Step 2: Architecture Review

For each principle, analyze the proposed/existing architecture:

- Identify violations or risks
- Suggest improvements
- Provide examples from the codebase or reference implementations

### Step 3: Litmus Test

Apply the litmus test:
- Can the logic run headlessly?
- Can we serialize the complete state?
- Is cleanup deterministic?

### Step 4: Documentation

Document the architectural decisions:
- Which component owns the state?
- What are the commands/events?
- What are the drivers and their interfaces?
- How is lifecycle managed?
- What tests verify the logic?

## Tips for Effective Analysis

**When to Push Back:**

- If multiple components are proposed as state owners
- If business logic is being added to API/driver code
- If useEffect chains are being created
- If cleanup is an afterthought

**When to Approve:**

- Clear single source of truth
- Intent-based command architecture
- Dumb drivers with clean interfaces
- Deterministic cleanup
- Headless testability

**Communication:**

- Be direct about violations
- Explain the risk clearly
- Provide concrete alternatives
- Reference existing patterns in the codebase
- Use the litmus test as the final arbiter

## Integration with Other Skills

This skill works well with:

- **TDD Test Writer**: Use first-principle analysis to design testable architecture, then use TDD to implement
- **Code Explorer**: Analyze existing code against these principles to identify refactoring opportunities
- **Code Architect**: Apply these principles when designing new feature architectures

## Examples

### Example 1: Audio Player Feature

**Bad Architecture:**
```typescript
function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(new Audio())

  useEffect(() => {
    if (isPlaying) {
      audioRef.current.play() // Reactive side effect
    }
  }, [isPlaying])

  return <button onClick={() => setIsPlaying(true)}>Play</button>
}
```

**Violations:**
- State change triggers effect (reactive, not intent-based)
- No cleanup on unmount
- Audio driver manages its own state
- Can't test without React

**Good Architecture:**
```typescript
// Driver (dumb)
class AudioDriver {
  play(url: string): void
  pause(): void
  dispose(): void
}

// Logic (pure)
function reducer(state, event) {
  switch (event.type) {
    case 'PLAY_REQUESTED':
      return { ...state, status: 'playing', command: { type: 'PLAY', url: event.url } }
    case 'PAUSE_REQUESTED':
      return { ...state, status: 'paused', command: { type: 'PAUSE' } }
  }
}

// UI (thin)
function AudioPlayer() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const driverRef = useRef(new AudioDriver())

  useEffect(() => {
    if (state.command?.type === 'PLAY') {
      driverRef.current.play(state.command.url)
    }
  }, [state.command])

  useEffect(() => () => driverRef.current.dispose(), [])

  return <button onClick={() => dispatch({ type: 'PLAY_REQUESTED' })}>Play</button>
}
```

**Passes Litmus Test:**
```typescript
// Can test without React
const state1 = reducer(initialState, { type: 'PLAY_REQUESTED', url: 'test.mp3' })
expect(state1.status).toBe('playing')
expect(state1.command).toEqual({ type: 'PLAY', url: 'test.mp3' })
```
