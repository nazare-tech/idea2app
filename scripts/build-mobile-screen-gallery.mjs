#!/usr/bin/env node

/**
 * Build 60 standalone mobile-screen crops and a static gallery from Maker Compass runs.
 *
 * Usage:
 *   node scripts/build-mobile-screen-gallery.mjs \
 *     --root output/maker-compass-skill-runs/2026-07-22 \
 *     --crop-map output/maker-compass-skill-runs/2026-07-22/mobile-screen-crops.json
 *
 * Side effects: creates a new HTML file, sibling asset directory, and derived manifest.
 * Existing outputs are never overwritten. Requires ImageMagick's `magick` executable.
 */

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { closeSync, lstatSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path"

import { escapeHtml } from "./lib/html.mjs"

const EXPECTED_DIRECTIONS = ["A", "B", "C"]
const PLATFORM = "native-mobile-app"

function usage() {
  return [
    "Usage: node scripts/build-mobile-screen-gallery.mjs --root <batch-root> [options]",
    "",
    "Options:",
    "  --crop-map <path>  Crop-map JSON (default: <root>/mobile-screen-crops.json)",
    "  --out <path>       HTML output (default: <root>/mobile-screens-gallery.html)",
    "  --help             Show this help",
  ].join("\n")
}

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--help") return { help: true }
    if (!["--root", "--crop-map", "--out"].includes(token)) {
      throw new Error(`Unknown argument: ${token}`)
    }
    const value = argv[index + 1]
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`)
    args[token.slice(2)] = value
    index += 1
  }
  if (!args.root) throw new Error("--root is required")
  return args
}

function readJson(path) {
  try {
    if (statSync(path).size > 1024 * 1024) throw new Error("JSON input exceeds 1 MiB safety bound")
    return JSON.parse(readFileSync(path, "utf8"))
  } catch (error) {
    throw new Error(`Cannot read JSON ${path}: ${error.message}`)
  }
}

function safeChild(root, path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.split(/[\\/]/).includes("..")) {
    throw new Error(`Unsafe relative path: ${path}`)
  }
  const candidate = resolve(root, path)
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`
  if (candidate !== root && !candidate.startsWith(prefix)) throw new Error(`Path escapes root: ${path}`)
  return candidate
}

function safeInputFile(root, path, expectedExtension) {
  const candidate = safeChild(root, path)
  let entry
  try {
    entry = lstatSync(candidate)
  } catch (error) {
    throw new Error(`Cannot inspect input ${path}: ${error.message}`)
  }
  if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`Input must be a regular file: ${path}`)
  if (expectedExtension && extname(candidate).toLowerCase() !== expectedExtension) {
    throw new Error(`Input must use ${expectedExtension}: ${path}`)
  }
  const realRoot = realpathSync(root)
  const realCandidate = realpathSync(candidate)
  const prefix = realRoot.endsWith(sep) ? realRoot : `${realRoot}${sep}`
  if (!realCandidate.startsWith(prefix)) throw new Error(`Input escapes run directory: ${path}`)
  return candidate
}

function imageMetadata(path) {
  let output
  try {
    output = execFileSync("magick", [
      "identify",
      "-limit", "memory", "256MiB",
      "-limit", "map", "512MiB",
      "-limit", "disk", "1GiB",
      "-limit", "time", "10",
      "-format", "%m %w %h", path,
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    }).trim()
  } catch (error) {
    throw new Error(`ImageMagick cannot inspect ${path}: ${error.stderr?.toString().trim() || error.message}`)
  }
  const [format, widthText, heightText] = output.split(/\s+/)
  const width = Number(widthText)
  const height = Number(heightText)
  if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error(`Invalid dimensions for ${path}`)
  return { format, width, height }
}

function pngHeaderDimensions(path) {
  const header = Buffer.alloc(24)
  const descriptor = openSync(path, "r")
  try {
    const bytesRead = readSync(descriptor, header, 0, header.length, 0)
    const signature = "89504e470d0a1a0a"
    if (bytesRead !== header.length || header.subarray(0, 8).toString("hex") !== signature || header.subarray(12, 16).toString("ascii") !== "IHDR") {
      throw new Error(`Invalid PNG header: ${path}`)
    }
    const width = header.readUInt32BE(16)
    const height = header.readUInt32BE(20)
    if (!width || !height || width * height > 10_000_000) throw new Error(`Unsafe PNG dimensions: ${width}x${height}`)
    return { width, height }
  } finally {
    closeSync(descriptor)
  }
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function discoverRuns(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .filter((runDir) => {
      try {
        return statSync(join(runDir, "manifest.json")).isFile()
      } catch {
        return false
      }
    })
    .sort((left, right) => left.localeCompare(right))
}

function validateCropMap(cropMap) {
  if (cropMap?.version !== "maker-compass-mobile-crops-v1") throw new Error("Unsupported crop-map version")
  for (const side of ["left", "right"]) {
    const box = cropMap.horizontal?.[side]
    if (!box || !Number.isInteger(box.x) || !Number.isInteger(box.width) || box.x < 0 || box.width < 300) {
      throw new Error(`Invalid horizontal crop for ${side}`)
    }
  }
  if (!cropMap.storyboards || typeof cropMap.storyboards !== "object" || Array.isArray(cropMap.storyboards)) {
    throw new Error("Crop map must contain a storyboards object")
  }
  if (!Array.isArray(cropMap.supportedSourceSizes) || !cropMap.supportedSourceSizes.length) {
    throw new Error("Crop map must contain supportedSourceSizes")
  }
  for (const size of cropMap.supportedSourceSizes) {
    if (!/^\d+x\d+$/.test(size)) throw new Error(`Invalid supported source size: ${size}`)
  }
  const supportedDimensions = cropMap.supportedSourceSizes.map((size) => size.split("x").map(Number))
  if (supportedDimensions.some(([width, height]) => width < 1000 || height < 700 || width * height > 10_000_000)) {
    throw new Error("Supported source sizes fall outside safety bounds")
  }
  const minimumWidth = Math.min(...supportedDimensions.map(([width]) => width))
  const minimumHeight = Math.min(...supportedDimensions.map(([, height]) => height))
  const left = cropMap.horizontal.left
  const right = cropMap.horizontal.right
  if (left.x + left.width > right.x) throw new Error("Left and right crop boxes must not overlap")
  if (right.x + right.width > minimumWidth) throw new Error("Horizontal crop boxes exceed supported source width")
  for (const [key, crop] of Object.entries(cropMap.storyboards)) {
    if (!crop || !Number.isInteger(crop.top) || crop.top < 0 || minimumHeight - crop.top < 700) {
      throw new Error(`Invalid vertical crop for ${key}`)
    }
  }
}

function collectJobs(root, cropMap, assetDirectoryName) {
  const runs = discoverRuns(root)
  if (runs.length !== 10) throw new Error(`Expected 10 run manifests, found ${runs.length}`)
  const jobs = []
  const sections = []

  for (const runDir of runs) {
    const manifest = readJson(safeInputFile(runDir, "manifest.json", ".json"))
    const title = typeof manifest.title === "string" ? manifest.title : relative(root, runDir)
    const slug = relative(root, runDir)
    if (slug.includes(sep)) throw new Error(`Run must be a direct child of root: ${slug}`)
    const designPlan = readJson(safeInputFile(runDir, `mockups/${PLATFORM}/design-plan.json`, ".json"))
    if (!Array.isArray(designPlan.screens) || designPlan.screens.length !== 2) {
      throw new Error(`${slug} mobile design plan must contain exactly two screens`)
    }
    const images = Array.isArray(manifest.images)
      ? manifest.images.filter((image) => image?.platform === PLATFORM)
      : []
    if (images.length !== 3) throw new Error(`${slug} must contain exactly three mobile images`)
    const directions = images.map((image) => image.direction).sort()
    if (JSON.stringify(directions) !== JSON.stringify(EXPECTED_DIRECTIONS)) {
      throw new Error(`${slug} mobile directions must be A, B, C`)
    }

    const optionGroups = []
    for (const image of images.sort((left, right) => left.direction.localeCompare(right.direction))) {
      if (image.status !== "complete" || image.visualQa !== "passed") {
        throw new Error(`Image is not complete and visually passed: ${slug}/${image.path}`)
      }
      const source = safeInputFile(runDir, image.path, ".png")
      const sourceStats = statSync(source)
      if (sourceStats.size < 1024 || sourceStats.size > 32 * 1024 * 1024) {
        throw new Error(`Source image size outside 1 KiB–32 MiB safety bound: ${slug}/${image.path}`)
      }
      const headerDimensions = pngHeaderDimensions(source)
      if (!cropMap.supportedSourceSizes.includes(`${headerDimensions.width}x${headerDimensions.height}`)) {
        throw new Error(`Unsupported source dimensions: ${slug}/${image.path} is ${headerDimensions.width}x${headerDimensions.height}`)
      }
      const metadata = imageMetadata(source)
      if (metadata.format !== "PNG") throw new Error(`Source is not a PNG: ${slug}/${image.path}`)
      const dimensions = { width: metadata.width, height: metadata.height }
      if (dimensions.width !== headerDimensions.width || dimensions.height !== headerDimensions.height) {
        throw new Error(`PNG header and decoded dimensions disagree: ${slug}/${image.path}`)
      }
      if (!/^[a-f0-9]{64}$/.test(image.sha256 || "") || sha256(source) !== image.sha256) {
        throw new Error(`Source hash does not match validated manifest: ${slug}/${image.path}`)
      }
      const cropKey = `${slug}/option-${image.direction.toLowerCase()}`
      const crop = cropMap.storyboards[cropKey]
      if (!crop || !Number.isInteger(crop.top) || crop.top < 0) throw new Error(`Missing crop top: ${cropKey}`)
      const cards = []
      for (const [screenIndex, side] of ["left", "right"].entries()) {
        const horizontal = cropMap.horizontal[side]
        if (horizontal.x + horizontal.width > dimensions.width || crop.top >= dimensions.height) {
          throw new Error(`Crop is outside ${cropKey}: ${side}`)
        }
        const assetRelative = `${slug}/${PLATFORM}-option-${image.direction.toLowerCase()}-screen-${screenIndex + 1}.png`
        const outputRelative = `${assetDirectoryName}/${assetRelative}`
        const screenName = designPlan.screens[screenIndex]?.name
        if (typeof screenName !== "string" || !screenName.trim()) throw new Error(`Missing screen name: ${slug} screen ${screenIndex + 1}`)
        const job = {
          source,
          sourceRelative: relative(root, source).split(sep).join("/"),
          assetRelative,
          outputRelative,
          direction: image.direction,
          screenIndex: screenIndex + 1,
          screenName,
          crop: {
            x: horizontal.x,
            y: crop.top,
            width: horizontal.width,
            height: dimensions.height - crop.top,
          },
          sourceDimensions: dimensions,
        }
        jobs.push(job)
        cards.push(job)
      }
      optionGroups.push({ direction: image.direction, cards })
    }
    sections.push({ title, slug, optionGroups })
  }

  const expectedKeys = new Set(jobs.filter((job) => job.screenIndex === 1).map((job) => `${job.outputRelative.split("/")[1]}/option-${job.direction.toLowerCase()}`))
  const suppliedKeys = new Set(Object.keys(cropMap.storyboards))
  if (expectedKeys.size !== 30 || suppliedKeys.size !== 30 || [...expectedKeys].some((key) => !suppliedKeys.has(key))) {
    throw new Error("Crop map must exactly match the 30 discovered storyboards")
  }
  if (jobs.length !== 60) throw new Error(`Expected 60 crop jobs, found ${jobs.length}`)
  return { jobs, sections }
}

function renderGallery(sections, backHref) {
  const sectionHtml = sections.map((section) => {
    const groups = section.optionGroups.map((group) => {
      const cards = group.cards.map((card) => {
        const label = `${section.title} · Option ${group.direction} · Screen ${card.screenIndex} · ${card.screenName}`
        // Emit the crop's real dimensions so each lazy card reserves its space
        // up front. Without them 60 full-size images pop in at caption height
        // and shove the reader's scroll position on every load.
        return `<figure><img loading="lazy" width="${card.crop.width}" height="${card.crop.height}" src="${escapeHtml(card.outputRelative)}" alt="${escapeHtml(label)}"><figcaption><span>Screen ${card.screenIndex}</span>${escapeHtml(card.screenName)}</figcaption></figure>`
      }).join("")
      return `<article class="option"><div class="option-label">Option ${escapeHtml(group.direction)}</div><div class="pair">${cards}</div></article>`
    }).join("")
    return `<section id="${escapeHtml(section.slug)}"><div class="section-heading"><p>Product</p><h2>${escapeHtml(section.title)}</h2></div>${groups}</section>`
  }).join("")

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maker Compass · Individual Mobile Screens</title><style>
:root{color-scheme:light;--ink:#171512;--muted:#746e66;--line:#d8d2ca;--paper:#f4f1ec;--card:#fff;--accent:#ca4b2d}*{box-sizing:border-box}@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit}header{border-bottom:1px solid var(--line);padding:64px max(24px,5vw) 48px;background:#faf8f4}.eyebrow,.section-heading p,.option-label{margin:0;color:var(--accent);font:700 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}h1{max-width:900px;margin:14px 0 18px;font:600 clamp(38px,6vw,76px)/.96 Georgia,serif;letter-spacing:-.04em}.lede{max-width:740px;margin:0;color:var(--muted);font-size:17px}.summary{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}.summary span,.back{border:1px solid var(--line);background:var(--card);padding:9px 12px;text-decoration:none}.back{display:inline-block;margin-top:16px}main{max-width:1500px;margin:auto;padding:24px max(16px,3vw) 96px}section{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:28px;padding:56px 0;border-bottom:1px solid var(--line)}.section-heading{position:sticky;top:20px;align-self:start;grid-column:1;grid-row:1 / span 3}.section-heading h2{margin:8px 0 0;font:600 32px/1.05 Georgia,serif;letter-spacing:-.025em}.option{display:grid;grid-column:2;grid-template-columns:78px 1fr;gap:14px;align-items:start;margin-bottom:24px}.option:last-child{margin-bottom:0}.option-label{padding-top:12px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}figure{margin:0;overflow:hidden;border:1px solid var(--line);background:var(--card)}img{display:block;width:100%;height:auto;background:white}figcaption{display:flex;gap:10px;align-items:baseline;border-top:1px solid var(--line);padding:12px 14px;color:var(--muted)}figcaption span{color:var(--ink);font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase}@media(max-width:760px){header{padding-top:40px}section{grid-template-columns:1fr}.section-heading{position:static;grid-column:1;grid-row:auto}.option{grid-column:1;grid-template-columns:1fr}.pair{grid-template-columns:1fr}.option-label{padding-top:0;margin-top:14px}}
</style></head><body><header><p class="eyebrow">Maker Compass · Mobile study</p><h1>Individual mobile screens</h1><p class="lede">Each two-screen storyboard split into standalone device views. Original captions removed; complete device frames, shadows, and generous bottom spacing preserved.</p><div class="summary"><span>10 ideas</span><span>30 storyboards</span><span>60 screens</span></div><a class="back" href="${escapeHtml(backHref)}">View original mixed gallery</a></header><main>${sectionHtml}</main></body></html>`
}

function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    console.error(usage())
    process.exit(2)
  }
  if (args.help) {
    console.log(usage())
    return
  }

  const root = resolve(args.root)
  const cropMapPath = resolve(args["crop-map"] || join(root, "mobile-screen-crops.json"))
  const output = resolve(args.out || join(root, "mobile-screens-gallery.html"))
  const outputDir = dirname(output)
  mkdirSync(outputDir, { recursive: true })
  if (extname(output).toLowerCase() !== ".html") throw new Error("--out must end with .html")
  const outputStem = basename(output, extname(output))
  const assetDirectoryName = `${outputStem}-assets`
  const assetRoot = join(outputDir, assetDirectoryName)
  const derivedManifestPath = join(outputDir, `${outputStem}-manifest.json`)
  for (const path of [output, assetRoot, derivedManifestPath]) {
    try {
      statSync(path)
      throw new Error(`Refusing to overwrite existing output: ${path}`)
    } catch (error) {
      if (error.code !== "ENOENT") throw error
    }
  }

  const cropMap = readJson(cropMapPath)
  validateCropMap(cropMap)
  try {
    execFileSync("magick", ["-version"], { stdio: ["ignore", "ignore", "pipe"] })
  } catch (error) {
    throw new Error(`ImageMagick is unavailable: ${error.message}`)
  }
  const { jobs, sections } = collectJobs(root, cropMap, assetDirectoryName)
  const stagingRoot = mkdtempSync(join(outputDir, `.${outputStem}-staging-`))
  const stagingAssetRoot = join(stagingRoot, assetDirectoryName)
  const stagingHtml = join(stagingRoot, basename(output))
  const stagingManifest = join(stagingRoot, basename(derivedManifestPath))
  mkdirSync(stagingAssetRoot, { recursive: true })
  const published = []
  try {
    const outputRecords = []
    for (const job of jobs) {
      const outputPath = safeChild(stagingAssetRoot, job.assetRelative)
      mkdirSync(dirname(outputPath), { recursive: true })
      const geometry = `${job.crop.width}x${job.crop.height}+${job.crop.x}+${job.crop.y}`
      execFileSync("magick", [
        "-limit", "memory", "256MiB",
        "-limit", "map", "512MiB",
        "-limit", "disk", "1GiB",
        "-limit", "time", "30",
        job.source,
        "-crop", geometry,
        "+repage",
        outputPath,
      ], { stdio: ["ignore", "ignore", "pipe"], timeout: 45_000, maxBuffer: 1024 * 1024 })
      const metadata = imageMetadata(outputPath)
      if (metadata.format !== "PNG" || metadata.width !== job.crop.width || metadata.height !== job.crop.height) {
        throw new Error(`Unexpected crop output: ${outputPath}`)
      }
      outputRecords.push({
        source: job.sourceRelative,
        output: job.outputRelative,
        direction: job.direction,
        screen: job.screenIndex,
        screenName: job.screenName,
        crop: job.crop,
        sourceDimensions: job.sourceDimensions,
        sha256: sha256(outputPath),
      })
    }

    const backHref = relative(outputDir, join(root, "gallery.html")).split(sep).join("/") || "gallery.html"
    const sourceRoot = relative(outputDir, root).split(sep).join("/") || "."
    writeFileSync(stagingHtml, renderGallery(sections, backHref), "utf8")
    writeFileSync(stagingManifest, `${JSON.stringify({
      version: "maker-compass-mobile-screen-gallery-v1",
      sourceRoot,
      ideaCount: sections.length,
      storyboardCount: jobs.length / 2,
      screenCount: jobs.length,
      outputs: outputRecords,
    }, null, 2)}\n`, "utf8")
    renameSync(stagingAssetRoot, assetRoot)
    published.push(assetRoot)
    renameSync(stagingHtml, output)
    published.push(output)
    renameSync(stagingManifest, derivedManifestPath)
    published.push(derivedManifestPath)
    console.log(JSON.stringify({
      html: output,
      assets: assetRoot,
      manifest: derivedManifestPath,
      ideas: sections.length,
      storyboards: jobs.length / 2,
      screens: jobs.length,
    }))
  } catch (error) {
    for (const path of published.reverse()) rmSync(path, { recursive: true, force: true })
    throw error
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true })
  }
}

try {
  main()
} catch (error) {
  console.error(`Error: ${error.message}`)
  process.exit(1)
}
