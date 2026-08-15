#!/usr/bin/env node

// Captures the deterministic four-second Spectral Signal loop as exact PNG
// frames, a lossless WebM master, a color-faithful MP4, and a broadly
// compatible MP4 with one background row added for 4:2:0 encoding.
// Usage: node scripts/capture-spectral-signal.mjs <empty-output-directory>

import { spawn } from "node:child_process"
import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { chromium } from "@playwright/test"

const FRAME_RATE = 60
const DURATION_SECONDS = 4
const FRAME_COUNT = FRAME_RATE * DURATION_SECONDS
const PAGE_URL = "http://localhost:3000/dev/spectral-signal?capture=1"
const outputDirectory = path.resolve(process.argv[2] ?? "ui-evidence/spectral-signal-capture")
const ffmpegBinary = process.env.FFMPEG_PATH ?? "ffmpeg"

async function requireEmptyDirectory(directory) {
  await mkdir(directory, { recursive: true })
  const entries = await readdir(directory)
  if (entries.length > 0) {
    throw new Error(`Refusing to overwrite non-empty capture directory: ${directory}`)
  }
}

async function run(command, args, stdio = "inherit") {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio })
    child.once("error", reject)
    child.once("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

await run(ffmpegBinary, ["-version"], "ignore")
await requireEmptyDirectory(outputDirectory)

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
})

try {
  const page = await browser.newPage({ viewport: { width: 680, height: 711 }, deviceScaleFactor: 1 })
  await page.goto(PAGE_URL, { waitUntil: "networkidle" })
  const signal = page.getByTestId("spectral-signal")
  await signal.waitFor({ state: "visible" })
  await page.waitForFunction(() => (
    document.querySelector("[data-testid='spectral-signal']")?.getAttribute("data-renderer") === "webgl"
  ))

  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const seconds = frame / FRAME_RATE
    const pngDataUrl = await page.evaluate((seekSeconds) => {
      const canvas = document.querySelector("[data-testid='spectral-signal-canvas']")
      if (!canvas) throw new Error("Spectral signal canvas was not found")
      canvas.dispatchEvent(new CustomEvent("spectral-signal:seek", {
        detail: { seconds: seekSeconds },
      }))
      return canvas.toDataURL("image/png")
    }, seconds)
    const png = Buffer.from(pngDataUrl.replace(/^data:image\/png;base64,/, ""), "base64")
    await writeFile(
      path.join(outputDirectory, `frame-${String(frame).padStart(4, "0")}.png`),
      png,
      { flag: "wx" },
    )
  }
} finally {
  await browser.close()
}

const inputPattern = path.join(outputDirectory, "frame-%04d.png")
const losslessVideo = path.join(outputDirectory, "spectral-signal-lossless.webm")
const colorFaithfulVideo = path.join(outputDirectory, "spectral-signal-color-faithful.mp4")
const compatibleVideo = path.join(outputDirectory, "spectral-signal-compatible.mp4")

await run(ffmpegBinary, [
  "-n", "-hide_banner", "-loglevel", "error", "-framerate", String(FRAME_RATE),
  "-i", inputPattern, "-c:v", "libvpx-vp9", "-lossless", "1", "-pix_fmt", "gbrp",
  losslessVideo,
])
await run(ffmpegBinary, [
  "-n", "-hide_banner", "-loglevel", "error", "-framerate", String(FRAME_RATE),
  "-i", inputPattern, "-c:v", "libx264", "-crf", "10", "-preset", "slow",
  "-pix_fmt", "yuv444p", "-movflags", "+faststart", colorFaithfulVideo,
])
await run(ffmpegBinary, [
  "-n", "-hide_banner", "-loglevel", "error", "-framerate", String(FRAME_RATE),
  "-i", inputPattern, "-vf", "pad=680:712:0:0:color=#3b3b3b", "-c:v", "libx264",
  "-crf", "10", "-preset", "slow", "-pix_fmt", "yuv420p", "-x264-params",
  "colorprim=bt709:transfer=bt709:colormatrix=bt709", "-movflags", "+faststart", compatibleVideo,
])

const manifest = {
  capturedAt: new Date().toISOString(),
  pageUrl: PAGE_URL,
  renderer: "Playwright Chromium headless with SwiftShader",
  viewport: { width: 680, height: 711, deviceScaleFactor: 1 },
  frameRate: FRAME_RATE,
  durationSeconds: DURATION_SECONDS,
  frameCount: FRAME_COUNT,
  frameTimestamps: "n / 60 seconds for n = 0...239",
  artifacts: {
    pngFrames: "frame-0000.png...frame-0239.png (680x711 RGBA)",
    losslessVideo: path.basename(losslessVideo),
    colorFaithfulVideo: path.basename(colorFaithfulVideo),
    compatibleVideo: `${path.basename(compatibleVideo)} (680x712; one #3b3b3b row added; BT.709 tags)`,
  },
}
await writeFile(
  path.join(outputDirectory, "capture-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: "wx" },
)

console.log(`Captured ${FRAME_COUNT} exact PNG frames at ${FRAME_RATE} fps in ${outputDirectory}`)
console.log(`Lossless master: ${losslessVideo}`)
console.log(`Color-faithful MP4: ${colorFaithfulVideo}`)
console.log(`Compatible padded MP4: ${compatibleVideo}`)
