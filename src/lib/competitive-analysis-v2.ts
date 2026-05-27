export const COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION = "competitive-analysis-v2"
export const COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION =
  "competitive-analysis-v2-2026-05-17-founder-friendly-headings"

export const COMPETITIVE_ANALYSIS_V2_SECTION_ORDER = [
  "Executive Summary",
  "Opportunity Verdict",
  "Direct Competitors",
  "Feature Comparison",
  "Pricing Comparison",
  "Best Customer Segments",
  "Competitive Landscape Overview",
  "Positioning Map",
  "How You'll Reach Customers",
  "Gap Analysis",
  "Ways to Stand Out",
  "What Makes It Hard to Copy",
  "SWOT Analysis",
  "Risks & Competitor Responses",
  "First Version Focus",
  "Recommended Next Moves",
] as const

export type CompetitiveAnalysisWorkspaceSection = "overview" | "market-research"

export const COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP = {
  "Executive Summary": "overview",
  "Opportunity Verdict": "overview",
  "Direct Competitors": "market-research",
  "Feature Comparison": "market-research",
  "Pricing Comparison": "market-research",
  "Best Customer Segments": "market-research",
  "Competitive Landscape Overview": "market-research",
  "Positioning Map": "market-research",
  "How You'll Reach Customers": "market-research",
  "Gap Analysis": "market-research",
  "Ways to Stand Out": "market-research",
  "What Makes It Hard to Copy": "market-research",
  "SWOT Analysis": "market-research",
  "Risks & Competitor Responses": "market-research",
  "First Version Focus": "market-research",
  "Recommended Next Moves": "market-research",
} as const satisfies Record<
  CompetitiveAnalysisV2SectionName,
  CompetitiveAnalysisWorkspaceSection
>

const COMPETITIVE_ANALYSIS_V2_SECTION_ALIASES: Partial<
  Record<CompetitiveAnalysisV2SectionName, readonly string[]>
> = {
  "Opportunity Verdict": ["Founder Verdict"],
  "Feature Comparison": ["Feature and Workflow Matrix"],
  "Pricing Comparison": ["Pricing and Packaging"],
  "Best Customer Segments": ["Audience Segments"],
  "How You'll Reach Customers": [
    "GTM / Distribution Signals",
    "Go To Market",
    "Distribution Signals",
  ],
  "Ways to Stand Out": ["Differentiation Wedges"],
  "What Makes It Hard to Copy": [
    "Moat and Defensibility",
    "Moat / Defensibility",
  ],
  "Risks & Competitor Responses": [
    "Risks and Countermoves",
    "Risks / Countermoves",
  ],
  "First Version Focus": ["MVP Wedge Recommendation", "MVP Wedge"],
  "Recommended Next Moves": ["Strategic Recommendations"],
}

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
  evidence: string
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

const COMPETITIVE_ANALYSIS_SECTION_LOOKUP = new Map<
  string,
  CompetitiveAnalysisV2SectionName
>(
  COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.flatMap((heading) => [
    [normalizeFieldLabel(heading), heading] as const,
    ...((COMPETITIVE_ANALYSIS_V2_SECTION_ALIASES[heading] ?? []).map(
      (alias) => [normalizeFieldLabel(alias), heading] as const,
    )),
  ]),
)

function resolveCompetitiveAnalysisSectionName(
  heading: string,
): CompetitiveAnalysisV2SectionName | null {
  return COMPETITIVE_ANALYSIS_SECTION_LOOKUP.get(normalizeFieldLabel(heading)) ?? null
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

function findTableColumn(headers: string[], candidates: string[], fallback: number) {
  const normalizedHeaders = headers.map(normalizeFieldLabel)

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeFieldLabel(candidate)
    const exactIndex = normalizedHeaders.findIndex(
      (header) => header === normalizedCandidate
    )
    if (exactIndex >= 0) return exactIndex
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeFieldLabel(candidate)
    const partialIndex = normalizedHeaders.findIndex(
      (header) =>
        header.includes(normalizedCandidate) ||
        normalizedCandidate.includes(header)
    )
    if (partialIndex >= 0) return partialIndex
  }

  return fallback
}

function parsePositioningScore(value: string | undefined) {
  const score = Number(value)
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    return null
  }
  return score
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

  const competitorColumn = table
    ? findTableColumn(table.headers, ["competitor", "product", "company"], 0)
    : 0
  const xColumn = table
    ? findTableColumn(table.headers, ["x score", "x axis score"], 1)
    : 1
  const yColumn = table
    ? findTableColumn(table.headers, ["y score", "y axis score"], 2)
    : 2
  const rationaleColumn = table
    ? findTableColumn(
        table.headers,
        ["placement rationale", "rationale", "placement"],
        3
      )
    : 3
  const evidenceColumn = table
    ? findTableColumn(
        table.headers,
        ["evidence confidence", "confidence", "source confidence", "source"],
        -1
      )
    : -1

  const points =
    table?.rows.map((row) => ({
      competitor: row[competitorColumn] ?? "Unknown",
      x: parsePositioningScore(row[xColumn]),
      y: parsePositioningScore(row[yColumn]),
      rationale: row[rationaleColumn] ?? "",
      evidence: evidenceColumn >= 0 ? row[evidenceColumn] ?? "" : "",
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
      paragraphs: parseParagraphBlocks(getSection(sections, "Opportunity Verdict")),
      bullets: parseListItems(getSection(sections, "Opportunity Verdict")),
    },
    directCompetitors: parseCompetitorProfiles(competitorEntries),
    featureMatrix: parseNarrativeTable(
      getSection(sections, "Feature Comparison")
    ),
    pricingAndPackaging: parseNarrativeTable(
      getSection(sections, "Pricing Comparison")
    ),
    audienceSegments: parseListItems(getSection(sections, "Best Customer Segments")),
    competitiveLandscapeOverview: parseListItems(
      getSection(sections, "Competitive Landscape Overview")
    ),
    positioningMap: parsePositioningMap(getSection(sections, "Positioning Map")),
    gtmSignals: parseListItems(getSection(sections, "How You'll Reach Customers")),
    gapAnalysis: parseListItems(getSection(sections, "Gap Analysis")),
    differentiationWedges: parseListItems(
      getSection(sections, "Ways to Stand Out")
    ),
    moatAndDefensibility: parseListItems(
      getSection(sections, "What Makes It Hard to Copy")
    ),
    swotAnalysis: {
      ...swotAnalysis,
      matrix: parseSwotMatrix(swotAnalysis.table),
    },
    risksAndCountermoves: parseListItems(
      getSection(sections, "Risks & Competitor Responses")
    ),
    mvpWedgeRecommendation: {
      paragraphs: parseParagraphBlocks(
        getSection(sections, "First Version Focus")
      ),
      bullets: parseListItems(getSection(sections, "First Version Focus")),
    },
    strategicRecommendations: parseListItems(
      getSection(sections, "Recommended Next Moves")
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
  const canonicalHeadings = h2Sections.map((section) =>
    resolveCompetitiveAnalysisSectionName(section.heading)
  )
  const sections = Object.fromEntries(
    h2Sections
      .map((section, index) => {
        const canonicalHeading = canonicalHeadings[index]
        return canonicalHeading ? [canonicalHeading, section.content] : null
      })
      .filter((entry): entry is [CompetitiveAnalysisV2SectionName, string] => entry !== null)
  ) as Partial<Record<CompetitiveAnalysisV2SectionName, string>>
  const errors: string[] = []

  if (headings.length !== COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.length) {
    errors.push("Market Research v2 requires all 16 H2 sections.")
  }

  const orderMatches = COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.every(
    (heading, index) => canonicalHeadings[index] === heading
  )

  if (!orderMatches) {
    errors.push("Market Research v2 headings are missing or out of order.")
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
        "This version predates Market Research v2. Regenerate to upgrade modules.",
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
        "This Market Research v2 document no longer matches the required module schema. Review or fix it in Markdown to restore the designed modules view.",
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
