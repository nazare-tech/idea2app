// src/components/layout/scrollable-content.tsx
"use client"

import React, { forwardRef, useMemo, useState, useEffect } from "react"
import { AlertCircle, CheckCircle2, Circle, Loader2, RotateCcw } from "lucide-react"
import { MockupGenerationLoader } from "@/components/ui/mockup-generation-loader"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import {
  CompetitiveOverviewSection,
  CompetitiveDetailSection,
} from "@/components/analysis/competitive-analysis-document"
import {
  AiPromptsDocumentBlocks,
  MvpPlanDocumentBlocks,
  PrdDocumentBlocks,
} from "@/components/analysis/planning-document-blocks"
import { WorkspaceDocumentFrame as DocumentWrapper } from "@/components/layout/workspace-document-frame"
import type { DocumentType } from "@/lib/document-definitions"
import type { StreamStage } from "@/lib/parse-document-stream"
import type {
  DocumentGenerationDisplayState,
  MockupOptionStatus,
} from "@/lib/document-generation-display-status"
import { cn } from "@/lib/utils"

interface DocumentData {
  content: string | null
  metadata?: Record<string, unknown> | null
  isGenerating: boolean
  isLoading?: boolean
  streamStages?: StreamStage[]
  streamCurrentStep?: number
  streamContent?: string
  displayState?: DocumentGenerationDisplayState
}

interface ScrollableContentProps {
  projectId: string
  documents: Record<string, DocumentData>
  onGenerateDocument?: (docType: DocumentType) => void
}

function DocumentSkeleton({
  label,
  mode = "loading",
}: {
  label: string
  mode?: "loading" | "generating"
}) {
  const action = mode === "generating" ? "Generating" : "Loading"

  return (
    <div className="flex flex-col gap-4 p-5 sm:p-8">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
      <p className="text-xs text-muted-foreground">{action} {label}...</p>
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

function getSkeletonMode(document?: DocumentData): "loading" | "generating" {
  return document?.isGenerating ? "generating" : "loading"
}

function SmallStatusIcon({ status }: { status: MockupOptionStatus["status"] }) {
  if (status === "ready") return <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
  if (status === "generating") return <Loader2 className="h-4 w-4 animate-spin text-primary" />
  if (status === "needs_retry") return <AlertCircle className="h-4 w-4 text-red-500" />
  return <Circle className="h-4 w-4 text-muted-foreground/60" />
}

function GenerationStatusModule({
  label,
  state,
  onGenerateDocument,
}: {
  label: string
  state?: DocumentGenerationDisplayState
  onGenerateDocument?: (docType: DocumentType) => void
}) {
  if (!state || state.displayStatus === "idle") {
    return <EmptyState label={label} />
  }

  const isGenerating = state.displayStatus === "generating"
  const needsRetry = state.displayStatus === "needs_retry"
  const retryDetail = state.detail?.trim() || "Generation did not complete. Try again and we will use the latest saved project context."

  if (needsRetry) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-5 px-5 py-10 text-center sm:px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="max-w-md space-y-2">
          <p className="text-lg font-semibold text-foreground">
            We could not finish generating {label}.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {retryDetail}
          </p>
        </div>

        {onGenerateDocument && (
          <button
            type="button"
            onClick={() => onGenerateDocument(state.docType)}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-md border border-primary bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <RotateCcw aria-hidden="true" className="h-5 w-5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-8">
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isGenerating && "bg-primary/10 text-primary",
          (state.displayStatus === "queued" || state.displayStatus === "waiting") && "bg-muted text-muted-foreground",
        )}>
          {isGenerating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {state.message || label}
          </p>
          {state.detail && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {state.detail}
            </p>
          )}
        </div>
      </div>

      {isGenerating && (
        state.docType === "mockups" ? (
          <MockupGenerationLoader images={state.mockupPreviewImages} />
        ) : (
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          </div>
        )
      )}

      {state.mockupOptionStatuses && state.mockupOptionStatuses.length > 0 && (
        <div className="divide-y divide-border-subtle rounded-md border border-border-subtle">
          {state.mockupOptionStatuses.map((option) => (
            <div key={option.label} className="flex items-center gap-3 px-4 py-3">
              <SmallStatusIcon status={option.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                {option.message && (
                  <p className="text-xs text-muted-foreground">{option.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
        <div className="flex-1 bg-muted/10">
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
  function ScrollableContent({ projectId, documents, onGenerateDocument }, ref) {
    const competitiveData = documents["competitive"]
    const prdData = documents["prd"]
    const mvpData = documents["mvp"]
    const mockupsData = documents["mockups"]
    // Defer rendering of all sections below the first one to the next animation
    // frame. This allows the browser to paint the initial layout (first section +
    // skeletons) before doing the heavy markdown/structured-data rendering work,
    // preventing the "Page Unresponsive" freeze when switching to document view.
    const [renderDeferred, setRenderDeferred] = useState(false)

    useEffect(() => {
      let didRender = false
      const revealDeferredSections = () => {
        if (didRender) return
        didRender = true
        setRenderDeferred(true)
      }
      const frameId = requestAnimationFrame(revealDeferredSections)
      const timeoutId = window.setTimeout(revealDeferredSections, 250)

      return () => {
        cancelAnimationFrame(frameId)
        window.clearTimeout(timeoutId)
      }
    }, [])

    return (
      <div
        ref={ref}
        className="flex-1 space-y-8 overflow-y-auto bg-background px-3 py-3 sm:px-6 sm:py-4 lg:px-8"
      >
        {/* Executive Summary — rendered immediately (first visible section) */}
        <DocumentWrapper navKey="executive-summary">
          {competitiveData?.content ? (
            <CompetitiveOverviewSection
              content={competitiveData.content}
              metadata={competitiveData.metadata}
              projectId={projectId}
            />
          ) : competitiveData?.displayState && competitiveData.displayState.displayStatus !== "idle" ? (
            <GenerationStatusModule
              label="Executive Summary"
              state={competitiveData.displayState}
              onGenerateDocument={onGenerateDocument}
            />
          ) : competitiveData?.isGenerating || competitiveData?.isLoading ? (
            <DocumentSkeleton label="Executive Summary" mode={getSkeletonMode(competitiveData)} />
          ) : (
            <EmptyState label="Executive Summary" />
          )}
        </DocumentWrapper>

        {/* All sections below are deferred to next animation frame */}

        <DocumentWrapper navKey="market-research">
          {!renderDeferred ? (
            <DocumentSkeleton label="Market Research" />
          ) : competitiveData?.content ? (
            <CompetitiveDetailSection
              content={competitiveData.content}
              metadata={competitiveData.metadata}
              projectId={projectId}
            />
          ) : competitiveData?.displayState && competitiveData.displayState.displayStatus !== "idle" ? (
            <GenerationStatusModule
              label="Market Research"
              state={competitiveData.displayState}
              onGenerateDocument={onGenerateDocument}
            />
          ) : competitiveData?.isGenerating || competitiveData?.isLoading ? (
            <DocumentSkeleton label="Market Research" mode={getSkeletonMode(competitiveData)} />
          ) : (
            <EmptyState label="Market Research" />
          )}
        </DocumentWrapper>

        <DocumentWrapper navKey="prd">
          {!renderDeferred ? (
            <DocumentSkeleton label="Product Plan" />
          ) : prdData?.content ? (
            <PrdDocumentBlocks
              content={prdData.content}
              projectId={projectId}
            />
          ) : prdData?.displayState && prdData.displayState.displayStatus !== "idle" ? (
            <GenerationStatusModule
              label="Product Plan"
              state={prdData.displayState}
              onGenerateDocument={onGenerateDocument}
            />
          ) : prdData?.isGenerating || prdData?.isLoading ? (
            <DocumentSkeleton label="Product Plan" mode={getSkeletonMode(prdData)} />
          ) : (
            <EmptyState label="Product Plan" />
          )}
        </DocumentWrapper>

        <DocumentWrapper navKey="mvp">
          {!renderDeferred ? (
            <DocumentSkeleton label="First Version Plan" />
          ) : mvpData?.content ? (
            <MvpPlanDocumentBlocks
              content={mvpData.content}
              projectId={projectId}
            />
          ) : mvpData?.displayState && mvpData.displayState.displayStatus !== "idle" ? (
            <GenerationStatusModule
              label="First Version Plan"
              state={mvpData.displayState}
              onGenerateDocument={onGenerateDocument}
            />
          ) : mvpData?.isGenerating || mvpData?.isLoading ? (
            <DocumentSkeleton label="First Version Plan" mode={getSkeletonMode(mvpData)} />
          ) : (
            <EmptyState label="First Version Plan" />
          )}
        </DocumentWrapper>

        <DocumentWrapper navKey="mockups">
          {!renderDeferred ? (
            <DocumentSkeleton label="Design Mockups" />
          ) : mockupsData?.content ? (
            <MockupsSection content={mockupsData.content} projectId={projectId} />
          ) : mockupsData?.displayState && mockupsData.displayState.displayStatus !== "idle" ? (
            <GenerationStatusModule
              label="Design Mockups"
              state={mockupsData.displayState}
              onGenerateDocument={onGenerateDocument}
            />
          ) : mockupsData?.isGenerating || mockupsData?.isLoading ? (
            <DocumentSkeleton label="Design Mockups" mode={getSkeletonMode(mockupsData)} />
          ) : (
            <EmptyState label="Design Mockups" />
          )}
        </DocumentWrapper>

        <DocumentWrapper navKey="ai-prompts">
          {!renderDeferred ? (
            <DocumentSkeleton label="AI Prompts" />
          ) : prdData?.content || mvpData?.content ? (
            <AiPromptsDocumentBlocks
              prdContent={prdData?.content ?? null}
              mvpContent={mvpData?.content ?? null}
              projectId={projectId}
            />
          ) : prdData?.isGenerating || mvpData?.isGenerating || prdData?.isLoading || mvpData?.isLoading ? (
            <DocumentSkeleton
              label="AI Prompts"
              mode={prdData?.isGenerating || mvpData?.isGenerating ? "generating" : "loading"}
            />
          ) : (
            <EmptyState label="AI Prompts" />
          )}
        </DocumentWrapper>

      </div>
    )
  }
)
