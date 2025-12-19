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

### LinkedIn Integration
**Goal:** Enable LinkedIn login and attempt to source professional context.

**Technical Constraints:**
- **NextAuth Login:** We will add the LinkedIn provider. This will provide the user's `name`, `email`, and `profile picture`.
- **Resume Data:** Since the LinkedIn API typically restricts full profile data (work history, education), the primary method for resume import will remain **PDF parsing** (using the LinkedIn "Save to PDF" feature as the source).
- **Workflow:** Users log in via LinkedIn for convenience, then upload their LinkedIn-exported PDF to populate their Preppal profile.
