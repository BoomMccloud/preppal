### Phase 0: The Foundation & The Contract (1-3 Days)

**Goal:** Establish the technical foundation and all the "contracts" so developers can work in parallel. This is the most critical phase for a multi-developer team.

| Task | Description | Status |
| :--- | :--- | :--- |
| **1. Define Protobuf Schema** | **(Start Here)** Collaboratively define the `.proto` file for real-time communication. | ✅ Complete |
| **2. Define Database Schema** | Use `schema.prisma` to define the models for `User`, `InterviewSession`, etc. | ✅ Complete |
| **3. Define tRPC API Routers** | Define the tRPC router procedures, including their input schemas and output types. | ✅ Complete |
| **4. Setup Project Tooling** | Configure the monorepo, Vitest, ESLint, Prettier, and a basic CI/CD pipeline. | ✅ Complete |

### Phase 1: Backend Implementation (Parallel to Phase 2)

**Goal:** Build the server-side logic based on the contracts defined in Phase 0.

| Task | Description | Status |
| :--- | :--- | :--- |
| **1. Implement Authentication** | Set up NextAuth.js with your chosen provider(s). Protect endpoints. | ✅ Complete |
| **2. Implement tRPC Resolvers** | Write the actual business logic for the tRPC procedures defined in Phase 0. | 🟡 In Progress |
| **3. Build the WebSocket Server** | Create the WebSocket server that accepts connections, authenticates them, and handles messages. | ❌ Not Started |
| **4. Create a Mock Gemini Client** | Build a `MockGeminiClient` class that implements the same interface as the real one. | ❌ Not Started |
| **5. Implement Real-Time Logic** | Wire up the WebSocket server to decode Protobuf messages and interact with the mock client. | ❌ Not Started |

### Phase 2: Frontend Implementation (Parallel to Phase 1)

**Goal:** Build the user interface and client-side logic, working against the defined contracts.

| Task | Description | Status |
| :--- | :--- | :--- |
| **1. Build UI Components** | Create all the React components for the meeting screen, login page, profile page, etc. | ✅ Complete |
| **2. Implement State Management** | Set up client-side state management (e.g., Zustand, Jotai, or React Context) for session state. | ❌ Not Started |
| **3. Connect to tRPC API** | Use the auto-generated tRPC client to fetch user data and interview history. | ✅ Complete |
| **4. Implement WebSocket Client** | Write the client-side code to connect to the WebSocket server. | ❌ Not Started |
| **5. Implement Audio & Protobufs** | Write the logic to capture mic audio, handle Protobufs, and stream over the WebSocket. | ❌ Not Started |

### Phase 3: Integration and End-to-End Testing

**Goal:** Connect all the pieces and verify the complete user flow.

| Task | Description | Status |
| :--- | :--- | :--- |
| **1. Connect to Real Gemini API** | Swap the `MockGeminiClient` for the real implementation. | ❌ Not Started |
| **2. Full-Stack Connection** | Deploy the frontend and backend to a shared staging environment. | ❌ Not Started |
| **3. Write E2E Tests** | Use Playwright to write tests that simulate a complete user journey. | ❌ Not Started |
| **4. Manual QA and Bug Fixing** | The whole team participates in testing to find bugs and usability issues. | ❌ Not Started |