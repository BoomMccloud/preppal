# Backlog

## Active Feature Specifications

Features with detailed specs ready for implementation:

| ID | Feature | Status | Spec |
|----|---------|--------|------|
| FEAT25 | Email OTP Login | Complete | [FEAT25_email_otp_login.md](./FEAT25_email_otp_login.md) |
| FEAT26 | China Accessibility Testing | Pending | [FEAT26_china_accessibility.md](./FEAT26_china_accessibility.md) |
| FEAT27 | Segmented Interview Architecture | Pending | [FEAT27_interview_templates.md](./FEAT27_interview_templates.md) |
| FEAT28 | Results Storage & Extended Feedback | Pending | [FEAT28_extended_feedback_dimensions.md](./FEAT28_extended_feedback_dimensions.md) |
| FEAT42 | Protobuf Reason Mapping | Ready | [FEAT42_protobuf_reason_mapping.md](./FEAT42_protobuf_reason_mapping.md) |

### FEAT27: Segmented Interview Architecture (Priority: High)

Replaces single 30-min session with multiple 3-min segments. Enables:
- **Question templates** - Teacher-defined questions
- **Per-answer time limits** - Hard 3-min cap
- **Bilingual mode** - Language switching between segments
- **30/70 repeat logic** - Include previous questions in follow-up interviews

*Supersedes: Interview Personas, Interview Panels (partial)*

### FEAT28: Results Storage & Extended Feedback (Priority: High)

Restructures how interview results are stored and displayed:
- **Per-segment transcripts** - Organized by question
- **9 feedback dimensions** - More comprehensive evaluation
- **Historical comparison** - Track improvement over time
- **Auto-save on disconnect** - Never lose interview data

---

## Channel Partner Requirements (B2B)

Based on feedback from education/training partners:

### Handled by Existing Features
- **Student isolation** - Guest login provides unique links per student
- **Interview quotas** - Teacher tracks manually (no system needed)
- **Parent-child accounts** - Teacher manages links manually

### Deferred / Future
- **Teacher dashboard** - Aggregate view of all student progress
- **Exportable reports** - PDF/Excel download of feedback
- **Batch comparison** - Compare multiple students side-by-side

---

## Technical Debt & Refactoring

### Dumb Driver Worker Refactor (Medium Priority)
**Goal:** Remove business logic from the Cloudflare Worker, making it a true "dumb driver."

**Current State:**
- Worker's `GeminiSession` contains business logic for error reporting
- Worker decides when to call `lifecycleManager.handleError()` based on close codes
- Multiple flags track close intent (`userInitiatedClose`, `blockTransitionClose`)
- Worker updates interview status directly in database

**Problem (First-Principle Violation):**
- Worker acts as a second "brain" alongside the client reducer
- Business logic in infrastructure layer makes testing harder
- Adding flags for each close scenario is a code smell
- Race conditions between worker error reporting and client state

**Ideal Architecture:**
- Worker only: connects to Gemini, forwards audio/transcripts, emits events
- Worker never: decides if something is an error, updates interview status
- Client owns: all error detection and reporting to database
- Clean separation: infrastructure (worker) vs business logic (client reducer)

**Implementation:**
1. Remove `lifecycleManager.handleError()` calls from worker
2. Worker emits `SESSION_ENDED` with reason code, doesn't interpret it
3. Client reducer decides if the close reason constitutes an error
4. Client dispatches `REPORT_ERROR` command if needed
5. Remove `userInitiatedClose`, `blockTransitionClose` flags from worker

**Benefit:** Passes the litmus test - "Can I test the entire flow without the worker?" Yes, by mocking driver events.

**Related:** FEAT43 block transition bug was fixed with a flag, but this refactor is the proper long-term solution.

---

### Consolidate Worker Logic (High Priority)
**Goal:** Eliminate duplication between the two backend paths used for Worker communication.

**Current State:**
- `src/server/api/routers/interview-worker.ts` (tRPC - used by Vitest integration tests)
- `src/app/api/worker/route.ts` (Protobuf/HTTP - used by production Cloudflare Worker)

**Implementation Details:**
- Extract business logic (prompt building, block status updates, transcript finalization) into `src/server/lib/worker-service.ts`.
- Refactor both endpoints to be thin wrappers around this service.
- **Benefit:** Ensures that "it works in tests" always means "it works in production."

---

## Feature Ideas

### JD Management (Reuse & Deduplication)
**Goal:** Streamline the interview setup by reusing existing JDs and preparing for a centralized JD database.

**Implementation Details:**
- **Storage:** JDs should be decoupled from sessions to allow reuse.
- **Future-Proofing:** Implement with the intent to eventually merge and deduplicate JDs uploaded by different users to create a high-quality shared library.
- **UI:** Add a "Select from Previous JDs" option during interview creation.

### Resume Integration
**Goal:** Source professional context from the user's resume.

**Implementation Details:**
- **Resume Data:** The primary method for resume import will be **PDF/File parsing** using Gemini Vision.
- **Workflow:** Users upload their resume (or LinkedIn "Save to PDF" export) to populate their Preppal profile and provide context for the interview session.

### Backend-Driven Interview Orchestration (Refinement for FEAT27)
**Goal:** Move interview state and segmentation logic from the frontend to the Cloudflare Worker for a seamless UX.

**Implementation Details:**
- **The "Smart Worker":** The Frontend maintains a single continuous WebSocket connection. The Worker internally manages the lifecycle of multiple Gemini sessions (one per segment).
- **State Persistence:** Move segment progress and question injection logic into the Durable Object.
- **Benefits:** Eliminates "Connecting..." spinners and hardware (camera/mic) flicker between segments.
- **Status:** To be explored after the initial Frontend-led implementation of FEAT27 is stabilized.

### User-Created Interview Templates (Template Builder)
**Goal:** Enable business users (teachers, trainers) to create custom interview templates through a UI without code deployment.

**Current State:**
- Templates are hardcoded TypeScript constants in `src/lib/interview-templates/definitions/`
- Only 1 template exists: `mba-behavioral-v1`
- Hardcoded checkbox on create-interview page
- No template management UI

**Implementation Details:**
- **Database Migration:**
  - Add `InterviewTemplate` Prisma model with JSON field for blocks/questions
  - Store template metadata (name, persona, ownership, visibility)
  - Migrate existing TypeScript templates to database
  - Use JSON field for block structure (validated at runtime with existing Zod schemas)
- **API Layer (tRPC):**
  - `template.list` - Get all accessible templates (public + user's custom)
  - `template.create` - Create custom template
  - `template.update` - Edit owned template
  - `template.delete` - Soft delete
  - `template.duplicate` - Copy template for customization
- **UI Components:**
  - `/templates` - Template management dashboard
  - `/templates/new` - Template builder with block/question editor
  - Update `/create-interview` with template selector (replace hardcoded checkbox)
- **Access Control:**
  - System templates (public, read-only, can duplicate)
  - Custom templates (private to creator, full CRUD)

**Benefits:**
- Business users can create templates without deploying code
- Teachers can customize interview questions for their curriculum
- No deployments needed for new interview types
- Scalable template library

**Estimated Effort:** 2-3 weeks

**Detailed Analysis:** See [05_current_task.md](../05_current_task.md) for full architectural analysis and implementation plan.

### Credit System & Monetization
**Goal:** Manage interview usage through a credit-based system.

**Implementation Details:**
- **Free Tier:** Users get 1 free interview upon sign-up.
- **Credits:** Users can buy credits to conduct more interviews in the future.
- **Scope:** Credits apply to all interview types, including those using custom Personas or part of an Interview Panel.
- **Schema:**
    - Add a `credits` field to the `User` model.
    - Implement a transaction system to track credit purchases and usage.
- **UI:** Show credit balance in the dashboard and handle payment flows/insufficient credit states.

---

## Testing & Quality (Stabilization)

### Test Database Setup
**Goal:** Use a real, isolated database for tests instead of mocks or shared Neon.

**Implementation Details:**
- Configure `TEST_DATABASE_URL` pointing to an isolated test database.
- Global setup/teardown in Vitest to reset state between test runs.
- Ensure CI/CD compatibility (GitHub Actions).
- **Future:** Use Neon branching for ephemeral test branches (paid feature, revisit when user base grows).

**Benefit:** Catches real DB errors (constraints, relations) that mocks miss, without polluting dev data.

### UI Smoke Testing
**Goal:** Reduce UI test maintenance by focusing on visibility rather than interaction.

**Implementation Details:**
- Simplify component tests to verify that core pages (`/lobby`, `/session`, `/feedback`) render without crashing given valid data.
- Remove tests that verify specific CSS classes or internal component states.

---

## Archived / Superseded

### ~~Interview Personas~~ → Superseded by FEAT27
Custom interviewer personas are now part of Interview Templates in FEAT27.

### ~~Email One-Time Code Login~~ → Complete (FEAT25)
Implemented and merged. See [FEAT25_email_otp_login.md](./FEAT25_email_otp_login.md).

### ~~Interview Panels~~ → Partially superseded by FEAT27
Multi-stage interview sequences are now handled by the segmented interview architecture.
