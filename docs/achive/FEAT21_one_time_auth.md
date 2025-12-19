# FEAT21: One-Time Guest Authentication

## Objective
Enable "guest" access to specific interview sessions via a secure, time-limited URL. This allows hiring managers to create interviews for candidates, who can then take the interview and view results without needing a Preppal account.

## Context
Currently, all access to interview data requires a persistent user session (`ctx.session.user`). We need to extend the authentication mechanism to support ephemeral, token-based access for specific resources (Interviews).

**Constraint**: One guest link per interview, used by one person.

## Use Case
1. Hiring manager creates an interview with specific parameters (job description, resume requirements, persona)
2. Hiring manager generates a shareable guest link
3. Candidate receives the link and can take the interview (if status is `PENDING`)
4. Once the interview starts, it transitions to `IN_PROGRESS`, locking out any other access attempts
5. After completion, both the hiring manager (owner) and the candidate (guest) can view results

## Status Checklist

- [x] **Database Schema**: Add guest token fields to `Interview` model.
- [x] **API (Link Generation)**: Create tRPC procedure to generate guest link.
- [x] **API (Access Control)**: Update `interview.getById` and `interview.getFeedback` to accept guest tokens.
- [x] **API (Guest Session Start)**: Update `generateWorkerToken` to allow guests to start PENDING interviews.
- [x] **API (Return Guest Link Status)**: Update `getById` to return `guestToken`/`guestExpiresAt` for owners.
- [x] **Frontend (Share UI)**: Add "Share Interview" button to interview page.
- [x] **Frontend (Guest Entry)**: Handle `?token=...` query parameter to bypass login.
- [x] **Frontend (Lobby Page)**: Implement 3-scenario lobby UI (owner/owner+shared/guest).
- [x] **Frontend (Session Page)**: Pass guest token through session flow.

## Detailed Tasks

### 1. Database Schema ✅
Add two fields to the existing `Interview` model in `prisma/schema.prisma`:

```prisma
model Interview {
  // ... existing fields

  guestToken     String?   @unique
  guestExpiresAt DateTime?
}
```

No new table needed. Regenerating a link simply overwrites these fields.

### 2. Link Generation (API) ✅
Implement `interview.createGuestLink` mutation.

- **Input**: `interviewId`
- **Logic**:
    1. Verify `ctx.session.user` owns the interview.
    2. Generate a secure random token (use `crypto.randomBytes`).
    3. Set `guestExpiresAt` to 24 hours from now.
    4. Update the interview with token and expiry.
    5. Return the token and expiry.

### 3. Backend Access Control ✅
Helper to validate access (owner OR valid guest token) already implemented:

```typescript
async function getInterviewWithAccess(
  db: PrismaClient,
  interviewId: string,
  userId?: string,
  token?: string
) {
  const interview = await db.interview.findUnique({ where: { id: interviewId } });
  if (!interview) return null;

  // Owner access
  if (userId && interview.userId === userId) {
    return { interview, isGuest: false };
  }

  // Guest access
  if (token && interview.guestToken === token && interview.guestExpiresAt && interview.guestExpiresAt > new Date()) {
    return { interview, isGuest: true };
  }

  return null;
}
```

### 4. Guest Session Start (API) ⬜
**This is the key remaining change.**

Update `generateWorkerToken` to allow guests to start interviews:

- **Current**: `protectedProcedure` - requires authenticated user
- **Change to**: `publicProcedure` with optional `token` parameter

```typescript
generateWorkerToken: publicProcedure
  .input(z.object({
    interviewId: z.string(),
    token: z.string().optional()  // Guest token
  }))
  .mutation(async ({ ctx, input }) => {
    // Check access via owner or guest token
    const access = await getInterviewWithAccess(
      ctx.db,
      input.interviewId,
      ctx.session?.user?.id,
      input.token,
    );

    if (!access) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });
    }

    // Verify interview is in PENDING state
    if (access.interview.status !== "PENDING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Interview is not in PENDING state",
      });
    }

    // Generate and return worker token...
  })
```

**Session Binding**: The existing state machine handles this automatically:
- When interview starts → status becomes `IN_PROGRESS`
- Any subsequent `generateWorkerToken` call fails with "Interview is not in PENDING state"
- No additional locking mechanism needed

### 5. Frontend Implementation

**Share Button** ✅:
- Add to interview page (visible to owner only).
- Calls `createGuestLink` mutation.
- Shows generated link with "Copy" button.

**Guest Entry** ✅:
- Read `searchParams.token` from URL.
- Pass token to tRPC queries.
- If valid: render interview.
- If invalid/expired: show "Link Expired" message.

**Guest Lobby** ⬜:
- Read `searchParams.token` and pass to `getById` query.
- Allow guest to click "Start Interview" on lobby page.
- Pass guest token to `generateWorkerToken` mutation.
- Proceed with session as normal.

### 7. Lobby Page UI Design ⬜

The lobby page needs to handle three scenarios:

**A. Owner (no active guest link):**
```
┌─────────────────────────────────────────┐
│  [Return to Dashboard]  [Share Link]    │
│              [Start Interview]          │
└─────────────────────────────────────────┘
```
- "Share Link" button calls `createGuestLink` mutation
- After generating, transitions to state B

**B. Owner (active guest link exists):**
```
┌─────────────────────────────────────────┐
│  ⚠️ This interview has been shared.     │
│  Link expires in 23h 45m                │
│                                         │
│  [Copy Link]  [Regenerate]              │
│  [Start Anyway] (warning: takes it      │
│                  yourself instead)      │
└─────────────────────────────────────────┘
```
- Show warning that starting will "consume" the interview
- "Regenerate" overwrites the existing token

**C. Guest (valid token):**
```
┌─────────────────────────────────────────┐
│  You've been invited to take this       │
│  interview by [Owner Name/Email].       │
│                                         │
│  [Start Interview]                      │
└─────────────────────────────────────────┘
```
- Hide "Return to Dashboard" (guest has no dashboard)
- Hide "Share Link" (guests cannot reshare)
- Show simplified UI focused on starting

**Required changes to lobby page:**
1. Accept `searchParams.token` and pass to API calls
2. Return `guestToken`, `guestExpiresAt` from `getById` (for owners to see if shared)
3. Conditionally render UI based on `isGuest` and guest link status
4. Add share/copy link functionality (client component)

### 8. Guest Permissions Summary

| Action | Owner | Guest (PENDING) | Guest (IN_PROGRESS+) |
|--------|-------|-----------------|----------------------|
| View interview details | ✅ | ✅ | ✅ |
| Start interview | ✅ | ✅ | ❌ (locked) |
| View feedback | ✅ | ✅ | ✅ |
| Delete interview | ✅ | ❌ | ❌ |
| Generate new guest link | ✅ | ❌ | ❌ |

## Key Files
- `prisma/schema.prisma`
- `src/server/api/routers/interview.ts`
- `src/app/[locale]/(app)/interview/[interviewId]/lobby/page.tsx`
- `src/app/[locale]/(app)/interview/[interviewId]/feedback/page.tsx`
