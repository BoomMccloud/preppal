// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts", // a file to setup things before each test
    globalSetup: "./src/test/global-setup.ts",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "src/test/e2e/**",
    ],
  },
});
