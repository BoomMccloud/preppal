/**
 * Global test setup for Vitest.
 * Individual tests are responsible for creating and cleaning up their own test data.
 */

export async function setup() {
  console.log("\n[Global Setup] Test run starting...\n");
}

export async function teardown() {
  // Optional: cleanup after all tests complete
}
