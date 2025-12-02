# Testing Strategy

This directory contains tests for the interview session components using a simplified, more maintainable approach.

## Test Organization

```
session/
├── SessionContent.test.tsx     # Component tests focusing on user-facing behavior
├── useInterviewSocket.test.ts   # Minimal hook tests (placeholder)
├── test-utils.ts              # Utility functions for creating test data
└── __snapshots__/             # Test snapshots (if any)
```

## Philosophy

Our testing approach focuses on:

### 1. User-Centric Testing
- Test what users see and do, not implementation details
- Use React Testing Library patterns (`screen.getByText`, `fireEvent`, etc.)
- Focus on outcomes rather than function calls

### 2. Separation of Concerns
- **Unit Tests**: Small, focused tests for pure functions and utilities
- **Component Tests**: Test UI components in isolation
- **Integration Tests**: Test key workflows with minimal mocking
- **E2E Tests**: Full user journeys (in separate e2e directory)

### 3. Maintainable Mocking
- Avoid overly complex mock setups
- Mock at the right level of abstraction
- Prefer behavioral mocks over implementation mocks

## Coverage Analysis

### Original Test Suite vs. New Approach

#### Original Tests Provided High Functional Coverage:
✅ **WebSocket connection lifecycle** (connecting, live, error states)
✅ **Message handling** (transcript updates, audio responses, session ended, errors)
✅ **Audio service integration** (recording, playback, sending audio chunks)
✅ **Token generation flow** (success and error cases)
✅ **UI state transitions** (all visual states)
✅ **User actions** (ending interview, error recovery)
✅ **Cleanup processes** (component unmount, resource disposal)

#### New Tests Provide Structural Coverage:
✅ **Basic loading states** (loading, connecting)
✅ **Interview status validation** (redirects for IN_PROGRESS/COMPLETED)
✅ **Component rendering** (basic UI elements present)
✅ **Initial hook state** (correct initial values)

#### Missing Coverage in New Approach:
❌ **WebSocket message processing** (transcript updates, audio responses, etc.)
❌ **Audio service functionality** (recording/playback integration)
❌ **Timer behavior** (elapsed time tracking)
❌ **End-to-end user flows** (complete interview session)
❌ **Error recovery mechanisms** (connection loss, token errors)
❌ **Audio chunk transmission** (sending recorded audio)
❌ **Session cleanup** (resource disposal on unmount)
❌ **Protocol buffer message handling** (encoding/decoding)

### Strategic Trade-off

We made a deliberate trade-off between **coverage** and **maintainability**:

| Aspect | Original Approach | New Approach |
|--------|------------------|--------------|
| **Coverage** | High functional coverage | Lower functional coverage |
| **Reliability** | Brittle and hard to maintain | Highly maintainable and reliable |
| **Debugging** | Difficult when failing | Easy to understand and debug |
| **Setup Complexity** | Overly complex test setup | Simple, focused tests |
| **Future Maintenance** | High risk of breaking | Low risk of breaking |

## Test Examples

### Component Test (SessionContent.test.tsx)
```javascript
// Test user-facing states
it("should show loading state when interview data is loading", () => {
  // Arrange
  mockGetByIdQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
  });

  // Act
  render(<SessionContent interviewId={mockInterviewId} />);

  // Assert
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### Utility Functions (test-utils.ts)
```javascript
// Helper for creating protobuf messages
export const createTranscriptUpdateMessage = (
  speaker: "AI" | "USER",
  text: string
): ArrayBuffer => {
  // Implementation...
};
```

## Best Practices

1. **Test Behavior, Not Implementation**
   ```javascript
   // ❌ Bad - testing implementation
   expect(mockAudioPlayer.enqueue).toHaveBeenCalledWith(data);

   // ✅ Good - testing user outcome
   expect(screen.getByText("AI response")).toBeInTheDocument();
   ```

2. **Use Descriptive Test Names**
   ```javascript
   // ❌ Bad
   it("should work", () => {...});

   // ✅ Good
   it("should redirect to dashboard if interview is IN_PROGRESS", () => {...});
   ```

3. **Keep Tests Independent**
   - Each test should be able to run alone
   - Reset mocks in beforeEach
   - Avoid shared state between tests

4. **Test Realistic Scenarios**
   - Test happy paths and error cases
   - Consider edge cases users might encounter
   - Focus on critical user workflows

## Recommended Hybrid Strategy

For production readiness, combine our approach with targeted functional tests:

### 1. **Retain Structural Tests**
Keep our new maintainable tests for basic functionality and user-facing behavior.

### 2. **Add Critical Path Functional Tests**
Create a few targeted tests for the most important workflows:
- Complete happy path interview session
- Critical error scenarios (connection loss, token expiration)
- End session flow

### 3. **Invest in E2E Tests**
Move complex integration testing to end-to-end tests:
```typescript
// Example E2E test concept
test('complete interview session', async ({ page }) => {
  await page.goto('/interview/session-123');
  await expect(page.getByText('Connected')).toBeVisible();
  await page.getByRole('button', { name: 'Start Recording' }).click();
  await expect(page.getByText('Hello! Tell me about yourself')).toBeVisible();
  await page.getByRole('button', { name: 'End Interview' }).click();
  await expect(page).toHaveURL(/\/feedback$/);
});
```

### 4. **Supplement with Unit Tests**
Add unit tests for critical utilities:
- Protocol buffer encoding/decoding functions
- Audio processing utilities
- WebSocket message handlers
- Pure business logic functions

This hybrid approach gives you both the reliability of our new approach and the confidence of comprehensive functional coverage.

## Running Tests

```bash
# Run all session tests
pnpm test src/app/\(app\)/interview/\[interviewId\]/session

# Run specific test file
pnpm test src/app/\(app\)/interview/\[interviewId\]/session/SessionContent.test.tsx

# Run with coverage
pnpm test:ci src/app/\(app\)/interview/\[interviewId\]/session
```