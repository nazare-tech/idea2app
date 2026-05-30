"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleGauge,
  ClipboardList,
  Database,
  Layers,
  Puzzle,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react"

import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
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

function TimelinePhaseDetails({
  content,
  label,
}: {
  content: string
  label: string
}) {
  const details = parseTimelinePhaseDetails(content)
  const narrative = parseNarrativeTable(content)

  if (details.length === 0 && !narrative.table) {
    return (
      <p className="ui-type-body-sm text-[#999999]">
        No structured content available.
      </p>
    )
  }

  return (
    <div aria-label={label} className="space-y-4">
      {details.map((detail, index) => (
        <div key={`${detail.label ?? detail.body ?? "detail"}-${index}`} className="space-y-2">
          {detail.label ? (
            <div className="grid gap-1 sm:grid-cols-[132px_1fr]">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8480]">
                {detail.label}
              </p>
              {detail.body ? (
                <p className="ui-type-body-sm text-[#4A4040]">{detail.body}</p>
              ) : null}
            </div>
          ) : detail.body ? (
            <p className="ui-type-body-sm text-[#4A4040]">{detail.body}</p>
          ) : null}

          {detail.bullets.length > 0 ? (
            <ul aria-label={`${detail.label ?? "Phase"} items`} className="space-y-2 sm:pl-[132px]">
              {detail.bullets.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="flex gap-3 text-[13px] leading-5 text-[#4A4040]">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
      {narrative.table ? (
        <DataTable headers={narrative.table.headers} rows={narrative.table.rows} />
      ) : null}
    </div>
  )
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

  const idMatch = cleaned.match(/^((?:FR|NFR|IR)[-\s]?\d+)\s*:?\s*(.*)$/i)
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
  "Key Assumptions and Scope Decisions",
  "Target User and Problem",
  "MVP Goal, Definition of Done, and Riskiest Assumptions",
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

function getDocumentPreamble(content: string) {
  const withoutTitle = content.replace(/^#\s+.+$/m, "").trimStart()
  const firstH2Index = withoutTitle.search(/^##\s+/m)
  const preamble = firstH2Index >= 0 ? withoutTitle.slice(0, firstH2Index) : withoutTitle

  return preamble.trim()
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

function SectionFallbackCard({
  section,
  projectId,
  kicker = "Section",
  dark = false,
}: {
  section?: PlanningDocumentSection
  projectId: string
  kicker?: string
  dark?: boolean
}) {
  if (!section?.content.trim()) return null

  return (
    <PencilCard title={getCurrentSectionTitle(section.heading)} kicker={kicker} dark={dark}>
      <PlanningMarkdownRenderer content={section.content} projectId={projectId} />
    </PencilCard>
  )
}

function CurrentPromptPage({
  content,
  projectId,
  eyebrow,
  title,
  description,
  children,
}: PlanningDocumentProps & {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  const preamble = getDocumentPreamble(content)

  return (
    <div className="space-y-2">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      {preamble ? (
        <PencilCard title="Plan Snapshot" kicker="Context" dark>
          <PlanningMarkdownRenderer content={preamble} projectId={projectId} />
        </PencilCard>
      ) : null}

      {children}
    </div>
  )
}

function MiniCardGrid({
  items,
  labelPrefix,
}: {
  items: string[]
  labelPrefix: string
}) {
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
            {labelPrefix} {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 ui-type-body-sm text-[#0A0A0A]">{item}</p>
        </div>
      ))}
    </div>
  )
}

function SplitSectionCards({
  sections,
  projectId,
}: {
  sections: PlanningDocumentSection[]
  projectId: string
}) {
  if (sections.length === 0) return null

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <article
          key={`${section.heading}-${index}`}
          className="border border-[#E8DDD5] bg-[#FAFAFA] px-5 py-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8480]">
            {getCurrentSectionTitle(section.heading)}
          </p>
          <div className="mt-3">
            <PlanningMarkdownRenderer content={section.content} projectId={projectId} />
          </div>
        </article>
      ))}
    </div>
  )
}

function NestedSectionCardsOrNarrative({
  section,
  projectId,
}: {
  section: PlanningDocumentSection
  projectId: string
}) {
  const nested = extractSectionsByHeading(section.content, 3)

  if (nested.length > 0) {
    return <SplitSectionCards sections={nested} projectId={projectId} />
  }

  return <NarrativeContent narrative={parseNarrativeTable(section.content)} />
}

function SectionFallbackGrid({
  cards,
  projectId,
}: {
  cards: Array<{
    section?: PlanningDocumentSection
    kicker: string
  }>
  projectId: string
}) {
  const visibleCards = cards.filter((card) => card.section?.content.trim())

  if (visibleCards.length === 0) return null

  return (
    <div className="space-y-2">
      {visibleCards.map((card) => (
        <SectionFallbackCard
          key={`${card.kicker}-${card.section?.heading}`}
          section={card.section}
          projectId={projectId}
          kicker={card.kicker}
        />
      ))}
    </div>
  )
}

function JourneySteps({ narrative }: { narrative: PlanningNarrativeTable }) {
  if (narrative.items.length === 0) {
    return <NarrativeContent narrative={narrative} />
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {narrative.items.map((item, index) => (
        <article key={`${item}-${index}`} className="border border-[#E8DDD5] bg-[#FAFAFA] px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
            Step {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 ui-type-body-sm text-[#0A0A0A]">{item}</p>
        </article>
      ))}
    </div>
  )
}

interface CurrentPersona {
  name: string
  fields: Array<{ label: string; body: string }>
}

function parseCurrentPersonas(content: string): CurrentPersona[] {
  const personas: CurrentPersona[] = []
  let active: CurrentPersona | null = null

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    const heading = trimmed.match(/^\*\*([^*:][^*]{1,96})\*\*$/)?.[1]?.trim()

    if (heading) {
      active = { name: heading, fields: [] }
      personas.push(active)
      continue
    }

    if (!active) continue

    const field = trimmed
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
      .match(/^\*\*([^*]+)\*\*:\s*(.+)$/)

    if (field) {
      active.fields.push({
        label: field[1].trim(),
        body: field[2].trim(),
      })
    }
  }

  return personas
}

function PersonaCards({ section, projectId }: { section?: PlanningDocumentSection; projectId: string }) {
  if (!section) return null

  const nested = extractSectionsByHeading(section.content, 3)
  const keyUserTypes = parseNarrativeTable(
    getSectionByAlias(nested, ["Key user types"])?.content ?? "",
  )
  const personaDetails = getSectionByAlias(nested, ["Persona details"])?.content ?? section.content
  const roleAccess = parseNarrativeTable(
    getSectionByAlias(nested, ["Role-based access"])?.content ?? "",
  )
  const personas = parseCurrentPersonas(personaDetails)

  return (
    <PencilCard title="User Personas" kicker="Target Users">
      <div className="space-y-5">
        <MiniCardGrid items={keyUserTypes.items} labelPrefix="User Type" />

        {personas.length > 0 ? (
          <div className="space-y-4">
            {personas.map((persona, index) => (
              <article key={`${persona.name}-${index}`} className="border border-[#D8CEC5] bg-[#F7F2ED] px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8480]">
                  Persona {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className={cn(displayFontClass, "mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#1C1917]")}>
                  {persona.name}
                </h3>
                <div className="mt-4 space-y-3">
                  {persona.fields.map((field) => (
                    <div key={`${persona.name}-${field.label}`} className="border-t border-[#E8DDD5] pt-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8480]">
                        {field.label}
                      </p>
                      <p className="mt-1 ui-type-body-sm text-[#1C1917]">{field.body}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <PlanningMarkdownRenderer content={personaDetails} projectId={projectId} />
        )}

        {roleAccess.items.length > 0 ? (
          <div className="border border-[#E0E0E0] bg-white px-5 py-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
              Role-Based Access
            </p>
            <StructuredItemList items={roleAccess.items} />
          </div>
        ) : null}
      </div>
    </PencilCard>
  )
}

function getCurrentPrdSubtitle(section?: PlanningDocumentSection) {
  if (!section) {
    return "A structured plan covering users, stories, requirements, technical scope, success metrics, and delivery milestones."
  }

  const narrative = parseNarrativeTable(section.content)
  const paragraph = narrative.paragraphs.find((item) => item.length > 40) ?? narrative.paragraphs[0]
  const item = narrative.items.find((entry) => entry.length > 40) ?? narrative.items[0]

  return stripInlineMarkdown(paragraph ?? item ?? "A structured plan covering users, stories, requirements, technical scope, success metrics, and delivery milestones.")
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
  subtitle,
  metaItems,
}: {
  subtitle: string
  metaItems: Array<{ value: string; label: string }>
}) {
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
      <p className="mt-2 max-w-3xl ui-type-body text-[#666666]">
        {subtitle}
      </p>

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
  kicker,
  title,
  index,
  total,
  children,
}: {
  kicker: string
  title: string
  index: number
  total: number
  children: React.ReactNode
}) {
  return (
    <section className="pt-16">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <div className="space-y-3">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#1C1917]">
            {kicker}
          </p>
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
        <div className="grid gap-4 lg:grid-cols-3">
          {personas.map((persona, index) => (
            <article key={`${persona.name}-${index}`} className="border border-[#E8DDD5] bg-[#F5F0EB] px-6 py-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8480]">
                Persona {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className={cn(displayFontClass, "mt-2 text-[22px] font-bold tracking-[-0.03em] text-[#0A0A0A]")}>
                {persona.name}
              </h3>
              <div className="mt-5 space-y-4">
                {persona.fields.map((field) => (
                  <div key={`${persona.name}-${field.label}`} className="border-t border-[#D8CEC5] pt-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8480]">
                      {field.label}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-6 text-[#4A4040]">{field.body}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
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

function RequirementShowcase({ section }: { section?: PlanningDocumentSection }) {
  if (!section) return null

  const groups = Array.from(getRequirementGroups(parseNarrativeTable(section.content)).entries())
    .filter(([, items]) => items.length > 0)

  if (groups.length === 0) {
    return <NarrativeContent narrative={parseNarrativeTable(section.content)} />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map(([label, items]) => {
        const Icon = requirementIcons[label]

        return (
          <section key={label} className={cn("border border-[#E8DDD5] bg-white px-6 py-6", label === "Integration" && "lg:col-span-2")}>
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
                    {item.id ?? String(index + 1).padStart(2, "0")}
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
  const dependencies = getSectionByAlias(sections, ["Dependencies and assumptions"])
  const openQuestions = getSectionByAlias(sections, ["Open questions"])
  const supplementalSections = [
    { section: risks, kicker: "Risk" },
    { section: dependencies, kicker: "Inputs" },
    { section: openQuestions, kicker: "Decisions" },
  ].filter((item): item is { section: PlanningDocumentSection; kicker: string } =>
    Boolean(item.section?.content.trim()),
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
    ].filter(Boolean).length + (supplementalSections.length > 0 ? 1 : 0)
  let sectionIndex = 1
  const nextSectionIndex = () => sectionIndex++

  return (
    <div className="space-y-2">
      <ProductPlanMasthead
        subtitle={getCurrentPrdSubtitle(introduction)}
        metaItems={getCurrentPrdMetaItems({
          timeline,
          userStories,
          requirements,
        })}
      />

      {introduction ? (
        <DesignedSection
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
          kicker="Delivery"
          title="Timeline & Milestones"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <TimelineShowcase section={timeline} projectId={projectId} />
        </DesignedSection>
      ) : null}

      {supplementalSections.length > 0 ? (
        <DesignedSection
          kicker="Follow Through"
          title="Risks, Dependencies & Open Questions"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <div className="space-y-4">
            {supplementalSections.map(({ section, kicker }) => (
              <SectionFallbackCard
                key={`${kicker}-${section.heading}`}
                section={section}
                projectId={projectId}
                kicker={kicker}
              />
            ))}
          </div>
        </DesignedSection>
      ) : null}
    </div>
  )
}

function TableOrNarrative({ narrative }: { narrative: PlanningNarrativeTable }) {
  if (narrative.table) {
    return <DataTable headers={narrative.table.headers} rows={narrative.table.rows} />
  }

  return <NarrativeContent narrative={narrative} />
}

function FeatureTableCards({ narrative }: { narrative: PlanningNarrativeTable }) {
  if (!narrative.table) return <NarrativeContent narrative={narrative} />

  const headers = narrative.table.headers

  return (
    <div className="space-y-4">
      {narrative.table.rows.map((row, index) => {
        const feature = getTableCell(row, headers, ["feature"]) || row[0] || `Feature ${index + 1}`
        const why = getTableCell(row, headers, ["why", "matters", "value"])
        const criteria = getTableCell(row, headers, ["acceptance", "criteria"])

        return (
          <article key={`${feature}-${index}`} className="border border-[#E8DDD5] bg-[#FAFAFA] px-5 py-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8480]">
              Feature {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className={cn(displayFontClass, "mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#0A0A0A]")}>
              {feature}
            </h3>
            {why ? <p className="mt-3 ui-type-body-sm text-[#4A4040]">{why}</p> : null}
            {criteria ? (
              <div className="mt-4 border-t border-[#E8DDD5] pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8480]">
                  Acceptance Criteria
                </p>
                <p className="mt-2 ui-type-caption text-[#4A4040]">{criteria}</p>
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function CurrentMvpPlanDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  const sections = extractSectionsByHeading(content, 2)
  const summary = getSectionByAlias(sections, ["MVP Summary"])
  const assumptions = getSectionByAlias(sections, ["Key Assumptions and Scope Decisions"])
  const targetProblem = getSectionByAlias(sections, ["Target User and Problem"])
  const goal = getSectionByAlias(sections, ["MVP Goal, Definition of Done, and Riskiest Assumptions"])
  const userFlow = getSectionByAlias(sections, ["Core User Flow"])
  const scope = getSectionByAlias(sections, ["MVP Scope"])
  const features = getSectionByAlias(sections, ["Must-Have Features"])
  const buildApproach = getSectionByAlias(sections, ["Suggested Build Approach"])
  const buildSequence = getSectionByAlias(sections, ["AI-Friendly Build Sequence"])
  const guardrails = getSectionByAlias(sections, ["AI Build Guardrails"])
  const validation = getSectionByAlias(sections, ["Validation Plan"])
  const cutList = getSectionByAlias(sections, ["Cut List"])
  const nextPrompt = getSectionByAlias(sections, ["Next Prompt for AI Coding Tool"])

  return (
    <CurrentPromptPage
      content={content}
      projectId={projectId}
      eyebrow="First Version"
      title="First Version Plan"
      description="A focused first-version plan covering validation, core flow, scope, build sequence, guardrails, and success signals."
    >
      {summary ? (
        <PencilCard title="MVP Summary" kicker="Thesis">
          <NarrativeContent narrative={parseNarrativeTable(summary.content)} />
        </PencilCard>
      ) : null}

      <SectionFallbackGrid
        projectId={projectId}
        cards={[
          { section: assumptions, kicker: "Scope Decisions" },
          { section: goal, kicker: "Validation" },
        ]}
      />

      {targetProblem ? (
        <PencilCard title="Target User And Problem" kicker="Audience">
          <NestedSectionCardsOrNarrative
            section={targetProblem}
            projectId={projectId}
          />
        </PencilCard>
      ) : null}

      {userFlow ? (
        <PencilCard title="Core User Flow" kicker="Journey">
          <JourneySteps narrative={parseNarrativeTable(userFlow.content)} />
        </PencilCard>
      ) : null}

      {scope ? (
        <PencilCard title="MVP Scope" kicker="Include / Exclude">
          <TableOrNarrative narrative={parseNarrativeTable(scope.content)} />
        </PencilCard>
      ) : null}

      {features ? (
        <PencilCard title="Must-Have Features" kicker="Feature Set">
          <FeatureTableCards narrative={parseNarrativeTable(features.content)} />
        </PencilCard>
      ) : null}

      <SectionFallbackGrid
        projectId={projectId}
        cards={[
          { section: buildApproach, kicker: "Build Approach" },
          { section: buildSequence, kicker: "AI Build Sequence" },
        ]}
      />

      <SectionFallbackGrid
        projectId={projectId}
        cards={[
          { section: guardrails, kicker: "Guardrails" },
          { section: validation, kicker: "Validation Plan" },
        ]}
      />

      <SectionFallbackGrid
        projectId={projectId}
        cards={[
          { section: cutList, kicker: "Simplify If Needed" },
          { section: nextPrompt, kicker: "Next Prompt" },
        ]}
      />
    </CurrentPromptPage>
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
    <div className="space-y-2">
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

      <div className="space-y-2">
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
            {structured.personas.map((persona, index) => (
              <article
                key={`${persona.heading}-${index}`}
                className="border border-[#D8CEC5] bg-[#F7F2ED] px-5 py-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8480]">
                  {persona.heading === "Target User Profile"
                    ? "Target User"
                    : `Persona ${String(index + 1).padStart(2, "0")}`}
                </p>
                <h3 className={cn(displayFontClass, "mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#1C1917]")}>
                  {persona.heading}
                </h3>
                <div className="mt-3">
                  <PlanningMarkdownRenderer content={persona.content} projectId={projectId} />
                </div>
              </article>
            ))}
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

      <div id="prd-prioritization" className="space-y-2">
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

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="First Version"
        title="First Version Plan"
        description="A launchable scope plan focused on what to prove, the core workflow, feature boundaries, and success signals."
      />

      <div id="mvp-wedge" className="space-y-2">
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
        <PencilCard title="What's In / Out" kicker="Scope">
          <NarrativeContent narrative={structured.scope} />
        </PencilCard>
      </div>

      <div id="mvp-core-features" className="space-y-2">
        <PencilCard title="Core Features" kicker="Feature Set">
          <NarrativeContent narrative={structured.featureSummary} />
        </PencilCard>
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

      <div id="mvp-user-flow" className="space-y-2">
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

      <div id="mvp-timeline" className="space-y-2">
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

      <div id="mvp-success-metrics" className="space-y-2">
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
