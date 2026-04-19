// src/components/layout/scrollable-content.tsx
"use client"

import { forwardRef } from "react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import {
  CompetitiveOverviewSection,
  CompetitiveDetailSection,
} from "@/components/analysis/competitive-analysis-document"
import { SCROLLABLE_NAV_ITEMS } from "@/lib/document-sections"
import type { DocumentType } from "@/lib/document-definitions"
import type { StreamStage } from "@/lib/parse-document-stream"

interface DocumentData {
  content: string | null
  metadata?: Record<string, unknown> | null
  isGenerating: boolean
  streamStages?: StreamStage[]
  streamCurrentStep?: number
  streamContent?: string
}

interface ScrollableContentProps {
  projectId: string
  projectName: string
  /** Content and state for each source document type */
  documents: Record<string, DocumentData>
}

function DocumentSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
      <p className="text-xs text-muted-foreground">Generating {label}...</p>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
      {label} has not been generated yet.
    </div>
  )
}

function DocumentWrapper({
  navKey,
  children,
}: {
  navKey: string
  children: React.ReactNode
}) {
  return (
    <div
      id={navKey}
      className="bg-white border border-[#E5E5E5]"
      data-section={navKey}
    >
      <div className="px-10 py-8">
        {children}
      </div>
    </div>
  )
}

/**
 * Renders a markdown document with section anchor IDs injected.
 * Section IDs are derived from the nav item's section definitions.
 */
function MarkdownDocumentSection({
  content,
  projectId,
  navKey,
}: {
  content: string
  projectId: string
  navKey: string
}) {
  // Find the nav item to get section definitions
  const navItem = SCROLLABLE_NAV_ITEMS.find((item) => item.key === navKey)

  return (
    <div className="space-y-6">
      <MarkdownRenderer content={content} projectId={projectId} />
      {/* Section anchors are placed via the heading IDs in MarkdownRenderer.
          For sub-section scroll targeting, we rely on heading text matching.
          A future enhancement could inject anchor divs at H2/H3 boundaries. */}
    </div>
  )
}

export const ScrollableContent = forwardRef<HTMLDivElement, ScrollableContentProps>(
  function ScrollableContent({ projectId, projectName, documents }, ref) {
    const competitiveData = documents["competitive"]
    const prdData = documents["prd"]
    const mvpData = documents["mvp"]
    const mockupsData = documents["mockups"]
    const launchData = documents["launch"]

    return (
      <div
        ref={ref}
        className="flex-1 overflow-y-auto bg-[#FAFAFA] px-6 py-5 space-y-3"
      >
        {/* Overview (competitive analysis — summary portion) */}
        <DocumentWrapper navKey="overview">
          {competitiveData?.isGenerating ? (
            <DocumentSkeleton label="Overview" />
          ) : competitiveData?.content ? (
            <CompetitiveOverviewSection
              content={competitiveData.content}
              metadata={competitiveData.metadata}
              projectId={projectId}
            />
          ) : (
            <EmptyState label="Overview" />
          )}
        </DocumentWrapper>

        {/* Market Research (competitive analysis — detail portion) */}
        <DocumentWrapper navKey="market-research">
          {competitiveData?.isGenerating ? (
            <DocumentSkeleton label="Market Research" />
          ) : competitiveData?.content ? (
            <CompetitiveDetailSection
              content={competitiveData.content}
              metadata={competitiveData.metadata}
              projectId={projectId}
            />
          ) : (
            <EmptyState label="Market Research" />
          )}
        </DocumentWrapper>

        {/* PRD */}
        <DocumentWrapper navKey="prd">
          {prdData?.isGenerating ? (
            <DocumentSkeleton label="PRD" />
          ) : prdData?.content ? (
            <MarkdownDocumentSection
              content={prdData.content}
              projectId={projectId}
              navKey="prd"
            />
          ) : (
            <EmptyState label="PRD" />
          )}
        </DocumentWrapper>

        {/* MVP Plan */}
        <DocumentWrapper navKey="mvp">
          {mvpData?.isGenerating ? (
            <DocumentSkeleton label="MVP Plan" />
          ) : mvpData?.content ? (
            <MarkdownDocumentSection
              content={mvpData.content}
              projectId={projectId}
              navKey="mvp"
            />
          ) : (
            <EmptyState label="MVP Plan" />
          )}
        </DocumentWrapper>

        {/* Mockups */}
        <DocumentWrapper navKey="mockups">
          {mockupsData?.isGenerating ? (
            <DocumentSkeleton label="Mockups" />
          ) : mockupsData?.content ? (
            <MockupRenderer content={mockupsData.content} />
          ) : (
            <EmptyState label="Mockups" />
          )}
        </DocumentWrapper>

        {/* Marketing */}
        <DocumentWrapper navKey="launch">
          {launchData?.isGenerating ? (
            <DocumentSkeleton label="Marketing" />
          ) : launchData?.content ? (
            <MarkdownDocumentSection
              content={launchData.content}
              projectId={projectId}
              navKey="launch"
            />
          ) : (
            <EmptyState label="Marketing" />
          )}
        </DocumentWrapper>
      </div>
    )
  }
)
