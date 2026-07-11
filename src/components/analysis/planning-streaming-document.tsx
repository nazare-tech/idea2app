"use client"

// Streaming preview of a Product Plan or First Version Plan while it is
// being generated. Complete markdown sections render through the exact same
// designed block renderers production uses (CurrentPrdDocumentBlocks /
// CurrentMvpPlanDocumentBlocks); sections that have not arrived yet show as
// titled skeletons so the remaining work is visible from the first token.

import { useMemo } from "react"

import { cn } from "@/lib/utils"
import {
  parseStreamingPlanningDocument,
  sanitizeStreamingPlanningTail,
} from "@/lib/planning-document-streaming"
import { useSmoothedStream } from "@/hooks/use-smoothed-stream"
import {
  displayFontClass,
  getSectionByAlias,
} from "@/components/analysis/planning-blocks-shared"
import {
  CurrentPrdDocumentBlocks,
  PRD_STREAMING_EXPECTED_SECTIONS,
} from "@/components/analysis/product-plan-blocks"
import {
  CurrentMvpPlanDocumentBlocks,
  MVP_STREAMING_EXPECTED_SECTIONS,
} from "@/components/analysis/first-version-plan-blocks"

export type PlanningStreamingDocType = "prd" | "mvp"

interface PlanningStreamingDocumentProps {
  docType: PlanningStreamingDocType
  /** Raw partial (or complete) planning-document markdown; smoothing happens inside */
  content: string
  /** True once the generation stream has ended */
  finished: boolean
  projectId: string
  className?: string
  /** Disable the internal word-by-word reveal (dev tooling that pre-smooths) */
  smoothTail?: boolean
}

function StreamingSkeletonSection({ title }: { title: string }) {
  return (
    <section aria-hidden="true">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E8DDD5] pb-6">
        <p className={cn(displayFontClass, "text-[22px] font-bold tracking-[-0.03em] text-[#C9C1B8]")}>
          {title}
        </p>
      </div>
      <div className="space-y-3">
        <div className="h-3 w-[92%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
        <div className="h-3 w-[84%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
        <div className="h-3 w-[55%] animate-pulse bg-[#F1ECE7] motion-reduce:animate-none" />
      </div>
    </section>
  )
}

export function PlanningStreamingDocument({
  docType,
  content,
  finished,
  projectId,
  className,
  smoothTail = true,
}: PlanningStreamingDocumentProps) {
  // Structure is derived from the raw poll content (~3s cadence): complete
  // sections, their markdown, and the still-growing active section. The
  // per-tick word reveal below never re-parses this.
  const structure = useMemo(() => {
    const { preamble, sections } = parseStreamingPlanningDocument(content, { finished })
    const complete = sections.filter((section) => section.complete)
    const active = sections.find((section) => !section.complete) ?? null
    const parts: string[] = []
    if (preamble) parts.push(preamble)
    for (const section of complete) {
      parts.push(`## ${section.heading}\n\n${section.content}`.trimEnd())
    }
    return { completeMarkdown: parts.join("\n\n"), complete, active }
  }, [content, finished])

  // Only the active section's prose tail is smoothed word-by-word; the
  // interval lives in this leaf, so ticks re-render the streaming document
  // alone, and it unmounts (killing the timer) once the saved doc loads.
  const reveal = smoothTail && !finished
  const { text: smoothedActiveBody } = useSmoothedStream(structure.active?.content ?? "", {
    enabled: reveal,
    resetKey: structure.active?.heading ?? null,
  })

  const markdown = useMemo(() => {
    if (!structure.active) return structure.completeMarkdown
    const body = reveal
      ? sanitizeStreamingPlanningTail(smoothedActiveBody)
      : finished
        ? structure.active.content
        : sanitizeStreamingPlanningTail(structure.active.content)
    const activePart = `## ${structure.active.heading}\n\n${body}`.trimEnd()
    return [structure.completeMarkdown, activePart].filter(Boolean).join("\n\n")
  }, [structure, reveal, finished, smoothedActiveBody])

  const expectedSections =
    docType === "prd" ? PRD_STREAMING_EXPECTED_SECTIONS : MVP_STREAMING_EXPECTED_SECTIONS
  // Skeleton set changes only when the section structure does (per poll),
  // not per reveal tick.
  const upcomingSections = useMemo(() => {
    const arrived = [...structure.complete, ...(structure.active ? [structure.active] : [])]
    return expectedSections.filter(
      (expected) => !getSectionByAlias(arrived, [...expected.aliases]),
    )
  }, [structure, expectedSections])

  return (
    <div className={cn("flex flex-col gap-16", className)}>
      {docType === "prd" ? (
        <CurrentPrdDocumentBlocks content={markdown} projectId={projectId} />
      ) : (
        <CurrentMvpPlanDocumentBlocks content={markdown} projectId={projectId} />
      )}
      {upcomingSections.map((expected) => (
        <StreamingSkeletonSection key={expected.title} title={expected.title} />
      ))}
    </div>
  )
}
