"use client"

import { useMemo } from "react"
import {
  ArrowUpRight,
  ArrowRight,
  BarChart3,
  CircleAlert,
  CircleCheck,
  Clock,
  Coins,
  Cpu,
  CreditCard,
  Database,
  HardDrive,
  History,
  KeyRound,
  Monitor,
  Rocket,
  Search,
  Server,
  Sparkles,
  Target,
  TriangleAlert,
  UserRound,
  UsersRound,
} from "lucide-react"

import {
  AI_PROMPT_FILE_PLACEHOLDERS,
  AiPromptFileGrid,
  InlineMarkdown,
  buildAiPromptFiles,
} from "@/components/analysis/ai-prompt-files"
import type { PlanningDocumentSection } from "@/lib/planning-document-parser"
import {
  extractSectionsByHeading,
  parseNarrativeTable,
  stripInlineMarkdown,
} from "@/lib/planning-document-parser"
import { cn } from "@/lib/utils"
import { getAiPromptsReadiness } from "@/lib/ai-prompts-readiness"
import {
  DataTable,
  PlanningMarkdownRenderer,
  StructuredItemList,
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
const fvpTotalSections = 12

function getFirstParagraph(section?: PlanningDocumentSection) {
  if (!section?.content.trim()) return ""
  const narrative = parseNarrativeTable(section.content)
  return narrative.paragraphs[0] || narrative.items[0] || ""
}

function FvpMasthead() {
  return (
    <header className="pb-10 pt-10">
      <h1 className={cn(displayFontClass, "text-[36px] font-bold leading-[1.12] tracking-[-0.05em] text-[#1C1917] md:text-[44px] md:leading-[66px]")}>
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

function FvpSection({
  id,
  title,
  index,
  total = fvpTotalSections,
  children,
}: {
  id?: string
  kicker: string
  title: string
  index: number
  total?: number
  children: React.ReactNode
}) {
  return (
    <section id={id} className="pt-0">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <div>
          <h2 className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#1C1917]")}>
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

function FvpSummary({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null
  const narrative = parseNarrativeTable(section.content)

  return (
    <div className="space-y-4">
      {narrative.paragraphs.map((paragraph, index) => (
        <p key={`${paragraph}-${index}`} className="text-[16px] leading-[1.65] text-[#4A4040]">
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
    // Cells carry their own top/left hairlines (offset by -1px) so empty space
    // in a partial last row stays white instead of showing a container background.
    <div className="pp-nongoals grid border border-[#EAE0D8] bg-white md:grid-cols-2">
      {visibleRows.map((row, index) => (
        <article key={`${row.title}-${index}`} className="pp-ng -ml-px -mt-px flex items-start gap-4 border-l border-t border-[#EAE0D8] bg-white px-5 py-5">
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
        <div className="fvp-stack grid border border-[#EAE0D8] bg-white sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, index) => {
            const Icon = stackIcons[index % stackIcons.length]
            return (
              <article key={`${row.title}-${index}`} className="fvp-sc -ml-px -mt-px border-l border-t border-[#EAE0D8] bg-white px-5 py-5">
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

function FvpValidation({ section }: { section?: PlanningDocumentSection }) {
  if (!section?.content.trim()) return null
  const nested = extractSectionsByHeading(section.content, 3)
  const audience = getSectionByAlias(nested, ["First Test Audience", "First test audience"])
  const findUsers = getSectionByAlias(nested, ["How to find them", "Recruiting"])
  const metrics = getSectionByAlias(nested, ["Suggested Metrics", "Metrics", "Success Metrics"])
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
      {metrics ? (
        <FvpMetricGrid section={metrics} />
      ) : fallback.items.length > 0 ? (
        <FvpMetricGrid section={{ heading: "Suggested Metrics", content: fallback.items.map((item) => `- ${item}`).join("\n") }} />
      ) : null}
      {questions ? (
        <div>
          <h3 className="pp-subhead mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
            <span className="dot h-1.5 w-1.5 rounded-full bg-primary" />
            Key feedback questions
          </h3>
          <div className="pp-req border border-[#EAE0D8] bg-white px-6 py-6">
            <ol className="pp-req-list flex flex-col gap-0 [counter-reset:r]">
              {parseNarrativeTable(questions.content).items.map((item, index) => (
                <li key={`${item}-${index}`} className="border-t border-[#EAE0D8] py-3 text-[13.5px] leading-[1.5] text-[#4A4040] first:border-t-0">
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </div>
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

function FvpMetricGrid({ section }: { section: PlanningDocumentSection }) {
  const items = parseNarrativeTable(section.content).items
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="pp-subhead mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4A4040]">
        <span className="dot h-1.5 w-1.5 rounded-full bg-primary" />
        Suggested metrics
      </h3>
      <div className="pp-stat-grid grid border border-[#EAE0D8] bg-white sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item, index) => {
          const value = getStatValue(item, index)
          const desc = stripMarkdownMarker(item).replace(value, "").replace(/^[:\s-]+/, "")
          return (
            <article key={`${item}-${index}`} className="pp-stat -ml-px -mt-px flex flex-col gap-2.5 border-l border-t border-[#EAE0D8] bg-white px-6 py-6">
              <div className={cn(displayFontClass, "num text-[40px] font-extrabold leading-none tracking-[-0.05em] text-[#1C1917]")}>
                {value}
              </div>
              <div className="desc text-[14px] leading-[1.45] text-[#4A4040]">{desc || item}</div>
              <div className="win mt-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A8480]">Signal</div>
            </article>
          )
        })}
      </div>
    </div>
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
  bolt: "https://bolt.new",
  "claude code": "https://www.anthropic.com/claude-code",
  cline: "https://cline.bot",
  codex: "https://openai.com/codex",
  cursor: "https://cursor.com",
  devin: "https://devin.ai",
  "gemini code assist": "https://codeassist.google",
  "github copilot": "https://github.com/features/copilot",
  lovable: "https://lovable.dev",
  replit: "https://replit.com",
  v0: "https://v0.dev",
  warp: "https://www.warp.dev",
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

  // Keep the raw markdown in field values so the card can render bold text,
  // inline code, and links instead of showing stripped plain text.
  // Generated documents write the colon either inside the bold marker
  // ("**Why this tool:**") or outside it ("**Why this tool**:"), so accept both.
  const field = (label: string) => {
    const pattern = new RegExp(`^-\\s*\\*\\*${label}\\s*:?\\*\\*\\s*:?\\s*(.+)$`, "im")
    return (section.content.match(pattern)?.[1] ?? "").trim()
  }

  const why = field("Why this tool")
  const bestFit = field("Best fit for this project")
  const cost = field("Expected starting cost")
  const watchOut = field("Watch out")
  const handoff = field("Handoff instruction")

  if (!name || !why) {
    // Drop the "### Tool Name" heading line so the fallback text does not
    // repeat the card title as raw markdown.
    const fallback = stripHorizontalRulesFromMarkdown(
      section.content.replace(/^###\s+.+$/m, ""),
    ).trim()
    return fallback
      ? {
          name: name || "Recommended tool",
          url,
          why: fallback,
          bestFit: "",
          cost: "",
          watchOut: "",
          handoff: "",
        }
      : null
  }

  return { name, url, why, bestFit, cost, watchOut, handoff }
}

function AiPromptRecommendedToolCard({ section }: { section?: PlanningDocumentSection }) {
  const recommendation = getRecommendedTool(section)

  if (!recommendation) return null

  const details = [
    { label: "Best Fit For This Project", value: recommendation.bestFit },
    { label: "Expected Starting Cost", value: recommendation.cost },
    { label: "Watch Out", value: recommendation.watchOut },
    { label: "Handoff", value: recommendation.handoff },
  ].filter((detail) => detail.value)

  const title = (
    <span className={cn(displayFontClass, "text-[26px] font-bold leading-tight tracking-[-0.03em] text-[#0A0A0A]")}>
      {recommendation.name}
    </span>
  )

  return (
    <div className="border border-[#E8DDD5] bg-white px-6 py-6">
      {recommendation.url ? (
        <a
          href={recommendation.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-start gap-1.5 transition-opacity hover:opacity-80"
        >
          {title}
          <ArrowUpRight className="mt-1.5 h-4 w-4 shrink-0 text-[#0A0A0A]" />
        </a>
      ) : title}

      {recommendation.why ? (
        <p className="mt-3 max-w-[70ch] text-[15px] leading-[1.65] text-[#4A4040]">
          <InlineMarkdown value={recommendation.why} />
        </p>
      ) : null}

      {details.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="border-t border-[#E8DDD5] pt-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8480]">
                {detail.label}
              </p>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-[#4A4040]">
                <InlineMarkdown value={detail.value} />
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function AiPromptsMasthead() {
  return (
    <header className="pb-10">
      <h1
        className={cn(
          displayFontClass,
          "text-[36px] font-bold leading-[1.12] tracking-[-0.05em] text-[#0A0A0A] md:text-[44px] md:leading-[66px]",
        )}
      >
        AI Prompts
      </h1>
      <p className="mt-1 max-w-3xl text-[16px] leading-[25.6px] text-[#666666]">
        Your recommended build tool plus ready-to-use prompt files for your AI coding tool.
      </p>
    </header>
  )
}

const promptFileUsageSteps = [
  "Download all the files below into a new, empty folder. That folder becomes your project.",
  "Open your recommended AI build tool (above) in that folder.",
  "Rename project-context.md to CLAUDE.md (Claude Code), AGENTS.md (Codex), or your tool's rules file. In browser builders such as Lovable or v0, paste it into the project's instructions or knowledge.",
  "Paste the contents of first-prompt.md as your first message to start the build.",
  "Work through build-steps.md one chunk at a time; share the other files when your tool needs requirements or acceptance criteria.",
]

/** Short numbered guide so users know what to do with the downloaded files. */
function PromptFileUsageGuide() {
  return (
    <div className="mb-6 border border-[#E8DDD5] bg-[#FAFAFA] px-5 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4A4040]">
        How to use these files
      </p>
      <ol className="mt-3 space-y-2">
        {promptFileUsageSteps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="w-6 shrink-0 pt-0.5 font-mono text-[11px] font-medium text-[#8A8480]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-[13.5px] leading-[1.55] text-[#4A4040]">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AiPromptsSection({
  id,
  title,
  index,
  total,
  children,
}: {
  id?: string
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

export function AiPromptsDocumentBlocks({
  prdContent,
  mvpContent,
  projectId,
  prdSettled = Boolean(prdContent),
  mvpSettled = Boolean(mvpContent),
}: {
  prdContent: string | null
  mvpContent: string | null
  projectId: string
  prdSettled?: boolean
  mvpSettled?: boolean
}) {
  const prdSections = useMemo(() => extractSectionsByHeading(prdContent ?? "", 2), [prdContent])
  const mvpSections = useMemo(() => extractSectionsByHeading(mvpContent ?? "", 2), [mvpContent])

  const recommendedTool = getSectionByAlias(mvpSections, ["Recommended AI Build Tool", "AI Build Tool", "Recommended Build Tool"])
  const promptFiles = useMemo(
    () => buildAiPromptFiles({ prdSections, mvpSections }),
    [prdSections, mvpSections],
  )

  const hasRecommendedTool = Boolean(recommendedTool?.content.trim())
  const readiness = useMemo(
    () => getAiPromptsReadiness({ prdContent, mvpContent, prdSettled, mvpSettled }),
    [mvpContent, mvpSettled, prdContent, prdSettled],
  )

  // While either source plan is still being written, every expected file
  // renders as a non-interactive queued placeholder so the full set of
  // upcoming files is visible from the start. Once both sources settle,
  // missing files are terminal and get the incomplete notice instead.
  const showQueuedPlaceholders = !prdSettled || !mvpSettled
  const pendingFiles = showQueuedPlaceholders
    ? AI_PROMPT_FILE_PLACEHOLDERS.filter(
        (placeholder) => !promptFiles.some((file) => file.fileName === placeholder.fileName),
      )
    : []

  if (readiness.status === "waiting" && !showQueuedPlaceholders) {
    return (
      <div className="flex items-center justify-center p-6 text-center text-sm text-muted-foreground sm:p-12">
        AI Prompts has not been generated yet.
      </div>
    )
  }

  const showToolSection = hasRecommendedTool || showQueuedPlaceholders
  const showFilesSection = promptFiles.length > 0 || pendingFiles.length > 0
  const sectionTotal = (showToolSection ? 1 : 0) + (showFilesSection ? 1 : 0)
  let sectionIndex = 1
  const nextSectionIndex = () => sectionIndex++

  return (
    <div className="flex flex-col gap-16">
      <AiPromptsMasthead />

      {readiness.status === "incomplete" ? (
        <div className="border border-[#E8DDD5] bg-[#FAFAFA] px-5 py-4" role="status">
          <p className="text-[14px] font-semibold text-[#1C1917]">Some AI Prompts files are unavailable</p>
          <p className="mt-1 text-[13px] leading-5 text-[#4A4040]">
            The generated plans did not include every required handoff section. Available files remain usable.
          </p>
        </div>
      ) : null}

      {showToolSection ? (
        <AiPromptsSection
          id="ai-prompts-recommended-build-tool"
          title="Recommended AI Build Tool"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          {hasRecommendedTool ? (
            <AiPromptRecommendedToolCard section={recommendedTool} />
          ) : (
            <div className="border border-dashed border-[#E8DDD5] bg-[#FAFAFA] px-6 py-6">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A8480]">
                Queued
              </span>
              <div className="mt-4 space-y-3" aria-hidden="true">
                <div className="h-3 w-[70%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
                <div className="h-3 w-[52%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
              </div>
            </div>
          )}
        </AiPromptsSection>
      ) : null}

      {showFilesSection ? (
        <AiPromptsSection
          id="ai-prompts-files"
          title="Prompt Files"
          index={nextSectionIndex()}
          total={sectionTotal}
        >
          <p className="mb-6 max-w-3xl text-[14px] leading-[1.6] text-[#4A4040]">
            Each file is ready to copy or download into your AI build tool. Click a card to
            preview the full markdown.
          </p>
          <PromptFileUsageGuide />
          <AiPromptFileGrid files={promptFiles} pendingFiles={pendingFiles} projectId={projectId} />
        </AiPromptsSection>
      ) : null}
    </div>
  )
}

/**
 * Displayed First Version Plan sections in contract order, with the H2
 * aliases that source each one. The streaming renderer uses this to show
 * titled skeletons for sections that have not arrived yet; keep it in sync
 * with CurrentMvpPlanDocumentBlocks below.
 */
export const MVP_STREAMING_EXPECTED_SECTIONS: ReadonlyArray<{
  title: string
  aliases: string[]
}> = [
  { title: "MVP Summary", aliases: ["MVP Summary"] },
  {
    title: "Key Risks & Assumptions",
    aliases: ["Key Risks, Assumptions, and Scope Decisions", "Key Assumptions and Scope Decisions"],
  },
  { title: "Target User & Problem", aliases: ["Target User and Problem"] },
  { title: "The Bet", aliases: ["MVP Goal, Definition of Done, and Riskiest Assumptions"] },
  { title: "Core User Flows", aliases: ["Core User Flows", "Core User Flow"] },
  { title: "Suggested Build Approach", aliases: ["Suggested Build Approach"] },
  { title: "Validation Plan", aliases: ["Validation Plan"] },
]

/**
 * Current-format renderer, exported so the streaming preview can render
 * partial documents through the exact same designed blocks without the
 * legacy-format gate (early streams have too few sections to pass it).
 */
export function CurrentMvpPlanDocumentBlocks({ content }: PlanningDocumentProps) {
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
    assumptionRows.length > 0,
    targetProblem,
    goal,
    coreFlowRows.length > 0 || userFlow,
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

      {assumptionRows.length > 0 ? (
        <FvpSection id="mvp-key-assumptions" kicker="Risks" title="Key Risks & Assumptions" index={nextSectionIndex()} total={sectionTotal}>
          <FvpScopeGrid rows={assumptionRows} />
        </FvpSection>
      ) : null}

      {targetProblem ? (
        <FvpSection id="mvp-target-user-problem" kicker="Audience" title="Target User & Problem" index={nextSectionIndex()} total={sectionTotal}>
          <FvpTechGrid section={targetProblem} fallbackTitle="Target user" />
        </FvpSection>
      ) : null}

      {goal ? (
        <FvpSection id="mvp-bet" kicker="Validation" title="The Bet" index={nextSectionIndex()} total={sectionTotal}>
          <FvpTechGrid section={goal} fallbackTitle="Goal" />
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

export function MvpPlanDocumentBlocks({ content, projectId }: PlanningDocumentProps) {
  if (isCurrentPromptDocument(content, currentMvpSectionAliases)) {
    return <CurrentMvpPlanDocumentBlocks content={content} projectId={projectId} />
  }

  // Legacy or unstructured First Version Plans render as plain markdown.
  return (
    <div className="space-y-4">
      <Warning message="This First Version Plan uses an older format, so the designed block view is unavailable. Showing the original document." />
      <PlanningMarkdownRenderer content={content} projectId={projectId} />
    </div>
  )
}
