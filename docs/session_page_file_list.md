# Session Page - File List

## Existing Files

1. `src/app/(app)/interview/[interviewId]/session/page.tsx` - Page wrapper component
2. `src/app/(app)/interview/[interviewId]/session/SessionContent.tsx` - Main UI component
3. `src/app/(app)/interview/[interviewId]/session/useInterviewSocket.ts` - WebSocket hook
4. `src/app/(app)/interview/[interviewId]/session/page.test.tsx` - Test suite
5. `src/server/ws/server.ts` - WebSocket server implementation
6. `src/server/ws/server.test.ts` - WebSocket server tests

## Additional Files That May Be Needed in Future

1. `src/app/(app)/interview/[interviewId]/session/types.ts` - TypeScript types for session components
2. `src/app/(app)/interview/[interviewId]/session/utils.ts` - Utility functions for session components
3. `src/app/(app)/interview/[interviewId]/session/components/TranscriptEntry.tsx` - Dedicated component for transcript entries
4. `src/app/(app)/interview/[interviewId]/session/components/TimerDisplay.tsx` - Dedicated component for timer display
5. `src/app/(app)/interview/[interviewId]/session/components/ControlPanel.tsx` - Dedicated component for interview controls