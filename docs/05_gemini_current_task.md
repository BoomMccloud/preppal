# Current Task: Block 1 Completion Bug Fix

## Issue
When a user completes Block 1 in a multi-block interview (e.g., clicking "Continue" on the Block Complete screen, or waiting on it), the entire interview is prematurely marked as `COMPLETED`. This prevents the user from proceeding to Block 2.

## Root Cause
- The **Frontend** correctly transitions to `BLOCK_COMPLETE_SCREEN` and waits for user action.
- The **Frontend** closes the WebSocket connection (with `WS_CLOSE_BLOCK_RECONNECT`) when transitioning blocks, OR the connection stays open while waiting on the completion screen.
- The **Worker** has a duration timeout (e.g., 2 minutes for a block). If the user sits on the completion screen, the Worker's timer fires.
- The **Worker** calls `finalizeSessionIfNotDebug` when the timer fires (or when user manually ends).
- **The Bug:** `finalizeSessionIfNotDebug` was calling `lifecycleManager.finalizeSession` **without passing `this.blockNumber`**.
- **Consequence:** `InterviewLifecycleManager` interpreted the missing `blockNumber` as a standard interview completion, and updated the interview status to `COMPLETED` in the database.

## Solution
- **Updated `worker/src/gemini-session.ts`:**
    - Modified `finalizeSessionIfNotDebug` to pass `this.blockNumber` to `lifecycleManager.finalizeSession`.
    - Added logging to `finalizeSessionIfNotDebug` to explicitly state whether it is finalizing a block or the full session.

## Verification
- Verified code changes by reading the file.
- The logic in `InterviewLifecycleManager` correctly handles the presence of `blockNumber`:
    - `if (!blockNumber)`: Updates status to `COMPLETED`.
    - `else`: Logs "Block X finalized" and does NOT update status to `COMPLETED`.

## Next Steps
- User to verify the fix in the application.