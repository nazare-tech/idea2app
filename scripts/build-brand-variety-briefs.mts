#!/usr/bin/env -S npx tsx
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
 *   npx tsx scripts/build-brand-variety-briefs.mts [--runs <dir>] [--out <dir>]
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"

// Runtime module, not a local re-implementation: the batch must exercise the exact kit
// block the shipped pipeline sends, including the semantic status ramp, platform-aware
// archetypes, and clash notes. Run this script with tsx so the TS import resolves:
//   npx tsx scripts/build-brand-variety-briefs.mts
import {
  formatMockupBrandKitForPrompt,
  selectMockupBrandTriad,
  type MockupBrandKit,
} from "../src/lib/mockups/brand-directions"
import type { MockupPrimaryPlatform } from "../src/lib/mockups/design-plan"

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
} satisfies Partial<Record<MockupPrimaryPlatform, string>>

const PLATFORMS = Object.keys(SKELETONS) as (keyof typeof SKELETONS)[]
const LABELS = ["A", "B", "C"]

function parseArgs(argv: string[]) {
  const args = { runs: DEFAULT_RUNS_DIR, out: DEFAULT_OUT_DIR }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--runs" && argv[i + 1]) args.runs = argv[++i]
    else if (argv[i] === "--out" && argv[i + 1]) args.out = argv[++i]
  }
  return args
}

function buildBrief({ title, triad, denyList }: { title: string; triad: readonly MockupBrandKit[]; denyList: string[] }) {
  const kitBlocks = PLATFORMS.map((platform) => {
    const blocks = triad.map((kit: MockupBrandKit, index: number) =>
      `### Direction ${LABELS[index]} (${platform}): ${kit.name}\n\n${formatMockupBrandKitForPrompt(kit, platform)}`,
    ).join("\n\n")
    return `## Brand kits for ${platform}\n\n${blocks}`
  }).join("\n\n")
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

Each direction now also carries a brand kit, and the kit is platform-specific: use the
block matching the platform you are generating. The kit is not decoration applied at the
end: its structural archetype should shape how the screen is built, and the palette,
typography, radius, and surface treatment then follow. Two directions for the same product
must not be distinguishable only by colour.

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
- Mobile frames only: each phone has a black iOS home indicator bar near its bottom edge.
  Keep the bar exactly where it is. Fill the area behind and beside it with the app's
  background surface color (or the open bottom sheet's surface color when one is shown),
  and never place buttons, tab bars, inputs, or any interactive element in that zone;
  bottom-anchored controls sit fully above the home indicator.
- Keep exactly two frames. No third frame, no arrows, no rationale cards, no direction labels.
- Keep all generated UI inside the frame interiors.
- Show populated happy-path states with realistic data, never empty states.
- Keep visible copy short: 1-3 word labels, real-sounding names, a few concise metrics, one
  obvious primary action per screen.

## Do not produce any of these

${denyList.map((rule: string) => `- ${rule}`).join("\n")}

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

    const triad = selectMockupBrandTriad(slug)
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
  console.log(`Kits never used: ${bank.kits.filter((kit: MockupBrandKit) => !usage.has(kit.name)).map((kit: MockupBrandKit) => kit.name).join(", ") || "none"}`)
}

main()
