# TECH04: Refactor Session Content Component (Lean)

## Problem Statement

The `SessionContent.tsx` component (~270 lines) was flagged as a "God Component." However, upon review:
- Logic is already delegated to `useInterviewSocket` hook
- State rendering uses simple conditionals
- 270 lines for a session page is reasonable

**Actual issues:**
1. Debug code (`handleCheckStatus`, `debugInfo`, `wsDebugInfo`) clutters production UI
2. Transcript rendering is the longest inline JSX block (~20 lines)

## Assessment: Why Minimal Refactoring

| Original Proposal | Verdict |
|-------------------|---------|
| `useSessionLogic` hook | Skip - `useInterviewSocket` already encapsulates main logic |
| `SessionLoading` component | Skip - 5 lines of JSX |
| `SessionConnecting` component | Skip - only used in dev/debug scenarios |
| `SessionError` component | Skip - 15 lines of JSX |
| `SessionHeader` component | Skip - tightly coupled to page layout |
| `SessionTranscript` component | Maybe - largest JSX block |
| `SessionControls` component | Skip - 10 lines of JSX |

## Refactoring Plan

### Step 1: Isolate Debug UI

Wrap debug-only code behind a `DEV_MODE` check or extract to a `<DebugPanel>` component.

**Before** (debug code scattered throughout):
```typescript
const [debugInfo, setDebugInfo] = useState<string>("");

const { data: interviewStatus } = api.debug.getInterviewStatus.useQuery(...);

const handleCheckStatus = () => { ... };

// In JSX:
<button onClick={handleCheckStatus}>Check Status</button>
{debugInfo && <pre>{debugInfo}</pre>}
<div>WS: {wsDebugInfo.connectAttempts} attempts...</div>
```

**After** (isolated):
```typescript
// Only render debug UI in development
{process.env.NODE_ENV === "development" && (
  <DebugPanel
    interview={interview}
    interviewStatus={interviewStatus}
    wsDebugInfo={wsDebugInfo}
  />
)}
```

Or create a simple `DebugPanel` component (~30 lines) that encapsulates all debug state and UI.

### Step 2: (Optional) Extract TranscriptList

Only if the transcript rendering grows more complex. Currently ~20 lines.

**File**: `src/app/[locale]/(interview)/interview/[interviewId]/session/TranscriptList.tsx`
```typescript
interface TranscriptListProps {
  transcript: Array<{ speaker: string; text: string }>;
  emptyMessage: string;
}

export function TranscriptList({ transcript, emptyMessage }: TranscriptListProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length]);

  if (transcript.length === 0) {
    return <div className="text-center text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-4">
      {transcript.map((entry, index) => (
        <TranscriptBubble key={index} entry={entry} />
      ))}
      <div ref={transcriptEndRef} />
    </div>
  );
}
```

## What NOT to Do

| Rejected Idea | Reason |
|---------------|--------|
| `useSessionLogic` hook | `useInterviewSocket` already handles this |
| 6 presentational components | Overkill for 270-line component |
| `components/` subfolder | Adds navigation complexity for minimal gain |

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Files | 1 | 1-2 (optional DebugPanel) |
| Lines in SessionContent | ~270 | ~220 |
| New components | - | 0-1 |
| Debug code in production | Mixed | Isolated |

## Dependencies & Risks

- **Low risk**: Debug isolation is a minor change
- **Feature flags**: Consider using existing `DEV_MODE` env var pattern from worker
