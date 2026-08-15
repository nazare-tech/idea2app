#!/usr/bin/env node

// Converts the deterministic Spectral Signal PNG sequence into square VP9
// production-sized WebM spinners with real alpha. The matte-removal formula reconstructs each
// foreground pixel from the known #3b3b3b stage instead of leaving dark halos.
// Usage: node scripts/export-spectral-signal-spinners.mjs <frame-dir> <output-dir>

import { spawn } from "node:child_process"
import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const SOURCE_FRAME_RATE = 60
const OUTPUT_FRAME_RATE = 30
const OUTPUT_FRAME_COUNT = 120
const SIZES = [64, 96, 128, 192, 256]
const MATTE_CHANNEL = 59
const CHANNEL_RANGE = 255 - MATTE_CHANNEL
const CROP = { width: 576, height: 576, x: 52, y: 68 }

const frameDirectory = path.resolve(process.argv[2] ?? "")
const outputDirectory = path.resolve(process.argv[3] ?? "")
const ffmpegBinary = process.env.FFMPEG_PATH ?? "ffmpeg"
const ffprobeBinary = process.env.FFPROBE_PATH ?? "ffprobe"

if (!process.argv[2] || !process.argv[3]) {
  throw new Error(
    "Usage: node scripts/export-spectral-signal-spinners.mjs <frame-dir> <output-dir>",
  )
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

async function capture(command, args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "inherit"] })
    let output = ""
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk) => { output += chunk })
    child.once("error", reject)
    child.once("exit", (code) => {
      if (code === 0) resolve(output)
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

async function prepareOutputDirectory(directory) {
  await mkdir(directory, { recursive: true })
  const entries = await readdir(directory)
  const expected = new Set(SIZES.map((size) => `spectral-spinner-${size}.webm`))
  const unexpected = entries.filter((entry) => !expected.has(entry))
  if (unexpected.length > 0) {
    throw new Error(`Refusing export directory with unexpected files: ${unexpected.join(", ")}`)
  }
  return new Set(entries)
}

function matteRemovalExpression(channel) {
  const red = `r(X,Y)-${MATTE_CHANNEL}`
  const green = `g(X,Y)-${MATTE_CHANNEL}`
  const blue = `b(X,Y)-${MATTE_CHANNEL}`
  const difference = `max(max(${red},${green}),${blue})`
  return `if(gt(${difference},0),clip(${MATTE_CHANNEL}+(${channel}(X,Y)-${MATTE_CHANNEL})*${CHANNEL_RANGE}/${difference},0,255),0)`
}

function alphaExpression() {
  const red = `r(X,Y)-${MATTE_CHANNEL}`
  const green = `g(X,Y)-${MATTE_CHANNEL}`
  const blue = `b(X,Y)-${MATTE_CHANNEL}`
  return `clip(255*max(max(${red},${green}),${blue})/${CHANNEL_RANGE},0,255)`
}

function videoFilter(size) {
  const geq = [
    `r='${matteRemovalExpression("r")}'`,
    `g='${matteRemovalExpression("g")}'`,
    `b='${matteRemovalExpression("b")}'`,
    `a='${alphaExpression()}'`,
  ].join(":")
  return [
    `crop=${CROP.width}:${CROP.height}:${CROP.x}:${CROP.y}`,
    `scale=${size}:${size}:flags=lanczos`,
    "format=rgba",
    `geq=${geq}`,
    `fps=${OUTPUT_FRAME_RATE}`,
    "format=yuva420p",
  ].join(",")
}

await run(ffmpegBinary, ["-version"], "ignore")
await run(ffprobeBinary, ["-version"], "ignore")
const existingArtifacts = await prepareOutputDirectory(outputDirectory)

const inputPattern = path.join(frameDirectory, "frame-%04d.png")
const artifacts = []

for (const size of SIZES) {
  const filename = `spectral-spinner-${size}.webm`
  const output = path.join(outputDirectory, filename)
  if (!existingArtifacts.has(filename)) {
    const quality = size >= 192 ? 30 : 32
    await run(ffmpegBinary, [
      "-n", "-hide_banner", "-loglevel", "error", "-framerate", String(SOURCE_FRAME_RATE),
      "-i", inputPattern, "-vf", videoFilter(size), "-frames:v", String(OUTPUT_FRAME_COUNT),
      "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(quality),
      "-deadline", "good", "-cpu-used", "2", "-row-mt", "1", "-auto-alt-ref", "0",
      "-pix_fmt", "yuva420p", "-metadata:s:v:0", "alpha_mode=1", output,
    ])
  }

  const probe = JSON.parse(await capture(ffprobeBinary, [
    "-v", "error", "-select_streams", "v:0", "-count_frames",
    "-show_entries", "stream=width,height,avg_frame_rate,nb_read_frames:stream_tags=alpha_mode:format=duration",
    "-of", "json", output,
  ]))
  const stream = probe.streams?.[0]
  const duration = Number(probe.format?.duration)
  if (
    stream?.width !== size ||
    stream?.height !== size ||
    stream?.avg_frame_rate !== "30/1" ||
    Number(stream?.nb_read_frames) !== OUTPUT_FRAME_COUNT ||
    (stream?.tags?.alpha_mode ?? stream?.tags?.ALPHA_MODE) !== "1" ||
    Math.abs(duration - 4) > 0.001
  ) {
    throw new Error(`Transparent WebM verification failed for ${filename}`)
  }
  artifacts.push({
    filename,
    width: size,
    height: size,
    duration,
    frameRate: OUTPUT_FRAME_RATE,
    frames: OUTPUT_FRAME_COUNT,
  })
}

const manifest = {
  exportedAt: new Date().toISOString(),
  sourceFrames: path.relative(process.cwd(), frameDirectory),
  sourceMatte: "#3b3b3b",
  matteReconstruction: "Additive emission; pixels darker than the source matte become transparent",
  crop: CROP,
  codec: "VP9 CRF 30–32 with WebM alpha_mode=1",
  pixelFormat: "yuva420p",
  artifacts,
}
await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: "wx" },
)

console.log(`Exported ${artifacts.length} transparent spinners to ${outputDirectory}`)
