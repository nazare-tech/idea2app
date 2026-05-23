"use client"

import { useMemo } from "react"
import { AlertTriangle } from "lucide-react"

import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { getMvpPlanViewModel } from "@/lib/mvp-plan-document"
import { getPrdDocumentViewModel } from "@/lib/prd-document"
import type {
  PlanningDocumentSection,
  PlanningNarrativeTable,
} from "@/lib/planning-document-parser"
import { stripInlineMarkdown } from "@/lib/planning-document-parser"
import { cn } from "@/lib/utils"

interface PlanningDocumentProps {
  content: string
  projectId: string
}

const displayFontClass = "font-[family:var(--font-display)]"

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

function getRequirementGroups(narrative: PlanningNarrativeTable) {
  const groups = createRequirementGroups()

  if (narrative.table) {
    const headers = narrative.table.headers

    for (const row of narrative.table.rows) {
      const type = normalizeRequirementCategory(getTableCell(row, headers, ["type", "category"]))
      const id = getTableCell(row, headers, ["id", "#"])
      const requirement = getTableCell(row, headers, ["requirement", "feature", "name"])
      const notes = getTableCell(row, headers, ["acceptance", "notes", "priority", "rationale"])
      const fallback = row.filter(Boolean).join(" - ")

      groups.get(type)?.push({
        title: id || undefined,
        description: requirement || fallback,
        meta: notes ? [notes] : undefined,
      })
    }

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
                <article key={`${item.title ?? item.description}-${index}`} className="border-l-2 border-primary pl-3">
                  {item.title ? (
                    <p className="ui-type-body-sm font-semibold text-[#0A0A0A]">{item.title}</p>
                  ) : null}
                  <p className={cn("ui-type-body-sm text-[#4A4040]", item.title && "mt-1")}>
                    {item.description}
                  </p>
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

function parseAcceptanceCriteria(lines: string[]) {
  const criteria: string[] = []
  let inCriteria = false

  for (const line of lines) {
    const cleaned = cleanStoryText(line)
    if (!cleaned) continue

    const criteriaMatch = cleaned.match(/^Acceptance Criteria:\s*(.*)$/i)
    if (criteriaMatch) {
      inCriteria = true
      const inline = criteriaMatch[1]?.trim()
      if (inline) {
        criteria.push(
          ...inline
            .split(/\s+-\s+/)
            .map(cleanStoryText)
            .filter(Boolean),
        )
      }
      continue
    }

    if (inCriteria) {
      criteria.push(cleaned)
    }
  }

  return criteria
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
    const startsStory = /^(?:US[-\s]?\d+|As a\b)/i.test(cleaned)

    if (startsStory && current.length > 0) {
      chunks.push(current)
      current = [line]
      continue
    }

    current.push(line)
  }

  if (current.length > 0) chunks.push(current)

  return chunks
    .map((chunk, index) => {
      const storyLine =
        chunk.map(cleanStoryText).find((line) => /^(?:US[-\s]?\d+|As a\b)/i.test(line)) ?? ""

      if (!storyLine) return null

      const id = storyLine.match(/US[-\s]?\d+/i)?.[0]?.replace(/\s+/, "-").toUpperCase()
      const story = storyLine.replace(/^US[-\s]?\d+:\s*/i, "").trim()
      const actor = story.match(/^"?(As an? [^,]+)/i)?.[1] ?? `Story ${index + 1}`

      return {
        id: id ?? `US-${String(index + 1).padStart(3, "0")}`,
        title: actor.replace(/^As an?\s+/i, ""),
        story,
        criteria: parseAcceptanceCriteria(chunk),
      }
    })
    .filter((story): story is NonNullable<typeof story> => story !== null)
}

function UserStoriesContent({ narrative }: { narrative: PlanningNarrativeTable }) {
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
      <MarkdownRenderer content={section.content} projectId={projectId} />
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

export function PrdDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  const viewModel = useMemo(() => getPrdDocumentViewModel(content), [content])

  if (!viewModel.canRenderModules) {
    return (
      <div className="space-y-4">
        {viewModel.warning ? <Warning message={viewModel.warning} /> : null}
        <MarkdownRenderer content={content} projectId={projectId} />
      </div>
    )
  }

  const { structured } = viewModel

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
                  <MarkdownRenderer content={persona.content} projectId={projectId} />
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
        <MarkdownRenderer content={content} projectId={projectId} />
      </div>
    )
  }

  const { structured } = viewModel

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
