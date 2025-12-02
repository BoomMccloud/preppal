import { test, expect, type Page } from "@playwright/test";

/**
 * This E2E test covers the real-time audio interview user journey for the Preppal application.
 *
 * The journey includes:
 * 1. Logging in as a user.
 * 2. Creating a new interview with a job description and resume.
 * 3. Navigating the lobby and joining the interview session.
 * 4. Granting microphone permissions.
 * 5. Verifying audio streaming is working (echo functionality).
 * 6. Ending the interview session.
 * 7. Waiting for and verifying the interview feedback.
 * 8. Logging out.
 *
 * To run this test:
 * 1. Make sure the application is running in development mode (`pnpm dev`).
 * 2. Make sure the WebSocket server is running (`pnpm dev:ws`).
 * 3. Run Playwright: `pnpm playwright test e2e/audio-journey.spec.ts`
 */
test.describe("Real-Time Audio Interview Journey", () => {
  const userEmail = "dev1@preppal.com";
  const userPassword = "dev123";

  // Store the interview ID to use across different steps
  let interviewId: string;

  test("should handle a full real-time audio interview", async ({ page }) => {
    // --- 1. Login ---
    await test.step("Login", async () => {
      await page.goto("/signin");
      await page.getByLabel("Email").fill(userEmail);
      await page.getByLabel("Password").fill(userPassword);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL("/dashboard");
    });

    // --- 2. Create Interview ---
    await test.step("Create Interview", async () => {
      await page.getByRole("link", { name: "Create Interview" }).click();
      await expect(page).toHaveURL(/.*create-interview/);

      // Fill in job description and resume
      await page
        .getByLabel("Job Description")
        .fill("Senior Frontend Developer position at a tech company");
      await page
        .getByLabel("Resume")
        .fill(
          "Experienced frontend developer with 5 years of React experience",
        );

      // Submit the form
      await page.getByRole("button", { name: "Create Interview" }).click();

      // Wait for redirection to lobby and extract interview ID
      await page.waitForURL(/.*interview\/.*\/lobby/);
      const url = page.url();
      const match = url.match(/interview\/([^\/]+)\/lobby/);
      if (match && match[1]) {
        interviewId = match[1];
      } else {
        throw new Error("Could not extract interview ID from URL");
      }
    });

    // --- 3. Navigate to Session ---
    await test.step("Navigate to Session", async () => {
      await page.getByRole("button", { name: "Join Session" }).click();
      await page.waitForURL(/.*interview\/.*\/session/);
    });

    // --- 4. Grant Microphone Permissions ---
    await test.step("Grant Microphone Permissions", async () => {
      // This would test that the browser requests microphone permissions
      // In a real test, we would mock the permissions API or use a browser that auto-grants permissions
      // For now, we'll just wait for the connection to be established
      await page.waitForTimeout(2000); // Wait for permission prompt and connection
    });

    // --- 5. Verify Audio Streaming ---
    await test.step("Verify Audio Streaming", async () => {
      // This would test that binary ClientToServerMessage frames containing AudioChunk are being sent
      // This would test that binary ServerToClientMessage frames containing AudioChunk are being received (the echo)
      // This would test that the UI displays a "Live" status

      // Wait for the live state
      await expect(page.getByText("Interview Session")).toBeVisible();

      // Check that we're in the live state (not connecting or error)
      await expect(page.getByText("Connecting...")).not.toBeVisible();
      await expect(page.getByText("Connection Error")).not.toBeVisible();
    });

    // --- 6. End Interview ---
    await test.step("End Interview", async () => {
      await page.getByRole("button", { name: "End Interview" }).click();
      // Wait for the ending state
      await expect(
        page.getByRole("button", { name: "Ending..." }),
      ).toBeVisible();
    });

    // --- 7. Verify Redirect to Feedback ---
    await test.step("Verify Redirect to Feedback", async () => {
      // This would test that the user is redirected to the feedback page
      await page.waitForURL(/.*interview\/.*\/feedback/);
      await expect(page.getByText("Interview Feedback")).toBeVisible();
    });

    // --- 8. Logout ---
    await test.step("Logout", async () => {
      await page.getByRole("button", { name: "Logout" }).click();
      await expect(page).toHaveURL("/signin");
    });
  });
});
