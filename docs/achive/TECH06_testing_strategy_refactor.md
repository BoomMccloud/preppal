# Testing Strategy Refactor: "Fewer, Better Tests"

## 1. Problem Statement
The current testing suite has become a maintenance burden rather than a safety net.
- **Fragility:** Unit tests rely heavily on mocks (e.g., verifying `findUnique` arguments), meaning refactoring implementation details breaks tests even if behavior remains correct.
- **Flakiness:** Browser-based E2E tests (Playwright) are prone to timing issues, rendering delays, and environmental instability.
- **Low Confidence:** Passing tests often don't guarantee the application works because mocks can hide database or schema integration issues.
- **TDD False Positives:** Tests pass during development but features break on merge because tests verify mock behavior, not real behavior.

## 2. Strategic Goal
Shift to a **Backend-First System Testing** approach. We aim to verify the *business logic* and *data flow* comprehensively without the overhead of browser automation or the fragility of implementation-coupled mocks.

## 3. TDD Anti-Patterns to Avoid

> Reference: `.claude/.skills/testing-anti-patterns/skill.md`

### The Iron Laws
1. **NEVER test mock behavior** - Tests must verify real behavior, not that mocks exist
2. **NEVER add test-only methods to production classes** - Use test utilities instead
3. **NEVER mock without understanding dependencies** - Know what side effects you're removing

### The TDD Gate Function
Before adding ANY mock to a test:

```
1. Write the test with NO mocks first
2. Run it against real dependencies - let it fail
3. Identify ONLY what's slow/external (real DB queries are fine, external APIs are not)
4. Mock ONLY that minimal external part
5. Re-run - verify test still tests real behavior
```

### Red Flags That Predict Merge Failures
- Test setup is >50% mocks
- Assertions verify "mock was called with X" instead of "result is Y"
- Test passes when you change the mock but nothing else
- You can't explain why a mock is needed
- Mocking "just to be safe"

---

## 4. Complete Test Inventory

> Last updated: 2025-12-19
> Total: **67 tests** across **12 files** (all passing)

### A. Golden Path Test (CRITICAL) ⭐

The single most important test that proves the app works end-to-end.

| File | Tests | What it proves |
|------|-------|----------------|
| [src/test/integration/golden-path.test.ts](../../src/test/integration/golden-path.test.ts) | 1 | User can create interview → Worker processes it → User views feedback |

**If this test passes, you can deploy with confidence.**

---

### A2. Gemini Implementation Smoke Test ⭐

Tests our `GeminiClient` implementation against the real Gemini Live API. **Catches implementation bugs.**

| File | Tests | What it proves |
|------|-------|----------------|
| [worker/src/__tests__/integration/gemini-smoke.test.ts](../../worker/src/__tests__/integration/gemini-smoke.test.ts) | 1 | `GeminiClient.connect()`, `sendClientContent()`, `close()` work correctly |

**Requires:** `GEMINI_API_KEY` in `.env` (skipped if not set)

**Why this exists:** Multiple times, changes to the worker broke Gemini connectivity. This test catches:
- Bugs in `GeminiClient` wrapper code
- Wrong model name in `GEMINI_MODEL` constant
- Invalid config structure (responseModalities, transcription settings)
- SDK API changes that break our implementation
- Broken `sendClientContent()` message format

---

### B. Integration Tests (HIGH VALUE) ✅

These tests use real database and real tRPC callers. **Keep and expand.**

| File | Tests | Mocking | Value | Notes |
|------|-------|---------|-------|-------|
| [src/test/integration/auth.test.ts](../../src/test/integration/auth.test.ts) | 10 | Minimal (env only) | **High** | Tests real auth flows, data isolation |
| [src/test/integration/dashboard.test.ts](../../src/test/integration/dashboard.test.ts) | 7 | Minimal (env only) | **High** | Tests real tRPC + DB interactions |
| [src/test/integration/feedback.test.ts](../../src/test/integration/feedback.test.ts) | 5 | Minimal (env only) | **High** | Tests real feedback retrieval flows |

**Why these work:** They catch real bugs because they use:
- Real database queries (schema mismatches caught)
- Real tRPC procedures (authorization logic tested)
- Real Prisma client (relationship issues caught)

---

### C. Pure Logic Tests (HIGH VALUE) ✅

These tests verify pure functions with no mocking required. **Keep as-is.**

| File | Tests | Mocking | Value | Notes |
|------|-------|---------|-------|-------|
| [worker/src/__tests__/transcript-manager.test.ts](../../worker/src/__tests__/transcript-manager.test.ts) | 21 | None | **High** | Pure logic: turn aggregation, serialization, formatting |
| [worker/src/__tests__/messages.test.ts](../../worker/src/__tests__/messages.test.ts) | 8 | None | **High** | Protobuf encoding/decoding, no external deps |
| [worker/src/__tests__/handlers/websocket-message-handler.test.ts](../../worker/src/__tests__/handlers/websocket-message-handler.test.ts) | 4 | None | **High** | Pure protobuf message type identification |

**Why these work:** They test pure functions with real inputs/outputs, no mocks needed.

---

### D. Component Tests ✅

| File | Tests | Mocking | Value | Notes |
|------|-------|---------|-------|-------|
| [src/app/_components/AudioVisualizer.test.tsx](../../src/app/_components/AudioVisualizer.test.tsx) | 1 | None | Medium | Tests CSS transform based on prop |
| [src/app/_components/StatusIndicator.test.tsx](../../src/app/_components/StatusIndicator.test.tsx) | 5 | None | Medium | Component rendering tests |
| [src/app/_components/TranscriptDisplay.test.tsx](../../src/app/_components/TranscriptDisplay.test.tsx) | 2 | None | Medium | Component rendering tests |
| [src/app/[locale]/(app)/profile/page.test.tsx](../../src/app/[locale]/(app)/profile/page.test.tsx) | 2 | None | Medium | Page component tests |

**Status:** Simple rendering tests. Low maintenance burden.

---

### E. Deleted Tests (Historical Record)

The following mock-heavy tests were deleted on 2025-12-19 because they tested mock behavior, not real behavior:

| File (deleted) | Tests | Reason for deletion |
|----------------|-------|---------------------|
| `src/server/api/routers/interview.test.ts` | 30 | Mocked entire DB; verified `findUnique` calls instead of results |
| `src/server/api/routers/user.test.ts` | 1 | Tautology: returned mock value and asserted it equaled mock value |
| `worker/src/__tests__/api-client.test.ts` | 11 | Mocked global fetch; couldn't catch real HTTP issues |
| `worker/src/__tests__/services/interview-lifecycle-manager.test.ts` | 7 | Mocked ApiClient + generateFeedback |
| `worker/src/__tests__/handlers/gemini-message-handler.test.ts` | 8 | Mocked TranscriptManager + AudioConverter |
| `worker/src/__tests__/gemini-client.test.ts` | 8 | Mocked entire @google/genai SDK; only tested state flags |

**Total deleted:** 65 mock-heavy tests + 2 E2E test files (Playwright).

---

## 5. Test Summary

| Category | Files | Tests | Health |
|----------|-------|-------|--------|
| Golden Path | 1 | 1 | ⭐ Critical |
| Gemini Smoke | 1 | 1 | ⭐ Critical |
| Integration (real DB) | 3 | 22 | ✅ Excellent |
| Pure Logic | 3 | 33 | ✅ Excellent |
| UI Components | 4 | 10 | ✅ Good |
| **Total** | **12** | **67** | ✅ Healthy |

---

## 6. Future Work

1. **Add more integration tests** as new features are built
   - Follow the golden-path.test.ts pattern
   - Test real user journeys, not implementation details

---

## 7. Guidelines for New Tests

### When Writing a New Test

```
1. Start with REAL dependencies
   - Use real DB via integration test pattern
   - Use real tRPC callers

2. Only mock when NECESSARY
   - External APIs (Gemini, OAuth providers)
   - Slow operations (>1s) that aren't being tested

3. Assert on OUTCOMES, not calls
   ❌ expect(mockDb.findUnique).toHaveBeenCalledWith({...})
   ✅ expect(result.interview.status).toBe("COMPLETED")

4. If test passes but feature breaks on merge
   - Your mock doesn't match reality
   - Remove the mock and test against real dependency
```

### Example: Good vs Bad Test

```typescript
// ❌ BAD: Tests mock behavior (interview.test.ts pattern)
it("should call findUnique with correct id", async () => {
  const mockDb = { interview: { findUnique: vi.fn() } };
  await getInterview(mockDb, "123");
  expect(mockDb.interview.findUnique).toHaveBeenCalledWith({
    where: { id: "123" }
  });
});

// ✅ GOOD: Tests real behavior (integration test pattern)
it("should return interview with feedback", async () => {
  // Real data in real DB
  const user = await db.user.create({ data: { email: "test@test.com" } });
  const interview = await db.interview.create({
    data: { userId: user.id, status: "COMPLETED", ... }
  });

  // Real tRPC caller
  const caller = appRouter.createCaller({ db, session: { user } });
  const result = await caller.interview.getById({ id: interview.id });

  // Assert on outcome
  expect(result.status).toBe("COMPLETED");
});
```

---

## 8. Definition of Done

- [x] `pnpm test` passes with 66 tests
- [x] Tests run against real Neon PostgreSQL database (integration tests)
- [x] No Playwright dependency required
- [x] Broken/flaky tests removed
- [x] Complete test inventory documented
- [x] Mock-heavy tests deleted (65 tests removed)
- [x] E2E tests deleted (replaced by golden path integration test)
- [x] Golden path test added (proves app works end-to-end)
- [x] All remaining tests provide real confidence
