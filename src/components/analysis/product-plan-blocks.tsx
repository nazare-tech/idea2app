"use client"

import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleGauge,
  ClipboardList,
  Compass,
  Database,
  Layers,
  Puzzle,
  ShieldCheck,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react"

import { ExplainableLabel } from "@/components/analysis/explainable-term"
import type { PlanningDocumentSection, PlanningNarrativeTable } from "@/lib/planning-document-parser"
import {
  extractSectionsByHeading,
  normalizeHeading,
  parseNarrativeTable,
  stripInlineMarkdown,
} from "@/lib/planning-document-parser"
import { cn } from "@/lib/utils"
import {
  DataTable,
  InlineLabeledText,
  NarrativeContent,
  PlanningMarkdownRenderer,
  Warning,
  displayFontClass,
  getCurrentSectionTitle,
  getSectionByAlias,
  getStatValue,
  getTableCell,
  isCurrentPromptDocument,
  splitLabeledText,
  stripHorizontalRulesFromMarkdown,
  type PlanningDocumentProps,
} from "./planning-blocks-shared"

function DesignedBulletList({
  content,
  marker = "dot",
  label,
}: {
  content: string
  marker?: "dot" | "check"
  label: string
}) {
  const narrative = parseNarrativeTable(content)
  const items = [...narrative.items, ...narrative.paragraphs].filter(Boolean)

  if (items.length === 0 && !narrative.table) {
    return (
      <p className="ui-type-body-sm text-[#999999]">
        No structured content available.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <ul aria-label={label} className="space-y-3">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-3">
              {marker === "check" ? (
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-primary/20 bg-primary/5 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="mt-[0.62rem] h-1.5 w-1.5 shrink-0 bg-primary" />
              )}
              <InlineLabeledText value={stripInlineMarkdown(item)} className="text-[#4A4040]" />
            </li>
          ))}
        </ul>
      ) : null}
      {narrative.table ? (
        <DataTable headers={narrative.table.headers} rows={narrative.table.rows} />
      ) : null}
    </div>
  )
}

interface TimelinePhaseDetail {
  label?: string
  body?: string
  bullets: string[]
}

function parseTimelinePhaseDetails(content: string) {
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

function getTimelineDetail(details: TimelinePhaseDetail[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeading)

  return details.find((detail) => {
    if (!detail.label) return false
    const label = normalizeHeading(detail.label)
    return normalizedAliases.some((alias) => label === alias || label.includes(alias))
  })
}

function getTimelinePhaseTitle(heading: string) {
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

function getTimelinePhaseWeekRanges(phases: PlanningDocumentSection[]) {
  let nextStart = 1

  return phases.map((phase) => {
    const duration = getTimelinePhaseDurationWeeks(phase)
    if (!duration || Number.isNaN(duration)) {
      return null
    }

    const start = nextStart
    const end = nextStart + duration - 1
    nextStart = end + 1

    return `Weeks ${start}-${end}`
  })
}

function TimelinePhaseCard({
  phase,
  index,
  weekRange,
}: {
  phase: PlanningDocumentSection
  index: number
  weekRange: string | null
}) {
  const title = getTimelinePhaseTitle(phase.heading)
  const details = parseTimelinePhaseDetails(phase.content)
  const goal = getTimelineDetail(details, ["Goal"])?.body ?? details.find((detail) => detail.body)?.body
  const deliverables =
    getTimelineDetail(details, ["Key deliverables", "Deliverables"])?.bullets ??
    details.flatMap((detail) => detail.bullets)

  return (
    <article className="border border-[#E8DDD5] bg-white px-6 py-6 shadow-[0_4px_18px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Phase {index + 1}
        </p>
        {weekRange ? (
          <p className="font-mono text-[10px] font-medium tracking-[0.12em] text-[#8A8480]">
            {weekRange}
          </p>
        ) : null}
      </div>

      <h3 className={cn(displayFontClass, "mt-2 text-[20px] font-bold leading-tight tracking-[-0.03em] text-[#0A0A0A]")}>
        {title}
      </h3>

      {goal ? (
        <p className="mt-4 text-[13px] font-medium leading-5 text-[#6F6A66]">
          {goal}
        </p>
      ) : null}

      {deliverables.length > 0 ? (
        <div className="mt-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B8B0AA]">
            Key Deliverables
          </p>
          <ul aria-label={`${title} key deliverables`} className="mt-4 space-y-3">
            {deliverables.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`} className="flex gap-3 text-[12.5px] font-medium leading-5 text-[#4A4040]">
                <Check className="mt-1 h-3 w-3 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

type RequirementCategory = "Functional" | "Non-Functional" | "Integration"

interface RequirementItem {
  id?: string
  title?: string
  description: string
  meta?: string[]
}

function classifyRequirement(item: string): RequirementCategory {
  if (
    /^(?:nfr[-\s]?\d+|performance|privacy|security|reliability|scalability|data retention|compliance)/i.test(
      item,
    )
  ) {
    return "Non-Functional"
  }

  if (
    /^(?:ir[-\s]?\d+|integration|chrome|firefox|safari|api|rest api|webhook|export|slack|jira|linear|third-party)/i.test(
      item,
    )
  ) {
    return "Integration"
  }

  return "Functional"
}

function normalizeRequirementCategory(value: string): RequirementCategory {
  if (/non[-\s]?functional|nfr/i.test(value)) return "Non-Functional"
  if (/integration|ir/i.test(value)) return "Integration"
  return "Functional"
}

function createRequirementGroups() {
  return new Map<RequirementCategory, RequirementItem[]>([
    ["Functional", []],
    ["Non-Functional", []],
    ["Integration", []],
  ])
}

function getRequirementCategoryFromId(id: string): RequirementCategory {
  if (/^NFR/i.test(id)) return "Non-Functional"
  if (/^IR/i.test(id)) return "Integration"
  return "Functional"
}

function parseRequirementLine(line: string) {
  const cleaned = stripInlineMarkdown(
    line
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
      .replace(/^>\s*/, "")
      .trim(),
  )

  if (!cleaned) return null

  const idMatch = cleaned.match(/^([A-Z]{1,5}[-\s]?\d+)\s*:?\s*(.*)$/i)
  if (idMatch) {
    const id = idMatch[1].replace(/\s+/, "-").toUpperCase()
    const rest = idMatch[2]?.trim() ?? ""
    const labeled = splitLabeledText(rest)

    return {
      id,
      title: labeled?.label || rest || undefined,
      description: labeled?.body || "",
    }
  }

  const labeled = splitLabeledText(cleaned)
  return {
    id: undefined,
    title: labeled?.label,
    description: labeled?.body || cleaned,
  }
}

function parseRequirementItemsFromMarkdown(
  content: string,
  category?: RequirementCategory,
) {
  const items: Array<RequirementItem & { category: RequirementCategory }> = []
  let active: (RequirementItem & { category: RequirementCategory }) | null = null

  for (const rawLine of stripHorizontalRulesFromMarkdown(content).split("\n")) {
    if (!rawLine.trim()) continue

    const isListItem = /^\s*(?:[-*+]|\d+\.)\s+/.test(rawLine)
    const isNestedListItem = /^\s{2,}(?:[-*+]|\d+\.)\s+/.test(rawLine)
    const parsed = parseRequirementLine(rawLine)

    if (!parsed) continue

    if (isNestedListItem && active) {
      active.description = [active.description, parsed.description || parsed.title]
        .filter(Boolean)
        .join(" ")
      continue
    }

    if (active?.id && !parsed.id && isListItem) {
      active.description = [active.description, parsed.description || parsed.title]
        .filter(Boolean)
        .join(" ")
      continue
    }

    if (!isListItem && !parsed.id) continue

    const itemCategory =
      category ??
      (parsed.id
        ? getRequirementCategoryFromId(parsed.id)
        : classifyRequirement(parsed.title ?? parsed.description ?? rawLine))
    active = {
      ...parsed,
      category: itemCategory,
      description: parsed.description || "",
    }
    items.push(active)
  }

  return items
}

function addRequirementItemsToGroups(
  groups: Map<RequirementCategory, RequirementItem[]>,
  items: Array<RequirementItem & { category: RequirementCategory }>,
) {
  for (const item of items) {
    groups.get(item.category)?.push({
      id: item.id,
      title: item.title,
      description: item.description,
      meta: item.meta,
    })
  }
}

function getRequirementGroups(narrative: PlanningNarrativeTable) {
  const groups = createRequirementGroups()
  const nestedSections = extractSectionsByHeading(narrative.source, 3)

  if (nestedSections.length > 0) {
    for (const section of nestedSections) {
      addRequirementItemsToGroups(
        groups,
        parseRequirementItemsFromMarkdown(
          section.content,
          normalizeRequirementCategory(section.heading),
        ),
      )
    }

    return groups
  }

  if (narrative.table) {
    const headers = narrative.table.headers

    for (const row of narrative.table.rows) {
      const type = normalizeRequirementCategory(getTableCell(row, headers, ["type", "category"]))
      const id = getTableCell(row, headers, ["id", "#"])
      const requirement = getTableCell(row, headers, ["requirement", "feature", "name"])
      const notes = getTableCell(row, headers, ["acceptance", "notes", "priority", "rationale"])
      const fallback = row.filter(Boolean).join(" - ")

      groups.get(type)?.push({
        id: id || undefined,
        title: requirement || fallback,
        description: notes,
      })
    }

    return groups
  }

  const parsedItems = parseRequirementItemsFromMarkdown(narrative.source)
  if (parsedItems.length > 0) {
    addRequirementItemsToGroups(groups, parsedItems)
    return groups
  }

  for (const item of narrative.items) {
    if (/^(functional|non-functional|integration) requirements?$/i.test(item)) {
      continue
    }

    const labeled = splitLabeledText(item)
    const type = classifyRequirement(item)
    groups.get(type)?.push({
      title: labeled?.label,
      description: labeled?.body || item,
    })
  }

  return groups
}

function cleanStoryText(value: string) {
  return stripInlineMarkdown(
    value
      .replace(/^#{1,6}\s*/, "")
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
      .replace(/^>\s*/, "")
      .replace(/^Story:\s*/i, "")
      .trim(),
  )
}

function isUserStoryLabel(value: string) {
  return /^User story:?$/i.test(value)
}

function getStoryHeading(value: string) {
  const cleaned = cleanStoryText(value)
  const match = cleaned.match(/^(US[-\s]?\d+)\s*:?\s*(.*)$/i)
  if (!match) return null

  return {
    originalId: match[1].replace(/\s+/, "-").toUpperCase(),
    text: match[2]?.replace(/^["']|["']$/g, "").trim() ?? "",
  }
}

function getNormalizedUserStoryId(index: number) {
  return `US-${String(index + 1).padStart(3, "0")}`
}

function parseAcceptanceCriteria(lines: string[]) {
  const criteria: string[] = []
  let inCriteria = false

  for (const line of lines) {
    const cleaned = cleanStoryText(line)
    if (!cleaned) continue

    const criteriaMatch = cleaned.match(/^Acceptance Criteria:?\s*(.*)$/i)
    if (criteriaMatch) {
      inCriteria = true
      const inline = criteriaMatch[1]?.trim()
      if (inline) {
        criteria.push(
          ...inline
            .split(/\s+-\s+/)
            .map(cleanStoryText)
            .map((criterion) => criterion.replace(/^[-*]\s*/, ""))
            .filter(Boolean),
        )
      }
      continue
    }

    if (inCriteria && !getStoryHeading(line)) {
      criteria.push(cleaned)
    }
  }

  return criteria
}

function extractUserStoryText(chunk: string[]) {
  const cleanedLines = chunk.map(cleanStoryText).filter(Boolean)
  const heading = chunk.map(getStoryHeading).find(Boolean)

  if (heading?.text && /^As an?\b/i.test(heading.text)) {
    return heading.text
  }

  const storyLines: string[] = []
  let inStory = false

  for (const line of cleanedLines) {
    if (isUserStoryLabel(line)) {
      inStory = true
      continue
    }

    if (/^Acceptance Criteria:?/i.test(line)) break
    if (getStoryHeading(line)) continue

    if (/^As an?\b/i.test(line)) {
      inStory = true
      storyLines.push(line)
      continue
    }

    if (inStory && /^(?:I want|So that)\b/i.test(line)) {
      storyLines.push(line)
      continue
    }
  }

  if (storyLines.length > 0) {
    return storyLines.join(" ")
  }

  return heading?.text ?? ""
}

function getUserStoryTitle(chunk: string[], story: string, index: number) {
  const heading = chunk.map(getStoryHeading).find(Boolean)

  if (heading?.text && !/^As an?\b/i.test(heading.text)) {
    return heading.text
  }

  const actor = story.match(/^"?(As an? [^,]+)/i)?.[1]
  return actor ? actor.replace(/^As an?\s+/i, "") : `Story ${index + 1}`
}

function parseUserStories(narrative: PlanningNarrativeTable) {
  const lines = narrative.source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^-{3,}$/.test(line))

  const chunks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    const cleaned = cleanStoryText(line)
    const startsHeading = Boolean(getStoryHeading(line))
    const startsAsStory =
      !/^Story:/i.test(line.trim()) && /^As an?\b/i.test(cleaned)
    const startsStory = startsHeading || startsAsStory

    if (
      startsStory &&
      current.length > 0 &&
      !(startsAsStory && current.some((currentLine) => Boolean(getStoryHeading(currentLine))))
    ) {
      chunks.push(current)
      current = [line]
      continue
    }

    current.push(line)
  }

  if (current.length > 0) chunks.push(current)

  return chunks
    .map((chunk, index) => {
      const story = extractUserStoryText(chunk)

      if (!story) return null

      return {
        id: getNormalizedUserStoryId(index),
        title: getUserStoryTitle(chunk, story, index),
        story,
        criteria: parseAcceptanceCriteria(chunk),
      }
    })
    .filter((story): story is NonNullable<typeof story> => story !== null)
}

const currentPrdSectionAliases = [
  "Introduction/overview",
  "Goals",
  "User personas",
  "User stories and acceptance criteria",
  "Functional requirements",
  "Technical considerations",
  "Non-goals / out of scope",
]

interface CurrentPersona {
  name: string
  fields: Array<{ label: string; body: string; items: string[] }>
}

const standalonePersonaFieldLabels = [
  "Archetype",
  "User type",
  "Role",
  "Meta",
  "Profile",
  "Context",
  "Age",
  "Occupation",
  "Location",
  "Technical level",
  "Technology comfort level",
  "Technology comfort",
  "Tech comfort",
  "Demographics",
  "Background",
  "Description",
  "Who this user is",
  "Needs",
  "What they need",
  "How this product addresses their needs",
  "Pain points",
  "Pain point",
  "Problems they face today",
  "Pain points and frustrations",
  "Frustrations",
  "Motivation",
  "Why they would use this product",
  "Goals",
  "Goal",
  "Goals and motivations",
]

function normalizePersonaFieldLabel(value: string) {
  return normalizeHeading(value).replace(/[^a-z0-9]+/g, " ").trim()
}

function isKnownPersonaFieldLabel(value: string) {
  const label = normalizePersonaFieldLabel(value)
  return standalonePersonaFieldLabels.some((alias) => label === normalizePersonaFieldLabel(alias))
}

function createPersonaField(
  persona: CurrentPersona,
  label: string,
  body = "",
) {
  const field = {
    label: stripInlineMarkdown(label),
    body: stripInlineMarkdown(body),
    items: [],
  }
  persona.fields.push(field)
  return field
}

function isPersonaListField(label: string) {
  const normalized = normalizePersonaFieldLabel(label)
  return [
    "needs",
    "what they need",
    "how this product addresses their needs",
    "pain points",
    "pain point",
    "problems they face today",
    "pain points and frustrations",
    "frustrations",
    "goals",
    "goal",
    "goals and motivations",
  ].includes(normalized)
}

function isPersonaMetadataField(label: string) {
  const normalized = normalizePersonaFieldLabel(label)
  return [
    "meta",
    "profile",
    "context",
    "age",
    "occupation",
    "location",
    "technical level",
    "technology comfort level",
    "technology comfort",
    "tech comfort",
    "demographics",
  ].includes(normalized)
}

function isPersonaFallbackProseField(label: string) {
  return ![
    "archetype",
    "user type",
    "role",
    "needs",
    "what they need",
    "how this product addresses their needs",
    "pain points",
    "pain point",
    "problems they face today",
    "pain points and frustrations",
    "frustrations",
    "motivation",
    "why they would use this product",
    "goals",
    "goal",
    "goals and motivations",
  ].includes(normalizePersonaFieldLabel(label)) && !isPersonaMetadataField(label)
}

function parseCurrentPersonas(content: string): CurrentPersona[] {
  const personas: CurrentPersona[] = []
  let active: CurrentPersona | null = null
  let activeField: CurrentPersona["fields"][number] | null = null

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    const heading = trimmed.match(/^\*\*([^*:][^*]{1,96})\*\*$/)?.[1]?.trim()

    if (heading) {
      if (active && isKnownPersonaFieldLabel(heading)) {
        activeField = createPersonaField(active, heading)
        continue
      }

      active = { name: heading, fields: [] }
      activeField = null
      personas.push(active)
      continue
    }

    if (!active) continue

    const tagline = trimmed.match(/^\*([^*]{2,96})\*$/)?.[1]?.trim()
    if (tagline && active.fields.length === 0) {
      activeField = createPersonaField(active, "Archetype", tagline)
      continue
    }

    const listMatch = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/)
    const listText = listMatch?.[2]?.trim() ?? trimmed
    const field = listText.match(/^\*\*([^*]+)\*\*:\s*(.*)$/)

    if (field) {
      activeField = createPersonaField(active, field[1].trim(), field[2].trim())
      continue
    }

    const plainField = listText.match(/^([^:]{2,80}):\s*(.+)$/)
    if (plainField && !/[.!?]$/.test(plainField[1].trim())) {
      activeField = createPersonaField(active, plainField[1].trim(), plainField[2].trim())
      continue
    }

    if (activeField && listMatch && listText && (listMatch[1].length > 0 || isPersonaListField(activeField.label))) {
      activeField.items.push(stripInlineMarkdown(listText))
      continue
    }

    if (activeField && trimmed && !/^#{1,6}\s+/.test(trimmed)) {
      const body = stripInlineMarkdown(trimmed.replace(/^\s*(?:[-*+]|\d+\.)\s+/, ""))
      activeField.body = [activeField.body, body].filter(Boolean).join(" ")
    }
  }

  return personas.filter((persona) => !isKnownPersonaFieldLabel(persona.name))
}

function getPersonaField(persona: CurrentPersona, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizePersonaFieldLabel)

  return persona.fields.find((field) => {
    const label = normalizePersonaFieldLabel(field.label)
    return normalizedAliases.some((alias) => label === alias || label.includes(alias))
  })
}

function getPersonaFieldText(field?: CurrentPersona["fields"][number]) {
  if (!field) return ""
  return [field.body, ...field.items].filter(Boolean).join(" ").trim()
}

function splitPersonaList(value: string) {
  return value
    .split(/\s*(?:;|\||\n)\s*/g)
    .map((item) => stripInlineMarkdown(item).trim())
    .filter(Boolean)
}

function getPersonaFieldItems(
  persona: CurrentPersona,
  aliases: string[],
  fallbackAliases: string[] = [],
) {
  const field = getPersonaField(persona, aliases) ?? getPersonaField(persona, fallbackAliases)
  if (!field) return []

  if (field.items.length > 0) {
    return field.items.map((item) => stripInlineMarkdown(item)).filter(Boolean)
  }

  return splitPersonaList(field.body)
}

function formatPersonaMetaField(field: CurrentPersona["fields"][number]) {
  const value = getPersonaFieldText(field)
  if (!value) return ""

  const label = normalizePersonaFieldLabel(field.label)
  if (label === "age") return /^age\b/i.test(value) ? value : `Age ${value}`

  return value
}

function buildPersonaMeta(persona: CurrentPersona) {
  const metaField = getPersonaField(persona, ["Meta", "Profile", "Context"])
  if (metaField) {
    return splitPersonaList([metaField.body, ...metaField.items].filter(Boolean).join("; ")).slice(0, 4)
  }

  return persona.fields
    .filter((field) =>
      ["Age", "Occupation", "Location", "Demographics", "Technology comfort level", "Technology comfort", "Technical level", "Tech comfort", "Role"].some(
        (alias) => normalizePersonaFieldLabel(field.label).includes(normalizePersonaFieldLabel(alias)),
      ),
    )
    .map(formatPersonaMetaField)
    .filter(Boolean)
    .filter((value) => value.length <= 96)
    .slice(0, 4)
}

function normalizePersonaCard(persona: CurrentPersona, index: number) {
  const fallbackProseField = persona.fields.find((field) => isPersonaFallbackProseField(field.label))
  const description =
    getPersonaFieldText(getPersonaField(persona, ["Description", "Who this user is", "Background"])) ||
    getPersonaFieldText(fallbackProseField)
  const needs = getPersonaFieldItems(
    persona,
    ["Needs", "What they need", "How this product addresses their needs"],
    ["Goals", "Goal", "Goals and motivations"],
  )
  const painPoints = getPersonaFieldItems(
    persona,
    ["Pain points", "Pain point", "Problems they face today", "Pain points and frustrations", "Frustrations"],
  )
  const motivation =
    getPersonaFieldText(getPersonaField(persona, ["Motivation", "Why they would use this product"])) ||
    getPersonaFieldText(getPersonaField(persona, ["Goals and motivations", "Goal", "Goals"])) ||
    needs[0] ||
    description

  return {
    name: persona.name,
    archetype:
      getPersonaFieldText(getPersonaField(persona, ["Archetype", "User type", "Role"])) ||
      (persona.name === "Target User Profile" ? "Primary user" : `Persona ${String(index + 1).padStart(2, "0")}`),
    meta: buildPersonaMeta(persona),
    description,
    needs,
    painPoints,
    motivation,
  }
}

function PersonaSilhouette({ variant }: { variant: "female" | "male" | "neutral" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="block h-full w-full text-[#4A4040]"
      aria-hidden="true"
    >
      {variant === "female" ? (
        <>
          <rect x="28" y="18" width="44" height="58" rx="22" fill="currentColor" />
          <path d="M17 100 C17 77 32 68 50 68 C68 68 83 77 83 100 Z" fill="currentColor" />
        </>
      ) : variant === "male" ? (
        <>
          <path d="M14 100 C14 73 31 64 50 64 C69 64 86 73 86 100 Z" fill="currentColor" />
          <circle cx="50" cy="35" r="20" fill="currentColor" />
        </>
      ) : (
        <>
          <path d="M17 100 C17 75 32 66 50 66 C68 66 83 75 83 100 Z" fill="currentColor" />
          <circle cx="50" cy="37" r="18" fill="currentColor" />
        </>
      )}
    </svg>
  )
}

function PersonaAvatar({ index }: { index: number }) {
  const variants: Array<"female" | "male" | "neutral"> = ["female", "male", "neutral"]

  return (
    <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-full border border-[#E8DDD5] bg-[#F5F0EB] shadow-[0_0_0_3px_#FFFFFF,0_0_0_5px_#DC2626]">
      <div className="absolute inset-0 pt-3.5">
        <PersonaSilhouette variant={variants[index % variants.length]} />
      </div>
    </div>
  )
}

function PersonaSectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof UsersRound
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-[15px] w-[15px] text-[#8A8480]" strokeWidth={1.75} />
      <span className="font-mono text-[11px] font-medium uppercase leading-tight tracking-[0.18em] text-[#4A4040]">
        {children}
      </span>
    </div>
  )
}

function PersonaItemList({
  items,
  markerClassName,
}: {
  items: string[]
  markerClassName: string
}) {
  if (items.length === 0) {
    return <p className="text-[15px] leading-6 text-[#8A8480]">No structured details available.</p>
  }

  return (
    <ul className="space-y-[11px]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-[11px]">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-[1px]", markerClassName)} />
          <span className="text-[15px] leading-[1.5] text-[#4A4040]">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function DetailedPersonaCard({
  persona,
  index,
}: {
  persona: CurrentPersona
  index: number
}) {
  const card = normalizePersonaCard(persona, index)

  return (
    <article className="overflow-hidden border border-[#E8DDD5] bg-white">
      <div className="p-7 sm:p-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <PersonaAvatar index={index} />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-[7px] w-[7px] rounded-[1px] bg-primary" />
              <span className="font-mono text-[10px] font-medium uppercase leading-tight tracking-[0.18em] text-[#4A4040]">
                Persona {index + 1}
              </span>
            </div>
            <h3 className={cn(displayFontClass, "text-[26px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1C1917]")}>
              {card.name}
            </h3>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-[#4A4040]">
              {card.archetype}
            </p>
            {card.meta.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.meta.map((item) => (
                  <span
                    key={`${card.name}-${item}`}
                    className="inline-flex rounded-full border border-[#EAE0D8] bg-[#F5F0EB] px-[10px] py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#6B7280]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="my-8 border-t border-[#EAE0D8] sm:my-10" />

        <section>
          <PersonaSectionLabel icon={UsersRound}>Description</PersonaSectionLabel>
          <p className="max-w-[64ch] text-[16px] leading-[1.6] text-[#1C1917]">
            {card.description || "No structured description available."}
          </p>
        </section>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <section>
            <PersonaSectionLabel icon={Target}>Needs</PersonaSectionLabel>
            <PersonaItemList items={card.needs} markerClassName="bg-[#8A8480]" />
          </section>
          <section>
            <PersonaSectionLabel icon={AlertTriangle}>Pain points</PersonaSectionLabel>
            <PersonaItemList items={card.painPoints} markerClassName="bg-[#D95F3B]" />
          </section>
        </div>

        <section className="mt-8 border border-[#EAE0D8] bg-[#F5F0EB] p-6">
          <PersonaSectionLabel icon={Compass}>Motivation</PersonaSectionLabel>
          <p className={cn(displayFontClass, "max-w-[60ch] text-[18px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#1C1917]")}>
            {card.motivation || "No structured motivation available."}
          </p>
        </section>
      </div>
    </article>
  )
}

function DetailedPersonaCards({ personas }: { personas: CurrentPersona[] }) {
  return (
    <div className="space-y-5">
      {personas.map((persona, index) => (
        <DetailedPersonaCard
          key={`${persona.name}-${index}`}
          persona={persona}
          index={index}
        />
      ))}
    </div>
  )
}

function getCurrentPrdMetaItems({
  timeline,
  userStories,
  requirements,
}: {
  timeline?: PlanningDocumentSection
  userStories?: PlanningDocumentSection
  requirements?: PlanningDocumentSection
}) {
  const timelineText = timeline?.content ?? ""
  const timelineNested = extractSectionsByHeading(timelineText, 3)
  const estimateItems = parseNarrativeTable(
    getSectionByAlias(timelineNested, ["Project estimate"])?.content ?? "",
  ).items
  const estimateValue = (aliases: string[]) => {
    for (const item of estimateItems) {
      const labeled = splitLabeledText(stripInlineMarkdown(item))
      if (
        labeled &&
        aliases.some((alias) => normalizeHeading(labeled.label) === normalizeHeading(alias))
      ) {
        return labeled.body
      }
    }

    return null
  }
  const size =
    estimateValue(["Size", "Project size"]) ??
    timelineText.match(/Size:\s*([^\n]+)/i)?.[1]?.trim() ??
    timelineText.match(/Project size:\s*([^\n]+)/i)?.[1]?.trim() ??
    "Scoped"
  const duration =
    estimateValue(["Estimated total duration", "Duration"]) ??
    timelineText.match(/Estimated total duration:\s*([^\n]+)/i)?.[1]?.trim() ??
    timelineText.match(/Duration:\s*([^\n]+)/i)?.[1]?.trim() ??
    timelineText.match(/(\d+\s*(?:weeks?|wks?))/i)?.[1]?.trim() ??
    "Planned"
  const teamSection = getSectionByAlias(
    timelineNested,
    ["Team composition", "Team"],
  )
  const teamCount = teamSection
    ? parseNarrativeTable(teamSection.content).items.length
    : (timelineText.match(/-\s+\*\*[^*]+\*\*:/g) ?? []).length
  const stories = userStories
    ? parseUserStories(parseNarrativeTable(userStories.content)).length
    : 0
  const requirementTotal = requirements
    ? Array.from(getRequirementGroups(parseNarrativeTable(requirements.content)).values()).reduce(
        (sum, items) => sum + items.length,
        0,
      )
    : 0

  return [
    { value: size, label: "Project Size" },
    { value: duration, label: "Est. Duration" },
    ...(teamCount > 0 ? [{ value: String(teamCount), label: "Team Members" }] : []),
    ...(stories > 0 ? [{ value: String(stories), label: "User Stories" }] : []),
    ...(requirementTotal > 0 ? [{ value: String(requirementTotal), label: "Requirements" }] : []),
  ]
}

function ProductPlanMasthead({
  metaItems,
}: {
  metaItems: Array<{ value: string; label: string }>
}) {
  return (
    <header className="pb-10 pt-6">
      <h1
        className={cn(
          displayFontClass,
          "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]",
        )}
      >
        Product Plan
      </h1>
      {metaItems.length > 0 ? (
        <div className="mt-9 flex flex-wrap border border-[#E8DDD5] bg-white">
          {metaItems.map((item) => (
            <div
              key={item.label}
              className="min-w-[140px] flex-1 border-b border-r border-[#E8DDD5] px-6 py-5 last:border-r-0 md:border-b-0"
            >
              <div className={cn(displayFontClass, "text-[28px] font-extrabold leading-none tracking-[-0.04em] text-[#0A0A0A]")}>
                {item.value}
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8480]">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </header>
  )
}

function DesignedSection({
  id,
  title,
  index,
  total,
  children,
}: {
  id?: string
  kicker: string
  title: string
  index: number
  total: number
  children: React.ReactNode
}) {
  return (
    <section id={id} className="pt-0">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <div>
          <h2 className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#0A0A0A]")}>
            {title}
          </h2>
        </div>
        <p className="shrink-0 font-mono text-[13px] tracking-[0.1em] text-[#8A8480]">
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
      </div>
      {children}
    </section>
  )
}

function DesignProse({ section }: { section: PlanningDocumentSection }) {
  const narrative = parseNarrativeTable(section.content)

  return (
    <div className="space-y-7">
      {narrative.paragraphs[0] ? (
        <p className="max-w-4xl text-[22px] font-medium leading-[1.5] tracking-[-0.01em] text-[#0A0A0A]">
          {narrative.paragraphs[0]}
        </p>
      ) : null}
      {narrative.paragraphs.slice(1).length > 0 || narrative.items.length > 0 || narrative.table ? (
        <NarrativeContent
          narrative={{
            ...narrative,
            paragraphs: narrative.paragraphs.slice(1),
          }}
        />
      ) : null}
    </div>
  )
}

function getNestedNarrative(section: PlanningDocumentSection, aliases: string[]) {
  const nested = extractSectionsByHeading(section.content, 3)
  const match = getSectionByAlias(nested, aliases)

  return match ? parseNarrativeTable(match.content) : parseNarrativeTable("")
}

function GoalsShowcase({ section }: { section: PlanningDocumentSection }) {
  const business = getNestedNarrative(section, ["Business goals", "Business goal"])
  const user = getNestedNarrative(section, ["User goals", "User goal"])

  return (
    <div className="space-y-10">
      {business.items.length > 0 ? (
        <div>
          <p className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
            <span className="h-1.5 w-1.5 bg-primary" />
            Business Goals
          </p>
          <div className="flex flex-wrap gap-px border border-[#E8DDD5] bg-[#E8DDD5]">
            {business.items.map((item, index) => (
              <article key={`${item}-${index}`} className="min-w-[180px] flex-1 bg-white px-6 py-6">
                <p className={cn(displayFontClass, "text-[42px] font-extrabold leading-none tracking-[-0.05em] text-[#0A0A0A]")}>
                  {getStatValue(item, index)}
                </p>
                <p className="mt-4 text-[14px] leading-6 text-[#4A4040]">{stripInlineMarkdown(item)}</p>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <NarrativeContent narrative={parseNarrativeTable(section.content)} />
      )}

      {user.items.length > 0 ? (
        <div>
          <p className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
            <span className="h-1.5 w-1.5 bg-primary" />
            User Goals
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {user.items.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-3 border border-[#E8DDD5] bg-white px-5 py-4 text-[15px] leading-6 text-[#4A4040]">
                <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span>{stripInlineMarkdown(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function PersonaShowcase({ section, projectId }: { section?: PlanningDocumentSection; projectId: string }) {
  if (!section) return null

  const nested = extractSectionsByHeading(section.content, 3)
  const personaDetails = getSectionByAlias(nested, ["Persona details"])?.content ?? section.content
  const roleAccess = parseNarrativeTable(
    getSectionByAlias(nested, ["Role-based access"])?.content ?? "",
  )
  const personas = parseCurrentPersonas(personaDetails)

  return (
    <div className="space-y-9">
      {personas.length > 0 ? (
        <DetailedPersonaCards personas={personas} />
      ) : (
        <PlanningMarkdownRenderer content={personaDetails} projectId={projectId} />
      )}

      {roleAccess.items.length > 0 ? (
        <div className="grid border border-[#E8DDD5] bg-[#E8DDD5] md:grid-cols-2 xl:grid-cols-4">
          {roleAccess.items.map((item, index) => {
            const labeled = splitLabeledText(stripInlineMarkdown(item))

            return (
              <article key={`${item}-${index}`} className="bg-white px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                  Access {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-[15px] font-bold text-[#0A0A0A]">
                  {labeled?.label ?? `Role ${index + 1}`}
                </h3>
                <p className="mt-2 text-[13px] leading-5 text-[#4A4040]">
                  {labeled?.body ?? stripInlineMarkdown(item)}
                </p>
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function UserStoryShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section) return null

  const stories = parseUserStories(parseNarrativeTable(section.content))
  if (stories.length === 0) {
    return <NarrativeContent narrative={parseNarrativeTable(section.content)} />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {stories.map((story) => (
        <article key={story.id} className="overflow-hidden border border-[#E8DDD5] bg-white">
          <div className="px-6 py-5">
            <span className="inline-flex border border-primary/10 bg-primary/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              {story.id}
            </span>
            <h3 className={cn(displayFontClass, "mt-4 text-[18px] font-bold tracking-[-0.02em] text-[#0A0A0A]")}>
              {story.title}
            </h3>
            <p className="mt-3 text-[14px] leading-6 text-[#4A4040]">{story.story}</p>
          </div>
          {story.criteria.length > 0 ? (
            <details className="border-t border-[#E8DDD5]">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#4A4040] [&::-webkit-details-marker]:hidden">
                Acceptance Criteria ({story.criteria.length})
                <ChevronDown className="ml-auto h-4 w-4" />
              </summary>
              <ul className="space-y-2 px-6 pb-5">
                {story.criteria.map((criterion, index) => (
                  <li key={`${criterion}-${index}`} className="flex gap-3 text-[13px] leading-5 text-[#4A4040]">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </article>
      ))}
    </div>
  )
}

const requirementIcons: Record<RequirementCategory, React.ComponentType<{ className?: string }>> = {
  Functional: Puzzle,
  "Non-Functional": ShieldCheck,
  Integration: Layers,
}

interface RequirementDisplayGroup {
  label: string
  items: RequirementItem[]
  Icon: React.ComponentType<{ className?: string }>
  spanWide?: boolean
}

function getRequirementSubsectionLabel(heading: string) {
  return stripInlineMarkdown(heading)
    .replace(/^\d+(?:\.\d+)*\.?\s+/, "")
    .trim()
}

function getRequirementIcon(label: string, index: number) {
  if (/states?|errors?|failure|empty/i.test(label)) return AlertTriangle
  if (/constraints?|security|privacy|permissions?|limits?|compliance/i.test(label)) return ShieldCheck
  if (/integration|api|provider|oauth|extension/i.test(label)) return Layers

  const icons = [Puzzle, ClipboardList, Layers]
  return icons[index % icons.length]
}

function normalizeRequirementItems(
  items: Array<RequirementItem & { category?: RequirementCategory }>,
) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    meta: item.meta,
  }))
}

function getRequirementItemsFromNestedSection(content: string) {
  const parsedItems = normalizeRequirementItems(parseRequirementItemsFromMarkdown(content))
  if (parsedItems.length > 0) return parsedItems

  const narrative = parseNarrativeTable(content)
  if (narrative.items.length > 0) {
    return narrative.items.map((item) => {
      const labeled = splitLabeledText(item)

      return {
        title: labeled?.label,
        description: labeled?.body || item,
      }
    })
  }

  return narrative.paragraphs.map((paragraph) => ({
    description: paragraph,
  }))
}

function getRequirementNestedSections(sectionContent: string) {
  const h3Sections = extractSectionsByHeading(sectionContent, 3)
  const h4Sections = extractSectionsByHeading(sectionContent, 4)
  const hasOnlyWrapperH3 =
    h3Sections.length === 1 &&
    /^(?:\d+(?:\.\d+)*\.?\s+)?functional requirements?$/i.test(h3Sections[0]?.heading ?? "")

  if (h4Sections.length > 0 && (h3Sections.length === 0 || hasOnlyWrapperH3)) {
    return h4Sections
  }

  return h3Sections
}

function shouldSpanRequirementDisplayGroup(
  groups: Array<Pick<RequirementDisplayGroup, "label">>,
  index: number,
) {
  const isCoreStatesConstraintsLayout =
    groups.length === 3 &&
    normalizeHeading(groups[0]?.label ?? "") === "core requirements" &&
    normalizeHeading(groups[1]?.label ?? "") === "states and errors" &&
    normalizeHeading(groups[2]?.label ?? "") === "constraints"

  if (isCoreStatesConstraintsLayout) {
    return index === 0
  }

  return groups.length % 2 === 1 && index === groups.length - 1
}

function getRequirementDisplayGroups(sectionContent: string): RequirementDisplayGroup[] {
  const nestedSections = getRequirementNestedSections(sectionContent)
    .map((section, index) => {
      const label = getRequirementSubsectionLabel(section.heading)

      return {
        label,
        items: getRequirementItemsFromNestedSection(section.content),
        Icon: getRequirementIcon(label, index),
      }
    })
    .filter((group) => group.label && group.items.length > 0)

  if (nestedSections.length > 0) {
    return nestedSections.map((group, index) => ({
      ...group,
      spanWide: shouldSpanRequirementDisplayGroup(nestedSections, index),
    }))
  }

  return Array.from(getRequirementGroups(parseNarrativeTable(sectionContent)).entries())
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({
      label,
      items,
      Icon: requirementIcons[label],
      spanWide: label === "Integration",
    }))
}

export function RequirementShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section) return null

  const groups = getRequirementDisplayGroups(section.content)

  if (groups.length === 0) {
    return <NarrativeContent narrative={parseNarrativeTable(section.content)} />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map(({ label, items, Icon, spanWide }) => {
        return (
          <section key={label} className={cn("border border-[#E8DDD5] bg-white px-6 py-6", spanWide && "lg:col-span-2")}>
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center border border-[#E8DDD5] bg-[#FAFAFA]">
                <Icon className="h-4 w-4 text-[#1C1917]" />
              </div>
              <h3 className={cn(displayFontClass, "text-[18px] font-bold tracking-[-0.02em] text-[#0A0A0A]")}>
                {label}
              </h3>
              <span className="ml-auto font-mono text-[11px] tracking-[0.08em] text-[#8A8480]">
                {items.length} reqs
              </span>
            </div>
            <ol className="space-y-0">
              {items.map((item, index) => (
                <li key={`${item.id ?? item.title ?? item.description}-${index}`} className="flex gap-4 border-t border-[#E8DDD5] py-3 first:border-t-0">
                  <span className="min-w-6 font-mono text-[11px] text-[#8A8480]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {item.title ? <span className="block text-[14px] font-semibold text-[#0A0A0A]">{item.title}</span> : null}
                    {item.description ? <span className="block text-[13px] leading-5 text-[#4A4040]">{item.description}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

const techIcons = [Layers, ShieldCheck, Database, CircleGauge, TrendingUp, ClipboardList]

function TechnicalShowcase({ section, projectId }: { section?: PlanningDocumentSection; projectId: string }) {
  if (!section) return null

  const nested = extractSectionsByHeading(section.content, 3)
  const cards = nested.length > 0
    ? nested
    : parseNarrativeTable(section.content).items.map((item, index) => ({
        heading: `Technical Item ${index + 1}`,
        content: item,
      }))

  if (cards.length === 0) {
    return <PlanningMarkdownRenderer content={section.content} projectId={projectId} />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card, index) => {
        const Icon = techIcons[index % techIcons.length]

        return (
          <article key={`${card.heading}-${index}`} className="border border-[#E8DDD5] bg-white px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className={cn(displayFontClass, "text-[17px] font-bold tracking-[-0.02em] text-[#0A0A0A]")}>
                {nested.length > 0 ? getCurrentSectionTitle(card.heading) : `Consideration ${String(index + 1).padStart(2, "0")}`}
              </h3>
            </div>
            <DesignedBulletList
              content={card.content}
              label={`${getCurrentSectionTitle(card.heading)} details`}
            />
          </article>
        )
      })}
    </div>
  )
}

function MetricsShowcase({ section, projectId }: { section?: PlanningDocumentSection; projectId: string }) {
  if (!section) return null

  const nested = extractSectionsByHeading(section.content, 3)
  if (nested.length === 0) {
    return <PlanningMarkdownRenderer content={section.content} projectId={projectId} />
  }

  const icons = [UsersRound, TrendingUp, CircleGauge]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {nested.map((metricSection, index) => {
        const Icon = icons[index % icons.length]
        const narrative = parseNarrativeTable(metricSection.content)

        return (
          <article key={`${metricSection.heading}-${index}`} className="border border-[#E8DDD5] bg-white">
            <div className="flex items-center gap-3 border-b border-[#E8DDD5] px-6 py-5">
              <Icon className="h-4 w-4 text-[#4A4040]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4A4040]">
                {getCurrentSectionTitle(metricSection.heading)}
              </p>
            </div>
            <div className="divide-y divide-[#E8DDD5]">
              {[...narrative.items, ...narrative.paragraphs].map((item, itemIndex) => (
                <div key={`${item}-${itemIndex}`} className="px-6 py-4">
                  <p className={cn(displayFontClass, "text-[26px] font-extrabold leading-none tracking-[-0.04em] text-[#0A0A0A]")}>
                    {getStatValue(item, itemIndex)}
                  </p>
                  <p className="mt-2 text-[13px] leading-5 text-[#4A4040]">{stripInlineMarkdown(item)}</p>
                </div>
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function TimelineShowcase({ section, projectId }: { section?: PlanningDocumentSection; projectId: string }) {
  if (!section) return null

  const nested = extractSectionsByHeading(section.content, 3)
  const estimate = getSectionByAlias(nested, ["Project estimate"])
  const team = getSectionByAlias(nested, ["Team composition", "Team"])
  const phases = nested.filter((item) => /^Phase\s+\d+/i.test(stripInlineMarkdown(item.heading)))
  const phaseWeekRanges = getTimelinePhaseWeekRanges(phases)

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        {estimate ? (
          <div className="flex border border-[#E8DDD5] bg-[#E8DDD5]">
            {parseNarrativeTable(estimate.content).items.slice(0, 2).map((item, index) => {
              const labeled = splitLabeledText(stripInlineMarkdown(item))

              return (
                <div key={`${item}-${index}`} className="flex-1 bg-white px-6 py-5">
                  <p className={cn(displayFontClass, "text-[30px] font-extrabold leading-none tracking-[-0.04em] text-[#0A0A0A]")}>
                    {labeled?.body ?? stripInlineMarkdown(item)}
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8480]">
                    {labeled?.label ?? `Estimate ${index + 1}`}
                  </p>
                </div>
              )
            })}
          </div>
        ) : null}
        {team ? (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#4A4040]">
              Team Composition
            </p>
            <div className="space-y-2">
              {parseNarrativeTable(team.content).items.map((item, index) => {
                const labeled = splitLabeledText(stripInlineMarkdown(item))

                return (
                  <div key={`${item}-${index}`} className="flex gap-4 text-[13.5px] leading-6">
                    <span className="min-w-[150px] font-semibold text-[#0A0A0A]">{labeled?.label ?? `Role ${index + 1}`}</span>
                    <span className="text-[#4A4040]">{labeled?.body ?? stripInlineMarkdown(item)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {phases.length > 0 ? (
        <div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {phases.map((phase, index) => (
              <TimelinePhaseCard
                key={`${phase.heading}-${index}`}
                phase={phase}
                index={index}
                weekRange={phaseWeekRanges[index] ?? null}
              />
            ))}
          </div>
        </div>
      ) : (
        <PlanningMarkdownRenderer content={section.content} projectId={projectId} />
      )}
    </div>
  )
}

interface FollowThroughItem {
  title: string
  body: string
}

interface RiskItem {
  title: string
  impact: string
  mitigation: string
}

function stripLeadingItemCode(value: string) {
  return value.replace(/^[A-Z]-?\d{1,3}\s*:?\s+/i, "").trim()
}

function splitTitleAndBody(value: string): FollowThroughItem {
  const cleaned = stripLeadingItemCode(stripInlineMarkdown(value))
  const labeled = splitLabeledText(cleaned)
  if (labeled) {
    return {
      title: labeled.label,
      body: labeled.body,
    }
  }

  const sentenceMatch = cleaned.match(/^(.+?[.!?])\s+(.+)$/)
  if (sentenceMatch && sentenceMatch[1].length <= 96) {
    return {
      title: sentenceMatch[1].trim(),
      body: sentenceMatch[2].trim(),
    }
  }

  return {
    title: cleaned,
    body: "",
  }
}

function parseFollowThroughItems(content: string): FollowThroughItem[] {
  const narrative = parseNarrativeTable(content)
  const items = narrative.items.length > 0 ? narrative.items : narrative.paragraphs

  return items
    .map(splitTitleAndBody)
    .filter((item) => item.title || item.body)
}

function parseRiskItems(content: string): RiskItem[] {
  const risks: RiskItem[] = []
  let active: RiskItem | null = null

  for (const rawLine of stripHorizontalRulesFromMarkdown(content).split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    const listMatch = rawLine.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/)
    if (!listMatch) {
      if (active) {
        active.title = [active.title, stripInlineMarkdown(line)].filter(Boolean).join(" ")
      }
      continue
    }

    const indent = listMatch[1]?.length ?? 0
    const text = stripInlineMarkdown(listMatch[2]?.trim() ?? "")
    const labeled = splitLabeledText(text)

    if (indent === 0) {
      const title = labeled && normalizeHeading(labeled.label) === "risk"
        ? labeled.body
        : text.replace(/^Risk:\s*/i, "").trim()

      active = {
        title,
        impact: "",
        mitigation: "",
      }
      risks.push(active)
      continue
    }

    if (!active) continue

    const label = normalizeHeading(labeled?.label ?? "")
    const body = labeled?.body ?? text
    if (label === "impact") {
      active.impact = [active.impact, body].filter(Boolean).join(" ")
    } else if (label === "mitigation") {
      active.mitigation = [active.mitigation, body].filter(Boolean).join(" ")
    } else {
      active.mitigation = [active.mitigation, body].filter(Boolean).join(" ")
    }
  }

  if (risks.length > 0) {
    return risks.filter((risk) => risk.title || risk.impact || risk.mitigation)
  }

  return parseFollowThroughItems(content).map((item) => ({
    title: item.title,
    impact: item.body,
    mitigation: "",
  }))
}

function FollowThroughHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
      <span className="h-1.5 w-1.5 bg-primary" />
      {children}
    </p>
  )
}

function RiskMitigationShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  const risks = parseRiskItems(section.content)
  if (risks.length === 0) return null

  return (
    <section className="space-y-4">
      <FollowThroughHeading>Risks & Mitigation</FollowThroughHeading>
      <div className="space-y-4">
        {risks.map((risk, index) => (
          <article key={`${risk.title}-${index}`} className="border border-[#E8DDD5] bg-white">
            <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-start">
              <span className="w-fit border border-[#E8DDD5] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                R-{String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="max-w-3xl text-[16px] font-bold leading-6 text-[#0A0A0A]">
                {risk.title}
              </h3>
            </div>
            <div className="grid divide-y divide-[#E8DDD5] border-t border-[#E8DDD5] md:grid-cols-2 md:divide-x md:divide-y-0">
              <section className="bg-[#F3F0EC] px-6 py-6">
                <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#D95F3B]">
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <ExplainableLabel termKey="impact">Impact</ExplainableLabel>
                </p>
                <p className="text-[13.5px] leading-6 text-[#4A4040]">
                  {risk.impact || "Impact details were not provided."}
                </p>
              </section>
              <section className="px-6 py-6">
                <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#16A34A]">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <ExplainableLabel termKey="mitigation">Mitigation</ExplainableLabel>
                </p>
                <p className="text-[13.5px] leading-6 text-[#4A4040]">
                  {risk.mitigation || "Mitigation details were not provided."}
                </p>
              </section>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function DependenciesShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  const dependencies = parseFollowThroughItems(section.content)
  if (dependencies.length === 0) return null

  return (
    <section className="space-y-4">
      <FollowThroughHeading>Dependencies</FollowThroughHeading>
      <div className="divide-y divide-[#E8DDD5] border border-[#E8DDD5] bg-white">
        {dependencies.map((dependency, index) => (
          <article key={`${dependency.title}-${index}`} className="grid gap-4 px-6 py-6 sm:grid-cols-[48px_1fr]">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8480]">
              D{String(index + 1).padStart(2, "0")}
            </p>
            <div>
              <h3 className="text-[15px] font-bold leading-5 text-[#0A0A0A]">
                {dependency.title}
              </h3>
              {dependency.body ? (
                <p className="mt-2 max-w-3xl text-[13.5px] leading-6 text-[#4A4040]">
                  {dependency.body}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function isHighestRiskAssumption(item: FollowThroughItem) {
  return /highest[-\s]?risk|single highest|riskiest|high[-\s]?risk/i.test(`${item.title} ${item.body}`)
}

function AssumptionsShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  const assumptions = parseFollowThroughItems(section.content)
  if (assumptions.length === 0) return null

  return (
    <section className="space-y-4">
      <FollowThroughHeading>Assumptions</FollowThroughHeading>
      <div className="grid gap-px border border-[#E8DDD5] bg-[#E8DDD5] md:grid-cols-2">
        {assumptions.map((assumption, index) => {
          const highestRisk = isHighestRiskAssumption(assumption)

          return (
            <article
              key={`${assumption.title}-${index}`}
              className={cn(
                "min-h-[160px] px-6 py-6",
                highestRisk ? "bg-[#E7DDD6]" : "bg-white",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8480]">
                  A{String(index + 1).padStart(2, "0")}
                </p>
                {highestRisk ? (
                  <span className="border border-primary/20 bg-white px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
                    <ExplainableLabel termKey="highestRisk">Highest Risk</ExplainableLabel>
                  </span>
                ) : null}
              </div>
              <h3 className="text-[15px] font-bold leading-5 text-[#0A0A0A]">
                {assumption.title}
              </h3>
              {assumption.body ? (
                <p className="mt-3 text-[13.5px] leading-6 text-[#4A4040]">
                  {assumption.body}
                </p>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function OpenQuestionsShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  const questions = parseFollowThroughItems(section.content)
  if (questions.length === 0) return null

  return (
    <section className="space-y-4">
      <FollowThroughHeading>Open Questions</FollowThroughHeading>
      <div className="grid gap-4 lg:grid-cols-2">
        {questions.map((question, index) => (
          <article key={`${question.title}-${index}`} className="min-h-[170px] border border-[#E8DDD5] bg-white px-6 py-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8480]">
              Q{String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-5 text-[16px] font-bold leading-5 text-[#0A0A0A]">
              {question.title}
            </h3>
            {question.body ? (
              <p className="mt-3 text-[13.5px] leading-6 text-[#4A4040]">
                {question.body}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function CurrentPrdDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  const sections = extractSectionsByHeading(content, 2)
  const introduction = getSectionByAlias(sections, ["Introduction/overview", "Introduction overview"])
  const goals = getSectionByAlias(sections, ["Goals"])
  const personas = getSectionByAlias(sections, ["User personas"])
  const requirements = getSectionByAlias(sections, ["Functional requirements"])
  const userStories = getSectionByAlias(sections, ["User stories and acceptance criteria"])
  const outOfScope = getSectionByAlias(sections, ["Non-goals / out of scope", "Out of scope"])
  const technical = getSectionByAlias(sections, ["Technical considerations"])
  const metrics = getSectionByAlias(sections, ["Success metrics"])
  const timeline = getSectionByAlias(sections, ["Timeline and milestones"])
  const risks = getSectionByAlias(sections, ["Risks and mitigation"])
  const dependenciesAndAssumptions = getSectionByAlias(sections, ["Dependencies and assumptions"])
  const dependencyAssumptionSections = dependenciesAndAssumptions
    ? extractSectionsByHeading(dependenciesAndAssumptions.content, 3)
    : []
  const dependencies =
    getSectionByAlias(dependencyAssumptionSections, ["Dependencies"]) ??
    dependenciesAndAssumptions
  const assumptions = getSectionByAlias(dependencyAssumptionSections, ["Assumptions"])
  const openQuestions = getSectionByAlias(sections, ["Open questions"])
  const hasFollowThroughSections = Boolean(
    risks?.content.trim() ||
      dependencies?.content.trim() ||
      assumptions?.content.trim() ||
      openQuestions?.content.trim(),
  )
  const sectionTotal =
    [
      introduction,
      goals,
      personas,
      userStories,
      requirements,
      technical,
      outOfScope,
      metrics,
      timeline,
    ].filter(Boolean).length + (hasFollowThroughSections ? 1 : 0)
  let sectionIndex = 1
  const nextSectionIndex = () => sectionIndex++

  return (
    <div className="flex flex-col gap-16">
      <ProductPlanMasthead
        metaItems={getCurrentPrdMetaItems({
          timeline,
          userStories,
          requirements,
        })}
      />

      {introduction ? (
        <DesignedSection
          id="prd-introduction-overview"
          kicker="Product Brief"
          title="Introduction & Overview"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <DesignProse section={introduction} />
        </DesignedSection>
      ) : null}

      {goals ? (
        <DesignedSection
          id="prd-goals"
          kicker="Outcomes"
          title="Goals"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <GoalsShowcase section={goals} />
        </DesignedSection>
      ) : null}

      {personas ? (
        <DesignedSection
          id="prd-user-personas"
          kicker="Target Users"
          title="User Personas"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <PersonaShowcase section={personas} projectId={projectId} />
        </DesignedSection>
      ) : null}

      {userStories ? (
        <DesignedSection
          id="prd-user-stories-acceptance-criteria"
          kicker="Behavior"
          title="User Stories & Acceptance Criteria"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <UserStoryShowcase section={userStories} />
        </DesignedSection>
      ) : null}

      {requirements ? (
        <DesignedSection
          id="prd-functional-requirements"
          kicker="Build Scope"
          title="Functional Requirements"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <RequirementShowcase section={requirements} />
        </DesignedSection>
      ) : null}

      {technical ? (
        <DesignedSection
          id="prd-technical-considerations"
          kicker="Technical"
          title="Technical Considerations"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <TechnicalShowcase section={technical} projectId={projectId} />
        </DesignedSection>
      ) : null}

      {outOfScope ? (
        <DesignedSection
          id="prd-non-goals-out-of-scope"
          kicker="Scope"
          title="Non-goals & Out of Scope"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <div className="grid border border-[#E8DDD5] bg-[#E8DDD5] md:grid-cols-2">
            {parseNarrativeTable(outOfScope.content).items.map((item, index) => {
              const labeled = splitLabeledText(stripInlineMarkdown(item))

              return (
                <article key={`${item}-${index}`} className="flex gap-4 bg-white px-5 py-5">
                  <span className="h-fit border border-[#E8DDD5] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8A8480]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {labeled ? (
                      <>
                        <span className="block text-[14px] font-semibold text-[#0A0A0A]">{labeled.label}</span>
                        <span className="mt-1 block text-[13px] leading-5 text-[#4A4040]">{labeled.body}</span>
                      </>
                    ) : (
                      <span className="text-[13.5px] leading-5 text-[#4A4040]">{stripInlineMarkdown(item)}</span>
                    )}
                  </span>
                </article>
              )
            })}
          </div>
        </DesignedSection>
      ) : null}

      {metrics ? (
        <DesignedSection
          id="prd-success-metrics"
          kicker="Measurement"
          title="Success Metrics"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <MetricsShowcase section={metrics} projectId={projectId} />
        </DesignedSection>
      ) : null}

      {timeline ? (
        <DesignedSection
          id="prd-timeline-milestones"
          kicker="Delivery"
          title="Timeline & Milestones"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <TimelineShowcase section={timeline} projectId={projectId} />
        </DesignedSection>
      ) : null}

      {hasFollowThroughSections ? (
        <DesignedSection
          id="prd-follow-through"
          kicker="Follow Through"
          title="Risks, Dependencies & Open Questions"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <div className="flex flex-col gap-12">
            <RiskMitigationShowcase section={risks} />
            <DependenciesShowcase section={dependencies} />
            <AssumptionsShowcase section={assumptions} />
            <OpenQuestionsShowcase section={openQuestions} />
          </div>
        </DesignedSection>
      ) : null}
    </div>
  )
}

export function PrdDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  if (isCurrentPromptDocument(content, currentPrdSectionAliases)) {
    return <CurrentPrdDocumentBlocks content={content} projectId={projectId} />
  }

  // Legacy or unstructured Product Plans render as plain markdown.
  return (
    <div className="space-y-4">
      <Warning message="This Product Plan uses an older format, so the designed block view is unavailable. Showing the original document." />
      <PlanningMarkdownRenderer content={content} projectId={projectId} />
    </div>
  )
}
