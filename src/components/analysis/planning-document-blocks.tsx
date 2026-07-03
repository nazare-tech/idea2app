"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleGauge,
  CircleAlert,
  CircleCheck,
  Clock,
  ClipboardList,
  Compass,
  Coins,
  Cpu,
  CreditCard,
  Database,
  HardDrive,
  History,
  KeyRound,
  Layers,
  Monitor,
  Puzzle,
  Rocket,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react"

import { ExplainableLabel, ExplainTermButton } from "@/components/analysis/explainable-term"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { getExplainableTermKeyByLabel } from "@/lib/explainable-terms"
import { getMvpPlanViewModel } from "@/lib/mvp-plan-document"
import { getPrdDocumentViewModel } from "@/lib/prd-document"
import type {
  PlanningDocumentSection,
  PlanningNarrativeTable,
} from "@/lib/planning-document-parser"
import {
  extractSectionsByHeading,
  normalizeHeading,
  parseNarrativeTable,
  stripInlineMarkdown,
} from "@/lib/planning-document-parser"
import { cn } from "@/lib/utils"

interface PlanningDocumentProps {
  content: string
  projectId: string
}

const displayFontClass = "font-[family:var(--font-display)]"

function stripHorizontalRulesFromMarkdown(content: string) {
  return content
    .split("\n")
    .filter((line) => !/^\s*-{3,}\s*$/.test(line))
    .join("\n")
    .trim()
}

function PlanningMarkdownRenderer({
  content,
  projectId,
}: {
  content: string
  projectId: string
}) {
  return (
    <MarkdownRenderer
      content={stripHorizontalRulesFromMarkdown(content)}
      projectId={projectId}
    />
  )
}

function PencilCard({
  title,
  kicker,
  dark = false,
  className,
  children,
}: {
  title: string
  kicker?: string
  dark?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-none bg-transparent",
        className,
      )}
    >
      <div className="space-y-2 py-5">
        {kicker ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
            {kicker}
          </p>
        ) : null}
        <h2
          className={cn(
            displayFontClass,
            "text-[22px] font-bold tracking-[-0.03em]",
            dark ? "text-[#1C1917]" : "text-[#0A0A0A]",
          )}
        >
          {title}
        </h2>
      </div>
      <div className="pb-6">{children}</div>
    </section>
  )
}

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
        {eyebrow}
      </p>
      <div className="mt-3">
        <h1
          className={cn(
            displayFontClass,
            "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]",
          )}
        >
          {title}
        </h1>
        <p className="mt-2 max-w-3xl ui-type-body text-[#666666]">
          {description}
        </p>
      </div>
    </header>
  )
}

function ParagraphStack({
  paragraphs,
  dark = false,
}: {
  paragraphs: string[]
  dark?: boolean
}) {
  if (paragraphs.length === 0) return null

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${paragraph}-${index}`}
          className={cn("ui-type-body", dark ? "text-[#4A4040]" : "text-[#666666]")}
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function splitLabeledText(value: string) {
  const cleaned = value.replace(/^>\s*/, "").trim()
  const match = cleaned.match(/^([^:]{2,96}):\s*(.*)$/)
  if (!match) return null

  return {
    label: match[1].trim(),
    body: match[2].trim().replace(/^>\s*/, ""),
  }
}

function buildItemGroups(items: string[]) {
  const groups: Array<{ label?: string; body?: string; items: string[] }> = []
  let activeGroup: { label?: string; body?: string; items: string[] } | null = null

  for (const item of items) {
    const cleaned = item.replace(/^>\s*/, "").trim()
    if (!cleaned) continue

    const labeled = splitLabeledText(cleaned)

    if (labeled?.label && !labeled.body) {
      activeGroup = { label: labeled.label, items: [] }
      groups.push(activeGroup)
      continue
    }

    if (activeGroup) {
      activeGroup.items.push(labeled ? `${labeled.label}: ${labeled.body}` : cleaned)
      continue
    }

    activeGroup = null
    groups.push({
      label: labeled?.label,
      body: labeled?.body || cleaned,
      items: [],
    })
  }

  return groups
}

function InlineLabeledText({
  value,
  dark = false,
  className,
}: {
  value: string
  dark?: boolean
  className?: string
}) {
  const labeled = splitLabeledText(value)

  return (
    <p className={cn("ui-type-body-sm", dark ? "text-[#1C1917]" : "text-[#0A0A0A]", className)}>
      {labeled ? (
        <>
          <span className="font-semibold">{labeled.label}: </span>
          {labeled.body}
        </>
      ) : (
        value
      )}
    </p>
  )
}

function StructuredItemList({ items, dark = false }: { items: string[]; dark?: boolean }) {
  if (items.length === 0) return null

  const groups = buildItemGroups(items)

  return (
    <div className="space-y-2">
      {groups.map((group, index) => {
        const key = `${group.label ?? group.body}-${index}`

        if (group.items.length > 0) {
          return (
            <div key={key} className="space-y-2">
              {group.label ? (
                <p className={cn("ui-type-body-sm font-semibold", dark ? "text-[#1C1917]" : "text-[#0A0A0A]")}>
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-2">
                {group.items.map((nestedItem, itemIndex) => (
                  <li key={`${nestedItem}-${itemIndex}`} className="flex gap-2">
                    <span className="mt-[0.62rem] h-1.5 w-1.5 shrink-0 bg-primary" />
                    <InlineLabeledText value={nestedItem} dark={dark} />
                  </li>
                ))}
              </ul>
            </div>
          )
        }

        return (
          <InlineLabeledText
            key={key}
            value={group.label && group.body ? `${group.label}: ${group.body}` : group.body ?? group.label ?? ""}
            dark={dark}
          />
        )
      })}
    </div>
  )
}

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

function TimelinePhaseCard({
  phase,
  index,
}: {
  phase: PlanningDocumentSection
  index: number
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

function DataTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  if (headers.length === 0) return null

  return (
    <div className="overflow-x-auto border border-[#E0E0E0]">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-[#F5F0EB]">
            {headers.map((header) => (
              <th
                key={header}
                className="border border-[#D8CEC5] px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#4A4040]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
              {headers.map((header, cellIndex) => (
                <td
                  key={`${header}-${cellIndex}`}
                  className="border border-[#E0E0E0] px-4 py-3 align-top ui-type-table text-[#0A0A0A]"
                >
                  {row[cellIndex] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NarrativeContent({
  narrative,
  dark = false,
}: {
  narrative: PlanningNarrativeTable
  dark?: boolean
}) {
  const hasText = narrative.paragraphs.length > 0 || narrative.items.length > 0

  return (
    <div className="space-y-5">
      <ParagraphStack paragraphs={narrative.paragraphs} dark={dark} />
      <StructuredItemList items={narrative.items} dark={dark} />
      {narrative.table ? (
        <DataTable headers={narrative.table.headers} rows={narrative.table.rows} />
      ) : null}
      {!hasText && !narrative.table ? (
        <p className="ui-type-body-sm text-[#999999]">No structured content available.</p>
      ) : null}
    </div>
  )
}

function hasNarrativeContent(narrative: PlanningNarrativeTable) {
  return (
    narrative.paragraphs.length > 0 ||
    narrative.items.length > 0 ||
    Boolean(narrative.table)
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

function getTableCell(row: string[], headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase())
  const index = headers.findIndex((header) =>
    normalizedAliases.some((alias) => header.toLowerCase().includes(alias)),
  )

  return index >= 0 ? row[index] ?? "" : ""
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

function RequirementsContent({ narrative }: { narrative: PlanningNarrativeTable }) {
  const groups = getRequirementGroups(narrative)
  const visibleGroups = Array.from(groups.entries()).filter(([, items]) => items.length > 0)

  if (visibleGroups.length === 0) {
    return <NarrativeContent narrative={narrative} />
  }

  return (
    <div className="space-y-4">
      {visibleGroups.map(([label, items]) => (
        <section key={label} className="border border-[#E8DDD5] bg-[#FAFAFA] px-5 py-5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8480]">
            {label}
          </p>
          <div className="mt-4 space-y-4">
            {items.map((item, index) => {
              return (
                <article key={`${item.id ?? item.title ?? item.description}-${index}`} className="border-l border-[#D8CEC5] pl-3">
                  {item.id ? (
                    <p className="ui-type-body-sm font-bold text-[#0A0A0A]">{item.id}</p>
                  ) : null}
                  {item.title ? (
                    <p className={cn("ui-type-body-sm text-[#0A0A0A]", item.id && "mt-2")}>{item.title}</p>
                  ) : null}
                  {item.description ? (
                    <p className={cn("ui-type-caption text-[#6F6A66]", (item.id || item.title) && "mt-2")}>
                      {item.description}
                    </p>
                  ) : null}
                  {item.meta?.map((meta, metaIndex) => (
                    <p key={`${meta}-${metaIndex}`} className="mt-1 ui-type-caption text-[#6F6A66]">
                      {meta}
                    </p>
                  ))}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
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

function UserStoriesContent({
  narrative,
}: {
  narrative: PlanningNarrativeTable
}) {
  const stories = parseUserStories(narrative)

  if (stories.length === 0) {
    return <NarrativeContent narrative={narrative} />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {stories.map((story, index) => (
        <article key={`${story.id}-${index}`} className="border border-[#E8DDD5] bg-[#FAFAFA] px-5 py-5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8480]">
            {story.id}
          </p>
          <h3 className={cn(displayFontClass, "mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#0A0A0A]")}>
            {story.title}
          </h3>
          <p className="mt-3 ui-type-body-sm text-[#0A0A0A]">{story.story}</p>
          {story.criteria.length > 0 ? (
            <div className="mt-4 border-t border-[#E8DDD5] pt-4">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8480]">
                Acceptance Criteria
              </p>
              <ul className="mt-3 space-y-2">
                {story.criteria.map((criterion, index) => (
                  <li key={`${criterion}-${index}`} className="flex gap-2 ui-type-caption text-[#4A4040]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-primary" />
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function MarkdownSectionCard({
  title,
  kicker,
  section,
  projectId,
  dark = false,
  className,
}: {
  title?: string
  kicker?: string
  section: PlanningDocumentSection
  projectId: string
  dark?: boolean
  className?: string
}) {
  return (
    <PencilCard
      title={title ?? section.heading}
      kicker={kicker}
      dark={dark}
      className={className}
    >
      <PlanningMarkdownRenderer content={section.content} projectId={projectId} />
    </PencilCard>
  )
}

function Warning({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-none border border-[#FCA5A5] bg-[#FEF2F2] px-5 py-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-semibold text-[#7F1D1D]">Block view unavailable</p>
        <p className="text-sm text-[#991B1B]">{message}</p>
      </div>
    </div>
  )
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

const currentMvpSectionAliases = [
  "MVP Summary",
  "Key Risks, Assumptions, and Scope Decisions",
  "Key Assumptions and Scope Decisions",
  "Target User and Problem",
  "MVP Goal, Definition of Done, and Riskiest Assumptions",
  "Core User Flows",
  "Core User Flow",
  "MVP Scope",
  "Must-Have Features",
  "Validation Plan",
]

function countRecognizedSections(sections: PlanningDocumentSection[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeading)

  return sections.filter((section) => {
    const heading = normalizeHeading(section.heading)
    return normalizedAliases.some((alias) => heading === alias)
  }).length
}

function getSectionByAlias(sections: PlanningDocumentSection[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeading)

  return sections.find((section) => {
    const heading = normalizeHeading(section.heading)
    return normalizedAliases.some((alias) => heading === alias)
  })
}

function isCurrentPromptDocument(content: string, aliases: string[]) {
  return countRecognizedSections(extractSectionsByHeading(content, 2), aliases) >= 3
}

function getCurrentSectionTitle(heading: string) {
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

function currentPersonaFromSection(section: PlanningDocumentSection) {
  const parsed = parseCurrentPersonas(`**${section.heading}**\n${section.content}`)[0]
  if (parsed) return parsed

  return {
    name: section.heading,
    fields: [
      {
        label: "Description",
        body: stripInlineMarkdown(section.content),
        items: [],
      },
    ],
  }
}

function ProductPlanMasthead() {
  return (
    <header className="pb-10 pt-6">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Product Plan
        </p>
        <span className="h-px w-7 bg-primary/50" />
      </div>
      <h1
        className={cn(
          displayFontClass,
          "mt-3 text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]",
        )}
      >
        Product Plan
      </h1>
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
  const termKey = getExplainableTermKeyByLabel(title)

  return (
    <section id={id} className="pt-0">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#0A0A0A]")}>
              {title}
            </h2>
            <ExplainTermButton termKey={termKey} label={title} />
          </div>
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

function getStatValue(item: string, index: number) {
  const cleaned = stripInlineMarkdown(item)
  const metric = cleaned.match(/(?:^|\s)(\$?\d[\d,.]*%?|\d+\+|[A-Z]?\d+\s*(?:seconds?|minutes?|days?|weeks?|months?))/)?.[1]

  return metric ?? String(index + 1).padStart(2, "0")
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

function UserStoryShowcase({ section }: { section?: PlanningDocumentSection }) {
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

function RequirementShowcase({ section }: { section?: PlanningDocumentSection }) {
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
  const agents = getSectionByAlias(nested, ["Agents", "Agent roles", "Team composition", "Team"])
  const phases = nested.filter((item) => /^Phase\s+\d+/i.test(stripInlineMarkdown(item.heading)))
  const supportingSections = nested.filter((item) => item !== agents && !phases.includes(item))

  return (
    <div className="space-y-10">
      <div className="grid gap-8">
        {agents ? (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#4A4040]">
              <ExplainableLabel termKey="agents">Agents</ExplainableLabel>
            </p>
            <div className="space-y-2">
              {parseNarrativeTable(agents.content).items.map((item, index) => {
                const labeled = splitLabeledText(stripInlineMarkdown(item))

                return (
                  <div key={`${item}-${index}`} className="flex gap-4 text-[13.5px] leading-6">
                    <span className="min-w-[150px] font-semibold text-[#0A0A0A]">{labeled?.label ?? `Agent ${index + 1}`}</span>
                    <span className="text-[#4A4040]">{labeled?.body ?? stripInlineMarkdown(item)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {supportingSections.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {supportingSections.map((supportingSection, index) => (
            <article key={`${supportingSection.heading}-${index}`} className="border border-[#E8DDD5] bg-white px-5 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8480]">
                {getCurrentSectionTitle(supportingSection.heading)}
              </p>
              <div className="mt-3">
                <PlanningMarkdownRenderer content={supportingSection.content} projectId={projectId} />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {phases.length > 0 ? (
        <div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {phases.map((phase, index) => (
              <TimelinePhaseCard
                key={`${phase.heading}-${index}`}
                phase={phase}
                index={index}
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
  const label = typeof children === "string" ? children : undefined
  const termKey = label ? getExplainableTermKeyByLabel(label) : undefined

  return (
    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
      <span className="h-1.5 w-1.5 bg-primary" />
      <ExplainableLabel termKey={termKey} label={label}>{children}</ExplainableLabel>
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
                  {index === 0 ? (
                    <ExplainableLabel termKey="impact">Impact</ExplainableLabel>
                  ) : (
                    "Impact"
                  )}
                </p>
                <p className="text-[13.5px] leading-6 text-[#4A4040]">
                  {risk.impact || "Impact details were not provided."}
                </p>
              </section>
              <section className="px-6 py-6">
                <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#16A34A]">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {index === 0 ? (
                    <ExplainableLabel termKey="mitigation">Mitigation</ExplainableLabel>
                  ) : (
                    "Mitigation"
                  )}
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
  const outOfScope = getSectionByAlias(sections, ["Non-goals / out of scope", "Out of scope"])
  const technical = getSectionByAlias(sections, ["Technical considerations"])
  const metrics = getSectionByAlias(sections, ["Success metrics"])
  const timeline = getSectionByAlias(sections, ["Team and Milestones", "Team & Milestones", "Timeline, milestones, and team shape", "Timeline and milestones"])
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
      timeline,
      metrics,
      personas,
      technical,
      outOfScope,
    ].filter(Boolean).length + (hasFollowThroughSections ? 1 : 0)
  let sectionIndex = 1
  const nextSectionIndex = () => sectionIndex++

  return (
    <div className="flex flex-col gap-16">
      <ProductPlanMasthead />

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

      {timeline ? (
        <DesignedSection
          id="prd-team-milestones"
          kicker="Delivery"
          title="Team & Milestones"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <TimelineShowcase section={timeline} projectId={projectId} />
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

function getFirstParagraph(section?: PlanningDocumentSection) {
  if (!section?.content.trim()) return ""
  const narrative = parseNarrativeTable(section.content)
  return narrative.paragraphs[0] || narrative.items[0] || ""
}

function FvpMasthead() {
  return (
    <header className="pb-10 pt-10">
      <div className="flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
        <span>Planning Document</span>
        <span className="h-px w-7 bg-primary/50" />
      </div>
      <h1 className={cn(displayFontClass, "mt-4 text-[42px] font-extrabold leading-[0.96] tracking-[-0.05em] text-[#1C1917] sm:text-[56px] lg:text-[68px]")}>
        First Version Plan
      </h1>
    </header>
  )
}

function stripMarkdownMarker(value: string) {
  return stripInlineMarkdown(value).replace(/^[-*+]\s+/, "").trim()
}

function getDesignListRows(content: string) {
  const narrative = parseNarrativeTable(content)

  if (narrative.table) {
    const { headers, rows } = narrative.table
    const hasCoreFlowShape = headers.some((header) =>
      /flow|capability/i.test(header),
    )

    if (hasCoreFlowShape) {
      return rows.map((row, index) => {
        const title =
          getTableCell(row, headers, ["flow", "capability"]) ||
          row[0] ||
          `Flow ${index + 1}`
        const details = [
          ["User action", getTableCell(row, headers, ["user action"])],
          ["Value", getTableCell(row, headers, ["value", "why"])],
          ["Include", getTableCell(row, headers, ["include"])],
          ["Exclude", getTableCell(row, headers, ["exclude"])],
          ["Validation", getTableCell(row, headers, ["validation"])],
        ]
          .filter(([, value]) => value)
          .map(([label, value]) => `${label}: ${value}`)
          .join(" ")

        return {
          title: stripMarkdownMarker(title),
          body: stripMarkdownMarker(details),
          row,
          headers,
        }
      })
    }

    return rows.map((row, index) => {
      const title =
        getTableCell(row, headers, ["step"]) ||
        getTableCell(row, headers, ["flow", "capability"]) ||
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

function FvpSection({
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
  const termKey = getExplainableTermKeyByLabel(title)

  return (
    <section id={id} className="pt-0">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={cn(displayFontClass, "text-[30px] font-extrabold leading-none tracking-[-0.045em] text-[#1C1917] sm:text-[40px]")}>
              {title}
            </h2>
            <ExplainTermButton termKey={termKey} label={title} />
          </div>
        </div>
        <p className="shrink-0 font-mono text-[13px] tracking-[0.1em] text-[#8A8480]">
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
      </div>
      {children}
    </section>
  )
}

function FvpSummary({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null
  const narrative = parseNarrativeTable(section.content)

  return (
    <div className="space-y-4">
      {narrative.paragraphs.map((paragraph, index) => (
        <p key={`${paragraph}-${index}`} className="max-w-[70ch] text-[16px] leading-[1.65] text-[#4A4040]">
          {paragraph}
        </p>
      ))}
      {narrative.items.length > 0 ? <StructuredItemList items={narrative.items} /> : null}
      {narrative.table ? <DataTable headers={narrative.table.headers} rows={narrative.table.rows} /> : null}
    </div>
  )
}

const fvpCardIcons = [Target, CircleCheck, TriangleAlert, Cpu, UserRound, CircleAlert, History, Sparkles]

function getNestedDesignCards(section?: PlanningDocumentSection) {
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

function FvpTechGrid({ section, fallbackTitle }: { section?: PlanningDocumentSection; fallbackTitle: string }) {
  const cards = getNestedDesignCards(section)
  if (cards.length === 0) return null

  return (
    <div className="pp-tech-grid grid gap-4 md:grid-cols-2">
      {cards.map((card, index) => {
        const Icon = fvpCardIcons[index % fvpCardIcons.length]
        return (
          <article key={`${card.title}-${index}`} className="border border-[#EAE0D8] bg-white px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <Icon className="h-[18px] w-[18px] text-primary" strokeWidth={1.9} />
              <h3 className={cn(displayFontClass, "text-[15.5px] font-bold tracking-[-0.02em] text-[#1C1917]")}>
                {card.title || fallbackTitle}
              </h3>
            </div>
            <p className={cn("text-[13.5px] leading-[1.55] text-[#4A4040]", index < 2 && "text-[14.5px] font-medium text-[#1C1917]")}>
              {card.body}
            </p>
          </article>
        )
      })}
    </div>
  )
}

function FvpFlow({ section }: { section?: PlanningDocumentSection }) {
  const rows = getDesignListRows(section?.content ?? "")
  if (rows.length === 0) return null

  return (
    <div className="fvp-flow flex flex-col">
      {rows.map((row, index) => {
        const text = `${row.title} ${row.body}`
        const isKey = /generate|credit|pay|purchase|try it on/i.test(text)
        return (
          <div key={`${row.title}-${index}`} className="fvp-step grid grid-cols-[48px_minmax(0,1fr)] gap-[22px]">
            <div className="rail flex flex-col items-center">
              <div className={cn(
                "node grid h-11 w-11 place-items-center border font-mono text-[15px] font-medium",
                isKey ? "border-primary bg-primary text-white" : "border-[#E8DDD5] bg-white text-[#1C1917]",
              )}>
                {index + 1}
              </div>
              {index < rows.length - 1 ? <div className="line min-h-4 flex-1 bg-[#E8DDD5] [width:1px]" /> : null}
            </div>
            <div className="content pb-6 pt-1 last:pb-0">
              <div className={cn(displayFontClass, "text-[16.5px] font-bold tracking-[-0.02em] text-[#1C1917]")}>
                {row.title}
              </div>
              {row.body ? <div className="mt-1 text-[14px] leading-[1.5] text-[#4A4040]">{row.body}</div> : null}
              {isKey ? (
                <span className="tag mt-3 inline-flex items-center gap-2 border border-primary/10 bg-primary/[0.02] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-primary">
                  {/credit|pay|purchase/i.test(text) ? <Coins className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  Key validation moment
                </span>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FvpScopeGrid({
  rows,
}: {
  rows: Array<{ tag: string; title: string; body: string }>
}) {
  const visibleRows = rows.filter((row) => row.title || row.body)

  if (visibleRows.length === 0) return null

  return (
    <div className="pp-nongoals grid gap-px border border-[#EAE0D8] bg-[#EAE0D8] md:grid-cols-2">
      {visibleRows.map((row, index) => (
        <article key={`${row.title}-${index}`} className="pp-ng flex items-start gap-4 bg-white px-5 py-5">
          <span className={cn(
            "ngt mt-0.5 shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em]",
            /validation|compliance|risk/i.test(row.tag) ? "border-primary/30 bg-primary/[0.02] text-primary" : "border-[#E8DDD5] text-[#8A8480]",
          )}>
            {row.tag}
          </span>
          <span className="ngc">
            <span className="h block text-[14px] font-semibold text-[#1C1917]">{row.title}</span>
            {row.body ? <span className="d mt-1 block text-[13px] leading-[1.5] text-[#4A4040]">{row.body}</span> : null}
          </span>
        </article>
      ))}
      {visibleRows.length % 2 === 1 ? <article aria-hidden="true" className="pp-ng-spacer bg-white" /> : null}
    </div>
  )
}

function extractBracketLabel(value: string) {
  const match = value.match(/^\s*\[([^\]]+)\]\s*(.*)$/)
  if (!match) return null

  return {
    label: match[1].trim(),
    text: match[2].trim(),
  }
}

function getFvpAssumptionRows(section?: PlanningDocumentSection) {
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

function getFvpScopeRows({
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

const stackIcons = [Monitor, Server, Database, KeyRound, Cpu, HardDrive, CreditCard, BarChart3, Rocket]

function getFvpShortcutSections(section?: PlanningDocumentSection) {
  if (!section?.content.trim()) return []

  return extractSectionsByHeading(section.content, 3).filter((child) => {
    const heading = stripInlineMarkdown(child.heading).toLowerCase()
    return /tactical shortcuts|manual shortcuts|speed to market|ops over code/.test(heading)
  })
}

function FvpShortcutList({ sections }: { sections: PlanningDocumentSection[] }) {
  if (sections.length === 0) return null
  const visibleSections = sections
    .map((section) => ({
      section,
      rows: getDesignListRows(section.content),
    }))
    .filter(({ rows }) => rows.length > 0)

  if (visibleSections.length === 0) return null

  return (
    <div className="border border-[#EAE0D8] bg-white">
      {visibleSections.map(({ section, rows }, sectionIndex) => {
        const title = stripInlineMarkdown(section.heading)
          .replace(/^\d+(?:\.\d+)*\.?\s+/, "")
          .trim()

        return (
          <section key={`${section.heading}-${sectionIndex}`} className={cn(sectionIndex > 0 && "border-t border-[#EAE0D8]")}>
            <div className="flex items-center gap-2 border-b border-[#EAE0D8] px-5 py-4">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                {title}
              </h3>
            </div>
            <div className="divide-y divide-[#EAE0D8]">
              {rows.map((row, index) => (
                <div key={`${row.title}-${index}`} className="grid grid-cols-[34px_minmax(0,1fr)] gap-4 px-5 py-4">
                  <div className="grid h-7 w-7 place-items-center border border-primary/20 bg-primary/[0.03] font-mono text-[10px] font-medium text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(displayFontClass, "text-[15px] font-bold leading-tight tracking-[-0.02em] text-[#1C1917]")}>
                      {row.title}
                    </p>
                    {row.body ? (
                      <p className="mt-1 text-[13.5px] leading-[1.5] text-[#4A4040]">
                        {row.body}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function FvpStack({ section }: { section?: PlanningDocumentSection }) {
  const rows = getDesignListRows(section?.content ?? "")
  const shortcutSections = getFvpShortcutSections(section)
  if (rows.length === 0 && shortcutSections.length === 0) return null

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <div className="fvp-stack grid gap-px border border-[#EAE0D8] bg-[#EAE0D8] sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, index) => {
            const Icon = stackIcons[index % stackIcons.length]
            return (
              <article key={`${row.title}-${index}`} className="fvp-sc bg-white px-5 py-5">
                <div className="layer flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[#8A8480]">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {row.title}
                </div>
                {row.body ? (
                  <div className={cn(displayFontClass, "rec mt-3 text-[15.5px] font-bold leading-tight tracking-[-0.02em] text-[#1C1917]")}>
                    {row.body}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}
      <FvpShortcutList sections={shortcutSections} />
    </div>
  )
}

function getDesignBuildRows(content: string) {
  const narrative = parseNarrativeTable(content)
  if (narrative.table) {
    const { headers, rows } = narrative.table
    return rows.map((row, index) => ({
      chunk: getTableCell(row, headers, ["build chunk"]) || getTableCell(row, headers, ["step"]) || row[1] || row[0] || `Build chunk ${index + 1}`,
      goal: getTableCell(row, headers, ["goal"]) || "",
      gate: getTableCell(row, headers, ["test", "moving"]) || getTableCell(row, headers, ["criteria"]) || "",
    }))
  }

  return narrative.items.map((item) => {
    const labeled = splitLabeledText(item)
    return {
      chunk: labeled?.label || stripMarkdownMarker(item),
      goal: labeled?.body || "",
      gate: "",
    }
  })
}

function FvpBuildSequence({ section }: { section?: PlanningDocumentSection }) {
  const rows = getDesignBuildRows(section?.content ?? "")
  if (rows.length === 0) return null

  return (
    <div className="fvp-build flex flex-col gap-3.5">
      {rows.map((row, index) => (
        <article key={`${row.chunk}-${index}`} className="fvp-bstep grid grid-cols-[44px_minmax(0,1fr)] gap-[18px]">
          <div className={cn("fvp-bn grid h-10 w-10 place-items-center font-mono text-[15px] font-medium text-white", index === 0 ? "bg-primary" : "bg-[#1C1917]")}>
            {index + 1}
          </div>
          <div className="fvp-bcard border border-[#EAE0D8] bg-white px-5 py-5">
            <div className={cn(displayFontClass, "chunk text-[15.5px] font-bold leading-[1.4] tracking-[-0.02em] text-[#1C1917]")}>
              {row.chunk}
            </div>
            {row.goal || row.gate ? (
              <div className="fvp-bmeta mt-4 grid gap-4 border-t border-[#EAE0D8] pt-4 md:grid-cols-2">
                {row.goal ? (
                  <div className="m goal">
                    <div className="lb mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary">Goal</div>
                    <div className="tx text-[13px] leading-[1.5] text-[#4A4040]">{row.goal}</div>
                  </div>
                ) : null}
                {row.gate ? (
                  <div className="m gate">
                    <div className="lb mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8A8480]">Test before moving on</div>
                    <div className="tx flex gap-2 text-[13px] leading-[1.5] text-[#4A4040]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                      {row.gate}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}

function FvpGuardrails({ section }: { section?: PlanningDocumentSection }) {
  const items = parseNarrativeTable(section?.content ?? "").items
  if (items.length === 0) return null
  const splitAt = Math.ceil(items.length / 2)
  const groups = [
    { title: "Process", items: items.slice(0, splitAt) },
    { title: "Quality & Safety", items: items.slice(splitAt) },
  ].filter((group) => group.items.length > 0)

  return (
    <div className="pp-two grid gap-10 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="pp-subhead mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
            <span className="dot h-1.5 w-1.5 rounded-full bg-primary" />
            {group.title}
          </h3>
          <ul className="pp-checklist flex flex-col gap-3">
            {group.items.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-3 text-[15px] leading-[1.5] text-[#4A4040]">
                {/key|secret|privacy|photo|train|consent/i.test(item) ? (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function FvpValidation({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null
  const nested = extractSectionsByHeading(section.content, 3)
  const audience = getSectionByAlias(nested, ["First Test Audience", "First test audience"])
  const findUsers = getSectionByAlias(nested, ["How to find them", "Recruiting"])
  const researchPlan = getSectionByAlias(nested, ["Research Plan", "Validation Research Plan"])
  const tasks = getSectionByAlias(nested, ["Test Tasks", "Tasks"])
  const metrics = getSectionByAlias(nested, ["Suggested Metrics", "Metrics", "Success Metrics", "Success Criteria"])
  const questions = getSectionByAlias(nested, ["Key Feedback Questions", "Feedback Questions"])
  const fallback = parseNarrativeTable(section.content)

  return (
    <div className="space-y-10">
      {(audience || findUsers) ? (
        <div className="pp-tech-grid grid gap-4 md:grid-cols-2">
          {audience ? <FvpSmallIconCard title="First test audience" body={getFirstParagraph(audience)} icon={UsersRound} /> : null}
          {findUsers ? <FvpSmallIconCard title="How to find them" body={getFirstParagraph(findUsers)} icon={Search} /> : null}
        </div>
      ) : null}
      {researchPlan ? (
        <FvpResearchPlan section={researchPlan} />
      ) : (tasks || questions || metrics) ? (
        <FvpResearchPlan section={{ heading: "Research plan", content: [tasks?.content, questions?.content, metrics?.content].filter(Boolean).join("\n\n") }} />
      ) : fallback.items.length > 0 ? (
        <FvpResearchPlan section={{ heading: "Research plan", content: fallback.items.map((item) => `- ${item}`).join("\n") }} />
      ) : null}
    </div>
  )
}

function FvpSmallIconCard({
  title,
  body,
  icon: Icon,
}: {
  title: string
  body: string
  icon: typeof Target
}) {
  return (
    <article className="pp-tech border border-[#EAE0D8] bg-white px-6 py-6">
      <div className="pp-tech-head mb-3.5 flex items-center gap-3">
        <Icon className="h-[18px] w-[18px] text-primary" />
        <h4 className={cn(displayFontClass, "text-[15.5px] font-bold tracking-[-0.02em] text-[#1C1917]")}>{title}</h4>
      </div>
      <p className="text-[13.5px] leading-[1.55] text-[#4A4040]">{body}</p>
    </article>
  )
}

function getResearchPlanItems(section: PlanningDocumentSection): FollowThroughItem[] {
  const narrative = parseNarrativeTable(section.content)

  if (narrative.table?.rows.length) {
    const headers = narrative.table.headers.map(normalizeHeading)
    const activityIndex = Math.max(
      headers.findIndex((header) => /research activity|activity|task/.test(header)),
      0,
    )
    const questionIndex = headers.findIndex((header) => /question/.test(header))
    const signalIndex = headers.findIndex((header) => /signal|threshold|criteria|criterion/.test(header))
    const decisionIndex = headers.findIndex((header) => /decision/.test(header))

    return narrative.table.rows
      .map((row) => {
        const title = row[activityIndex] || row.find(Boolean) || ""
        const details = [
          questionIndex >= 0 && row[questionIndex] ? `Question: ${row[questionIndex]}` : "",
          signalIndex >= 0 && row[signalIndex] ? `Signal: ${row[signalIndex]}` : "",
          decisionIndex >= 0 && row[decisionIndex] ? `Decision: ${row[decisionIndex]}` : "",
        ].filter(Boolean)

        return {
          title,
          body: details.join(" "),
        }
      })
      .filter((item) => item.title || item.body)
  }

  return parseFollowThroughItems(section.content)
}

function FvpResearchPlan({ section }: { section: PlanningDocumentSection }) {
  const items = getResearchPlanItems(section)
  if (items.length === 0) return null

  return (
    <section className="space-y-4">
      <h3 className="pp-subhead mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
        <span className="dot h-1.5 w-1.5 rounded-full bg-primary" />
        Research plan
      </h3>
      <div className="divide-y divide-[#E8DDD5] border border-[#E8DDD5] bg-white">
        {items.map((item, index) => (
          <article key={`${item.title}-${index}`} className="grid gap-4 px-6 py-6 sm:grid-cols-[48px_1fr]">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8480]">
              R{String(index + 1).padStart(2, "0")}
            </p>
            <div>
              <h4 className="text-[15px] font-bold leading-5 text-[#0A0A0A]">
                {item.title}
              </h4>
              {item.body ? (
                <p className="mt-2 max-w-3xl text-[13.5px] leading-6 text-[#4A4040]">
                  {item.body}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function FvpCuts({ section }: { section?: PlanningDocumentSection }) {
  const rows = getDesignListRows(section?.content ?? "")
  if (rows.length === 0) return null

  return (
    <div className="fvp-cuts grid gap-px border border-[#EAE0D8] bg-[#EAE0D8]">
      {rows.map((row, index) => {
        const labeled = splitLabeledText(row.title)
        const condition = labeled?.label || row.title
        const action = labeled?.body || row.body
        return (
          <article key={`${condition}-${index}`} className="fvp-cut grid items-center gap-4 bg-white px-6 py-5 md:grid-cols-[1fr_32px_1fr]">
            <div className="iff text-[13.5px] leading-[1.5] text-[#4A4040]">
              <span className="font-semibold text-[#1C1917]">{condition}</span>
            </div>
            <div className="ar text-primary">
              <ArrowRight className="h-[18px] w-[18px]" />
            </div>
            <div className="then text-[13.5px] leading-[1.5] text-[#1C1917]">{action}</div>
          </article>
        )
      })}
    </div>
  )
}

function FvpPromptBlock({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null

  return (
    <div className="fvp-prompt border border-[#2C2520] bg-[#1C1917]">
      <div className="bar flex items-center gap-2 border-b border-[#2C2520] px-4 py-3">
        <span className="d h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="d h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="d h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="t ml-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#8A8480]">first-version-prompt.txt</span>
      </div>
      <pre className="m-0 whitespace-pre-wrap px-6 py-5 font-mono text-[12px] leading-[1.7] text-[#D9D3CE]">
        {stripHorizontalRulesFromMarkdown(section.content)}
      </pre>
    </div>
  )
}

type AiBuildToolRecommendation = {
  name: string
  url: string | null
  why: string
  bestFit: string
  cost: string
  watchOut: string
  handoff: string
}

const AI_BUILD_TOOL_URLS: Record<string, string> = {
  "bolt": "https://bolt.new",
  "claude code": "https://www.anthropic.com/claude-code",
  "cline": "https://cline.bot",
  "codex": "https://openai.com/codex",
  "cursor": "https://cursor.com",
  "devin": "https://devin.ai",
  "gemini code assist": "https://codeassist.google",
  "github copilot": "https://github.com/features/copilot",
  "lovable": "https://lovable.dev",
  "replit": "https://replit.com",
  "v0": "https://v0.dev",
  "warp": "https://www.warp.dev",
}

function getAiBuildToolUrl(name: string) {
  return AI_BUILD_TOOL_URLS[stripInlineMarkdown(name).trim().toLowerCase()] ?? null
}

function getRecommendedTool(section?: PlanningDocumentSection): AiBuildToolRecommendation | null {
  if (!section?.content.trim()) return null

  const headingLink = section.content.match(/^###\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/m)
  const headingText = section.content.match(/^###\s+(.+)$/m)
  const name = stripInlineMarkdown(headingLink?.[1] ?? headingText?.[1] ?? section.heading).trim()
  const url = headingLink?.[2]?.trim() ?? getAiBuildToolUrl(name)

  const field = (label: string) => {
    const pattern = new RegExp(`^-\\s*\\*\\*${label}\\*\\*:\\s*(.+)$`, "im")
    return stripInlineMarkdown(section.content.match(pattern)?.[1] ?? "").trim()
  }

  const why = field("Why this tool")
  const bestFit = field("Best fit for this project")
  const cost = field("Expected starting cost")
  const watchOut = field("Watch out")
  const handoff = field("Handoff instruction")

  if (!name || !why) {
    const fallback = stripHorizontalRulesFromMarkdown(section.content)
    return fallback ? {
      name: name || "Recommended tool",
      url,
      why: fallback,
      bestFit: "",
      cost: "",
      watchOut: "",
      handoff: "",
    } : null
  }

  return { name, url, why, bestFit, cost, watchOut, handoff }
}

function AiPromptRecommendedToolCard({ section }: { section?: PlanningDocumentSection }) {
  const recommendation = getRecommendedTool(section)

  if (!recommendation) return null

  const details = [
    { label: "Why", value: recommendation.why },
    { label: "Best Fit", value: recommendation.bestFit },
    { label: "Cost", value: recommendation.cost },
    { label: "Watch Out", value: recommendation.watchOut },
    { label: "Handoff", value: recommendation.handoff },
  ].filter((detail) => detail.value)

  const title = (
    <span className={cn(displayFontClass, "text-[22px] font-bold leading-tight tracking-[-0.03em] text-[#0A0A0A]")}>
      {recommendation.name}
    </span>
  )

  return (
    <section id="ai-prompts-recommended-build-tool" className="border border-[#E8DDD5] bg-white px-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
            Recommended AI Build Tool
          </p>
          <div className="mt-2">
            {recommendation.url ? (
              <a
                href={recommendation.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-start gap-1.5 transition-opacity hover:opacity-80"
              >
                {title}
                <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#0A0A0A]" />
              </a>
            ) : title}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {details.map((detail) => (
          <div key={detail.label} className="border-t border-[#E8DDD5] pt-3">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8480]">
              {detail.label}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[#4A4040]">{detail.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CurrentMvpPlanDocumentBlocks({ content }: PlanningDocumentProps) {
  const sections = extractSectionsByHeading(content, 2)
  const summary = getSectionByAlias(sections, ["MVP Summary"])
  const assumptions = getSectionByAlias(sections, ["Key Risks, Assumptions, and Scope Decisions", "Key Assumptions and Scope Decisions"])
  const targetProblem = getSectionByAlias(sections, ["Target User and Problem"])
  const goal = getSectionByAlias(sections, ["MVP Goal, Definition of Done, and Riskiest Assumptions"])
  const coreUserFlows = getSectionByAlias(sections, ["Core User Flows"])
  const userFlow = getSectionByAlias(sections, ["Core User Flow"])
  const scope = getSectionByAlias(sections, ["MVP Scope"])
  const features = getSectionByAlias(sections, ["Must-Have Features"])
  const buildApproach = getSectionByAlias(sections, ["Suggested Build Approach"])
  const validation = getSectionByAlias(sections, ["Validation Plan"])
  const cutList = getSectionByAlias(sections, ["Cut List"])
  const assumptionRows = getFvpAssumptionRows(assumptions)
  const coreFlowRows = coreUserFlows ? getDesignListRows(coreUserFlows.content).map((row) => ({
    tag: "Flow",
    title: row.title,
    body: row.body,
  })) : []
  const scopeRows = getFvpScopeRows({ scope, features })
  const sectionTotal = [
    summary,
    goal,
    targetProblem,
    coreFlowRows.length > 0 || userFlow,
    assumptionRows.length > 0,
    coreFlowRows.length === 0 && scopeRows.length > 0,
    buildApproach,
    validation,
    cutList,
  ].filter(Boolean).length
  let sectionIndex = 1
  const nextSectionIndex = () => sectionIndex++

  return (
    <div className="flex flex-col gap-16">
      <FvpMasthead />

      {summary ? (
        <FvpSection id="mvp-summary" kicker="Thesis" title="MVP Summary" index={nextSectionIndex()} total={sectionTotal}>
          <FvpSummary section={summary} />
        </FvpSection>
      ) : null}

      {goal ? (
        <FvpSection id="mvp-bet" kicker="Validation" title="The Bet" index={nextSectionIndex()} total={sectionTotal}>
          <FvpTechGrid section={goal} fallbackTitle="Goal" />
        </FvpSection>
      ) : null}

      {targetProblem ? (
        <FvpSection id="mvp-target-user-problem" kicker="Audience" title="Target User & Problem" index={nextSectionIndex()} total={sectionTotal}>
          <FvpTechGrid section={targetProblem} fallbackTitle="Target user" />
        </FvpSection>
      ) : null}

      {coreFlowRows.length > 0 ? (
        <FvpSection id="mvp-core-user-flow" kicker="Journey" title="Core User Flows" index={nextSectionIndex()} total={sectionTotal}>
          <FvpScopeGrid rows={coreFlowRows} />
        </FvpSection>
      ) : userFlow ? (
        <FvpSection id="mvp-core-user-flow" kicker="Journey" title="Core User Flow" index={nextSectionIndex()} total={sectionTotal}>
          <FvpFlow section={userFlow} />
        </FvpSection>
      ) : null}

      {assumptionRows.length > 0 ? (
        <FvpSection id="mvp-key-assumptions" kicker="Assumptions" title="Key Risks & Assumptions" index={nextSectionIndex()} total={sectionTotal}>
          <FvpScopeGrid rows={assumptionRows} />
        </FvpSection>
      ) : null}

      {coreFlowRows.length === 0 && scopeRows.length > 0 ? (
        <FvpSection id="mvp-scope" kicker="Scope Decisions" title="MVP Scope" index={nextSectionIndex()} total={sectionTotal}>
          <FvpScopeGrid rows={scopeRows} />
        </FvpSection>
      ) : null}

      {buildApproach ? (
        <FvpSection id="mvp-suggested-stack" kicker="Tooling" title="Suggested Build Approach" index={nextSectionIndex()} total={sectionTotal}>
          <FvpStack section={buildApproach} />
        </FvpSection>
      ) : null}

      {validation ? (
        <FvpSection id="mvp-validation-plan" kicker="Measurement" title="Validation Plan" index={nextSectionIndex()} total={sectionTotal}>
          <FvpValidation section={validation} />
        </FvpSection>
      ) : null}

      {cutList ? (
        <FvpSection id="mvp-cut-list" kicker="Simplify If Needed" title="Cut List" index={nextSectionIndex()} total={sectionTotal}>
          <FvpCuts section={cutList} />
        </FvpSection>
      ) : null}
    </div>
  )
}

function AiPromptsMasthead() {
  return (
    <header className="pb-10 pt-6">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Builder Handoff
        </p>
        <span className="h-px w-7 bg-primary/50" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <h1
          className={cn(
            displayFontClass,
            "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]",
          )}
        >
          AI Prompts
        </h1>
        <ExplainTermButton termKey="aiPrompts" label="AI Prompts" />
      </div>
    </header>
  )
}

function hasRenderableSection(section?: PlanningDocumentSection) {
  return Boolean(section?.content.trim())
}

export function AiPromptsDocumentBlocks({
  prdContent,
  mvpContent,
}: {
  prdContent: string | null
  mvpContent: string | null
  projectId: string
}) {
  const prdSections = useMemo(() => extractSectionsByHeading(prdContent ?? "", 2), [prdContent])
  const mvpSections = useMemo(() => extractSectionsByHeading(mvpContent ?? "", 2), [mvpContent])

  const recommendedTool = getSectionByAlias(mvpSections, ["Recommended AI Build Tool", "AI Build Tool", "Recommended Build Tool"])
  const nextPrompt = getSectionByAlias(mvpSections, ["Next Prompt for AI Coding Tool"])
  const guardrails = getSectionByAlias(mvpSections, ["AI Build Guardrails"])
  const buildSequence = getSectionByAlias(mvpSections, ["AI-Friendly Build Sequence"])
  const requirements = getSectionByAlias(prdSections, ["Functional requirements"])
  const userStories = getSectionByAlias(prdSections, ["User stories and acceptance criteria"])
  const sections = [
    nextPrompt,
    guardrails,
    buildSequence,
    requirements,
    userStories,
  ].filter(hasRenderableSection)
  const sectionTotal = sections.length
  let sectionIndex = 1
  const nextSectionIndex = () => sectionIndex++

  if (sectionTotal === 0 && !recommendedTool) {
    return (
      <div className="flex items-center justify-center p-6 text-center text-sm text-muted-foreground sm:p-12">
        AI Prompts has not been generated yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-16">
      <AiPromptsMasthead />

      <AiPromptRecommendedToolCard section={recommendedTool} />

      {nextPrompt ? (
        <DesignedSection
          id="ai-prompts-next-prompt"
          kicker="Handoff"
          title="Next Prompt"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <FvpPromptBlock section={nextPrompt} />
        </DesignedSection>
      ) : null}

      {guardrails ? (
        <DesignedSection
          id="ai-prompts-build-guardrails"
          kicker="Discipline"
          title="AI Build Guardrails"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <FvpGuardrails section={guardrails} />
        </DesignedSection>
      ) : null}

      {buildSequence ? (
        <DesignedSection
          id="ai-prompts-build-sequence"
          kicker="Build Scope"
          title="AI-Friendly Build Sequence"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <FvpBuildSequence section={buildSequence} />
        </DesignedSection>
      ) : null}

      {requirements ? (
        <DesignedSection
          id="ai-prompts-functional-requirements"
          kicker="Product Plan"
          title="Functional Requirements"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <RequirementShowcase section={requirements} />
        </DesignedSection>
      ) : null}

      {userStories ? (
        <DesignedSection
          id="ai-prompts-user-stories-acceptance-criteria"
          kicker="Product Plan"
          title="User Stories & Acceptance Criteria"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <UserStoryShowcase section={userStories} />
        </DesignedSection>
      ) : null}
    </div>
  )
}

export function PrdDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  const viewModel = useMemo(() => getPrdDocumentViewModel(content), [content])

  if (!viewModel.canRenderModules) {
    return (
      <div className="space-y-4">
        {viewModel.warning ? <Warning message={viewModel.warning} /> : null}
        <PlanningMarkdownRenderer content={content} projectId={projectId} />
      </div>
    )
  }

  const { structured } = viewModel

  if (isCurrentPromptDocument(content, currentPrdSectionAliases)) {
    return <CurrentPrdDocumentBlocks content={content} projectId={projectId} />
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Product Plan"
        title="Product Plan"
        description="A clear brief covering user needs, value, personas, scope, and implementation constraints."
      />

      {hasNarrativeContent(structured.background) || hasNarrativeContent(structured.vision) ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {hasNarrativeContent(structured.background) ? (
            <PencilCard title="Background / Context" kicker="Product Context">
              <NarrativeContent narrative={structured.background} />
            </PencilCard>
          ) : null}
          {hasNarrativeContent(structured.vision) ? (
            <PencilCard title="Vision" kicker="Product Direction" dark>
              <NarrativeContent narrative={structured.vision} dark />
            </PencilCard>
          ) : null}
        </div>
      ) : null}

      <div id="prd-user-needs">
        <PencilCard title="Problem to Solve" kicker="Problem Definition">
          <NarrativeContent narrative={structured.userNeeds} />
        </PencilCard>
      </div>

      <div id="prd-value-proposition">
        <PencilCard title="Value Proposition" kicker="Product Thesis" dark>
          <NarrativeContent narrative={structured.valueProposition} dark />
        </PencilCard>
      </div>

      <div className="flex flex-col gap-6">
        <PencilCard title="Measurable Objectives" kicker="Outcomes">
          <NarrativeContent narrative={structured.objectives} />
        </PencilCard>
        <PencilCard title="Positioning" kicker="Market Fit">
          <NarrativeContent narrative={structured.positioning} />
        </PencilCard>
      </div>

      <div id="prd-personas">
        <PencilCard title="Personas" kicker="Target Users">
          <div className="space-y-4">
            {hasNarrativeContent(structured.stakeholders) ? (
              <div className="border border-[#E0E0E0] bg-white px-5 py-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
                  Stakeholders
                </p>
                <NarrativeContent narrative={structured.stakeholders} />
              </div>
            ) : null}
          </div>
          <div className="mt-4 space-y-4">
            <DetailedPersonaCards personas={structured.personas.map(currentPersonaFromSection)} />
          </div>
        </PencilCard>
      </div>

      <div id="prd-requirements">
        <PencilCard title="What to Build" kicker="Functional Scope">
          <RequirementsContent narrative={structured.requirements} />
        </PencilCard>
      </div>

      <div id="prd-user-stories">
        <PencilCard title="Key User Flows" kicker="Behavior">
          <UserStoriesContent narrative={structured.userStories} />
        </PencilCard>
      </div>

      <div id="prd-prioritization" className="flex flex-col gap-6">
        {hasNarrativeContent(structured.prioritization) ? (
          <PencilCard title="Build Order" kicker="Release Focus" dark>
            <NarrativeContent narrative={structured.prioritization} dark />
          </PencilCard>
        ) : null}
        {hasNarrativeContent(structured.uiUx) || hasNarrativeContent(structured.technical) ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {hasNarrativeContent(structured.uiUx) ? (
              <PencilCard title="Product Experience" kicker="Experience">
                <NarrativeContent narrative={structured.uiUx} />
              </PencilCard>
            ) : null}
            {hasNarrativeContent(structured.technical) ? (
              <PencilCard title="Technical Requirements" kicker="Build Constraints">
                <NarrativeContent narrative={structured.technical} />
              </PencilCard>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function MvpPlanDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  const viewModel = useMemo(() => getMvpPlanViewModel(content), [content])

  if (!viewModel.canRenderModules) {
    return (
      <div className="space-y-4">
        {viewModel.warning ? <Warning message={viewModel.warning} /> : null}
        <PlanningMarkdownRenderer content={content} projectId={projectId} />
      </div>
    )
  }

  const { structured } = viewModel

  if (isCurrentPromptDocument(content, currentMvpSectionAliases)) {
    return <CurrentMvpPlanDocumentBlocks content={content} projectId={projectId} />
  }

  const primaryUserFlowContent = structured.userFlow[0]?.content.trim() ?? ""
  const scopeDuplicatesUserFlow = Boolean(primaryUserFlowContent && structured.scope.source.trim() === primaryUserFlowContent)
  const featureSummaryDuplicatesUserFlow = Boolean(primaryUserFlowContent && structured.featureSummary.source.trim() === primaryUserFlowContent)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="First Version"
        title="First Version Plan"
        description="A launchable scope plan focused on what to prove, the core workflow, feature boundaries, and success signals."
      />

      <div id="mvp-wedge" className="flex flex-col gap-6">
        {hasNarrativeContent(structured.overview) ? (
          <PencilCard title="Product Vision" kicker="Overview">
            <NarrativeContent narrative={structured.overview} />
          </PencilCard>
        ) : null}
        <PencilCard title="What We Need to Prove" kicker="Validation" dark>
          <NarrativeContent narrative={structured.hypothesis} dark />
        </PencilCard>
        <div className="grid gap-6 xl:grid-cols-2">
          <PencilCard title="Problem to Prove" kicker="Problem">
            <NarrativeContent narrative={structured.problem} />
          </PencilCard>
          <PencilCard title="Target Customer" kicker="Audience">
            <NarrativeContent narrative={structured.targetUser} />
          </PencilCard>
        </div>
        {hasNarrativeContent(structured.scope) && !scopeDuplicatesUserFlow ? (
          <PencilCard title="What's In / Out" kicker="Scope">
            <NarrativeContent narrative={structured.scope} />
          </PencilCard>
        ) : null}
      </div>

      <div id="mvp-core-features" className="flex flex-col gap-6">
        {hasNarrativeContent(structured.featureSummary) && !featureSummaryDuplicatesUserFlow ? (
          <PencilCard title="Core Features" kicker="Feature Set">
            <NarrativeContent narrative={structured.featureSummary} />
          </PencilCard>
        ) : null}
        <div className="grid gap-6 xl:grid-cols-2">
          {structured.featureDetails.map((feature, index) => (
            <MarkdownSectionCard
              key={`${feature.heading}-${index}`}
              section={feature}
              projectId={projectId}
              kicker={`Feature ${String(index + 1).padStart(2, "0")}`}
              dark={index === 0}
              className={cn(
                structured.featureDetails.length % 2 === 1 &&
                  index === structured.featureDetails.length - 1 &&
                  "xl:col-span-2",
              )}
            />
          ))}
        </div>
      </div>

      <div id="mvp-user-flow" className="flex flex-col gap-6">
        {structured.userFlow.map((section, index) => (
          <MarkdownSectionCard
            key={`${section.heading}-${index}`}
            section={section}
            projectId={projectId}
            title={index === 0 ? "Primary User Journey" : section.heading}
            kicker="User Flow"
          />
        ))}
      </div>

      <div id="mvp-timeline" className="flex flex-col gap-6">
        {structured.timeline.map((section, index) => (
          <MarkdownSectionCard
            key={`${section.heading}-${index}`}
            section={section}
            projectId={projectId}
            title={index === 0 ? "Timeline & Risks" : section.heading}
            kicker="Delivery Plan"
            dark={index === 0}
          />
        ))}
        {structured.techStack.map((section, index) => (
          <MarkdownSectionCard
            key={`${section.heading}-${index}`}
            section={section}
            projectId={projectId}
            kicker="Tech Stack"
          />
        ))}
      </div>

      <div id="mvp-success-metrics" className="flex flex-col gap-6">
        {structured.successMetrics.map((section, index) => (
          <MarkdownSectionCard
            key={`${section.heading}-${index}`}
            section={section}
            projectId={projectId}
            title={index === 0 ? "Success Signals" : section.heading}
            kicker="Validation"
          />
        ))}
        {structured.assumptions.map((section, index) => (
          <MarkdownSectionCard
            key={`${section.heading}-${index}`}
            section={section}
            projectId={projectId}
            kicker="Assumptions"
            dark={index === 0}
          />
        ))}
      </div>
    </div>
  )
}
