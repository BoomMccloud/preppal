# TECH03: Refactor Gemini Session Worker (Lean)

## Problem Statement

The `worker/src/gemini-session.ts` file (~430 lines) was initially flagged as a "God Object." However, upon review, the file is reasonably well-organized with:
- Clear method separation
- Dependencies already injected (`ApiClient`, `InterviewLifecycleManager`, `GeminiStreamHandler`, `WebSocketMessageHandler`)
- Each method has a single purpose

The only real issue is a **DRY violation** in the session finalization logic.

## Assessment: Why Minimal Refactoring

| Component | Lines | Verdict |
|-----------|-------|---------|
| Timer logic (`startDurationTimeout`, `handleTimeoutEnd`) | ~15 | Keep - `setTimeout`/`clearTimeout` is trivial |
| `checkDebugMode` | 7 | Keep - too small to extract |
| `extractAuthentication` | 25 | Keep - clear, readable, used once |
| `safeSend` | 16 | Keep - simple utility, only used here |
| WebSocket listeners | 13 | Keep - standard event binding |

## Refactoring Plan

### Step 1: Extract Duplicated Finalization Logic (DRY Fix)

Lines 225-232 and 317-325 duplicate the session finalization logic. Extract to a single method:

**Before** (duplicated in `handleTimeoutEnd` and `handleEndRequest`):
```typescript
if (!this.isDebug) {
  const transcript = this.streamHandler.getTranscript();
  await this.lifecycleManager.finalizeSession(
    this.interviewId!,
    transcript,
    this.interviewContext,
  );
}
```

**After** (single method):
```typescript
private async finalizeSessionIfNotDebug(): Promise<void> {
  if (this.isDebug) return;
  const transcript = this.streamHandler.getTranscript();
  await this.lifecycleManager.finalizeSession(
    this.interviewId!,
    transcript,
    this.interviewContext,
  );
}
```

Then call `await this.finalizeSessionIfNotDebug()` in both `handleTimeoutEnd` and `handleEndRequest`.

### Step 2: (Optional) Move `safeSend` to Utility

Only if other worker files need the same WebSocket send pattern. Otherwise, keep inline.

**File**: `worker/src/utils/websocket-utils.ts`
```typescript
export function safeSend(
  ws: WebSocket,
  data: ArrayBuffer | string | Uint8Array,
  context?: string,
): void {
  try {
    if (ws.readyState === 1) {
      ws.send(data);
    }
  } catch (error) {
    console.error(`[WebSocket] Failed to send${context ? ` for ${context}` : ''}:`, error);
  }
}
```

## What NOT to Do

These extractions were considered but rejected for violating KISS:

| Rejected Idea | Reason |
|---------------|--------|
| `SessionTimer` class | Overkill for 5 lines of `setTimeout`/`clearTimeout` |
| `WebSocketManager` class | `safeSend` is 10 lines, no abstraction needed |
| `ContextParser` class | `extractAuthentication` is already clean and focused |
| Additional DI layers | Already using DI where it matters |

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Files | 1 | 1 (or 2 if Step 2) |
| Lines | ~430 | ~420 |
| New classes | - | 0 |
| DRY violations | 1 | 0 |

## Dependencies & Risks

- **Low risk**: This is a minor refactor with no architectural changes.
- **Testing**: Existing tests should pass without modification.
