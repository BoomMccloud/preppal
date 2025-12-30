# FEAT37: Worker Service Consolidation

## Problem Statement

The codebase has two parallel communication channels for Worker-to-Backend communication with **70-80% duplicated business logic**:

1. **tRPC Endpoint** (`src/server/api/routers/interview-worker.ts`) - JSON protocol, used by Vitest integration tests
2. **HTTP/Protobuf Endpoint** (`src/app/api/worker/route.ts`) - Binary protobuf, used by production Cloudflare Worker

This creates maintenance burden and risk of behavioral divergence between test and production environments.

## Root Cause Analysis

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Worker (Production)              │
│                              │                                  │
│                    HTTP POST + Protobuf                         │
│                              ▼                                  │
│         ┌────────────────────────────────────────┐              │
│         │   /api/worker/route.ts (470 lines)     │              │
│         │   - handleGetContext()                 │              │
│         │   - handleUpdateStatus()               │              │
│         │   - handleSubmitTranscript()           │              │
│         │   - handleSubmitFeedback()             │              │
│         │   - Business logic duplicated here     │              │
│         └────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Vitest Integration Tests                    │
│                              │                                  │
│                    tRPC (JSON)                                  │
│                              ▼                                  │
│         ┌────────────────────────────────────────┐              │
│         │   interview-worker.ts (227 lines)      │              │
│         │   - getContext()                       │              │
│         │   - submitTranscript()                 │              │
│         │   - submitFeedback()                   │              │
│         │   - Business logic duplicated here     │              │
│         └────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Duplicated Business Logic

| Logic | Location in tRPC | Location in HTTP | Risk |
|-------|------------------|------------------|------|
| Block status → IN_PROGRESS | `interview-worker.ts:74-86` | `route.ts:138-149` | Divergent behavior |
| Block status → COMPLETED | `interview-worker.ts:140-153` | `route.ts:243-256` | Divergent behavior |
| Interview completion check | `interview-worker.ts:155-169` | `route.ts:258-272` | Divergent behavior |
| Transcript finalization | `interview-worker.ts:171-186` | `route.ts:274-290` | Divergent behavior |
| Feedback upsert | `interview-worker.ts:200-220` | `route.ts:310-330` | Divergent behavior |
| Prompt building | `interview-worker.ts:47-70` | `route.ts:95-120` | Divergent behavior |

## First Principles Analysis

**What should each layer be responsible for?**

| Layer | Responsibility | Should NOT contain |
|-------|---------------|-------------------|
| HTTP Route | Protobuf encode/decode, auth validation | Business logic |
| tRPC Router | Input validation, auth middleware | Business logic |
| Service Layer | All business logic, DB operations | Protocol concerns |

**Conclusion**: Extract shared business logic into a unified service layer that both adapters call.

## Solution: Worker Service Layer

Create `src/server/lib/worker-service.ts` with all shared business logic:

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│         /api/worker/route.ts          interview-worker.ts       │
│         (HTTP/Protobuf adapter)       (tRPC adapter)            │
│                │                            │                   │
│                └──────────┬─────────────────┘                   │
│                           ▼                                     │
│         ┌────────────────────────────────────────┐              │
│         │   src/server/lib/worker-service.ts     │              │
│         │   - getInterviewContext()              │              │
│         │   - updateInterviewStatus()            │              │
│         │   - submitBlockTranscript()            │              │
│         │   - submitStandardTranscript()         │              │
│         │   - submitInterviewFeedback()          │              │
│         └────────────────────────────────────────┘              │
│                           │                                     │
│                           ▼                                     │
│         ┌────────────────────────────────────────┐              │
│         │   Prisma DB + Interview Templates      │              │
│         └────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Service Interface

```typescript
// src/server/lib/worker-service.ts

export interface InterviewContext {
  jobDescription: string;
  resume: string;
  persona: string;
  durationMs: number;
  systemPrompt?: string;
  language?: "en" | "zh";
}

export const workerService = {
  /**
   * Get interview context for worker initialization.
   * If blockNumber provided, also marks block as IN_PROGRESS.
   */
  async getInterviewContext(params: {
    interviewId: string;
    blockNumber?: number;
  }): Promise<InterviewContext>,

  /**
   * Update interview status (used by updateStatus operation).
   */
  async updateInterviewStatus(params: {
    interviewId: string;
    status: InterviewStatus;
    endedAt?: Date;
  }): Promise<{ success: boolean }>,

  /**
   * Submit transcript for block-based interview.
   * Marks block as COMPLETED, checks if last block.
   */
  async submitBlockTranscript(params: {
    interviewId: string;
    blockNumber: number;
    transcript: Buffer;
    endedAt: Date;
  }): Promise<{ success: boolean }>,

  /**
   * Submit transcript for standard interview.
   * Stores transcript blob, marks interview COMPLETED.
   */
  async submitStandardTranscript(params: {
    interviewId: string;
    transcript: Buffer;
    endedAt: Date;
  }): Promise<{ success: boolean }>,

  /**
   * Submit AI-generated feedback (idempotent upsert).
   */
  async submitInterviewFeedback(params: {
    interviewId: string;
    summary: string;
    strengths: string;
    contentAndStructure: string;
    communicationAndDelivery: string;
    presentation: string;
  }): Promise<InterviewFeedback>,
};
```

### Adapter Pattern

**tRPC Router** (after refactor):
```typescript
// src/server/api/routers/interview-worker.ts
import { workerService } from "~/server/lib/worker-service";

export const interviewWorkerRouter = createTRPCRouter({
  getContext: workerProcedure
    .input(z.object({ interviewId: z.string(), blockNumber: z.number().optional() }))
    .query(async ({ input }) => {
      return workerService.getInterviewContext(input);
    }),

  updateStatus: workerProcedure
    .input(z.object({
      interviewId: z.string(),
      status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "ERROR"]),
      endedAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return workerService.updateInterviewStatus({
        interviewId: input.interviewId,
        status: input.status,
        endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
      });
    }),

  submitTranscript: workerProcedure
    .input(submitTranscriptSchema)
    .mutation(async ({ input }) => {
      if (input.blockNumber) {
        return workerService.submitBlockTranscript({
          interviewId: input.interviewId,
          blockNumber: input.blockNumber,
          transcript: Buffer.from(input.transcript, "base64"),
          endedAt: new Date(input.endedAt),
        });
      }
      return workerService.submitStandardTranscript({
        interviewId: input.interviewId,
        transcript: Buffer.from(input.transcript, "base64"),
        endedAt: new Date(input.endedAt),
      });
    }),

  submitFeedback: workerProcedure
    .input(feedbackSchema)
    .mutation(async ({ input }) => {
      return workerService.submitInterviewFeedback(input);
    }),
});
```

**HTTP Route** (after refactor):
```typescript
// src/app/api/worker/route.ts
import { workerService } from "~/server/lib/worker-service";

async function handleGetContext(req: GetContextRequest): Promise<GetContextResponse> {
  const result = await workerService.getInterviewContext({
    interviewId: req.interviewId,
    blockNumber: req.blockNumber,
  });
  return GetContextResponse.create({
    jobDescription: result.jobDescription,
    resume: result.resume,
    persona: result.persona,
    durationMs: BigInt(result.durationMs),
    systemPrompt: result.systemPrompt,
    language: result.language,
  });
}

// Similar pattern for other handlers...
```

## Benefits

1. **Single Source of Truth** - Business logic in one place
2. **Test Parity** - "Works in tests" = "Works in production"
3. **Easier Maintenance** - Fix bugs once, not twice
4. **Clearer Architecture** - Adapters handle protocol, service handles logic
5. **Better Testing** - Service can be unit tested independently
6. **Reduced Code** - ~50 fewer lines net

## Implementation Checklist

### Phase 1: Create Worker Service
- [ ] Create `src/server/lib/worker-service.ts`
- [ ] Implement `getInterviewContext()` (extract from both endpoints)
- [ ] Implement `updateInterviewStatus()` (extract from HTTP endpoint)
- [ ] Implement `submitBlockTranscript()` (extract from both endpoints)
- [ ] Implement `submitStandardTranscript()` (extract from both endpoints)
- [ ] Implement `submitInterviewFeedback()` (extract from both endpoints)
- [ ] Add JSDoc comments and input validation

### Phase 2: Refactor tRPC Router
- [ ] Import `workerService` in `interview-worker.ts`
- [ ] Replace `getContext` body with service call
- [ ] Add `updateStatus` procedure (new - for parity with HTTP endpoint)
- [ ] Replace `submitTranscript` body with service call
- [ ] Replace `submitFeedback` body with service call
- [ ] Remove duplicate business logic

### Phase 3: Refactor HTTP Route
- [ ] Import `workerService` in `route.ts`
- [ ] Replace `handleGetContext()` body with service call
- [ ] Replace `handleUpdateStatus()` body with service call
- [ ] Replace `handleSubmitTranscript()` body with service call
- [ ] Replace `handleSubmitFeedback()` body with service call
- [ ] Keep protobuf encoding/decoding in route handlers

### Phase 4: Testing & Cleanup
- [ ] Run `pnpm check` to verify no type errors
- [ ] Run `pnpm test` to verify all existing tests pass
- [ ] Add unit tests for `worker-service.ts`
- [ ] Remove dead code from both endpoints

## Test Scenarios

### Unit Tests (`src/test/unit/worker-service.test.ts`)

**getInterviewContext:**
1. Returns correct context for standard interview
2. Returns correct context for block-based interview
3. Marks block as IN_PROGRESS when blockNumber provided
4. Throws error for non-existent interview
5. Throws error for invalid block number

**updateInterviewStatus:**
6. Updates interview status to IN_PROGRESS
7. Updates interview status to COMPLETED with endedAt
8. Throws error for non-existent interview

**submitBlockTranscript:**
9. Marks block as COMPLETED
7. Marks interview as COMPLETED when last block
8. Does NOT mark interview COMPLETED when more blocks remain
9. Throws error for non-existent block

**submitStandardTranscript:**
10. Stores transcript in TranscriptEntry
11. Marks interview as COMPLETED
12. Throws error for non-existent interview

**submitInterviewFeedback:**
13. Creates new feedback record
14. Updates existing feedback (idempotent upsert)
15. Returns complete InterviewFeedback object

### Integration Tests (Existing)

**Verify existing tests still pass:**
- `src/test/integration/block-interview-golden-path.test.ts`
- `src/test/integration/interview-blocks.test.ts`

These tests use tRPC endpoint, so they implicitly test the service layer after refactor.

### Edge Cases

16. Concurrent transcript submissions - verify no race conditions
17. Feedback submission before interview completion - should succeed
18. Block transcript with empty buffer - verify handling

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking production worker | Run full integration test suite before merge |
| Protobuf encoding issues | Keep encoding/decoding in route handlers only |
| Type mismatches | Service uses shared types, adapters map protocol-specific types |
| Behavioral differences discovered | Document and align on correct behavior before refactor |

## Related Files

**To Create:**
- `src/server/lib/worker-service.ts` - New service layer
- `src/test/unit/worker-service.test.ts` - Unit tests

**To Modify:**
- `src/server/api/routers/interview-worker.ts` - tRPC adapter (refactor)
- `src/app/api/worker/route.ts` - HTTP adapter (refactor)

**Dependencies (read-only):**
- `src/lib/interview-templates/index.ts` - Template loading
- `src/lib/interview-templates/prompt.ts` - Prompt building
- `src/server/lib/interview-access.ts` - Duration constants
- `src/server/db.ts` - Prisma client
- `proto/interview.proto` - Protobuf definitions
