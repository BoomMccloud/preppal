# Interview Lobby

The lobby is the preparation screen shown before an interview session begins. It handles status validation, guest access, share link generation, and navigation to the live session.

## Quick Reference

| File                          | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `page.tsx`                    | Server component - status routing, data fetching |
| `_components/LobbyActions.tsx`| Client component - share links, start button     |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LOBBY PAGE                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ page.tsx (Server Component)                                          │   │
│  │                                                                       │   │
│  │   1. Extract params: interviewId, locale, token                      │   │
│  │   2. Fetch interview via api.interview.getById()                     │   │
│  │   3. Route based on status:                                          │   │
│  │      ├─ COMPLETED → Redirect to /feedback                            │   │
│  │      ├─ IN_PROGRESS → Show "in progress" message                     │   │
│  │      ├─ ERROR → Show error message                                   │   │
│  │      └─ PENDING → Render lobby UI                                    │   │
│  │   4. Handle NOT_FOUND / invalid token → Error message                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ LobbyActions (Client Component)                                      │   │
│  │                                                                       │   │
│  │   Props: interviewId, isGuest, guestToken, guestExpiresAt, urlToken │   │
│  │                                                                       │   │
│  │   Renders based on user type:                                        │   │
│  │      ├─ Guest → Simple "Start" button                                │   │
│  │      ├─ Owner with link → Warning + Copy/Regenerate + Start          │   │
│  │      └─ Owner without link → Share + Start buttons                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Status Routing

The lobby handles all interview statuses and routes appropriately:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATUS ROUTING                                       │
│                                                                              │
│  URL: /interview/{id}/lobby?token={optional}                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ api.interview.getById({ id, token, includeFeedback: false })         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                           │                                                  │
│           ┌───────────────┼───────────────┬───────────────┐                 │
│           ▼               ▼               ▼               ▼                 │
│     ┌──────────┐   ┌─────────────┐   ┌─────────┐   ┌──────────┐           │
│     │ PENDING  │   │ IN_PROGRESS │   │  ERROR  │   │ COMPLETED│           │
│     └────┬─────┘   └──────┬──────┘   └────┬────┘   └─────┬────┘           │
│          │                │               │              │                  │
│          ▼                ▼               ▼              ▼                  │
│     Render Lobby    Show Message    Show Error     Redirect to             │
│     UI + Actions    (already in     Message        /feedback               │
│                     progress)                                               │
│                                                                              │
│  Error Handling:                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ catch block → Show "not found" or "link expired" message             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## User Types

### Owner Access

The interview creator accesses the lobby without a token:
- URL: `/interview/{id}/lobby`
- Can generate and share guest links
- Can start the interview directly
- Sees warning if guest link is active

### Guest Access

Users with a share link access via token:
- URL: `/interview/{id}/lobby?token={guestToken}`
- Simplified UI (no share options)
- Can only start the interview
- Token validated server-side

## LobbyActions Component

Handles all interactive actions based on user type and guest link state.

### Props

```typescript
interface LobbyActionsProps {
  interviewId: string;
  isGuest: boolean;
  guestToken?: string | null;      // Current guest token (for owners)
  guestExpiresAt?: Date | null;    // Token expiration (for owners)
  urlToken?: string;               // Token from URL (for guests)
}
```

### View States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIEW STATES                                          │
│                                                                              │
│  1. GUEST VIEW (isGuest === true)                                           │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  "Please ensure your microphone is ready..."                     │    │
│     │                                                                   │    │
│     │                    [ Start Interview ]                           │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  2. OWNER WITH ACTIVE GUEST LINK (hasActiveGuestLink === true)             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  ⚠️ Active Guest Link Warning                                    │    │
│     │  "Expires in X hours Y minutes"                                  │    │
│     │                                                                   │    │
│     │  [ Copy Link ]  [ Regenerate ]                                   │    │
│     │                                                                   │    │
│     │  "If you start now, the guest link will still work..."          │    │
│     │                                                                   │    │
│     │  [ Return to Dashboard ]  [ Start Anyway ]                       │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  3. OWNER WITHOUT GUEST LINK                                                │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  "Check your equipment and click Start..."                       │    │
│     │                                                                   │    │
│     │  [ Dashboard ]  [ Share Link ]  [ Start Interview ]              │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Guest Link Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GUEST LINK LIFECYCLE                                    │
│                                                                              │
│  1. Owner clicks "Share Link"                                               │
│     │                                                                        │
│     ▼                                                                        │
│  createGuestLink.mutate({ interviewId })                                    │
│     │                                                                        │
│     ▼                                                                        │
│  api.interview.createGuestLink                                              │
│     │                                                                        │
│     ├─ Generates random token (32 bytes, base64url)                         │
│     ├─ Sets 24-hour expiration                                              │
│     └─ Stores in database                                                   │
│     │                                                                        │
│     ▼                                                                        │
│  router.refresh() → Re-fetch page data                                      │
│     │                                                                        │
│     ▼                                                                        │
│  Show share modal with copyable URL:                                        │
│  https://preppal.com/interview/{id}/lobby?token={token}                     │
│                                                                              │
│  2. Guest opens link                                                        │
│     │                                                                        │
│     ▼                                                                        │
│  Server validates token in getById()                                        │
│     │                                                                        │
│     ├─ Valid + not expired → Render guest view                              │
│     └─ Invalid/expired → Show error message                                 │
│                                                                              │
│  3. Guest clicks "Start"                                                    │
│     │                                                                        │
│     ▼                                                                        │
│  Navigate to /interview/{id}/session?token={urlToken}                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Lobby UI Structure

The page displays a preparation checklist and interview details:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                    Interview Preparation                                     │
│                    {job description preview}                                │
│                                                                              │
│  ┌─────────────────────────────┬─────────────────────────────────────────┐  │
│  │                             │                                          │  │
│  │  Pre-Interview Checklist   │  Interview Details                       │  │
│  │                             │                                          │  │
│  │  ✓ Camera access granted   │  Type: Technical Interview              │  │
│  │  ✓ Microphone access       │  Duration: 45 minutes                   │  │
│  │  ! Stable network          │  Level: Mid-Level                        │  │
│  │                             │  Status: Ready to Start                  │  │
│  │                             │                                          │  │
│  └─────────────────────────────┴─────────────────────────────────────────┘  │
│                                                                              │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│                        [ LobbyActions Component ]                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Navigation Paths

```typescript
// Start interview (owner)
router.push(`/interview/${interviewId}/session`);

// Start interview (guest)
router.push(`/interview/${interviewId}/session?token=${urlToken}`);

// Return to dashboard
router.push("/dashboard");

// Redirect to feedback (COMPLETED status)
redirect(`/${locale}/interview/${interviewId}/feedback`);

// Redirect to feedback with token (guest, COMPLETED)
redirect(`/${locale}/interview/${interviewId}/feedback?token=${token}`);
```

## Share Modal

When sharing, a modal displays the copyable guest link:

```typescript
const getGuestUrl = () => {
  if (!guestToken) return null;
  const baseUrl = window.location.origin;
  return `${baseUrl}/interview/${interviewId}/lobby?token=${guestToken}`;
};
```

Features:
- Read-only input with full URL
- One-click copy button
- Expiration time display
- Close button

## Time Remaining Calculation

```typescript
const getTimeRemaining = () => {
  if (!guestExpiresAt) return "";
  const now = new Date();
  const expiry = new Date(guestExpiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return t("linkExpired");

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return t("expiresIn", { hours, minutes });
};
```

## Internationalization

Uses `next-intl` with the `interview.lobby` namespace:

```typescript
// Server component
const t = await getTranslations("interview.lobby");

// Client component
const t = useTranslations("interview.lobby");
```

Key translation keys:
- `title` / `guestTitle` - Page titles
- `start` / `startAnyway` - Button labels
- `shareLink` / `copyLink` / `regenerate` - Share actions
- `expiresIn` - Time remaining format
- `inProgressError` / `errorState` / `notFound` - Error messages

## Error States

| Condition | Message Shown | Actions Available |
| --------- | ------------- | ----------------- |
| NOT_FOUND | "Interview not found" | Dashboard link (owner only) |
| Invalid token | "Link expired or invalid" | None |
| IN_PROGRESS | "Interview is already in progress" | Dashboard link (owner only) |
| ERROR | "Interview encountered an error" | Dashboard link (owner only) |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                                           │
│                                                                              │
│  1. Page Load                                                               │
│                                                                              │
│     URL params ──→ page.tsx ──→ api.interview.getById()                    │
│                                        │                                     │
│                                        ▼                                     │
│                                 Interview data                              │
│                                        │                                     │
│                    ┌───────────────────┼───────────────────┐                │
│                    ▼                   ▼                   ▼                │
│              Status check         Display data        Pass to               │
│              (routing)            (UI render)         LobbyActions          │
│                                                                              │
│  2. Share Link Creation                                                     │
│                                                                              │
│     LobbyActions ──→ createGuestLink.mutate()                              │
│                              │                                               │
│                              ▼                                               │
│                    api.interview.createGuestLink                            │
│                              │                                               │
│                              ▼                                               │
│                    router.refresh() ──→ Re-render with new token           │
│                                                                              │
│  3. Start Interview                                                         │
│                                                                              │
│     LobbyActions ──→ router.push(getSessionUrl())                          │
│                              │                                               │
│                              ▼                                               │
│                    /interview/{id}/session?token={...}                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [Interview Session](../session/README.md) - Where users go after clicking Start
- [Interview Routers](../../../../../../server/api/routers/README.md) - API endpoints for getById, createGuestLink
- [Feedback Page](../feedback/README.md) - Where COMPLETED interviews redirect
