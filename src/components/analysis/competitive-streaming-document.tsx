"use client"

// Streaming preview of a Market Research document while it is being
// generated. Complete markdown sections render through the exact same
// designed block components production uses (via
// COMPETITIVE_DETAIL_SECTION_CONFIGS); the still-growing tail streams as
// prose following the block-commit rule: text may appear mid-sentence,
// structure (tables, cards) never renders half-finished.

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { displayFontClass } from "@/components/analysis/planning-blocks-shared"
import {
  COMPETITIVE_DETAIL_SECTION_CONFIGS,
  CompetitiveOverviewBody,
  WorkspaceDesignedSection,
  type CompetitiveDetailSectionConfig,
} from "@/components/analysis/competitive-analysis-document"
import { extractSectionsByHeading } from "@/lib/planning-document-parser"
import {
  type CompetitiveAnalysisV2ParseResult,
  getCompetitiveAnalysisStructuredData,
} from "@/lib/competitive-analysis-v2"
import {
  getSafeStreamTail,
  parseStreamingCompetitiveAnalysis,
  type StreamingCompetitiveParseResult,
} from "@/lib/competitive-analysis-streaming"

export type CompetitiveStreamingVariant = "block-commit" | "skeleton" | "ticker"

/**
 * Which portion of the document to render. The workspace splits the stream
 * across its Executive Summary ("overview") and Market Research ("detail")
 * sections; the Motion Lab renders everything in one place ("full").
 */
export type CompetitiveStreamingParts = "full" | "overview" | "detail"

interface CompetitiveStreamingDocumentProps {
  /** Partial (or complete) competitive-analysis markdown */
  content: string
  /** True once the generation stream has ended */
  finished: boolean
  variant: CompetitiveStreamingVariant
  parts?: CompetitiveStreamingParts
  projectName?: string
  className?: string
}

const TOTAL_SECTIONS = COMPETITIVE_DETAIL_SECTION_CONFIGS.length

function buildStructuredData(parse: StreamingCompetitiveParseResult) {
  const sections: CompetitiveAnalysisV2ParseResult["sections"] = {}
  for (const section of parse.sections) {
    if (section.complete && section.name) {
      sections[section.name] = section.content
    }
  }

  const parsedLike: CompetitiveAnalysisV2ParseResult = {
    isValid: false,
    headings: parse.sections.map((section) => section.heading),
    sections,
    competitorEntries: extractSectionsByHeading(sections["Direct Competitors"] ?? "", 3),
    errors: [],
  }

  return getCompetitiveAnalysisStructuredData(parsedLike)
}

function StreamStatusLabel({ label = "Writing" }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
      <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
      {label}
    </span>
  )
}

function StreamingSectionHeader({
  title,
  index,
  status,
}: {
  title: string
  index?: number
  status?: "writing" | null
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
      <div className="flex items-center gap-3">
        <h2 className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#0A0A0A]")}>
          {title}
        </h2>
        {status === "writing" ? <StreamStatusLabel /> : null}
      </div>
      {typeof index === "number" ? (
        <p className="shrink-0 font-mono text-[13px] tracking-[0.1em] text-[#8A8480]">
          {String(index).padStart(2, "0")} / {String(TOTAL_SECTIONS).padStart(2, "0")}
        </p>
      ) : null}
    </div>
  )
}

function AssemblingChip({ label }: { label: string }) {
  return (
    <div className="mt-4 inline-flex items-center gap-2.5 border border-dashed border-[#D8CEC5] bg-[#FAFAFA] px-4 py-2.5">
      <span
        aria-hidden="true"
        className="size-2.5 animate-spin rounded-full border-[1.5px] border-[#D8CEC5] border-t-primary motion-reduce:animate-none"
      />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#8A8480]">
        {label}
      </span>
    </div>
  )
}

/** The still-growing section: heading, safe prose tail with caret, and an assembling chip while structure buffers. */
function ActiveStreamingSection({
  title,
  index,
  rawContent,
}: {
  title: string
  index?: number
  rawContent: string
}) {
  const tail = getSafeStreamTail(rawContent)

  return (
    <section className="stream-snap-in">
      <StreamingSectionHeader title={title} index={index} status="writing" />
      {tail.visibleText ? <MarkdownRenderer content={tail.visibleText} /> : null}
      {tail.buffering === "table" ? (
        <AssemblingChip label="Assembling comparison table" />
      ) : (
        <span className="stream-caret" aria-hidden="true" />
      )}
    </section>
  )
}

function SkeletonSection({ title, index }: { title: string; index?: number }) {
  return (
    <section aria-hidden="true">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <p className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#C9C1B8]")}>
          {title}
        </p>
        {typeof index === "number" ? (
          <p className="shrink-0 font-mono text-[13px] tracking-[0.1em] text-[#D8CEC5]">
            {String(index).padStart(2, "0")} / {String(TOTAL_SECTIONS).padStart(2, "0")}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">
        <div className="h-3 w-[92%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
        <div className="h-3 w-[84%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
        <div className="h-3 w-[55%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
      </div>
    </section>
  )
}

export function CompetitiveStreamingDocument({
  content,
  finished,
  variant,
  parts = "full",
  projectName,
  className,
}: CompetitiveStreamingDocumentProps) {
  const parse = useMemo(
    () => parseStreamingCompetitiveAnalysis(content, { finished }),
    [content, finished]
  )
  const structured = useMemo(() => buildStructuredData(parse), [parse])

  const executiveComplete = parse.completeSectionNames.has("Executive Summary")
  const activeSection = parse.activeSection
  const showProseTail = variant !== "ticker" && activeSection !== null
  const showOverview = parts !== "detail"
  const showDetail = parts !== "overview"

  const configComplete = (config: CompetitiveDetailSectionConfig) =>
    config.v2Sections.every((name) => parse.completeSectionNames.has(name))

  const activeConfigIndex = COMPETITIVE_DETAIL_SECTION_CONFIGS.findIndex(
    (config) => activeSection?.name != null && config.v2Sections.includes(activeSection.name)
  )

  return (
    <div className={cn("flex flex-col gap-y-10", className)}>
      {/* Executive Summary */}
      {showOverview ? (
        executiveComplete ? (
          <section className="stream-snap-in">
            <StreamingSectionHeader title="Executive Summary" />
            <CompetitiveOverviewBody structured={structured} projectName={projectName} />
          </section>
        ) : showProseTail && activeSection?.name === "Executive Summary" ? (
          <ActiveStreamingSection title="Executive Summary" rawContent={activeSection.content} />
        ) : variant === "skeleton" ? (
          <SkeletonSection title="Executive Summary" />
        ) : null
      ) : null}

      {/* Designed detail sections, in contract order */}
      {showDetail
        ? COMPETITIVE_DETAIL_SECTION_CONFIGS.map((config, index) => {
            if (configComplete(config)) {
              return (
                <div key={config.id} className="stream-snap-in">
                  <WorkspaceDesignedSection
                    id={`streaming-${config.id}`}
                    kicker={config.kicker}
                    title={config.title}
                    index={index + 1}
                    total={TOTAL_SECTIONS}
                  >
                    {config.render(structured)}
                  </WorkspaceDesignedSection>
                </div>
              )
            }

            if (showProseTail && index === activeConfigIndex && activeSection) {
              return (
                <ActiveStreamingSection
                  key={config.id}
                  title={config.title}
                  index={index + 1}
                  rawContent={activeSection.content}
                />
              )
            }

            if (variant === "skeleton") {
              return <SkeletonSection key={config.id} title={config.title} index={index + 1} />
            }

            return null
          })
        : null}

      {/* A recognized document can stream sections we do not map to a designed
          block (unknown headings); show them as prose so nothing is lost. */}
      {showDetail && showProseTail && activeSection && activeSection.name === null ? (
        <ActiveStreamingSection title={activeSection.heading} rawContent={activeSection.content} />
      ) : null}

      {/* Before the first heading arrives */}
      {showOverview && parse.sections.length === 0 && !finished && variant !== "skeleton" ? (
        <div className="flex items-center gap-3 border border-dashed border-[#D8CEC5] bg-[#FAFAFA] px-5 py-4">
          <StreamStatusLabel label="Starting market research" />
        </div>
      ) : null}
    </div>
  )
}
