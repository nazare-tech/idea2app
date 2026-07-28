#!/usr/bin/env node

/**
 * Converts the ten image-editor chroma-key hero phones into normalized RGBA
 * landing assets. Requires ImageMagick 7 (`magick`).
 *
 * Usage:
 *   node scripts/normalize-hero-reel-cutouts.mjs \
 *     --input-dir tmp/imagegen/hero-reel-cutouts/chroma \
 *     --output-dir public/landing/hero-reel
 *
 * The script refuses to overwrite output files. It removes only chroma that is
 * connected to the canvas edge, keeping similarly colored pixels inside each
 * phone fully opaque.
 */

import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"
import { execFileSync } from "node:child_process"

const SCREEN_SLUGS = [
  "cropscout-c1",
  "evidencedeck-b1",
  "fieldscribe-b1",
  "kinship-cards-c1",
  "mentorloop-c1",
  "releaserelay-b2",
  "returnreason-c1",
  "scopesignal-a1",
  "signalledger-a2",
  "venueturn-c2",
]

const CANVAS_WIDTH = 576
const CANVAS_HEIGHT = 1008
const DEVICE_HEIGHT = 880
const DEVICE_TOP = 28
const FLOOD_FUZZ = "35%"
const MAX_INPUT_BYTES = 30 * 1024 * 1024
const MAX_INPUT_DIMENSION = 6000
const MAX_INPUT_PIXELS = 25_000_000
const MAGICK_TIMEOUT_MS = 120_000
const MAGICK_LIMITS = [
  "-limit",
  "memory",
  "512MiB",
  "-limit",
  "map",
  "1GiB",
  "-limit",
  "disk",
  "2GiB",
  "-limit",
  "thread",
  "2",
  "-limit",
  "time",
  "120",
]

function printHelp() {
  console.log(`Normalize Maker Compass landing hero phone cutouts.

Usage:
  node scripts/normalize-hero-reel-cutouts.mjs --input-dir <dir> --output-dir <dir>

Inputs:
  <input-dir>/<screen-slug>.png for the ten shortlisted hero screens.

Outputs:
  <output-dir>/<screen-slug>-cutout.png

Requirements:
  ImageMagick 7 available as "magick".

Safety:
  Inputs and ImageMagick resources are bounded.
  Existing outputs are never overwritten.
  A failed publication removes only outputs created by that attempt.`)
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp()
    process.exit(0)
  }

  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith("--") || !value) {
      throw new Error(`Invalid argument near "${key ?? ""}". Run with --help.`)
    }
    values.set(key, value)
  }

  const inputDir = values.get("--input-dir")
  const outputDir = values.get("--output-dir")
  if (!inputDir || !outputDir) {
    throw new Error("--input-dir and --output-dir are required.")
  }

  return {
    inputDir: resolve(inputDir),
    outputDir: resolve(outputDir),
  }
}

function addMagickLimits(args) {
  if (args[0] === "-version") return args
  if (args[0] === "identify") {
    return ["identify", ...MAGICK_LIMITS, ...args.slice(1)]
  }
  return [...MAGICK_LIMITS, ...args]
}

function magick(args) {
  return execFileSync("magick", addMagickLimits(args), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: MAGICK_TIMEOUT_MS,
    maxBuffer: 2 * 1024 * 1024,
  }).trim()
}

function getTrimmedSize(path) {
  const value = magick([
    path,
    "-alpha",
    "extract",
    "-threshold",
    "50%",
    "-trim",
    "-format",
    "%w %h",
    "info:",
  ])
  const [width, height] = value.split(/\s+/).map(Number)
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Could not measure alpha bounds for ${path}`)
  }
  return { width, height }
}

function validateInputs(inputDir, outputDir) {
  accessSync(inputDir, constants.R_OK)

  const entries = SCREEN_SLUGS.map((slug) => ({
    slug,
    input: join(inputDir, `${slug}.png`),
    output: join(outputDir, `${slug}-cutout.png`),
  }))

  for (const entry of entries) {
    accessSync(entry.input, constants.R_OK)
    const stats = statSync(entry.input)
    if (!stats.isFile() || stats.size > MAX_INPUT_BYTES) {
      throw new Error(`Input is not a bounded regular file: ${entry.input}`)
    }
    const [width, height] = magick([
      "identify",
      "-ping",
      "-format",
      "%w %h",
      entry.input,
    ])
      .split(/\s+/)
      .map(Number)
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 256 ||
      height < 256 ||
      width > MAX_INPUT_DIMENSION ||
      height > MAX_INPUT_DIMENSION ||
      width * height > MAX_INPUT_PIXELS
    ) {
      throw new Error(`Input dimensions are outside safe bounds: ${entry.input}`)
    }
    if (existsSync(entry.output)) {
      throw new Error(`Refusing to overwrite existing output: ${entry.output}`)
    }
  }

  return entries
}

function removeConnectedChroma(input, keyedOutput) {
  const keyColor = magick(["identify", "-format", "%[pixel:p{0,0}]", input])

  magick([
    input,
    "-alpha",
    "on",
    "-bordercolor",
    keyColor,
    "-border",
    "1",
    "-fuzz",
    FLOOD_FUZZ,
    "-fill",
    "none",
    "-draw",
    "color 0,0 floodfill",
    "-shave",
    "1x1",
    "-background",
    "black",
    "-alpha",
    "background",
    keyedOutput,
  ])
}

function normalizeCutout(keyedInput, normalizedOutput) {
  magick([
    "-size",
    `${CANVAS_WIDTH}x${CANVAS_HEIGHT}`,
    "canvas:none",
    "(",
    keyedInput,
    "-trim",
    "+repage",
    "-resize",
    `x${DEVICE_HEIGHT}`,
    ")",
    "-gravity",
    "north",
    "-geometry",
    `+0+${DEVICE_TOP}`,
    "-compose",
    "over",
    "-composite",
    "-channel",
    "RGB",
    "-fx",
    "u.a<0.999?0:u",
    "+channel",
    "-strip",
    "-depth",
    "8",
    "-define",
    "png:color-type=6",
    normalizedOutput,
  ])
}

function validateOutput(path) {
  const dimensions = magick(["identify", "-format", "%w|%h|%[channels]|%z", path])
  const [width, height, channels, depth] = dimensions.split("|")
  const alphaAtCorners = magick([
    path,
    "-format",
    "%[fx:p{0,0}.a] %[fx:p{575,0}.a] %[fx:p{0,1007}.a] %[fx:p{575,1007}.a]",
    "info:",
  ])
  const body = getTrimmedSize(path)

  if (
    Number(width) !== CANVAS_WIDTH ||
    Number(height) !== CANVAS_HEIGHT ||
    !channels.includes("a") ||
    Number(depth) !== 8
  ) {
    throw new Error(`Unexpected PNG contract for ${path}: ${dimensions}`)
  }
  if (alphaAtCorners !== "0 0 0 0") {
    throw new Error(`Canvas corners are not transparent for ${path}: ${alphaAtCorners}`)
  }
  if (Math.abs(body.height - DEVICE_HEIGHT) > 1) {
    throw new Error(`Unexpected device height for ${path}: ${body.height}px`)
  }

  return body
}

function main() {
  const { inputDir, outputDir } = parseArgs(process.argv.slice(2))

  try {
    magick(["-version"])
  } catch {
    throw new Error('ImageMagick 7 is required and must be available as "magick".')
  }

  mkdirSync(outputDir, { recursive: true })
  const entries = validateInputs(inputDir, outputDir)
  const workingDir = mkdtempSync(join(tmpdir(), "maker-compass-hero-cutouts-"))

  try {
    const completed = []

    for (const entry of entries) {
      const keyed = join(workingDir, `${entry.slug}-keyed.png`)
      const normalized = join(workingDir, `${entry.slug}-cutout.png`)

      removeConnectedChroma(entry.input, keyed)
      const keyedBody = getTrimmedSize(keyed)
      if (keyedBody.width < 300 || keyedBody.height < 700) {
        throw new Error(
          `Foreground extraction looks invalid for ${entry.input}: ` +
            `${keyedBody.width}x${keyedBody.height}`,
        )
      }

      normalizeCutout(keyed, normalized)
      const body = validateOutput(normalized)
      completed.push({ ...entry, normalized, body })
    }

    const published = []
    try {
      for (const entry of completed) {
        copyFileSync(entry.normalized, entry.output, constants.COPYFILE_EXCL)
        published.push(entry.output)
        console.log(
          `${basename(entry.output)}: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}, ` +
            `device ${entry.body.width}x${entry.body.height}`,
        )
      }
    } catch (error) {
      for (const output of published) {
        rmSync(output, { force: true })
      }
      throw error
    }
  } finally {
    rmSync(workingDir, { recursive: true, force: true })
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
