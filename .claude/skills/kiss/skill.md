---
name: kiss
description: Evaluate proposed implementations against KISS (Keep It Simple, Stupid) principles to avoid over-engineering and unnecessary complexity. Use when reviewing implementation plans, refactoring proposals, or when a solution feels too complex. Trigger when users propose solutions with many abstractions, or when asking "is this too complex?"
---

# KISS Principle Analysis

This skill helps evaluate whether a proposed implementation follows KISS (Keep It Simple, Stupid) principles. Apply this analysis to avoid over-engineering, unnecessary abstractions, and complexity that doesn't solve actual problems.

## When to Use This Skill

**Trigger conditions:**

- Reviewing an implementation plan that feels complex
- User asks "is this too complicated?" or "am I over-engineering this?"
- Proposed solution involves multiple new abstractions, layers, or patterns
- Refactoring existing code and considering major architectural changes
- Planning a feature and multiple approaches exist (simple vs complex)
- Code review reveals unnecessary complexity

**Initial Assessment:**

When triggered, explain that you'll evaluate the proposal against KISS principles to ensure the solution is as simple as possible while still meeting requirements.

## The KISS Evaluation Framework

### 1. The "What Problem Are We Solving?" Test

**Core Questions:**

- **"What is the actual problem we're trying to solve?"**
  - Risk: Building solutions for hypothetical future problems
  - Goal: Solve only the problem at hand, not imagined future scenarios

- **"Are we solving a problem that doesn't exist yet?"**
  - Risk: Premature abstraction and over-engineering
  - Goal: Wait until you have 2-3 real examples before abstracting

**Analysis Approach:**

1. Ask user to state the problem in one sentence
2. List what the solution MUST do (requirements)
3. List what the solution COULD do (nice-to-haves)
4. Identify features/abstractions that aren't in the MUST list

**Red Flags:**

- "We might need this later"
- "This will make it easier to add X in the future"
- "This is more flexible"
- "This is the enterprise way to do it"

**KISS Principle:**
Build for today's requirements, not tomorrow's maybes. You can always refactor when you actually need the complexity.

### 2. The "Can It Be Simpler?" Test

**Core Questions:**

- **"What's the simplest possible solution?"**
  - Risk: Starting with the most sophisticated approach
  - Goal: Start with the naive/obvious solution, add complexity only when needed

- **"Can we solve this with existing patterns in the codebase?"**
  - Risk: Introducing new patterns when existing ones work fine
  - Goal: Consistency and familiarity over novelty

**Analysis Approach:**

1. Identify all new abstractions being introduced (classes, hooks, utilities, patterns)
2. For each abstraction, ask: "What if we just... didn't have this?"
3. Look for existing codebase patterns that solve similar problems
4. Count the number of files/modules in the proposal

**Red Flags:**

- More than 3 new files for a simple feature
- New patterns when existing patterns could work
- Generic/reusable code for a single use case
- "Factory", "Manager", "Handler", "Strategy" in names when simpler names work

**KISS Principle:**
The best code is no code. The second best is simple, boring code.

### 3. The "Abstraction Cost/Benefit" Test

**Core Questions:**

- **"How many times will this abstraction be used?"**
  - Risk: Creating utilities/helpers for one-time operations
  - Goal: Duplication is better than premature abstraction

- **"Does this abstraction reduce or increase cognitive load?"**
  - Risk: "Clever" code that saves lines but requires mental gymnastics
  - Goal: Code that's easy to read and understand at a glance

**Analysis Approach:**

1. List all proposed abstractions (functions, hooks, classes, utilities)
2. For each, count current and planned usage (1, 2, 3+ times)
3. Evaluate if the abstraction makes code easier or harder to understand
4. Calculate the "indirection penalty" - how many jumps to understand the flow?

**Red Flags:**

- Helper function used once
- Abstraction that hides simple operations (e.g., `setTrue()` instead of `setState(true)`)
- Deep nesting of abstraction layers (A calls B calls C calls D)
- Generic solution when specific code is clearer

**KISS Principle:**
Three strikes rule: Don't abstract until you've written it three times. Even then, prefer clear duplication over clever abstraction.

**Examples:**

```typescript
// Bad: Premature abstraction (used once)
function useToggle(initial = false) {
  const [value, setValue] = useState(initial)
  const toggle = () => setValue(v => !v)
  const setTrue = () => setValue(true)
  const setFalse = () => setValue(false)
  return { value, toggle, setTrue, setFalse }
}

function MyComponent() {
  const { value, toggle } = useToggle()
  return <button onClick={toggle}>{value ? 'On' : 'Off'}</button>
}

// Good: Direct and clear
function MyComponent() {
  const [isOn, setIsOn] = useState(false)
  return <button onClick={() => setIsOn(!isOn)}>{isOn ? 'On' : 'Off'}</button>
}
```

### 4. The "Configuration vs Code" Test

**Core Questions:**

- **"Are we making this configurable for no reason?"**
  - Risk: Configuration complexity, feature flags, option objects with 10 parameters
  - Goal: Hard-code until you have a real need for configuration

- **"Are we designing for extensibility we don't need?"**
  - Risk: Plugin systems, event buses, dependency injection for simple cases
  - Goal: Solve the concrete problem; add extension points when needed

**Analysis Approach:**

1. Identify all configuration options, flags, or extensibility points
2. For each, ask: "Do we have a real use case for changing this?"
3. Count the number of parameters in function signatures
4. Look for dependency injection where direct imports would work

**Red Flags:**

- Functions with more than 4 parameters
- Configuration objects with many optional fields
- Feature flags for features that aren't optional
- Dependency injection in simple use cases
- "Strategy pattern" when one strategy exists

**KISS Principle:**
Make it work first, make it configurable when you have 2+ real configurations to support.

**Examples:**

```typescript
// Bad: Over-configured
interface AudioPlayerOptions {
  autoplay?: boolean
  loop?: boolean
  volume?: number
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  preload?: 'auto' | 'metadata' | 'none'
  crossOrigin?: string
}

function createAudioPlayer(url: string, options: AudioPlayerOptions = {}) {
  // 50 lines of option handling...
}

// Good: Simple, add options when needed
function createAudioPlayer(url: string) {
  const audio = new Audio(url)
  audio.autoplay = false
  return audio
}
```

### 5. The "Indirection Penalty" Test

**Core Questions:**

- **"How many files do I need to open to understand this?"**
  - Risk: Logic spread across many small files, each doing one tiny thing
  - Goal: Related code lives together; trace execution easily

- **"How many layers of abstraction before we do actual work?"**
  - Risk: Wrapper upon wrapper upon wrapper
  - Goal: Minimize the distance between intention and execution

**Analysis Approach:**

1. Trace a simple user action through the proposed code
2. Count how many files you need to open
3. Count how many function calls before something actually happens
4. Evaluate if abstractions add clarity or just distance

**Red Flags:**

- User clicks button → 7 files touched before API call
- Multiple layers of wrappers (useX calls useY calls useZ)
- "Utils" folder with single-function files
- Business logic spread across many tiny modules

**KISS Principle:**
Locality matters. Code that works together should live together.

**Examples:**

```typescript
// Bad: Excessive indirection (6 layers)
// File: utils/api/client/fetch-wrapper.ts
export const fetchWrapper = (url: string) => fetch(url)

// File: utils/api/client/json-fetcher.ts
export const jsonFetcher = (url: string) => fetchWrapper(url).then(r => r.json())

// File: services/api/base.ts
export const apiBase = (endpoint: string) => jsonFetcher(`/api/${endpoint}`)

// File: services/api/users.ts
export const getUser = (id: string) => apiBase(`users/${id}`)

// File: hooks/useUser.ts
export const useUser = (id: string) => useQuery(['user', id], () => getUser(id))

// File: components/UserProfile.tsx
const { data } = useUser(userId) // Finally!

// Good: Direct and clear (2 layers)
// File: components/UserProfile.tsx
const { data } = useQuery(['user', userId], async () => {
  const res = await fetch(`/api/users/${userId}`)
  return res.json()
})
```

### 6. The "Naive Solution First" Test

**Core Questions:**

- **"What would the naive/obvious solution look like?"**
  - Risk: Jumping straight to the "proper" or "scalable" solution
  - Goal: Start simple, optimize when needed

- **"Do we have proof that the simple solution won't work?"**
  - Risk: Premature optimization, solving performance problems that don't exist
  - Goal: Measure before optimizing

**Analysis Approach:**

1. Ask user to describe the "naive" solution (even if they think it's bad)
2. Identify what makes them think it won't work
3. Check if concerns are based on evidence or assumptions
4. Propose trying the simple solution first, measure, then optimize

**Red Flags:**

- "This won't scale" (without evidence)
- "We need to optimize this" (before measuring)
- Complex solutions to theoretical problems
- Premature caching, memoization, virtualization

**KISS Principle:**
Make it work, make it right, make it fast - in that order. Skip "make it fast" until you have proof it's needed.

## The KISS Evaluation Process

### Step 1: Understand the Proposal

Ask the user to explain:
1. What problem are we solving?
2. What's the proposed solution?
3. Why this approach over simpler alternatives?

### Step 2: Apply the Six Tests

Walk through each test:

1. **Problem Test**: Are we solving the right problem?
2. **Simplicity Test**: Can it be simpler?
3. **Abstraction Test**: Are abstractions justified?
4. **Configuration Test**: Are we over-configuring?
5. **Indirection Test**: Is the code path too long?
6. **Naive Solution Test**: Did we try the simple way first?

### Step 3: Score and Recommend

For each test, provide:
- ✅ **PASS**: Follows KISS principles
- ⚠️ **WARNING**: Some complexity, may be justified
- ❌ **FAIL**: Violates KISS principles, needs simplification

Provide specific recommendations for each failure:
- What to remove
- What to simplify
- What to combine
- What to defer

### Step 4: Alternative Proposal

If the original proposal fails multiple tests, provide a simpler alternative:

1. Strip down to bare requirements
2. Remove abstractions
3. Inline utilities used once
4. Combine related code
5. Remove configuration that's not needed

### Step 5: When Complexity Is Justified

Sometimes complexity IS justified. Approve complexity when:

- Real measured performance problem (not theoretical)
- 3+ real use cases for the abstraction (not hypothetical)
- Significant code duplication eliminated (50+ lines)
- External requirement (framework, library API)
- Security or correctness requirement

Be clear when complexity is necessary vs when it's over-engineering.

## Communication Guidelines

**Be Direct:**
- "This is over-engineered"
- "We don't need this abstraction yet"
- "Let's start with the simple version"

**Be Specific:**
- Point to exact abstractions that should be removed
- Show the simpler alternative
- Explain what problem the complexity solves (or doesn't)

**Be Pragmatic:**
- Acknowledge when complexity is justified
- Don't oversimplify critical paths
- Balance simplicity with other concerns (security, performance, maintainability)

## Examples

### Example 1: API Client

**Proposal:**
```typescript
// Proposed: Generic API client with request/response interceptors
class ApiClient {
  private interceptors: Interceptor[] = []

  addInterceptor(interceptor: Interceptor) { }
  request<T>(config: RequestConfig): Promise<T> { }
}

const client = new ApiClient()
client.addInterceptor(authInterceptor)
client.addInterceptor(loggingInterceptor)
```

**KISS Evaluation:**

❌ **Problem Test**: What problem are we solving?
- Current issue: Need to call one API endpoint
- Proposal: Generic HTTP client with interceptors
- Verdict: Over-engineered for a single endpoint

❌ **Abstraction Test**: How many times will this be used?
- Current use cases: 1
- Future use cases: "Might need more later"
- Verdict: Premature abstraction

⚠️ **Indirection Test**: How complex is the flow?
- User action → Client → Interceptors → Fetch
- Verdict: Adds layers without clear benefit

**Recommendation:**

```typescript
// Simple version - add complexity when needed
async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.json()
}
```

### Example 2: State Management

**Proposal:**
```typescript
// Proposed: Redux-style state management with actions, reducers, middleware
const store = createStore(rootReducer, applyMiddleware(thunk, logger))

// 5 files: actions.ts, actionTypes.ts, reducers.ts, selectors.ts, store.ts
```

**KISS Evaluation:**

❌ **Problem Test**: What's the actual requirement?
- Need: Track 3 boolean flags
- Proposal: Full Redux architecture
- Verdict: Massive over-engineering

❌ **Indirection Test**: How many files to understand state?
- 5 files for 3 booleans
- Verdict: Excessive fragmentation

**Recommendation:**

```typescript
// Simple version - use local state
const [state, setState] = useState({
  isLoading: false,
  isError: false,
  isSuccess: false
})
```

### Example 3: Form Validation

**Proposal:**
```typescript
// Proposed: Schema-based validation with custom rule engine
const schema = {
  email: [required(), email(), maxLength(100)],
  password: [required(), minLength(8), hasNumber(), hasSpecialChar()]
}

const validator = new Validator(schema)
const errors = validator.validate(formData)
```

**KISS Evaluation:**

⚠️ **Problem Test**: Do we need a validation framework?
- Need: Validate email and password
- Proposal: Custom validation engine
- Verdict: Maybe Zod or simple functions would work

✅ **Abstraction Test**: Will this be reused?
- 5+ forms in the app
- Verdict: Abstraction may be justified

⚠️ **Naive Solution Test**: Did we try the simple way?
- Could use Zod (already in project)
- Could use simple validation functions
- Verdict: Explore simpler options first

**Recommendation:**

```typescript
// Use existing library (Zod already in project)
import { z } from 'zod'

const schema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(8)
})

const result = schema.safeParse(formData)
```

## Integration with Other Skills

This skill works well with:

- **First-Principle**: Use KISS to evaluate if an architecture is simpler than it needs to be
- **TDD Test Writer**: Simple code is easier to test; use KISS to keep test setup minimal
- **Code Architect**: Apply KISS during architecture design to avoid over-engineering

## The KISS Mantra

**"The best code is no code. The second best is simple, boring code."**

Remember:
- Solve today's problem, not tomorrow's maybes
- Three instances before abstracting
- Duplication is better than bad abstraction
- Make it work, make it right, make it fast - in that order
- You can always add complexity later; removing it is harder
