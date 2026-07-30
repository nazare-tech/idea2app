/**
 * Deterministic iOS home indicator stamping for generated native-mobile mockups.
 *
 * Why post-generation: mockup generation is an image edit, so the model repaints every
 * pixel. A home indicator baked into the skeleton came back at inconsistent heights and
 * positions because the model redraws it approximately. iOS itself treats the indicator
 * as a system overlay on top of app content, so the faithful fix is the same move: the
 * prompt reserves the bottom safe area, and the exact bar is composited onto the
 * generated image afterward, anchored to the frame's detected bottom outline (the model
 * can drift the frame a few percent from the skeleton position).
 *
 * The bar color adapts per frame the way the OS does: near-black on light surfaces,
 * near-white on dark ones, decided by sampling the generated pixels under the bar.
 */

import sharp from "sharp"

/** Skeleton canvas the fractions below are measured against (native-mobile grey). */
const SKELETON = { width: 2760, height: 2030 }

/**
 * Frame interiors measured from the skeleton's placeholder fill: x-bands
 * [349, 1071] and [1562, 2284], interior bottom edge y=1849.
 */
const FRAME_INTERIORS = [
  { x0: 349, x1: 1071, bottom: 1849 },
  { x0: 1562, x1: 2284, bottom: 1849 },
]

/** Real iPhone logical points: 393pt-wide device, 134x5pt bar, 8pt above the bottom. */
const IPHONE_POINT_WIDTH = 393
const INDICATOR_PT = { width: 134, height: 5, bottomGap: 8 }

const LIGHT_BAR = "#f5f5f5"
const DARK_BAR = "#141414"

interface StampBar {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Finds the frame's real interior bottom in the generated image. The model can drift the
 * phone frame a few percent from the skeleton position; a stamp at fixed coordinates then
 * lands on the black device border (observed as a white bar breaking the outline). The
 * device border is the strongest horizontal dark line in the band, so we search a window
 * around the expected bottom for the topmost row of that line and place the bar above it.
 * Falls back to the skeleton-scaled position when no line is found.
 */
function detectInteriorBottom(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  bandX0: number,
  bandX1: number,
  expectedBottom: number,
) {
  const searchTop = Math.max(0, Math.round(expectedBottom - info.height * 0.08))
  const searchBottom = Math.min(info.height - 1, Math.round(expectedBottom + info.height * 0.04))
  // Sample the middle half of the band so the frame's rounded corners do not dilute rows.
  const x0 = Math.round(bandX0 + (bandX1 - bandX0) * 0.25)
  const x1 = Math.round(bandX0 + (bandX1 - bandX0) * 0.75)

  const isDarkRow = (y: number) => {
    let dark = 0
    for (let x = x0; x < x1; x++) {
      const index = (y * info.width + x) * info.channels
      const lum = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
      if (lum < 80) dark++
    }
    return dark / (x1 - x0) > 0.6
  }

  // Scan bottom-up: below the frame is always the white storyboard canvas, so the first
  // dark row from below is unambiguously the border's bottom edge. A top-down scan would
  // mistake a dark-mode interior or a dark footer inside the window for the border.
  let borderBottom: number | null = null
  for (let y = searchBottom; y >= searchTop; y--) {
    if (isDarkRow(y)) {
      borderBottom = y
      break
    }
  }
  if (borderBottom === null) return Math.round(expectedBottom)

  // Walk up through the border. Its thickness is bounded; if the dark run continues past
  // the cap (a dark interior touching the border), stop there so the bar still lands
  // inside the frame instead of drifting upward.
  const maxBorderThickness = Math.max(6, Math.round(info.height * 0.02))
  let outlineTop = borderBottom
  while (outlineTop > searchTop && borderBottom - outlineTop < maxBorderThickness && isDarkRow(outlineTop - 1)) {
    outlineTop--
  }

  return outlineTop - 1
}

function computeBars(
  data: Buffer,
  info: { width: number; height: number; channels: number },
): StampBar[] {
  return FRAME_INTERIORS.map((frame) => {
    const scaleX = info.width / SKELETON.width
    const scaleY = info.height / SKELETON.height
    const frameWidth = (frame.x1 - frame.x0) * scaleX
    const pointScale = frameWidth / IPHONE_POINT_WIDTH

    const width = Math.max(24, Math.round(INDICATOR_PT.width * pointScale))
    const height = Math.max(4, Math.round(INDICATOR_PT.height * pointScale))
    const centerX = ((frame.x0 + frame.x1) / 2) * scaleX
    const bottom = detectInteriorBottom(
      data,
      info,
      frame.x0 * scaleX,
      frame.x1 * scaleX,
      frame.bottom * scaleY,
    )

    return {
      left: Math.round(centerX - width / 2),
      top: Math.round(bottom - INDICATOR_PT.bottomGap * pointScale - height),
      width,
      height,
    }
  })
}

/** Mean luminance (0-255) of the region a bar will cover, from raw RGBA pixels. */
function regionLuminance(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  bar: StampBar,
) {
  let sum = 0
  let count = 0
  const x1 = Math.min(info.width, bar.left + bar.width)
  const y1 = Math.min(info.height, bar.top + bar.height)
  for (let y = Math.max(0, bar.top); y < y1; y++) {
    for (let x = Math.max(0, bar.left); x < x1; x++) {
      const index = (y * info.width + x) * info.channels
      sum += 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
      count++
    }
  }
  return count > 0 ? sum / count : 255
}

/**
 * Composites the two home indicator bars onto a generated native-mobile storyboard.
 * Returns a new PNG buffer; the input buffer is not modified. The Buffer<ArrayBuffer>
 * return type matches what Buffer.from produces, which callers holding buffers from
 * parseImageDataUrl assign back into.
 */
export async function stampMockupHomeIndicator(imageBuffer: Buffer): Promise<Buffer<ArrayBuffer>> {
  const image = sharp(imageBuffer)
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const bars = computeBars(data, info)

  const rects = bars
    .map((bar) => {
      const fill = regionLuminance(data, info, bar) < 128 ? LIGHT_BAR : DARK_BAR
      const radius = bar.height / 2
      return `<rect x="${bar.left}" y="${bar.top}" width="${bar.width}" height="${bar.height}" rx="${radius}" fill="${fill}"/>`
    })
    .join("")

  const overlay = Buffer.from(
    `<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`,
  )

  const stamped = await sharp(imageBuffer).composite([{ input: overlay }]).png().toBuffer()
  // Re-wrap so the result is backed by a plain ArrayBuffer, matching the buffers the
  // pipeline gets from parseImageDataUrl (sharp may return an ArrayBufferLike backing).
  return Buffer.from(stamped)
}
