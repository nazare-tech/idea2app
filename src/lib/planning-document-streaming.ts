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
  // A trailing heading with no newline after it may still be mid-stream
  // ("## Core User Fl"); withhold it until the newline commits it.
  if (!finished && lines.length > 0 && H2_PATTERN.test(lines[lines.length - 1])) {
    lines.pop()
  }
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
