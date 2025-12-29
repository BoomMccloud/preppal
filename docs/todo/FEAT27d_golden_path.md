# FEAT27d: Golden Path Architecture

## Current Problems (Confirmed by User Testing)

**Issue 1: Microphone doesn't turn off when clicking "End Interview"**
- Root cause: Direct `driver.disconnect()` call bypasses reducer
- Missing `STOP_AUDIO` command generation

**Issue 2: Timer discrepancy (Question: 1:00, Block: 0:40)**
- Root cause: Split Brain - two reducer instances calculating timers independently
- Each reducer has its own `blockStartTime` and `answerStartTime`
- When one reducer transitions to `ANSWER_TIMEOUT_PAUSE`, the other doesn't know
- Result: Timers drift out of sync (20 seconds lost)

**Issue 3: State not centralized**
- Two reducer instances (BlockSession.tsx:90, SessionContent.tsx:122)
- Each maintains separate state, leading to inconsistencies

**Issue 4: Timers keep counting during connection errors**
- Root cause: `connectionState` and `status` are independent
- When `CONNECTION_ERROR` occurs:
  - `connectionState` = "error" (connection layer)
  - `status` = "ANSWERING" (session layer) ← Still active!
  - TICK events keep firing and processing
- Result: Timers count down even when error screen is shown
- **This is a state machine design flaw**

---

## Golden Path: Single Source of Truth

### Principle

**Everything derives from centralized state + current time**

```
┌─────────────────────────────────────────────────────────────┐
│ Page Component (Single Reducer Instance)                    │
│                                                              │
│ State (Source of Truth):                                    │
│   - status: "ANSWERING"                                     │
│   - blockStartTime: 1735502400000 (timestamp)               │
│   - answerStartTime: 1735502450000 (timestamp)              │
│   - elapsedTime: 120 (seconds)                              │
│   - blockIndex: 0                                           │
│   - pauseStartedAt?: timestamp                              │
│   - transcript: [...]                                       │
│   - isAiSpeaking: false                                     │
│                                                              │
│ Derived Values (calculated in render):                      │
│   const now = Date.now()                                    │
│   blockTimeRemaining = getRemainingSeconds(                 │
│     state.blockStartTime,                                   │
│     blockDuration,                                          │
│     now                                                     │
│   )                                                         │
│   answerTimeRemaining = getRemainingSeconds(                │
│     state.answerStartTime,                                  │
│     answerTimeLimit,                                        │
│     now                                                     │
│   )                                                         │
│                                                              │
│ ⚠️ CRITICAL: Calculations happen in ONE place only!         │
└─────────────────────────────────────────────────────────────┘
          │
          ├─ Pass state + dispatch to BlockSession
          │
          └─ Pass state + dispatch to SessionContent
```

---

## State Shape (Source of Truth)

### Core State Fields

```typescript
type SessionState = {
  // Status (state machine)
  status:
    | "WAITING_FOR_CONNECTION"
    | "ANSWERING"
    | "ANSWER_TIMEOUT_PAUSE"
    | "BLOCK_COMPLETE_SCREEN"
    | "INTERVIEW_COMPLETE"

  // Timestamps (absolute, never change once set)
  blockStartTime: number          // When current block started (ms)
  answerStartTime: number         // When current question started (ms)
  pauseStartedAt?: number         // When pause started (for ANSWER_TIMEOUT_PAUSE)

  // Block tracking
  blockIndex: number              // Current block index (0-based)
  completedBlockIndex?: number    // Last completed block (for transition screen)

  // Time tracking
  elapsedTime: number             // Total session time in seconds (for display only)

  // Connection state
  connectionState: "initializing" | "connecting" | "live" | "ending" | "error"

  // Transcript
  transcript: TranscriptEntry[]
  pendingUser: string
  pendingAI: string

  // Audio state
  isAiSpeaking: boolean

  // Error
  error: string | null
}
```

### Key Principles

1. **Timestamps are absolute** - They never change once set
   - `blockStartTime` set when block starts, never modified
   - `answerStartTime` reset when answer timer resets
   - Always use `Date.now()` when setting, never increment

2. **Derived values are calculated** - Never stored in state
   - `blockTimeRemaining` = calculated from `blockStartTime` + `now`
   - `answerTimeRemaining` = calculated from `answerStartTime` + `now`
   - Calculation happens in ONE place (page component or helper)

3. **elapsedTime is for display only** - Not used for logic
   - Incremented every second for showing total session duration
   - Never used for timer calculations (use timestamps instead)

---

## Golden Path Flow

### 1. Block Starts

```typescript
// Event: CONNECTION_READY or USER_CLICKED_CONTINUE
case "CONNECTION_READY":
  return {
    state: {
      status: "ANSWERING",
      blockIndex: event.initialBlockIndex,
      blockStartTime: now,        // ← Absolute timestamp
      answerStartTime: now,       // ← Absolute timestamp
      elapsedTime: 0,
      // ... other fields
    },
    commands: [{ type: "START_CONNECTION", blockNumber: ... }]
  }
```

**Key:** Timestamps are set ONCE using `now` parameter

### 2. Timer Display (Every Render)

```typescript
// Page component (or helper function)
function calculateTimers(state: SessionState, context: ReducerContext) {
  const now = Date.now()

  const blockTimeRemaining = getRemainingSeconds(
    state.blockStartTime,
    context.blockDuration,
    now
  )

  const answerTimeRemaining = state.status === "ANSWER_TIMEOUT_PAUSE"
    ? 0
    : getRemainingSeconds(
        state.answerStartTime,
        context.answerTimeLimit,
        now
      )

  return { blockTimeRemaining, answerTimeRemaining }
}

// In render:
const { blockTimeRemaining, answerTimeRemaining } = calculateTimers(state, context)

// Pass to children:
<BlockSession
  state={state}
  dispatch={dispatch}
  blockTimeRemaining={blockTimeRemaining}   // ← Derived, not from state
  answerTimeRemaining={answerTimeRemaining} // ← Derived, not from state
/>
```

**Key:** Calculation happens ONCE at page level, passed down to children

### 3. Timer Checks (Every Tick)

```typescript
// Event: TICK (every 100ms)
case "TICK":
  // Check block limit first
  if (isTimeUp(state.blockStartTime, context.blockDuration, now)) {
    return {
      state: {
        ...state,
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: state.blockIndex,
      },
      commands: []
    }
  }

  // Check answer limit second
  if (isTimeUp(state.answerStartTime, context.answerTimeLimit, now)) {
    return {
      state: {
        ...state,
        status: "ANSWER_TIMEOUT_PAUSE",
        pauseStartedAt: now,              // ← New timestamp
      },
      commands: [{ type: "MUTE_MIC" }]
    }
  }

  return { state, commands: [] }
```

**Key:** Use `isTimeUp()` utility with timestamps, never compare elapsed values

### 4. Answer Timer Reset

```typescript
// Event: TICK (during ANSWER_TIMEOUT_PAUSE)
case "TICK":
  const pauseElapsed = now - state.pauseStartedAt

  if (pauseElapsed >= ANSWER_TIMEOUT_PAUSE_DURATION_MS) {
    return {
      state: {
        ...state,
        status: "ANSWERING",
        answerStartTime: now,             // ← Reset to current time
      },
      commands: [{ type: "UNMUTE_MIC" }]
    }
  }

  return { state, commands: [] }
```

**Key:** Reset `answerStartTime` to `now`, don't increment

### 5. Connection Error (New: Fix Issue #4)

```typescript
// Event: CONNECTION_ERROR (from driver)
case "CONNECTION_ERROR":
  return {
    state: {
      ...state,
      status: "INTERVIEW_COMPLETE",     // ← Transition session state too
      connectionState: "error",
      error: event.error,
      // Timestamps frozen (no more TICK processing)
    },
    commands: [
      { type: "STOP_AUDIO" },           // ← Clean up audio
      { type: "CLOSE_CONNECTION" }      // ← Ensure connection closes
    ]
  }
```

**Key:** Error should end the session, not just mark connection as error

**Why this matters:**
- Before: `connectionState = "error"` but `status = "ANSWERING"` → TICK keeps processing
- After: `status = "INTERVIEW_COMPLETE"` → TICK is ignored, timers stop

### 6. User Ends Interview

```typescript
// Event: INTERVIEW_ENDED (from button click)
case "INTERVIEW_ENDED":
  // Guard: Only allow from valid states
  if (state.status !== "ANSWERING" && state.status !== "ANSWER_TIMEOUT_PAUSE") {
    console.warn('Ignoring INTERVIEW_ENDED: invalid state', state.status)
    return { state, commands: [] }
  }

  return {
    state: {
      ...state,
      status: "INTERVIEW_COMPLETE",
      // Timestamps remain frozen
      // elapsedTime remains frozen
    },
    commands: [
      { type: "STOP_AUDIO" },
      { type: "CLOSE_CONNECTION" }
    ]
  }
```

**Key:** Generate commands, freeze state (no more TICK processing)

### 7. TICK After Interview Ends or Error

```typescript
// Event: TICK (when status = INTERVIEW_COMPLETE)
case "TICK":
  // Early return: Don't update anything if interview is complete
  if (state.status === "INTERVIEW_COMPLETE") {
    return { state, commands: [] }
  }

  // ... rest of tick logic
```

**Key:** Timers stop because TICK is ignored (works for both user-ended and error scenarios)

---

## Why This Fixes Everything

### ✅ Fixes Timer Discrepancy

**Before (Split Brain):**
```
BlockSession reducer:
  blockStartTime: 1735502400000
  answerStartTime: 1735502450000

SessionContent reducer:
  blockStartTime: 1735502400000  // Same initially
  answerStartTime: 1735502470000 // ❌ Different! (Reset at different time)

Result: Timers show different values (1:00 vs 0:40)
```

**After (Single Source):**
```
Page reducer (single instance):
  blockStartTime: 1735502400000
  answerStartTime: 1735502450000

Both components calculate from same state:
  blockTimeRemaining = getRemainingSeconds(1735502400000, 600, now)
  answerTimeRemaining = getRemainingSeconds(1735502450000, 120, now)

Result: Timers always match ✅
```

### ✅ Fixes Microphone Not Turning Off

**Before:**
```typescript
// SessionContent button:
onClick={() => driver.disconnect()}

// Bypasses reducer, no STOP_AUDIO command
```

**After:**
```typescript
// SessionContent button:
onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}

// Reducer generates commands:
commands: [
  { type: "STOP_AUDIO" },      // ← Stops microphone
  { type: "CLOSE_CONNECTION" }  // ← Closes WebSocket
]
```

### ✅ Fixes Zombie Timers

**Before:**
```
BlockSession reducer: status = "ANSWERING" (keeps ticking)
SessionContent reducer: status = "INTERVIEW_COMPLETE" (stopped)
```

**After:**
```
Page reducer: status = "INTERVIEW_COMPLETE"

TICK handler:
  if (state.status === "INTERVIEW_COMPLETE") {
    return { state, commands: [] }  // No updates
  }

Result: Timer stops immediately ✅
```

### ✅ Fixes Timers During Connection Errors

**Before:**
```
CONNECTION_ERROR event:
  connectionState = "error"
  status = "ANSWERING"  // ❌ Still active!

TICK handler:
  switch (state.status) {
    case "ANSWERING":
      // Still processing, timers keep counting ❌
  }

Result: Error screen shown but timers still running
```

**After:**
```
CONNECTION_ERROR event:
  status = "INTERVIEW_COMPLETE"  // ✅ Session ends
  connectionState = "error"
  commands: [STOP_AUDIO, CLOSE_CONNECTION]

TICK handler:
  if (state.status === "INTERVIEW_COMPLETE") {
    return { state, commands: [] }  // No processing ✅
  }

Result: Error screen shown, timers frozen, audio stopped ✅
```

---

## Implementation Rules

### Rule 1: Single Reducer Instance

```typescript
// ✅ CORRECT: Page level (single instance)
export default function SessionPage({ params }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState, context)

  return interview.isBlockBased
    ? <BlockSession state={state} dispatch={dispatch} />
    : <SessionContent state={state} dispatch={dispatch} />
}

// ❌ WRONG: Multiple instances
function BlockSession() {
  const [state, dispatch] = useReducer(sessionReducer, initialState)  // Instance #1
}

function SessionContent() {
  const [state, dispatch] = useReducer(sessionReducer, initialState)  // Instance #2
}
```

### Rule 2: Calculate Timers Once

```typescript
// ✅ CORRECT: Calculate at top level, pass down
function SessionPage() {
  const [state, dispatch] = useReducer(...)

  const timers = calculateTimers(state, context)  // ← ONE calculation

  return <BlockSession state={state} timers={timers} />
}

// ❌ WRONG: Calculate in multiple places
function BlockSession({ state }) {
  const now = Date.now()
  const blockTimeRemaining = getRemainingSeconds(...)  // Calculation #1
}

function SessionContent({ state }) {
  const now = Date.now()
  const answerTimeRemaining = getRemainingSeconds(...)  // Calculation #2
}
```

### Rule 3: Timestamps Are Absolute

```typescript
// ✅ CORRECT: Set timestamp once, never modify
return {
  state: {
    ...state,
    blockStartTime: now,  // Set once
  }
}

// Later:
if (isTimeUp(state.blockStartTime, limit, now)) {
  // Check against original timestamp
}

// ❌ WRONG: Increment or modify timestamps
return {
  state: {
    ...state,
    blockStartTime: state.blockStartTime + 1000,  // ❌ Never do this
  }
}
```

### Rule 4: elapsedTime Is Display-Only

```typescript
// ✅ CORRECT: Use for display
<div>Session Duration: {formatTime(state.elapsedTime)}</div>

// ❌ WRONG: Use for timer logic
if (state.elapsedTime >= 600) {  // ❌ Use timestamps instead
  // transition to complete
}

// ✅ CORRECT: Use timestamps for logic
if (isTimeUp(state.blockStartTime, 600, now)) {
  // transition to complete
}
```

### Rule 5: Commands for Side Effects

```typescript
// ✅ CORRECT: Generate commands
case "INTERVIEW_ENDED":
  return {
    state: { ...state, status: "INTERVIEW_COMPLETE" },
    commands: [
      { type: "STOP_AUDIO" },
      { type: "CLOSE_CONNECTION" }
    ]
  }

// ❌ WRONG: Direct driver calls
case "INTERVIEW_ENDED":
  driver.stopAudio()      // ❌ Reducer shouldn't touch driver
  driver.disconnect()     // ❌ Violates "Dumb Driver" pattern
  return { state: { ...state, status: "INTERVIEW_COMPLETE" } }
```

---

## Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│ User Action: Click "End Interview"                            │
└───────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ dispatch({ type: "INTERVIEW_ENDED" })                         │
└───────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Reducer (Pure Function)                                       │
│                                                                │
│ Input:                                                         │
│   state = { status: "ANSWERING", blockStartTime: ..., ... }   │
│   event = { type: "INTERVIEW_ENDED" }                         │
│   context = { blockDuration: 600, answerTimeLimit: 120 }      │
│   now = 1735502500000                                         │
│                                                                │
│ Logic:                                                         │
│   - Check state machine guard (valid transition?)             │
│   - Transition status to "INTERVIEW_COMPLETE"                 │
│   - Freeze timestamps (no changes)                            │
│   - Generate commands: [STOP_AUDIO, CLOSE_CONNECTION]         │
│                                                                │
│ Output:                                                        │
│   {                                                            │
│     state: { status: "INTERVIEW_COMPLETE", ... },             │
│     commands: [                                               │
│       { type: "STOP_AUDIO" },                                 │
│       { type: "CLOSE_CONNECTION" }                            │
│     ]                                                          │
│   }                                                            │
└───────────────────────────────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ State Update            │  │ Command Execution       │
│                         │  │                         │
│ state = newState        │  │ for (cmd of commands) { │
│                         │  │   switch (cmd.type) {   │
│ Triggers re-render:     │  │     case "STOP_AUDIO":  │
│ - BlockSession          │  │       driver.stopAudio()│
│ - SessionContent        │  │       break             │
│                         │  │     case "CLOSE_..."    │
│ Components read:        │  │       driver.disconnect │
│ - state.status          │  │   }                     │
│ - Calculate timers      │  │ }                       │
│   from timestamps       │  │                         │
└─────────────────────────┘  └─────────────────────────┘
                │                     │
                │                     ▼
                │            ┌─────────────────────────┐
                │            │ Driver (Dumb)           │
                │            │                         │
                │            │ stopAudio():            │
                │            │   - Stop mic stream     │
                │            │   - Release resources   │
                │            │                         │
                │            │ disconnect():           │
                │            │   - Send EndRequest     │
                │            │   - Close WebSocket     │
                │            └─────────────────────────┘
                │                     │
                │                     ▼
                │            ┌─────────────────────────┐
                │            │ onConnectionClose       │
                │            │ callback fires          │
                │            └─────────────────────────┘
                │                     │
                ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│ UI Updates:                                                    │
│                                                                │
│ BlockSession:                                                  │
│   - Timer stops (status = COMPLETE, no more TICK processing)  │
│   - "End Interview" button disabled                           │
│                                                                │
│ SessionContent:                                                │
│   - Navigation to feedback page                               │
│   - Microphone indicator OFF                                  │
│                                                                │
│ Result: Clean, deterministic shutdown ✅                       │
└───────────────────────────────────────────────────────────────┘
```

---

## Testing the Golden Path

### Unit Test: Reducer Logic

```typescript
describe('Golden Path: Timer Calculations', () => {
  it('derives timers from absolute timestamps', () => {
    const now = 1735502500000
    const state: SessionState = {
      status: "ANSWERING",
      blockStartTime: 1735502400000,    // 100 seconds ago
      answerStartTime: 1735502480000,   // 20 seconds ago
      // ...
    }

    const context = {
      blockDuration: 600,      // 10 minutes
      answerTimeLimit: 120,    // 2 minutes
    }

    // Calculate timers
    const blockRemaining = getRemainingSeconds(
      state.blockStartTime,
      context.blockDuration,
      now
    )
    const answerRemaining = getRemainingSeconds(
      state.answerStartTime,
      context.answerTimeLimit,
      now
    )

    expect(blockRemaining).toBe(500)  // 600 - 100 = 500 seconds
    expect(answerRemaining).toBe(100) // 120 - 20 = 100 seconds
  })

  it('freezes timers when interview ends', () => {
    const state: SessionState = {
      status: "ANSWERING",
      blockStartTime: 1735502400000,
      answerStartTime: 1735502450000,
      elapsedTime: 120,
    }

    const result = sessionReducer(
      state,
      { type: "INTERVIEW_ENDED" },
      context,
      1735502500000
    )

    expect(result.state.status).toBe("INTERVIEW_COMPLETE")
    expect(result.state.blockStartTime).toBe(1735502400000)  // Unchanged
    expect(result.state.answerStartTime).toBe(1735502450000) // Unchanged
    expect(result.state.elapsedTime).toBe(120)               // Frozen

    // TICK should be ignored
    const afterTick = sessionReducer(
      result.state,
      { type: "TICK" },
      context,
      1735502600000  // 100 seconds later
    )

    expect(afterTick.state).toBe(result.state)  // No changes
    expect(afterTick.commands).toEqual([])       // No commands
  })
})
```

### Integration Test: Full Flow

```typescript
describe('Golden Path: User Ends Interview', () => {
  it('stops timers and closes connection cleanly', async () => {
    const mockDriver = createMockDriver()
    let state = initialState

    // 1. Start interview
    state = reducer(state, { type: "CONNECTION_READY", initialBlockIndex: 0 }, context, 1000).state
    expect(state.status).toBe("ANSWERING")
    expect(state.blockStartTime).toBe(1000)

    // 2. Simulate time passing (50 seconds)
    const timers = calculateTimers(state, context, 51000)
    expect(timers.blockTimeRemaining).toBe(590)  // 600 - 10 = 590

    // 3. User clicks "End Interview"
    const result = reducer(state, { type: "INTERVIEW_ENDED" }, context, 51000)
    expect(result.state.status).toBe("INTERVIEW_COMPLETE")
    expect(result.commands).toContainEqual({ type: "STOP_AUDIO" })
    expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" })

    // 4. Execute commands
    result.commands.forEach(cmd => {
      if (cmd.type === "STOP_AUDIO") mockDriver.stopAudio()
      if (cmd.type === "CLOSE_CONNECTION") mockDriver.disconnect()
    })

    expect(mockDriver.audioStopped).toBe(true)
    expect(mockDriver.disconnected).toBe(true)

    // 5. Verify timers are frozen
    const finalTimers = calculateTimers(result.state, context, 100000)  // Much later
    expect(finalTimers.blockTimeRemaining).toBe(590)  // Still 590, not changing
  })
})
```

### Manual Test: Visual Verification

```
1. Start block-based interview
2. Verify both timers are visible and counting down
3. Wait for question timer to reach 1:00
4. Verify block timer shows correct time (e.g., 9:00)
5. Click "End Interview"
6. Verify:
   ✅ Both timers stop immediately (no zombie tick)
   ✅ Microphone indicator turns OFF
   ✅ Navigation to feedback page happens
   ✅ No errors in console
```

---

## Migration Checklist

### Phase 1: Lift State
- [ ] Create page-level reducer instance
- [ ] Pass state + dispatch to BlockSession
- [ ] Pass state + dispatch to SessionContent

### Phase 2: Remove Duplicate Reducers
- [ ] Remove BlockSession's local reducer
- [ ] Make SessionContent backward compatible (controlled mode)

### Phase 3: Centralize Timer Calculations
- [ ] Create `calculateTimers()` helper at page level
- [ ] Pass calculated timers to BlockSession
- [ ] Remove timer calculations from BlockSession

### Phase 4: Implement INTERVIEW_ENDED
- [ ] Add state machine guards in reducer
- [ ] Generate STOP_AUDIO + CLOSE_CONNECTION commands
- [ ] Update button to dispatch INTERVIEW_ENDED event

### Phase 5: Freeze Timers
- [ ] Update TICK handler to ignore when INTERVIEW_COMPLETE
- [ ] Update TIMER_TICK to ignore when INTERVIEW_COMPLETE

### Phase 6: Test
- [ ] Unit tests for reducer logic
- [ ] Integration tests for full flow
- [ ] Manual testing with real interview

---

## Success Criteria

- [ ] **Single reducer instance** (one source of truth)
- [ ] **Timer calculations happen once** (at page level)
- [ ] **Timers match exactly** (no more discrepancies)
- [ ] **Microphone turns off** when ending interview
- [ ] **Timers stop immediately** when ending interview (no zombie state)
- [ ] **Timers stop immediately** when connection error occurs (Issue #4)
- [ ] **Audio stops** when connection error occurs
- [ ] **All derived from state + now** (no hidden state)
- [ ] **Timestamps are absolute** (never modified after setting)
- [ ] **Commands for all side effects** (no direct driver calls)

---

## Final Architecture

```
SessionPage (Container)
├─ Single useReducer instance
├─ Calculate timers from state + now
├─ Execute commands (driver.stopAudio, driver.disconnect)
├─ Handle navigation on INTERVIEW_COMPLETE
│
├─ If block-based:
│  └─ <BlockSession
│       state={state}
│       dispatch={dispatch}
│       timers={timers}
│     />
│      └─ <SessionContent
│           state={state}
│           dispatch={dispatch}
│         />
│
└─ If simple:
   └─ <SessionContent
        state={state}
        dispatch={dispatch}
      />
```

**Result: Clean, testable, bug-free architecture ✅**
