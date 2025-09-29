### Phase 0: The Foundation & The Contract (1-3 Days)

**Goal:** Establish the technical foundation and all the "contracts" so developers can work in parallel. This is the most critical phase for a multi-developer team.

| Task                           | Description                                                                                                                        | Outcome                                                                                                                                                 |
| :----------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1. Define Protobuf Schema**  | **(Start Here)** Collaboratively define the `.proto` file. This is the non-negotiable contract for all real-time communication.    | A checked-in `interview.proto` file with messages like `ClientAudioChunk`, `ServerAudioChunk`, and maybe control messages like `InterviewStartRequest`. |
| **2. Define Database Schema**  | Use `schema.prisma` to define the models for `User`, `InterviewSession`, etc.                                                      | A checked-in `schema.prisma` file. The database is the source of truth for your data structures.                                                        |
| **3. Define tRPC API Routers** | Define the tRPC router procedures, including their input schemas (using Zod) and output types. **Do not implement the logic yet.** | Type-safe tRPC router definitions that the frontend team can immediately import to get autocompletion and type-checking for the API.                    |
| **4. Setup Project Tooling**   | Configure the monorepo, Vitest for testing, ESLint, Prettier, and a basic CI/CD pipeline to run tests and lint on every commit.    | A stable development environment where code quality is enforced automatically. Everyone is on the same page.                                            |

---

### Phase 1: Backend Implementation (Parallel to Phase 2)

**Goal:** Build the server-side logic based on the contracts defined in Phase 0.

| Task                               | Description                                                                                                                                                                                                                                                            | Developer Focus |
| :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **1. Implement Authentication**    | Set up NextAuth.js with your chosen provider(s). Protect the tRPC procedures and WebSocket endpoint.                                                                                                                                                                   | Backend         |
| **2. Implement tRPC Resolvers**    | Write the actual business logic for the tRPC procedures defined in Phase 0. Use TDD: write a failing test for a resolver, then write the Prisma code to make it pass.                                                                                                  | Backend         |
| **3. Build the WebSocket Server**  | Create the WebSocket server that accepts connections, authenticates them, and handles message listeners.                                                                                                                                                               | Backend         |
| **4. Create a Mock Gemini Client** | **Crucial for low risk.** Build a `MockGeminiClient` class that implements the same interface as the real one. It can simply echo audio back or play a pre-recorded file. This allows you to test the entire streaming pipeline without depending on the external API. | Backend         |
| **5. Implement Real-Time Logic**   | Wire up the WebSocket server. When it receives a Protobuf message, it decodes it and passes it to the `MockGeminiClient`. When the mock client "responds," it encodes the response into a Protobuf message and sends it back to the client.                            | Backend         |

---

### Phase 2: Frontend Implementation (Parallel to Phase 1)

**Goal:** Build the user interface and client-side logic, working against the defined contracts.

| Task                               | Description                                                                                                                                                                                                  | Developer Focus |
| :--------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **1. Build UI Components**         | Create all the React components for the meeting screen, login page, user profile page, etc. Use a tool like Storybook to build them in isolation.                                                            | Frontend        |
| **2. Implement State Management**  | Set up your client-side state management (e.g., Zustand, Jotai, or React Context) for handling session state like `isConnecting`, `isRecording`, etc.                                                        | Frontend        |
| **3. Connect to tRPC API**         | Use the auto-generated tRPC client (from Phase 0) to fetch user data, interview history, etc. The frontend team can work with a mocked tRPC server (`msw`) until the backend is ready.                       | Frontend        |
| **4. Implement WebSocket Client**  | Write the client-side code to connect to the WebSocket server.                                                                                                                                               | Frontend        |
| **5. Implement Audio & Protobufs** | Write the logic to: <br> a) Capture microphone audio. <br> b) Encode it using the generated Protobuf code. <br> c) Send it over the WebSocket. <br> d) Receive, decode, and play back audio from the server. | Frontend        |

---

### Phase 3: Integration and End-to-End Testing

**Goal:** Connect all the pieces and verify the complete user flow.

| Task                                      | Description                                                                                                                                                      |
| :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Connect Backend to Real Gemini API** | Swap the `MockGeminiClient` for the real implementation. This should be a one-line change if the interface was correctly defined.                                |
| **2. Full-Stack Connection**              | Deploy the frontend and backend to a shared staging environment. The frontend now talks to the real backend instead of a mock server.                            |
| **3. Write E2E Tests**                    | Use Playwright to write tests that simulate a complete user journey: login, start an interview, allow microphone access, say a few words, and end the interview. |
| **4. Manual QA and Bug Fixing**           | The whole team should participate in testing the application to find bugs and usability issues that automated tests might miss.                                  |
