import { test, expect } from "@playwright/test";

// PAID TIER — spends a small amount of AI tokens (intake question generation).
// Runs only with: npm run e2e:paid   (sets E2E_PAID_FLOWS=1)
//
// Deliberately stops BEFORE "Create project": project creation starts the full
// onboarding generation queue (Market Research, Product Plan, First Version
// Plan, mockups), which is real spend and takes minutes. Full-flow verification
// stays an agent/manual workflow per docs/operating-system/ui-verification.md
// (fresh project, Idea 1.1, evidence under ui-evidence/).

const IDEA_1_1 =
  "A B2B product intelligence platform that ingests support tickets, chat transcripts, sales calls, product analytics notes, and internal docs to surface recurring customer pain, detect trend shifts, and recommend roadmap priorities for product managers and customer-facing teams.";

test("intake step 2 generates real question cards for Idea 1.1", async ({ page }) => {
  test.skip(process.env.E2E_PAID_FLOWS !== "1", "paid flow: run via npm run e2e:paid");
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set in .env.e2e.local");

  await page.goto("/");
  await page.getByRole("banner").getByText("Sign In").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("you@example.com").fill(email!);
  await dialog.getByPlaceholder("Enter your password").fill(password!);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/projects/, { timeout: 30_000 });

  await page.goto("/projects/new");
  await page.getByRole("textbox").first().fill(IDEA_1_1);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2 advances immediately and renders skeletons, then real cards.
  // The parser guarantees a single-select primary-platform question.
  await expect(page.getByText("Desktop website")).toBeVisible({ timeout: 90_000 });
  const modeLabels = page.getByText(/Pick (one|a few)/);
  expect(await modeLabels.count()).toBeGreaterThanOrEqual(4);

  // Stop here: do NOT click "Create project" (starts the paid generation queue).
});
