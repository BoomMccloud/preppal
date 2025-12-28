# Backlog

## Active Feature Specifications

Features with detailed specs ready for implementation:

| ID | Feature | Status | Spec |
|----|---------|--------|------|
| FEAT25 | Email OTP Login | Complete | [FEAT25_email_otp_login.md](./FEAT25_email_otp_login.md) |
| FEAT26 | China Accessibility Testing | Pending | [FEAT26_china_accessibility.md](./FEAT26_china_accessibility.md) |
| FEAT27 | Segmented Interview Architecture | Pending | [FEAT27_interview_templates.md](./FEAT27_interview_templates.md) |
| FEAT28 | Results Storage & Extended Feedback | Pending | [FEAT28_extended_feedback_dimensions.md](./FEAT28_extended_feedback_dimensions.md) |

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
