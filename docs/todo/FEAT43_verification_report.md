# Spec Verification Report

**Spec**: FEAT43_block_interview_feedback_generation.md
**Verified**: 2026-01-01
**Overall Status**: ✅ PASS - Issues addressed in spec update

> **Note**: The spec has been updated to address all blocking issues and warnings identified below.
> The issues are preserved here for documentation purposes.

---

## Summary

- **Files**: 6 verified, 1 blocking issue
- **Methods/Functions**: 4 verified, 1 blocking issue
- **Libraries**: 1 verified, 0 issues
- **Data Models**: 3 verified, 1 blocking issue
- **Naming**: Consistent with codebase patterns

---

## Blocking Issues

Issues that must be fixed before implementation can proceed.

### [ISSUE-001] Schema mismatch: `InterviewBlock.transcript` field ✅ RESOLVED

**Spec says**: Add `transcript Bytes?` field directly on `InterviewBlock` model

```prisma
model InterviewBlock {
  // ... existing fields
  transcript   Bytes?
}
```

**Reality**: `InterviewBlock` currently has `transcriptId String? @unique` (line 266 in schema.prisma), not a `Bytes` field. The current implementation stores a reference ID, not the binary data.

**Current schema (lines 247-270)**:
```prisma
model InterviewBlock {
  // ...
  transcriptId String? @unique  // <-- Reference ID, not binary data
  @@unique([interviewId, blockNumber])
}
```

**Suggested fix**:
- Option A: Add new `transcript Bytes?` field alongside existing `transcriptId` (for backwards compatibility)
- Option B: Replace `transcriptId` with `transcript Bytes?` (breaking change, requires migration)
- **Recommended**: Option A - add the field, deprecate `transcriptId` later

> **Resolution**: Spec updated to clarify that `transcript Bytes?` is ADDED alongside existing `transcriptId`, which is marked as DEPRECATED.

---

### [ISSUE-002] `deserializeTranscript` not available server-side ✅ RESOLVED

**Spec says**: Use `deserializeTranscript()` in `src/server/lib/block-feedback.ts`:

```typescript
const transcriptText = deserializeTranscript(block.transcript);
```

**Reality**: `deserializeTranscript` exists only in **worker package** (`worker/src/transcript-manager.ts:131`), not in the Next.js server. The protobuf utilities (`@bufbuild/protobuf`, proto schemas) are worker dependencies.

**Suggested fix**:
1. Create a shared protobuf utility package accessible by both server and worker, OR
2. Create `src/server/lib/transcript-utils.ts` with protobuf deserialization (duplicate the dependency), OR
3. Store transcript as **both** binary and text in the database to avoid server-side deserialization

**Recommended**: Option 2 or 3 - create server-side transcript utilities with `@bufbuild/protobuf` and proto schemas as server dependencies, OR store plain text alongside binary.

> **Resolution**: Spec updated to add:
> - New section "5. Server-Side Transcript Utilities" with `src/server/lib/transcript-utils.ts`
> - New `transcriptBinaryToText()` function that deserializes and formats in one step
> - Prerequisites section documenting proto file sharing and dependency requirements

---

## Warnings

Non-blocking issues that should be reviewed.

### [WARN-001] Current `submitTranscript` discards block transcript data ✅ ACKNOWLEDGED

**Location**: `src/server/api/routers/interview-worker.ts:125-130`

**Current behavior**: For block-based interviews, the transcript binary is **DISCARDED** with a TODO comment:

```typescript
// TODO(FEAT28): Implement proper block transcript storage.
// Currently, the transcript binary data (transcriptBlob) is DISCARDED.
```

**Impact**: The spec assumes we can store and retrieve transcript data, but current code throws it away.

**Recommendation**: This confirms the need for ISSUE-001 fix - the `transcript Bytes?` field needs to be added and populated.

> **Resolution**: Spec implementation will store transcript blob to the new `transcript` field.

---

### [WARN-002] Gemini client pattern mismatch ✅ RESOLVED

**Spec proposes**: New file `src/server/lib/gemini-client.ts`

**Reality**: Gemini feedback generation already exists in `worker/src/utils/feedback.ts` with established patterns:
- Uses `@google/genai` (GoogleGenAI)
- Uses Zod schema validation for response
- Uses `gemini-2.0-flash` model

**Recommendation**:
- Follow the existing pattern in `worker/src/utils/feedback.ts` for consistency
- Consider: Can server share the worker's feedback utilities? Or duplicate with same patterns?
- Ensure the new server-side Gemini client uses the same model and validation approach

> **Resolution**: Spec updated to add section "6. Gemini Client" with explicit reference to existing pattern and matching implementation.

---

### [WARN-003] Worker feedback code removal scope ✅ RESOLVED

**Spec says**: Remove `generateAndSubmitFeedback` method and conditional feedback logic from worker.

**Reality**: The following code exists and needs removal:

1. **Method** `generateAndSubmitFeedback` at lines 165-192 in `interview-lifecycle-manager.ts`
2. **Conditional** at lines 109-115:
   ```typescript
   if (!blockNumber) {
     await this.generateAndSubmitFeedback(...);
   }
   ```
3. **Import** at line 10: `import { generateFeedback } from "../utils/feedback";`

**Recommendation**: Ensure all three are removed together. The `worker/src/utils/feedback.ts` file itself can remain (may be used elsewhere or for reference).

> **Resolution**: Spec updated with explicit "Code to Remove" section listing all three items with line numbers.

---

## Verified Items ✅

Items that passed verification.

| Category | Reference | Status |
|----------|-----------|--------|
| File | `prisma/schema.prisma` | ✅ Exists |
| File | `src/server/api/routers/interview-worker.ts` | ✅ Exists |
| File | `worker/src/services/interview-lifecycle-manager.ts` | ✅ Exists |
| File | `src/server/lib/block-feedback.ts` | ✅ New file (expected) |
| File | `src/server/lib/interview-feedback.ts` | ✅ New file (expected) |
| File | `src/server/lib/gemini-client.ts` | ✅ New file (expected) |
| Method | `workerProcedure` | ✅ Exists, imported at line 8 |
| Method | `submitTranscript` procedure | ✅ Exists at line 110 |
| Method | `serializeTranscript()` | ✅ Exists in worker (line 62) |
| Method | `formatTranscriptAsText()` | ✅ Exists in worker (line 139) |
| Model | `InterviewFeedback` | ✅ Exists (lines 151-169) |
| Model | `InterviewFeedback.interviewId @unique` | ✅ Confirmed at line 167 |
| Model | `InterviewBlock` | ✅ Exists (lines 247-270) |
| Model | `InterviewBlockFeedback` | ✅ New model (expected) |
| Library | `@google/genai` | ✅ Installed (in package.json) |

---

## Recommendations

1. **Before implementing**:
   - Fix ISSUE-001: Add `transcript Bytes?` field to `InterviewBlock` schema
   - Fix ISSUE-002: Create server-side transcript deserialization utilities

2. **Consider**:
   - Store transcript as both binary (for fidelity) and text (for easy feedback generation)
   - Follow existing `worker/src/utils/feedback.ts` patterns for new Gemini client

3. **Implementation order**:
   1. Schema migration (add `transcript` field, add `InterviewBlockFeedback` model)
   2. Create server-side protobuf/transcript utilities
   3. Create `block-feedback.ts` and `interview-feedback.ts`
   4. Modify `submitTranscript` to store transcript and trigger feedback
   5. Remove worker feedback code

---

## Updated Spec Recommendations

The spec should be updated to address:

1. **Schema**: Clarify whether `transcriptId` is replaced or `transcript` is added alongside
2. **Protobuf access**: Add step to install `@bufbuild/protobuf` as server dependency and copy/share proto schemas
3. **Alternative**: Consider storing `transcriptText String?` alongside `transcript Bytes?` to avoid server-side deserialization complexity
