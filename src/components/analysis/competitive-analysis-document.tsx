"use client"

import { useMemo } from "react"
import { AlertTriangle, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import {
  type CompetitiveAnalysisCompetitorProfile,
  type CompetitiveAnalysisPositioningPoint,
  type CompetitiveAnalysisStructuredData,
  type CompetitiveAnalysisSwotMatrix,
  getCompetitiveAnalysisViewModel,
} from "@/lib/competitive-analysis-v2"

interface CompetitiveAnalysisDocumentProps {
  content: string
  metadata?: Record<string, unknown> | null
  currentVersion?: number
  projectId: string
}

const displayFontClass = "font-[family:var(--font-display)]"

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
  { id: "market-research-risks", title: "Risks & Competitor Responses", headings: ["Risks & Competitor Responses"] },
  { id: "market-research-mvp-wedge", title: "First Version Focus", headings: ["First Version Focus"] },
  { id: "market-research-strategic-recommendations", title: "Recommended Next Moves", headings: ["Recommended Next Moves"] },
] as const

function normalizeMarkdownHeading(heading: string) {
  return heading.trim().toLowerCase()
}

function extractH2Sections(content: string) {
  const matches = Array.from(content.matchAll(/^##\s+(.+)$/gm))
  const sections = new Map<string, string>()

  matches.forEach((match, index) => {
    const heading = match[1]?.trim()
    if (!heading || match.index === undefined) return

    const bodyStart = match.index + match[0].length
    const nextMatch = matches[index + 1]
    const bodyEnd = nextMatch?.index ?? content.length
    sections.set(normalizeMarkdownHeading(heading), content.slice(bodyStart, bodyEnd).trim())
  })

  return sections
}

function getFallbackSectionContent(
  sections: Map<string, string>,
  headings: readonly string[]
) {
  for (const heading of headings) {
    const content = sections.get(normalizeMarkdownHeading(heading))
    if (content) return content
  }

  return ""
}

function CompetitiveOverviewFallback({
  content,
  projectId,
}: {
  content: string
  projectId: string
}) {
  const sections = extractH2Sections(content)
  const summary = getFallbackSectionContent(sections, ["Executive Summary"])
  const verdict = getFallbackSectionContent(sections, ["Opportunity Verdict"])
  const fallbackContent = [summary, verdict].filter(Boolean).join("\n\n")

  return (
    <section id="executive-summary" className="flex flex-col gap-y-3 gap-x-0">
      <header className="-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
          Market Intelligence
        </p>
        <div className="mt-3">
          <h1
            className={cn(
              displayFontClass,
              "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]"
            )}
          >
            Executive Summary
          </h1>
          <p className="mt-2 max-w-3xl ui-type-body text-[#666666]">
            Market snapshot, entry assessment, and key risk.
          </p>
        </div>
      </header>

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
  const sections = extractH2Sections(content)
  const fallbackSections = fallbackMarketResearchSections
    .map((section) => ({
      ...section,
      content: getFallbackSectionContent(sections, section.headings),
    }))
    .filter((section) => section.content.trim().length > 0)

  if (fallbackSections.length === 0) return null

  return (
    <section className="flex flex-col gap-y-3 gap-x-0">
      <header className="-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
          Deep Analysis
        </p>
        <div className="mt-3">
          <h1
            className={cn(
              displayFontClass,
              "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]"
            )}
          >
            Market Research
          </h1>
        </div>
      </header>

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

function PencilCard({
  title,
  kicker,
  description,
  dark = false,
  showHeader = true,
  showTitle = true,
  className,
  children,
}: {
  title: string
  kicker?: string
  description?: string
  dark?: boolean
  showHeader?: boolean
  showTitle?: boolean
  className?: string
  children: React.ReactNode
}) {
  const hasHeader = showHeader && (kicker || showTitle || description)

  return (
    <section
      className={cn(
        "rounded-none bg-transparent",
        className
      )}
    >
      {hasHeader ? (
        <div className="space-y-2 py-5">
          {kicker ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
              {kicker}
            </p>
          ) : null}
          {showTitle ? (
            <h2
              className={cn(
                displayFontClass,
                "text-[22px] font-bold tracking-[-0.03em]",
                dark ? "text-[#1C1917]" : "text-[#0A0A0A]"
              )}
            >
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="max-w-2xl ui-type-body-sm text-[#666666]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="pb-6">{children}</div>
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
  return (
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
  )
}

function WorkspaceDesignedSection({
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

function ParagraphStack({
  paragraphs,
  dark = false,
  className,
}: {
  paragraphs: string[]
  dark?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${paragraph}-${index}`}
          className={cn(
            "ui-type-body",
            dark ? "text-[#4A4040]" : "text-[#666666]"
          )}
        >
          {paragraph}
        </p>
      ))}
    </div>
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
            {item}
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
          <p className="mt-2 ui-type-body-sm text-[#0A0A0A]">{item}</p>
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
      <ParagraphStack paragraphs={summary.paragraphs} />
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
            <tr
              key={`row-${rowIndex}`}
              className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}
            >
              {headers.map((header, cellIndex) => (
                <td
                  key={`${header}-${cellIndex}`}
                  className="border border-[#E0E0E0] px-4 py-3 ui-type-table text-[#0A0A0A] align-top"
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

function SnapshotHero({
  structured,
}: {
  structured: CompetitiveAnalysisStructuredData
}) {
  const bullets = structured.executiveSummary.bullets.map(formatExecutiveSummaryBullet)

  return (
    <div className="space-y-6">
      <PencilCard title="Market Snapshot & Entry Thesis" kicker="Category Snapshot">
        <ParagraphStack paragraphs={structured.executiveSummary.paragraphs} />
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
        {value}
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
                {competitor.websiteUrl ? (
                  <a
                    href={competitor.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-start gap-1.5 transition-opacity hover:opacity-80"
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
                ) : (
                  <p
                    className={cn(
                      displayFontClass,
                      "text-[14px] font-semibold leading-5 text-[#0A0A0A]"
                    )}
                  >
                    {competitor.heading}
                  </p>
                )}
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
          Compare each competitor once across product scope, buying fit,
          strengths, edges, and limitations.
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
      <ParagraphStack paragraphs={paragraphs} />
      <div className={paragraphs.length > 0 ? "pt-5" : ""}>
        <DataTable headers={headers} rows={rows} />
      </div>
    </PencilCard>
  )
}

const POSITIONING_SCORE_MIN = 0
const POSITIONING_SCORE_MID = 5
const POSITIONING_SCORE_MAX = 10
const POSITIONING_PLOT_MIN_PERCENT = 14
const POSITIONING_PLOT_MAX_PERCENT = 86
const POSITIONING_PLOT_RANGE_PERCENT =
  POSITIONING_PLOT_MAX_PERCENT - POSITIONING_PLOT_MIN_PERCENT

function hasPositioningScores(
  point: CompetitiveAnalysisPositioningPoint
): point is CompetitiveAnalysisPositioningPoint & { x: number; y: number } {
  return point.x !== null && point.y !== null
}

function scoreToPlotPercent(score: number) {
  return (
    POSITIONING_PLOT_MIN_PERCENT +
    (score / POSITIONING_SCORE_MAX) * POSITIONING_PLOT_RANGE_PERCENT
  )
}

function formatAxisEndpointLabel(value: string) {
  const trimmed = value.replace(/[.。]+$/g, "").trim()
  if (!trimmed) return value
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
}

function positioningAxisLabels(axis: string | null, fallback: string) {
  if (!axis) {
    return {
      low: `Low ${fallback}`,
      high: `High ${fallback}`,
    }
  }

  const endpointMatch = axis.match(
    /where\s+0\s+means\s+(.+?)\s+and\s+10\s+means\s+(.+)$/i
  )

  if (endpointMatch) {
    return {
      low: formatAxisEndpointLabel(endpointMatch[1] ?? ""),
      high: formatAxisEndpointLabel(endpointMatch[2] ?? ""),
    }
  }

  return {
    low: `Low ${axis}`,
    high: `High ${axis}`,
  }
}

function pointTone(point: CompetitiveAnalysisPositioningPoint, index: number) {
  if (/your|our|concept|idea|product/i.test(point.competitor)) {
    return "accent"
  }
  if (index === 0) return "dark"
  if (index === 1) return "muted"
  return "light"
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
  const xAxisLabels = positioningAxisLabels(positioningMap.xAxis, "X")
  const yAxisLabels = positioningAxisLabels(positioningMap.yAxis, "Y")

  return (
    <PencilCard title={title} description={description} showHeader={showHeader}>
      <div className="space-y-4">
        {(positioningMap.xAxis || positioningMap.yAxis) && (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
                X Axis / 0-10 score
              </p>
              <p className="mt-1 ui-type-table text-[#0A0A0A]">
                {positioningMap.xAxis ?? "Not specified"}
              </p>
            </div>
            <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
                Y Axis / 0-10 score
              </p>
              <p className="mt-1 ui-type-table text-[#0A0A0A]">
                {positioningMap.yAxis ?? "Not specified"}
              </p>
            </div>
          </div>
        )}

        <div
          className="relative h-[340px] border border-[#E0E0E0] bg-[#FAFAFA]"
          aria-label="Positioning map with 0 to 10 X and Y score axes"
        >
          <div
            className="absolute h-px bg-[#D8D8D8]"
            style={{
              left: `${POSITIONING_PLOT_MIN_PERCENT}%`,
              right: `${100 - POSITIONING_PLOT_MAX_PERCENT}%`,
              top: "50%",
            }}
          />
          <div
            className="absolute w-px bg-[#D8D8D8]"
            style={{
              top: `${POSITIONING_PLOT_MIN_PERCENT}%`,
              bottom: `${100 - POSITIONING_PLOT_MAX_PERCENT}%`,
              left: "50%",
            }}
          />

          {[POSITIONING_SCORE_MIN, POSITIONING_SCORE_MID, POSITIONING_SCORE_MAX].map(
            (score) => (
              <span
                key={`x-${score}`}
                className="absolute bottom-4 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#777777]"
                style={{ left: `${scoreToPlotPercent(score)}%` }}
              >
                {score}/10
              </span>
            )
          )}
          {[POSITIONING_SCORE_MIN, POSITIONING_SCORE_MID, POSITIONING_SCORE_MAX].map(
            (score) => (
              <span
                key={`y-${score}`}
                className="absolute left-4 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#777777]"
                style={{ top: `${100 - scoreToPlotPercent(score)}%` }}
              >
                {score}/10
              </span>
            )
          )}
          <p className="absolute bottom-8 left-4 max-w-[24%] whitespace-normal font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#777777]">
            {xAxisLabels.low}
          </p>
          <p className="absolute bottom-8 right-4 max-w-[24%] whitespace-normal text-right font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#777777]">
            {xAxisLabels.high}
          </p>
          <p className="absolute left-4 top-4 max-w-[24%] whitespace-normal font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#777777]">
            {yAxisLabels.high}
          </p>
          <p className="absolute bottom-8 left-4 max-w-[24%] -translate-y-5 whitespace-normal font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#777777]">
            {yAxisLabels.low}
          </p>

          {scoredPoints.map((point, index) => {
            const tone = pointTone(point, index)
            const xPosition = scoreToPlotPercent(point.x)
            const yPosition = 100 - scoreToPlotPercent(point.y)
            const labelOnLeft = point.x >= 7
            const labelAbove = point.y <= 2
            const pointSummary = `${point.competitor}: X ${point.x}/10, Y ${point.y}/10. ${point.rationale}${point.evidence ? ` Evidence: ${point.evidence}` : ""}`

            return (
              <div
                key={`${point.competitor}-${index}`}
                className="absolute"
                data-positioning-state="scored"
                data-positioning-point={point.competitor}
                aria-label={pointSummary}
                title={pointSummary}
                style={{
                  left: `${xPosition}%`,
                  top: `${yPosition}%`,
                }}
              >
                <span
                  className={cn(
                    "block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                    tone === "accent"
                      ? "border-primary bg-primary"
                      : tone === "dark"
                        ? "border-[#4A4040] bg-[#4A4040]"
                        : tone === "muted"
                          ? "border-[#B9A99C] bg-[#E8DDD5]"
                          : "border-[#0A0A0A] bg-white"
                  )}
                />
                <span
                  className={cn(
                    "absolute w-max max-w-[140px] font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#0A0A0A]",
                    labelOnLeft ? "right-3 text-right" : "left-3",
                    labelAbove ? "bottom-3" : "top-3"
                  )}
                >
                  {point.competitor}
                </span>
              </div>
            )
          })}
        </div>

        {scoredPoints.length > 0 ? (
          <div className="space-y-3">
            {scoredPoints.map((point) => (
              <div
                key={`${point.competitor}-rationale`}
                className="border border-[#E0E0E0] px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#999999]">
                    {point.competitor}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#777777]">
                    {hasPositioningScores(point)
                      ? `X ${point.x}/10 / Y ${point.y}/10`
                      : "Score unavailable"}
                  </p>
                </div>
                <p className="mt-1 ui-type-table text-[#0A0A0A]">
                  {point.rationale}
                </p>
                {point.evidence ? (
                  <p className="mt-2 ui-type-caption text-[#777777]">
                    {point.evidence}
                  </p>
                ) : null}
              </div>
            ))}
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
                    {point.competitor}
                  </p>
                  <p className="ui-type-caption text-[#777777]">
                    {point.rationale || "Missing a valid 0-10 X or Y score."}
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

function SWOTQuadrant({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "mint" | "rose" | "blue" | "amber"
}) {
  return (
    <div
      className={cn(
        "border p-5",
        tone === "mint" && "border-[#D1FAE5] bg-[#F0FDF4]",
        tone === "rose" && "border-[#FECACA] bg-[#FEF2F2]",
        tone === "blue" && "border-[#BFDBFE] bg-[#EFF6FF]",
        tone === "amber" && "border-[#FED7AA] bg-[#FFF7ED]"
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777777]">
        {label}
      </p>
      <p className="mt-2 ui-type-table text-[#0A0A0A]">{value}</p>
    </div>
  )
}

function SWOTCard({
  matrix,
  paragraphs,
  tableHeaders,
  rows,
  showHeader = true,
}: {
  matrix: CompetitiveAnalysisSwotMatrix | null
  paragraphs: string[]
  tableHeaders: string[]
  rows: string[][]
  showHeader?: boolean
}) {
  return (
    <PencilCard title="SWOT Analysis" showHeader={showHeader}>
      <ParagraphStack paragraphs={paragraphs} />
      {matrix ? (
        <div className={paragraphs.length > 0 ? "grid gap-4 pt-5 md:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
          <SWOTQuadrant
            label={`Internal / ${matrix.positiveLabel}`}
            value={matrix.internalPositive}
            tone="mint"
          />
          <SWOTQuadrant
            label={`Internal / ${matrix.negativeLabel}`}
            value={matrix.internalNegative}
            tone="rose"
          />
          <SWOTQuadrant
            label={`External / ${matrix.positiveLabel}`}
            value={matrix.externalPositive}
            tone="blue"
          />
          <SWOTQuadrant
            label={`External / ${matrix.negativeLabel}`}
            value={matrix.externalNegative}
            tone="amber"
          />
        </div>
      ) : rows.length > 0 ? (
        <div className={paragraphs.length > 0 ? "pt-5" : ""}>
          <DataTable headers={tableHeaders} rows={rows} />
        </div>
      ) : null}
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
      <ParagraphStack paragraphs={paragraphs} dark={true} />
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
    <div className="space-y-6 bg-white p-6 md:p-8 xl:p-10">
      <header className="-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
          Market Intelligence
        </p>
        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1
              className={cn(
                displayFontClass,
                "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]"
              )}
            >
              Market Research
            </h1>
            <p className="mt-2 max-w-3xl ui-type-body text-[#666666]">
              Compare positioning, pricing, workflow depth, distribution signals,
              and whitespace opportunities without falling back to raw markdown.
            </p>
          </div>
        </div>
      </header>

      <SnapshotHero structured={structured} />

      <CompetitorProfiles competitors={structured.directCompetitors} />

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

      <SWOTCard
        matrix={structured.swotAnalysis.matrix}
        paragraphs={structured.swotAnalysis.paragraphs}
        tableHeaders={structured.swotAnalysis.table?.headers ?? []}
        rows={structured.swotAnalysis.table?.rows ?? []}
      />

      <SmallListCard
        title="Risks & Competitor Responses"
        items={structured.risksAndCountermoves}
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
      <header className="-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
          Market Intelligence
        </p>
        <div className="mt-3">
          <h1
            className={cn(
              displayFontClass,
              "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]"
            )}
          >
            Executive Summary
          </h1>
          <p className="mt-2 max-w-3xl ui-type-body text-[#666666]">
            Market snapshot, entry assessment, and key risk.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-y-3 gap-x-0">
        <ExecutiveSummaryCard summary={structured.executiveSummary} showHeader={false} />
      </div>
    </section>
  )
}

/**
 * Detail portion of competitive analysis: competitors, matrices, maps, pricing,
 * gap analysis, moat, SWOT, risks. Used by ScrollableContent for "Market Research".
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
      <header className="-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
          Deep Analysis
        </p>
        <div className="mt-3">
          <h1
            className={cn(
              displayFontClass,
              "text-[36px] font-bold tracking-[-0.05em] text-[#0A0A0A] md:text-[44px]"
            )}
          >
            Market Research
          </h1>
        </div>
      </header>

      <WorkspaceDesignedSection
        id="market-research-direct-competitors"
        kicker="Deep Analysis"
        title="Direct Competitors"
        index={1}
        total={13}
      >
        <CompetitorProfiles competitors={structured.directCompetitors} showHeader={false} />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-landscape-overview"
        kicker="Deep Analysis"
        title="Market Landscape"
        index={2}
        total={13}
      >
        <SmallListCard
          title="Competitive Landscape Overview"
          items={structured.competitiveLandscapeOverview}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-feature-matrix"
        kicker="Deep Analysis"
        title="Feature Comparison"
        index={3}
        total={13}
      >
        <CompactTableCard
          title="Feature Comparison"
          paragraphs={structured.featureMatrix.paragraphs}
          headers={structured.featureMatrix.table?.headers ?? []}
          rows={structured.featureMatrix.table?.rows ?? []}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-positioning"
        kicker="Deep Analysis"
        title="Positioning Map"
        index={4}
        total={13}
      >
        <PositioningMap
          title="Positioning Map"
          description="Where you fit in the market."
          positioningMap={structured.positioningMap}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-pricing"
        kicker="Deep Analysis"
        title="Pricing Comparison"
        index={5}
        total={13}
      >
        <CompactTableCard
          title="Pricing Comparison"
          paragraphs={structured.pricingAndPackaging.paragraphs}
          headers={structured.pricingAndPackaging.table?.headers ?? []}
          rows={structured.pricingAndPackaging.table?.rows ?? []}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-audience"
        kicker="Deep Analysis"
        title="Best Customer Segments"
        index={6}
        total={13}
      >
        <SmallListCard
          title="Best Customer Segments"
          items={structured.audienceSegments}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-gtm"
        kicker="Deep Analysis"
        title="How You'll Reach Customers"
        index={7}
        total={13}
      >
        <SmallListCard
          title="How You'll Reach Customers"
          items={structured.gtmSignals}
          dark={true}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-gap-analysis"
        kicker="Deep Analysis"
        title="Gap Analysis"
        index={8}
        total={13}
      >
        <SmallListCard title="Gap Analysis" items={structured.gapAnalysis} showHeader={false} />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-differentiation"
        kicker="Deep Analysis"
        title="Ways to Stand Out"
        index={9}
        total={13}
      >
        <SmallListCard
          title="Ways to Stand Out"
          items={structured.differentiationWedges}
          dark={true}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-moat"
        kicker="Deep Analysis"
        title="What Makes It Hard to Copy"
        index={10}
        total={13}
      >
        <SmallListCard
          title="What Makes It Hard to Copy"
          items={structured.moatAndDefensibility}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-risks"
        kicker="Deep Analysis"
        title="Risks & Competitor Responses"
        index={11}
        total={13}
      >
        <SWOTCard
          matrix={structured.swotAnalysis.matrix}
          paragraphs={structured.swotAnalysis.paragraphs}
          tableHeaders={structured.swotAnalysis.table?.headers ?? []}
          rows={structured.swotAnalysis.table?.rows ?? []}
          showHeader={false}
        />
        <SmallListCard
          title="Risks & Competitor Responses"
          items={structured.risksAndCountermoves}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-mvp-wedge"
        kicker="Deep Analysis"
        title="First Version Focus"
        index={12}
        total={13}
      >
        <MVPCard
          paragraphs={structured.mvpWedgeRecommendation.paragraphs}
          bullets={structured.mvpWedgeRecommendation.bullets}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-strategic-recommendations"
        kicker="Deep Analysis"
        title="Recommended Next Moves"
        index={13}
        total={13}
      >
        <SmallListCard
          title="Recommended Next Moves"
          items={structured.strategicRecommendations}
          showHeader={false}
        />
      </WorkspaceDesignedSection>
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
          content={content}
          projectId={projectId}
        />
      )}
    </div>
  )
}
