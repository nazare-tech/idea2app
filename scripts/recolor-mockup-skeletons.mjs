#!/usr/bin/env node
/**
 * Recolors the mockup storyboard skeleton placeholders from saturated indigo to a
 * neutral grey.
 *
 * Why this exists: mockup generation is an image *edit* call. The skeleton PNG is
 * attached as the source image, and its placeholder fill is rgb(42,32,147) covering
 * ~63% of every pixel in the canvas. That dominant color anchors the model's output,
 * which is a large part of why every generated mockup came back blue/green regardless
 * of the product. A hue-free placeholder removes the anchor so the palette specified
 * in the prompt is the only color signal.
 *
 * The placeholder is a flat fill, so no image model is needed. This walks the raw
 * pixels and swaps the fill directly.
 *
 * Anti-aliased edge pixels along the frame border are a blend of the indigo fill and
 * whatever sits behind it (white canvas or black frame chrome). We recover that blend
 * factor per pixel and re-blend against the new grey, so edges stay clean instead of
 * developing a blue fringe.
 *
 * Usage:
 *   node scripts/recolor-mockup-skeletons.mjs                    # write in place
 *   node scripts/recolor-mockup-skeletons.mjs --grey 200,200,200 # try another target
 *   node scripts/recolor-mockup-skeletons.mjs --suffix -grey     # write copies instead
 *
 * The originals are tracked in git, so `git checkout public/mockups/skeletons` undoes
 * an in-place run.
 */

import { readdir } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const SKELETON_DIR = "public/mockups/skeletons"

/** The existing placeholder fill, measured from the committed PNGs. */
const SOURCE_FILL = { r: 42, g: 32, b: 147 }

/**
 * Neutral replacement. Zero chroma is deliberate here: this is a placeholder the model
 * must paint over, not a designed surface, so we want it to contribute no hue at all.
 * (Inside a real UI, `impeccable` is right that pure grey is dead and neutrals should
 * carry a slight tint. That rule applies to the generated interior, not to this input.)
 */
const DEFAULT_TARGET_FILL = { r: 212, g: 212, b: 212 }

/**
 * How blue a pixel must be before we treat it as part of the placeholder rather than
 * part of the frame chrome. The browser chrome contains near-neutral darks and the
 * traffic-light dots, none of which reach this threshold.
 */
const BLUENESS_FLOOR = 8

const sourceBlueness = SOURCE_FILL.b - Math.max(SOURCE_FILL.r, SOURCE_FILL.g)

function parseArgs(argv) {
  const args = { grey: DEFAULT_TARGET_FILL, suffix: "" }

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--grey" && argv[i + 1]) {
      const [r, g, b] = argv[++i].split(",").map(Number)
      if ([r, g, b].some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
        throw new Error("--grey expects three 0-255 integers, e.g. --grey 212,212,212")
      }
      args.grey = { r, g, b }
    } else if (argv[i] === "--suffix" && argv[i + 1]) {
      args.suffix = argv[++i]
    }
  }

  return args
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/**
 * Replaces the indigo placeholder with `target`, preserving anti-aliased edges.
 *
 * For an edge pixel P we assume P = t * fill + (1 - t) * background, where t is how much
 * of the placeholder is present. We estimate t from how blue the pixel is, solve for the
 * hidden background, then recompose against the new fill.
 */
function recolorPixels(data, channels, target) {
  let replaced = 0

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const blueness = b - Math.max(r, g)
    if (blueness <= BLUENESS_FLOOR) continue

    const t = Math.min(1, blueness / sourceBlueness)

    if (t >= 0.999) {
      data[i] = target.r
      data[i + 1] = target.g
      data[i + 2] = target.b
      replaced++
      continue
    }

    // Recover the background this edge pixel was blended against, then re-blend.
    const inverse = 1 - t
    const backgroundR = (r - t * SOURCE_FILL.r) / inverse
    const backgroundG = (g - t * SOURCE_FILL.g) / inverse
    const backgroundB = (b - t * SOURCE_FILL.b) / inverse

    data[i] = clampChannel(t * target.r + inverse * backgroundR)
    data[i + 1] = clampChannel(t * target.g + inverse * backgroundG)
    data[i + 2] = clampChannel(t * target.b + inverse * backgroundB)
    replaced++
  }

  return replaced
}

async function recolorFile(filePath, target, suffix) {
  const { data, info } = await sharp(filePath)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const replaced = recolorPixels(data, info.channels, target)
  const totalPixels = info.width * info.height

  const outputPath = suffix
    ? filePath.replace(/\.png$/, `${suffix}.png`)
    : filePath

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toFile(outputPath)

  return {
    outputPath,
    percentReplaced: (100 * replaced) / totalPixels,
  }
}

async function main() {
  const { grey, suffix } = parseArgs(process.argv.slice(2))

  const entries = await readdir(SKELETON_DIR)
  const skeletons = entries
    .filter((name) => name.endsWith(".png") && !name.includes("-grey"))
    .sort()

  if (skeletons.length === 0) {
    throw new Error(`no skeleton PNGs found in ${SKELETON_DIR}`)
  }

  const targetHex = `#${[grey.r, grey.g, grey.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`
  console.log(`Replacing rgb(42,32,147) placeholder with ${targetHex}\n`)

  for (const name of skeletons) {
    const { outputPath, percentReplaced } = await recolorFile(
      path.join(SKELETON_DIR, name),
      grey,
      suffix,
    )
    console.log(`  ${outputPath}  (${percentReplaced.toFixed(1)}% of pixels recolored)`)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
