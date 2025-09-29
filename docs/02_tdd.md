# Here is a comprehensive guide to the tools and processes you can use for TDD with your MVP.

### Testing Philosophy: The Testing Pyramid

1.  **Unit Tests (Base of the pyramid):** Fast and numerous. Test a single function or component in isolation.
2.  **Integration Tests (Middle):** Test how multiple units work together (e.g., a tRPC procedure interacting with the database).
3.  **End-to-End (E2E) Tests (Top):** Slow and few. Test the entire application from the user's perspective in a real browser.

### Tooling

- **Test Runner & Framework**: **[Vitest](https://vitest.dev/)**.
- **Frontend Component Testing**: **[React Testing Library (RTL)](https://testing-library.com/docs/react-testing-library/intro/)**.
- **Mocking**:
  - **[Vitest's built-in `vi.mock`](https://vitest.dev/guide/mocking.html)**: Excellent for mocking modules, like your Prisma client or the Gemini API client, in unit tests.
  - **[Mock Service Worker (MSW)](https://mswjs.io/)**: Intercepts network requests at the network level, which is perfect for creating a fake backend for your frontend tests or mocking the external Gemini API.
- **E2E Testing**: **[Playwright](https://playwright.dev/)**.
- **Database Testing**:
  - **Mocking Prisma**: For unit tests of your tRPC procedures, you'll mock the Prisma client.
  - **Test Database**: For integration tests, you'll use a real database.

### Applying TDD to Each Part of Your System

#### 1. Testing tRPC Procedures (Backend Unit/Integration)

This is where your business logic lives.

- **TDD Workflow**:
  1.  **(Red)**: Write a test for a tRPC procedure that doesn't exist yet (e.g., `user.getProfileById`). In the test, you'll call the procedure and assert that it returns the expected user data. It will fail because the procedure isn't defined.
  2.  **(Green)**: Create the tRPC procedure. Use `vi.mock` to mock your Prisma client. Make the mock return a fake user. The test should now pass.
  3.  **(Refactor)**: Clean up the procedure's code.

#### 2. Testing WebSocket Logic (Backend Integration)

This is the most complex part. You need to test the server's behavior when it receives messages. You can use a WebSocket client library like `ws` in your tests to connect to your running server.

- **TDD Workflow**:
  1.  **(Red)**: Write a test that starts your WebSocket server, connects a client, sends a mock Protobuf message (as a `Buffer`), and expects a specific action to occur (e.g., your mock Gemini client's `send` method is called). The test fails.
  2.  **(Green)**: Implement the `on('message', ...)` handler in your WebSocket server. Add the logic to decode the Protobuf message and call the Gemini client. The test passes.
  3.  **(Refactor)**: Clean up the message handling logic.

#### 3. Testing Protobuf Serialization (Pure Unit Test)

This is a perfect candidate for a simple, fast unit test.

- **TDD Workflow**:
  1.  **(Red)**: Write a test that takes a known JavaScript object, calls your `serialize` function, then calls your `deserialize` function, and asserts the result deeply equals the original object. It will fail before the functions are written.
  2.  **(Green)**: Implement the serialization/deserialization logic using your generated Protobuf code. The test will pass.
  3.  **(Refactor)**: No refactoring is likely needed for this simple case.

#### 4. Testing React Components (Frontend Unit)

- **TDD Workflow**:
  1.  **(Red)**: Write a test for a `StatusIndicator` component. Assert that when you pass a prop `status="connecting"`, the component renders the text "Connecting...". Use React Testing Library's `render` and `screen.getByText`. The test fails.
  2.  **(Green)**: Write the `StatusIndicator` component logic to render the correct text based on the `status` prop. The test passes.
  3.  **(Refactor)**: Clean up the component's JSX or styling.

#### 5. End-to-End Testing a Feature

E2E tests verify the entire workflow. TDD at this level helps define the feature from a user's perspective first.

- **User Story**: "When I click the 'Start Interview' button, my status indicator should change to 'Connecting...'."
- **TDD Workflow**:
  1.  **(Red)**: Write a Playwright test that:
      - Navigates to the home page.
      - Logs the user in.
      - Clicks the "Start Interview" button.
      - Asserts that an element with the text "Connecting..." is now visible on the page.
      - This test will fail spectacularly.
  2.  **(Green)**: Now, you drop down to the unit and integration levels to build the feature, following the TDD cycles described above (build the component, the state management, the WebSocket connection logic, etc.). As you complete the pieces, you can re-run the E2E test until it finally passes.
  3.  **(Refactor)**: With the E2E test providing a safety net, you can now refactor the underlying code for the entire feature.
