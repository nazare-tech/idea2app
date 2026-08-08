/**
 * The brand bearing-wedge geometry, extracted from the 2026-07-30 brand kit's
 * `logo/symbol/geometry.json` (a compass needle rotated 32° off vertical with
 * a notched tail). Single source of truth for every renderer: the SVG brand
 * mark (`compass-mark.tsx`) and the canvas hero dot field both consume these
 * points, so the shapes cannot drift apart.
 *
 * Points live in the kit's 1024x1024 viewBox. The first point is the needle
 * tip; the remaining three form the notched tail.
 */
export const COMPASS_WEDGE_VIEWBOX = 1024

export const COMPASS_WEDGE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [843.88, 71.68],
  [552.47, 952.32],
  [445.89, 708.6],
  [180.12, 719.65],
]

/** Centroid of the wedge polygon, in viewBox units. Rotation pivot. */
export const COMPASS_WEDGE_CENTROID: readonly [number, number] = (() => {
  let cx = 0
  let cy = 0
  for (const [x, y] of COMPASS_WEDGE_POINTS) {
    cx += x
    cy += y
  }
  const n = COMPASS_WEDGE_POINTS.length
  return [cx / n, cy / n] as const
})()

/**
 * Angle (radians, screen coordinates: +y is down) from the centroid to the
 * needle tip. A renderer that wants the needle to point along direction θ
 * rotates the raw geometry by `θ - COMPASS_WEDGE_TIP_ANGLE`.
 */
export const COMPASS_WEDGE_TIP_ANGLE = Math.atan2(
  COMPASS_WEDGE_POINTS[0][1] - COMPASS_WEDGE_CENTROID[1],
  COMPASS_WEDGE_POINTS[0][0] - COMPASS_WEDGE_CENTROID[0]
)

/** SVG path `d` string for the wedge in its native 1024 viewBox. */
export function compassWedgePathD(): string {
  const [first, ...rest] = COMPASS_WEDGE_POINTS
  return (
    `M ${first[0]} ${first[1]} ` +
    rest.map(([x, y]) => `L ${x} ${y}`).join(" ") +
    " Z"
  )
}

/** Minimal path sink shared by CanvasRenderingContext2D and Path2D. */
export interface WedgePathSink {
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  closePath(): void
}

/**
 * Trace the wedge into a canvas-style path, centered on its centroid and
 * scaled so its longest span equals `size` pixels. Callers apply their own
 * translate/rotate transforms around the origin.
 */
export function traceCompassWedge(sink: WedgePathSink, size: number): void {
  const [cx, cy] = COMPASS_WEDGE_CENTROID
  // Longest span of the centered polygon, for normalization.
  let maxR = 0
  for (const [x, y] of COMPASS_WEDGE_POINTS) {
    maxR = Math.max(maxR, Math.hypot(x - cx, y - cy))
  }
  const s = size / (maxR * 2)
  COMPASS_WEDGE_POINTS.forEach(([x, y], i) => {
    const px = (x - cx) * s
    const py = (y - cy) * s
    if (i === 0) sink.moveTo(px, py)
    else sink.lineTo(px, py)
  })
  sink.closePath()
}
