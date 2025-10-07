# CURRENT TASK: Implement Real-Time Interview Session (Backend)

## Feature Spec

- Follow the backend-related sections of the plan outlined in [FEAT15_session_page_spec.md](./FEAT15_session_page_spec.md).

## High-Level Plan

### Phase 1: Backend (WebSocket Server)
- [ ] **Install Deps**: `pnpm add ws @types/ws`.
- [ ] **RED**: Create `src/server/ws/server.test.ts` and write failing tests for the core authentication and state change logic.
- [ ] **GREEN**: Create `src/server/ws/server.ts` and implement the WebSocket server, including DB interactions, to make the tests pass.
- [ ] **Setup**: Create a `dev:ws` script in `package.json` to run the server.
