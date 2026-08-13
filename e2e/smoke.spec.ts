import { test, expect, type Page } from "@playwright/test";
import { validateProjectName } from "../src/lib/project-name";
import { getProjectUrl } from "../src/lib/project-routing";

// Free smoke tier: no AI calls, no credits, no project creation.
// The paid intake flow lives in paid-intake.spec.ts behind E2E_PAID_FLOWS=1.

const IDEA_1_1 =
  "A B2B product intelligence platform that ingests support tickets, chat transcripts, sales calls, product analytics notes, and internal docs to surface recurring customer pain, detect trend shifts, and recommend roadmap priorities for product managers and customer-facing teams.";

const LANDING_IDEA_PLACEHOLDER =
  "Describe what you want to build in a few sentences...";

async function signInFromLanding(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByRole("banner").getByText("Sign In").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("you@example.com").fill(email);
  await dialog.getByPlaceholder("Enter your password").fill(password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/projects/, { timeout: 30_000 });
}

async function expectProjectCardGeometry(page: Page, expectedColumnCount: 1 | 2) {
  const grid = page.getByTestId("dashboard-project-grid");
  const cards = page.getByTestId("dashboard-project-card");
  expect(await cards.count(), "authenticated E2E account must retain an existing project").toBeGreaterThan(0);
  expect(await page.getByTestId("dashboard-project-dot-field-shell").count()).toBe(0);
  expect(await grid.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.columnGap, style.rowGap];
  })).toEqual(["32px", "32px"]);
  expect(await grid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
  )).toBe(expectedColumnCount);

  const card = cards.first();
  const details = card.getByTestId("dashboard-project-card-details");
  const thumbnailSurface = card.locator("[data-thumbnail-state]");
  const thumbnailCanvas = card.locator("[data-thumbnail-canvas='true']");
  const actions = page.getByTestId("dashboard-project-card-actions");
  const action = actions.first();
  const actionIcon = action.locator("svg");
  const [gridBox, cardBox, detailsBox, thumbnailCanvasBox, actionBox, actionIconBox] = await Promise.all([
    grid.boundingBox(),
    card.boundingBox(),
    details.boundingBox(),
    thumbnailCanvas.boundingBox(),
    action.boundingBox(),
    actionIcon.boundingBox(),
  ]);

  expect(gridBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(detailsBox).not.toBeNull();
  expect(thumbnailCanvasBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(actionIconBox).not.toBeNull();
  expect(Math.abs(cardBox!.height - 500)).toBeLessThanOrEqual(2);
  expect(Math.abs(detailsBox!.height - 122)).toBeLessThanOrEqual(1);
  expect(Math.abs(thumbnailCanvasBox!.height - 336)).toBeLessThanOrEqual(1);
  expect(Math.abs(actionIconBox!.width - 20)).toBeLessThanOrEqual(1);
  expect(Math.abs(actionIconBox!.height - 20)).toBeLessThanOrEqual(1);
  expect(Math.abs(cardBox!.x + cardBox!.width - actionIconBox!.x - actionIconBox!.width - 18)).toBeLessThanOrEqual(1);
  expect(Math.abs(actionIconBox!.y - cardBox!.y - 22)).toBeLessThanOrEqual(1);
  if (expectedColumnCount === 2) {
    expect(Math.abs(cardBox!.width - 648)).toBeLessThanOrEqual(2);
  } else {
    expect(cardBox!.width).toBeLessThanOrEqual(gridBox!.width);
  }
  expect(await card.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.borderTopWidth, style.backgroundColor];
  })).toEqual(["0px", "rgba(0, 0, 0, 0)"]);
  expect(await thumbnailSurface.evaluate((element) => {
    const style = getComputedStyle(element);
    return [
      style.backgroundColor,
      style.borderRadius,
      style.paddingTop,
      style.paddingRight,
      style.paddingBottom,
      style.paddingLeft,
      style.borderTopWidth,
      style.borderRightWidth,
      style.borderBottomWidth,
      style.borderLeftWidth,
    ];
  })).toEqual([
    "rgb(255, 255, 255)",
    "24px",
    "20px",
    "20px",
    "20px",
    "20px",
    "1px",
    "1px",
    "1px",
    "1px",
  ]);
  expect(await details.evaluate((element) => {
    const style = getComputedStyle(element);
    return [
      style.borderTopWidth,
      style.borderRightWidth,
      style.borderBottomWidth,
      style.borderLeftWidth,
      style.backgroundColor,
      style.paddingTop,
      style.paddingRight,
      style.paddingBottom,
      style.paddingLeft,
    ];
  })).toEqual([
    "0px",
    "0px",
    "0px",
    "0px",
    "rgba(0, 0, 0, 0)",
    "20px",
    "8px",
    "0px",
    "8px",
  ]);
  expect(await card.getByTestId("dashboard-project-card-title").evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.fontSize, style.fontWeight, style.lineHeight, style.textOverflow];
  })).toEqual(["18px", "500", "normal", "ellipsis"]);

  const descriptionsUseFigmaClip = await page
    .getByTestId("dashboard-project-card-description-slot")
    .evaluateAll((slots) => slots.every((slot) => {
      const description = slot.querySelector<HTMLElement>("[data-testid='dashboard-project-card-description']");
      if (!description) return false;
      const slotStyle = getComputedStyle(slot);
      const descriptionStyle = getComputedStyle(description);
      return Math.abs(slot.getBoundingClientRect().height - 72) <= 0.5
        && slotStyle.overflowY === "hidden"
        && descriptionStyle.fontSize === "14px"
        && descriptionStyle.lineHeight === "normal"
        && descriptionStyle.whiteSpace === "pre-wrap"
        && descriptionStyle.getPropertyValue("-webkit-line-clamp") === "none"
        && descriptionStyle.textOverflow === "clip";
    }));
  expect(descriptionsUseFigmaClip).toBe(true);

  const contentIsContained = await page
    .getByTestId("dashboard-project-card-details")
    .evaluateAll((panels) => panels.every((panel) => {
      const date = panel.querySelector<HTMLElement>("[data-testid='dashboard-project-card-created']");
      if (!date || panel.scrollHeight > panel.clientHeight) return false;

      const panelRect = panel.getBoundingClientRect();
      const dateRect = date.getBoundingClientRect();
      return dateRect.top >= panelRect.top && dateRect.bottom <= panelRect.bottom;
    }));
  expect(contentIsContained).toBe(true);
}

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

  await signInFromLanding(page, email!, password!);

  // Wizard step 1: Next respects the shared idea floor. We stop BEFORE
  // clicking Next so no AI question generation (paid) is triggered.
  await page.goto("/projects/new");
  expect(await page.getByTestId("dashboard-project-dot-field-shell").count()).toBe(0);
  const wizardIdea = page.getByRole("textbox").first();
  await expect(wizardIdea).toBeVisible();
  const next = page.getByRole("button", { name: "Next", exact: true });
  await wizardIdea.fill("todo app");
  await expect(next).toBeDisabled();
  await wizardIdea.fill(IDEA_1_1);
  await expect(next).toBeEnabled();
});

test("project cards expose navigation-safe rename and delete actions", async ({ page }) => {
  test.setTimeout(90_000);
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set in .env.e2e.local");

  await signInFromLanding(page, email!, password!);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expectProjectCardGeometry(page, 2);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectProjectCardGeometry(page, 1);

  const projectsUrl = page.url();
  const cards = page.getByTestId("dashboard-project-card");
  expect(await cards.count(), "rename focus-restoration check requires two retained projects").toBeGreaterThan(1);

  const firstCard = cards.first();
  const firstTitle = firstCard.getByTestId("dashboard-project-card-title");
  const originalName = (await firstTitle.textContent())?.trim() ?? "";
  const originalValidation = validateProjectName(originalName);
  expect(
    originalValidation.ok && originalValidation.name === originalName,
    "retained project name must round-trip byte-for-byte before mutation",
  ).toBe(true);

  const originalHref = await firstCard.getAttribute("href");
  const projectId = originalHref?.match(/[0-9a-f]{8}-[0-9a-f-]{27}/i)?.[0];
  expect(projectId, "card href must contain the stable project UUID").toBeTruthy();

  const firstActions = page.getByRole("button", { name: `Project actions for ${originalName}` });
  await firstCard.hover();
  await expect(firstActions).toBeVisible();
  expect(await firstActions.evaluate((button) => button.closest("a"))).toBeNull();
  expect(await firstCard.locator("[data-thumbnail-canvas='true'] button").count()).toBe(0);

  await firstActions.click();
  await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();

  const renameDialog = page.getByRole("dialog", { name: "Rename" });
  const renameInput = renameDialog.getByRole("textbox", { name: "Project name" });
  await expect(renameDialog).toBeVisible();
  await expect(renameInput).toHaveValue(originalName);
  await expect(renameDialog.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await renameDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(renameDialog).not.toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).pointerEvents)).not.toBe("none");
  await expect(firstActions).toBeFocused();

  const secondActions = page.getByTestId("dashboard-project-card-actions").nth(1);
  await page.getByTestId("dashboard-project-card-shell").nth(1).hover();
  await secondActions.click();
  await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).not.toBeVisible();
  await expect(secondActions).toBeFocused();

  expect(
    originalName.startsWith("RenameTest"),
    "Another rename test appears to be using this project; refusing to overwrite its marker.",
  ).toBe(false);

  const markerName = `RenameTest${Date.now()}`.padEnd(80, "x").slice(0, 80);
  const cleanupRequest = page.context().request;
  let cleanupRequired = false;
  try {
    await firstActions.click();
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    await renameInput.fill(markerName);
    cleanupRequired = true;
    await renameDialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(renameDialog).not.toBeVisible();
    await expect(firstTitle).toHaveText(markerName);

    await page.reload();
    const renamedCard = page
      .getByTestId("dashboard-project-card")
      .filter({ has: page.getByTestId("dashboard-project-card-title").filter({ hasText: markerName }) })
      .first();
    await expect(renamedCard).toBeVisible();
    await expect(renamedCard).toHaveAttribute("href", getProjectUrl({ id: projectId!, name: markerName }));
    await renamedCard.hover();

    const [titleBox, createdBox] = await Promise.all([
      renamedCard.getByTestId("dashboard-project-card-title").boundingBox(),
      renamedCard.getByTestId("dashboard-project-card-created").boundingBox(),
    ]);
    expect(titleBox).not.toBeNull();
    expect(createdBox).not.toBeNull();
    expect(titleBox!.x + titleBox!.width + 59).toBeLessThanOrEqual(createdBox!.x + 0.5);

    await page.getByRole("button", { name: `Project actions for ${markerName}` }).click();
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    await renameInput.fill(originalName);
    await renameDialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(renameDialog).not.toBeVisible();
    await page.reload();
    const restoredCard = page
      .getByTestId("dashboard-project-card")
      .filter({ has: page.getByTestId("dashboard-project-card-title").filter({ hasText: originalName }) })
      .first();
    await restoredCard.hover();
    await expect(page.getByRole("button", { name: `Project actions for ${originalName}` })).toBeVisible();
    cleanupRequired = false;
  } finally {
    if (cleanupRequired) {
      let restored = false;
      for (let attempt = 0; attempt < 2 && !restored; attempt += 1) {
        const response = await cleanupRequest.patch(`/api/projects/${projectId}`, {
          data: { name: originalName },
        });
        if (response.ok()) {
          const result = await response.json();
          restored = result?.data?.name === originalName;
        }
      }
      if (!restored) {
        throw new Error(`MANUAL RESTORE REQUIRED: project ${projectId} original name ${originalName}`);
      }
    }
  }

  const restoredActions = page.getByRole("button", { name: `Project actions for ${originalName}` });
  await restoredActions.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const destructiveHeading = page.getByRole("heading", {
    name: /^(Delete project\?|Upgrade to delete projects)$/,
  });
  await expect(destructiveHeading).toBeVisible();
  expect(page.url()).toBe(projectsUrl);

  const cancelButton = page.getByRole("button", { name: /^(Cancel|Not now)$/ });
  const cancelIsTopmost = await cancelButton.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    )?.closest("button") === button;
  });
  expect(cancelIsTopmost).toBe(true);

  await cancelButton.click();
  await expect(destructiveHeading).not.toBeVisible();
  expect(page.url()).toBe(projectsUrl);
});

test("project cards expose all three mockups through hover carousel controls", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set in .env.e2e.local");

  await signInFromLanding(page, email!, password!);
  await page.setViewportSize({ width: 1600, height: 1000 });

  const carousel = page
    .getByTestId("dashboard-project-card-shell")
    .filter({ has: page.locator('[data-thumbnail-count="3"]') })
    .first();
  expect(await carousel.count(), "authenticated E2E account must retain an A/B/C mockup").toBe(1);

  const card = carousel.getByTestId("dashboard-project-card");
  const thumbnail = card.locator('[data-thumbnail-count="3"]');
  const action = carousel.getByTestId("dashboard-project-card-actions");
  const actionLayer = action.locator("xpath=..");
  const previous = carousel.getByTestId("dashboard-project-card-previous");
  const next = carousel.getByTestId("dashboard-project-card-next");
  const dots = carousel.getByTestId("dashboard-project-card-dot");
  const projectsUrl = page.url();

  await page.mouse.move(0, 0);
  await expect(actionLayer).toHaveCSS("opacity", "0");
  await expect(next).toHaveCSS("opacity", "0");
  await expect(dots).toHaveCount(3);
  const dotMetrics = await dots.evaluateAll((buttons) => buttons.map((button) => {
    const targetBox = button.getBoundingClientRect();
    const visualBox = button.querySelector("span")!.getBoundingClientRect();
    return {
      targetWidth: targetBox.width,
      targetHeight: targetBox.height,
      visualWidth: visualBox.width,
      visualCenter: visualBox.x + visualBox.width / 2,
    };
  }));
  expect(dotMetrics.map(({ targetWidth, targetHeight }) => [targetWidth, targetHeight])).toEqual([
    [24, 24],
    [24, 24],
    [24, 24],
  ]);
  expect(dotMetrics.map(({ visualWidth }) => visualWidth)).toEqual([6, 6, 6]);
  expect(dotMetrics.slice(1).map(({ visualCenter }, index) =>
    visualCenter - dotMetrics[index].visualCenter,
  )).toEqual([12, 12]);
  await expect(dots.first()).toHaveAttribute("aria-current", "true");
  await expect(thumbnail).toHaveAttribute("data-thumbnail-active-label", "A");
  await expect(thumbnail).toHaveAttribute("data-thumbnail-state", "ready");

  await carousel.hover();
  await expect(actionLayer).toHaveCSS("opacity", "1");
  await expect(next).toHaveCSS("opacity", "1");
  await expect(previous).toHaveCSS("opacity", "0");

  await next.click();
  await expect(thumbnail).toHaveAttribute("data-thumbnail-active-label", "B");
  await expect(thumbnail).toHaveAttribute("data-thumbnail-state", "ready");
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
  await expect(previous).toHaveCSS("opacity", "1");

  await page.mouse.move(0, 0);
  await expect(actionLayer).toHaveCSS("opacity", "0");
  await expect(previous).toHaveCSS("opacity", "0");
  await expect(next).toHaveCSS("opacity", "0");

  await dots.nth(1).focus();
  await page.keyboard.press("ArrowRight");
  await expect(thumbnail).toHaveAttribute("data-thumbnail-active-label", "C");
  await expect(thumbnail).toHaveAttribute("data-thumbnail-state", "ready");
  await expect(dots.nth(2)).toBeFocused();
  await expect(next).toHaveCSS("opacity", "0");

  await dots.first().click();
  await expect(thumbnail).toHaveAttribute("data-thumbnail-active-label", "A");
  await expect(thumbnail).toHaveAttribute("data-thumbnail-state", "ready");
  expect(page.url()).toBe(projectsUrl);
});

test("project card overflow opens without touch tap-through", async ({ browser }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set in .env.e2e.local");

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await signInFromLanding(page, email!, password!);
    const projectsUrl = page.url();
    expect(await page.evaluate(() => matchMedia("(hover: none) and (any-hover: none)").matches)).toBe(true);

    const carousel = page
      .getByTestId("dashboard-project-card-shell")
      .filter({ has: page.locator('[data-thumbnail-count="3"]') })
      .first();
    expect(await carousel.count(), "touch carousel check needs an A/B/C mockup").toBe(1);
    const card = carousel.getByTestId("dashboard-project-card");
    const thumbnail = card.locator('[data-thumbnail-count="3"]');
    const details = card.getByTestId("dashboard-project-card-details");
    const action = carousel.getByTestId("dashboard-project-card-actions");
    const actionLayer = action.locator("xpath=..");
    const previous = carousel.getByTestId("dashboard-project-card-previous");
    const next = carousel.getByTestId("dashboard-project-card-next");
    const cdp = await context.newCDPSession(page);

    await expect(action).toBeVisible();
    await expect(actionLayer).toHaveCSS("opacity", "1");
    expect((await previous.boundingBox())?.width).toBe(1);
    expect((await next.boundingBox())?.width).toBe(1);
    await expect(thumbnail).toHaveAttribute("data-thumbnail-active-label", "A");

    const dispatchTouchSwipe = async ({
      startX,
      startY,
      endX,
      endY,
    }: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y: startY }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: (startX + endX) / 2, y: (startY + endY) / 2 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: endX, y: endY }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    };

    const mediaBox = await thumbnail.boundingBox();
    const detailsBox = await details.boundingBox();
    expect(mediaBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    const mediaY = mediaBox!.y + mediaBox!.height / 2;
    await dispatchTouchSwipe({
      startX: mediaBox!.x + mediaBox!.width - 10,
      startY: mediaY,
      endX: mediaBox!.x + 10,
      endY: mediaY,
    });
    await expect(thumbnail).toHaveAttribute("data-thumbnail-active-label", "B");
    await expect(thumbnail).toHaveAttribute("data-thumbnail-state", "ready");
    expect(page.url()).toBe(projectsUrl);

    await dispatchTouchSwipe({
      startX: mediaBox!.x + mediaBox!.width / 2,
      startY: mediaBox!.y + 60,
      endX: mediaBox!.x + mediaBox!.width / 2 + 10,
      endY: mediaBox!.y + 180,
    });
    await expect(thumbnail).toHaveAttribute("data-thumbnail-active-label", "B");

    await dispatchTouchSwipe({
      startX: detailsBox!.x + detailsBox!.width - 30,
      startY: detailsBox!.y + detailsBox!.height / 2,
      endX: detailsBox!.x + 30,
      endY: detailsBox!.y + detailsBox!.height / 2,
    });
    await expect(thumbnail).toHaveAttribute("data-thumbnail-active-label", "B");

    const expectedCardUrl = await card.getAttribute("href");
    expect(expectedCardUrl).toBeTruthy();
    await card.tap({ position: { x: 20, y: 450 } });
    await page.waitForURL((url) => url.pathname === new URL(expectedCardUrl!, projectsUrl).pathname);
    await page.goto(projectsUrl);

    await action.tap();
    await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).toBeVisible();
    expect(page.url()).toBe(projectsUrl);
  } finally {
    await context.close();
  }
});
