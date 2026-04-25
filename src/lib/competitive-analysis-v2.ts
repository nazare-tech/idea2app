export const COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION = "competitive-analysis-v2"
export const COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION =
  "competitive-analysis-v2-2026-03-20-fast-comparison"

export const COMPETITIVE_ANALYSIS_V2_SECTION_ORDER = [
  "Executive Summary",
  "Founder Verdict",
  "Direct Competitors",
  "Feature and Workflow Matrix",
  "Pricing and Packaging",
  "Audience Segments",
  "Competitive Landscape Overview",
  "Positioning Map",
  "GTM / Distribution Signals",
  "Gap Analysis",
  "Differentiation Wedges",
  "Moat and Defensibility",
  "SWOT Analysis",
  "Risks and Countermoves",
  "MVP Wedge Recommendation",
  "Strategic Recommendations",
] as const

export type CompetitiveAnalysisWorkspaceSection = "overview" | "market-research"

export const COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP = {
  "Executive Summary": "overview",
  "Founder Verdict": "overview",
  "Direct Competitors": "market-research",
  "Feature and Workflow Matrix": "market-research",
  "Pricing and Packaging": "market-research",
  "Audience Segments": "market-research",
  "Competitive Landscape Overview": "market-research",
  "Positioning Map": "market-research",
  "GTM / Distribution Signals": "market-research",
  "Gap Analysis": "market-research",
  "Differentiation Wedges": "market-research",
  "Moat and Defensibility": "market-research",
  "SWOT Analysis": "market-research",
  "Risks and Countermoves": "market-research",
  "MVP Wedge Recommendation": "market-research",
  "Strategic Recommendations": "market-research",
} as const satisfies Record<
  CompetitiveAnalysisV2SectionName,
  CompetitiveAnalysisWorkspaceSection
>

export const COMPETITOR_PROFILE_FIELD_ORDER = [
  "Overview",
  "Core Product/Service",
  "Market Positioning",
  "Strengths",
  "Key Edge",
  "Limitations",
  "Pricing Model",
  "Target Audience",
] as const

export type CompetitiveAnalysisV2SectionName =
  (typeof COMPETITIVE_ANALYSIS_V2_SECTION_ORDER)[number]

export type CompetitiveCompetitorFieldName =
  (typeof COMPETITOR_PROFILE_FIELD_ORDER)[number]

export type CompetitiveAnalysisView = "modules" | "markdown"

export interface CompetitiveAnalysisSection {
  heading: string
  content: string
}

export interface CompetitiveAnalysisTable {
  headers: string[]
  rows: string[][]
}

export interface CompetitiveAnalysisNarrativeTable {
  paragraphs: string[]
  table: CompetitiveAnalysisTable | null
}

export interface CompetitiveAnalysisCompetitorProfile {
  heading: string
  websiteUrl: string | null
  fields: Partial<Record<CompetitiveCompetitorFieldName, string>>
}

export interface CompetitiveAnalysisPositioningPoint {
  competitor: string
  x: number | null
  y: number | null
  rationale: string
}

export interface CompetitiveAnalysisPositioningMap {
  paragraphs: string[]
  xAxis: string | null
  yAxis: string | null
  table: CompetitiveAnalysisTable | null
  points: CompetitiveAnalysisPositioningPoint[]
}

export interface CompetitiveAnalysisSwotMatrix {
  positiveLabel: string
  negativeLabel: string
  internalPositive: string
  internalNegative: string
  externalPositive: string
  externalNegative: string
}

export interface CompetitiveAnalysisStructuredData {
  executiveSummary: string[]
  founderVerdict: { paragraphs: string[]; bullets: string[] }
  directCompetitors: CompetitiveAnalysisCompetitorProfile[]
  featureMatrix: CompetitiveAnalysisNarrativeTable
  pricingAndPackaging: CompetitiveAnalysisNarrativeTable
  audienceSegments: string[]
  competitiveLandscapeOverview: string[]
  positioningMap: CompetitiveAnalysisPositioningMap
  gtmSignals: string[]
  gapAnalysis: string[]
  differentiationWedges: string[]
  moatAndDefensibility: string[]
  swotAnalysis: CompetitiveAnalysisNarrativeTable & {
    matrix: CompetitiveAnalysisSwotMatrix | null
  }
  risksAndCountermoves: string[]
  mvpWedgeRecommendation: { paragraphs: string[]; bullets: string[] }
  strategicRecommendations: string[]
}

export interface CompetitiveAnalysisV2ParseResult {
  isValid: boolean
  headings: string[]
  sections: Partial<Record<CompetitiveAnalysisV2SectionName, string>>
  competitorEntries: CompetitiveAnalysisSection[]
  errors: string[]
}

export interface CompetitiveAnalysisViewModel {
  documentVersion: "legacy" | typeof COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION
  canRenderModules: boolean
  defaultView: CompetitiveAnalysisView
  legacyNotice: string | null
  warning: string | null
  parsed: CompetitiveAnalysisV2ParseResult
  structured: CompetitiveAnalysisStructuredData
}

type JsonLike = Record<string, unknown> | null | undefined

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

export function stripInlineMarkdown(value: string) {
  return normalizeWhitespace(
    value
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
  )
}

function splitBlocks(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function isListLine(line: string) {
  return /^\s*(?:[-*+]|\d+\.)\s+/.test(line)
}

function isTableRow(line: string) {
  return line.includes("|")
}

function parseTableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => stripInlineMarkdown(cell))
}

function isTableSeparator(line: string) {
  const cells = parseTableCells(line)
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")))
  )
}

function parseParagraphBlocks(content: string) {
  return splitBlocks(content)
    .filter((block) => {
      const firstLine = block.split("\n").find((line) => line.trim())
      return firstLine ? !isListLine(firstLine) && !isTableRow(firstLine) : false
    })
    .map((block) => stripInlineMarkdown(block.replace(/\n+/g, " ")))
    .filter(Boolean)
}

export function parseListItems(content: string) {
  const items: string[] = []
  let current: string[] = []

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()

    if (!line) {
      if (current.length > 0) {
        items.push(stripInlineMarkdown(current.join(" ")))
        current = []
      }
      continue
    }

    if (isListLine(line)) {
      if (current.length > 0) {
        items.push(stripInlineMarkdown(current.join(" ")))
      }
      current = [line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")]
      continue
    }

    if (current.length > 0) {
      current.push(line)
    }
  }

  if (current.length > 0) {
    items.push(stripInlineMarkdown(current.join(" ")))
  }

  return items.filter(Boolean)
}

export function parseMarkdownTable(content: string): CompetitiveAnalysisTable | null {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isTableRow(lines[index]) || !isTableSeparator(lines[index + 1])) {
      continue
    }

    const dataLines: string[] = []
    let cursor = index + 2
    while (cursor < lines.length && isTableRow(lines[cursor])) {
      dataLines.push(lines[cursor])
      cursor += 1
    }

    return {
      headers: parseTableCells(lines[index]),
      rows: dataLines.map(parseTableCells),
    }
  }

  return null
}

function parseNarrativeTable(content: string): CompetitiveAnalysisNarrativeTable {
  return {
    paragraphs: parseParagraphBlocks(content),
    table: parseMarkdownTable(content),
  }
}

function normalizeFieldLabel(label: string) {
  return stripInlineMarkdown(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function sanitizeCompetitorHeading(heading: string) {
  return stripInlineMarkdown(heading)
    .replace(
      /\s*\((?:conservative|evidence-aware|evidence based|available evidence|research-based)?\s*inference\)\s*$/i,
      ""
    )
    .replace(/\s*\((?:based on available evidence|based on competitor research)\)\s*$/i, "")
    .trim()
}

function extractMarkdownLinkUrl(value: string) {
  const markdownLinkMatch = value.match(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/i)
  if (markdownLinkMatch) {
    return markdownLinkMatch[1]
  }

  const bareUrlMatch = value.match(/https?:\/\/[^\s)]+/i)
  return bareUrlMatch?.[0] ?? null
}

function parseLabeledList(content: string) {
  return parseListItems(content)
    .map((item) => {
      const match = item.match(/^([^:]+):\s*(.+)$/)
      if (!match) return null

      return {
        label: stripInlineMarkdown(match[1]),
        value: stripInlineMarkdown(match[2]),
      }
    })
    .filter((item): item is { label: string; value: string } => item !== null)
}

function getCompetitorFieldValue(
  fields: Array<{ label: string; value: string }>,
  fieldName: CompetitiveCompetitorFieldName
) {
  const normalizedTarget = normalizeFieldLabel(fieldName)
  return (
    fields.find((field) => normalizeFieldLabel(field.label) === normalizedTarget)
      ?.value ?? ""
  )
}

function parseCompetitorProfiles(entries: CompetitiveAnalysisSection[]) {
  return entries.map((entry) => {
    const fields = parseLabeledList(entry.content)
    const websiteValue =
      fields.find((field) => normalizeFieldLabel(field.label) === "website")
        ?.value ?? null

    return {
      heading: sanitizeCompetitorHeading(entry.heading),
      websiteUrl:
        extractMarkdownLinkUrl(entry.heading) ??
        (websiteValue ? extractMarkdownLinkUrl(websiteValue) : null) ??
        extractMarkdownLinkUrl(entry.content),
      fields: Object.fromEntries(
        COMPETITOR_PROFILE_FIELD_ORDER.map((fieldName) => [
          fieldName,
          getCompetitorFieldValue(fields, fieldName),
        ]).filter(([, value]) => Boolean(value))
      ) as Partial<Record<CompetitiveCompetitorFieldName, string>>,
    }
  })
}

function parsePositioningMap(content: string): CompetitiveAnalysisPositioningMap {
  const bullets = parseLabeledList(content)
  const table = parseMarkdownTable(content)
  const xAxis =
    bullets.find((item) => normalizeFieldLabel(item.label) === "x axis")?.value ??
    null
  const yAxis =
    bullets.find((item) => normalizeFieldLabel(item.label) === "y axis")?.value ??
    null

  const points =
    table?.rows.map((row) => ({
      competitor: row[0] ?? "Unknown",
      x: Number.isFinite(Number(row[1])) ? Number(row[1]) : null,
      y: Number.isFinite(Number(row[2])) ? Number(row[2]) : null,
      rationale: row[3] ?? "",
    })) ?? []

  return {
    paragraphs: parseParagraphBlocks(content),
    xAxis,
    yAxis,
    table,
    points,
  }
}

function findSwotRow(
  table: CompetitiveAnalysisTable | null,
  keyword: "internal" | "external"
) {
  return (
    table?.rows.find((row) =>
      normalizeFieldLabel(row[0] ?? "").includes(keyword)
    ) ?? null
  )
}

function parseSwotMatrix(table: CompetitiveAnalysisTable | null) {
  if (!table || table.headers.length < 3 || table.rows.length < 2) {
    return null
  }

  const internalRow = findSwotRow(table, "internal")
  const externalRow = findSwotRow(table, "external")

  if (!internalRow || !externalRow) {
    return null
  }

  return {
    positiveLabel: table.headers[1] ?? "Positive",
    negativeLabel: table.headers[2] ?? "Negative",
    internalPositive: internalRow[1] ?? "",
    internalNegative: internalRow[2] ?? "",
    externalPositive: externalRow[1] ?? "",
    externalNegative: externalRow[2] ?? "",
  }
}

function getSection(
  sections: Partial<Record<CompetitiveAnalysisV2SectionName, string>>,
  heading: CompetitiveAnalysisV2SectionName
) {
  return sections[heading] ?? ""
}

export function getCompetitiveAnalysisStructuredData(
  parsed: CompetitiveAnalysisV2ParseResult
): CompetitiveAnalysisStructuredData {
  const { sections, competitorEntries } = parsed
  const swotAnalysis = parseNarrativeTable(getSection(sections, "SWOT Analysis"))

  return {
    executiveSummary: parseParagraphBlocks(
      getSection(sections, "Executive Summary")
    ),
    founderVerdict: {
      paragraphs: parseParagraphBlocks(getSection(sections, "Founder Verdict")),
      bullets: parseListItems(getSection(sections, "Founder Verdict")),
    },
    directCompetitors: parseCompetitorProfiles(competitorEntries),
    featureMatrix: parseNarrativeTable(
      getSection(sections, "Feature and Workflow Matrix")
    ),
    pricingAndPackaging: parseNarrativeTable(
      getSection(sections, "Pricing and Packaging")
    ),
    audienceSegments: parseListItems(getSection(sections, "Audience Segments")),
    competitiveLandscapeOverview: parseListItems(
      getSection(sections, "Competitive Landscape Overview")
    ),
    positioningMap: parsePositioningMap(getSection(sections, "Positioning Map")),
    gtmSignals: parseListItems(getSection(sections, "GTM / Distribution Signals")),
    gapAnalysis: parseListItems(getSection(sections, "Gap Analysis")),
    differentiationWedges: parseListItems(
      getSection(sections, "Differentiation Wedges")
    ),
    moatAndDefensibility: parseListItems(
      getSection(sections, "Moat and Defensibility")
    ),
    swotAnalysis: {
      ...swotAnalysis,
      matrix: parseSwotMatrix(swotAnalysis.table),
    },
    risksAndCountermoves: parseListItems(
      getSection(sections, "Risks and Countermoves")
    ),
    mvpWedgeRecommendation: {
      paragraphs: parseParagraphBlocks(
        getSection(sections, "MVP Wedge Recommendation")
      ),
      bullets: parseListItems(getSection(sections, "MVP Wedge Recommendation")),
    },
    strategicRecommendations: parseListItems(
      getSection(sections, "Strategic Recommendations")
    ),
  }
}

export function getCompetitiveAnalysisDocumentVersion(
  metadata: JsonLike
): "legacy" | typeof COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION {
  if (
    isRecord(metadata) &&
    metadata.document_version === COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION
  ) {
    return COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION
  }

  return "legacy"
}

function extractSectionsByHeading(
  content: string,
  level: 2 | 3
): CompetitiveAnalysisSection[] {
  const hashes = "#".repeat(level)
  const regex = new RegExp(`^${hashes}\\s+(.+)$`, "gm")
  const matches = Array.from(content.matchAll(regex))

  return matches.map((match, index) => {
    const heading = match[1]?.trim() ?? ""
    const start = (match.index ?? 0) + match[0].length
    const end = matches[index + 1]?.index ?? content.length

    return {
      heading,
      content: content.slice(start, end).trim(),
    }
  })
}

export function parseCompetitiveAnalysisV2(
  content: string
): CompetitiveAnalysisV2ParseResult {
  const h2Sections = extractSectionsByHeading(content, 2)
  const headings = h2Sections.map((section) => section.heading)
  const sections = Object.fromEntries(
    h2Sections.map((section) => [section.heading, section.content])
  ) as Partial<Record<CompetitiveAnalysisV2SectionName, string>>
  const errors: string[] = []

  if (headings.length !== COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.length) {
    errors.push("Competitive Research v2 requires all 16 H2 sections.")
  }

  const orderMatches = COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.every(
    (heading, index) => headings[index] === heading
  )

  if (!orderMatches) {
    errors.push("Competitive Research v2 headings are missing or out of order.")
  }

  for (const heading of COMPETITIVE_ANALYSIS_V2_SECTION_ORDER) {
    const sectionContent = sections[heading]
    if (!sectionContent || !sectionContent.trim()) {
      errors.push(`Section "${heading}" is empty.`)
    }
  }

  const competitorEntries = sections["Direct Competitors"]
    ? extractSectionsByHeading(sections["Direct Competitors"], 3)
    : []

  return {
    isValid: errors.length === 0,
    headings,
    sections,
    competitorEntries,
    errors,
  }
}

export function getCompetitiveAnalysisViewModel(
  content: string,
  metadata: JsonLike
): CompetitiveAnalysisViewModel {
  const documentVersion = getCompetitiveAnalysisDocumentVersion(metadata)
  const parsed = parseCompetitiveAnalysisV2(content)
  const structured = getCompetitiveAnalysisStructuredData(parsed)

  if (documentVersion === "legacy") {
    return {
      documentVersion,
      canRenderModules: false,
      defaultView: "markdown",
      legacyNotice:
        "This version predates Competitive Research v2. Regenerate to upgrade modules.",
      warning: null,
      parsed,
      structured,
    }
  }

  if (!parsed.isValid) {
    return {
      documentVersion,
      canRenderModules: false,
      defaultView: "markdown",
      legacyNotice: null,
      warning:
        "This Competitive Research v2 document no longer matches the required module schema. Review or fix it in Markdown to restore the designed modules view.",
      parsed,
      structured,
    }
  }

  return {
    documentVersion,
    canRenderModules: true,
    defaultView: "modules",
    legacyNotice: null,
    warning: null,
    parsed,
    structured,
  }
}
