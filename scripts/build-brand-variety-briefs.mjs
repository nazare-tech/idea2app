#!/usr/bin/env node
/**
 * Prepares a brand-variety review batch: for each Maker Compass case study, assigns a
 * deterministic kit triad from the brand bank and writes a brief that a Codex run turns
 * into six images (two platforms x three directions).
 *
 * This exists to answer one question before any pipeline code changes: do the fifteen
 * kits actually produce visible variety on real product ideas, both within one idea and
 * across ten of them? The current pipeline output was three near-identical blue/green
 * options for every idea.
 *
 * The existing case-study design plans are reused verbatim. Only the brand layer is new,
 * which keeps the comparison honest: same ideas, same screens, same directions, same
 * skeletons, different brand specification.
 *
 * Usage:
 *   node scripts/build-brand-variety-briefs.mjs [--runs <dir>] [--out <dir>]
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"

import { selectTriad } from "./lib/brand-triad.mjs"

const DEFAULT_RUNS_DIR = "output/maker-compass-skill-runs/2026-07-22"
const DEFAULT_OUT_DIR = "output/mockup-brand-variety"
const BANK_PATH = "docs/plans/mockup-brand-bank.json"

/**
 * Grey skeletons, not the committed indigo ones. The indigo fill is ~63% of the canvas
 * and anchors an image-edit call toward blue, so reviewing kit variety against the old
 * skeleton would measure the skeleton, not the kits.
 */
const SKELETONS = {
  "native-mobile-app": "public/mockups/skeletons/native-mobile-app-storyboard-skeleton-grey.png",
  "desktop-web": "public/mockups/skeletons/desktop-web-storyboard-skeleton-grey.png",
}

const PLATFORMS = Object.keys(SKELETONS)
const LABELS = ["A", "B", "C"]

function parseArgs(argv) {
  const args = { runs: DEFAULT_RUNS_DIR, out: DEFAULT_OUT_DIR }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--runs" && argv[i + 1]) args.runs = argv[++i]
    else if (argv[i] === "--out" && argv[i + 1]) args.out = argv[++i]
  }
  return args
}

function formatKit(kit, label) {
  return `### Direction ${label} brand kit: ${kit.name}

- Structural archetype (this drives the layout, not just the paint): ${kit.archetype}
- Accent, exact: ${kit.accentHex} (hover ${kit.accentHoverHex}). Text on accent: ${kit.accentTextHex}.
- Accent covers roughly 10% of the screen. It belongs on the single primary action, active nav state, and key status marks. It is not a background.
- Page canvas: ${kit.surfaces.canvas.hex}. Raised surfaces: ${kit.surfaces.raised.hex}. Borders/rules: ${kit.surfaces.border.hex}.
- Primary text: ${kit.surfaces.textPrimary.hex}. Secondary/muted text: ${kit.surfaces.textMuted.hex}.
- Neutrals are tinted toward hue ${kit.neutralTintHue}, not pure grey. Keep that cast in every surface.
- Typography: ${kit.typePairing}. Use real hierarchy: display weight for headings, smaller and lighter for supporting text.
- Corner radius: ${kit.radius}px on every element that has one. ${kit.radius === 0 ? "Sharp corners throughout." : ""}
- Surface treatment: ${kit.surface}. ${surfaceGuidance(kit.surface)}
- Density: ${kit.density}.`
}

function surfaceGuidance(surface) {
  switch (surface) {
    case "flat":
      return "No shadows and no card borders. Separation comes from spacing and type scale alone."
    case "bordered":
      return "Separation comes from 1px rules and borders. No shadows."
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

function buildBrief({ title, triad, denyList }) {
  const kitBlocks = triad.map((kit, index) => formatKit(kit, LABELS[index])).join("\n\n")
  const outputs = PLATFORMS.flatMap((platform) =>
    LABELS.map((label) => `- \`images/${platform}-option-${label.toLowerCase()}.png\` — ${platform}, Direction ${label}, kit "${triad[LABELS.indexOf(label)].name}"`),
  ).join("\n")

  return `# Brand variety brief: ${title}

Generate six mockup images for this product: two platforms times three directions.

## Source of truth for content

Read \`design-plan.md\` in this directory. It defines, per platform, the target user, the
happy-path scenario, the two exact screens with their verbatim captions, and the A/B/C
direction strategies. Use it unchanged. Do not invent new screens, new captions, or new
directions.

## What is new

Each direction now also carries a brand kit. The kit is not decoration applied at the end:
its structural archetype should shape how the screen is built, and the palette, typography,
radius, and surface treatment then follow. Two directions for the same product must not be
distinguishable only by colour.

${kitBlocks}

## Skeleton edit contract

Attach exactly one skeleton as the referenced image:

- native-mobile-app: \`${resolve(SKELETONS["native-mobile-app"])}\`
- desktop-web: \`${resolve(SKELETONS["desktop-web"])}\`

Rules, unchanged from the existing workflow:

- Treat the attached image as the edit target, not as inspiration.
- Preserve the exact canvas, white background, both frame positions and sizes, captions,
  shadows, alignment, and device or browser chrome.
- Replace only the two grey placeholder interiors and the two "Text here" caption labels.
- Keep exactly two frames. No third frame, no arrows, no rationale cards, no direction labels.
- Keep all generated UI inside the frame interiors.
- Show populated happy-path states with realistic data, never empty states.
- Keep visible copy short: 1-3 word labels, real-sounding names, a few concise metrics, one
  obvious primary action per screen.

## Do not produce any of these

${denyList.map((rule) => `- ${rule}`).join("\n")}

## How to generate (read this, it is where the first run failed)

1. You MUST call the \`image_gen.imagegen\` tool for every image. Do not draw with
   ImageMagick, \`magick\`, Python, or any shell command. Ignore any repository skill that
   suggests deterministic local shape drawing; it does not apply to product mockups.
2. Pass the platform's skeleton as the only entry in \`referenced_image_paths\`.
3. \`image_gen.imagegen\` does NOT write to your working directory. It writes to
   \`~/.codex/generated_images/<session-id>/<call-id>.png\`. After each call you MUST copy
   that file to the output path below, then confirm with \`ls -la\` that the destination
   exists and is non-zero.
4. Do not report an image as done until that \`ls -la\` has printed a real size. A previous
   run described six finished images while the output directory was empty.

## Outputs

Write each image to exactly this path, relative to this brief's directory:

${outputs}

Inspect every saved image with view_image afterwards. Retry an image only if it breaks the
skeleton contract above, not for taste.

Finish by printing one line per image: filename, kit name, byte size, and whether the
two-frame skeleton contract held.
`
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const bank = JSON.parse(readFileSync(BANK_PATH, "utf8"))

  for (const [platform, path] of Object.entries(SKELETONS)) {
    if (!existsSync(path)) throw new Error(`Missing ${platform} skeleton: ${path}`)
  }

  const slugs = readdirSync(args.runs, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(args.runs, entry.name, "mockups/design-plan.md")))
    .map((entry) => entry.name)
    .sort()

  if (slugs.length === 0) throw new Error(`No case studies with a design plan under ${args.runs}`)

  const manifest = []

  for (const slug of slugs) {
    const designPlanPath = join(args.runs, slug, "mockups/design-plan.md")
    const designPlan = readFileSync(designPlanPath, "utf8")
    const title = designPlan.match(/^#\s*Mockup Design Plan:\s*(.+)$/m)?.[1]?.trim() ?? slug

    const triad = selectTriad(bank.kits, slug, bank.minHueSeparation)
    const ideaDir = join(args.out, slug)
    mkdirSync(join(ideaDir, "images"), { recursive: true })

    writeFileSync(join(ideaDir, "design-plan.md"), designPlan)
    writeFileSync(join(ideaDir, "brief.md"), buildBrief({ title, triad, denyList: bank.denyList }))

    manifest.push({
      slug,
      title,
      kits: triad.map((kit, index) => ({
        label: LABELS[index],
        id: kit.id,
        name: kit.name,
        accentHex: kit.accentHex,
        accentHue: kit.accentHue,
        surface: kit.surface,
        radius: kit.radius,
      })),
    })

    console.log(`${slug.padEnd(16)} ${triad.map((kit) => `${kit.name} (${kit.accentHex})`).join("  ")}`)
  }

  writeFileSync(join(args.out, "manifest.json"), `${JSON.stringify({ generatedFrom: args.runs, ideas: manifest }, null, 2)}\n`)

  const usage = new Map()
  for (const idea of manifest) {
    for (const kit of idea.kits) usage.set(kit.name, (usage.get(kit.name) ?? 0) + 1)
  }

  console.log(`\n${manifest.length} briefs written to ${args.out}`)
  console.log(`Kit usage across ${manifest.length * 3} slots:`)
  for (const [name, count] of [...usage.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(14)} ${"#".repeat(count)} ${count}`)
  }
  console.log(`Kits never used: ${bank.kits.filter((kit) => !usage.has(kit.name)).map((kit) => kit.name).join(", ") || "none"}`)
}

main()
