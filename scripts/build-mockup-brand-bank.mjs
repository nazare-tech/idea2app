#!/usr/bin/env node
/**
 * Builds the mockup brand-direction bank and a visual preview page.
 *
 * This is an author-time script, not runtime code. It runs once (and again whenever we
 * revise the bank), emits a JSON bank plus an HTML contact sheet for human review, and
 * the reviewed JSON is what eventually gets frozen into a TypeScript constant.
 *
 * Method, mined from two skills rather than by calling them:
 *
 * From `impeccable/reference/color-and-contrast.md`:
 *   - Define color in OKLCH, not HSL. Equal lightness steps must look equal.
 *   - Do not reflexively reach for hue 250 (blue) or hue 60 (warm orange). Those are the
 *     dominant AI-design defaults. This bank therefore contains exactly one blue kit out
 *     of fifteen, instead of the three-out-of-three we ship today.
 *   - Pure grey is dead. Neutrals carry chroma 0.005-0.015 tinted toward the brand hue,
 *     so each kit's greys are subtly different from every other kit's greys.
 *   - Accent is ~10% of visual weight, not the background.
 *
 * From `build-a-brand/references/brand-guidelines.md`:
 *   - "Color grading is the LAST differentiator, not the first." So every kit leads with a
 *     structural archetype (how the screen is built), and only then picks a hue.
 *   - "If you can swap colors and fonts and the layouts feel identical, the board has
 *     failed." Hence archetype, density, radius, and surface treatment all vary too.
 *   - Directions get evocative names ("The Heirloom", not "Option B"), which also gives the
 *     image model a semantic handle to design toward.
 *
 * Usage:
 *   node scripts/build-mockup-brand-bank.mjs
 */

import { writeFile } from "node:fs/promises"

import { escapeHtml } from "./lib/html.mjs"

/**
 * Fifteen kits. Hues are deliberately spread around the wheel with blue underweighted.
 *
 * `archetype` is the primary differentiator and describes structure, not decoration. Two
 * kits may never share an archetype, which is what stops the three options from being one
 * layout in three colors.
 */
const KITS = [
  {
    id: "field-manual",
    name: "Field Manual",
    archetype: "Technical console. Dense data grid, hairline rules, monospace numerics, no decorative chrome.",
    accent: { l: 0.55, c: 0.17, h: 28 },
    typePairing: "IBM Plex Sans + IBM Plex Mono",
    radius: 2,
    surface: "flat-bordered",
    density: "High",
  },
  {
    id: "kiln",
    name: "Kiln",
    archetype: "Artisan catalogue. Generous margins, large product imagery, quiet toolbars pushed to the edges.",
    accent: { l: 0.58, c: 0.14, h: 50 },
    typePairing: "Fraunces + Inter",
    radius: 8,
    surface: "soft-elevated",
    density: "Low",
  },
  {
    id: "almanac",
    name: "Almanac",
    archetype: "Editorial reader. Single measured column, footnote rail, typographic hierarchy doing all the work.",
    accent: { l: 0.52, c: 0.11, h: 68 },
    typePairing: "Source Serif 4 + Source Sans 3",
    radius: 0,
    surface: "flat",
    density: "Low",
  },
  {
    id: "switchboard",
    name: "Switchboard",
    archetype: "Operations board. Status-first columns, colored state pills, everything scannable in one glance.",
    accent: { l: 0.66, c: 0.15, h: 88 },
    typePairing: "Space Grotesk + Inter",
    radius: 6,
    surface: "flat-bordered",
    density: "High",
  },
  {
    id: "commons",
    name: "Commons",
    archetype: "Community feed. Avatar-led list, threaded replies, sticky composer at the bottom.",
    accent: { l: 0.54, c: 0.12, h: 110 },
    typePairing: "General Sans + Inter",
    radius: 12,
    surface: "soft-elevated",
    density: "Medium",
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    archetype: "Soft consumer app. Rounded cards, oversized friendly headings, one primary action per screen.",
    accent: { l: 0.62, c: 0.13, h: 135 },
    typePairing: "Poppins + Inter",
    radius: 20,
    surface: "soft-elevated",
    density: "Low",
  },
  {
    id: "trailhead",
    name: "Trailhead",
    archetype: "Guided wizard. Numbered step rail on the left, one decision per panel, persistent progress summary.",
    accent: { l: 0.50, c: 0.11, h: 152 },
    typePairing: "Public Sans + Inter",
    radius: 8,
    surface: "bordered",
    density: "Medium",
  },
  {
    id: "tide",
    name: "Tide",
    archetype: "Analytics canvas. Chart-dominant, small-multiples grid, controls collapsed into a thin top bar.",
    // 0.57 landed at 4.49:1 against white, a hair under AA. 0.54 clears it.
    accent: { l: 0.54, c: 0.11, h: 172 },
    typePairing: "Geist + Geist Mono",
    radius: 4,
    surface: "flat-bordered",
    density: "High",
  },
  {
    id: "depot",
    name: "Depot",
    archetype: "Inventory workbench. Split master-detail, sticky filter sidebar, bulk-action toolbar.",
    accent: { l: 0.48, c: 0.09, h: 195 },
    typePairing: "Barlow + Roboto Mono",
    radius: 4,
    surface: "bordered",
    density: "High",
  },
  {
    id: "harbor",
    name: "Harbor",
    archetype: "Scheduling surface. Time-grid primary, drag targets, day and week toggle in the header.",
    accent: { l: 0.53, c: 0.10, h: 215 },
    typePairing: "Manrope + Inter",
    radius: 10,
    surface: "soft-elevated",
    density: "Medium",
  },
  {
    id: "ledger",
    name: "Ledger",
    archetype: "Institutional record. Ruled tables, right-aligned figures, restrained serif headings, audit trail rail.",
    accent: { l: 0.42, c: 0.10, h: 265 },
    typePairing: "Lora + IBM Plex Sans",
    radius: 4,
    surface: "flat-bordered",
    density: "High",
  },
  {
    id: "atrium",
    name: "Atrium",
    archetype: "Workspace shell. Left nav plus content plus contextual right panel, three-pane and calm.",
    accent: { l: 0.51, c: 0.13, h: 295 },
    typePairing: "Satoshi + Inter",
    radius: 10,
    surface: "elevated",
    density: "Medium",
  },
  {
    id: "vellum",
    name: "Vellum",
    archetype: "Document studio. Page-like canvas floating on a tinted backdrop, formatting rail, print metaphor.",
    accent: { l: 0.47, c: 0.12, h: 320 },
    typePairing: "Newsreader + Inter",
    radius: 6,
    surface: "elevated",
    density: "Low",
  },
  {
    id: "signal",
    name: "Signal",
    archetype: "Magazine cover. One enormous headline, full-bleed hero band, everything else deliberately small.",
    accent: { l: 0.55, c: 0.20, h: 345 },
    typePairing: "Archivo Expanded + Inter",
    radius: 0,
    surface: "flat",
    density: "Medium",
  },
  {
    id: "studio",
    name: "Studio",
    archetype: "Gallery shell. Near-monochrome, content is the only color, accent reserved for a single control.",
    accent: { l: 0.30, c: 0.02, h: 300 },
    typePairing: "Neue Haas Grotesk + Inter",
    radius: 0,
    surface: "flat",
    density: "Low",
  },
]

/**
 * The anti-slop deny list. These are the specific tells that make a generated interface
 * read as AI output regardless of palette, so they are banned in the image system prompt.
 */
const DENY_LIST = [
  "purple-to-blue gradient headers, hero bands, or buttons",
  "glassmorphism, frosted panels, or translucent blurred overlays",
  "teal or mint accents on white cards as the default look",
  "Inter (or a generic geometric sans) used for every level of the hierarchy",
  "a uniform large corner radius applied to every element on the screen",
  "stacked soft drop shadows used as the only means of separation",
  "emoji used as interface iconography",
  "placeholder branding such as \"Acme\", \"Acme Inc\", or a generic abstract swoosh logo",
  "decorative gradient meshes, blobs, or aurora backgrounds behind product UI",
  "an \"AI-powered\" badge, sparkle icon, or similar marketing flourish",
]

// --- OKLCH to sRGB -----------------------------------------------------------------
// Implemented here rather than pulled from a dependency because this is a build script
// and the conversion is ~20 lines. Matrices are the standard Oklab ones.

function oklchToLinearSrgb({ l: L, c, h }) {
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  const lCube = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mCube = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sCube = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3

  return {
    r: 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube,
    g: -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube,
    b: -0.0041960863 * lCube - 0.7034186147 * mCube + 1.7076147010 * sCube,
  }
}

function gammaEncode(channel) {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055
}

function isInGamut({ r, g, b }) {
  const epsilon = 0.0001
  return [r, g, b].every((channel) => channel >= -epsilon && channel <= 1 + epsilon)
}

/**
 * Converts OKLCH to a hex string, reducing chroma until the color fits inside sRGB.
 * Without this, a high-chroma color at an extreme lightness silently clips and lands on a
 * different hue than the one we asked for.
 */
function oklchToHex(oklch) {
  let chroma = oklch.c
  let linear = oklchToLinearSrgb(oklch)

  while (!isInGamut(linear) && chroma > 0) {
    chroma = Math.max(0, chroma - 0.002)
    linear = oklchToLinearSrgb({ ...oklch, c: chroma })
  }

  const clamped = {
    r: Math.min(1, Math.max(0, linear.r)),
    g: Math.min(1, Math.max(0, linear.g)),
    b: Math.min(1, Math.max(0, linear.b)),
  }

  const hex = ["r", "g", "b"]
    .map((key) => Math.round(gammaEncode(clamped[key]) * 255).toString(16).padStart(2, "0"))
    .join("")

  return { hex: `#${hex}`, clampedChroma: chroma }
}

// --- Contrast ----------------------------------------------------------------------

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}

// --- Kit expansion -----------------------------------------------------------------

/**
 * Expands a kit definition into the full set of values the image prompt needs.
 *
 * Neutrals are generated at the kit's own hue with a tiny chroma, per the tinted-neutral
 * rule. That means "Kiln" greys lean warm-clay and "Depot" greys lean cool-petrol, which
 * differentiates two kits even before the accent is applied.
 */
function expandKit(kit) {
  const accent = oklchToHex(kit.accent)
  const accentHover = oklchToHex({ ...kit.accent, l: kit.accent.l - 0.06 })

  const neutralChroma = 0.008
  const surfaces = {
    canvas: oklchToHex({ l: 0.985, c: neutralChroma * 0.5, h: kit.accent.h }),
    raised: oklchToHex({ l: 1.0, c: 0, h: kit.accent.h }),
    border: oklchToHex({ l: 0.90, c: neutralChroma, h: kit.accent.h }),
    textMuted: oklchToHex({ l: 0.55, c: neutralChroma, h: kit.accent.h }),
    textPrimary: oklchToHex({ l: 0.22, c: neutralChroma * 1.5, h: kit.accent.h }),
  }

  const onAccentWhite = contrastRatio(accent.hex, "#ffffff")
  const onAccentBlack = contrastRatio(accent.hex, "#111111")
  const accentTextColor = onAccentWhite >= onAccentBlack ? "#ffffff" : "#111111"

  return {
    id: kit.id,
    name: kit.name,
    archetype: kit.archetype,
    accentHex: accent.hex,
    accentHoverHex: accentHover.hex,
    accentOklch: `oklch(${kit.accent.l} ${accent.clampedChroma.toFixed(3)} ${kit.accent.h})`,
    accentHue: kit.accent.h,
    accentTextHex: accentTextColor,
    accentTextContrast: Number(Math.max(onAccentWhite, onAccentBlack).toFixed(2)),
    neutralTintHue: kit.accent.h,
    surfaces,
    bodyContrast: Number(contrastRatio(surfaces.textPrimary.hex, surfaces.canvas.hex).toFixed(2)),
    mutedContrast: Number(contrastRatio(surfaces.textMuted.hex, surfaces.canvas.hex).toFixed(2)),
    typePairing: kit.typePairing,
    radius: kit.radius,
    surface: kit.surface,
    density: kit.density,
  }
}

// --- Triad selection ---------------------------------------------------------------

/** Stable, dependency-free hash so a project always resolves to the same triad. */
function hashProjectId(projectId) {
  let hash = 2166136261
  for (let i = 0; i < projectId.length; i++) {
    hash ^= projectId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function hueDistance(a, b) {
  const delta = Math.abs(a - b) % 360
  return delta > 180 ? 360 - delta : delta
}

const MIN_HUE_SEPARATION = 60

/**
 * Picks three kits for a project: deterministic from the project id, never two kits whose
 * accent hues sit within MIN_HUE_SEPARATION of each other, and never two identical surface
 * treatments. Walking the ring from a hashed offset keeps the choice stable while still
 * spreading different projects across the whole bank.
 */
function selectTriad(kits, projectId) {
  const start = hashProjectId(projectId) % kits.length
  const chosen = []

  for (let step = 0; step < kits.length && chosen.length < 3; step++) {
    const candidate = kits[(start + step) % kits.length]

    const hueClash = chosen.some(
      (kit) => hueDistance(kit.accentHue, candidate.accentHue) < MIN_HUE_SEPARATION,
    )
    const surfaceClash = chosen.some((kit) => kit.surface === candidate.surface)

    if (!hueClash && !surfaceClash) chosen.push(candidate)
  }

  // Relax the surface constraint if the hue constraint alone left us short.
  for (let step = 0; step < kits.length && chosen.length < 3; step++) {
    const candidate = kits[(start + step) % kits.length]
    if (chosen.includes(candidate)) continue
    if (chosen.some((kit) => hueDistance(kit.accentHue, candidate.accentHue) < MIN_HUE_SEPARATION)) continue
    chosen.push(candidate)
  }

  return chosen
}

// --- Preview page ------------------------------------------------------------------

const SAMPLE_PROJECT_IDS = [
  "8f14e45f-ceea-467a-9c9d-b0c1e5b19b1a",
  "c9f0f895-fb98-4b1a-8d9a-6b0f7d8e2a44",
  "45c48cce-2e2d-4fa8-a1b2-9f0e3c7d1a55",
  "d3d94468-02a2-4e1b-9b3c-7a1f2e8c4b66",
  "6512bd43-d9ca-4e6b-8f2d-3c5a9e7b1d77",
  "c20ad4d7-6fe9-4770-9a1c-8b4e2f6a3c88",
]

function renderKitCard(kit) {
  return `
  <article class="kit" style="--accent:${kit.accentHex};--accent-text:${kit.accentTextHex};--canvas:${kit.surfaces.canvas.hex};--border:${kit.surfaces.border.hex};--text:${kit.surfaces.textPrimary.hex};--muted:${kit.surfaces.textMuted.hex};--radius:${kit.radius}px">
    <header>
      <h3>${escapeHtml(kit.name)}</h3>
      <code>${escapeHtml(kit.accentHex)} &middot; hue ${kit.accentHue}</code>
    </header>
    <p class="archetype">${escapeHtml(kit.archetype)}</p>
    <div class="swatches">
      <span class="swatch accent">Accent</span>
      <span class="swatch" style="background:${kit.surfaces.canvas.hex}">Canvas</span>
      <span class="swatch" style="background:${kit.surfaces.border.hex}">Border</span>
      <span class="swatch" style="background:${kit.surfaces.textMuted.hex};color:#fff">Muted</span>
      <span class="swatch" style="background:${kit.surfaces.textPrimary.hex};color:#fff">Text</span>
    </div>
    <div class="mini">
      <div class="mini-bar"></div>
      <div class="mini-row"><span class="mini-cell wide"></span><span class="mini-cell"></span></div>
      <div class="mini-row"><span class="mini-cell"></span><span class="mini-cell wide"></span></div>
      <button class="mini-cta">Primary action</button>
    </div>
    <dl>
      <div><dt>Type</dt><dd>${escapeHtml(kit.typePairing)}</dd></div>
      <div><dt>Radius</dt><dd>${kit.radius}px</dd></div>
      <div><dt>Surface</dt><dd>${escapeHtml(kit.surface)}</dd></div>
      <div><dt>Density</dt><dd>${escapeHtml(kit.density)}</dd></div>
      <div><dt>Contrast</dt><dd>body ${kit.bodyContrast}:1 &middot; on-accent ${kit.accentTextContrast}:1</dd></div>
    </dl>
  </article>`
}

function renderTriadRow(projectId, triad) {
  const chips = triad.map((kit) => `
      <div class="triad-chip" style="background:${kit.accentHex};color:${kit.accentTextHex}">
        <strong>${escapeHtml(kit.name)}</strong>
        <span>${escapeHtml(kit.accentHex)} &middot; hue ${kit.accentHue}</span>
        <span>${escapeHtml(kit.surface)} &middot; ${kit.radius}px</span>
      </div>`).join("")

  const separations = triad.length === 3
    ? [
        hueDistance(triad[0].accentHue, triad[1].accentHue),
        hueDistance(triad[1].accentHue, triad[2].accentHue),
        hueDistance(triad[0].accentHue, triad[2].accentHue),
      ]
    : []

  return `
    <div class="triad">
      <code class="triad-id">${escapeHtml(projectId.slice(0, 8))}</code>
      <div class="triad-chips">${chips}</div>
      <span class="triad-meta">min hue gap ${Math.min(...separations)}&deg;</span>
    </div>`
}

function renderPreview(kits) {
  const triads = SAMPLE_PROJECT_IDS
    .map((id) => renderTriadRow(id, selectTriad(kits, id)))
    .join("")

  return `<meta charset="utf-8">
<title>Mockup brand bank preview</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 48px; font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; color: #18181b; background: #fafafa; }
  h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0 0 8px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; color: #71717a; margin: 48px 0 16px; font-family: ui-monospace, monospace; }
  .lede { color: #52525b; max-width: 70ch; margin: 0 0 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
  .kit { background: #fff; border: 1px solid #e4e4e7; padding: 20px; }
  .kit header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .kit h3 { margin: 0; font-size: 18px; letter-spacing: -0.01em; }
  .kit code { font-size: 11px; color: #71717a; white-space: nowrap; }
  .archetype { font-size: 13px; color: #52525b; margin: 8px 0 16px; min-height: 3.2em; }
  .swatches { display: flex; gap: 4px; margin-bottom: 16px; }
  .swatch { flex: 1; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 4px; text-align: center; color: #52525b; border: 1px solid #e4e4e7; }
  .swatch.accent { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
  .mini { background: var(--canvas); border: 1px solid var(--border); padding: 12px; margin-bottom: 16px; }
  .mini-bar { height: 8px; width: 40%; background: var(--accent); border-radius: calc(var(--radius) / 2); margin-bottom: 10px; }
  .mini-row { display: flex; gap: 6px; margin-bottom: 6px; }
  .mini-cell { flex: 1; height: 22px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); }
  .mini-cell.wide { flex: 2.4; }
  .mini-cta { margin-top: 6px; background: var(--accent); color: var(--accent-text); border: 0; border-radius: var(--radius); padding: 7px 14px; font-size: 12px; font-family: inherit; }
  dl { margin: 0; font-size: 12px; }
  dl > div { display: flex; gap: 8px; padding: 4px 0; border-top: 1px solid #f4f4f5; }
  dt { color: #a1a1aa; min-width: 62px; }
  dd { margin: 0; color: #3f3f46; }
  .triad { display: flex; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid #ececef; }
  .triad-id { font-size: 12px; color: #a1a1aa; min-width: 76px; }
  .triad-chips { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
  .triad-chip { padding: 8px 12px; min-width: 190px; display: flex; flex-direction: column; gap: 1px; }
  .triad-chip strong { font-size: 13px; }
  .triad-chip span { font-size: 10px; opacity: 0.85; }
  .triad-meta { font-size: 11px; color: #71717a; font-family: ui-monospace, monospace; white-space: nowrap; }
  .deny { columns: 2; column-gap: 32px; font-size: 13px; color: #3f3f46; max-width: 900px; }
  .deny li { margin-bottom: 6px; break-inside: avoid; }
</style>
<h1>Mockup brand bank</h1>
<p class="lede">Fifteen design directions for generated product mockups. Each kit leads with a structural archetype and only then picks a hue, because color is the last differentiator, not the first. Exactly one kit is blue.</p>

<h2>Kits</h2>
<div class="grid">${kits.map(renderKitCard).join("")}</div>

<h2>Sample triads (deterministic per project id)</h2>
${triads}

<h2>Anti-slop deny list</h2>
<ul class="deny">${DENY_LIST.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
`
}

// --- Main --------------------------------------------------------------------------

async function main() {
  const kits = KITS.map(expandKit)

  const failures = kits.filter((kit) => kit.bodyContrast < 4.5 || kit.accentTextContrast < 4.5)
  const blueKits = kits.filter((kit) => kit.accentHue >= 230 && kit.accentHue <= 280)

  await writeFile(
    "docs/plans/mockup-brand-bank.json",
    `${JSON.stringify({ kits, denyList: DENY_LIST, minHueSeparation: MIN_HUE_SEPARATION }, null, 2)}\n`,
  )
  await writeFile("docs/plans/mockup-brand-bank-preview.html", renderPreview(kits))

  console.log(`${kits.length} kits written to docs/plans/mockup-brand-bank.json`)
  console.log(`Preview: docs/plans/mockup-brand-bank-preview.html`)
  console.log(`Blue kits (hue 230-280): ${blueKits.length} of ${kits.length}`)
  console.log(`Contrast failures: ${failures.length ? failures.map((kit) => kit.name).join(", ") : "none"}`)

  console.log(`\nTriads by project id:`)
  for (const projectId of SAMPLE_PROJECT_IDS) {
    const triad = selectTriad(kits, projectId)
    const gaps = [
      hueDistance(triad[0].accentHue, triad[1].accentHue),
      hueDistance(triad[1].accentHue, triad[2].accentHue),
      hueDistance(triad[0].accentHue, triad[2].accentHue),
    ]
    console.log(
      `  ${projectId.slice(0, 8)}  ${triad.map((kit) => kit.name.padEnd(13)).join("")} min gap ${Math.min(...gaps)}deg`,
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
