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

## Running Tests

```bash
# Run all session tests
pnpm test src/app/\(app\)/interview/\[interviewId\]/session

# Run specific test file
pnpm test src/app/\(app\)/interview/\[interviewId\]/session/SessionContent.test.tsx

# Run with coverage
pnpm test:ci src/app/\(app\)/interview/\[interviewId\]/session
```