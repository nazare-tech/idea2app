"use client"

import { useMemo } from "react"
import { AlertTriangle, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ExplainTermButton } from "@/components/analysis/explainable-term"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import {
  type CompetitiveAnalysisCompetitorProfile,
  type CompetitiveAnalysisPositioningPoint,
  type CompetitiveAnalysisStructuredData,
  getCompetitiveAnalysisViewModel,
  sanitizeCompetitiveAnalysisDisplayMarkdown,
  sanitizeDirectCompetitorDisplayContent,
} from "@/lib/competitive-analysis-v2"
import { getExplainableTermKeyByLabel } from "@/lib/explainable-terms"

interface CompetitiveAnalysisDocumentProps {
  content: string
  metadata?: Record<string, unknown> | null
  currentVersion?: number
  projectId: string
}

const displayFontClass = "font-[family:var(--font-display)]"

function TopLevelDocumentHeader({
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
  const sections = extractH2Sections(content)
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
            <div className="flex items-center gap-2">
              <h2
                className={cn(
                  displayFontClass,
                  "text-[22px] font-bold tracking-[-0.03em]",
                  dark ? "text-[#1C1917]" : "text-[#0A0A0A]"
                )}
              >
                {title}
              </h2>
              <ExplainTermButton
                termKey={getExplainableTermKeyByLabel(title)}
                label={title}
              />
            </div>
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
  leadFirst = false,
}: {
  paragraphs: string[]
  dark?: boolean
  className?: string
  leadFirst?: boolean
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${paragraph}-${index}`}
          className={cn(
            leadFirst && index === 0
              ? "text-[22px] font-medium leading-[33px] tracking-[-0.01em]"
              : "ui-type-body",
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
      <ParagraphStack paragraphs={summary.paragraphs} leadFirst />
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
      <ParagraphStack paragraphs={paragraphs} />
      <div className={paragraphs.length > 0 ? "pt-5" : ""}>
        <DataTable headers={headers} rows={rows} />
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

function formatAxisEndpointLabel(value: string) {
  const trimmed = value.replace(/[.\u3002]+$/g, "").trim()
  if (!trimmed) return value
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
}

/**
 * Turn an axis description into a short bar label. Axis text is either a
 * plain dimension name ("Ease of setup") or the generated endpoint form
 * ("... where 0 means manual and 10 means automated"), which becomes
 * "Manual \u2192 Automated".
 */
function positioningBarLabel(axis: string | null, fallback: string) {
  if (!axis) return fallback

  const endpointMatch = axis.match(
    /where\s+0\s+means\s+(.+?)\s+and\s+10\s+means\s+(.+)$/i
  )

  if (endpointMatch) {
    const low = formatAxisEndpointLabel(endpointMatch[1] ?? "")
    const high = formatAxisEndpointLabel(endpointMatch[2] ?? "")
    return `${low} \u2192 ${high}`
  }

  return axis
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
          {label}
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
                      {point.competitor}
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
                    <p className="mt-4 ui-type-table text-[#0A0A0A]">{point.rationale}</p>
                  ) : null}
                  {point.evidence ? (
                    <p className="mt-2 ui-type-caption text-[#777777]">{point.evidence}</p>
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
      <TopLevelDocumentHeader
        title="Executive Summary"
        description="Market snapshot, entry assessment, and key risk."
      />

      <div className="flex flex-col gap-y-3 gap-x-0">
        <ExecutiveSummaryCard summary={structured.executiveSummary} showHeader={false} />
      </div>
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

      <WorkspaceDesignedSection
        id="market-research-direct-competitors"
        kicker="Deep Analysis"
        title="Direct Competitors"
        index={1}
        total={12}
      >
        <CompetitorProfiles
          competitors={structured.directCompetitors}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-landscape-overview"
        kicker="Deep Analysis"
        title="Market Landscape"
        index={2}
        total={12}
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
        total={12}
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
        total={12}
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
        total={12}
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
        total={12}
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
        total={12}
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
        total={12}
      >
        <SmallListCard title="Gap Analysis" items={structured.gapAnalysis} showHeader={false} />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-differentiation"
        kicker="Deep Analysis"
        title="Ways to Stand Out"
        index={9}
        total={12}
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
        total={12}
      >
        <SmallListCard
          title="What Makes It Hard to Copy"
          items={structured.moatAndDefensibility}
          showHeader={false}
        />
      </WorkspaceDesignedSection>

      <WorkspaceDesignedSection
        id="market-research-mvp-wedge"
        kicker="Deep Analysis"
        title="First Version Focus"
        index={11}
        total={12}
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
        index={12}
        total={12}
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
          content={sanitizeCompetitiveAnalysisDisplayMarkdown(content)}
          projectId={projectId}
        />
      )}
    </div>
  )
}
