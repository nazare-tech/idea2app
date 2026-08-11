#!/usr/bin/env node
/**
 * Builds the compact runtime catalog from the pinned UI/UX Pro Max CSV snapshot.
 * Usage: node scripts/generate-pro-max-style-catalog.mjs [--check|--refresh-fixtures]
 * Normal generation uses frozen local fixtures: no network, Python, model, or paid API.
 */

import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceRoot = join(repoRoot, ".agents/skills/ui-ux-pro-max/data")
const searchScriptPath = join(repoRoot, ".agents/skills/ui-ux-pro-max/scripts/search.py")
const fixturePath = join(repoRoot, "vendor/ui-ux-pro-max/product-design-systems.json")
const outputPath = join(repoRoot, "src/lib/mockups/pro-max-style-catalog.generated.ts")
const checkOnly = process.argv.includes("--check")
const refreshFixtures = process.argv.includes("--refresh-fixtures")
const CATALOG_VERSION = "ui-ux-pro-max-v2.14.1"

const EXPECTED_PINNED_HASHES = {
  "data/styles.csv": "1bf9c1d8484a0a7a54fb67555902380446865b604c8449e47a449cb3d9c1ef88",
  "data/colors.csv": "cb26759805217edaaa31b09836aec09eab0fe245c58f5884e9a16ef802c6e26a",
  "data/typography.csv": "7abead73de0e43e09544f164cb60cd431674e411f1e063e555a8b44d51273328",
  "data/products.csv": "e9749e4fd8f7d4c94919c25ebd347a4adaddb671e7b01d33fbc2c87d447e6667",
  "data/ui-reasoning.csv": "06e4369445388ba9b7a57347510b125b7a2145bbf8546a327ba50292503b204a",
  "scripts/search.py": "69a349d69543f35f45a12c0c82922c550d1b0a16a2b37f6b1406afb2ad2919c8",
  "scripts/core.py": "64c149019196ee24647464a27278eb96d3b4638ded73ebfc35ccd2bc99c083a9",
  "scripts/design_system.py": "64b14f27f55e19358214cd92388f6aae01e46a13d51fe270ddc0d2dac8298d8f",
}

for (const [relativePath, expectedHash] of Object.entries(EXPECTED_PINNED_HASHES)) {
  const contents = await readFile(join(repoRoot, ".agents/skills/ui-ux-pro-max", relativePath))
  const actualHash = createHash("sha256").update(contents).digest("hex")
  if (actualHash !== expectedHash) {
    throw new Error(`Pinned UI/UX Pro Max source drifted: ${relativePath}`)
  }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else quoted = !quoted
    } else if (char === "," && !quoted) {
      row.push(field)
      field = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1
      row.push(field)
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ""
    } else field += char
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  const [headers, ...values] = rows
  return values.map((valuesRow) => Object.fromEntries(headers.map((header, index) => [header, valuesRow[index] ?? ""])))
}

function clip(value, max) {
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

function tokens(value, max = 12) {
  return [...new Set(String(value).toLowerCase().match(/[a-z0-9]+/g) ?? [])].slice(0, max)
}

function hash(value) {
  let result = 2166136261
  for (const char of value) {
    result ^= char.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

const STYLE_NAMES = [
  "Minimalism & Swiss Style", "Glassmorphism", "Brutalism", "Vibrant & Block-based",
  "Dark Mode (OLED)", "Aurora UI", "Retro-Futurism", "Flat Design", "Bento Box Grid",
  "Organic Biophilic", "Exaggerated Minimalism", "Swiss Modernism 2.0", "Accessible & Ethical",
  "AI-Native UI", "Motion-Driven", "Gen Z Chaos", "Claymorphism (Mobile)",
  "Bold Typography (Mobile)",
]

// Prompt-facing prose is locally reviewed and keyed to exact upstream style names.
// Raw CSV guidance is useful during design review but never enters paid prompts.
const STYLE_PROMPT_GUIDANCE = {
  "Minimalism & Swiss Style": { motifs: ["strict grid", "white space", "thin rules"], effects: "subtle opacity changes; fast state transitions", avoid: "decorative clutter; weak hierarchy" },
  Glassmorphism: { motifs: ["frosted panels", "layered depth", "light borders"], effects: "restrained background blur; soft depth transitions", avoid: "low contrast; dense critical data" },
  Brutalism: { motifs: ["visible grid", "block divisions", "stark type"], effects: "instant state changes; hard hover shifts", avoid: "soft ornamental styling; unclear hierarchy" },
  "Vibrant & Block-based": { motifs: ["bold blocks", "geometric sections", "high contrast"], effects: "direct color shifts; short section transitions", avoid: "formal conservative tone; excessive saturation" },
  "Dark Mode (OLED)": { motifs: ["deep canvas", "luminous focus", "crisp separators"], effects: "restrained focus glow; low-motion reveals", avoid: "muddy contrast; decorative neon" },
  "Aurora UI": { motifs: ["color fields", "layered light", "soft depth"], effects: "slow ambient color shift; gentle reveal", avoid: "dense dashboards; low text contrast" },
  "Retro-Futurism": { motifs: ["technical grid", "signal lines", "display labels"], effects: "brief scan transition; restrained signal glow", avoid: "novelty chrome; unreadable display text" },
  "Flat Design": { motifs: ["flat planes", "simple icons", "clear shapes"], effects: "fast opacity shift; direct color transition", avoid: "ornamental depth; ambiguous controls" },
  "Bento Box Grid": { motifs: ["modular tiles", "varied spans", "clear grouping"], effects: "small hover lift; smooth panel transition", avoid: "card soup; fragmented reading order" },
  "Organic Biophilic": { motifs: ["organic curves", "earth tones", "natural rhythm"], effects: "soft elevation change; calm shape transition", avoid: "decorative foliage; low-contrast green text" },
  "Exaggerated Minimalism": { motifs: ["oversized type", "negative space", "single focal point"], effects: "direct type reveal; minimal transition", avoid: "dense workflows; competing focal points" },
  "Swiss Modernism 2.0": { motifs: ["modular grid", "asymmetric alignment", "rational type"], effects: "precise underline shift; fast panel transition", avoid: "playful ornament; loose alignment" },
  "Accessible & Ethical": { motifs: ["visible focus", "plain labels", "clear states"], effects: "reduced-motion transition; immediate feedback", avoid: "color-only status; hidden controls" },
  "AI-Native UI": { motifs: ["context cards", "streaming state", "command surface"], effects: "short staged reveal; clear progress transition", avoid: "sparkle branding; opaque automation" },
  "Motion-Driven": { motifs: ["sequenced layers", "directional flow", "responsive controls"], effects: "purposeful entrance; linked state transition", avoid: "continuous motion; motion-only meaning" },
  "Gen Z Chaos": { motifs: ["collage blocks", "mixed scale", "expressive labels"], effects: "brief jitter accent; direct layer shift", avoid: "critical trust flows; uncontrolled clutter" },
  "Claymorphism (Mobile)": { motifs: ["tactile controls", "soft volumes", "rounded forms"], effects: "short press compression; spring release", avoid: "dense enterprise data; weak contrast" },
  "Bold Typography (Mobile)": { motifs: ["poster type", "edge alignment", "large intervals"], effects: "direct headline reveal; underline transition", avoid: "icon-heavy utility screens; crowded copy" },
}

const STYLE_ALIASES = {
  "3d hyperrealism": "Glassmorphism",
  "3d product preview": "Glassmorphism",
  "anti polish raw": "Brutalism",
  "biomimetic organic 2 0": "Organic Biophilic",
  "bitcoin defi mobile": "Dark Mode (OLED)",
  claymorphism: "Claymorphism (Mobile)",
  "claymorphism for patients": "Claymorphism (Mobile)",
  "clean science": "Swiss Modernism 2.0",
  "conversion optimized": "Flat Design",
  "cyberpunk ui": "Retro-Futurism",
  "dark mode": "Dark Mode (OLED)",
  "data dense": "Bento Box Grid",
  "data dense dashboard": "Bento Box Grid",
  "e ink paper": "Minimalism & Swiss Style",
  "editorial grid": "Swiss Modernism 2.0",
  "feature rich": "Bento Box Grid",
  "flat design mobile touch first": "Flat Design",
  "gen z chaos maximalism": "Gen Z Chaos",
  "heat map heatmap": "Vibrant & Block-based",
  "high imagery": "Exaggerated Minimalism",
  "holographic hud": "Retro-Futurism",
  "hud sci fi fui": "Retro-Futurism",
  "inclusive design": "Accessible & Ethical",
  "liquid glass": "Glassmorphism",
  "masonry grid": "Bento Box Grid",
  "micro interactions": "Motion-Driven",
  minimal: "Minimalism & Swiss Style",
  "minimal direct": "Minimalism & Swiss Style",
  minimalism: "Minimalism & Swiss Style",
  "minimalism frame": "Minimalism & Swiss Style",
  neubrutalism: "Brutalism",
  "neo brutalism mobile": "Brutalism",
  neumorphism: "Flat Design",
  "neumorphism mobile": "Flat Design",
  parallax: "Motion-Driven",
  "pixel art": "Retro-Futurism",
  "real time monitor": "Dark Mode (OLED)",
  "real time monitoring": "Dark Mode (OLED)",
  "kinetic brutalism mobile": "Brutalism",
  "sketch hand drawn": "Organic Biophilic",
  "soft ui evolution": "Flat Design",
  "spatial ui": "Glassmorphism",
  "spatial ui visionos": "Glassmorphism",
  "storytelling driven": "Motion-Driven",
  "swiss modernism": "Swiss Modernism 2.0",
  "trust authority": "Swiss Modernism 2.0",
  "vibrant block": "Vibrant & Block-based",
  "zero interface": "AI-Native UI",
}

const [styleRows, colorRows, fontRows, productRows] = await Promise.all([
  "styles.csv", "colors.csv", "typography.csv", "products.csv",
].map(async (name) => parseCsv(await readFile(join(sourceRoot, name), "utf8"))))

if (refreshFixtures) {
  const items = []
  for (const [index, row] of productRows.entries()) {
    const query = `${row["Product Type"]} ${row.Keywords}`
    const result = spawnSync("python3", [
      searchScriptPath,
      query,
      "--design-system",
      "--json",
      "--project-name",
      row["Product Type"],
    ], { cwd: repoRoot, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 })
    if (result.status !== 0) {
      throw new Error(`UI/UX Pro Max fixture refresh failed for ${row["Product Type"]}: ${result.stderr || result.stdout}`)
    }
    const parsed = JSON.parse(result.stdout)
    if (!parsed.design_system) throw new Error(`Missing design_system fixture for ${row["Product Type"]}`)
    items.push({ productId: `p${row.No}`, query, designSystem: parsed.design_system })
    if ((index + 1) % 25 === 0) console.log(`Refreshed ${index + 1}/${productRows.length} design systems.`)
  }
  await mkdir(dirname(fixturePath), { recursive: true })
  await writeFile(fixturePath, `${JSON.stringify({
    version: CATALOG_VERSION,
    command: "python3 scripts/search.py <product query> --design-system --json",
    items,
  }, null, 2)}\n`)
  console.log(`Wrote ${fixturePath} (${items.length} design systems).`)
}

const frozenFixtureContents = await readFile(fixturePath, "utf8")
const frozenFixtureHash = createHash("sha256").update(frozenFixtureContents).digest("hex")
if (frozenFixtureHash !== "2dee4cdf117b8983c4adac495157cdb57de8235f42c0ecd62fe2b7a325e26576") {
  throw new Error("Frozen UI/UX Pro Max design-system fixture drifted")
}
const frozenDesignSystems = JSON.parse(frozenFixtureContents)
if (frozenDesignSystems.version !== CATALOG_VERSION) {
  throw new Error(`Unexpected Pro Max fixture version: ${frozenDesignSystems.version}`)
}
if (!Array.isArray(frozenDesignSystems.items) || frozenDesignSystems.items.length !== productRows.length) {
  throw new Error(`Expected ${productRows.length} frozen design systems`)
}
const designSystemByProductId = new Map(
  frozenDesignSystems.items.map((item) => [item.productId, item.designSystem]),
)

const normalizedStyleName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
const sourceStyles = STYLE_NAMES.map((wanted) => {
  const exact = styleRows.find((row) => normalizedStyleName(row["Style Category"]) === normalizedStyleName(wanted))
  const loose = styleRows.find((row) => normalizedStyleName(row["Style Category"]).includes(normalizedStyleName(wanted).replace(" minimalism swiss style", "minimalism")))
  const row = exact ?? loose
  if (!row) throw new Error(`Missing pinned style row: ${wanted}`)
  const guidance = STYLE_PROMPT_GUIDANCE[wanted]
  if (!guidance) throw new Error(`Missing reviewed prompt guidance: ${wanted}`)
  return {
    id: `s${row.No}`,
    name: clip(row["Style Category"], 80),
    keywords: guidance.motifs,
    effects: guidance.effects,
    avoid: guidance.avoid,
    complexity: clip(row.Complexity, 12).toLowerCase(),
  }
})

const sourceFonts = fontRows.map((row) => {
  return {
    id: `f${row.No}`,
    name: clip(row["Font Pairing Name"], 80),
    heading: clip(row["Heading Font"], 80),
    body: clip(row["Body Font"], 80),
  }
})

function resolveRecommendedStyle(recommendation) {
  const normalized = normalizedStyleName(recommendation)
  if (!normalized) return null
  const targetName = STYLE_ALIASES[normalized] ?? recommendation
  const target = normalizedStyleName(targetName)
  const match = sourceStyles.findIndex((style) => {
    const name = normalizedStyleName(style.name)
    return target === name || name.includes(target) || target.includes(name)
  })
  if (match < 0) throw new Error(`Unsupported upstream style recommendation: ${recommendation}`)
  return match
}

const colorsByProduct = new Map(colorRows.map((row) => [row["Product Type"], row]))
function colorHex(value, fallback) {
  return String(value).match(/#[0-9a-f]{6}\b/i)?.[0].toUpperCase() ?? fallback
}

function selectFontTriad(designSystem, seed, productName) {
  const foundation = sourceFonts.findIndex((font) =>
    font.heading === designSystem.typography?.heading && font.body === designSystem.typography?.body)
  if (foundation < 0) {
    throw new Error(`Frozen design-system typography missing from pinned rows for ${productName}`)
  }
  const choices = [foundation]
  const safeSecondaryNames = [
    "Minimal Swiss", "Modern Professional", "Geometric Modern", "Developer Mono",
    "Editorial Classic", "Bold Statement", "Tech Startup", "Playful Creative",
  ]
  const safeSecondaryIndexes = safeSecondaryNames.map((name) => {
    const index = sourceFonts.findIndex((font) => font.name === name)
    if (index < 0) throw new Error(`Missing reviewed secondary typography: ${name}`)
    return index
  })
  for (let offset = 0; choices.length < 3 && offset < safeSecondaryIndexes.length; offset += 1) {
    const candidate = safeSecondaryIndexes[(seed + offset) % safeSecondaryIndexes.length]
    if (choices.includes(candidate)) continue
    if (choices.some((index) => sourceFonts[index].heading === sourceFonts[candidate].heading)) continue
    choices.push(candidate)
  }
  if (choices.length !== 3) throw new Error(`Could not build font triad for ${productName}`)
  return choices
}

const products = productRows.map((row) => {
  const productId = `p${row.No}`
  const designSystem = designSystemByProductId.get(productId)
  if (!designSystem) throw new Error(`Missing frozen design system for ${productId}`)
  const color = colorsByProduct.get(row["Product Type"]) ?? colorRows[0]
  const seed = hash(row["Product Type"])
  const primaryParts = row["Primary Style Recommendation"].split("+").map((part) => part.trim())
  const secondaryParts = row["Secondary Styles"].split(",").map((part) => part.trim())
  const foundation = resolveRecommendedStyle(designSystem.style?.name ?? primaryParts[0])
  if (foundation === null) throw new Error(`Missing primary style for ${row["Product Type"]}`)
  const fallbackStyles = [12, 8, 7, 14, 0, 11]
  const distinctiveCandidate = resolveRecommendedStyle(primaryParts[1] ?? secondaryParts[0])
  const distinctive = distinctiveCandidate !== null && distinctiveCandidate !== foundation
    ? distinctiveCandidate
    : fallbackStyles.find((candidate) => candidate !== foundation)
  const experimentalCandidate = resolveRecommendedStyle(secondaryParts[1] ?? secondaryParts[0])
  const experimental = experimentalCandidate !== null
    && experimentalCandidate !== foundation
    && experimentalCandidate !== distinctive
    ? experimentalCandidate
    : fallbackStyles.find((candidate) => candidate !== foundation && candidate !== distinctive)
  if (distinctive === undefined || experimental === undefined) {
    throw new Error(`Could not build distinct style triad for ${row["Product Type"]}`)
  }
  return {
    id: productId,
    name: clip(row["Product Type"], 80),
    keywords: tokens(`${row.Keywords} ${row["Product Type"]}`, 14),
    styles: [foundation, distinctive, experimental],
    fonts: selectFontTriad(designSystem, seed, row["Product Type"]),
    pattern: clip(designSystem.pattern?.name ?? "Product workspace", 80),
    decisionRules: Object.values(designSystem.decision_rules ?? {})
      .map((value) => clip(String(value).toLowerCase().replace(/[^a-z0-9 -]/g, " ").replace(/-/g, " "), 100))
      .filter(Boolean)
      .slice(0, 3),
    palette: [
      colorHex(designSystem.colors?.background, colorHex(color.Background, "#F8FAFC")),
      colorHex(color.Card, "#FFFFFF"),
      colorHex(designSystem.colors?.primary, colorHex(color.Primary, "#2563EB")),
      colorHex(designSystem.colors?.cta ?? designSystem.colors?.accent, colorHex(color.Accent, "#EA580C")),
      colorHex(designSystem.colors?.foreground ?? designSystem.colors?.text, colorHex(color.Foreground, "#1E293B")),
      colorHex(color["Muted Foreground"], "#64748B"),
      colorHex(designSystem.colors?.border, colorHex(color.Border, "#E2E8F0")),
      colorHex(designSystem.colors?.destructive, colorHex(color.Destructive, "#DC2626")),
    ],
  }
})

const inputDigest = createHash("sha256")
for (const name of ["styles.csv", "colors.csv", "typography.csv", "products.csv"]) {
  inputDigest.update(await readFile(join(sourceRoot, name)))
}
inputDigest.update(await readFile(fixturePath))

const output = `// Generated by scripts/generate-pro-max-style-catalog.mjs. Do not edit.\n` +
  `export const PRO_MAX_GENERATED_CATALOG = ${JSON.stringify({
    version: CATALOG_VERSION,
    inputSha256: inputDigest.digest("hex"),
    styles: sourceStyles,
    fonts: sourceFonts,
    products,
  })} as const\n`

if (Buffer.byteLength(output) >= 100_000) throw new Error(`Generated catalog exceeds 100 KB (${Buffer.byteLength(output)} bytes)`)

if (checkOnly) {
  const current = await readFile(outputPath, "utf8")
  if (current !== output) throw new Error("Generated Pro Max catalog is stale. Run the generator without --check.")
  console.log(`Pro Max catalog is current (${Buffer.byteLength(output)} bytes).`)
} else {
  await writeFile(outputPath, output)
  console.log(`Wrote ${outputPath} (${Buffer.byteLength(output)} bytes).`)
}
