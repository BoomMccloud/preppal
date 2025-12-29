# Testing Strategy

Preppal follows a **"Fewer, Better Tests"** strategy, prioritizing high-confidence integration tests over fragile unit tests with heavy mocking. Our goal is to verify business logic and data flow using real dependencies (Database, tRPC) wherever possible.

## 1. Core Philosophy

### ✅ Do
- **Use the Real Database**: Tests run against the actual PostgreSQL database (Neon). This catches schema issues, constraint violations, and relationship bugs that mocks miss.
- **Test through tRPC**: Call tRPC procedures directly (`caller.interview.createSession`) to test the full request/response cycle including middleware and validation.
- **Mock External Services**: Only mock 3rd party APIs that are slow, expensive, or side-effect heavy (e.g., Google OAuth, Gemini API, Resend Email).
- **Test Outcomes**: Assert that the database state changed or the return value is correct.

### ❌ Don't
- **Don't Mock Prisma**: Never mock `ctx.db`. It leads to brittle tests that pass even when the query logic is wrong.
- **Don't Test Implementation**: Avoid assertions like `expect(func).toHaveBeenCalledWith(...)`. These break refactoring.
- **Don't Write "Mock Tests"**: If a test setup is >50% mocks, it's likely testing the mocks, not the code.

## 2. Test Structure

Tests are located in `src/test/` and organized by type:

```
src/test/
├── integration/        # Main test suite. Real DB, Mocked Auth/Env.
│   ├── golden-path.test.ts  # Critical End-to-End user journey
│   ├── auth.test.ts         # Authentication & Authorization rules
│   ├── dashboard.test.ts    # Dashboard data fetching
│   ├── feedback.test.ts     # Feedback retrieval & access control
│   └── otp.test.ts          # Email OTP flow
├── unit/               # Pure logic tests. No DB required.
│   └── otp-utils.test.ts    # Rate limiting, hashing, code generation
├── global-setup.ts     # Global Vitest setup
└── setup.ts            # Per-test file setup (Environment mocks)
```

## 3. Key Test Categories

### 🥇 Golden Path (`integration/golden-path.test.ts`)
The single most important test. It verifies the complete lifecycle of a user session:
1. User creates an interview.
2. Worker (simulated) processes the interview and submits results.
3. User retrieves and views the feedback.

**If this test passes, the core application is functional.**

### 🥈 Integration Tests (`integration/*.test.ts`)
These tests cover specific feature areas using the **tRPC Caller Pattern**:
1. Create a test user in the real DB.
2. Create a tRPC `caller` with that user's session context.
3. Call procedures directly: `await caller.interview.createSession(...)`.
4. Verify results in the return value OR by querying the DB directly.

**Example:**
```typescript
it("should create session", async () => {
  // 1. Arrange: Create user & caller
  const user = await db.user.create({ ... });
  const caller = appRouter.createCaller({ session: { user }, ... });

  // 2. Act: Call procedure
  const result = await caller.interview.createSession({ ... });

  // 3. Assert: Check return & DB side effects
  expect(result.status).toBe("PENDING");
  const dbRecord = await db.interview.findUnique({ where: { id: result.id } });
  expect(dbRecord).toBeDefined();
});
```

### 🥉 Unit Tests (`unit/*.test.ts`)
Reserved for complex **pure functions** that don't depend on the database or framework.
*   *Example:* OTP code generation, cryptographic hashing, rate limit logic.

## 4. Running Tests

The project uses **Vitest**.

```bash
# Run all tests in watch mode (Development)
pnpm test

# Run all tests once (CI/CD)
pnpm test:ci

# Run specific test file
pnpm test golden-path
```

## 5. Mocking Strategy

We use `vi.mock` in `src/test/setup.ts` or individual test files for:

1.  **Environment Variables**: `~/env` is mocked to allow tests to run without all production secrets.
2.  **NextAuth**: `~/server/auth` is mocked to bypass OAuth providers. We manually construct session objects for the tRPC caller.
3.  **External APIs**: Services like `resend` (Email) or `@google/genai` are mocked to prevent network calls.

### Example: Mocking Auth
```typescript
vi.mock("~/server/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)), // Default to no session
}));
```

## 6. Worker Testing
The Cloudflare Worker has its own independent test suite located in `worker/src/__tests__/`. It follows similar principles but uses `miniflare` for environment simulation.

---

## 7. Testing Anti-Patterns

### Overview

Tests must verify real behavior, not mock behavior. Mocks are a means to isolate, not the thing being tested.

**Core principle:** Test what the code does, not what the mocks do.

**Following strict TDD prevents these anti-patterns.**

### The Iron Laws

```
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding dependencies
```

### Anti-Pattern 1: Testing Mock Behavior

**The violation:**

```typescript
// ❌ BAD: Testing that the mock exists
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});
```

**Why this is wrong:**

- You're verifying the mock works, not that the component works
- Test passes when mock is present, fails when it's not
- Tells you nothing about real behavior

**The fix:**

```typescript
// ✅ GOOD: Test real component or don't mock it
test('renders sidebar', () => {
  render(<Page />);  // Don't mock sidebar
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});

// OR if sidebar must be mocked for isolation:
// Don't assert on the mock - test Page's behavior with sidebar present
```

#### Gate Function

```
BEFORE asserting on any mock element:
  Ask: "Am I testing real component behavior or just mock existence?"

  IF testing mock existence:
    STOP - Delete the assertion or unmock the component

  Test real behavior instead
```

### Anti-Pattern 2: Test-Only Methods in Production

**The violation:**

```typescript
// ❌ BAD: destroy() only used in tests
class Session {
  async destroy() {
    // Looks like production API!
    await this._workspaceManager?.destroyWorkspace(this.id);
    // ... cleanup
  }
}

// In tests
afterEach(() => session.destroy());
```

**Why this is wrong:**

- Production class polluted with test-only code
- Dangerous if accidentally called in production
- Violates YAGNI and separation of concerns
- Confuses object lifecycle with entity lifecycle

**The fix:**

```typescript
// ✅ GOOD: Test utilities handle test cleanup
// Session has no destroy() - it's stateless in production

// In test-utils/
export async function cleanupSession(session: Session) {
  const workspace = session.getWorkspaceInfo();
  if (workspace) {
    await workspaceManager.destroyWorkspace(workspace.id);
  }
}

// In tests
afterEach(() => cleanupSession(session));
```

#### Gate Function

```
BEFORE adding any method to production class:
  Ask: "Is this only used by tests?"

  IF yes:
    STOP - Don't add it
    Put it in test utilities instead

  Ask: "Does this class own this resource's lifecycle?"

  IF no:
    STOP - Wrong class for this method
```

### Anti-Pattern 3: Mocking Without Understanding

**The violation:**

```typescript
// ❌ BAD: Mock breaks test logic
test("detects duplicate server", () => {
  // Mock prevents config write that test depends on!
  vi.mock("ToolCatalog", () => ({
    discoverAndCacheTools: vi.fn().mockResolvedValue(undefined),
  }));

  await addServer(config);
  await addServer(config); // Should throw - but won't!
});
```

**Why this is wrong:**

- Mocked method had side effect test depended on (writing config)
- Over-mocking to "be safe" breaks actual behavior
- Test passes for wrong reason or fails mysteriously

**The fix:**

```typescript
// ✅ GOOD: Mock at correct level
test("detects duplicate server", () => {
  // Mock the slow part, preserve behavior test needs
  vi.mock("MCPServerManager"); // Just mock slow server startup

  await addServer(config); // Config written
  await addServer(config); // Duplicate detected ✓
});
```

#### Gate Function

```
BEFORE mocking any method:
  STOP - Don't mock yet

  1. Ask: "What side effects does the real method have?"
  2. Ask: "Does this test depend on any of those side effects?"
  3. Ask: "Do I fully understand what this test needs?"

  IF depends on side effects:
    Mock at lower level (the actual slow/external operation)
    OR use test doubles that preserve necessary behavior
    NOT the high-level method the test depends on

  IF unsure what test depends on:
    Run test with real implementation FIRST
    Observe what actually needs to happen
    THEN add minimal mocking at the right level

  Red flags:
    - "I'll mock this to be safe"
    - "This might be slow, better mock it"
    - Mocking without understanding the dependency chain
```

### Anti-Pattern 4: Incomplete Mocks

**The violation:**

```typescript
// ❌ BAD: Partial mock - only fields you think you need
const mockResponse = {
  status: "success",
  data: { userId: "123", name: "Alice" },
  // Missing: metadata that downstream code uses
};

// Later: breaks when code accesses response.metadata.requestId
```

**Why this is wrong:**

- **Partial mocks hide structural assumptions** - You only mocked fields you know about
- **Downstream code may depend on fields you didn't include** - Silent failures
- **Tests pass but integration fails** - Mock incomplete, real API complete
- **False confidence** - Test proves nothing about real behavior

**The Iron Rule:** Mock the COMPLETE data structure as it exists in reality, not just fields your immediate test uses.

**The fix:**

```typescript
// ✅ GOOD: Mirror real API completeness
const mockResponse = {
  status: "success",
  data: { userId: "123", name: "Alice" },
  metadata: { requestId: "req-789", timestamp: 1234567890 },
  // All fields real API returns
};
```

#### Gate Function

```
BEFORE creating mock responses:
  Check: "What fields does the real API response contain?"

  Actions:
    1. Examine actual API response from docs/examples
    2. Include ALL fields system might consume downstream
    3. Verify mock matches real response schema completely

  Critical:
    If you're creating a mock, you must understand the ENTIRE structure
    Partial mocks fail silently when code depends on omitted fields

  If uncertain: Include all documented fields
```

### Anti-Pattern 5: Testing the Library, Not Your Code

**The violation:**

```typescript
// ❌ BAD: Testing that Zod works
it("should reject non-string values", () => {
  expect(LanguageSchema.safeParse(123).success).toBe(false);
  expect(LanguageSchema.safeParse(null).success).toBe(false);
  expect(LanguageSchema.safeParse({}).success).toBe(false);
});

// ❌ BAD: Exhaustive edge cases for library behavior
it("should reject 'es'", () => { ... });
it("should reject 'fr'", () => { ... });
it("should reject 'EN'", () => { ... });
it("should reject empty string", () => { ... });
```

**Why this is wrong:**

- Zod already guarantees type validation - you're testing their library
- Exhaustive edge cases add maintenance burden without catching real bugs
- More tests ≠ better coverage
- Tests break on implementation changes even when behavior is correct

**The fix:**

```typescript
// ✅ GOOD: Test YOUR constraints, not the library
it("should parse valid template", () => { ... });
it("should reject invalid template", () => { ... });
it("should apply default values", () => { ... });
```

#### Gate Function

```
BEFORE writing a test:
  Ask: "Am I testing MY code's behavior, or the library's?"

  IF testing library behavior:
    STOP - The library maintainers already tested this
    Trust the library, test your usage of it

  Ask: "Would this test catch a real bug in MY code?"

  IF no:
    STOP - Don't write it
    Focus on tests that verify your business logic
```

### Anti-Pattern 6: Integration Tests as Afterthought

**The violation:**

```
✅ Implementation complete
❌ No tests written
"Ready for testing"
```

**Why this is wrong:**

- Testing is part of implementation, not optional follow-up
- TDD would have caught this
- Can't claim complete without tests

**The fix:**

```
TDD cycle:
1. Write failing test
2. Implement to pass
3. Refactor
4. THEN claim complete
```

### When Mocks Become Too Complex

**Warning signs:**

- Mock setup longer than test logic
- Mocking everything to make test pass
- Mocks missing methods real components have
- Test breaks when mock changes

**Consider:** Integration tests with real components often simpler than complex mocks

### TDD Prevents These Anti-Patterns

**Why TDD helps:**

1. **Write test first** → Forces you to think about what you're actually testing
2. **Watch it fail** → Confirms test tests real behavior, not mocks
3. **Minimal implementation** → No test-only methods creep in
4. **Real dependencies** → You see what the test actually needs before mocking

**If you're testing mock behavior, you violated TDD** - you added mocks without watching test fail against real code first.

### Quick Reference

| Anti-Pattern                    | Fix                                           |
| ------------------------------- | --------------------------------------------- |
| Assert on mock elements         | Test real component or unmock it              |
| Test-only methods in production | Move to test utilities                        |
| Mock without understanding      | Understand dependencies first, mock minimally |
| Incomplete mocks                | Mirror real API completely                    |
| Testing the library             | Trust the library, test your usage of it      |
| Tests as afterthought           | TDD - tests first                             |
| Over-complex mocks              | Consider integration tests                    |

### Red Flags

- Assertion checks for `*-mock` test IDs
- Methods only called in test files
- Mock setup is >50% of test
- Test fails when you remove mock
- Can't explain why mock is needed
- Mocking "just to be safe"
- Testing that a library rejects invalid input
- Exhaustive edge cases that don't reflect real usage

### The Bottom Line

**Mocks are tools to isolate, not things to test.**

If TDD reveals you're testing mock behavior, you've gone wrong.

Fix: Test real behavior or question why you're mocking at all.

---

## 10. Lessons Learned: Fake vs Real Integration Tests

### Case Study: The Microphone Bug (December 2025)

**Context:** We implemented a feature to turn off the microphone when users click "End Interview". We wrote 53 tests following TDD. All tests passed. **The feature was completely broken in production.**

### The Fake "Integration" Test

We wrote what we called an "integration test":

```typescript
it("should execute STOP_AUDIO and CLOSE_CONNECTION commands", () => {
  // Call reducer directly
  const result = sessionReducer(state, { type: "INTERVIEW_ENDED" }, context);

  // Manually execute commands
  executeCommands(result.commands);

  // Verify driver methods called
  expect(mockDriver.stopAudio).toHaveBeenCalled();
});
```

**What this test actually verified:**
- ✅ Reducer generates correct commands
- ✅ Our manual command executor calls driver methods

**What this test DIDN'T verify:**
- ❌ The actual UI button dispatches the event
- ❌ The actual useEffect executes commands
- ❌ The actual MediaStream tracks get stopped
- ❌ The actual microphone indicator turns off

**This was a unit test disguised as an integration test.** It gave us false confidence.

### The Bugs It Missed

The test passed while **3 critical bugs** existed in production:

1. **Broken Command Executor:** useEffect was calling `sessionReducer(state, { type: "TICK" })` instead of using the captured commands. Commands were never executed.

2. **Driver Object Instability:** The driver object was recreated on every render, causing useEffect to fire repeatedly and creating race conditions.

3. **Missing MediaStream Cleanup:** BlockSession held a MediaStream reference but never called `track.stop()`, leaving the microphone on.

### What a Real Integration Test Looks Like

A real integration test would have rendered the actual component:

```typescript
it('turns off microphone when End Interview clicked', async () => {
  // 1. Render ACTUAL component (not just calling reducer)
  const mockMediaTrack = { stop: vi.fn(), enabled: true, kind: 'audio' };
  const mockStream = {
    getTracks: () => [mockMediaTrack],
    getAudioTracks: () => [mockMediaTrack]
  };

  render(<BlockSession interview={mockInterview} blocks={mockBlocks} />);

  // 2. Wait for component to fully initialize
  await waitFor(() => screen.getByText('End Interview'));

  // 3. Click the ACTUAL button (tests real onClick handler)
  fireEvent.click(screen.getByText('End Interview'));

  // 4. Verify ACTUAL side effects
  await waitFor(() => {
    expect(mockMediaTrack.stop).toHaveBeenCalled();  // Real cleanup
  });

  // 5. Verify microphone state (if possible to mock)
  expect(mockStream.getTracks()).toHaveLength(0);  // Tracks stopped
});
```

**This would have caught all 3 bugs** because:
- ✅ Tests real button onClick
- ✅ Tests real useEffect execution
- ✅ Tests real MediaStream cleanup
- ✅ Tests the actual UI component, not isolated units

### The Takeaway

**Unit tests are great for pure logic. But for React components with side effects, you need real integration tests that:**

1. **Render the actual component** (not just call functions)
2. **Simulate real user interactions** (click actual buttons)
3. **Verify actual side effects** (DOM changes, API calls, cleanup)
4. **Use real React lifecycle** (useEffect, useReducer, etc.)

**If your "integration test" doesn't render a component, it's not an integration test.**

### When to Use Each

| Test Type | Use For | Example |
|-----------|---------|---------|
| **Unit Test** | Pure functions, utils | `sessionReducer(state, event)` |
| **Component Test** | React components with UI | `render(<SessionContent />)` |
| **Integration Test** | Feature flows across components | User creates interview → views feedback |
| **E2E Test** | Critical user journeys | Full auth flow in real browser |

### Red Flags for Fake Integration Tests

- ❌ Test never calls `render()`
- ❌ Test manually orchestrates what the component should do
- ❌ Test verifies intermediate steps, not final outcomes
- ❌ Test would pass even if the UI is completely broken
- ❌ Test gives you confidence, but production is broken

**Remember:** Tests should fail when users would be unhappy. If your tests pass but users can't use the feature, your tests are lying to you.