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
> Total: **130 tests** across **16 files** (all passing)

### A. Integration Tests (HIGH VALUE) ✅

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

### B. Pure Logic Tests (HIGH VALUE) ✅

These tests verify pure functions with no mocking required. **Keep as-is.**

| File | Tests | Mocking | Value | Notes |
|------|-------|---------|-------|-------|
| [worker/src/__tests__/transcript-manager.test.ts](../../worker/src/__tests__/transcript-manager.test.ts) | 21 | None | **High** | Pure logic: turn aggregation, serialization, formatting |
| [worker/src/__tests__/messages.test.ts](../../worker/src/__tests__/messages.test.ts) | 8 | None | **High** | Protobuf encoding/decoding, no external deps |
| [worker/src/__tests__/handlers/websocket-message-handler.test.ts](../../worker/src/__tests__/handlers/websocket-message-handler.test.ts) | 4 | None | **High** | Pure protobuf message type identification |

**Why these work:** They test pure functions with real inputs/outputs, no mocks needed.

---

### C. Heavily Mocked Tests (PROBLEMATIC) ⚠️

These tests mock so much that they verify mock behavior, not real behavior.

| File | Tests | Mocking | Value | Issues |
|------|-------|---------|-------|--------|
| [src/server/api/routers/interview.test.ts](../../src/server/api/routers/interview.test.ts) | 30 | **Heavy** | Low | Mocks entire DB + auth; verifies `findUnique` calls |
| [src/server/api/routers/user.test.ts](../../src/server/api/routers/user.test.ts) | 1 | **Heavy** | Low | Mocks DB; tests mock return value |
| [worker/src/__tests__/api-client.test.ts](../../worker/src/__tests__/api-client.test.ts) | 11 | **Heavy** | Medium | Mocks global fetch; tests protobuf encoding (useful) but also mock responses |
| [worker/src/__tests__/services/interview-lifecycle-manager.test.ts](../../worker/src/__tests__/services/interview-lifecycle-manager.test.ts) | 7 | **Heavy** | Medium | Mocks ApiClient + generateFeedback; tests orchestration logic |
| [worker/src/__tests__/handlers/gemini-message-handler.test.ts](../../worker/src/__tests__/handlers/gemini-message-handler.test.ts) | 8 | Heavy | Medium | Mocks TranscriptManager + AudioConverter interfaces |
| [worker/src/__tests__/gemini-client.test.ts](../../worker/src/__tests__/gemini-client.test.ts) | 8 | Heavy | Low | Mocks entire @google/genai SDK; tests state management only |

#### Specific Problems in interview.test.ts

```typescript
// ❌ BAD: Lines 112-126 test mock behavior
expect(db.interview.findUnique).toHaveBeenCalledWith({
  where: { idempotencyKey: "test-key-123" },
});

const createCall = vi.mocked(db.interview.create).mock.calls[0]?.[0];
expect(createCall?.data.userId).toBe("test-user-id");
```

This will pass even if the real implementation is broken because:
1. We're testing that the mock was called correctly
2. We're not testing what the database actually stores
3. If Prisma schema changes, these tests still pass

#### Specific Problems in user.test.ts

```typescript
// ❌ BAD: The entire test mocks DB and verifies mock
vi.mocked(db.user.findUnique).mockResolvedValue({...});
expect(result).toEqual({ name: "John Doe", ... });
expect(db.user.findUnique).toHaveBeenCalledWith({...});
```

This provides zero confidence because:
1. We're returning exactly what we expect from the mock
2. The real `findUnique` query isn't tested
3. Schema changes won't break this test

---

### D. Component Tests (UNKNOWN STATUS) ❓

| File | Tests | Mocking | Value | Notes |
|------|-------|---------|-------|-------|
| [src/app/_components/AudioVisualizer.test.tsx](../../src/app/_components/AudioVisualizer.test.tsx) | 1 | None | Medium | Tests CSS transform based on prop |
| [src/app/_components/StatusIndicator.test.tsx](../../src/app/_components/StatusIndicator.test.tsx) | 5 | Unknown | Medium | Component rendering tests |
| [src/app/_components/TranscriptDisplay.test.tsx](../../src/app/_components/TranscriptDisplay.test.tsx) | 2 | Unknown | Medium | Component rendering tests |
| [src/app/[locale]/(app)/profile/page.test.tsx](../../src/app/[locale]/(app)/profile/page.test.tsx) | 2 | Unknown | Medium | Page component tests |

**Status:** These are simple rendering tests. Not critical, but not harmful either.

---

### E. E2E Tests (NOT RUNNING) ❌

| File | Tests | Status |
|------|-------|--------|
| [src/test/e2e/audio-journey.spec.ts](../../src/test/e2e/audio-journey.spec.ts) | ? | Not included in `pnpm test` |
| [src/test/e2e/core-journey.spec.ts](../../src/test/e2e/core-journey.spec.ts) | ? | Not included in `pnpm test` |

**Status:** Playwright E2E tests exist but aren't run with Vitest. May have environment issues.

---

## 5. Test Summary by Health

| Category | Files | Tests | Health |
|----------|-------|-------|--------|
| Integration (real DB) | 3 | 22 | ✅ Excellent |
| Pure Logic | 3 | 33 | ✅ Excellent |
| Mock-Heavy | 6 | 65 | ⚠️ Problematic |
| UI Components | 4 | 10 | ❓ Unknown |
| E2E | 2 | ? | ❌ Not Running |
| **Total** | **18** | **130** | Mixed |

---

## 6. Recommendations

### Immediate Actions

1. **Do NOT trust mock-heavy tests for refactoring**
   - `interview.test.ts` (30 tests) provides false confidence
   - `user.test.ts` (1 test) is essentially useless

2. **Rely on integration tests for confidence**
   - `auth.test.ts`, `dashboard.test.ts`, `feedback.test.ts` test real behavior

3. **Worker tests need review**
   - `api-client.test.ts` - useful for protobuf but mocks fetch
   - `interview-lifecycle-manager.test.ts` - tests orchestration, moderate value

### Future Work

1. **Convert interview.test.ts to integration tests**
   - Move test cases to `src/test/integration/interview.test.ts`
   - Use real DB, real tRPC callers
   - Keep same assertions but remove mocks

2. **Delete user.test.ts**
   - The single test is redundant with `dashboard.test.ts` which already tests `getProfile`

3. **Add worker integration tests**
   - Test real Worker endpoints with real API calls
   - Replace mock-heavy tests with real HTTP calls

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

- [x] `pnpm test` passes with 130 tests
- [x] Tests run against real Neon PostgreSQL database (integration tests)
- [x] No Playwright dependency required
- [x] Broken/flaky tests removed
- [x] Complete test inventory documented
- [ ] Mock-heavy tests converted to integration tests
- [ ] Documentation for TDD workflow updated
