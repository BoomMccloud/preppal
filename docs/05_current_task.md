# Fix Configurable Interview Duration

**Status**: In Progress

## Objective
Enable configurable interview duration that is read from the database and enforced by the worker.

## Root Cause of Previous Bug
The original implementation broke because:
1. Proto files were updated to add `durationMs` field
2. Worker api-client used `ctx.durationMs ?? DEFAULT_DURATION_MS`
3. API route (`src/app/api/worker/route.ts`) never returned `durationMs`
4. Protobuf defaults missing `int32` fields to `0`
5. `0 ?? DEFAULT` equals `0` (nullish coalescing doesn't catch 0)
6. `setTimeout(..., 0)` fired immediately, killing the session

## Current State
- Timer works with hardcoded 30-minute default in `gemini-session.ts`
- No proto/interface changes needed for basic functionality
- Duration enum exists in database (`InterviewDuration`: SHORT, STANDARD, EXTENDED)

## Changes Needed for Configurable Duration

### 1. Update API route to return durationMs
**File**: `src/app/api/worker/route.ts`

```typescript
// In handleGetContext function:
const durationMap = {
  SHORT: 10 * 60 * 1000,      // 10 minutes
  STANDARD: 30 * 60 * 1000,   // 30 minutes
  EXTENDED: 60 * 60 * 1000,   // 60 minutes
};

return {
  getContext: {
    jobDescription: interview.jobDescriptionSnapshot ?? "",
    resume: interview.resumeSnapshot ?? "",
    persona: interview.persona ?? "professional interviewer",
    durationMs: durationMap[interview.duration] ?? 30 * 60 * 1000,
  },
};
```

Also add `duration` to the select query.

### 2. Update worker api-client to handle 0 correctly
**File**: `worker/src/api-client.ts`

```typescript
// Use || instead of ?? to catch 0
durationMs: ctx.durationMs || DEFAULT_DURATION_MS,
```

### 3. Add durationMs to InterviewContext interface
**File**: `worker/src/interfaces/index.ts`

```typescript
export interface InterviewContext {
  jobDescription: string;
  resume: string;
  persona: string;
  durationMs: number;
}
```

### 4. Update gemini-session.ts to use context duration
**File**: `worker/src/gemini-session.ts`

```typescript
private startDurationTimeout(ws: WebSocket): void {
  // Use context duration instead of hardcoded default
  const timeoutMs = this.interviewContext.durationMs || this.DEFAULT_DURATION_MS;
  // ...
}
```

### 5. Ensure proto files are synced (if not already)
- `proto/interview.proto` - already has `duration_ms` field
- Regenerate `src/lib/interview_pb.js` and `worker/src/lib/interview_pb.js`

## Key Files
- `src/app/api/worker/route.ts` - API endpoint
- `worker/src/api-client.ts` - Worker API client
- `worker/src/interfaces/index.ts` - TypeScript interfaces
- `worker/src/gemini-session.ts` - Timer implementation
- `prisma/schema.prisma` - Duration enum definition

## Testing
1. Create interview with SHORT duration (10 min)
2. Verify worker log shows correct timeout value
3. Let interview run past 10 minutes to verify timeout triggers
