# Backlog

## Feature Ideas

### Interview Personas
**Goal:** Allow users to create custom interviewer personas that can be shared or accessed by the community.

**Implementation Details:**
- **Visibility:** Supported modes are **Private** (only owner) and **Public** (visible to all).
- **Forking:** Users cannot fork or copy existing personas for now; they must use them as-is or create their own.
- **Schema:** Create a `Persona` model with fields like `name`, `systemInstruction`, `voiceSettings`, `ownerId`, and `visibility` (PRIVATE, PUBLIC).
- **UI:** A "Persona Builder" form in the user dashboard and a "Community Hub" to browse and select public personas.

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


### Interview Panels
**Goal:** Allow users to define a sequence of interview stages (e.g., HR, Tech, Hiring Manager, Senior Management) for a specific job application to simulate a full hiring loop.

**Implementation Details:**
- **Schema:**
    - `InterviewPanel`: Represents the overall sequence (e.g., "FAANG Senior Engineer Loop").
    - `InterviewPanelStage`: Links a `Persona` to a position in the panel sequence.
    - `InterviewSession`: Update to optionally link to a `PanelStage` to track progress within a loop.
- **Workflow:**
    - Users can select pre-defined templates (e.g., "Standard Tech Loop") or create custom sequences by selecting multiple personas.
    - Progress is tracked across stages, allowing users to visualize their journey through the hiring process.
- **Aggregation:** A "Panel Summary" report that aggregates feedback across all stages to provide a holistic view of the candidate's performance and "hiring readiness".

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
