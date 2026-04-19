// src/components/layout/scrollable-content.tsx
"use client"

import React, { forwardRef, useMemo, useState, useEffect, useCallback } from "react"
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
 * Renders a markdown document and injects anchor divs at H2 boundaries
 * so sub-section scroll targeting works from the AnchorNav.
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
  const navItem = SCROLLABLE_NAV_ITEMS.find((item) => item.key === navKey)
  const sections = navItem?.sections ?? []

  // Split markdown content at H2 headings and wrap each in an anchor div
  const chunks = useMemo(() => {
    if (sections.length === 0) return [{ id: null, content }]

    // Split at ## headings (H2)
    const h2Regex = /^(## .+)$/gm
    const parts: { id: string | null; content: string }[] = []
    let lastIndex = 0
    let sectionIdx = 0
    let match: RegExpExecArray | null

    while ((match = h2Regex.exec(content)) !== null) {
      // Content before this heading (or between headings)
      if (match.index > lastIndex) {
        const before = content.slice(lastIndex, match.index).trim()
        if (before && parts.length === 0) {
          parts.push({ id: null, content: before })
        }
      }

      // Find the next H2 or end of content
      const nextMatch = h2Regex.exec(content)
      const endIdx = nextMatch ? nextMatch.index : content.length

      // Reset regex position for the loop
      if (nextMatch) {
        h2Regex.lastIndex = match.index + match[0].length
      }

      const sectionContent = content.slice(match.index, endIdx).trim()
      const sectionId = sectionIdx < sections.length ? sections[sectionIdx].id : null
      parts.push({ id: sectionId, content: sectionContent })
      sectionIdx++

      lastIndex = endIdx
    }

    // If no H2 headings found, return the whole content
    if (parts.length === 0) {
      return [{ id: sections[0]?.id ?? null, content }]
    }

    return parts
  }, [content, sections])

  return (
    <div className="space-y-6">
      {chunks.map((chunk, idx) => (
        <div key={chunk.id ?? idx} id={chunk.id ?? undefined}>
          <MarkdownRenderer content={chunk.content} projectId={projectId} />
        </div>
      ))}
    </div>
  )
}

/**
 * Renders a single Stitch mockup concept as an iframe card with a header.
 */
function StitchConceptCard({
  label,
  title,
  htmlUrl,
}: {
  label: string
  title: string
  htmlUrl: string
}) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const proxyUrl = `/api/stitch/html?url=${encodeURIComponent(htmlUrl)}`
    setLoading(true)
    fetch(proxyUrl)
      .then((res) => res.text())
      .then((fetchedHtml) => setHtml(fetchedHtml))
      .catch((err) => console.error("[StitchConcept] Failed to load HTML:", err))
      .finally(() => setLoading(false))
  }, [htmlUrl])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Option {label}
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-muted/10">
        <div className="flex justify-center bg-[repeating-conic-gradient(rgb(0_0_0/0.02)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
          <div className="w-full bg-white">
            {loading ? (
              <div className="flex items-center justify-center bg-white" style={{ height: "600px" }}>
                <div className="flex flex-col items-center gap-3 text-zinc-400">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500" />
                  <span className="text-xs">Loading design...</span>
                </div>
              </div>
            ) : (
              <iframe
                srcDoc={html ?? ""}
                className="w-full border-0"
                style={{ height: "600px" }}
                title={`Mockup Option ${label}`}
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders mockups section with individual concept cards, each with an anchor ID.
 */
function MockupsSection({ content }: { content: string }) {
  const stitchData = useMemo(() => {
    try {
      const parsed = JSON.parse(content)
      if (parsed?.type === "stitch" && Array.isArray(parsed.options)) {
        return parsed.options as { label: string; title: string; htmlUrl: string; imageUrl: string }[]
      }
      return null
    } catch {
      return null
    }
  }, [content])

  // Stitch format: render each concept as a separate anchored card
  if (stitchData && stitchData.length > 0) {
    return (
      <div className="space-y-8">
        {stitchData.map((option, idx) => (
          <div key={option.label} id={`mockups-concept-${idx + 1}`}>
            <StitchConceptCard
              label={option.label}
              title={option.title}
              htmlUrl={option.htmlUrl}
            />
          </div>
        ))}
      </div>
    )
  }

  // Fallback: render with the original MockupRenderer
  return <MockupRenderer content={content} />
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
            <MockupsSection content={mockupsData.content} />
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
