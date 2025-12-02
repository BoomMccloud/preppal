# E2E Tests

End-to-end tests for the interview session flow would go here.

## Structure
```
e2e/
├── session-flow.test.ts     # Full interview session workflow
├── audio-handling.test.ts   # Audio recording/playback tests
├── error-handling.test.ts   # Error scenarios and recovery
└── playwright.config.ts     # Playwright configuration
```

## Test Scenarios

1. **Full Interview Flow**
   - User navigates to session
   - WebSocket connection established
   - Audio recording starts
   - AI responses played
   - Session ends gracefully

2. **Error Handling**
   - Network disconnections
   - Audio device errors
   - Token expiration
   - Server errors

3. **Edge Cases**
   - Multiple browser tabs
   - Browser refresh during session
   - Slow network conditions
   - Large audio files

## Technology

We recommend using [Playwright](https://playwright.dev/) for E2E tests as it provides:
- Cross-browser testing
- Reliable automation
- Rich debugging capabilities
- Network interception
- Video recordings

## Example Test
```typescript
import { test, expect } from '@playwright/test';

test('should complete interview session', async ({ page }) => {
  // Navigate to session
  await page.goto('/interview/session-123');
  
  // Wait for connection
  await expect(page.getByText('Connected')).toBeVisible();
  
  // Simulate user speech
  await page.getByRole('button', { name: 'Start Recording' }).click();
  
  // Wait for AI response
  await expect(page.getByText('Hello! Tell me about yourself')).toBeVisible();
  
  // End session
  await page.getByRole('button', { name: 'End Interview' }).click();
  
  // Verify redirect to feedback
  await expect(page).toHaveURL(/\/feedback$/);
});
```