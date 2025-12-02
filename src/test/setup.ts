// src/test/setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("~/env.js", () => {
  return {
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: "test",
      // Add any other env variables that might be needed for tests
    },
  };
});
