import type { PlanningDocumentSection } from "@/lib/planning-document-parser"
import {
  getCurrentSectionTitle,
  normalizeHeading,
  splitLabeledText,
  stripHorizontalRulesFromMarkdown,
  stripInlineMarkdown,
} from "@/lib/planning-document-parser"

export interface TimelinePhaseDetail {
  label?: string
  body?: string
  bullets: string[]
}

export function parseTimelinePhaseDetails(content: string) {
  const details: TimelinePhaseDetail[] = []
  let active: TimelinePhaseDetail | null = null

  for (const rawLine of stripHorizontalRulesFromMarkdown(content).split("\n")) {
    if (!rawLine.trim()) continue

    const listMatch = rawLine.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const indent = listMatch[1]?.length ?? 0
      const text = stripInlineMarkdown(listMatch[2]?.trim() ?? "")
      if (!text) continue

      if (indent > 0 && active) {
        active.bullets.push(text)
        continue
      }

      const labeled = splitLabeledText(text)
      active = {
        label: labeled?.label,
        body: labeled ? labeled.body : text,
        bullets: [],
      }
      details.push(active)
      continue
    }

    const text = stripInlineMarkdown(rawLine.trim())
    if (!text) continue

    if (!active) {
      active = { body: text, bullets: [] }
      details.push(active)
      continue
    }

    if (active.bullets.length > 0) {
      active.bullets[active.bullets.length - 1] = `${active.bullets[active.bullets.length - 1]} ${text}`
    } else {
      active.body = [active.body, text].filter(Boolean).join(" ")
    }
  }

  return details.filter((detail) => detail.label || detail.body || detail.bullets.length > 0)
}

export function getTimelineDetail(details: TimelinePhaseDetail[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeading)

  return details.find((detail) => {
    if (!detail.label) return false
    const label = normalizeHeading(detail.label)
    return normalizedAliases.some((alias) => label === alias || label.includes(alias))
  })
}

export function getTimelinePhaseTitle(heading: string) {
  return getCurrentSectionTitle(heading).replace(/^Phase\s+\d+\s*:?\s*/i, "").trim()
}

function getTimelinePhaseDurationWeeks(phase: PlanningDocumentSection) {
  const details = parseTimelinePhaseDetails(phase.content)
  const duration =
    getTimelineDetail(details, ["Estimated duration", "Duration"])?.body ??
    phase.content.match(/Estimated duration\*\*:\s*([^\n]+)/i)?.[1] ??
    phase.content.match(/Duration\*\*:\s*([^\n]+)/i)?.[1] ??
    phase.content.match(/(\d+)\s*(?:weeks?|wks?)/i)?.[0]
  const match = duration?.match(/(\d+)/)

  return match ? Number(match[1]) : null
}

export function getTimelinePhaseWeekRanges(phases: PlanningDocumentSection[]) {
  let nextStart = 1

  return phases.map((phase) => {
    const duration = getTimelinePhaseDurationWeeks(phase)
    if (!duration || Number.isNaN(duration)) return null

    const start = nextStart
    const end = nextStart + duration - 1
    nextStart = end + 1
    return `Weeks ${start}-${end}`
  })
}
