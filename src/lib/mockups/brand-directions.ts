/**
 * Brand directions for generated mockups.
 *
 * Why this exists: every mockup run used to come back in the same blue/green register,
 * because nothing in the pipeline specified color, typography, radius, or surface, so the
 * image model filled from its own prior. This module assigns each project a deterministic
 * triad of "brand kits" (structural archetype + full palette + type + radius + surface)
 * that is injected into the image prompt per option.
 *
 * Design decisions, recorded in docs/plans/mockup-brand-direction-variety-plan.md and its
 * review batch (docs/plans/mockup-brand-bank-preview.html, 60-image validation run):
 *
 * - The kit is attached at prompt-build time, keyed by projectId. The LLM design-plan
 *   schema, the persisted design_plan column, and the client payloads are untouched, so
 *   old plans keep working and a regenerated single option always lands on the same kit
 *   as its siblings.
 * - Selection is deterministic (seeded shuffle), enforces a minimum accent hue separation
 *   and distinct surface treatments within a triad, and spreads usage across the bank.
 * - Kits carry separate desktop and mobile archetype text because the validation batch
 *   showed desktop patterns (left step-rails, split panes) leaking into phone frames.
 * - `MOCKUP_BRAND_DIRECTIONS_ENABLED` (default on, set "0" to disable) restores the
 *   previous prompts and indigo skeletons byte-for-byte, for rollback or a future A/B.
 *
 * Kit data lives in brand-directions-bank.generated.ts, emitted by
 * scripts/build-mockup-brand-bank.mjs. Regenerate there; never hand-edit the bank.
 */

import type { MockupPrimaryPlatform } from "@/lib/mockups/design-plan"

import {
  MOCKUP_ANTI_SLOP_RULES,
  MOCKUP_BRAND_KITS,
  MOCKUP_BRAND_MIN_HUE_SEPARATION,
} from "./brand-directions-bank.generated"

export interface MockupBrandKit {
  id: string
  name: string
  archetype: {
    desktop: string
    mobile: string
  }
  semantic: {
    success: string
    warning: string
    error: string
  }
  semanticClashes: string[]
  accentHex: string
  accentHoverHex: string
  accentOklch: string
  accentHue: number
  accentTextHex: string
  accentTextContrast: number
  neutralTintHue: number
  surfaces: {
    canvas: { hex: string }
    raised: { hex: string }
    border: { hex: string }
    textMuted: { hex: string }
    textPrimary: { hex: string }
  }
  bodyContrast: number
  mutedContrast: number
  typePairing: string
  radius: number
  surface: string
  density: string
}

export { MOCKUP_ANTI_SLOP_RULES, MOCKUP_BRAND_KITS }

/**
 * Default on. "0" or "false" restores the pre-brand-directions pipeline exactly: indigo
 * skeletons, purple placeholder wording, no kit block, no anti-slop rules.
 */
export function isMockupBrandDirectionsEnabled() {
  const value = process.env.MOCKUP_BRAND_DIRECTIONS_ENABLED?.trim().toLowerCase()
  return value !== "0" && value !== "false"
}

/** FNV-1a: stable across runs and processes, so a project always gets the same triad. */
function hashSeed(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** mulberry32: reproducible from a 32-bit seed; used only to shuffle the kit order. */
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hueDistance(a: number, b: number) {
  const delta = Math.abs(a - b) % 360
  return delta > 180 ? 360 - delta : delta
}

function seededShuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Picks the three kits for a project: deterministic from the id, no two accents within
 * MOCKUP_BRAND_MIN_HUE_SEPARATION degrees, no repeated surface treatment. The surface
 * constraint relaxes in a second pass if needed; the hue constraint never does, because
 * hue separation is what stops the options reading as one design in three colors.
 *
 * A naive "walk the ring from a hashed start" was tried first and produced badly
 * non-uniform usage (3 kits took 14 of 30 slots across ten projects, one kit was never
 * picked); the seeded shuffle keeps determinism while spreading selection.
 */
export function selectMockupBrandTriad(projectId: string): [MockupBrandKit, MockupBrandKit, MockupBrandKit] {
  const random = seededRandom(hashSeed(projectId))
  const order = seededShuffle(MOCKUP_BRAND_KITS, random)
  const chosen: MockupBrandKit[] = []

  for (const candidate of order) {
    if (chosen.length === 3) break
    const hueClash = chosen.some((kit) => hueDistance(kit.accentHue, candidate.accentHue) < MOCKUP_BRAND_MIN_HUE_SEPARATION)
    const surfaceClash = chosen.some((kit) => kit.surface === candidate.surface)
    if (!hueClash && !surfaceClash) chosen.push(candidate)
  }

  for (const candidate of order) {
    if (chosen.length === 3) break
    if (chosen.includes(candidate)) continue
    if (chosen.some((kit) => hueDistance(kit.accentHue, candidate.accentHue) < MOCKUP_BRAND_MIN_HUE_SEPARATION)) continue
    chosen.push(candidate)
  }

  if (chosen.length < 3) {
    // Cannot happen with the committed 15-kit bank (verified by unit test), but if the
    // bank ever shrinks below three hue-compatible kits, fail loudly rather than
    // generating options with duplicate identities.
    throw new Error(`Brand bank cannot supply three hue-separated kits (got ${chosen.length})`)
  }

  return [chosen[0], chosen[1], chosen[2]]
}

/** Maps an option label (A/B/C) to its kit within the project's triad. */
export function selectMockupBrandKitForOption(projectId: string, label: string): MockupBrandKit {
  const triad = selectMockupBrandTriad(projectId)
  const index = ["A", "B", "C"].indexOf(label.toUpperCase())
  return triad[index >= 0 ? index : 0]
}

const MOBILE_PLATFORMS: ReadonlySet<MockupPrimaryPlatform> = new Set([
  "mobile-web",
  "native-mobile-app",
])

function surfaceGuidance(surface: string) {
  switch (surface) {
    case "flat":
      return "No shadows and no card borders; separation comes from spacing and type scale alone."
    case "bordered":
      return "Separation comes from 1px rules and borders; no shadows."
    case "flat-bordered":
      return "Hairline rules only, no fills behind groups, no shadows."
    case "soft-elevated":
      return "Soft shadows on cards, no borders."
    case "elevated":
      return "Pronounced elevation on panels, minimal borders."
    default:
      return ""
  }
}

/**
 * Renders the kit as the prompt block appended after the planner's direction strategy.
 * The archetype is platform-specific: the 60-image validation batch showed desktop
 * patterns (left step-rails, split master-detail) leaking into phone frames when a
 * single archetype string was used.
 */
export function formatMockupBrandKitForPrompt(kit: MockupBrandKit, platform: MockupPrimaryPlatform) {
  const archetype = MOBILE_PLATFORMS.has(platform) ? kit.archetype.mobile : kit.archetype.desktop

  const clashNote = kit.semanticClashes.length > 0
    ? `\n- Note: the ${kit.semanticClashes.join(" and ")} status color intentionally sits near the accent family; distinguish those states with icons and position, not hue.`
    : ""

  return `Brand kit for this direction (overrides any conflicting visual tone above):
- Direction identity: "${kit.name}". ${archetype}
- Accent, exact: ${kit.accentHex} (hover ${kit.accentHoverHex}); text on accent ${kit.accentTextHex}.
- Accent covers roughly 10% of the screen: the single primary action, active nav state, and key status marks. It is never a background.
- Page canvas ${kit.surfaces.canvas.hex}; raised surfaces ${kit.surfaces.raised.hex}; borders and rules ${kit.surfaces.border.hex}.
- Primary text ${kit.surfaces.textPrimary.hex}; secondary text ${kit.surfaces.textMuted.hex}. Neutrals are tinted toward hue ${kit.neutralTintHue}, never pure grey.
- Status colors, used sparingly and only for real state: success ${kit.semantic.success}, warning ${kit.semantic.warning}, error ${kit.semantic.error}.${clashNote}
- Typography: ${kit.typePairing}; strong scale contrast between headings and supporting text.
- Corner radius ${kit.radius}px on every element that has one.${kit.radius === 0 ? " Sharp corners throughout." : ""}
- Surface treatment: ${kit.surface}. ${surfaceGuidance(kit.surface)}
- Density: ${kit.density}.`
}

/** Appended to the image system prompt when brand directions are enabled. */
export function formatMockupAntiSlopRules() {
  return `Never produce any of the following, regardless of other instructions:\n${MOCKUP_ANTI_SLOP_RULES.map((rule) => `- ${rule}`).join("\n")}`
}
