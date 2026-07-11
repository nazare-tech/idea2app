// Lenient handling of a partially streamed planning document (Product Plan /
// First Version Plan markdown). Production rendering keeps its strict
// current-format gate in the block renderers; this module only decides how
// much of an in-flight stream is safe to hand to those renderers.
//
// Block-commit rule: a section body may grow mid-sentence, but the trailing
// line is withheld while it could still become structure (a heading, a table
// row, or an unclosed bold span), so designed blocks never render obviously
// half-finished markup.

export interface StreamingPlanningSection {
  /** Raw H2 heading text as it appeared in the stream */
  heading: string
  /** Section body markdown (may still be growing when `complete` is false) */
  content: string
  /** Complete once the next H2 heading has arrived or the stream finished */
  complete: boolean
}

export interface StreamingPlanningMarkdown {
  /**
   * Markdown that is safe to render through the designed block renderers:
   * the preamble, every complete section, and the sanitized tail of the
   * still-growing section.
   */
  markdown: string
  /** All H2 headings seen so far, in stream order */
  headings: string[]
  /** Heading of the still-growing section (null when finished or none) */
  activeHeading: string | null
}

const H2_PATTERN = /^##\s+(.+)$/

/**
 * Split partial markdown into a preamble and H2 sections without any
 * completeness or order validation. The final section is only marked
 * complete when `finished`.
 */
export function parseStreamingPlanningDocument(
  content: string,
  { finished }: { finished: boolean },
): { preamble: string; sections: StreamingPlanningSection[] } {
  const sections: StreamingPlanningSection[] = []
  const preambleLines: string[] = []
  const lines = content.split("\n")
  let current: { heading: string; body: string[] } | null = null

  for (const line of lines) {
    const match = H2_PATTERN.exec(line)
    if (match) {
      if (current) {
        sections.push({
          heading: current.heading,
          content: current.body.join("\n").trim(),
          complete: true,
        })
      }
      current = { heading: match[1].trim(), body: [] }
      continue
    }
    if (current) {
      current.body.push(line)
    } else {
      preambleLines.push(line)
    }
  }

  if (current) {
    sections.push({
      heading: current.heading,
      content: current.body.join("\n").trim(),
      complete: finished,
    })
  }

  return { preamble: preambleLines.join("\n").trim(), sections }
}

function hasUnclosedBold(value: string) {
  return ((value.match(/\*\*/g) ?? []).length) % 2 === 1
}

/**
 * Prepare a still-growing section body for the structured renderers: drop
 * the trailing line while it could still become structure, and drop a lone
 * unclosed `**` marker so its text streams as plain prose until the closing
 * marker arrives.
 */
export function sanitizeStreamingPlanningTail(content: string) {
  if (!content) return ""

  const lines = content.split("\n")
  const last = lines[lines.length - 1] ?? ""
  const trimmed = last.trimStart()
  const partialHeading = /^#{1,6}(\s|$)/.test(trimmed) || /^#{1,6}$/.test(trimmed)
  const partialTableRow = trimmed.startsWith("|")
  if (partialHeading || partialTableRow) {
    lines.pop()
  }

  let result = lines.join("\n")
  if (hasUnclosedBold(result)) {
    const lastMarker = result.lastIndexOf("**")
    result = result.slice(0, lastMarker) + result.slice(lastMarker + 2)
  }
  return result.trimEnd()
}

/**
 * Build the markdown a streaming planning document should render right now:
 * preamble + complete sections verbatim + the active section with a
 * sanitized tail.
 */
export function buildStreamingPlanningMarkdown(
  content: string,
  { finished }: { finished: boolean },
): StreamingPlanningMarkdown {
  const { preamble, sections } = parseStreamingPlanningDocument(content, { finished })

  const parts: string[] = []
  if (preamble) parts.push(preamble)

  let activeHeading: string | null = null
  for (const section of sections) {
    const body = section.complete
      ? section.content
      : sanitizeStreamingPlanningTail(section.content)
    if (!section.complete) activeHeading = section.heading
    parts.push(`## ${section.heading}\n\n${body}`.trimEnd())
  }

  return {
    markdown: parts.join("\n\n"),
    headings: sections.map((section) => section.heading),
    activeHeading,
  }
}
