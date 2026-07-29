/**
 * Deterministic brand-kit triad selection, shared by the bank generator and the
 * review-batch brief generator so both agree on which kits a given project gets.
 *
 * The first implementation walked the kit ring from a hashed start index and took the
 * first three compatible kits going forward. That is deterministic but badly non-uniform:
 * across ten real projects three kits took 14 of 30 slots and one kit was never selected
 * at all, because a hashed start still lands in the same favourable runs of the array
 * again and again. Shuffling the whole ring with a seeded PRNG and then taking the first
 * three compatible kits keeps determinism and spreads selection across the bank.
 */

/** FNV-1a. Stable across runs and processes, unlike anything hash-order dependent. */
export function hashSeed(seed) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** mulberry32: small, fast, well-distributed, and reproducible from a 32-bit seed. */
function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Shortest angular distance between two hues, in degrees. */
export function hueDistance(a, b) {
  const delta = Math.abs(a - b) % 360
  return delta > 180 ? 360 - delta : delta
}

function shuffle(items, random) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Picks three kits for a seed: same seed always yields the same triad, no two kits sit
 * within `minHueSeparation` degrees of each other, and no two share a surface treatment.
 *
 * The surface constraint is relaxed in a second pass if the hue constraint alone cannot
 * fill three slots, because hue separation is what stops the three options reading as one
 * design in three colours and is therefore the one worth keeping.
 */
export function selectTriad(kits, seed, minHueSeparation) {
  const random = seededRandom(hashSeed(seed))
  const order = shuffle(kits, random)
  const chosen = []

  for (const candidate of order) {
    if (chosen.length === 3) break
    const hueClash = chosen.some((kit) => hueDistance(kit.accentHue, candidate.accentHue) < minHueSeparation)
    const surfaceClash = chosen.some((kit) => kit.surface === candidate.surface)
    if (!hueClash && !surfaceClash) chosen.push(candidate)
  }

  for (const candidate of order) {
    if (chosen.length === 3) break
    if (chosen.includes(candidate)) continue
    if (chosen.some((kit) => hueDistance(kit.accentHue, candidate.accentHue) < minHueSeparation)) continue
    chosen.push(candidate)
  }

  return chosen
}
