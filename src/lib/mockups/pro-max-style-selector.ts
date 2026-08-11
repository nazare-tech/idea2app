import type { MockupDesignPlan, MockupPrimaryPlatform } from "@/lib/mockups/design-plan"

import {
  isMockupBrandDirectionsEnabled,
  selectMockupBrandTriad,
  type MockupBrandKit,
} from "./brand-directions"
import { PRO_MAX_GENERATED_CATALOG } from "./pro-max-style-catalog.generated"
import {
  PRO_MAX_FIELD_CAPS,
  PRO_MAX_STYLE_SELECTION_MAX_BYTES,
  PRO_MAX_TREATMENT_PROMPT_MAX_CHARS,
  type MockupStyleSelection,
  type ProMaxDensity,
  type ProMaxTreatmentTier,
  type ProMaxTreatmentTriad,
  type ProMaxVisualTreatment,
} from "./pro-max-style-types"

const TIERS = ["foundation", "distinctive", "experimental"] as const
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const UNSAFE_TEXT = /[\u0000-\u001f\u007f]|https?:\/\/|```|(?:^|\s)(?:system|assistant|developer|user)\s*:|\b(?:ignore|disregard|override)\b.{0,32}\b(?:instruction|prompt)\b/i
const MOBILE_PLATFORMS = new Set<MockupPrimaryPlatform>(["mobile-web", "native-mobile-app"])

// The upstream product catalog is optimized for short search queries. Design plans
// describe workflows instead, so these reviewed hints bridge common product language
// to the nearest upstream category without copying user text into the prompt.
const PRODUCT_HINTS: Readonly<Record<string, readonly string[]>> = {
  p3: ["return", "returns", "sku"],
  p5: ["agency", "contractor", "evidence", "margin", "provenance", "scope"],
  p7: ["attribution", "confidence", "revenue"],
  p9: ["cohort", "mentor", "mentoring", "mentee"],
  p50: ["crop", "field", "grower", "harvest"],
  p55: ["fieldservice", "jobsite", "technician", "workorder"],
  p70: ["handoff", "readiness", "turnover", "venue"],
  p81: ["agent", "canary", "diff", "rollout"],
  p137: ["archive", "genealogy", "kinship", "oralhistory", "relative", "stories"],
} as const
const GENERIC_DESIGN_PLAN_TOKENS = new Set([
  "complete", "completed", "completes", "core", "flow", "populated", "ready",
  "screen", "state", "user", "workflow", "workspace",
])

type CatalogProduct = (typeof PRO_MAX_GENERATED_CATALOG.products)[number]

export interface SelectMockupStyleSelectionInput {
  designPlan: MockupDesignPlan
  projectId: string
  productContext?: string
}

export function buildMockupStyleProductContext({
  projectName,
  idea,
  intakeContext,
  productPlan,
  mvpPlan,
}: {
  projectName?: string
  idea?: string
  intakeContext?: string
  productPlan?: string
  mvpPlan?: string
}) {
  return [projectName, idea, intakeContext, productPlan, mvpPlan]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n")
}

export function isMockupProMaxEnabled() {
  const value = process.env.MOCKUP_PROMAX_ENABLED?.trim().toLowerCase()
  return value !== "0" && value !== "false"
}

function compactText(value: string, max: number) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

function splitGuidance(value: string) {
  return value.split(/[,;]/).map((item) => compactText(item, PRO_MAX_FIELD_CAPS.arrayItem)).filter(Boolean).slice(0, PRO_MAX_FIELD_CAPS.maxArrayItems)
}

function tokenize(value: string) {
  return new Set(
    (value.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((token) => !GENERIC_DESIGN_PLAN_TOKENS.has(token)),
  )
}

function designPlanProductContext(plan: MockupDesignPlan, stableProductContext?: string) {
  return [
    stableProductContext,
    plan.targetUser,
    plan.happyPathScenario,
    ...plan.screens.flatMap((screen) => [screen.name, screen.purpose, screen.happyPathState, ...screen.dataToShow]),
    ...plan.directions.flatMap((direction) => [
      direction.name,
      direction.layoutStrategy,
      direction.navigationPattern,
      direction.visualTone,
      ...direction.reusableMotifs,
    ]),
  ].join(" ")
}

function productScore(product: CatalogProduct, context: ReadonlySet<string>) {
  let score = 0
  for (const keyword of product.keywords) {
    if (!context.has(keyword)) continue
    score += keyword.length >= 8 ? 4 : keyword.length >= 5 ? 2 : 1
  }
  for (const keyword of PRODUCT_HINTS[product.id] ?? []) {
    if (!context.has(keyword)) continue
    score += (keyword.length >= 8 ? 4 : keyword.length >= 5 ? 2 : 1) + 2
  }
  return score
}

function selectCatalogProduct(plan: MockupDesignPlan, stableProductContext?: string) {
  const context = tokenize(designPlanProductContext(plan, stableProductContext))
  let best: CatalogProduct | null = null
  let bestScore = 0
  for (const product of PRO_MAX_GENERATED_CATALOG.products) {
    const score = productScore(product, context)
    if (score > bestScore) {
      best = product
      bestScore = score
    }
  }
  // One meaningful five-character match is enough; short generic tokens such as
  // "app" score below this threshold and cannot classify a plan on their own.
  return bestScore >= 2 ? best : null
}

function hashSeed(value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function rotateHexHue(hex: string, degrees: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = ((value >> 16) & 255) / 255
  const green = ((value >> 8) & 255) / 255
  const blue = (value & 255) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  const delta = max - min
  let hue = 0
  let saturation = 0
  if (delta) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))
    if (max === red) hue = 60 * (((green - blue) / delta) % 6)
    else if (max === green) hue = 60 * ((blue - red) / delta + 2)
    else hue = 60 * ((red - green) / delta + 4)
  }
  hue = (hue + degrees + 360) % 360
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - chroma / 2
  const [r, g, b] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x]
  return `#${[r, g, b].map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase()
}

const ACHROMATIC_TIER_COLORS = {
  primary: ["#1D4ED8", "#7C3AED", "#C2410C"],
  accent: ["#0F766E", "#B45309", "#BE185D"],
} as const

export function getProMaxTierColor(
  baseColor: string,
  index: 0 | 1 | 2,
  role: keyof typeof ACHROMATIC_TIER_COLORS,
) {
  if (index === 0) return baseColor.toUpperCase()
  const rotated = rotateHexHue(baseColor, index * 120)
  return rotated === baseColor.toUpperCase()
    ? ACHROMATIC_TIER_COLORS[role][index]
    : rotated
}

function layoutFor(tier: ProMaxTreatmentTier, platform: MockupPrimaryPlatform) {
  const mobile = MOBILE_PLATFORMS.has(platform)
  if (tier === "foundation") return mobile ? "Single-column task flow with one anchored primary action" : "Twelve-column content grid with a stable work area"
  if (tier === "distinctive") return mobile ? "Asymmetric card rhythm with progressive disclosure" : "Split workspace with an asymmetric modular rail"
  return mobile ? "Immersive edge-to-edge stages with contextual controls" : "Layered canvas with floating contextual tool clusters"
}

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function bestTextOnColor(hex: string) {
  const luminance = relativeLuminance(hex)
  const whiteContrast = 1.05 / (luminance + 0.05)
  const blackContrast = (luminance + 0.05) / 0.05
  return whiteContrast >= blackContrast ? "#FFFFFF" : "#000000"
}

function navigationFor(tier: ProMaxTreatmentTier, platform: MockupPrimaryPlatform) {
  const mobile = MOBILE_PLATFORMS.has(platform)
  if (tier === "foundation") return mobile ? "Bottom tabs plus contextual top bar" : "Persistent left rail plus page header"
  if (tier === "distinctive") return mobile ? "Compact dock plus inline section switcher" : "Top command bar plus contextual side panel"
  return mobile ? "Gesture-first canvas with an expandable action dock" : "Command palette plus spatial contextual navigation"
}

function styleForPlatform(product: CatalogProduct, index: 0 | 1 | 2, platform: MockupPrimaryPlatform) {
  const styleIndex = product.styles[index]
  const style = PRO_MAX_GENERATED_CATALOG.styles[styleIndex]
  if (MOBILE_PLATFORMS.has(platform) || !/\(Mobile|Mobile Poster\)/i.test(style.name)) return style

  const usedStyleIndexes = new Set<number>(product.styles)
  const desktopFallbackIndexes = [12, 0, 11, 7, 8]
  const fallbackIndex = desktopFallbackIndexes.find((candidate) => !usedStyleIndexes.has(candidate))
  return PRO_MAX_GENERATED_CATALOG.styles[fallbackIndex ?? 0]
}

function buildTreatment(product: CatalogProduct, index: 0 | 1 | 2, platform: MockupPrimaryPlatform, projectId: string): ProMaxVisualTreatment {
  const tier = TIERS[index]
  const style = styleForPlatform(product, index, platform)
  const font = PRO_MAX_GENERATED_CATALOG.fonts[product.fonts[index]]
  const primary = getProMaxTierColor(product.palette[2], index, "primary")
  const accent = getProMaxTierColor(product.palette[3], index, "accent")
  const density: ProMaxDensity = TIERS[index] === "foundation" ? "medium" : TIERS[index] === "distinctive" ? "high" : "low"
  const seedSuffix = hashSeed(`${projectId}:${product.id}:${tier}`).toString(36).slice(0, 5)
  return {
    id: compactText(`${product.id}-${style.id}-${tier}-${seedSuffix}`, PRO_MAX_FIELD_CAPS.id),
    tier,
    name: compactText(`${product.name} — ${style.name}`, PRO_MAX_FIELD_CAPS.name),
    style: compactText(style.name, PRO_MAX_FIELD_CAPS.style),
    rationale: compactText(`${tier} treatment for ${product.name}; preserves usable product hierarchy while applying ${style.name}.`, PRO_MAX_FIELD_CAPS.rationale),
    palette: {
      background: product.palette[0], surface: product.palette[1], primary, accent,
      onAccent: bestTextOnColor(accent),
      text: product.palette[4], muted: product.palette[5], border: product.palette[6], destructive: product.palette[7],
    },
    typography: { heading: font.heading, body: font.body, data: index === 1 ? "JetBrains Mono" : font.body },
    density,
    layoutStrategy: compactText(`${product.pattern}. ${layoutFor(tier, platform)}`, PRO_MAX_FIELD_CAPS.guidance),
    navigationPattern: navigationFor(tier, platform),
    motifs: [...new Set([...style.keywords.slice(0, 2), ...product.decisionRules])].slice(0, PRO_MAX_FIELD_CAPS.maxArrayItems),
    effects: splitGuidance(style.effects),
    avoid: splitGuidance(style.avoid),
    mobileNotes: compactText(`${layoutFor(tier, "native-mobile-app")}; keep primary controls in the thumb zone.`, PRO_MAX_FIELD_CAPS.guidance),
    desktopNotes: compactText(`${layoutFor(tier, "desktop-web")}; use available width for hierarchy, not empty decoration.`, PRO_MAX_FIELD_CAPS.guidance),
  }
}

function legacyTreatment(kit: MockupBrandKit, tier: ProMaxTreatmentTier): ProMaxVisualTreatment {
  const density = /dense/i.test(kit.density) ? "high" : /airy|spacious/i.test(kit.density) ? "low" : "medium"
  const [heading = "Inter", body = "Inter"] = kit.typePairing.split(/[+/,&]/).map((value) => compactText(value, PRO_MAX_FIELD_CAPS.font))
  return {
    id: compactText(`legacy-${kit.id}-${tier}`, PRO_MAX_FIELD_CAPS.id), tier,
    name: compactText(kit.name, PRO_MAX_FIELD_CAPS.name), style: compactText(kit.surface, PRO_MAX_FIELD_CAPS.style),
    rationale: compactText("Existing Maker Compass brand-bank treatment used as one whole-triad fallback.", PRO_MAX_FIELD_CAPS.rationale),
    palette: {
      background: kit.surfaces.canvas.hex, surface: kit.surfaces.raised.hex, primary: kit.accentHex,
      accent: kit.accentHex, onAccent: kit.accentTextHex, text: kit.surfaces.textPrimary.hex, muted: kit.surfaces.textMuted.hex,
      border: kit.surfaces.border.hex, destructive: kit.semantic.error,
    },
    typography: { heading, body, data: "JetBrains Mono" }, density,
    layoutStrategy: compactText(kit.archetype.desktop, PRO_MAX_FIELD_CAPS.guidance),
    navigationPattern: "Use the platform-native navigation pattern",
    motifs: [compactText(kit.surface, PRO_MAX_FIELD_CAPS.arrayItem)],
    effects: [], avoid: kit.semanticClashes.slice(0, PRO_MAX_FIELD_CAPS.maxArrayItems).map((value) => compactText(value, PRO_MAX_FIELD_CAPS.arrayItem)),
    mobileNotes: compactText(kit.archetype.mobile, PRO_MAX_FIELD_CAPS.guidance),
    desktopNotes: compactText(kit.archetype.desktop, PRO_MAX_FIELD_CAPS.guidance),
  }
}

export function selectLegacyMockupStyleSelection(projectId: string): MockupStyleSelection {
  const kits = selectMockupBrandTriad(projectId)
  return {
    source: "legacy-bank",
    catalogVersion: "legacy-brand-bank-v1",
    treatments: {
      A: legacyTreatment(kits[0], "foundation"),
      B: legacyTreatment(kits[1], "distinctive"),
      C: legacyTreatment(kits[2], "experimental"),
    },
  }
}

export function selectMockupStyleSelection(input: SelectMockupStyleSelectionInput): MockupStyleSelection {
  const { projectId } = input
  const fallback = selectLegacyMockupStyleSelection(projectId)
  if (!isMockupProMaxEnabled()) return fallback
  return buildProMaxMockupStyleSelection(input) ?? fallback
}

function buildProMaxMockupStyleSelection({
  designPlan,
  projectId,
  productContext,
}: SelectMockupStyleSelectionInput): MockupStyleSelection | null {
  const product = selectCatalogProduct(designPlan, productContext)
  if (!product) return null
  return buildProMaxSelectionForProduct({ product, designPlan, projectId })
}

function buildProMaxSelectionForProduct({
  product,
  designPlan,
  projectId,
}: {
  product: CatalogProduct
  designPlan: MockupDesignPlan
  projectId: string
}): MockupStyleSelection | null {
  const selection: MockupStyleSelection = {
    source: "promax",
    catalogVersion: PRO_MAX_GENERATED_CATALOG.version,
    treatments: {
      A: buildTreatment(product, 0, designPlan.primaryPlatform, projectId),
      B: buildTreatment(product, 1, designPlan.primaryPlatform, projectId),
      C: buildTreatment(product, 2, designPlan.primaryPlatform, projectId),
    },
  }
  return isMockupStyleSelection(selection) ? selection : null
}

/**
 * Accepts a transported selection only when it exactly reconstructs from controlled
 * server catalog constants for this project and plan. This preserves crash recovery
 * without trusting client-authored prompt prose.
 */
export function isServerResolvedMockupStyleSelection({
  designPlan,
  projectId,
  productContext,
}: SelectMockupStyleSelectionInput) {
  const supplied = designPlan.styleSelection
  if (!supplied || !isMockupStyleSelection(supplied)) return false
  if (!isMockupBrandDirectionsEnabled()) return false
  if (supplied.source === "promax" && !isMockupProMaxEnabled()) return false
  const basePlan = { ...designPlan }
  delete basePlan.styleSelection
  const expected = supplied.source === "promax"
    ? productContext
      ? buildProMaxMockupStyleSelection({ designPlan: basePlan, projectId, productContext })
      : (() => {
          const productId = supplied.treatments.A.id.match(/^(p\d+)-/)?.[1]
          const product = PRO_MAX_GENERATED_CATALOG.products.find((item) => item.id === productId)
          return product ? buildProMaxSelectionForProduct({ product, designPlan: basePlan, projectId }) : null
        })()
    : selectLegacyMockupStyleSelection(projectId)
  return Boolean(expected && JSON.stringify(expected) === JSON.stringify(supplied))
}

function hasSafeText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max && !UNSAFE_TEXT.test(value)
}

function hasSafeArray(value: unknown) {
  return Array.isArray(value) && value.length <= PRO_MAX_FIELD_CAPS.maxArrayItems && value.every((item) => hasSafeText(item, PRO_MAX_FIELD_CAPS.arrayItem))
}

export function isProMaxVisualTreatment(value: unknown): value is ProMaxVisualTreatment {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<ProMaxVisualTreatment>
  if (!TIERS.includes(item.tier as ProMaxTreatmentTier)) return false
  if (!hasSafeText(item.id, PRO_MAX_FIELD_CAPS.id) || !hasSafeText(item.name, PRO_MAX_FIELD_CAPS.name) || !hasSafeText(item.style, PRO_MAX_FIELD_CAPS.style)) return false
  if (!hasSafeText(item.rationale, PRO_MAX_FIELD_CAPS.rationale) || !hasSafeText(item.layoutStrategy, PRO_MAX_FIELD_CAPS.guidance) || !hasSafeText(item.navigationPattern, PRO_MAX_FIELD_CAPS.guidance)) return false
  if (!hasSafeText(item.mobileNotes, PRO_MAX_FIELD_CAPS.guidance) || !hasSafeText(item.desktopNotes, PRO_MAX_FIELD_CAPS.guidance)) return false
  if (!item.palette) return false
  const paletteKeys = ["accent", "background", "border", "destructive", "muted", "onAccent", "primary", "surface", "text"]
  if (Object.keys(item.palette).sort().join(",") !== paletteKeys.join(",")) return false
  if (!Object.values(item.palette).every((color) => typeof color === "string" && HEX_COLOR.test(color))) return false
  if (!item.typography || !hasSafeText(item.typography.heading, PRO_MAX_FIELD_CAPS.font) || !hasSafeText(item.typography.body, PRO_MAX_FIELD_CAPS.font) || !hasSafeText(item.typography.data, PRO_MAX_FIELD_CAPS.font)) return false
  if (!(["low", "medium", "high"] as const).includes(item.density as ProMaxDensity)) return false
  return hasSafeArray(item.motifs) && hasSafeArray(item.effects) && hasSafeArray(item.avoid)
}

export function measureMockupStyleSelectionBytes(value: MockupStyleSelection) {
  return Buffer.byteLength(JSON.stringify(value), "utf8")
}

export function isMockupStyleSelection(value: unknown): value is MockupStyleSelection {
  if (!value || typeof value !== "object") return false
  const selection = value as Partial<MockupStyleSelection>
  if (selection.source !== "promax" && selection.source !== "legacy-bank") return false
  if (!hasSafeText(selection.catalogVersion, PRO_MAX_FIELD_CAPS.name) || !selection.treatments || typeof selection.treatments !== "object") return false
  const keys = Object.keys(selection.treatments).sort()
  if (keys.join(",") !== "A,B,C") return false
  const triad = selection.treatments as Partial<ProMaxTreatmentTriad>
  if (!isProMaxVisualTreatment(triad.A) || !isProMaxVisualTreatment(triad.B) || !isProMaxVisualTreatment(triad.C)) return false
  if (triad.A.tier !== "foundation" || triad.B.tier !== "distinctive" || triad.C.tier !== "experimental") return false
  return measureMockupStyleSelectionBytes(selection as MockupStyleSelection) <= PRO_MAX_STYLE_SELECTION_MAX_BYTES
}

export function parseMockupStyleSelection(value: unknown): MockupStyleSelection | null {
  let candidate = value
  if (typeof value === "string") {
    try { candidate = JSON.parse(value) } catch { return null }
  }
  return isMockupStyleSelection(candidate) ? candidate : null
}

export function formatMockupStyleTreatmentForPrompt(treatment: ProMaxVisualTreatment, platform: MockupPrimaryPlatform) {
  const notes = MOBILE_PLATFORMS.has(platform) ? treatment.mobileNotes : treatment.desktopNotes
  return compactText(`VISUAL TREATMENT — ${treatment.tier.toUpperCase()}: ${treatment.name}
Style: ${treatment.style}. ${treatment.rationale}
Palette: background ${treatment.palette.background}; surface ${treatment.palette.surface}; primary ${treatment.palette.primary}; CTA/accent ${treatment.palette.accent} with ${treatment.palette.onAccent} label text; text ${treatment.palette.text}; muted ${treatment.palette.muted}; border ${treatment.palette.border}; destructive ${treatment.palette.destructive}. Reserve green for success unless green is the explicit CTA accent.
Typography: ${treatment.typography.heading} headings; ${treatment.typography.body} body; ${treatment.typography.data} data.
Structure: ${treatment.layoutStrategy}. Navigation: ${treatment.navigationPattern}. Density: ${treatment.density}.
Motifs: ${treatment.motifs.join(", ") || "restrained"}. Effects: ${treatment.effects.join(", ") || "none"}. Avoid: ${treatment.avoid.join(", ") || "decorative noise"}.
Platform: ${notes}`, PRO_MAX_TREATMENT_PROMPT_MAX_CHARS)
}
