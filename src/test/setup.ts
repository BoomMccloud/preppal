// src/test/setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";
import path from "node:path";

const testDbPath = path.join(process.cwd(), "prisma", "test.db");
const testDbUrl = `file:${testDbPath}`;

// Ensure DATABASE_URL is set for any code that reads it from process.env
process.env.DATABASE_URL = testDbUrl;

vi.mock("~/env.js", () => {
  return {
    env: {
      DATABASE_URL: testDbUrl,
      NODE_ENV: "test",
      JWT_SECRET: "test-jwt-secret-at-least-32-chars-long",
      WORKER_SHARED_SECRET: "test-worker-secret-at-least-32-chars-long",
      NEXT_PUBLIC_WORKER_URL: "http://localhost:8787",
    },
  };
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/",
  redirect: vi.fn(),
}));
