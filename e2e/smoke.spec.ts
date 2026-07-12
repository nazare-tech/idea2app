import { test, expect } from "@playwright/test";

// Free smoke tier: no AI calls, no credits, no project creation.
// The paid intake flow lives in paid-intake.spec.ts behind E2E_PAID_FLOWS=1.

const IDEA_1_1 =
  "A B2B product intelligence platform that ingests support tickets, chat transcripts, sales calls, product analytics notes, and internal docs to surface recurring customer pain, detect trend shifts, and recommend roadmap priorities for product managers and customer-facing teams.";

const LANDING_IDEA_PLACEHOLDER =
  "Describe what you want to build in a few sentences...";

test("landing page renders hero, idea capture, and sign-in entry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder(LANDING_IDEA_PLACEHOLDER)).toBeVisible();
  await expect(
    page.getByRole("banner").getByText("Sign In").first(),
  ).toBeVisible();
});

test("landing idea below the validation floor disables Get Started", async ({ page }) => {
  await page.goto("/");
  const idea = page.getByPlaceholder(LANDING_IDEA_PLACEHOLDER);
  // The header also has a "Get Started" button; target the idea-capture one.
  const getStarted = page.getByTestId("landing-idea-signup");
  // Empty input allows a plain sign-up, so the button starts enabled.
  await expect(getStarted).toBeEnabled();
  // Below the shared floor (30+ chars, 4+ words): disabled with an inline hint.
  await idea.fill("todo app");
  await expect(getStarted).toBeDisabled();
  // A full idea re-enables it.
  await idea.fill(IDEA_1_1);
  await expect(getStarted).toBeEnabled();
});

test("sign in via auth modal and reach intake wizard step 1 validation", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set in .env.e2e.local");

  await page.goto("/");
  await page.getByRole("banner").getByText("Sign In").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("you@example.com").fill(email!);
  await dialog.getByPlaceholder("Enter your password").fill(password!);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();

  // Authenticated users land on the projects dashboard.
  await page.waitForURL(/\/projects/, { timeout: 30_000 });

  // Wizard step 1: Next respects the shared idea floor. We stop BEFORE
  // clicking Next so no AI question generation (paid) is triggered.
  await page.goto("/projects/new");
  const wizardIdea = page.getByRole("textbox").first();
  await expect(wizardIdea).toBeVisible();
  const next = page.getByRole("button", { name: "Next", exact: true });
  await wizardIdea.fill("todo app");
  await expect(next).toBeDisabled();
  await wizardIdea.fill(IDEA_1_1);
  await expect(next).toBeEnabled();
});
