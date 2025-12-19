# Current Task: Testing Strategy Refactor

## Status
- [x] Review existing test suite and identify failures.
- [x] Document new "Less Fragile" testing strategy in `docs/todo/backlog.md`.
- [ ] Implement a "Golden Path" backend system test using Vitest and a real test database.
- [ ] Refactor integration tests to use real test database instead of Prisma mocks.
- [ ] Clean up/Remove fragile E2E and UI tests.

## Notes
The project is moving away from Playwright and mock-heavy unit tests. The new focus is on backend system tests that verify the entire user flow via tRPC calls against a real SQLite test database. This provides high confidence with low maintenance overhead.

## Next Steps
1. Create `src/test/system/golden-path.test.ts`.
2. Set up a dedicated SQLite database for testing in `vitest.config.ts` or a setup file.