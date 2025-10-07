import { test, expect, type Page } from "@playwright/test";

/**
 * This E2E test covers the primary user journey for the Preppal application.
 *
 * The journey includes:
 * 1. Logging in as a user.
 * 2. Creating a new interview with a job description and resume.
 * 3. Navigating the lobby and joining the interview session.
 * 4. Ending the interview session.
 * 5. Waiting for and verifying the interview feedback.
 * 6. Logging out.
 *
 * To run this test:
 * 1. Make sure the application is running in development mode (`pnpm dev`).
 * 2. Run Playwright: `pnpm playwright test e2e/core-journey.spec.ts`
 */
test.describe("Core User Journey", () => {
  const userEmail = "dev1@preppal.com";
  const userPassword = "dev123";

  // Store the interview ID to use across different steps
  let interviewId: string;

  test("should allow a user to login, create and complete an interview, and view feedback", async ({
    page,
  }) => {
    // --- 1. Login ---
    await test.step("Login", async () => {
      await page.goto("/signin");
      await expect(
        page.getByRole("heading", { name: "Sign In to PrepPal" })
      ).toBeVisible();

      // Click the button to reveal the credentials form
      await page.getByRole("button", { name: "Sign in with Credentials" }).click();

      // Fill in and submit the login form
      await page.getByLabel("Email").fill(userEmail);
      await page.getByLabel("Password").fill(userPassword);
      await page.getByRole("button", { name: "Sign In" }).click();

      // Verify successful login by checking for the dashboard URL
      await expect(page).toHaveURL("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Interview History" })
      ).toBeVisible();
    });

    // --- 2. Create an Interview ---
    await test.step("Create Interview", async () => {
      await page.getByRole("link", { name: "Create New Interview" }).click();
      await expect(page).toHaveURL("/create-interview");

      // Fill in the job description and resume
      await page
        .getByLabel("Job Description")
        .fill("Senior Software Engineer specializing in Next.js and TypeScript.");
      await page
        .getByLabel("Your Resume")
        .fill(
          "Experienced developer with 5 years of building full-stack applications."
        );

      await page.getByRole("button", { name: "Create Interview" }).click();
    });

    // --- 3. Join the Interview ---
    await test.step("Join Interview", async () => {
      // After creation, we should be in the lobby
      await expect(page).toHaveURL(/\/interview\/.+\/lobby/);
      await expect(
        page.getByRole("heading", { name: "Interview Lobby" })
      ).toBeVisible();

      // Extract the interview ID from the URL for later use
      const url = page.url();
      interviewId = url.split("/")[4];
      expect(interviewId).toBeDefined();

      // In a real test, you might need to handle microphone permissions here.
      // For automation, it's common to use a browser context with permissions pre-granted.
      // Example: `browser.newContext({ permissions: ['microphone'] })`
      await page.getByRole("button", { name: "Join Now" }).click();
    });

    // --- 4. Exit the Interview ---
    await test.step("Exit Interview", async () => {
      await expect(page).toHaveURL(`/interview/${interviewId}/session`);
      await expect(page.getByText("Interview in progress...")).toBeVisible();

      // Find and click the "End Interview" button
      await page.getByRole("button", { name: "End Interview" }).click();
    });

    // --- 5. Check Interview Feedback ---
    await test.step("Check Feedback", async () => {
      // After ending, we should be on the feedback page
      await expect(page).toHaveURL(`/interview/${interviewId}/feedback`);

      // First, check for the processing state. This confirms the polling component is working.
      await expect(
        page.getByText("Your feedback is being generated. This may take a minute...")
      ).toBeVisible();

      // Now, wait for the feedback to be ready.
      // Playwright's `expect` has a built-in timeout, which is perfect for this async operation.
      // We'll wait up to 90 seconds for the feedback to appear.
      await expect(
        page.getByRole("heading", { name: "Interview Feedback" })
      ).toBeVisible({ timeout: 90000 });

      // Verify that the feedback content is displayed
      await expect(page.getByText("Summary")).toBeVisible();
      await expect(page.getByText("Strengths")).toBeVisible();
      await expect(page.getByText("Areas for Improvement")).toBeVisible();
    });

    // --- 6. Log out ---
    await test.step("Log Out", async () => {
      // Navigate back to the dashboard to find the logout button
      await page.goto("/dashboard");

      // The logout button is likely in a dropdown menu
      await page.getByRole("button", { name: "Open user menu" }).click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();

      // Verify successful logout
      await expect(page).toHaveURL("/signin");
      await expect(
        page.getByRole("heading", { name: "Sign In to PrepPal" })
      ).toBeVisible();
    });
  });
});
