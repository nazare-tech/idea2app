// src/components/layout/scrollable-content.tsx
"use client"

import React, { forwardRef, useRef, useMemo, useState, useEffect } from "react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import {
  CompetitiveOverviewSection,
  CompetitiveDetailSection,
} from "@/components/analysis/competitive-analysis-document"
import { SCROLLABLE_NAV_ITEMS } from "@/lib/document-sections"
import type { StreamStage } from "@/lib/parse-document-stream"
import { cn } from "@/lib/utils"

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
  documents: Record<string, DocumentData>
}

function DocumentSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:p-8">
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
    <div className="flex items-center justify-center p-6 text-center text-sm text-muted-foreground sm:p-12">
      {label} has not been generated yet.
    </div>
  )
}

function DocumentWrapper({
  navKey,
  contentClassName,
  children,
}: {
  navKey: string
  contentClassName?: string
  children: React.ReactNode
}) {
  return (
    <div
      id={navKey}
      className="rounded-lg border border-border-subtle bg-card"
      data-section={navKey}
    >
      <div className={cn("px-5 py-6 sm:px-8 lg:px-10 lg:py-8", contentClassName)}>
        {children}
      </div>
    </div>
  )
}

/**
 * Renders a markdown document as a single MarkdownRenderer instance.
 * After the DOM renders, injects anchor IDs onto H2 elements by position
 * so sub-tab scroll targeting works from the AnchorNav.
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
  const containerRef = useRef<HTMLDivElement>(null)
  const navItem = SCROLLABLE_NAV_ITEMS.find((item) => item.key === navKey)
  const sections = useMemo(() => navItem?.sections ?? [], [navItem?.sections])

  // After render, stamp anchor IDs onto H2 headings by their ordinal position.
  // This is intentionally post-render DOM work so it doesn't block the initial paint.
  useEffect(() => {
    if (!containerRef.current || sections.length === 0) return
    const h2s = containerRef.current.querySelectorAll("h2")
    h2s.forEach((h2, idx) => {
      if (idx < sections.length) {
        h2.id = sections[idx].id
      }
    })
  }, [content, sections])

  return (
    <div ref={containerRef}>
      <MarkdownRenderer content={content} projectId={projectId} />
    </div>
  )
}

/**
 * Renders a single Stitch mockup concept as a two-column card:
 * iframe on the left, description + download button on the right.
 */
function StitchConceptCard({
  label,
  title,
  htmlUrl,
  description,
  projectId,
}: {
  label: string
  title: string
  htmlUrl: string
  description?: string
  projectId: string
}) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const proxyUrl = `/api/stitch/html?url=${encodeURIComponent(htmlUrl)}&projectId=${encodeURIComponent(projectId)}`
    setLoading(true)
    fetch(proxyUrl)
      .then((res) => res.text())
      .then((fetchedHtml) => setHtml(fetchedHtml))
      .catch((err) => console.error("[StitchConcept] Failed to load HTML:", err))
      .finally(() => setLoading(false))
  }, [htmlUrl, projectId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Reuse already-fetched HTML if available, otherwise fetch via proxy
      const content: string = html ?? (await fetch(`/api/stitch/html?url=${encodeURIComponent(htmlUrl)}&projectId=${encodeURIComponent(projectId)}`).then((r) => r.text()))
      const blob = new Blob([content], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mockup-option-${label.toLowerCase()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[StitchConcept] Download failed:", err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      {/* Full-width header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Option {label}
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>

      {/* Two-column body */}
      <div className="flex min-h-[420px] flex-col lg:min-h-[600px] lg:flex-row">
        {/* Left: iframe */}
        <div className="flex-1 bg-[repeating-conic-gradient(rgb(0_0_0/0.02)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
          {loading ? (
            <div className="flex h-full min-h-[420px] items-center justify-center bg-white lg:min-h-[600px]">
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500" />
                <span className="text-xs">Loading design...</span>
              </div>
            </div>
          ) : (
            <iframe
              srcDoc={html ?? ""}
              className="w-full border-0"
              style={{ height: "min(600px, 70vh)" }}
              title={`Mockup Option ${label}`}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>

        {/* Right: description + export */}
        <div className="flex w-full shrink-0 flex-col justify-between border-t border-border p-5 lg:w-72 lg:border-l lg:border-t-0">
          <div className="space-y-3">
            <div>
              <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Option {label}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
            </div>
            {description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            <span>{downloading ? "Downloading..." : "Export HTML"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders mockups section with individual concept cards, each with an anchor ID.
 */
function MockupsSection({ content, projectId }: { content: string; projectId: string }) {
  const stitchData = useMemo(() => {
    try {
      const parsed = JSON.parse(content)
      if (parsed?.type === "stitch" && Array.isArray(parsed.options)) {
        return parsed.options as { label: string; title: string; htmlUrl: string; imageUrl: string; description?: string }[]
      }
      return null
    } catch {
      return null
    }
  }, [content])

  if (stitchData && stitchData.length > 0) {
    return (
      <div className="space-y-8">
        {stitchData.map((option, idx) => (
          <div key={option.label} id={`mockups-concept-${idx + 1}`}>
            <StitchConceptCard
              label={option.label}
              title={option.title}
              htmlUrl={option.htmlUrl}
              description={option.description}
              projectId={projectId}
            />
          </div>
        ))}
      </div>
    )
  }

  return <MockupRenderer content={content} projectId={projectId} />
}

export const ScrollableContent = forwardRef<HTMLDivElement, ScrollableContentProps>(
  function ScrollableContent({ projectId, documents }, ref) {
    const competitiveData = documents["competitive"]
    const prdData = documents["prd"]
    const mvpData = documents["mvp"]
    const mockupsData = documents["mockups"]
    const launchData = documents["launch"]
    // Defer rendering of all sections below the first one to the next animation
    // frame. This allows the browser to paint the initial layout (first section +
    // skeletons) before doing the heavy markdown/structured-data rendering work,
    // preventing the "Page Unresponsive" freeze when switching to document view.
    const [renderDeferred, setRenderDeferred] = useState(false)

    useEffect(() => {
      const id = requestAnimationFrame(() => setRenderDeferred(true))
      return () => cancelAnimationFrame(id)
    }, [])

    return (
      <div
        ref={ref}
        className="flex-1 space-y-4 overflow-y-auto bg-background px-3 py-3 sm:px-6 sm:py-4 lg:px-8"
      >
        {/* Overview — rendered immediately (first visible section) */}
        <DocumentWrapper navKey="overview" contentClassName="space-y-6">
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

        {/* All sections below are deferred to next animation frame */}

        <DocumentWrapper navKey="market-research" contentClassName="space-y-6">
          {!renderDeferred ? (
            <DocumentSkeleton label="Market Research" />
          ) : competitiveData?.isGenerating ? (
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

        <DocumentWrapper navKey="prd">
          {!renderDeferred ? (
            <DocumentSkeleton label="PRD" />
          ) : prdData?.isGenerating ? (
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

        <DocumentWrapper navKey="mvp">
          {!renderDeferred ? (
            <DocumentSkeleton label="MVP Plan" />
          ) : mvpData?.isGenerating ? (
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

        <DocumentWrapper navKey="mockups">
          {!renderDeferred ? (
            <DocumentSkeleton label="Mockups" />
          ) : mockupsData?.isGenerating ? (
            <DocumentSkeleton label="Mockups" />
          ) : mockupsData?.content ? (
            <MockupsSection content={mockupsData.content} projectId={projectId} />
          ) : (
            <EmptyState label="Mockups" />
          )}
        </DocumentWrapper>

        <DocumentWrapper navKey="launch">
          {!renderDeferred ? (
            <DocumentSkeleton label="Marketing" />
          ) : launchData?.isGenerating ? (
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
