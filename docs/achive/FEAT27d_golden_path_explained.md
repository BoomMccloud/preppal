# Golden Path Architecture - Explained Simply

## What Is The Golden Path?

**Golden Path = Single Source of Truth + Pure Derivations + Intent-Based Commands**

Think of it like a clock:
- The **clock mechanism** (reducer) stores ONE time value
- The **hour hand, minute hand, second hand** are all calculated from that one value
- You never set the hands directly - you set the time, and the hands derive their position

```
┌─────────────────────────────────────────────────────────┐
│                    GOLDEN PATH                          │
│                                                         │
│  Source of Truth (State)                               │
│  ┌─────────────────────────────────────┐              │
│  │ status: "ANSWERING"                 │              │
│  │ blockStartTime: 1735502400000       │  ← ONE value │
│  │ answerStartTime: 1735502450000      │              │
│  └─────────────────────────────────────┘              │
│                    │                                    │
│                    │ Calculate from state + now        │
│                    ▼                                    │
│  Derived Values (Computed every render)               │
│  ┌─────────────────────────────────────┐              │
│  │ blockTimeRemaining = calculate()    │  ← Derived   │
│  │ answerTimeRemaining = calculate()   │  ← Derived   │
│  └─────────────────────────────────────┘              │
│                                                         │
│  Key: Calculate once, pass to all children            │
└─────────────────────────────────────────────────────────┘
```

---

## Current Broken Architecture

Let me show you what's broken right now:

```
┌──────────────────────────────────────────────────────────┐
│                  CURRENT (BROKEN)                        │
│                                                          │
│  BlockSession Component                                 │
│  ┌────────────────────────────────────┐                │
│  │ Reducer Instance #1                │                │
│  │ blockStartTime: 1735502400000      │                │
│  │ answerStartTime: 1735502450000     │                │
│  │                                     │                │
│  │ Calculate timers:                  │                │
│  │ blockTimeRemaining = 590 seconds   │                │
│  │ answerTimeRemaining = 70 seconds   │                │
│  └────────────────────────────────────┘                │
│            │                                             │
│            │ Renders child ▼                            │
│  ┌────────────────────────────────────┐                │
│  │ SessionContent Component           │                │
│  │ ┌────────────────────────────────┐ │                │
│  │ │ Reducer Instance #2            │ │                │
│  │ │ blockStartTime: 1735502400000  │ │ ← Same initial│
│  │ │ answerStartTime: 1735502470000 │ │ ← DIFFERENT!  │
│  │ │                                 │ │                │
│  │ │ Calculate timers:              │ │                │
│  │ │ answerTimeRemaining = 50 sec   │ │ ← WRONG!      │
│  │ └────────────────────────────────┘ │                │
│  └────────────────────────────────────┘                │
│                                                          │
│  Result: SPLIT BRAIN                                    │
│  - BlockSession shows: 1:10                             │
│  - SessionContent shows: 0:50                           │
│  - 20 seconds lost!                                     │
└──────────────────────────────────────────────────────────┘
```

**Why they drift:**
1. SessionContent's reducer handles `ANSWER_TIMEOUT` at time X
2. Resets `answerStartTime = Date.now()` (let's say 1735502470000)
3. **BlockSession's reducer never knows this happened**
4. BlockSession still has `answerStartTime = 1735502450000` (20 seconds earlier)
5. Result: 20-second discrepancy

---

## How Golden Path Fixes Issue #1: Microphone Stays On

### Current (Broken)

```
User clicks "End Interview"
  │
  ▼
onClick={() => driver.disconnect()}  ← Direct call, bypasses reducer
  │
  ▼
Driver closes WebSocket
  │
  ▼
❌ No STOP_AUDIO command
❌ Microphone stays on
```

**Problem:** Imperative approach - we tell the driver what to do directly, skipping the state machine.

### Golden Path (Fixed)

```
User clicks "End Interview"
  │
  ▼
onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}  ← Intent
  │
  ▼
Reducer processes event:
  case "INTERVIEW_ENDED":
    return {
      state: { status: "INTERVIEW_COMPLETE" },
      commands: [
        { type: "STOP_AUDIO" },         ← Generated!
        { type: "CLOSE_CONNECTION" }
      ]
    }
  │
  ▼
Command Executor:
  driver.stopAudio()      ← Microphone off ✅
  driver.disconnect()     ← Connection closes ✅
```

**Solution:** Intent-based approach - we declare what the user wants, reducer decides consequences.

**Key Principle:**
```
Imperative:  "Do X"           → Direct driver call
Intent-Based: "User wants Y"  → Reducer decides what to do
```

---

## How Golden Path Fixes Issue #2: Timer Discrepancy (1:00 vs 0:40)

### Current (Broken)

```
Time: 0 seconds
  BlockSession reducer:     answerStartTime = 1000
  SessionContent reducer:   answerStartTime = 1000
  Both show: 2:00 ✅

Time: 120 seconds (answer timeout occurs)
  SessionContent reducer handles ANSWER_TIMEOUT:
    answerStartTime = 121000  ← Reset

  BlockSession reducer:       answerStartTime = 1000  ← Still old!

  SessionContent calculates:  2:00 remaining ✅
  BlockSession calculates:    0:00 remaining ❌

  DISCREPANCY: 2:00 minutes lost!
```

**Why:** Two reducers, each with their own `answerStartTime`, processing events independently.

### Golden Path (Fixed)

```
Time: 0 seconds
  Page reducer: answerStartTime = 1000

  Calculate once at page level:
    answerTimeRemaining = getRemainingSeconds(1000, 120, now)

  Pass to children:
    <BlockSession timers={{ answer: 120, block: 600 }} />
    <SessionContent timers={{ answer: 120, block: 600 }} />

  Both show: 2:00 ✅

Time: 120 seconds (answer timeout occurs)
  Page reducer handles ANSWER_TIMEOUT:
    answerStartTime = 121000  ← Reset in ONE place

  Calculate once at page level:
    answerTimeRemaining = getRemainingSeconds(121000, 120, now)

  Pass to children:
    <BlockSession timers={{ answer: 120, block: ... }} />
    <SessionContent timers={{ answer: 120, block: ... }} />

  Both show: 2:00 ✅ ALWAYS IN SYNC
```

**Solution:** One reducer, one calculation, pass down to children.

**Key Principle:**
```
Split Brain:   Multiple reducers → Multiple calculations → Drift
Golden Path:   One reducer → One calculation → Always consistent
```

---

## How Golden Path Fixes Issue #3: State Not Centralized

### Current (Broken): Component Tree

```
BlockSession
├─ useReducer() ← Instance #1
├─ Calculate timers from local state
├─ Render timer overlay
└─ Render child:
    SessionContent
    ├─ useReducer() ← Instance #2
    ├─ Calculate from local state
    └─ Render "End Interview" button
```

**Problems:**
- Two independent state machines
- No communication between them
- Events in one don't affect the other
- Each makes independent decisions

### Golden Path (Fixed): Component Tree

```
SessionPage (Container)
├─ useReducer() ← SINGLE INSTANCE
├─ calculateTimers(state, now) ← ONE CALCULATION
├─ useCommandExecutor(commands) ← EXECUTES COMMANDS
│
├─ If block-based:
│   └─ <BlockSession
│        state={state}
│        dispatch={dispatch}
│        timers={timers}
│      />
│       └─ <SessionContent
│            state={state}
│            dispatch={dispatch}
│          />
│
└─ If simple:
    └─ <SessionContent
         state={state}
         dispatch={dispatch}
       />
```

**Solutions:**
- ✅ One reducer instance (single source of truth)
- ✅ One calculation (consistent timers)
- ✅ Commands executed at top level (centralized side effects)
- ✅ Children are "dumb" presentation components

**Key Principle:**
```
Container Pattern:
  Parent:   Smart (state, logic, calculations)
  Children: Dumb (display, events)
```

---

## How Golden Path Fixes Issue #4: Timers During Errors

### Current (Broken)

```
Connection error occurs
  │
  ▼
CONNECTION_ERROR event
  │
  ▼
Reducer updates:
  connectionState = "error"     ← Connection layer
  status = "ANSWERING"          ← Session layer (unchanged!)
  │
  ▼
TICK events keep firing (every 100ms)
  │
  ▼
TICK handler:
  switch (state.status) {
    case "ANSWERING":           ← Still matches!
      // Check timers ❌
      // Update timers ❌
  }
  │
  ▼
UI shows error screen BUT timers keep counting ❌
```

**Problem:** Two independent state fields (`connectionState` vs `status`) not coordinated.

### Golden Path (Fixed)

```
Connection error occurs
  │
  ▼
CONNECTION_ERROR event
  │
  ▼
Reducer updates:
  status = "INTERVIEW_COMPLETE"     ← Session ENDS
  connectionState = "error"
  commands = [STOP_AUDIO, CLOSE_CONNECTION]
  │
  ▼
TICK events keep firing (every 100ms)
  │
  ▼
TICK handler:
  if (state.status === "INTERVIEW_COMPLETE") {
    return { state, commands: [] }  ← Early return!
  }
  // Never reaches timer logic ✅
  │
  ▼
UI shows error screen AND timers frozen ✅
Audio stopped ✅
```

**Solution:** Connection errors transition session state to complete.

**Key Principle:**
```
Incomplete State Transition:
  Error → connectionState changes → status unchanged → Keep processing

Complete State Transition:
  Error → status = "INTERVIEW_COMPLETE" → All processing stops
```

---

## The Core Principles of Golden Path

### 1. Single Source of Truth

```typescript
// ❌ WRONG: Multiple sources
function BlockSession() {
  const [state, dispatch] = useReducer(...)  // Source #1
}

function SessionContent() {
  const [state, dispatch] = useReducer(...)  // Source #2
}

// ✅ CORRECT: Single source
function SessionPage() {
  const [state, dispatch] = useReducer(...)  // ONE source

  return <BlockSession state={state} dispatch={dispatch} />
}
```

### 2. Timestamps Are Absolute (Never Incremented)

```typescript
// ❌ WRONG: Increment timestamps
state.blockStartTime = state.blockStartTime + 1000

// ✅ CORRECT: Set once, calculate elapsed
state.blockStartTime = Date.now()  // Set once

// Later, calculate:
const elapsed = (Date.now() - state.blockStartTime) / 1000
```

### 3. Derived Values Are Calculated (Never Stored)

```typescript
// ❌ WRONG: Store calculated values in state
state.blockTimeRemaining = 590  // Don't store this!

// ✅ CORRECT: Calculate from timestamps
const blockTimeRemaining = getRemainingSeconds(
  state.blockStartTime,
  context.blockDuration,
  Date.now()
)
```

### 4. Calculate Once, Pass Down

```typescript
// ❌ WRONG: Calculate in multiple places
function BlockSession({ state }) {
  const timers = calculateTimers(state)  // Calculation #1
}

function SessionContent({ state }) {
  const timers = calculateTimers(state)  // Calculation #2 (might differ!)
}

// ✅ CORRECT: Calculate once at top level
function SessionPage() {
  const [state] = useReducer(...)
  const timers = calculateTimers(state)  // ONE calculation

  return (
    <BlockSession state={state} timers={timers} />
  )
}
```

### 5. Intent-Based Commands (Not Direct Calls)

```typescript
// ❌ WRONG: Direct driver calls
onClick={() => {
  driver.stopAudio()
  driver.disconnect()
}}

// ✅ CORRECT: Dispatch intent, reducer generates commands
onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}

// Reducer:
case "INTERVIEW_ENDED":
  return {
    state: { status: "INTERVIEW_COMPLETE" },
    commands: [
      { type: "STOP_AUDIO" },
      { type: "CLOSE_CONNECTION" }
    ]
  }
```

---

## Visual Summary: How Golden Path Fixes Everything

```
┌────────────────────────────────────────────────────────────────────┐
│                         GOLDEN PATH FLOW                           │
│                                                                    │
│  1. User Action                                                   │
│     Click "End Interview"                                         │
│          │                                                         │
│          ▼                                                         │
│  2. Dispatch Intent                                               │
│     dispatch({ type: "INTERVIEW_ENDED" })                         │
│          │                                                         │
│          ▼                                                         │
│  3. Reducer Processes (Pure Function)                            │
│     ┌─────────────────────────────────────────┐                  │
│     │ Input:                                  │                  │
│     │   state = { status: "ANSWERING", ... }  │                  │
│     │   event = { type: "INTERVIEW_ENDED" }   │                  │
│     │                                          │                  │
│     │ Logic:                                   │                  │
│     │   - Check guards (valid state?)         │                  │
│     │   - Transition status                   │                  │
│     │   - Generate commands                   │                  │
│     │                                          │                  │
│     │ Output:                                  │                  │
│     │   state: { status: "COMPLETE" }         │                  │
│     │   commands: [STOP_AUDIO, CLOSE_CONN]    │                  │
│     └─────────────────────────────────────────┘                  │
│          │                                                         │
│          ├─────────────┬──────────────┐                          │
│          ▼             ▼              ▼                          │
│  4a. State Update  4b. Commands   4c. Re-render                 │
│      state changes     Execute        Calculate timers          │
│          │             │              │                          │
│          │             ▼              ▼                          │
│          │      driver.stopAudio()   timers = calculate()       │
│          │      driver.disconnect()        │                    │
│          │                                  │                    │
│          └──────────────┬───────────────────┘                   │
│                         ▼                                         │
│  5. UI Updates                                                   │
│     ┌──────────────────────────────────┐                        │
│     │ BlockSession:                    │                        │
│     │   - Timers frozen ✅              │                        │
│     │   - Button disabled ✅            │                        │
│     │                                   │                        │
│     │ SessionContent:                  │                        │
│     │   - Mic indicator off ✅          │                        │
│     │   - Navigate to feedback ✅       │                        │
│     └──────────────────────────────────┘                        │
│                                                                    │
│  Result: Clean, deterministic, bug-free ✅                       │
└────────────────────────────────────────────────────────────────────┘
```

---

## Why It's Called "Golden Path"

**Golden Path = The happy path through the state machine, where:**

1. ✅ State flows in one direction (unidirectional data flow)
2. ✅ All derived values come from source of truth
3. ✅ Side effects are isolated to commands
4. ✅ Components are pure (just render based on props)
5. ✅ Testable (can test reducer without React)

**Metaphor: Water flowing downhill**

```
Source of Truth (Reservoir)
    ↓
Calculate (Tributaries)
    ↓
Pass Down (Rivers)
    ↓
UI Updates (Ocean)
```

Water only flows one way. You can't push water back uphill. Same with state:

```
State → Calculate → Display
  ↑                    │
  └──── Events ────────┘

NOT:
Display → Modify State ← Another Display (Split Brain!)
```

---

## The "Aha!" Moment

**Current approach treats each component as independent:**
- BlockSession manages its timers
- SessionContent manages its timers
- They drift apart over time (20-second discrepancy)

**Golden Path treats state like a database:**
- One database (reducer)
- Multiple views (components)
- Views query the database (calculate from state)
- Views never modify directly (dispatch events)
- Database decides what changes (reducer logic)

**Just like you wouldn't have two separate databases for the same data, you shouldn't have two separate reducers for the same state.**

---

## Implementation in One Picture

```
┌──────────────────────────────────────────────────────────────┐
│ SessionPage.tsx (NEW - The "Golden Path" Container)         │
│                                                              │
│ const [state, dispatch] = useReducer(sessionReducer, {...})  │
│                                                              │
│ // Calculate timers ONCE from single source of truth       │
│ const timers = useMemo(() => {                             │
│   const now = Date.now()                                    │
│   return {                                                  │
│     blockRemaining: getRemainingSeconds(                    │
│       state.blockStartTime, blockDuration, now              │
│     ),                                                       │
│     answerRemaining: getRemainingSeconds(                   │
│       state.answerStartTime, answerLimit, now               │
│     )                                                        │
│   }                                                          │
│ }, [state.blockStartTime, state.answerStartTime])          │
│                                                              │
│ // Execute commands                                         │
│ useEffect(() => {                                           │
│   commands.forEach(cmd => {                                 │
│     if (cmd.type === 'STOP_AUDIO') driver.stopAudio()      │
│     if (cmd.type === 'CLOSE_CONNECTION') driver.disconnect()│
│   })                                                         │
│ }, [commands])                                              │
│                                                              │
│ return interview.isBlockBased ? (                          │
│   <BlockSession                                             │
│     state={state}                                           │
│     dispatch={dispatch}                                     │
│     timers={timers}                                         │
│   />                                                         │
│ ) : (                                                        │
│   <SessionContent                                           │
│     state={state}                                           │
│     dispatch={dispatch}                                     │
│   />                                                         │
│ )                                                            │
└──────────────────────────────────────────────────────────────┘
        │                           │
        ▼                           ▼
┌─────────────────┐        ┌──────────────────┐
│ BlockSession    │        │ SessionContent   │
│ (Presentation)  │        │ (Presentation)   │
│                 │        │                  │
│ Props:          │        │ Props:           │
│ - state         │        │ - state          │
│ - dispatch      │        │ - dispatch       │
│ - timers        │        │                  │
│                 │        │                  │
│ Displays:       │        │ Displays:        │
│ - Timer overlay │        │ - Chat UI        │
│ - Progress      │        │ - Avatar         │
│                 │        │                  │
│ No reducer ✅   │        │ Optional reducer │
│ No calculation ✅│        │ (standalone) ✅  │
└─────────────────┘        └──────────────────┘
```

---

## Summary: How Golden Path Fixes All 4 Issues

| Issue | Current Problem | Golden Path Solution |
|-------|----------------|---------------------|
| **#1: Mic stays on** | Direct `driver.disconnect()` call | Dispatch `INTERVIEW_ENDED` → generates `STOP_AUDIO` command |
| **#2: Timer drift (20s)** | Two reducers, each resets `answerStartTime` independently | One reducer, one `answerStartTime`, calculate once |
| **#3: Split Brain** | BlockSession + SessionContent each have reducers | Page has one reducer, children are controlled |
| **#4: Timers during errors** | `connectionState = "error"` but `status = "ANSWERING"` | Error sets `status = "COMPLETE"`, TICK handler stops |

**All four issues stem from:**
- ❌ Multiple sources of truth (Split Brain)
- ❌ Imperative side effects (direct driver calls)
- ❌ Incomplete state transitions (connectionState vs status)

**Golden Path eliminates all three:**
- ✅ Single source of truth (one reducer)
- ✅ Intent-based commands (dispatch events, generate commands)
- ✅ Complete state transitions (all related state changes together)

**Result: Deterministic, testable, bug-free architecture.**

---

## Relationship to FEAT27c (Important Context)

### FEAT27c Was Successful! ✅

**FEAT27c (v5 "Dumb Driver")** was completed successfully with 48/48 tests passing.

**What FEAT27c Achieved:**
```
BEFORE FEAT27c:
┌─────────────────────────────┐
│ useInterviewSocket          │
│ - 8 useState declarations   │ ← Mixed concerns
│ - Business logic            │
│ - I/O (WebSocket, Audio)    │
└─────────────────────────────┘

AFTER FEAT27c:
┌─────────────────────────────┐
│ sessionReducer (Pure)       │
│ - Business logic ✅          │
└─────────────────────────────┘
         ↓ commands
┌─────────────────────────────┐
│ useInterviewSocket (Driver) │
│ - I/O only ✅                │
└─────────────────────────────┘
         ↑ events
```

**FEAT27c gave us:**
- ✅ Pure, testable reducer
- ✅ Stateless driver
- ✅ Command/event pattern infrastructure
- ✅ Separation of concerns

**What FEAT27c Did NOT Address:**
- ❌ Component architecture (where reducer lives)
- ❌ Single source of truth (multiple instances)
- ❌ Complete usage of command pattern

### FEAT27d Completes FEAT27c

**Two-Phase Refactoring:**
1. **FEAT27c (Phase 1):** Separation of Concerns
   - Create the tools (pure reducer, command pattern)
   - ✅ Completed with 48/48 tests passing

2. **FEAT27d (Phase 2):** Single Source of Truth
   - Use the tools correctly (one instance, complete handlers)
   - ← You are here

### Why Your Issues Exist Despite FEAT27c

**Issue #1: Microphone stays on**
- FEAT27c provided: `STOP_AUDIO` command type, `stopAudio()` method
- Missing: Command generation in `INTERVIEW_ENDED` handler
- **FEAT27c gave us the infrastructure, we just need to use it**

**Issue #2: Timer discrepancy (1:00 vs 0:40)**
- FEAT27c provided: Pure reducer with correct timer logic
- Problem: TWO reducer instances calculating independently
- **FEAT27c made the reducer work correctly, but didn't address how many instances**

**Issue #3: Timers during errors**
- FEAT27c provided: `CONNECTION_ERROR` event handler
- Problem: Incomplete state transition (doesn't set `status = "COMPLETE"`)
- **FEAT27c created the handler, we need to complete it**

**Issue #4: Split Brain**
- FEAT27c provided: Pure reducer that works perfectly
- Problem: BlockSession and SessionContent each create instances
- **FEAT27c didn't address component architecture**

### What Stays vs What Changes

**Keeps from FEAT27c (Unchanged):**
- ✅ `sessionReducer` remains pure function
- ✅ `useInterviewSocket` remains stateless
- ✅ Command/event pattern infrastructure
- ✅ All 48 tests continue passing
- ✅ Type system (`Command`, `ReducerResult`, etc.)

**Adds in FEAT27d (New):**
- ✅ Lift state to parent (single reducer instance)
- ✅ Complete event handlers (use FEAT27c infrastructure)
- ✅ Centralize calculations (calculate timers once)
- ✅ Controlled components (pass state as props)

### The Journey

```
┌────────────────────────────────────────────────────────┐
│ Step 1: FEAT27c (Foundation) ✅                        │
│                                                        │
│ Created:                                               │
│ - Pure reducer (sessionReducer)                        │
│ - Stateless driver (useInterviewSocket)                │
│ - Command pattern (STOP_AUDIO, CLOSE_CONNECTION, etc.)│
│ - Event pattern (CONNECTION_ERROR, etc.)               │
│                                                        │
│ Achievement: Separation of concerns ✅                 │
│ Remaining: Component architecture ❌                   │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ Step 2: FEAT27d (Completion) ← This Document          │
│                                                        │
│ Uses FEAT27c tools:                                    │
│ - Single reducer instance (not multiple)               │
│ - Complete command usage (STOP_AUDIO everywhere)      │
│ - Complete state transitions (errors end session)     │
│ - Centralized calculations (derive from one state)    │
│                                                        │
│ Achievement: Single source of truth ✅                 │
│ Achievement: Golden Path architecture ✅               │
└────────────────────────────────────────────────────────┘
```

### Analogy: Building a Car

**FEAT27c:** Built separate, high-quality components
- Engine (reducer) ✅
- Wheels (driver) ✅
- Controls (commands/events) ✅

**But:** Put TWO engines in the same car! (Split Brain)

**FEAT27d:** Remove duplicate engine, assemble correctly
- ONE engine ✅
- Connect all components properly ✅
- Car runs smoothly ✅

**Both are necessary:**
- FEAT27c = Build quality components
- FEAT27d = Assemble them correctly

### Summary

**FEAT27c was NOT wrong - it was incomplete.**

Your issues don't invalidate FEAT27c. They prove we need to complete the architecture by:
1. Using the command pattern everywhere (not just some places)
2. Having one reducer instance (not multiple)
3. Completing state transitions (errors should end session)

**FEAT27d builds on FEAT27c's foundation to create the complete Golden Path architecture.**
