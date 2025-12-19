import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export async function setup() {
  const testDbPath = path.join(process.cwd(), "prisma", "test.db");
  process.env.DATABASE_URL = `file:${testDbPath}`;

  console.log(`
[Global Setup] Initializing test database at ${testDbPath}...
`);

  try {
    // Ensure the database is fresh
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Run prisma db push to sync schema without migrations history
    execSync("npx prisma db push --accept-data-loss", {
      env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
      stdio: "inherit",
    });

    console.log("[Global Setup] Test database initialized successfully.\n");
  } catch (error) {
    console.error("[Global Setup] Failed to initialize test database:", error);
    throw error;
  }
}
