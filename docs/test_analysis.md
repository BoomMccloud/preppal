# Test Quality Analysis

**Date:** 2025-12-29
**Total Test Files:** 20
**Total Test Lines:** ~6,955
**Total Tests:** ~248

## Summary

Out of 248 tests, approximately **25-30 tests (~10-12%)** provide minimal or no real value. These tests fall into the following categories:

## Low-Value Tests by Category

### 1. **React Rendering Tests (8 tests) - Zero Value**

**File:** `src/app/_components/StatusIndicator.test.tsx` (5 tests)
```typescript
test("renders connecting status", () => {
  render(<StatusIndicator status="connecting" />);
  expect(screen.getByText("Connecting...")).toBeInTheDocument();
});
// + 4 more identical tests for different statuses
```

**Problem:** These tests literally just check that React can render text. No logic is tested. If React's rendering breaks, every app everywhere would break - not our responsibility to test.

**File:** `src/app/_components/AudioVisualizer.test.tsx` (1 test)
```typescript
expect(visualizer).toHaveStyle("transform: scaleY(0.5)");
```

**Problem:** Tests that a prop value equals a CSS style value. This is a tautology - of course `audioLevel={0.5}` results in `scaleY(0.5)`.

**File:** `src/app/_components/TranscriptDisplay.test.tsx` (2 tests)

**Problem:** Mostly testing React rendering, not business logic. The only semi-valuable part is checking speaker counts.

---

### 2. **Mock-Heavy Tests (2 tests) - Negative Value**

**File:** `src/app/[locale]/(app)/profile/page.test.tsx` (2 tests)
```typescript
// Mock the entire tRPC layer
mockUseQuery.mockReturnValue({
  data: { name: "John Doe", email: "john@example.com" },
});

// Then assert the mock returns what we told it to
expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
```

**Problem:** Mocks the entire implementation and then asserts the mock works. This doesn't test any real code - it tests that mocks can return mocked data. **Worse than no test** because it gives false confidence.

**Recommendation:** Delete entirely and replace with integration test.

---

### 3. **Hardcoded Configuration Tests (5 tests) - Low Value**

**File:** `src/test/unit/interview-templates.test.ts`

**Low-value tests:**
```typescript
it("should have answerTimeLimitSec of 90 seconds", () => {
  const template = getTemplate("mba-behavioral-v1");
  expect(template?.answerTimeLimitSec).toBe(90);
});

it("should have at least one block", () => {
  expect(template?.blocks.length).toBeGreaterThanOrEqual(1);
});

it("should have valid language codes in blocks", () => {
  expect(template?.blocks[0]?.language).toMatch(/^(en|zh)$/);
});

it("should have positive duration for blocks", () => {
  expect(template?.blocks[0]?.durationSec).toBeGreaterThan(0);
});

it("should have questions in blocks", () => {
  expect(template?.blocks[0]?.questions.length).toBeGreaterThan(0);
});
```

**Problem:** These tests just assert that hardcoded configuration has certain values. They don't test logic - they test data structure. If someone changes `answerTimeLimitSec` to 120, the test fails but nothing is actually broken.

**What's valuable:** The schema validation tests (`interview-templates-schema.test.ts`) which test that Zod catches invalid data.

**What's not valuable:** Asserting specific hardcoded values in templates.

---

### 4. **Tautological Schema Tests (8 tests) - Low Value**

**File:** `src/test/unit/interview-templates-schema.test.ts`

**Example:**
```typescript
it("should apply default answerTimeLimitSec of 180", () => {
  const result = InterviewTemplateSchema.safeParse(validTemplate);
  expect(result.data.answerTimeLimitSec).toBe(180);
});
```

**Problem:** This tests Zod's `.default()` mechanism, not our code. We're testing that Zod works correctly.

**Other examples:**
- "should preserve custom answerTimeLimitSec" - tests Zod preserves values (duh)
- "should reject template with empty id" - tests Zod validates `.min(1)`
- "should reject template with empty name" - tests Zod validates `.min(1)`
- "should reject zero durationSec" - tests Zod validates `.positive()`
- "should reject negative durationSec" - tests Zod validates `.positive()`

**What's valuable:**
- "should parse a valid template" - ensures schema is correctly defined
- "should reject invalid language codes" - tests our enum is configured correctly
- "should reject template missing required fields" - tests our schema structure

**What's not valuable:** Testing every Zod validation primitive. That's Zod's job.

---

### 5. **Template Data Structure Tests (4 tests) - Low Value**

**File:** `src/test/unit/block-prompt.test.ts`

```typescript
it("should return a non-empty string", () => {
  const prompt = buildBlockPrompt(baseContext);
  expect(typeof prompt).toBe("string");
  expect(prompt.length).toBeGreaterThan(100);
});
```

**Problem:** Tests that a function returns a string longer than 100 chars. This provides almost no value - if the prompt is empty or broken, the integration tests will catch it.

**Better tests in same file:** "should include all questions" - tests actual business logic

---

## High-Value Tests (Worth Keeping)

### 1. **State Machine Tests** ✅
- `reducer.test.ts` (42 tests) - Tests complex state transitions
- `goldenPath.test.ts` (6 tests) - Tests complete flows
- **Value:** High - state machines are complex and easy to break

### 2. **Integration Tests** ✅
- `golden-path.test.ts` - End-to-end user flows
- `auth.test.ts` - Authentication flows
- `interview-blocks.test.ts` - Block-based interview flows
- `otp.test.ts` - OTP authentication
- `feedback.test.ts` - Feedback generation
- **Value:** Very High - tests real system behavior

### 3. **Protobuf Serialization Tests** ✅
- `worker/messages.test.ts` (8 tests)
- **Value:** High - serialization is complex and critical

### 4. **Translation Integrity Test** ✅
- `translations.test.ts` - Ensures all languages have all keys
- **Value:** High - prevents missing translations in production

### 5. **Countdown Timer Tests** ✅
- `countdown-timer.test.ts` (16 tests)
- **Value:** High - time calculations are error-prone

### 6. **OTP Utils Tests** ✅
- `otp-utils.test.ts` (18 tests)
- **Value:** High - security-critical code

---

## Recommendations

### Delete Immediately (12 tests)
1. ❌ **All 5 tests in `StatusIndicator.test.tsx`**
2. ❌ **All 1 test in `AudioVisualizer.test.tsx`**
3. ❌ **All 2 tests in `TranscriptDisplay.test.tsx`**
4. ❌ **All 2 tests in `ProfilePage.test.tsx`**
5. ❌ **2 tests in `interview-templates.test.ts`:**
   - "should have answerTimeLimitSec of 90 seconds"
   - "should have at least one block"

**Impact:** Remove ~200 lines of test code with zero value

### Simplify/Consolidate (13 tests)
1. ⚠️ **In `interview-templates-schema.test.ts`:** Reduce 8 Zod-testing tests to 2:
   - Keep: "should parse a valid template"
   - Keep: "should reject invalid language codes"
   - Delete: All tests that just test Zod primitives (.min, .positive, etc)

2. ⚠️ **In `interview-templates.test.ts`:** Remove data structure assertions (3 tests):
   - "should have valid language codes in blocks"
   - "should have positive duration for blocks"
   - "should have questions in blocks"

3. ⚠️ **In `block-prompt.test.ts`:** Remove "should return a non-empty string"

**Impact:** Remove ~150 lines of low-value test code

### Total Cleanup
- **Delete:** ~25 tests (~350 lines)
- **Keep:** ~223 high-value tests
- **New test quality ratio:** ~100% meaningful tests

---

## What Makes a Good Test?

### ✅ GOOD Tests:
- Test **business logic**, not framework behavior
- Test **edge cases** and **error conditions**
- Test **complex interactions** between components
- Test **critical paths** (auth, payments, data integrity)
- Can **fail for valid reasons** (actual bugs)

### ❌ BAD Tests:
- Test that **React can render text**
- Test that **mocks return mocked data**
- Test **hardcoded configuration values**
- Test **framework/library internals** (Zod, React, etc)
- **Cannot fail** unless framework itself is broken

---

## Next Steps

Mr. User, should I:
1. Delete the 12 zero-value tests immediately?
2. Create a PR to clean up all low-value tests?
3. Write new integration tests to replace the mock-heavy ones?
