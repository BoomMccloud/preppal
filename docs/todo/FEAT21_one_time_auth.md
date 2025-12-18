# FEAT20: One-Time Guest Authentication

## Objective
Enable "guest" access to specific interview sessions via a secure, time-limited URL. This allows recruiters, hiring managers, or friends to view or join an interview session without needing to create a Preppal account.

## Context
Currently, all access to interview data requires a persistent user session (`ctx.session.user`). We need to extend the authentication mechanism to support ephemeral, token-based access for specific resources (Interviews).

## Status Checklist

- [ ] **Database Schema**: Add `InterviewAccess` model to store guest tokens.
- [ ] **API (Link Generation)**: Create tRPC procedure to generate guest links.
- [ ] **API (Access Control)**: Update `interview.getById` and `interview.getFeedback` to accept guest tokens.
- [ ] **Frontend (Share UI)**: Add "Share Interview" button to the interview dashboard/lobby.
- [ ] **Frontend (Guest Entry)**: Handle `?token=...` query parameter to bypass login and initialize session.

## Detailed Tasks

### 1. Database Schema
Update `prisma/schema.prisma` to include the `InterviewAccess` model.

```prisma
model InterviewAccess {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  
  // The unique token used in the URL
  token       String   @unique
  
  // When this access expires
  expiresAt   DateTime
  
  // Relation: Grants access to one specific interview
  interviewId String
  interview   Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  @@index([token])
}

model Interview {
  // ... existing fields
  accessTokens InterviewAccess[]
}
```

### 2. Link Generation (API)
Implement a new tRPC mutation `interview.createGuestLink`.
- **Input**: `interviewId`, `expiresIn` (optional, default 4 hours).
- **Logic**:
    - Verify `ctx.session.user` owns the interview.
    - Generate a secure random token (e.g., using `crypto` or `nanoid`).
    - Save to `InterviewAccess` with calculated `expiresAt`.
    - Return the full URL (e.g., `https://preppal.com/interview/[id]?token=[token]`).

### 3. Backend Access Control
Modify the `interview` router to support "dual authentication" (User Session OR Guest Token).

- **Middleware/Helper**: Create a helper to validate access.
    ```typescript
    async function checkAccess(ctx: Context, interviewId: string, token?: string) {
      if (ctx.session?.user) {
        // Standard owner check
        return db.interview.findFirst({ where: { id: interviewId, userId: ctx.session.user.id } });
      }
      if (token) {
        // Guest token check
        const access = await db.interviewAccess.findUnique({ where: { token } });
        if (access && access.interviewId === interviewId && access.expiresAt > new Date()) {
          return db.interview.findUnique({ where: { id: interviewId } });
        }
      }
      return null;
    }
    ```
- **Procedures**: Update `getById`, `getFeedback`, and `submitFeedback` (if guests can comment) to use this logic. Note: `createSession` (starting the AI) might still be restricted to owners, or allowed for guests depending on requirements. *Assumption: Guests are primarily viewers/reviewers.*

### 4. Frontend Implementation
- **Share Component**:
    - Add a "Share" button in the `InterviewHeader` or `InterviewControls`.
    - Opens a modal/popover with "Generate Guest Link" button.
    - Displays the generated link with "Copy to Clipboard" functionality.
- **Guest Landing**:
    - In `src/app/(app)/interview/[interviewId]/page.tsx`, check for `searchParams.token`.
    - If token exists, pass it to the TRPC query (`api.interview.getById.useQuery({ id, token })`).
    - If the query succeeds, render the interview view.
    - If fails (expired/invalid), show a friendly "Link Expired" page.
    - **Important**: Ensure the UI adapts for guests (e.g., hide "Delete Interview" or "Edit" buttons if they shouldn't have those permissions).

## Key Files
- `prisma/schema.prisma`
- `src/server/api/routers/interview.ts`
- `src/app/(app)/interview/[interviewId]/page.tsx`
- `src/app/_components/InterviewHeader.tsx` (or similar for Share button)
