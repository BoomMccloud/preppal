# Current Task: Create Interview Page Implementation

## Status: ✅ COMPLETED

## Implementation Summary

Successfully implemented the Create Interview page with full TDD approach following the red-green-refactor cycle, adhering to the specifications in `docs/11_trcp.md`. **Fixed resume snapshot issue identified by company feedback.**

## Changes Made

### 1. Database Schema
- Added `idempotencyKey String @unique` field to Interview model in [prisma/schema.prisma](../prisma/schema.prisma#L80)
- **Added `resumeSnapshot String?` field to Interview model** in [prisma/schema.prisma](../prisma/schema.prisma#L97)
- Applied schema changes with `pnpm db:push`

### 2. Backend (tRPC)
- Implemented `interview.createSession` mutation in [src/server/api/routers/interview.ts](../src/server/api/routers/interview.ts#L31)
- Input validation with Zod using a `discriminatedUnion` for `jobDescription` and `resume` inputs, plus an `idempotencyKey`.
- **Resume content handling:**
  - For `type: "text"`: Saves resume content to `resumeSnapshot`
  - For `type: "reference"`: Fetches resume from database and saves to `resumeSnapshot`
- Job Description content handling:
  - For `type: "text"`: Saves content to `jobDescriptionSnapshot`
  - For `type: "reference"`: Fetches from database and saves to `jobDescriptionSnapshot`
- Idempotency check: Returns existing interview if `idempotencyKey` already exists.
- Race condition handling: Catches Prisma unique constraint errors.
- Creates interview with `PENDING` status.

### 3. Frontend
- Converted Create Interview page to client component in [src/app/(app)/create-interview/page.tsx](../src/app/(app)/create-interview/page.tsx)
- Implemented text areas for Job Description and Resume.
- Form state management with `useState` hooks.
- Idempotency key generated once on component mount using `useState(() => ...)`
- tRPC mutation integration with `api.interview.createSession.useMutation`.
- Sends data as discriminated unions: `{ type: "text", content: "..." }`
- Programmatic redirect to lobby on success.
- Inline error message display (no toast library needed).
- Button disabled when fields are empty or submission pending.
- Loading state shows "Creating..." text.

### 4. Tests (TDD Approach)
- **RED → GREEN → REFACTOR** cycle followed for both initial implementation and resume snapshot fix
- Backend tests in [src/server/api/routers/interview.test.ts](../src/server/api/routers/interview.test.ts)
  - ✅ Creates interview with PENDING status using discriminated union inputs
  - ✅ **Verifies resumeSnapshot is saved correctly**
  - ✅ Returns existing interview for duplicate idempotencyKey
- Frontend tests in [src/app/(app)/create-interview/page.test.tsx](../src/app/(app)/create-interview/page.test.tsx)
  - ✅ Calls mutation with discriminated union structure
  - ✅ Button disabled when fields empty
  - ✅ Button enabled when both fields filled
  - ✅ Redirects to lobby on success
  - ✅ Displays error message on failure

### 5. Seed Data
- Updated [prisma/seed.ts](../prisma/seed.ts#L151) to include `idempotencyKey` and **`resumeSnapshot`** for demo interview.

## Test Results
All tests passing:
- Backend: 2/2 tests passed
- Frontend: 5/5 tests passed

## Company Feedback Addressed
✅ **Fixed critical issue**: Resume content is now properly saved to `resumeSnapshot` field in the database, ensuring complete historical records for all interviews.

## Next Steps
According to [docs/11_trcp.md](./11_trcp.md), the next implementation should be:
1. Dashboard Page (`getHistory`) - to list created interviews
