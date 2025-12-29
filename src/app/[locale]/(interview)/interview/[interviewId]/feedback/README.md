# Interview Feedback

The feedback page displays AI-generated interview analysis after a session completes. It handles async feedback generation with polling, supports guest access via share links, and presents structured feedback in a tabbed interface.

## Quick Reference

| File                              | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `page.tsx`                        | Server component - status routing, data fetching |
| `feedback-tabs.tsx`               | Client component - tabbed detailed analysis      |
| `_components/FeedbackPolling.tsx` | Client component - polls until feedback ready    |
| `_components/FeedbackCard.tsx`    | Presentational component - card wrapper          |
| `_components/FeedbackActions.tsx` | Client component - navigation actions            |
| `_components/ShareButton.tsx`     | Client component - guest link generation         |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FEEDBACK PAGE                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ page.tsx (Server Component)                                          │   │
│  │                                                                       │   │
│  │   1. Fetch interview with feedback via getById()                     │   │
│  │   2. Route based on status + feedback availability:                  │   │
│  │      ├─ !COMPLETED && !IN_PROGRESS → Redirect to /lobby              │   │
│  │      ├─ feedback === null → Render <FeedbackPolling />               │   │
│  │      └─ feedback exists → Render full feedback UI                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│  ┌─────────────────────────────┐   ┌─────────────────────────────────────┐ │
│  │ FeedbackPolling             │   │ Full Feedback UI                    │ │
│  │                             │   │                                      │ │
│  │  • Polls every 3 seconds   │   │  • Summary card                      │ │
│  │  • Shows loading spinner   │   │  • Strengths card                    │ │
│  │  • router.refresh() when   │   │  • FeedbackTabs (detailed analysis) │ │
│  │    feedback arrives        │   │  • ShareButton (owner only)          │ │
│  └─────────────────────────────┘   │  • FeedbackActions (owner only)     │ │
│                                     └─────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Feedback Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FEEDBACK GENERATION FLOW                                  │
│                                                                              │
│  1. Interview ends in session                                               │
│     │                                                                        │
│     ▼                                                                        │
│  Worker submits transcript + generates feedback                             │
│     │                                                                        │
│     ├─ submitTranscript() → Save transcript blob                            │
│     └─ submitFeedback() → Save AI analysis (async)                          │
│     │                                                                        │
│     ▼                                                                        │
│  Client navigates to /feedback                                              │
│     │                                                                        │
│     ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Is feedback ready?                                                    │  │
│  │                                                                        │  │
│  │   NO → FeedbackPolling                                                │  │
│  │        │                                                               │  │
│  │        ├─ Query getById every 3 seconds                               │  │
│  │        ├─ Check data.feedback !== null                                │  │
│  │        └─ When ready → router.refresh()                               │  │
│  │                                                                        │  │
│  │   YES → Render feedback cards + tabs                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Status Routing

```typescript
// page.tsx routing logic
if (interview.status !== "COMPLETED" && interview.status !== "IN_PROGRESS") {
  // Redirect owners to lobby for PENDING/ERROR status
  if (!isGuest) {
    redirect(`/${locale}/interview/${interviewId}/lobby`);
  }
}

if (interview.feedback === null) {
  // Still processing - show polling UI
  return <FeedbackPolling interviewId={interviewId} />;
}

// Feedback ready - render full UI
return <FullFeedbackUI interview={interview} />;
```

## Feedback Data Structure

The feedback is generated by the worker and stored in `InterviewFeedback`:

```typescript
interface InterviewFeedback {
  id: string;
  interviewId: string;
  summary: string;                    // High-level interview summary
  strengths: string;                  // Markdown list of strengths
  contentAndStructure: string;        // Detailed content feedback
  communicationAndDelivery: string;   // Communication style feedback
  presentation: string;               // Non-verbal/presentation feedback
  createdAt: Date;
}
```

## Component Details

### FeedbackPolling

Handles the async wait for feedback generation.

```typescript
interface FeedbackPollingProps {
  interviewId: string;
}

// Polling behavior
const { data, error } = api.interview.getById.useQuery(
  { id: interviewId, includeFeedback: true },
  {
    refetchInterval: shouldPoll ? 3000 : false,  // Poll every 3 seconds
    retry: false,  // Don't retry on errors
  }
);

// Stop polling when feedback arrives or error occurs
useEffect(() => {
  if (error || data?.feedback) {
    setShouldPoll(false);
  }
}, [error, data?.feedback]);

// Trigger page refresh when feedback is ready
useEffect(() => {
  if (data?.feedback) {
    router.refresh();
  }
}, [data, router]);
```

States:
- **Loading**: Spinner + "Analyzing your performance..."
- **Error**: Error message card
- **Ready**: Triggers `router.refresh()` to re-render server component

### FeedbackTabs

Tabbed interface for detailed feedback sections.

```typescript
interface FeedbackTabsProps {
  contentAndStructure: string;
  communicationAndDelivery: string;
  presentation: string;
}

type TabId = "content" | "communication" | "presentation";
```

Tabs:
1. **Content & Structure** - Substance and organization of answers
2. **Communication & Delivery** - Verbal style, pacing, clarity
3. **Presentation** - Non-verbal cues, professional presence

### ShareButton

Generates guest share links for the feedback page.

```typescript
interface ShareButtonProps {
  interviewId: string;
}
```

Flow:
1. User clicks "Share"
2. Modal opens, triggers `createGuestLink.mutate()`
3. Generates URL: `{origin}/interview/{id}/feedback?token={token}`
4. Shows copyable link with expiration date
5. Token valid for 24 hours

### FeedbackActions

Navigation actions for interview owners.

```typescript
interface FeedbackActionsProps {
  isGuest?: boolean;  // Guests see nothing
}
```

Actions (owner only):
- **Back to Dashboard** - Link to `/dashboard`
- **Download Report** - Disabled (future feature)
- **Schedule Another** - Link to `/create-interview`

### FeedbackCard

Simple presentational wrapper component.

```typescript
interface FeedbackCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}
```

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Interview Results                                    [ Share ] (owner)     │
│  Interview ID: abc123                                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Summary                                                              │   │
│  │                                                                       │   │
│  │ "The candidate demonstrated strong technical knowledge..."           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────┐  ┌───────────────────────────────────────────┐  │
│  │ Strengths             │  │ Detailed Analysis                         │  │
│  │                       │  │                                            │  │
│  │ • Clear communication│  │ [Content] [Communication] [Presentation]  │  │
│  │ • Strong examples    │  │                                            │  │
│  │ • Good structure     │  │ {Active tab content here}                  │  │
│  │                       │  │                                            │  │
│  │                       │  │                                            │  │
│  │                       │  ├────────────────────────────────────────────┤  │
│  │                       │  │            [ Dashboard ] [ Download ]      │  │
│  │                       │  │            [ Schedule Another ]            │  │
│  └───────────────────────┘  └───────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Guest vs Owner Access

| Feature | Owner | Guest |
|---------|-------|-------|
| View feedback | ✓ | ✓ |
| Share button | ✓ | ✗ |
| Navigation actions | ✓ | ✗ |
| Download report | ✓ (disabled) | ✗ |
| Schedule another | ✓ | ✗ |

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Interview not found | Show "not found" message |
| Invalid/expired token | Show "link expired" message |
| PENDING/ERROR status (owner) | Redirect to lobby |
| PENDING/ERROR status (guest) | Show appropriate message |
| Feedback generation fails | Show error in polling component |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                                           │
│                                                                              │
│  1. Initial Page Load                                                       │
│                                                                              │
│     URL: /interview/{id}/feedback?token={optional}                          │
│                │                                                             │
│                ▼                                                             │
│     api.interview.getById({ id, token, includeFeedback: true })            │
│                │                                                             │
│                ▼                                                             │
│     ┌─────────────────────────────────────────────────────────────┐        │
│     │ Response includes:                                           │        │
│     │   • interview.status                                         │        │
│     │   • interview.feedback (nullable)                            │        │
│     │   • interview.isGuest                                        │        │
│     └─────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  2. Polling (when feedback is null)                                         │
│                                                                              │
│     FeedbackPolling ──→ useQuery with refetchInterval: 3000                │
│                │                                                             │
│                ├─ Every 3 seconds: getById()                                │
│                ├─ Check: data.feedback !== null?                            │
│                │     YES → router.refresh()                                 │
│                │     NO  → Continue polling                                 │
│                └─ On error → Stop polling, show error                       │
│                                                                              │
│  3. Share Link Creation                                                     │
│                                                                              │
│     ShareButton ──→ createGuestLink.mutate({ interviewId })                │
│                           │                                                  │
│                           ▼                                                  │
│                    Generate URL with token                                  │
│                    Show in modal for copying                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Internationalization

Uses `next-intl` with the `interview.feedback` namespace:

```typescript
// Server component
const t = await getTranslations("interview.feedback");

// Client components
const t = useTranslations("interview.feedback");
```

Key translation keys:
- `title` - Page title
- `summary`, `strengths`, `detailedAnalysis` - Section titles
- `contentAndStructure`, `communicationAndDelivery`, `presentation` - Tab labels
- `processingTitle`, `processingMessage` - Polling state
- `share`, `shareTitle`, `shareDescription` - Share modal
- `backToDashboard`, `downloadReport`, `scheduleAnother` - Actions

## Related Documentation

- [Interview Session](../session/README.md) - Where feedback is generated
- [Interview Lobby](../lobby/README.md) - Pre-interview preparation
- [Interview Routers](../../../../../../server/api/routers/README.md) - API for getById, createGuestLink
- [Worker Architecture](../../../../../../../worker/README.md) - Feedback generation in submitFeedback
