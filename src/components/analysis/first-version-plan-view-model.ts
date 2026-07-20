import type { PlanningDocumentSection } from "@/lib/planning-document-parser"
import {
  getCurrentSectionTitle,
  getTableCell,
  extractSectionsByHeading,
  parseNarrativeTable,
  splitLabeledText,
  stripInlineMarkdown,
} from "@/lib/planning-document-parser"

export function getFirstParagraph(section?: PlanningDocumentSection) {
  if (!section?.content.trim()) return ""
  const narrative = parseNarrativeTable(section.content)
  return narrative.paragraphs[0] || narrative.items[0] || ""
}

export function stripMarkdownMarker(value: string) {
  return stripInlineMarkdown(value).replace(/^[-*+]\s+/, "").trim()
}

export function getDesignListRows(content: string) {
  const narrative = parseNarrativeTable(content)

  if (narrative.table) {
    const { headers, rows } = narrative.table
    return rows.map((row, index) => {
      const title =
        getTableCell(row, headers, ["step"]) ||
        getTableCell(row, headers, ["feature"]) ||
        getTableCell(row, headers, ["category"]) ||
        getTableCell(row, headers, ["layer"]) ||
        getTableCell(row, headers, ["metric"]) ||
        row[0] ||
        `Item ${index + 1}`
      const body =
        getTableCell(row, headers, ["build chunk"]) ||
        getTableCell(row, headers, ["recommendation"]) ||
        getTableCell(row, headers, ["include"]) ||
        getTableCell(row, headers, ["why"]) ||
        getTableCell(row, headers, ["description"]) ||
        getTableCell(row, headers, ["criteria"]) ||
        row.slice(1).filter(Boolean).join(" ")

      return {
        title: stripMarkdownMarker(title),
        body: stripMarkdownMarker(body),
        row,
        headers,
      }
    })
  }

  return narrative.items.map((item, index) => {
    const labeled = splitLabeledText(stripMarkdownMarker(item))
    return {
      title: labeled?.label || stripMarkdownMarker(item).replace(/^\d+\.\s*/, "") || `Item ${index + 1}`,
      body: labeled?.body || "",
      row: [] as string[],
      headers: [] as string[],
    }
  })
}

export function getNestedDesignCards(section?: PlanningDocumentSection) {
  if (!section?.content.trim()) return []
  const nested = extractSectionsByHeading(section.content, 3)

  if (nested.length > 0) {
    return nested.map((child) => ({
      title: getCurrentSectionTitle(child.heading),
      body: getFirstParagraph(child) || parseNarrativeTable(child.content).items.join(" "),
    }))
  }

  const narrative = parseNarrativeTable(section.content)
  if (narrative.items.length > 0) {
    return narrative.items.map((item) => {
      const labeled = splitLabeledText(stripMarkdownMarker(item))
      return {
        title: labeled?.label || getCurrentSectionTitle(section.heading),
        body: labeled?.body || stripMarkdownMarker(item),
      }
    })
  }

  return narrative.paragraphs.map((paragraph, index) => ({
    title: index === 0 ? getCurrentSectionTitle(section.heading) : `Note ${index + 1}`,
    body: paragraph,
  }))
}

function extractBracketLabel(value: string) {
  const match = value.match(/^\s*\[([^\]]+)\]\s*(.*)$/)
  if (!match) return null

  return {
    label: match[1].trim(),
    text: match[2].trim(),
  }
}

export function getFvpAssumptionRows(section?: PlanningDocumentSection) {
  return getDesignListRows(section?.content ?? "").map((row) => {
    const titleLabel = extractBracketLabel(row.title)
    const bodyLabel = !titleLabel ? extractBracketLabel(row.body) : null
    const label = titleLabel?.label || bodyLabel?.label || "Assumption"

    return {
      tag: label,
      title: titleLabel?.text || row.title,
      body: bodyLabel?.text || row.body,
    }
  })
}

export function getFvpScopeRows({
  scope,
  features,
}: {
  scope?: PlanningDocumentSection
  features?: PlanningDocumentSection
}) {
  const scopeRows = getDesignListRows(scope?.content ?? "").map((row) => ({
    tag: /exclude|out/i.test(row.title + row.body) ? "Out Of Scope" : "Scope",
    title: row.title,
    body: row.body,
  }))
  const featureRows = getDesignListRows(features?.content ?? "").map((row) => ({
    tag: "Feature",
    title: row.title,
    body: row.body,
  }))
  return [...scopeRows, ...featureRows]
}

export function getFvpShortcutSections(section?: PlanningDocumentSection) {
  if (!section?.content.trim()) return []

  return extractSectionsByHeading(section.content, 3).filter((child) => {
    const heading = stripInlineMarkdown(child.heading).toLowerCase()
    return /tactical shortcuts|manual shortcuts|speed to market|ops over code/.test(heading)
  })
}
