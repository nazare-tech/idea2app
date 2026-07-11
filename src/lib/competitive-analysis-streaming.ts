// Lenient parsing of a partially streamed Market Research (competitive-analysis
// v2) markdown document. Production rendering keeps its strict validation in
// competitive-analysis-v2.ts; this module only decides which sections of an
// in-flight stream are safe to hand to the designed section renderers.

import {
  type CompetitiveAnalysisV2SectionName,
  resolveCompetitiveAnalysisSectionName,
} from "@/lib/competitive-analysis-v2"

export interface StreamingCompetitiveSection {
  /** Canonical v2 section name, or null when the heading is unrecognized */
  name: CompetitiveAnalysisV2SectionName | null
  /** Raw heading text as it appeared in the stream */
  heading: string
  /** Section body markdown (may still be growing when `complete` is false) */
  content: string
  /**
   * A section is complete once the next H2 heading has arrived, or the
   * stream has finished. Only complete sections should render through the
   * designed block components.
   */
  complete: boolean
}

export interface StreamingCompetitiveParseResult {
  sections: StreamingCompetitiveSection[]
  /** Names of complete, recognized sections for quick membership checks */
  completeSectionNames: Set<CompetitiveAnalysisV2SectionName>
  /** The last, still-growing section (null when finished or nothing started) */
  activeSection: StreamingCompetitiveSection | null
}

const H2_PATTERN = /^##\s+(.+)$/

/**
 * Split partial markdown into H2 sections without any completeness or order
 * validation. The final section is only marked complete when `finished`.
 */
export function parseStreamingCompetitiveAnalysis(
  content: string,
  { finished }: { finished: boolean }
): StreamingCompetitiveParseResult {
  const sections: StreamingCompetitiveSection[] = []
  const lines = content.split("\n")
  // A trailing heading with no newline after it may still be mid-stream
  // ("## Feature Mat"); withhold it until the newline commits it.
  if (!finished && lines.length > 0 && H2_PATTERN.test(lines[lines.length - 1])) {
    lines.pop()
  }
  let current: { heading: string; body: string[] } | null = null

  for (const line of lines) {
    const match = H2_PATTERN.exec(line)
    if (match) {
      if (current) {
        sections.push(toSection(current, true))
      }
      current = { heading: match[1].trim(), body: [] }
      continue
    }
    current?.body.push(line)
  }

  if (current) {
    sections.push(toSection(current, finished))
  }

  const completeSectionNames = new Set<CompetitiveAnalysisV2SectionName>()
  for (const section of sections) {
    if (section.complete && section.name) {
      completeSectionNames.add(section.name)
    }
  }

  const last = sections[sections.length - 1] ?? null
  const activeSection = last && !last.complete ? last : null

  return { sections, completeSectionNames, activeSection }
}

function toSection(
  raw: { heading: string; body: string[] },
  complete: boolean
): StreamingCompetitiveSection {
  return {
    name: resolveCompetitiveAnalysisSectionName(raw.heading),
    heading: raw.heading,
    content: raw.body.join("\n").trim(),
    complete,
  }
}

/**
 * Prepare a still-growing section body for the structured (designed block)
 * parsers used by the live-fill streaming variant. The v2 parsers already
 * tolerate partial lists, tables, and headings; the one artifact they cannot
 * hide is a trailing unclosed `**`, which `stripInlineMarkdown` would leave
 * as literal asterisks. Drop that lone marker so the text under it streams
 * as plain text until the closing `**` arrives.
 */
export function sanitizeLiveSectionContent(content: string) {
  const boldMarkers = content.match(/\*\*/g) ?? []
  if (boldMarkers.length % 2 === 1) {
    const lastIndex = content.lastIndexOf("**")
    return content.slice(0, lastIndex) + content.slice(lastIndex + 2)
  }
  return content
}

export type StreamTailBuffering = "table" | null

export interface SafeStreamTail {
  /** Prose that is safe to show while the section is still streaming */
  visibleText: string
  /** Non-null when structural content (a table) is buffering behind a chip */
  buffering: StreamTailBuffering
}

const LIST_MARKER_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s*/

function hasUnclosedEmphasis(line: string) {
  return (line.match(/\*\*/g) ?? []).length % 2 === 1
}

/**
 * Decide how much of a still-streaming section body is safe to display as
 * markdown, following the block-commit rule: prose may appear mid-sentence,
 * but structural fragments never render half-finished.
 *
 * - Everything from the first table row onward is withheld and reported as
 *   `buffering: "table"` so the UI can show an "assembling" chip instead.
 * - A trailing line that is still incomplete (no newline yet) is withheld
 *   when it could become structure: a heading, a list marker with unclosed
 *   bold (labels like `**Assessment:**`), or an unclosed `**` span.
 */
export function getSafeStreamTail(text: string): SafeStreamTail {
  if (!text) return { visibleText: "", buffering: null }

  const lines = text.split("\n")

  // Withhold everything from the first table line onward.
  const tableStart = lines.findIndex((line) => line.trimStart().startsWith("|"))
  const proseLines = tableStart === -1 ? lines : lines.slice(0, tableStart)
  const buffering: StreamTailBuffering = tableStart === -1 ? null : "table"

  // The last prose line has no newline yet (still being generated) unless a
  // table follows it; hold it back while it could still become structure.
  if (buffering === null && proseLines.length > 0) {
    const last = proseLines[proseLines.length - 1]
    const trimmed = last.trimStart()
    const partialHeading = /^#{1,6}(\s|$)/.test(trimmed) || /^#{0,6}$/.test(trimmed) && trimmed.length > 0
    const partialBoldLabel = LIST_MARKER_PATTERN.test(trimmed)
      ? hasUnclosedEmphasis(trimmed)
      : false
    if (partialHeading || partialBoldLabel || hasUnclosedEmphasis(trimmed)) {
      proseLines.pop()
    }
  }

  return { visibleText: proseLines.join("\n").trimEnd(), buffering }
}
