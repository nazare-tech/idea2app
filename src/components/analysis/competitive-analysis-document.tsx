"use client"

import { useMemo } from "react"
import { AlertTriangle, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ExplainTermButton } from "@/components/analysis/explainable-term"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import {
  DataTable,
  ParagraphStack,
  PencilCard,
  displayFontClass,
} from "@/components/analysis/planning-blocks-shared"
import {
  extractSectionsByHeading,
  findSectionByAliases,
  type PlanningDocumentSection,
} from "@/lib/planning-document-parser"
import {
  type CompetitiveAnalysisCompetitorProfile,
  type CompetitiveAnalysisPositioningPoint,
  type CompetitiveAnalysisStructuredData,
  type CompetitiveAnalysisV2SectionName,
  getCompetitiveAnalysisViewModel,
  parsePositioningAxis,
  sanitizeCompetitiveAnalysisDisplayMarkdown,
  sanitizeDirectCompetitorDisplayContent,
} from "@/lib/competitive-analysis-v2"
import { getExplainableTermKeyByLabel } from "@/lib/explainable-terms"
import {
  CompetitorMentionLinksProvider,
  CompetitorMentionText,
  competitorLinkClassName,
} from "@/components/analysis/competitor-mention-links"

interface CompetitiveAnalysisDocumentProps {
  content: string
  metadata?: Record<string, unknown> | null
  currentVersion?: number
  projectId: string
  /** AI-generated project name, surfaced as the proposed name in the Executive Summary */
  projectName?: string
}

function renderCompetitorMentionText(value: string) {
  return <CompetitorMentionText text={value} />
}

function ProposedNameCard({ projectName }: { projectName?: string }) {
  const name = projectName?.trim()
  if (!name || name === "Untitled") return null

  return (
    <div className="border border-[#E8DDD5] bg-white px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8480]">
        Proposed Name
      </p>
      <p
        className={cn(
          displayFontClass,
          "mt-1 text-[22px] font-bold tracking-[-0.03em] text-[#0A0A0A]"
        )}
      >
        {name}
      </p>
    </div>
  )
}

export function TopLevelDocumentHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <header className="pb-5">
      <h1
        className={cn(
          displayFontClass,
          "text-[36px] font-bold leading-[1.12] tracking-[-0.05em] text-[#0A0A0A] md:text-[44px] md:leading-[66px]"
        )}
      >
        {title}
      </h1>
      <p className="mt-1 max-w-3xl text-[16px] leading-[25.6px] text-[#666666]">
        {description}
      </p>
    </header>
  )
}

const fastComparisonColumns = [
  { label: "Competitor", className: "min-w-[170px] max-w-[310px]" },
  { label: "Profile", className: "min-w-[260px] max-w-[310px]" },
  { label: "Commercial Fit", className: "min-w-[220px] max-w-[310px]" },
  { label: "Advantage / Risk", className: "min-w-[260px] max-w-[310px]" },
] as const

const fallbackMarketResearchSections = [
  { id: "market-research-direct-competitors", title: "Direct Competitors", headings: ["Direct Competitors"] },
  { id: "market-research-landscape-overview", title: "Market Landscape", headings: ["Competitive Landscape Overview", "Market Landscape"] },
  { id: "market-research-feature-matrix", title: "Feature Comparison", headings: ["Feature Comparison"] },
  { id: "market-research-positioning", title: "Positioning Map", headings: ["Positioning Map"] },
  { id: "market-research-pricing", title: "Pricing Comparison", headings: ["Pricing Comparison"] },
  { id: "market-research-audience", title: "Best Customer Segments", headings: ["Best Customer Segments"] },
  { id: "market-research-gtm", title: "How You'll Reach Customers", headings: ["How You'll Reach Customers"] },
  { id: "market-research-gap-analysis", title: "Gap Analysis", headings: ["Gap Analysis"] },
  { id: "market-research-differentiation", title: "Ways to Stand Out", headings: ["Ways to Stand Out"] },
  { id: "market-research-moat", title: "What Makes It Hard to Copy", headings: ["What Makes It Hard to Copy"] },
  { id: "market-research-mvp-wedge", title: "First Version Focus", headings: ["First Version Focus"] },
  { id: "market-research-strategic-recommendations", title: "Recommended Next Moves", headings: ["Recommended Next Moves"] },
] as const

function getFallbackSectionContent(
  sections: PlanningDocumentSection[],
  headings: readonly string[]
) {
  return findSectionByAliases(sections, [...headings])?.content ?? ""
}

function CompetitiveOverviewFallback({
  content,
  projectId,
}: {
  content: string
  projectId: string
}) {
  const sections = extractSectionsByHeading(content, 2)
  const summary = getFallbackSectionContent(sections, ["Executive Summary"])
  const verdict = getFallbackSectionContent(sections, ["Opportunity Verdict"])
  const fallbackContent = [summary, verdict].filter(Boolean).join("\n\n")

  return (
    <section id="executive-summary" className="flex flex-col gap-y-3 gap-x-0">
      <TopLevelDocumentHeader
        title="Executive Summary"
        description="Market snapshot, entry assessment, and key risk."
      />

      <MarkdownRenderer content={fallbackContent || content} projectId={projectId} />
    </section>
  )
}

function CompetitiveDetailFallback({
  content,
  projectId,
}: {
  content: string
  projectId: string
}) {
  const sections = extractSectionsByHeading(content, 2)
  const fallbackSections = fallbackMarketResearchSections
    .map((section) => ({
      ...section,
      content:
        section.id === "market-research-direct-competitors"
          ? sanitizeDirectCompetitorDisplayContent(
              getFallbackSectionContent(sections, section.headings)
            )
          : getFallbackSectionContent(sections, section.headings),
    }))
    .filter((section) => section.content.trim().length > 0)

  if (fallbackSections.length === 0) return null

  return (
    <section className="flex flex-col gap-y-3 gap-x-0">
      <TopLevelDocumentHeader
        title="Market Research"
        description="Competitive landscape, customer segments, positioning, and recommended next moves."
      />

      {fallbackSections.map((section, index) => (
        <WorkspaceDesignedSection
          key={section.id}
          id={section.id}
          kicker="Deep Analysis"
          title={section.title}
          index={index + 1}
          total={fallbackSections.length}
        >
          <MarkdownRenderer content={section.content} projectId={projectId} />
        </WorkspaceDesignedSection>
      ))}
    </section>
  )
}

function WorkspaceSectionHeader({
  title,
  index,
  total,
}: {
  title: string
  index: number
  total: number
}) {
  const termKey = getExplainableTermKeyByLabel(title)

  return (
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
  )
}

export function WorkspaceDesignedSection({
  id,
  title,
  index,
  total,
  children,
}: {
  id: string
  kicker: string
  title: string
  index: number
  total: number
  children: React.ReactNode
}) {
  return (
    <section id={id} className="pt-0">
      <WorkspaceSectionHeader
        title={title}
        index={index}
        total={total}
      />
      {children}
    </section>
  )
}

function NumberedList({
  items,
  dark = false,
}: {
  items: string[]
  dark?: boolean
}) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3">
          <span
            className={cn(
              "w-7 shrink-0 pt-0.5 font-mono text-[11px] font-medium",
              dark ? "text-[#8A8480]" : "text-[#999999]"
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <p
            className={cn(
              "ui-type-body-sm",
              dark ? "text-[#1C1917]" : "text-[#0A0A0A]"
            )}
          >
            <CompetitorMentionText text={item} />
          </p>
        </li>
      ))}
    </ol>
  )
}

function MarketSignalStrip({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <div className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-2">
      {items.slice(0, 3).map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
            Signal {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 ui-type-body-sm text-[#0A0A0A]">
            <CompetitorMentionText text={item} />
          </p>
        </div>
      ))}
    </div>
  )
}

function ExecutiveSummaryCard({
  summary,
  showHeader = true,
}: {
  summary: CompetitiveAnalysisStructuredData["executiveSummary"]
  showHeader?: boolean
}) {
  const bullets = summary.bullets.map(formatExecutiveSummaryBullet)

  return (
    <PencilCard
      title="Market Snapshot & Entry Thesis"
      kicker="Executive Summary"
      showHeader={showHeader}
    >
      <ParagraphStack
        paragraphs={summary.paragraphs}
        className="space-y-3"
        leadFirst
        renderText={renderCompetitorMentionText}
      />
      {bullets.length > 0 ? (
        <div className="pt-5">
          <NumberedList items={bullets} />
        </div>
      ) : null}
    </PencilCard>
  )
}

function formatExecutiveSummaryBullet(item: string) {
  return item.replace(/^Verdict:/i, "Assessment:")
}

function SnapshotHero({
  structured,
}: {
  structured: CompetitiveAnalysisStructuredData
}) {
  const bullets = structured.executiveSummary.bullets.map(formatExecutiveSummaryBullet)

  return (
    <div className="space-y-6">
      <PencilCard title="Market Snapshot & Entry Thesis" kicker="Category Snapshot">
        <ParagraphStack
          paragraphs={structured.executiveSummary.paragraphs}
          className="space-y-3"
          renderText={renderCompetitorMentionText}
        />
        {bullets.length > 0 ? (
          <div className="pt-5">
            <NumberedList items={bullets} />
          </div>
        ) : null}
        <MarketSignalStrip items={structured.competitiveLandscapeOverview} />
      </PencilCard>
    </div>
  )
}

function CompetitorTableDetail({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value?: string
  emphasis?: boolean
}) {
  if (!value) return null

  return (
    <div className="space-y-1">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8480]">
        {label}
      </p>
      <p
        className={cn(
          "ui-type-table",
          emphasis ? "font-medium text-[#1C1917]" : "text-[#4A4040]"
        )}
      >
        <CompetitorMentionText text={value} />
      </p>
    </div>
  )
}

function getCompetitorKeyEdge(competitor: CompetitiveAnalysisCompetitorProfile) {
  return (
    competitor.fields["Key Edge"] ??
    competitor.fields["Strengths"] ??
    competitor.fields["Core Product/Service"] ??
    ""
  )
}

function FastComparisonTable({
  competitors,
}: {
  competitors: CompetitiveAnalysisCompetitorProfile[]
}) {
  if (competitors.length === 0) {
    return (
      <div className="border border-dashed border-[#D8CEC5] bg-[#FAFAFA] px-5 py-5">
        <p
          className={cn(
            displayFontClass,
            "text-[15px] font-semibold text-[#0A0A0A]"
          )}
        >
          Competitor profiles not found
        </p>
        <p className="mt-2 max-w-3xl ui-type-body text-[#666666]">
          This report does not include enough competitor profile detail to
          build the comparison table.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-[clamp(960px,100%,1240px)] table-fixed border-collapse border border-[#E0E0E0]">
        <thead>
          <tr className="bg-[#F5F0EB]">
            {fastComparisonColumns.map(
              (column) => (
                <th
                  key={column.label}
                  className={cn(
                    "border border-[#D8CEC5] px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#4A4040]",
                    column.className
                  )}
                >
                  {column.label}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {competitors.map((competitor, index) => (
            <tr
              key={`${competitor.heading}-comparison`}
              className={index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}
            >
              <td className={cn("border border-[#E0E0E0] px-4 py-4 align-top", fastComparisonColumns[0].className)}>
                {/* Fall back to a web search when the document has no verified URL, so every competitor stays reachable without fabricating an official link. */}
                <a
                  href={
                    competitor.websiteUrl ??
                    `https://www.google.com/search?q=${encodeURIComponent(competitor.heading)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    competitorLinkClassName,
                    "inline-flex items-start gap-1.5"
                  )}
                >
                  <span
                    className={cn(
                      displayFontClass,
                      "text-[14px] font-semibold leading-5 text-[#0A0A0A]"
                    )}
                  >
                    {competitor.heading}
                  </span>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A0A0A]" />
                </a>
              </td>
              <td className={cn("space-y-3 border border-[#E0E0E0] px-4 py-4 align-top", fastComparisonColumns[1].className)}>
                <CompetitorTableDetail
                  label="Overview"
                  value={competitor.fields["Overview"]}
                />
                <CompetitorTableDetail
                  label="Core"
                  value={competitor.fields["Core Product/Service"]}
                />
                <CompetitorTableDetail
                  label="Positioning"
                  value={competitor.fields["Market Positioning"]}
                />
              </td>
              <td className={cn("space-y-3 border border-[#E0E0E0] px-4 py-4 align-top", fastComparisonColumns[2].className)}>
                <CompetitorTableDetail
                  label="Pricing"
                  value={competitor.fields["Pricing Model"] ?? "Unknown"}
                />
                <CompetitorTableDetail
                  label="Audience"
                  value={competitor.fields["Target Audience"] ?? "Unknown"}
                />
              </td>
              <td className={cn("space-y-3 border border-[#E0E0E0] px-4 py-4 align-top", fastComparisonColumns[3].className)}>
                <CompetitorTableDetail
                  label="Key Edge"
                  value={getCompetitorKeyEdge(competitor)}
                  emphasis
                />
                <CompetitorTableDetail
                  label="Strengths"
                  value={competitor.fields["Strengths"]}
                />
                <CompetitorTableDetail
                  label="Limitations"
                  value={competitor.fields["Limitations"]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompetitorProfiles({
  competitors,
  showHeader = true,
}: {
  competitors: CompetitiveAnalysisCompetitorProfile[]
  showHeader?: boolean
}) {
  return (
    <div className="space-y-6">
      <PencilCard
        title="Competitor Profiles & Quick Comparison"
        kicker="Competitive Intelligence"
        showHeader={showHeader}
      >
        <p className="mb-5 ui-type-body text-[#666666]">
          {competitors.length > 0
            ? "Compare each competitor once across product scope, buying fit, strengths, edges, and limitations."
            : "This report does not include direct competitor profiles."}
        </p>
        <FastComparisonTable competitors={competitors} />
      </PencilCard>
    </div>
  )
}

function CompactTableCard({
  title,
  kicker,
  paragraphs,
  headers,
  rows,
  showHeader = true,
}: {
  title: string
  kicker?: string
  paragraphs: string[]
  headers: string[]
  rows: string[][]
  showHeader?: boolean
}) {
  return (
    <PencilCard title={title} kicker={kicker} showHeader={showHeader}>
      <ParagraphStack
        paragraphs={paragraphs}
        className="space-y-3"
        renderText={renderCompetitorMentionText}
      />
      <div className={paragraphs.length > 0 ? "pt-5" : ""}>
        <DataTable
          headers={headers}
          rows={rows}
          renderText={renderCompetitorMentionText}
        />
      </div>
    </PencilCard>
  )
}

const POSITIONING_SCORE_MAX = 10

function hasPositioningScores(
  point: CompetitiveAnalysisPositioningPoint
): point is CompetitiveAnalysisPositioningPoint & { x: number; y: number } {
  return point.x !== null && point.y !== null
}

/**
 * Turn an axis description into a short bar label. The full 0/10 endpoint
 * legend renders once at the top of the Positioning Map, so bars only show
 * the dimension name (or "Low \u2192 High" when the axis has no name).
 */
function positioningBarLabel(axis: string | null, fallback: string) {
  const parsed = parsePositioningAxis(axis)
  if (!parsed) return fallback

  const isFullAxisText = parsed.name === axis?.trim()
  if (isFullAxisText && parsed.lowLabel && parsed.highLabel) {
    return `${parsed.lowLabel} \u2192 ${parsed.highLabel}`
  }

  return parsed.name || fallback
}

/**
 * One-time score legend shown above the competitor rows so each bar does not
 * repeat the "0 = ..., 10 = ..." endpoint definitions.
 */
function PositioningLegend({
  xAxis,
  yAxis,
}: {
  xAxis: string | null
  yAxis: string | null
}) {
  const axes = [parsePositioningAxis(xAxis), parsePositioningAxis(yAxis)].filter(
    (axis): axis is NonNullable<typeof axis> =>
      Boolean(axis && axis.lowLabel && axis.highLabel)
  )

  if (axes.length === 0) return null

  return (
    <div className="border border-[#EAE0D8] bg-[#FAFAFA] px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#777777]">
        How to read the scores
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {axes.map((axis) => (
          <div key={axis.name}>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4A4040]">
              <CompetitorMentionText text={axis.name} />
            </p>
            <p className="mt-1 ui-type-caption text-[#777777]">
              0 = <CompetitorMentionText text={axis.lowLabel ?? ""} /> &middot; 10 ={" "}
              <CompetitorMentionText text={axis.highLabel ?? ""} />
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function isOwnProductPoint(point: CompetitiveAnalysisPositioningPoint) {
  return /your|our|concept|idea|product/i.test(point.competitor)
}

function PositioningScoreBar({
  label,
  score,
  accent,
}: {
  label: string
  score: number
  accent: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#777777]">
          <CompetitorMentionText text={label} />
        </p>
        <p className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-[#4A4040]">
          {score}/10
        </p>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full bg-[#EFE7E0]"
        role="img"
        aria-label={`${label}: ${score} out of 10`}
      >
        <div
          className={cn("h-full", accent ? "bg-primary" : "bg-[#4A4040]")}
          style={{ width: `${(score / POSITIONING_SCORE_MAX) * 100}%` }}
        />
      </div>
    </div>
  )
}

function PositioningMap({
  title,
  description,
  positioningMap,
  showHeader = true,
}: {
  title: string
  description?: string
  positioningMap: CompetitiveAnalysisStructuredData["positioningMap"]
  showHeader?: boolean
}) {
  const scoredPoints = positioningMap.points.filter(hasPositioningScores)
  const unscoredPoints = positioningMap.points.filter(
    (point) => !hasPositioningScores(point)
  )
  const xBarLabel = positioningBarLabel(positioningMap.xAxis, "Positioning score 1")
  const yBarLabel = positioningBarLabel(positioningMap.yAxis, "Positioning score 2")

  return (
    <PencilCard title={title} description={description} showHeader={showHeader}>
      <div className="space-y-4">
        <PositioningLegend
          xAxis={positioningMap.xAxis}
          yAxis={positioningMap.yAxis}
        />
        {scoredPoints.length > 0 ? (
          <div className="grid gap-px border border-[#EAE0D8] bg-[#EAE0D8]">
            {scoredPoints.map((point, index) => {
              const accent = isOwnProductPoint(point)
              const pointSummary = `${point.competitor}: X ${point.x}/10, Y ${point.y}/10. ${point.rationale}${point.evidence ? ` Evidence: ${point.evidence}` : ""}`

              return (
                <article
                  key={`${point.competitor}-${index}`}
                  data-positioning-state="scored"
                  data-positioning-point={point.competitor}
                  aria-label={pointSummary}
                  className="bg-white px-5 py-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p
                      className={cn(
                        displayFontClass,
                        "text-[15px] font-bold tracking-[-0.02em]",
                        accent ? "text-primary" : "text-[#1C1917]"
                      )}
                    >
                      <CompetitorMentionText text={point.competitor} />
                    </p>
                    {accent ? (
                      <span className="border border-primary/20 bg-primary/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                        Your product
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <PositioningScoreBar label={xBarLabel} score={point.x} accent={accent} />
                    <PositioningScoreBar label={yBarLabel} score={point.y} accent={accent} />
                  </div>

                  {point.rationale ? (
                    <p className="mt-4 ui-type-table text-[#0A0A0A]">
                      <CompetitorMentionText text={point.rationale} />
                    </p>
                  ) : null}
                  {point.evidence ? (
                    <p className="mt-2 ui-type-caption text-[#777777]">
                      <CompetitorMentionText text={point.evidence} />
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : null}

        {unscoredPoints.length > 0 ? (
          <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#777777]">
              Unscored placements
            </p>
            <div className="mt-3 space-y-2">
              {unscoredPoints.map((point) => (
                <div
                  key={`${point.competitor}-unscored`}
                  data-positioning-state="unscored"
                >
                  <p className="ui-type-table font-medium text-[#0A0A0A]">
                    <CompetitorMentionText text={point.competitor} />
                  </p>
                  <p className="ui-type-caption text-[#777777]">
                    <CompetitorMentionText
                      text={point.rationale || "Missing a valid 0-10 X or Y score."}
                    />
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PencilCard>
  )
}

function SmallListCard({
  title,
  kicker,
  items,
  dark = false,
  showHeader = true,
}: {
  title: string
  kicker?: string
  items: string[]
  dark?: boolean
  showHeader?: boolean
}) {
  return (
    <PencilCard title={title} kicker={kicker} dark={dark} showHeader={showHeader}>
      <NumberedList items={items} dark={dark} />
    </PencilCard>
  )
}

function MVPCard({
  paragraphs,
  bullets,
  showHeader = true,
}: {
  paragraphs: string[]
  bullets: string[]
  showHeader?: boolean
}) {
  return (
    <PencilCard title="First Version Focus" kicker="Build Scope" dark showHeader={showHeader}>
      <ParagraphStack
        paragraphs={paragraphs}
        className="space-y-3"
        dark={true}
        renderText={renderCompetitorMentionText}
      />
      <div className="pt-5">
        <NumberedList items={bullets} dark={true} />
      </div>
    </PencilCard>
  )
}

function CompetitiveResearchPage({
  structured,
}: {
  structured: CompetitiveAnalysisStructuredData
}) {
  return (
    <CompetitorMentionLinksProvider sources={structured.competitorSources}>
      <div className="space-y-6 bg-white p-6 md:p-8 xl:p-10">
      <TopLevelDocumentHeader
        title="Market Research"
        description="Competitive landscape, customer segments, positioning, and recommended next moves."
      />

      <SnapshotHero structured={structured} />

      <CompetitorProfiles
        competitors={structured.directCompetitors}
      />

      <CompactTableCard
        title="Feature Comparison"
        paragraphs={structured.featureMatrix.paragraphs}
        headers={structured.featureMatrix.table?.headers ?? []}
        rows={structured.featureMatrix.table?.rows ?? []}
      />

      <PositioningMap
        title="Positioning Map"
        description="Where you fit in the market."
        positioningMap={structured.positioningMap}
      />

      <CompactTableCard
        title="Pricing Comparison"
        paragraphs={structured.pricingAndPackaging.paragraphs}
        headers={structured.pricingAndPackaging.table?.headers ?? []}
        rows={structured.pricingAndPackaging.table?.rows ?? []}
      />

      <SmallListCard
        title="Best Customer Segments"
        items={structured.audienceSegments}
      />

      <SmallListCard
        title="How You'll Reach Customers"
        items={structured.gtmSignals}
        dark={true}
      />

      <SmallListCard title="Gap Analysis" items={structured.gapAnalysis} />

      <SmallListCard
        title="Ways to Stand Out"
        items={structured.differentiationWedges}
        dark={true}
      />

      <SmallListCard
        title="What Makes It Hard to Copy"
        items={structured.moatAndDefensibility}
      />

      <MVPCard
        paragraphs={structured.mvpWedgeRecommendation.paragraphs}
        bullets={structured.mvpWedgeRecommendation.bullets}
      />

      <SmallListCard
        title="Recommended Next Moves"
        items={structured.strategicRecommendations}
      />
      </div>
    </CompetitorMentionLinksProvider>
  )
}

/**
 * Config for each designed Market Research subsection. Shared by the full
 * document renderer below and the streaming preview, so both always render
 * the exact same components. `v2Sections` lists the markdown H2 sections a
 * block needs before it can render from a partial stream.
 */
export interface CompetitiveDetailSectionConfig {
  id: string
  kicker: string
  title: string
  v2Sections: CompetitiveAnalysisV2SectionName[]
  render: (structured: CompetitiveAnalysisStructuredData) => React.ReactNode
}

export const COMPETITIVE_DETAIL_SECTION_CONFIGS: CompetitiveDetailSectionConfig[] = [
  {
    id: "market-research-direct-competitors",
    kicker: "Deep Analysis",
    title: "Direct Competitors",
    v2Sections: ["Direct Competitors"],
    render: (structured) => (
      <CompetitorProfiles competitors={structured.directCompetitors} showHeader={false} />
    ),
  },
  {
    id: "market-research-landscape-overview",
    kicker: "Deep Analysis",
    title: "Market Landscape",
    v2Sections: ["Competitive Landscape Overview"],
    render: (structured) => (
      <SmallListCard
        title="Competitive Landscape Overview"
        items={structured.competitiveLandscapeOverview}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-feature-matrix",
    kicker: "Deep Analysis",
    title: "Feature Comparison",
    v2Sections: ["Feature Comparison"],
    render: (structured) => (
      <CompactTableCard
        title="Feature Comparison"
        paragraphs={structured.featureMatrix.paragraphs}
        headers={structured.featureMatrix.table?.headers ?? []}
        rows={structured.featureMatrix.table?.rows ?? []}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-positioning",
    kicker: "Deep Analysis",
    title: "Positioning Map",
    v2Sections: ["Positioning Map"],
    render: (structured) => (
      <PositioningMap
        title="Positioning Map"
        description="Where you fit in the market."
        positioningMap={structured.positioningMap}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-pricing",
    kicker: "Deep Analysis",
    title: "Pricing Comparison",
    v2Sections: ["Pricing Comparison"],
    render: (structured) => (
      <CompactTableCard
        title="Pricing Comparison"
        paragraphs={structured.pricingAndPackaging.paragraphs}
        headers={structured.pricingAndPackaging.table?.headers ?? []}
        rows={structured.pricingAndPackaging.table?.rows ?? []}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-audience",
    kicker: "Deep Analysis",
    title: "Best Customer Segments",
    v2Sections: ["Best Customer Segments"],
    render: (structured) => (
      <SmallListCard
        title="Best Customer Segments"
        items={structured.audienceSegments}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-gtm",
    kicker: "Deep Analysis",
    title: "How You'll Reach Customers",
    v2Sections: ["How You'll Reach Customers"],
    render: (structured) => (
      <SmallListCard
        title="How You'll Reach Customers"
        items={structured.gtmSignals}
        dark={true}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-gap-analysis",
    kicker: "Deep Analysis",
    title: "Gap Analysis",
    v2Sections: ["Gap Analysis"],
    render: (structured) => (
      <SmallListCard title="Gap Analysis" items={structured.gapAnalysis} showHeader={false} />
    ),
  },
  {
    id: "market-research-differentiation",
    kicker: "Deep Analysis",
    title: "Ways to Stand Out",
    v2Sections: ["Ways to Stand Out"],
    render: (structured) => (
      <SmallListCard
        title="Ways to Stand Out"
        items={structured.differentiationWedges}
        dark={true}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-moat",
    kicker: "Deep Analysis",
    title: "What Makes It Hard to Copy",
    v2Sections: ["What Makes It Hard to Copy"],
    render: (structured) => (
      <SmallListCard
        title="What Makes It Hard to Copy"
        items={structured.moatAndDefensibility}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-mvp-wedge",
    kicker: "Deep Analysis",
    title: "First Version Focus",
    v2Sections: ["First Version Focus"],
    render: (structured) => (
      <MVPCard
        paragraphs={structured.mvpWedgeRecommendation.paragraphs}
        bullets={structured.mvpWedgeRecommendation.bullets}
        showHeader={false}
      />
    ),
  },
  {
    id: "market-research-strategic-recommendations",
    kicker: "Deep Analysis",
    title: "Recommended Next Moves",
    v2Sections: ["Recommended Next Moves"],
    render: (structured) => (
      <SmallListCard
        title="Recommended Next Moves"
        items={structured.strategicRecommendations}
        showHeader={false}
      />
    ),
  },
]

/**
 * Executive Summary cards rendered from already-parsed structured data.
 * Used by the full overview section below and by the streaming preview.
 */
export function CompetitiveOverviewBody({
  structured,
  projectName,
}: {
  structured: CompetitiveAnalysisStructuredData
  projectName?: string
}) {
  return (
    <CompetitorMentionLinksProvider sources={structured.competitorSources}>
      <div className="flex flex-col gap-y-3 gap-x-0">
        <ProposedNameCard projectName={projectName} />
        <ExecutiveSummaryCard summary={structured.executiveSummary} showHeader={false} />
      </div>
    </CompetitorMentionLinksProvider>
  )
}

/**
 * Executive Summary portion of competitive analysis. The generated executive
 * summary and opportunity verdict are merged into one user-facing block.
 */
export function CompetitiveOverviewSection({
  content,
  metadata,
  projectId,
  projectName,
}: CompetitiveAnalysisDocumentProps) {
  const viewModel = useMemo(
    () => getCompetitiveAnalysisViewModel(content, metadata),
    [content, metadata]
  )

  if (!viewModel.canRenderModules) {
    return <CompetitiveOverviewFallback content={content} projectId={projectId} />
  }

  const { structured } = viewModel

  return (
    <section id="executive-summary" className="flex flex-col gap-y-3 gap-x-0">
      <TopLevelDocumentHeader
        title="Executive Summary"
        description="Market snapshot, entry assessment, and key risk."
      />

      <CompetitiveOverviewBody structured={structured} projectName={projectName} />
    </section>
  )
}

/**
 * Detail portion of competitive analysis: competitors, matrices, maps, pricing,
 * gap analysis, moat, risks, and next moves. Used by ScrollableContent for "Market Research".
 */
export function CompetitiveDetailSection({
  content,
  metadata,
  projectId,
}: CompetitiveAnalysisDocumentProps) {
  const viewModel = useMemo(
    () => getCompetitiveAnalysisViewModel(content, metadata),
    [content, metadata]
  )

  if (!viewModel.canRenderModules) {
    return <CompetitiveDetailFallback content={content} projectId={projectId} />
  }

  const { structured } = viewModel

  return (
    <section className="flex flex-col gap-y-3 gap-x-0">
      <TopLevelDocumentHeader
        title="Market Research"
        description="Competitive landscape, customer segments, positioning, and recommended next moves."
      />

      <CompetitorMentionLinksProvider sources={structured.competitorSources}>
        {COMPETITIVE_DETAIL_SECTION_CONFIGS.map((config, index) => (
          <WorkspaceDesignedSection
            key={config.id}
            id={config.id}
            kicker={config.kicker}
            title={config.title}
            index={index + 1}
            total={COMPETITIVE_DETAIL_SECTION_CONFIGS.length}
          >
            {config.render(structured)}
          </WorkspaceDesignedSection>
        ))}
      </CompetitorMentionLinksProvider>
    </section>
  )
}

export function CompetitiveAnalysisDocument({
  content,
  metadata,
  projectId,
}: CompetitiveAnalysisDocumentProps) {
  const viewModel = useMemo(
    () => getCompetitiveAnalysisViewModel(content, metadata),
    [content, metadata]
  )

  return (
    <div className="space-y-4">
      {viewModel.warning && (
        <div className="flex items-start gap-3 border border-[#FCA5A5] bg-[#FEF2F2] px-5 py-4 rounded-none">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-semibold text-[#7F1D1D]">
              Designed modules view unavailable
            </p>
            <p className="text-sm text-[#991B1B]">{viewModel.warning}</p>
          </div>
        </div>
      )}

      {viewModel.canRenderModules ? (
        <CompetitiveResearchPage structured={viewModel.structured} />
      ) : (
        <MarkdownRenderer
          content={sanitizeCompetitiveAnalysisDisplayMarkdown(content)}
          projectId={projectId}
        />
      )}
    </div>
  )
}
