# Testing Strategy Refactor: "Fewer, Better Tests"

## 1. Problem Statement
The current testing suite has become a maintenance burden rather than a safety net. 
- **Fragility:** Unit tests rely heavily on mocks (e.g., verifying `findUnique` arguments), meaning refactoring implementation details breaks tests even if behavior remains correct.
- **Flakiness:** Browser-based E2E tests (Playwright) are prone to timing issues, rendering delays, and environmental instability.
- **Low Confidence:** Passing tests often don't guarantee the application works because mocks can hide database or schema integration issues.

## 2. Strategic Goal
Shift to a **Backend-First System Testing** approach. We aim to verify the *business logic* and *data flow* comprehensively without the overhead of browser automation or the fragility of implementation-coupled mocks.

## 3. The New Testing Pyramid

### A. "Golden Path" System Tests (High Value)
**What:** A single, readable specification file (`core-journey.test.ts`) that executes the entire user journey via tRPC callers. 
**Infrastructure:** Runs against a **real SQLite test database** (reset per run), not mocks.
**Purpose:** Acts as both a verification tool and a living documentation/specification of the system's core behavior.
**Scope:**
1. **Setup:** Create a user context.
2. **Creation:** Call `createSession` -> Verify DB record exists.
3. **Connection:** Call `generateWorkerToken` -> Verify valid JWT.
4. **Execution:** Call `updateStatus` (as Worker) -> Verify status transition to `IN_PROGRESS`.
5. **Completion:** Call `submitTranscript` & `submitFeedback` (as Worker) -> Verify data persistence.
6. **Result:** Call `getById` (as User) -> Verify feedback and completed status.

### B. Integration Tests (Backend)
**What:** Focused tests for specific tRPC routers (Auth, Interview, Profile).
**Change:** Stop mocking Prisma. Use the real test database.
**Why:** Catches schema errors, unique constraint violations, and relationship issues that mocks miss.

### C. Logic & Worker Tests (Keep)
**What:** 
1. **Worker Tests:** Existing tests in `worker/src/__tests__` (e.g., `gemini-integration.test.ts`).
2. **Audio Logic:** Browser-side logic in `src/lib/audio/` (e.g., `TranscriptManager.test.ts`).
**Action:** Maintain these as high-value unit/integration tests for complex logic.

### D. UI "Smoke" Tests (Minimal)
**What:** Verify that critical pages (Lobby, Session, Feedback) *render* without crashing.
**Action:** Keep existing component tests in `src/app/_components/*.test.tsx` that verify basic mounting and rendering. Remove tests that check for specific CSS or layout details.
**Tool:** React Testing Library (Vitest).

## 4. Implementation Plan

### Step 1: Infrastructure Setup
- Configure a separate `test.db` SQLite database for the test environment.
- Create a `setup-system-test.ts` file to handle DB initialization and cleanup.
  - **KISS:** Use simple `prisma db push` or pre-migrated file copying for resets instead of complex migration logic.
- **Concurrency:** Ensure DB-heavy tests run serially (Vitest `--no-threads` or similar) to avoid SQLite locking.

### Step 2: The Golden Path & Refactoring
- Implement `src/test/system/core-journey.test.ts`.
- **Refactor Integration Tests:** Move `src/test/integration/` to use the real `test.db` and remove Prisma mocks.
- **CI Setup:** Update GitHub Actions to set `DATABASE_URL=file:./test.db` during the test step.

### Step 3: Cleanup
- **Delete:** `src/test/e2e/` (Playwright tests).
- **Prune:** Identify and remove unit tests that primarily test mock interactions rather than business outcomes.

## 5. Definition of Done
- `pnpm test` runs the new Golden Path system test successfully.
- Tests run against a real database.
- No Playwright dependency required for core CI validation.
- Documentation updated to reflect the new strategy.
