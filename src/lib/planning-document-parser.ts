export interface PlanningDocumentSection {
  heading: string
  content: string
}

export interface PlanningMarkdownTable {
  headers: string[]
  rows: string[][]
}

export interface PlanningNarrativeTable {
  source: string
  paragraphs: string[]
  items: string[]
  table: PlanningMarkdownTable | null
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

export function stripInlineMarkdown(value: string) {
  return normalizeWhitespace(
    value
      .replace(/^>\s*/gm, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1"),
  )
}

function isHorizontalRule(line: string) {
  return /^-{3,}$/.test(line.trim())
}

function cleanMarkdownLine(line: string) {
  return line.trim().replace(/^>\s*/, "")
}

function cleanPlanningContent(content: string) {
  return content
    .split("\n")
    .filter((line) => !isHorizontalRule(line))
    .map(cleanMarkdownLine)
    .join("\n")
    .trim()
}

export function normalizeHeading(value: string) {
  return stripInlineMarkdown(value)
    .toLowerCase()
    .replace(/^\d+(?:\.\d+)*\.?\s+/, "")
    .replace(/^[ivxlcdm]+\.\s+/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function stripHorizontalRulesFromMarkdown(content: string) {
  return content
    .split("\n")
    .filter((line) => !/^\s*-{3,}\s*$/.test(line))
    .join("\n")
    .trim()
}

export function splitLabeledText(value: string) {
  const cleaned = value.replace(/^>\s*/, "").trim()
  const match = cleaned.match(/^([^:]{2,96}):\s*(.*)$/)
  if (!match) return null

  return {
    label: match[1].trim(),
    body: match[2].trim().replace(/^>\s*/, ""),
  }
}

export function getTableCell(row: string[], headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase())
  const index = headers.findIndex((header) =>
    normalizedAliases.some((alias) => header.toLowerCase().includes(alias)),
  )

  return index >= 0 ? row[index] ?? "" : ""
}

export function getCurrentSectionTitle(heading: string) {
  const cleaned = stripInlineMarkdown(heading)
    .replace(/^\d+(?:\.\d+)*\.?\s+/, "")
    .replace(/\s*\/\s*/g, " / ")
    .trim()

  return cleaned
    .split(" ")
    .map((word) =>
      /^(?:MVP|PRD|AI|API|UX|UI)$/.test(word.toUpperCase())
        ? word.toUpperCase()
        : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ")
}

export function splitBlocks(content: string) {
  return cleanPlanningContent(content)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function isListLine(line: string) {
  return /^\s*(?:[-*+]|\d+\.|\[[ xX]\])\s+/.test(line)
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

export function extractSectionsByHeading(
  content: string,
  level: 2 | 3 | 4,
): PlanningDocumentSection[] {
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

export function findSectionByAliases(
  sections: PlanningDocumentSection[],
  aliases: string[],
) {
  const normalizedAliases = aliases.map(normalizeHeading)
  return sections.find((section) => {
    const heading = normalizeHeading(section.heading)
    return normalizedAliases.some(
      (alias) => heading === alias || heading.includes(alias),
    )
  })
}

export function parseParagraphBlocks(content: string) {
  return splitBlocks(content)
    .filter((block) => {
      const firstLine = block.split("\n").map(cleanMarkdownLine).find((line) => line.trim())
      return firstLine
        ? !isListLine(firstLine) &&
            !isTableRow(firstLine) &&
            !firstLine.startsWith("#") &&
            !firstLine.startsWith("```") &&
            !isHorizontalRule(firstLine)
        : false
    })
    .map((block) => stripInlineMarkdown(block.replace(/\n+/g, " ")))
    .filter(Boolean)
}

export function parseListItems(content: string) {
  const items: string[] = []
  let current: string[] = []

  for (const rawLine of cleanPlanningContent(content).split("\n")) {
    const line = cleanMarkdownLine(rawLine)

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
      current = [line.replace(/^\s*(?:[-*+]|\d+\.|\[[ xX]\])\s+/, "")]
      continue
    }

    if (current.length > 0 && !line.startsWith("#") && !isTableRow(line)) {
      current.push(line)
    }
  }

  if (current.length > 0) {
    items.push(stripInlineMarkdown(current.join(" ")))
  }

  return items.filter(Boolean)
}

export function parseMarkdownTable(content: string): PlanningMarkdownTable | null {
  const lines = cleanPlanningContent(content)
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

export function parseNarrativeTable(content: string): PlanningNarrativeTable {
  const source = cleanPlanningContent(content)

  return {
    source,
    paragraphs: parseParagraphBlocks(source),
    items: parseListItems(source),
    table: parseMarkdownTable(source),
  }
}
