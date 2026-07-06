"use client"

import React from "react"
import { AlertTriangle } from "lucide-react"

import { ExplainTermButton } from "@/components/analysis/explainable-term"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { getExplainableTermKeyByLabel } from "@/lib/explainable-terms"
import type {
  PlanningDocumentSection,
  PlanningNarrativeTable,
} from "@/lib/planning-document-parser"
import {
  extractSectionsByHeading,
  normalizeHeading,
  stripInlineMarkdown,
} from "@/lib/planning-document-parser"
import { cn } from "@/lib/utils"

export interface PlanningDocumentProps {
  content: string
  projectId: string
}

export const displayFontClass = "font-[family:var(--font-display)]"

export function stripHorizontalRulesFromMarkdown(content: string) {
  return content
    .split("\n")
    .filter((line) => !/^\s*-{3,}\s*$/.test(line))
    .join("\n")
    .trim()
}

export function PlanningMarkdownRenderer({
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

export function PencilCard({
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
  const termKey = getExplainableTermKeyByLabel(title)

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
        <div className="flex items-center gap-2">
          <h2
            className={cn(
              displayFontClass,
              "text-[22px] font-bold tracking-[-0.03em]",
              dark ? "text-[#1C1917]" : "text-[#0A0A0A]",
            )}
          >
            {title}
          </h2>
          <ExplainTermButton termKey={termKey} label={title} />
        </div>
      </div>
      <div className="pb-6">{children}</div>
    </section>
  )
}

export function PageHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <header className="-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      <div>
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

export function ParagraphStack({
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

export function splitLabeledText(value: string) {
  const cleaned = value.replace(/^>\s*/, "").trim()
  const match = cleaned.match(/^([^:]{2,96}):\s*(.*)$/)
  if (!match) return null

  return {
    label: match[1].trim(),
    body: match[2].trim().replace(/^>\s*/, ""),
  }
}

export function buildItemGroups(items: string[]) {
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

export function InlineLabeledText({
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

export function StructuredItemList({ items, dark = false }: { items: string[]; dark?: boolean }) {
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

export function DataTable({
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

export function NarrativeContent({
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

export function hasNarrativeContent(narrative: PlanningNarrativeTable) {
  return (
    narrative.paragraphs.length > 0 ||
    narrative.items.length > 0 ||
    Boolean(narrative.table)
  )
}

export function getTableCell(row: string[], headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase())
  const index = headers.findIndex((header) =>
    normalizedAliases.some((alias) => header.toLowerCase().includes(alias)),
  )

  return index >= 0 ? row[index] ?? "" : ""
}
export function MarkdownSectionCard({
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

export function Warning({ message }: { message: string }) {
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

export const currentPrdSectionAliases = [
  "Introduction/overview",
  "Goals",
  "User personas",
  "User stories and acceptance criteria",
  "Functional requirements",
  "Technical considerations",
  "Non-goals / out of scope",
]

export const currentMvpSectionAliases = [
  "MVP Summary",
  "Key Assumptions and Scope Decisions",
  "Target User and Problem",
  "MVP Goal, Definition of Done, and Riskiest Assumptions",
  "Core User Flow",
  "MVP Scope",
  "Must-Have Features",
  "Validation Plan",
]

export function countRecognizedSections(sections: PlanningDocumentSection[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeading)

  return sections.filter((section) => {
    const heading = normalizeHeading(section.heading)
    return normalizedAliases.some((alias) => heading === alias)
  }).length
}

export function getSectionByAlias(sections: PlanningDocumentSection[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeading)

  return sections.find((section) => {
    const heading = normalizeHeading(section.heading)
    return normalizedAliases.some((alias) => heading === alias)
  })
}

export function isCurrentPromptDocument(content: string, aliases: string[]) {
  return countRecognizedSections(extractSectionsByHeading(content, 2), aliases) >= 3
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

export function getStatValue(item: string, index: number) {
  const cleaned = stripInlineMarkdown(item)
  const metric = cleaned.match(/(?:^|\s)(\$?\d[\d,.]*%?|\d+\+|[A-Z]?\d+\s*(?:seconds?|minutes?|days?|weeks?|months?))/)?.[1]

  return metric ?? String(index + 1).padStart(2, "0")
}
