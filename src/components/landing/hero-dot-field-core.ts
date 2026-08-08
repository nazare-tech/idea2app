/**
 * Pure logic for the landing dot field: deterministic lattice/cluster layout,
 * wedge-site selection, angle damping, and protected-zone alpha falloffs. No
 * DOM or canvas access, so everything here is unit tested;
 * `hero-dot-field.tsx` owns rendering and lifecycle.
 *
 * Reference look (docs/plans/hero-dot-field-cursor-compass-plan.md): a static
 * dot lattice arranged in irregular map-like clusters.
 */

export interface FieldDot {
  x: number
  y: number
  col: number
  row: number
}

export interface DotField {
  dots: FieldDot[]
  /** Indices into `dots` that render as micro compass wedges. */
  wedgeIndices: number[]
  cols: number
  rows: number
  pitch: number
}

/** mulberry32: tiny deterministic PRNG, returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Integer-lattice hash noise in [0, 1), deterministic per (seed, x, y). */
function hashNoise(seed: number, x: number, y: number): number {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smoothly interpolated 2D value noise in [0, 1). `x`/`y` in cell units. */
export function valueNoise(seed: number, x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const n00 = hashNoise(seed, xi, yi)
  const n10 = hashNoise(seed, xi + 1, yi)
  const n01 = hashNoise(seed, xi, yi + 1)
  const n11 = hashNoise(seed, xi + 1, yi + 1)
  const nx0 = n00 + (n10 - n00) * sx
  const nx1 = n01 + (n11 - n01) * sx
  return nx0 + (nx1 - nx0) * sy
}

export interface BuildFieldOptions {
  width: number
  height: number
  pitch: number
  seed: number
  /** Roughly one wedge per this many cluster dots. */
  wedgeRatio?: number
  /** Minimum pixel distance between wedge sites. */
  wedgeSpacing?: number
  /** Hard cap on wedge count. */
  wedgeMax?: number
}

/**
 * Build the deterministic dot layout: lattice cells kept where two octaves of
 * value noise exceed a threshold, which yields the reference video's
 * irregular landmass clusters with large empty gaps.
 */
export function buildField(options: BuildFieldOptions): DotField {
  const { width, height, pitch, seed } = options
  const wedgeRatio = options.wedgeRatio ?? 40
  const wedgeSpacing = options.wedgeSpacing ?? 120
  const wedgeMax = options.wedgeMax ?? 20

  const cols = Math.max(0, Math.floor(width / pitch))
  const rows = Math.max(0, Math.floor(height / pitch))
  // Center the lattice inside the box.
  const ox = (width - (cols - 1) * pitch) / 2
  const oy = (height - (rows - 1) * pitch) / 2

  const dots: FieldDot[] = []
  // Cluster frequency: one noise cell spans ~7 lattice cells, matching the
  // reference's blob scale relative to dot pitch.
  const freq = 1 / 7
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const n =
        valueNoise(seed, col * freq, row * freq) * 0.72 +
        valueNoise(seed ^ 0x9e3779b9, col * freq * 2.3, row * freq * 2.3) * 0.28
      if (n <= 0.44) continue
      dots.push({ x: ox + col * pitch, y: oy + row * pitch, col, row })
    }
  }

  // Deterministic wedge sites: sparse picks with minimum spacing.
  const rng = mulberry32(seed ^ 0x5f356495)
  const wedgeIndices: number[] = []
  for (let i = 0; i < dots.length; i++) {
    if (wedgeIndices.length >= wedgeMax) break
    if (rng() >= 1 / wedgeRatio) continue
    const d = dots[i]
    const tooClose = wedgeIndices.some((j) => {
      const w = dots[j]
      return Math.hypot(w.x - d.x, w.y - d.y) < wedgeSpacing
    })
    if (!tooClose) wedgeIndices.push(i)
  }

  return { dots, wedgeIndices, cols, rows, pitch }
}

/** Shortest-arc angular damping. Returns the new angle in radians. */
export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  const TAU = Math.PI * 2
  let delta = (target - current) % TAU
  if (delta > Math.PI) delta -= TAU
  if (delta < -Math.PI) delta += TAU
  // Exponential approach, frame-rate independent.
  const t = 1 - Math.exp(-rate * dt)
  return current + delta * t
}

/** Hermite smoothstep on [edge0, edge1], clamped to [0, 1]. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export interface ProtectedRect {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Alpha multiplier keeping dots away from the hero copy: 0 well inside the
 * rect-derived ellipse, ramping to 1 outside. `pad` grows the zone; `feather`
 * is the width of the soft edge, both in pixels.
 */
export function protectedZoneAlpha(
  x: number,
  y: number,
  rect: ProtectedRect,
  pad = 32,
  feather = 90
): number {
  const cx = (rect.left + rect.right) / 2
  const cy = (rect.top + rect.bottom) / 2
  const rx = (rect.right - rect.left) / 2 + pad
  const ry = (rect.bottom - rect.top) / 2 + pad
  if (rx <= 0 || ry <= 0) return 1
  // Normalized ellipse distance: 1 on the padded boundary.
  const d = Math.hypot((x - cx) / rx, (y - cy) / ry)
  // Convert the feather width into normalized units along the x radius.
  const f = feather / Math.max(rx, ry)
  return smoothstep(1, 1 + f, d)
}

/** Single lifecycle gate for the rAF loop (eval finding: one combined gate). */
export function computeShouldAnimate(
  isIntersecting: boolean,
  documentHidden: boolean,
  reducedMotion: boolean
): boolean {
  return isIntersecting && !documentHidden && !reducedMotion
}
