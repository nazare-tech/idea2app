import { expect, test } from "@playwright/test"

test("spectral signal fits short viewports and preserves its renderer fallback", async ({ page }) => {
  await page.goto("/dev/spectral-signal")

  const signal = page.getByTestId("spectral-signal")
  const canvas = page.getByTestId("spectral-signal-canvas")
  await expect(signal).toBeVisible()

  await page.setViewportSize({ width: 844, height: 390 })
  const stageBox = await canvas.boundingBox()
  expect(stageBox).not.toBeNull()
  expect(stageBox!.width).toBeLessThanOrEqual(844)
  expect(stageBox!.height).toBeLessThanOrEqual(390)
  expect(Math.abs(stageBox!.width / stageBox!.height - 680 / 711)).toBeLessThan(0.01)

  if ((await signal.getAttribute("data-renderer")) === "webgl") {
    await canvas.dispatchEvent("webglcontextlost")
    await expect(signal).toHaveAttribute("data-renderer", "fallback")
    await expect(signal).toHaveAttribute("data-animation-state", "stopped")
  } else {
    await expect(signal).toHaveAttribute("data-renderer", "fallback")
    await expect(signal).toHaveAttribute("data-animation-state", "stopped")
  }
})

test("spectral signal honors reduced motion without starting WebGL", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/dev/spectral-signal")

  const signal = page.getByTestId("spectral-signal")
  await expect(signal).toHaveAttribute("data-renderer", "fallback")
  await expect(signal).toHaveAttribute("data-animation-state", "stopped")
  await expect(page.getByTestId("spectral-signal-canvas")).toHaveCSS("opacity", "0")
})

test("capture mode seeks the exact canvas without running the live clock", async ({ page }) => {
  await page.goto("/dev/spectral-signal?capture=1")

  const signal = page.getByTestId("spectral-signal")
  const canvas = page.getByTestId("spectral-signal-canvas")
  await expect(signal).toHaveAttribute("data-capture-mode", "true")
  await expect(signal).toHaveAttribute("data-animation-state", "stopped")
  test.skip(
    (await signal.getAttribute("data-renderer")) !== "webgl",
    "The default browser project does not expose the required half-float WebGL2 extension",
  )
  await expect(signal).toHaveAttribute("data-renderer", "webgl")
  await expect(canvas).toHaveAttribute("data-rendered-time", "0.0000")
  await expect(canvas).toHaveAttribute("width", "680")
  await expect(canvas).toHaveAttribute("height", "711")
  const originFrame = await canvas.getAttribute("data-frame-png")

  const seek = (seconds: number) => page.evaluate((seekSeconds) => {
    document.querySelector("[data-testid='spectral-signal-canvas']")?.dispatchEvent(
      new CustomEvent("spectral-signal:seek", { detail: { seconds: seekSeconds } }),
    )
  }, seconds)
  await seek(1.25)
  await expect(canvas).toHaveAttribute("data-rendered-time", "1.2500")
  const movedFrame = await canvas.getAttribute("data-frame-png")
  expect(movedFrame).not.toBe(originFrame)

  await seek(1.25)
  expect(await canvas.getAttribute("data-frame-png")).toBe(movedFrame)
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  await expect(canvas).toHaveAttribute("data-rendered-time", "1.2500")
})
