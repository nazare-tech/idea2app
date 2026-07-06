const OPTION_HEADER_RE = /^#{1,6}\s*Option\s*([A-C])(?:\s*[-:]\s*(.*))?$/i

export interface ParsedMockupOption {
  label: string
  title: string
  pros: string[]
  cons: string[]
  json: string
}

export function extractMockupOptions(content: string): ParsedMockupOption[] {
  const lines = content.split("\n")
  const options: ParsedMockupOption[] = []

  let currentLabel = ""
  let currentTitle = ""
  let currentPros: string[] = []
  let currentCons: string[] = []
  let currentSection: "pros" | "cons" | "none" = "none"
  let inJson = false
  let jsonLines: string[] = []

  const flush = () => {
    if (!currentLabel || jsonLines.length === 0) return

    options.push({
      label: currentLabel,
      title: currentTitle || `Option ${currentLabel}`,
      pros: currentPros,
      cons: currentCons,
      json: jsonLines.join("\n").trim(),
    })

    currentLabel = ""
    currentTitle = ""
    currentPros = []
    currentCons = []
    currentSection = "none"
    jsonLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    const headerMatch = line.match(OPTION_HEADER_RE)
    if (!inJson && headerMatch) {
      flush()
      currentLabel = headerMatch[1].toUpperCase()
      currentTitle = (headerMatch[2] || "").trim()
      continue
    }

    if (!inJson && /^pros\s*:\s*$/i.test(line.replace(/[`*_#]/g, ""))) {
      currentSection = "pros"
      continue
    }

    if (!inJson && /^cons\s*:\s*$/i.test(line.replace(/[`*_#]/g, ""))) {
      currentSection = "cons"
      continue
    }

    if (!inJson && /^```json\s*$/i.test(line)) {
      inJson = true
      jsonLines.push("```json")
      continue
    }

    if (inJson) {
      jsonLines.push(rawLine)
      if (/^```\s*$/.test(line)) {
        inJson = false
      }
      continue
    }

    const bullet = line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim()
    if (!bullet) continue

    if (currentSection === "pros") {
      currentPros.push(bullet)
    } else if (currentSection === "cons") {
      currentCons.push(bullet)
    }
  }

  flush()
  return options
}

export function hasThreeOptionProsConsContract(content: string): boolean {
  const options = extractMockupOptions(content)
  if (options.length < 3) return false

  return options.slice(0, 3).every((option) => {
    const hasJson = /```json[\s\S]*```/i.test(option.json)
    return hasJson && option.pros.length > 0 && option.cons.length > 0
  })
}
