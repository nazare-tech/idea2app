#!/usr/bin/env node
/**
 * Bakes an iOS home indicator into the grey native-mobile storyboard skeleton.
 *
 * Why: generated mobile mockups were placing interactive elements (buttons, tab bars)
 * flush against the bottom edge of the phone frame, ignoring the bottom safe-area inset
 * entirely, because nothing in the skeleton marked it. A baked black indicator bar gives
 * the image model a fixed piece of device chrome to preserve, and the prompt then tells
 * it to keep that zone free of interactive elements while matching the surface color
 * behind it.
 *
 * Geometry is detected, not hardcoded: the script finds the grey placeholder interiors
 * and derives the bar from real iOS proportions (134x5pt indicator, 8pt above the frame
 * bottom, at the interior's px-per-pt scale). Safe to re-run: existing bars simply get
 * repainted in place.
 *
 * Usage:
 *   node scripts/add-mobile-home-indicator.mjs [--file <skeleton.png>]
 */

import sharp from "sharp"

const DEFAULT_FILE = "public/mockups/skeletons/native-mobile-app-storyboard-skeleton-grey.png"

/** The grey placeholder fill written by recolor-mockup-skeletons.mjs. */
const PLACEHOLDER = { r: 212, g: 212, b: 212 }

/** iPhone logical points: indicator size, corner radius, and gap above the frame bottom. */
const IPHONE_POINT_WIDTH = 393
const INDICATOR_PT = { width: 134, height: 5, radius: 2.5, bottomGap: 8 }

const USAGE = `Usage: node scripts/add-mobile-home-indicator.mjs [--file <skeleton.png>]

Bakes an iOS home indicator into the grey native-mobile storyboard skeleton
(default: ${DEFAULT_FILE}). Edits the file in place; idempotent. The original
indigo skeletons are never touched.`

function parseArgs(argv) {
  const args = { file: DEFAULT_FILE, help: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file" && argv[i + 1]) args.file = argv[++i]
    else if (argv[i] === "--help" || argv[i] === "-h") args.help = true
    else throw new Error(`Unknown argument: ${argv[i]}\n${USAGE}`)
  }
  return args
}

/** Finds contiguous column bands where the placeholder fill dominates. */
function findInteriors(data, info) {
  const { width, height, channels } = info
  const isPlaceholder = (index) =>
    data[index] === PLACEHOLDER.r && data[index + 1] === PLACEHOLDER.g && data[index + 2] === PLACEHOLDER.b

  const columnHits = new Array(width).fill(0)
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x++) {
      if (isPlaceholder((y * width + x) * channels)) columnHits[x]++
    }
  }

  const bands = []
  let start = null
  for (let x = 0; x < width; x++) {
    if (columnHits[x] > 20) {
      if (start === null) start = x
    } else if (start !== null) {
      bands.push([start, x - 1])
      start = null
    }
  }
  if (start !== null) bands.push([start, width - 1])

  return bands.map(([x0, x1]) => {
    const centerX = Math.round((x0 + x1) / 2)
    let top = null
    let bottom = null
    for (let y = 0; y < height; y++) {
      if (isPlaceholder((y * width + centerX) * channels)) {
        if (top === null) top = y
        bottom = y
      }
    }
    return { x0, x1, top, bottom, width: x1 - x0 + 1 }
  })
}

async function main() {
  const { file, help } = parseArgs(process.argv.slice(2))
  if (help) {
    console.log(USAGE)
    return
  }

  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  const interiors = findInteriors(data, info)
  if (interiors.length === 0) throw new Error(`No placeholder interiors found in ${file}`)

  const bars = interiors.map((interior) => {
    const scale = interior.width / IPHONE_POINT_WIDTH
    const barWidth = Math.round(INDICATOR_PT.width * scale)
    const barHeight = Math.max(6, Math.round(INDICATOR_PT.height * scale))
    const radius = barHeight / 2
    const x = Math.round((interior.x0 + interior.x1) / 2 - barWidth / 2)
    const y = Math.round(interior.bottom - INDICATOR_PT.bottomGap * scale - barHeight)
    return { x, y, barWidth, barHeight, radius }
  })

  const svg = `<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg">${bars
    .map((bar) => `<rect x="${bar.x}" y="${bar.y}" width="${bar.barWidth}" height="${bar.barHeight}" rx="${bar.radius}" fill="#111111"/>`)
    .join("")}</svg>`

  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toFile(`${file}.tmp`)

  const { renameSync } = await import("node:fs")
  renameSync(`${file}.tmp`, file)

  for (const bar of bars) {
    console.log(`indicator ${bar.barWidth}x${bar.barHeight} at (${bar.x}, ${bar.y})`)
  }
  console.log(`${file} updated (${interiors.length} frames)`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
