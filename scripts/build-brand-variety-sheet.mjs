#!/usr/bin/env node
/**
 * Builds a review contact sheet for the brand-variety batch.
 *
 * The question this page has to answer is not "are these nice", it is "did the kits
 * actually differentiate". So it is laid out for two comparisons at once:
 *
 *   - across a row: the three options for one idea, which is the within-idea test
 *   - down the page: ten ideas, which is the across-idea test that the current pipeline
 *     fails (all ten came back in the same blue/green register)
 *
 * Each image is captioned with the kit that produced it and its accent swatch, so a
 * mismatch between the specified accent and the rendered one is visible without opening
 * a colour picker.
 *
 * Usage: node scripts/build-brand-variety-sheet.mjs [--root <dir>]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import sharp from "sharp"

import { escapeHtml } from "./lib/html.mjs"

/**
 * Thumbnails are embedded as data URIs so the sheet is a single portable file. The
 * originals are 2.5-4.3 MB each and 60 of them will not travel; 900px JPEGs keep layout,
 * hierarchy, and palette legible at roughly 2% of the weight, and each card links out to
 * the full-resolution PNG for anything that needs a closer look.
 */
const THUMB_WIDTH = 900
const THUMB_QUALITY = 72

async function thumbnailDataUri(path) {
  const buffer = await sharp(path).resize(THUMB_WIDTH).jpeg({ quality: THUMB_QUALITY }).toBuffer()
  return `data:image/jpeg;base64,${buffer.toString("base64")}`
}

const DEFAULT_ROOT = "output/mockup-brand-variety"
const PLATFORMS = [
  { key: "native-mobile-app", label: "Native mobile" },
  { key: "desktop-web", label: "Desktop web" },
]
const LABELS = ["A", "B", "C"]

function parseArgs(argv) {
  const args = { root: DEFAULT_ROOT }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) args.root = argv[++i]
  }
  return args
}

async function renderCell(root, idea, platform, kit) {
  const relative = `${idea.slug}/images/${platform.key}-option-${kit.label.toLowerCase()}.png`
  const present = existsSync(join(root, relative))

  const body = present
    ? `<a href="${escapeHtml(relative)}" target="_blank"><img loading="lazy" src="${await thumbnailDataUri(join(root, relative))}" alt="${escapeHtml(`${idea.title} ${platform.label} option ${kit.label}, kit ${kit.name}`)}"></a>`
    : `<div class="missing">not generated</div>`

  return `
      <figure>
        ${body}
        <figcaption>
          <span class="chip" style="background:${escapeHtml(kit.accentHex)}"></span>
          <b>${escapeHtml(kit.label)} &middot; ${escapeHtml(kit.name)}</b>
          <code>${escapeHtml(kit.accentHex)} &middot; hue ${kit.accentHue} &middot; ${escapeHtml(kit.surface)} &middot; ${kit.radius}px</code>
        </figcaption>
      </figure>`
}

async function renderIdea(root, idea) {
  const platforms = (await Promise.all(PLATFORMS.map(async (platform) => {
    const cells = await Promise.all(idea.kits.map((kit) => renderCell(root, idea, platform, kit)))
    return `
    <div class="platform">
      <h3>${escapeHtml(platform.label)}</h3>
      <div class="row">${cells.join("")}</div>
    </div>`
  }))).join("")

  const hues = idea.kits.map((kit) => kit.accentHue)
  const gaps = [
    hueDistance(hues[0], hues[1]),
    hueDistance(hues[1], hues[2]),
    hueDistance(hues[0], hues[2]),
  ]

  return `
  <section>
    <div class="idea-head">
      <h2>${escapeHtml(idea.title)}</h2>
      <span class="meta">${idea.kits.map((kit) => escapeHtml(kit.name)).join(" / ")} &middot; min hue gap ${Math.min(...gaps)}&deg;</span>
    </div>
    ${platforms}
  </section>`
}

function hueDistance(a, b) {
  const delta = Math.abs(a - b) % 360
  return delta > 180 ? 360 - delta : delta
}

async function render(root, manifest) {
  // Sequential per idea: unbounded Promise.all over 60 sharp decodes held every source
  // image and data URI in memory at once. Within one idea only six thumbnails are live.
  const renderedIdeas = []
  for (const idea of manifest.ideas) {
    renderedIdeas.push(await renderIdea(root, idea))
  }
  const ideas = renderedIdeas.join("")

  const allKits = manifest.ideas.flatMap((idea) => idea.kits)
  const swatches = [...new Map(allKits.map((kit) => [kit.name, kit])).values()]
    .sort((a, b) => a.accentHue - b.accentHue)
    .map((kit) => `<span class="legend-chip"><i style="background:${escapeHtml(kit.accentHex)}"></i>${escapeHtml(kit.name)}</span>`)
    .join("")

  return `<meta charset="utf-8">
<title>Mockup brand variety review</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px max(20px, 3vw) 96px; background: #f6f5f3; color: #1a1917;
         font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 32px; letter-spacing: -0.025em; margin: 0 0 10px; }
  .lede { max-width: 72ch; color: #57534e; margin: 0 0 20px; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 14px 0 0; border-top: 1px solid #e0ddd8; }
  .legend-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #57534e; }
  .legend-chip i { width: 12px; height: 12px; display: inline-block; }
  section { margin-top: 44px; padding-top: 22px; border-top: 1px solid #e0ddd8; }
  .idea-head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
  h2 { font-size: 22px; letter-spacing: -0.015em; margin: 0; }
  .meta { font: 11px/1 ui-monospace, monospace; letter-spacing: 0.06em; text-transform: uppercase; color: #8a837b; }
  .platform { margin-bottom: 20px; }
  h3 { font: 11px/1 ui-monospace, monospace; letter-spacing: 0.16em; text-transform: uppercase;
       color: #8a837b; margin: 0 0 8px; }
  .row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  figure { margin: 0; background: #fff; border: 1px solid #e0ddd8; }
  img { display: block; width: 100%; height: auto; }
  .missing { aspect-ratio: 2.33 / 1; display: flex; align-items: center; justify-content: center;
             color: #a8a29e; font-size: 12px; background: #faf9f8; }
  figcaption { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
               border-top: 1px solid #e0ddd8; padding: 9px 11px; }
  figcaption b { font-size: 12px; font-weight: 600; }
  figcaption code { font-size: 10px; color: #8a837b; }
  .chip { width: 13px; height: 13px; flex: none; }
  @media (max-width: 900px) { .row { grid-template-columns: 1fr; } }
</style>
<h1>Mockup brand variety review</h1>
<p class="lede">Ten real Maker Compass ideas, each rendered three ways from the fifteen-kit brand
bank. Same ideas, same screens, same directions, same skeletons as the previous batch: only the
brand specification is new. Read across a row for within-idea variety, and down the page for
across-idea variety, which is what the current pipeline fails.</p>
<div class="legend">${swatches}</div>
${ideas}
`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const manifestPath = join(args.root, "manifest.json")
  if (!existsSync(manifestPath)) throw new Error(`No manifest at ${manifestPath}. Run build-brand-variety-briefs.mjs first.`)

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const outPath = join(args.root, "index.html")
  writeFileSync(outPath, await render(args.root, manifest))

  let present = 0
  let expected = 0
  for (const idea of manifest.ideas) {
    for (const platform of PLATFORMS) {
      for (const label of LABELS) {
        expected++
        if (existsSync(join(args.root, idea.slug, "images", `${platform.key}-option-${label.toLowerCase()}.png`))) present++
      }
    }
  }

  console.log(`${outPath} written: ${present}/${expected} images present`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
