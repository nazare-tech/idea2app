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
        className
      )}
    >
      <div className="space-y-2 px-6 py-5">
        {kicker ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
            {kicker}
          </p>
        ) : null}
        <h2
          className={cn(
            displayFontClass,
            "text-[22px] font-bold tracking-[-0.03em]",
            dark ? "text-[#1C1917]" : "text-[#0A0A0A]"
          )}
        >
          {title}
        </h2>
      </div>
      <div className="px-6 pb-6">{children}</div>
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
  paragraphs,
}: {
  paragraphs: string[]
}) {
  return (
    <PencilCard
      title="Market Snapshot & Entry Thesis"
      kicker="Executive Summary"
    >
      <ParagraphStack paragraphs={paragraphs} />
    </PencilCard>
  )
}

function FounderVerdictCard({
  verdict,
}: {
  verdict: CompetitiveAnalysisStructuredData["founderVerdict"]
}) {
  return (
    <PencilCard title="Founder Verdict" kicker="Founder Verdict" dark>
      <ParagraphStack paragraphs={verdict.paragraphs} dark={true} />
      <div className="pt-5">
        <NumberedList items={verdict.bullets} dark={true} />
      </div>
    </PencilCard>
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
  return (
    <div className="space-y-6">
      <PencilCard title="Market Snapshot & Entry Thesis" kicker="Category Snapshot">
        <ParagraphStack paragraphs={structured.executiveSummary} />
        <MarketSignalStrip items={structured.competitiveLandscapeOverview} />
      </PencilCard>

      <FounderVerdictCard verdict={structured.founderVerdict} />
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
      <table className="min-w-[960px] table-fixed border-collapse border border-[#E0E0E0]">
        <colgroup>
          <col className="w-[170px]" />
          <col className="w-[310px]" />
          <col className="w-[230px]" />
          <col className="w-[250px]" />
        </colgroup>
        <thead>
          <tr className="bg-[#F5F0EB]">
            {["Competitor", "Profile", "Commercial Fit", "Advantage / Risk"].map(
              (label) => (
                <th
                  key={label}
                  className="border border-[#D8CEC5] px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#4A4040]"
                >
                  {label}
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
              <td className="border border-[#E0E0E0] px-4 py-4 align-top">
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
              <td className="space-y-3 border border-[#E0E0E0] px-4 py-4 align-top">
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
              <td className="space-y-3 border border-[#E0E0E0] px-4 py-4 align-top">
                <CompetitorTableDetail
                  label="Pricing"
                  value={competitor.fields["Pricing Model"] ?? "Unknown"}
                />
                <CompetitorTableDetail
                  label="Audience"
                  value={competitor.fields["Target Audience"] ?? "Unknown"}
                />
              </td>
              <td className="space-y-3 border border-[#E0E0E0] px-4 py-4 align-top">
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
}: {
  competitors: CompetitiveAnalysisCompetitorProfile[]
}) {
  return (
    <div className="space-y-6">
      <PencilCard
        title="Competitor Profiles & Quick Comparison"
        kicker="Competitive Intelligence"
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
}: {
  title: string
  kicker?: string
  paragraphs: string[]
  headers: string[]
  rows: string[][]
}) {
  return (
    <PencilCard title={title} kicker={kicker}>
      <ParagraphStack paragraphs={paragraphs} />
      <div className={paragraphs.length > 0 ? "pt-5" : ""}>
        <DataTable headers={headers} rows={rows} />
      </div>
    </PencilCard>
  )
}

function clamp(value: number | null, fallback: number) {
  if (value === null || Number.isNaN(value)) return fallback
  return Math.min(10, Math.max(0, value))
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
  positioningMap,
}: {
  title: string
  positioningMap: CompetitiveAnalysisStructuredData["positioningMap"]
}) {
  return (
    <PencilCard title={title}>
      <div className="space-y-4">
        {(positioningMap.xAxis || positioningMap.yAxis) && (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
                X Axis
              </p>
              <p className="mt-1 ui-type-table text-[#0A0A0A]">
                {positioningMap.xAxis ?? "Not specified"}
              </p>
            </div>
            <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
                Y Axis
              </p>
              <p className="mt-1 ui-type-table text-[#0A0A0A]">
                {positioningMap.yAxis ?? "Not specified"}
              </p>
            </div>
          </div>
        )}

        <div className="relative h-[320px] border border-[#E0E0E0] bg-[#FAFAFA]">
          <div className="absolute inset-x-[14%] top-1/2 h-px bg-[#E0E0E0]" />
          <div className="absolute inset-y-[14%] left-1/2 w-px bg-[#E0E0E0]" />
          <p className="absolute bottom-3 left-4 max-w-[24%] whitespace-normal font-mono text-[10px] uppercase leading-4 tracking-[0.18em] text-[#777777]">
            Low {positioningMap.xAxis ?? "X"}
          </p>
          <p className="absolute bottom-3 right-4 max-w-[24%] whitespace-normal text-right font-mono text-[10px] uppercase leading-4 tracking-[0.18em] text-[#777777]">
            High {positioningMap.xAxis ?? "X"}
          </p>
          <p className="absolute left-4 top-3 max-w-[24%] whitespace-normal font-mono text-[10px] uppercase leading-4 tracking-[0.18em] text-[#777777]">
            High {positioningMap.yAxis ?? "Y"}
          </p>
          <p className="absolute right-4 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#777777]">
            Map
          </p>

          {positioningMap.points.map((point, index) => {
            const normalizedX = clamp(point.x, index * 2 + 3)
            const normalizedY = clamp(point.y, 8 - index * 2)
            const tone = pointTone(point, index)

            return (
              <div
                key={`${point.competitor}-${index}`}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 border px-3 py-2",
                  tone === "accent"
                    ? "border-primary bg-primary text-primary-foreground"
                    : tone === "dark"
                      ? "border-[#4A4040] bg-[#4A4040] text-[#FAFAFA]"
                      : tone === "muted"
                        ? "border-[#D8CEC5] bg-[#E8DDD5] text-[#1C1917]"
                        : "border-[#E0E0E0] bg-white text-[#0A0A0A]"
                )}
                style={{
                  left: `${14 + normalizedX * 7.2}%`,
                  top: `${86 - normalizedY * 7.2}%`,
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                  {point.competitor}
                </p>
              </div>
            )
          })}
        </div>

        {positioningMap.points.length > 0 ? (
          <div className="space-y-3">
            {positioningMap.points.map((point) => (
              <div
                key={`${point.competitor}-rationale`}
                className="border border-[#E0E0E0] px-4 py-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#999999]">
                  {point.competitor}
                </p>
                <p className="mt-1 ui-type-table text-[#0A0A0A]">
                  {point.rationale}
                </p>
              </div>
            ))}
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
}: {
  matrix: CompetitiveAnalysisSwotMatrix | null
  paragraphs: string[]
  tableHeaders: string[]
  rows: string[][]
}) {
  return (
    <PencilCard title="SWOT Analysis">
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
}: {
  title: string
  kicker?: string
  items: string[]
  dark?: boolean
}) {
  return (
    <PencilCard title={title} kicker={kicker} dark={dark}>
      <NumberedList items={items} dark={dark} />
    </PencilCard>
  )
}

function MVPCard({
  paragraphs,
  bullets,
}: {
  paragraphs: string[]
  bullets: string[]
}) {
  return (
    <PencilCard title="Launch with one sharp workflow, not a platform." kicker="MVP Wedge" dark>
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
      <header className="border border-[#E0E0E0] bg-white px-6 py-5">
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
              Competitive Research
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
        title="Feature and Workflow Matrix"
        paragraphs={structured.featureMatrix.paragraphs}
        headers={structured.featureMatrix.table?.headers ?? []}
        rows={structured.featureMatrix.table?.rows ?? []}
      />

      <PositioningMap
        title="Competitive Positioning Map"
        positioningMap={structured.positioningMap}
      />

      <CompactTableCard
        title="Pricing And Packaging"
        paragraphs={structured.pricingAndPackaging.paragraphs}
        headers={structured.pricingAndPackaging.table?.headers ?? []}
        rows={structured.pricingAndPackaging.table?.rows ?? []}
      />

      <SmallListCard
        title="Audience Segments"
        items={structured.audienceSegments}
      />

      <SmallListCard
        title="GTM / Distribution Signals"
        items={structured.gtmSignals}
        dark={true}
      />

      <SmallListCard title="Gap Analysis" items={structured.gapAnalysis} />

      <SmallListCard
        title="Differentiation Wedges"
        items={structured.differentiationWedges}
        dark={true}
      />

      <SmallListCard
        title="Moat And Defensibility"
        items={structured.moatAndDefensibility}
      />

      <SWOTCard
        matrix={structured.swotAnalysis.matrix}
        paragraphs={structured.swotAnalysis.paragraphs}
        tableHeaders={structured.swotAnalysis.table?.headers ?? []}
        rows={structured.swotAnalysis.table?.rows ?? []}
      />

      <SmallListCard
        title="Risks And Countermoves"
        items={structured.risksAndCountermoves}
      />

      <MVPCard
        paragraphs={structured.mvpWedgeRecommendation.paragraphs}
        bullets={structured.mvpWedgeRecommendation.bullets}
      />

      <SmallListCard
        title="Strategic Recommendations"
        items={structured.strategicRecommendations}
      />
    </div>
  )
}

/**
 * Overview portion of competitive analysis: executive summary, founder verdict,
 * strategic recommendations. Used by ScrollableContent for the "Overview" section.
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
    return <MarkdownRenderer content={content} projectId={projectId} />
  }

  const { structured } = viewModel

  return (
    <>
      <header className="border border-[#E0E0E0] bg-white px-6 py-5">
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
            Overview
          </h1>
          <p className="mt-2 max-w-3xl ui-type-body text-[#666666]">
            Executive summary and founder verdict.
          </p>
        </div>
      </header>

      <div id="overview-executive-summary">
        <ExecutiveSummaryCard paragraphs={structured.executiveSummary} />
      </div>

      <div id="overview-founder-verdict">
        <FounderVerdictCard verdict={structured.founderVerdict} />
      </div>
    </>
  )
}

/**
 * Detail portion of competitive analysis: competitors, matrices, maps, pricing,
 * gap analysis, moat, SWOT, risks. Used by ScrollableContent for "Market Research".
 */
export function CompetitiveDetailSection({
  content,
  metadata,
}: CompetitiveAnalysisDocumentProps) {
  const viewModel = useMemo(
    () => getCompetitiveAnalysisViewModel(content, metadata),
    [content, metadata]
  )

  if (!viewModel.canRenderModules) {
    return null // Overview section already shows fallback markdown
  }

  const { structured } = viewModel

  return (
    <>
      <header className="border border-[#E0E0E0] bg-white px-6 py-5">
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

      <div id="market-research-direct-competitors">
        <CompetitorProfiles competitors={structured.directCompetitors} />
      </div>

      <div id="market-research-landscape-overview">
        <SmallListCard
          title="Competitive Landscape Overview"
          items={structured.competitiveLandscapeOverview}
        />
      </div>

      <div id="market-research-feature-matrix">
        <CompactTableCard
          title="Feature and Workflow Matrix"
          paragraphs={structured.featureMatrix.paragraphs}
          headers={structured.featureMatrix.table?.headers ?? []}
          rows={structured.featureMatrix.table?.rows ?? []}
        />
      </div>

      <div id="market-research-positioning">
        <PositioningMap
          title="Competitive Positioning Map"
          positioningMap={structured.positioningMap}
        />
      </div>

      <div id="market-research-pricing">
        <CompactTableCard
          title="Pricing And Packaging"
          paragraphs={structured.pricingAndPackaging.paragraphs}
          headers={structured.pricingAndPackaging.table?.headers ?? []}
          rows={structured.pricingAndPackaging.table?.rows ?? []}
        />
      </div>

      <div id="market-research-audience">
        <SmallListCard
          title="Audience Segments"
          items={structured.audienceSegments}
        />
      </div>

      <div id="market-research-gtm">
        <SmallListCard
          title="GTM / Distribution Signals"
          items={structured.gtmSignals}
          dark={true}
        />
      </div>

      <div id="market-research-gap-analysis">
        <SmallListCard title="Gap Analysis" items={structured.gapAnalysis} />
      </div>

      <div id="market-research-differentiation">
        <SmallListCard
          title="Differentiation Wedges"
          items={structured.differentiationWedges}
          dark={true}
        />
      </div>

      <div id="market-research-moat">
        <SmallListCard
          title="Moat And Defensibility"
          items={structured.moatAndDefensibility}
        />
      </div>

      <div id="market-research-risks">
        <SWOTCard
          matrix={structured.swotAnalysis.matrix}
          paragraphs={structured.swotAnalysis.paragraphs}
          tableHeaders={structured.swotAnalysis.table?.headers ?? []}
          rows={structured.swotAnalysis.table?.rows ?? []}
        />
        <SmallListCard
          title="Risks And Countermoves"
          items={structured.risksAndCountermoves}
        />
      </div>

      <div id="market-research-mvp-wedge">
        <MVPCard
          paragraphs={structured.mvpWedgeRecommendation.paragraphs}
          bullets={structured.mvpWedgeRecommendation.bullets}
        />
      </div>

      <div id="market-research-strategic-recommendations">
        <SmallListCard
          title="Strategic Recommendations"
          items={structured.strategicRecommendations}
        />
      </div>
    </>
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
