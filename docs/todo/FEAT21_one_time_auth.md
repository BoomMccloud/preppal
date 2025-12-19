# FEAT21: One-Time Guest Authentication

## Objective
Enable "guest" access to specific interview sessions via a secure, time-limited URL. This allows recruiters, hiring managers, or friends to view an interview session without needing a Preppal account.

## Context
Currently, all access to interview data requires a persistent user session (`ctx.session.user`). We need to extend the authentication mechanism to support ephemeral, token-based access for specific resources (Interviews).

**Constraint**: One guest link per interview, used by one person.

## Status Checklist

- [ ] **Database Schema**: Add guest token fields to `Interview` model.
- [ ] **API (Link Generation)**: Create tRPC procedure to generate guest link.
- [ ] **API (Access Control)**: Update `interview.getById` and `interview.getFeedback` to accept guest tokens.
- [ ] **Frontend (Share UI)**: Add "Share Interview" button to interview page.
- [ ] **Frontend (Guest Entry)**: Handle `?token=...` query parameter to bypass login.

## Detailed Tasks

### 1. Database Schema
Add two fields to the existing `Interview` model in `prisma/schema.prisma`:

```prisma
model Interview {
  // ... existing fields

  guestToken     String?   @unique
  guestExpiresAt DateTime?
}
```

No new table needed. Regenerating a link simply overwrites these fields.

### 2. Link Generation (API)
Implement `interview.createGuestLink` mutation.

- **Input**: `interviewId`
- **Logic**:
    1. Verify `ctx.session.user` owns the interview.
    2. Generate a secure random token (use `nanoid`).
    3. Set `guestExpiresAt` to 24 hours from now.
    4. Update the interview with token and expiry.
    5. Return the full URL: `/interview/[id]?token=[token]`

### 3. Backend Access Control
Create a helper to validate access (owner OR valid guest token):

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

Update procedures to use this helper. Guests are view-only (cannot delete, edit, or start new sessions).

### 4. Frontend Implementation

**Share Button**:
- Add to interview page (visible to owner only).
- Calls `createGuestLink` mutation.
- Shows generated link with "Copy" button.

**Guest Entry**:
- In `interview/[interviewId]/page.tsx`, read `searchParams.token`.
- Pass token to tRPC query if present.
- If valid: render interview in read-only mode.
- If invalid/expired: show "Link Expired" message.
- Hide owner-only actions (delete, edit) for guests.

## Key Files
- `prisma/schema.prisma`
- `src/server/api/routers/interview.ts`
- `src/app/(app)/interview/[interviewId]/page.tsx`
