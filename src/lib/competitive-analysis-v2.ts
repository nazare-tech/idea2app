export const COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION = "competitive-analysis-v2"
export const COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION =
  "competitive-analysis-v2-2026-03-16"

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

export type CompetitiveAnalysisV2SectionName =
  (typeof COMPETITIVE_ANALYSIS_V2_SECTION_ORDER)[number]

export type CompetitiveAnalysisView = "modules" | "markdown"

export interface CompetitiveAnalysisSection {
  heading: string
  content: string
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
}

type JsonLike = Record<string, unknown> | null | undefined

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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

  if (documentVersion === "legacy") {
    return {
      documentVersion,
      canRenderModules: false,
      defaultView: "markdown",
      legacyNotice:
        "This version predates Competitive Research v2. Regenerate to upgrade modules.",
      warning: null,
      parsed,
    }
  }

  if (!parsed.isValid) {
    return {
      documentVersion,
      canRenderModules: false,
      defaultView: "markdown",
      legacyNotice: null,
      warning:
        "This Competitive Research v2 document no longer matches the required module schema. Review or fix it in Markdown to restore the Modules view.",
      parsed,
    }
  }

  return {
    documentVersion,
    canRenderModules: true,
    defaultView: "modules",
    legacyNotice: null,
    warning: null,
    parsed,
  }
}
