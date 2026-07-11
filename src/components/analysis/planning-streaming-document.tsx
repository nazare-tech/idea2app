"use client"

// Streaming preview of a Product Plan or First Version Plan while it is
// being generated. Complete markdown sections render through the exact same
// designed block renderers production uses (CurrentPrdDocumentBlocks /
// CurrentMvpPlanDocumentBlocks); sections that have not arrived yet show as
// titled skeletons so the remaining work is visible from the first token.

import { useMemo } from "react"

import { cn } from "@/lib/utils"
import { buildStreamingPlanningMarkdown } from "@/lib/planning-document-streaming"
import { extractSectionsByHeading } from "@/lib/planning-document-parser"
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
  /** Partial (or complete) planning-document markdown */
  content: string
  /** True once the generation stream has ended */
  finished: boolean
  projectId: string
  className?: string
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
}: PlanningStreamingDocumentProps) {
  const { markdown } = useMemo(
    () => buildStreamingPlanningMarkdown(content, { finished }),
    [content, finished],
  )
  const sections = useMemo(() => extractSectionsByHeading(markdown, 2), [markdown])

  const expectedSections =
    docType === "prd" ? PRD_STREAMING_EXPECTED_SECTIONS : MVP_STREAMING_EXPECTED_SECTIONS
  const upcomingSections = expectedSections.filter(
    (expected) => !getSectionByAlias(sections, [...expected.aliases]),
  )

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
