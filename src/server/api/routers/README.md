# Interview Router Architecture

This folder contains the tRPC routers that power the Preppal API. The interview-related routers (`interview.ts` and `interview-worker.ts`) handle the complete interview lifecycle from creation to feedback delivery.

## Quick Reference

| File                   | Purpose                                         | Auth Type        |
| ---------------------- | ----------------------------------------------- | ---------------- |
| `interview.ts`         | User-facing interview operations                | Mixed            |
| `interview-worker.ts`  | Worker-only operations (context, transcripts)   | Worker only      |
| `auth.ts`              | Email OTP authentication                        | Public           |
| `user.ts`              | User profile management                         | Protected        |
| `debug.ts`             | Development-only debugging endpoints            | Public (dev)     |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            tRPC API LAYER                                    │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         root.ts (appRouter)                            │  │
│  │                                                                         │  │
│  │   interview ─────────┐                                                 │  │
│  │   interviewWorker ───┼──→ Interview lifecycle management               │  │
│  │   auth ──────────────┼──→ Email OTP authentication                     │  │
│  │   user ──────────────┼──→ User profile                                 │  │
│  │   debug ─────────────┘──→ Dev-only debugging                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Procedure Types                                │  │
│  │                                                                         │  │
│  │   publicProcedure    │ No auth required, session optional              │  │
│  │   protectedProcedure │ Requires session auth (logged-in user)          │  │
│  │   flexibleProcedure  │ Session OR worker shared secret                 │  │
│  │   workerProcedure    │ Worker shared secret only                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Interview Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTERVIEW LIFECYCLE                                  │
│                                                                              │
│  1. CREATION (User via interview.createSession)                             │
│     ┌──────────┐                                                            │
│     │ PENDING  │ ← Interview created with idempotency key                   │
│     └────┬─────┘   Job description + resume snapshotted                     │
│          │         InterviewBlocks created if template provided             │
│          │                                                                   │
│  2. SESSION START (User via interview.generateWorkerToken)                  │
│          │                                                                   │
│          ▼                                                                   │
│     ┌──────────────┐                                                        │
│     │ IN_PROGRESS  │ ← Worker fetches context, starts Gemini session       │
│     └────┬─────────┘   Status updated via interview.updateStatus            │
│          │                                                                   │
│  3. COMPLETION (Worker via interviewWorker.submitTranscript)                │
│          │                                                                   │
│          ▼                                                                   │
│     ┌──────────────┐                                                        │
│     │  COMPLETED   │ ← Transcript saved, feedback generated                 │
│     └──────────────┘   Status updated via interview.updateStatus            │
│                                                                              │
│  ERROR PATH:                                                                │
│     Any stage ──→ ERROR (via interview.updateStatus)                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Interview Router (`interview.ts`)

Handles user-facing interview operations with mixed authentication requirements.

### Procedures

| Procedure              | Type        | Description                                |
| ---------------------- | ----------- | ------------------------------------------ |
| `createSession`        | protected   | Create new interview with idempotency      |
| `getHistory`           | protected   | List user's past interviews                |
| `getById`              | public      | Get interview details (owner or guest)     |
| `getCurrent`           | protected   | Get active IN_PROGRESS interview           |
| `getFeedback`          | public      | Get interview with feedback (owner/guest)  |
| `delete`               | protected   | Delete an interview                        |
| `createGuestLink`      | protected   | Generate shareable guest link              |
| `generateWsToken`      | protected   | Generate JWT for WebSocket (deprecated)    |
| `generateWorkerToken`  | public      | Generate JWT for worker connection         |
| `updateStatus`         | flexible    | Update interview status                    |
| `completeBlock`        | flexible    | Mark a block as completed                  |
| `getTranscript`        | public      | Get transcript (dev only)                  |

### createSession

Creates a new interview record with idempotent behavior.

```typescript
// Input
{
  jobDescription: { type: "text", content: "..." } | { type: "reference", jobDescriptionId: "..." },
  resume: { type: "text", content: "..." } | { type: "reference", resumeId: "..." },
  idempotencyKey: string,           // Prevents duplicate creation
  persona?: string,                  // Custom interviewer persona
  duration?: "SHORT" | "STANDARD" | "EXTENDED",  // 10/30/60 minutes
  templateId?: string,              // For block-based interviews
}

// Behavior
1. Check for existing interview with same idempotencyKey → return if exists
2. Resolve job description (text or fetch from reference)
3. Resolve resume (text or fetch from reference)
4. Create Interview record with status: PENDING
5. If templateId provided → create InterviewBlock records
6. Handle race condition via unique constraint catch
```

### generateWorkerToken

Generates a short-lived JWT for authenticating WebSocket connections to the worker.

```typescript
// Input
{ interviewId: string, token?: string }  // token for guest access

// Validation
1. Check access via owner (session) or guest (token)
2. Verify interview status is valid:
   - Standard: must be PENDING
   - Block-based: can be PENDING or IN_PROGRESS
3. Generate HS256 JWT valid for 5 minutes

// JWT Payload
{
  userId: string,      // Interview owner's ID (even for guests)
  interviewId: string,
  isGuest: boolean,
  iat: number,
  exp: number,         // 5 minutes from now
}
```

### updateStatus

Updates interview status. Used by both users and worker.

```typescript
// Input
{
  interviewId: string,
  status: "IN_PROGRESS" | "COMPLETED" | "ERROR",
  endedAt?: string,  // ISO timestamp
}

// Behavior (flexibleProcedure)
- User auth: verifies ownership
- Worker auth: no ownership check
- IN_PROGRESS: sets startedAt
- COMPLETED/ERROR: sets endedAt
```

### Access Control

Two access patterns supported via `getInterviewWithAccess()`:

```typescript
// Owner access (session-based)
if (userId && interview.userId === userId) → { interview, isGuest: false }

// Guest access (token-based)
if (token === interview.guestToken && !expired) → { interview, isGuest: true }
```

Guest links:
- Generated via `createGuestLink`
- 24-hour expiration
- Allows read access to interview and feedback
- Allows starting interview session (via generateWorkerToken)

## Interview Worker Router (`interview-worker.ts`)

Handles operations called exclusively by the Cloudflare Worker.

### Procedures

| Procedure          | Type   | Description                           |
| ------------------ | ------ | ------------------------------------- |
| `getContext`       | worker | Fetch interview context for Gemini    |
| `submitTranscript` | worker | Save transcript blob after session    |
| `submitFeedback`   | worker | Save AI-generated feedback            |

### getContext

Fetches interview context for the Gemini Live API session.

```typescript
// Input
{ interviewId: string, blockNumber?: number }

// Output (standard interview)
{
  jobDescription: string,
  resume: string,
  persona: string,                    // e.g., "professional interviewer"
  durationMs: number,                 // 600000 / 1800000 / 3600000
  systemPrompt: undefined,
  language: undefined,
}

// Output (block-based interview)
{
  jobDescription: string,
  resume: string,
  persona: string,                    // From template
  durationMs: number,                 // Block-specific duration
  systemPrompt: string,               // Built from template
  language: string,                   // Block language (e.g., "en", "zh")
}

// Side effect (block-based only)
- Updates InterviewBlock to IN_PROGRESS with startedAt
```

### submitTranscript

Saves the transcript after a session ends.

```typescript
// Input
{
  interviewId: string,
  transcript: string,      // Base64-encoded protobuf blob
  endedAt: string,         // ISO timestamp
  blockNumber?: number,    // For block-based interviews
}

// Standard interview behavior
- Upsert TranscriptEntry with protobuf blob
- Update Interview status to COMPLETED

// Block-based interview behavior
- Update InterviewBlock with transcriptId, endedAt, status: COMPLETED
- If last block → update Interview to COMPLETED
```

### submitFeedback

Saves AI-generated feedback (idempotent upsert).

```typescript
// Input
{
  interviewId: string,
  summary: string,
  strengths: string,
  contentAndStructure: string,
  communicationAndDelivery: string,
  presentation: string,
}

// Behavior
- Upsert InterviewFeedback record
- Returns the feedback record
```

## Procedure Types

Defined in `trpc.ts`:

### publicProcedure

No authentication required. Session may be present but not guaranteed.

```typescript
export const publicProcedure = t.procedure.use(timingMiddleware);
```

Used for: `getById`, `getFeedback`, `generateWorkerToken`, `getTranscript`

### protectedProcedure

Requires session authentication. Guarantees `ctx.session.user` is non-null.

```typescript
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: { session: { ...ctx.session, user: ctx.session.user } },
    });
  });
```

Used for: `createSession`, `getHistory`, `getCurrent`, `delete`, `createGuestLink`, `generateWsToken`

### flexibleProcedure

Accepts either session auth OR worker shared secret.

```typescript
// Context includes authType for conditional logic
ctx.authType: "user" | "worker"

// User auth: ctx.session.user available
// Worker auth: no session, but trusted
```

Used for: `updateStatus`, `completeBlock`

### workerProcedure

Only accepts worker shared secret (via `Authorization: Bearer <secret>`).

```typescript
export const workerProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    const authHeader = ctx.headers.get("authorization");
    if (!validateWorkerAuth(authHeader)) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { authType: "worker" as const } });
  });
```

Used for: `getContext`, `submitTranscript`, `submitFeedback`

## Block-Based Interviews

For interviews using templates, the system creates multiple `InterviewBlock` records.

### Block Lifecycle

```
┌──────────┐   getContext    ┌─────────────┐   submitTranscript   ┌───────────┐
│ PENDING  │ ───────────────→│ IN_PROGRESS │ ────────────────────→│ COMPLETED │
└──────────┘                 └─────────────┘                      └───────────┘
     ↑                            ↑                                    │
     │                            │                                    │
     │                     Worker connects,                            │
     │                     block.startedAt set                         │
     │                                                                 │
     └─── Created during createSession ────────────────────────────────┘
                                                    If last block,
                                                    Interview → COMPLETED
```

### Template Integration

```typescript
// createSession creates blocks from template
if (template && isBlockBased) {
  const blockData = template.blocks.map((block, index) => ({
    interviewId: interview.id,
    blockNumber: index + 1,  // 1-indexed
    language: block.language.toUpperCase(),
    questions: block.questions.map(q => q.content),
    status: "PENDING",
  }));
  await ctx.db.interviewBlock.createMany({ data: blockData });
}

// getContext builds block-specific system prompt
const systemPrompt = buildBlockPrompt({
  blockNumber,
  language: templateBlock.language,
  durationSec: templateBlock.durationSec,
  questions: templateBlock.questions,
  // ...
});
```

## Data Flow

### Interview Creation to Session Start

```
┌──────────┐      createSession       ┌───────────────┐
│  Client  │ ────────────────────────→│ interview.ts  │
│   (UI)   │                          │               │
└──────────┘                          └───────┬───────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │   Database    │
                                      │  (Interview)  │
                                      └───────────────┘

┌──────────┐    generateWorkerToken   ┌───────────────┐
│  Client  │ ────────────────────────→│ interview.ts  │
│   (UI)   │ ←────────────────────────│               │
└──────────┘         JWT token        └───────────────┘

┌──────────┐      WebSocket + JWT     ┌───────────────┐
│  Client  │ ────────────────────────→│    Worker     │
│   (UI)   │                          │ (Durable Obj) │
└──────────┘                          └───────┬───────┘
                                              │
                                              ▼
                                      ┌───────────────┐     getContext
                                      │ interview-    │ ←────────────────
                                      │ worker.ts     │
                                      └───────────────┘
```

### Session Completion

```
┌───────────────┐   submitTranscript   ┌───────────────┐
│    Worker     │ ────────────────────→│ interview-    │
│ (Durable Obj) │                      │ worker.ts     │
└───────────────┘                      └───────┬───────┘
                                               │
                                               ▼
                                       ┌───────────────┐
                                       │   Database    │
                                       │ (Transcript,  │
                                       │  Interview)   │
                                       └───────────────┘

┌───────────────┐    submitFeedback    ┌───────────────┐
│    Worker     │ ────────────────────→│ interview-    │
│ (Durable Obj) │                      │ worker.ts     │
└───────────────┘                      └───────────────┘
```

## Input Validation Schemas

Defined in `src/lib/schemas/interview.ts`:

```typescript
// Discriminated unions for flexible input
export const JobDescriptionInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), content: z.string().min(1) }),
  z.object({ type: z.literal("reference"), jobDescriptionId: z.string() }),
]);

export const ResumeInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), content: z.string().min(1) }),
  z.object({ type: z.literal("reference"), resumeId: z.string() }),
]);
```

## Duration Configuration

Defined in `src/server/lib/interview-access.ts`:

```typescript
export const DURATION_MS: Record<InterviewDuration, number> = {
  SHORT: 10 * 60 * 1000,      // 10 minutes
  STANDARD: 30 * 60 * 1000,   // 30 minutes (default)
  EXTENDED: 60 * 60 * 1000,   // 60 minutes
};
```

## Error Handling

Standard tRPC error codes used:

| Code                   | When Used                                    |
| ---------------------- | -------------------------------------------- |
| `UNAUTHORIZED`         | Missing or invalid authentication            |
| `NOT_FOUND`            | Interview/block not found or no access       |
| `BAD_REQUEST`          | Invalid interview state for operation        |
| `FORBIDDEN`            | Dev-only endpoint in production              |
| `INTERNAL_SERVER_ERROR`| Unexpected errors, missing config            |

## Testing

Routers can be tested using tRPC's `createCaller`:

```typescript
import { createCaller } from "~/server/api/root";
import { createInnerTRPCContext } from "~/server/api/trpc";

const ctx = createInnerTRPCContext({
  headers: new Headers(),
  session: mockSession,
});

const caller = createCaller(ctx);
const result = await caller.interview.getHistory();
```

## Common Tasks

### Adding a new interview procedure

1. Define input schema with Zod
2. Choose appropriate procedure type (public/protected/flexible/worker)
3. Implement the procedure in `interview.ts` or `interview-worker.ts`
4. Handle authorization (owner check, guest token, etc.)

### Adding a new interview status

1. Update Prisma schema enum `InterviewStatus`
2. Run `pnpm db:push` to update database
3. Update `updateStatus` procedure to handle new status
4. Update any status validation logic

### Supporting a new input type

1. Add to discriminated union in `src/lib/schemas/interview.ts`
2. Handle new case in `createSession` procedure
3. Update any related procedures that use the input

## Related Documentation

- [Worker Architecture](../../../../worker/README.md) - Cloudflare Worker documentation
- [Interview Session](../../../app/[locale]/(interview)/interview/[interviewId]/session/README.md) - Client-side session state machine
- [Interview Templates](../../../lib/interview-templates/README.md) - Template system for block-based interviews
- [Protocol Definitions](../../../../proto/README.md) - Protobuf schema documentation
