"use client"

// Streaming preview of a Market Research document while it is being
// generated. Complete markdown sections render through the exact same
// designed block components production uses (via
// COMPETITIVE_DETAIL_SECTION_CONFIGS); the still-growing tail streams as
// prose following the block-commit rule: text may appear mid-sentence,
// structure (tables, cards) never renders half-finished.

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useSmoothedStream } from "@/hooks/use-smoothed-stream"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { displayFontClass } from "@/components/analysis/planning-blocks-shared"
import {
  COMPETITIVE_DETAIL_SECTION_CONFIGS,
  CompetitiveOverviewBody,
  TopLevelDocumentHeader,
  WorkspaceDesignedSection,
  type CompetitiveDetailSectionConfig,
} from "@/components/analysis/competitive-analysis-document"
import { CompetitorMentionLinksProvider } from "@/components/analysis/competitor-mention-links"
import { extractSectionsByHeading } from "@/lib/planning-document-parser"
import {
  type CompetitiveAnalysisV2ParseResult,
  getCompetitiveAnalysisStructuredData,
} from "@/lib/competitive-analysis-v2"
import {
  getSafeStreamTail,
  parseStreamingCompetitiveAnalysis,
  sanitizeLiveSectionContent,
  type StreamingCompetitiveParseResult,
} from "@/lib/competitive-analysis-streaming"

export type CompetitiveStreamingVariant = "block-commit" | "skeleton" | "ticker" | "live-fill"

/**
 * Which portion of the document to render. The workspace splits the stream
 * across its Executive Summary ("overview") and Market Research ("detail")
 * sections; the Motion Lab renders everything in one place ("full").
 */
export type CompetitiveStreamingParts = "full" | "overview" | "detail"

interface CompetitiveStreamingDocumentProps {
  /** Raw partial (or complete) competitive-analysis markdown; smoothing happens inside */
  content: string
  /** True once the generation stream has ended */
  finished: boolean
  variant: CompetitiveStreamingVariant
  parts?: CompetitiveStreamingParts
  projectName?: string
  className?: string
  /** Disable the internal word-by-word reveal (dev tooling that pre-smooths) */
  smoothTail?: boolean
  /**
   * Live competitor source pairs streamed alongside the partial markdown
   * (from generation_queue_items.partial_metadata), so competitor mention
   * links render during streaming instead of only after the saved row loads.
   */
  competitorSources?: { name: string; url: string }[]
}

const TOTAL_SECTIONS = COMPETITIVE_DETAIL_SECTION_CONFIGS.length

function buildStructuredData(
  parse: StreamingCompetitiveParseResult,
  /** Active (still-growing) section to expose to the designed renderers, live-fill only */
  liveSection?: { name: NonNullable<StreamingCompetitiveParseResult["sections"][number]["name"]>; content: string } | null,
  /** Server-streamed competitor source pairs; validated through the metadata path */
  competitorSources?: { name: string; url: string }[]
) {
  const sections: CompetitiveAnalysisV2ParseResult["sections"] = {}
  for (const section of parse.sections) {
    if (section.complete && section.name) {
      sections[section.name] = section.content
    }
  }
  if (liveSection) {
    sections[liveSection.name] = liveSection.content
  }

  const parsedLike: CompetitiveAnalysisV2ParseResult = {
    isValid: false,
    headings: parse.sections.map((section) => section.heading),
    sections,
    competitorEntries: extractSectionsByHeading(sections["Direct Competitors"] ?? "", 3),
    errors: [],
  }

  // Shape the streamed pairs exactly like saved analyses metadata so the same
  // validation (syntactic public http(s), fail-closed) applies. The parsed-URL
  // fallback stays off: streaming never promotes model-authored H3 URLs.
  const metadataLike =
    competitorSources && competitorSources.length > 0
      ? { live_research: { competitor_sources: competitorSources } }
      : undefined

  return getCompetitiveAnalysisStructuredData(parsedLike, metadataLike, {
    allowParsedSourceFallback: false,
  })
}

function StreamStatusLabel({ label }: { label: string }) {
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
}: {
  title: string
  index?: number
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
      <div className="flex items-center gap-3">
        <h2 className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#0A0A0A]")}>
          {title}
        </h2>
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
      <StreamingSectionHeader title={title} index={index} />
      {tail.visibleText ? <MarkdownRenderer content={tail.visibleText} /> : null}
      {tail.buffering === "table" ? (
        <AssemblingChip label="Assembling comparison table" />
      ) : (
        <span className="stream-caret" aria-hidden="true" />
      )}
    </section>
  )
}

/**
 * Whether the active section's partial body has enough parseable substance
 * for its designed block to render something real instead of an empty state.
 */
function liveSectionHasRenderableData(config: CompetitiveDetailSectionConfig | null, content: string) {
  // The competitor table's empty state is a "profiles not found" card; wait
  // for the first `### Name` so the table frame is what appears first.
  if (config?.id === "market-research-direct-competitors") {
    return /^###\s+\S/m.test(content)
  }
  return content.trim().length > 0
}

/** Active section rendered through its real designed block while text streams into it. */
function LiveFillSection({
  title,
  index,
  children,
}: {
  title: string
  index?: number
  children: React.ReactNode
}) {
  return (
    <section className="stream-snap-in">
      <StreamingSectionHeader title={title} index={index} />
      {children}
    </section>
  )
}

function SkeletonBars() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-3 w-[92%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
      <div className="h-3 w-[84%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
      <div className="h-3 w-[55%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
    </div>
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
      <SkeletonBars />
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
  smoothTail = true,
  competitorSources,
}: CompetitiveStreamingDocumentProps) {
  // Structure, section membership, and competitor sources (the mention-link
  // regex) all derive from the raw poll content (~3s cadence). The per-tick
  // word reveal below touches none of these memos.
  const parse = useMemo(
    () => parseStreamingCompetitiveAnalysis(content, { finished }),
    [content, finished]
  )
  const liveFill = variant === "live-fill"
  const structured = useMemo(() => {
    const active = parse.activeSection
    const liveSection =
      liveFill && active?.name
        ? { name: active.name, content: sanitizeLiveSectionContent(active.content) }
        : null
    return buildStructuredData(parse, liveSection, competitorSources)
  }, [parse, liveFill, competitorSources])

  const executiveComplete = parse.completeSectionNames.has("Executive Summary")
  const activeSection = parse.activeSection

  // Word-by-word reveal of the active section's prose tail only. The timer
  // lives in this leaf and dies with it when the saved document swaps in.
  const reveal = smoothTail && !finished
  const { text: smoothedActiveBody } = useSmoothedStream(activeSection?.content ?? "", {
    enabled: reveal,
    resetKey: activeSection?.name ?? null,
  })
  const activeTail = reveal ? smoothedActiveBody : activeSection?.content ?? ""
  const showProseTail = variant !== "ticker" && !liveFill && activeSection !== null
  const showOverview = parts !== "detail"
  const showDetail = parts !== "overview"

  const configComplete = (config: CompetitiveDetailSectionConfig) =>
    config.v2Sections.every((name) => parse.completeSectionNames.has(name))

  const activeConfigIndex = COMPETITIVE_DETAIL_SECTION_CONFIGS.findIndex(
    (config) => activeSection?.name != null && config.v2Sections.includes(activeSection.name)
  )

  return (
    <CompetitorMentionLinksProvider sources={structured.competitorSources}>
      <div className={cn("flex flex-col gap-y-10", className)}>
      {/* Executive Summary. The standalone workspace section ("overview")
          mirrors the saved document exactly: same top-level header, no inner
          H2, so the swap to the saved document does not reflow. */}
      {showOverview && parts === "overview" ? (
        <section id="executive-summary" className="flex flex-col gap-y-3 gap-x-0">
          <TopLevelDocumentHeader
            title="Executive Summary"
            description="Market snapshot, entry assessment, and key risk."
          />
          {executiveComplete ? (
            <div className="stream-snap-in">
              <CompetitiveOverviewBody structured={structured} projectName={projectName} />
            </div>
          ) : liveFill &&
            activeSection?.name === "Executive Summary" &&
            liveSectionHasRenderableData(null, activeSection.content) ? (
            <div className="stream-snap-in">
              <CompetitiveOverviewBody structured={structured} projectName={projectName} />
            </div>
          ) : showProseTail && activeSection?.name === "Executive Summary" ? (
            <ActiveStreamingSection title="Executive Summary" rawContent={activeTail} />
          ) : (
            <SkeletonBars />
          )}
        </section>
      ) : null}

      {showOverview && parts !== "overview" ? (
        executiveComplete ? (
          <section className="stream-snap-in">
            <StreamingSectionHeader title="Executive Summary" />
            <CompetitiveOverviewBody structured={structured} projectName={projectName} />
          </section>
        ) : showProseTail && activeSection?.name === "Executive Summary" ? (
          <ActiveStreamingSection title="Executive Summary" rawContent={activeTail} />
        ) : liveFill &&
          activeSection?.name === "Executive Summary" &&
          liveSectionHasRenderableData(null, activeSection.content) ? (
          <LiveFillSection title="Executive Summary">
            <CompetitiveOverviewBody structured={structured} projectName={projectName} />
          </LiveFillSection>
        ) : variant === "skeleton" || liveFill ? (
          <SkeletonSection title="Executive Summary" />
        ) : null
      ) : null}

      {/* Standalone Market Research section: same top-level header the saved
          document renders, so streaming and saved states line up. */}
      {parts === "detail" ? (
        <TopLevelDocumentHeader
          title="Market Research"
          description="Competitive landscape, customer segments, positioning, and recommended next moves."
        />
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
                  rawContent={activeTail}
                />
              )
            }

            if (
              liveFill &&
              index === activeConfigIndex &&
              activeSection?.name &&
              liveSectionHasRenderableData(config, activeSection.content)
            ) {
              return (
                <LiveFillSection key={config.id} title={config.title} index={index + 1}>
                  {config.render(structured)}
                </LiveFillSection>
              )
            }

            if (variant === "skeleton" || liveFill) {
              return <SkeletonSection key={config.id} title={config.title} index={index + 1} />
            }

            return null
          })
        : null}

      {/* A recognized document can stream sections we do not map to a designed
          block (unknown headings); show them as prose so nothing is lost. */}
      {showDetail && (showProseTail || liveFill) && activeSection && activeSection.name === null ? (
        <ActiveStreamingSection title={activeSection.heading} rawContent={activeTail} />
      ) : null}

      {/* Before the first heading arrives */}
      {showOverview && parse.sections.length === 0 && !finished && variant !== "skeleton" && !liveFill ? (
        <div className="flex items-center gap-3 border border-dashed border-[#D8CEC5] bg-[#FAFAFA] px-5 py-4">
          <StreamStatusLabel label="Starting market research" />
        </div>
      ) : null}
      </div>
    </CompetitorMentionLinksProvider>
  )
}
