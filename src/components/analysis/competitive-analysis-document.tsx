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
        "border rounded-none",
        dark ? "border-[#0A0A0A] bg-[#0A0A0A]" : "border-[#E0E0E0] bg-white",
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
            dark ? "text-white" : "text-[#0A0A0A]"
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
            "text-[13px] leading-6",
            dark ? "text-white/78" : "text-[#666666]"
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
              dark ? "text-primary" : "text-[#999999]"
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <p
            className={cn(
              "text-[12px] leading-5",
              dark ? "text-white/82" : "text-[#0A0A0A]"
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
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#999999]">
            Signal {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-[#0A0A0A]">{item}</p>
        </div>
      ))}
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
          <tr className="bg-[#0A0A0A]">
            {headers.map((header) => (
              <th
                key={header}
                className="border border-[#0A0A0A] px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white"
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
                  className="border border-[#E0E0E0] px-4 py-3 text-[12px] leading-5 text-[#0A0A0A] align-top"
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
      <PencilCard
        title="Market Snapshot & Entry Thesis"
        kicker="Category Snapshot"
      >
        <ParagraphStack paragraphs={structured.executiveSummary} />
        <MarketSignalStrip items={structured.competitiveLandscapeOverview} />
      </PencilCard>

      <PencilCard title="Founder Verdict" kicker="Founder Verdict" dark>
        <ParagraphStack
          paragraphs={structured.founderVerdict.paragraphs}
          dark={true}
        />
        <div className="pt-5">
          <NumberedList items={structured.founderVerdict.bullets} dark={true} />
        </div>
      </PencilCard>
    </div>
  )
}

function CompetitorField({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  if (!value) return null

  return (
    <div className="flex items-start gap-3">
      <p className="w-24 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9E9E9E]">
        {label}
      </p>
      <p className="flex-1 text-[11px] leading-[1.45] font-medium text-[#E6E6E6]">
        {value}
      </p>
    </div>
  )
}

function getCompetitorTag(competitor: CompetitiveAnalysisCompetitorProfile) {
  const haystack = [
    competitor.fields["Target Audience"],
    competitor.fields["Market Positioning"],
    competitor.fields["Core Product/Service"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (haystack.includes("editor")) return "EDITOR"
  if (haystack.includes("creator")) return "CREATOR"
  if (haystack.includes("podcast")) return "PODCAST"
  if (haystack.includes("meeting") || haystack.includes("knowledge")) return "TEAM"
  if (haystack.includes("enterprise")) return "ENTERPRISE"
  return "PROFILE"
}

function getCompetitorPitch(competitor: CompetitiveAnalysisCompetitorProfile) {
  return (
    competitor.fields["Market Positioning"] ??
    competitor.fields["Overview"] ??
    competitor.fields["Core Product/Service"] ??
    ""
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
      <div className="min-w-[1010px] border border-[#E0E0E0]">
        <div className="grid grid-cols-[180px_220px_150px_220px_minmax(240px,1fr)] gap-3 bg-[#0A0A0A] px-5 py-4">
          {["Competitor", "Positioning", "Pricing", "Audience", "Key Edge"].map(
            (label) => (
              <p
                key={label}
                className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white"
              >
                {label}
              </p>
            )
          )}
        </div>

        {competitors.map((competitor, index) => (
          <div
            key={`${competitor.heading}-comparison`}
            className={cn(
              "grid grid-cols-[180px_220px_150px_220px_minmax(240px,1fr)] gap-3 px-5 py-4",
              index > 0 && "border-t border-[#E0E0E0]"
            )}
          >
            <div>
              {competitor.websiteUrl ? (
                <a
                  href={competitor.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
                >
                  <span
                    className={cn(
                      displayFontClass,
                      "text-[13px] font-semibold text-[#0A0A0A]"
                    )}
                  >
                    {competitor.heading}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#0A0A0A]" />
                </a>
              ) : (
                <p
                  className={cn(
                    displayFontClass,
                    "text-[13px] font-semibold text-[#0A0A0A]"
                  )}
                >
                  {competitor.heading}
                </p>
              )}
            </div>
            <p className="text-[12px] leading-5 text-[#666666]">
              {competitor.fields["Market Positioning"] ?? ""}
            </p>
            <p className="text-[12px] leading-5 text-[#666666]">
              {competitor.fields["Pricing Model"] ?? ""}
            </p>
            <p className="text-[12px] leading-5 text-[#666666]">
              {competitor.fields["Target Audience"] ?? ""}
            </p>
            <p className="text-[12px] leading-5 text-primary">
              {getCompetitorKeyEdge(competitor)}
            </p>
          </div>
        ))}
      </div>
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
        title="Competitor Profiles & Fast Comparison"
        kicker="Competitive Intelligence"
      >
        <p className="mb-5 text-[13px] leading-6 text-[#666666]">
          Track how the field competes on positioning, pricing model, audience
          fit, and operational depth.
        </p>
        <FastComparisonTable competitors={competitors} />

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {competitors.map((competitor, index) => {
            return (
              <article
                key={competitor.heading}
                className={cn(
                  "border px-5 py-5",
                  competitors.length % 2 === 1 &&
                    index === competitors.length - 1 &&
                    "xl:col-span-2",
                  "border-[#0A0A0A] bg-[#0A0A0A]"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    {competitor.websiteUrl ? (
                      <a
                        href={competitor.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      >
                        <h3
                          className={cn(
                            displayFontClass,
                            "text-[18px] font-semibold tracking-[-0.03em] text-white"
                          )}
                        >
                          {competitor.heading}
                        </h3>
                        <ArrowUpRight className="h-3.5 w-3.5 text-white" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <h3
                          className={cn(
                            displayFontClass,
                            "text-[18px] font-semibold tracking-[-0.03em] text-white"
                          )}
                        >
                          {competitor.heading}
                        </h3>
                        <ArrowUpRight className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                      {getCompetitorTag(competitor)}
                    </p>
                  </div>
                  {getCompetitorPitch(competitor) ? (
                    <p className="text-[11px] leading-[1.35] text-[#FF7A73]">
                      {getCompetitorPitch(competitor)}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2">
                  <CompetitorField
                    label="Overview"
                    value={competitor.fields["Overview"]}
                  />
                  <CompetitorField
                    label="Core"
                    value={competitor.fields["Core Product/Service"]}
                  />
                  <CompetitorField
                    label="Positioning"
                    value={competitor.fields["Market Positioning"]}
                  />
                  <CompetitorField
                    label="Strengths"
                    value={competitor.fields["Strengths"]}
                  />
                  <CompetitorField
                    label="Limitations"
                    value={competitor.fields["Limitations"]}
                  />
                </div>

                <div className="mt-5 grid gap-2 border-t border-white/10 pt-3 md:grid-cols-2">
                  <p className="font-mono text-[10px] font-medium text-[#BDBDBD]">
                    Pricing: {competitor.fields["Pricing Model"] ?? "Unknown"}
                  </p>
                  <p className="font-mono text-[10px] font-medium text-[#BDBDBD]">
                    Audience: {competitor.fields["Target Audience"] ?? "Unknown"}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
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
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#999999]">
                X Axis
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#0A0A0A]">
                {positioningMap.xAxis ?? "Not specified"}
              </p>
            </div>
            <div className="border border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#999999]">
                Y Axis
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#0A0A0A]">
                {positioningMap.yAxis ?? "Not specified"}
              </p>
            </div>
          </div>
        )}

        <div className="relative h-[320px] border border-[#E0E0E0] bg-[#FAFAFA]">
          <div className="absolute inset-x-[14%] top-1/2 h-px bg-[#E0E0E0]" />
          <div className="absolute inset-y-[14%] left-1/2 w-px bg-[#E0E0E0]" />
          <p className="absolute bottom-3 left-4 max-w-[24%] whitespace-normal font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#777777]">
            Low {positioningMap.xAxis ?? "X"}
          </p>
          <p className="absolute bottom-3 right-4 max-w-[24%] whitespace-normal text-right font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#777777]">
            High {positioningMap.xAxis ?? "X"}
          </p>
          <p className="absolute left-4 top-3 max-w-[24%] whitespace-normal font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-[#777777]">
            High {positioningMap.yAxis ?? "Y"}
          </p>
          <p className="absolute right-4 top-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#777777]">
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
                      ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                      : tone === "muted"
                        ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                        : "border-[#E0E0E0] bg-white text-[#0A0A0A]"
                )}
                style={{
                  left: `${14 + normalizedX * 7.2}%`,
                  top: `${86 - normalizedY * 7.2}%`,
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.12em]">
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
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#999999]">
                  {point.competitor}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#0A0A0A]">
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
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#777777]">
        {label}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[#0A0A0A]">{value}</p>
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
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#666666]">
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
    <div className="space-y-6 bg-white p-6 md:p-8 xl:p-10">
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
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#666666]">
            Executive summary, founder verdict, and strategic direction.
          </p>
        </div>
      </header>

      <div id="overview-executive-summary">
        <SnapshotHero structured={structured} />
      </div>

      <div id="overview-founder-verdict">
        <CompetitorProfiles competitors={structured.directCompetitors} />
      </div>

      <div id="overview-strategic-recommendations">
        <SmallListCard
          title="Strategic Recommendations"
          items={structured.strategicRecommendations}
        />
      </div>
    </div>
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
    return null // Overview section already shows fallback markdown
  }

  const { structured } = viewModel

  return (
    <div className="space-y-6 bg-white p-6 md:p-8 xl:p-10">
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
    </div>
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
