// src/components/layout/scrollable-content.tsx
"use client"

import React, { forwardRef, useState, useEffect } from "react"
import { AlertCircle, CheckCircle2, Circle, Loader2, RotateCcw } from "lucide-react"
import { MockupGenerationLoader } from "@/components/ui/mockup-generation-loader"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import {
  CompetitiveOverviewSection,
  CompetitiveDetailSection,
} from "@/components/analysis/competitive-analysis-document"
import {
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
import type { OpenRouterImageMockupOption } from "@/lib/openrouter-image-mockup-format"
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
  mockupDraftOptions?: OpenRouterImageMockupOption[]
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
  showMockupLoader = true,
}: {
  label: string
  state?: DocumentGenerationDisplayState
  onGenerateDocument?: (docType: DocumentType) => void
  showMockupLoader?: boolean
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
          showMockupLoader ? <MockupGenerationLoader images={state.mockupPreviewImages} /> : null
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

function MockupProgressModule({
  state,
  draftOptions = [],
  onGenerateDocument,
}: {
  state?: DocumentGenerationDisplayState
  draftOptions?: OpenRouterImageMockupOption[]
  onGenerateDocument?: (docType: DocumentType) => void
}) {
  const draftContent = JSON.stringify({
    type: "openrouter-image-v2",
    model: "draft",
    generatedAt: "",
    options: draftOptions,
  })

  return (
    <div className="space-y-6">
      <GenerationStatusModule
        label="Design Mockups"
        state={state}
        onGenerateDocument={onGenerateDocument}
        showMockupLoader={false}
      />
      <div className="px-5 pb-6 sm:px-8">
        <MockupRenderer
          content={draftContent}
          expectedOptionLabels={["A", "B", "C"]}
          optionStatuses={state?.mockupOptionStatuses}
        />
      </div>
    </div>
  )
}

function MockupsSection({ content, projectId }: { content: string; projectId: string }) {
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
      const id = requestAnimationFrame(() => setRenderDeferred(true))
      return () => cancelAnimationFrame(id)
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
            <MockupProgressModule
              state={mockupsData.displayState}
              draftOptions={mockupsData.mockupDraftOptions}
              onGenerateDocument={onGenerateDocument}
            />
          ) : mockupsData?.isGenerating || mockupsData?.isLoading ? (
            <DocumentSkeleton label="Design Mockups" mode={getSkeletonMode(mockupsData)} />
          ) : (
            <EmptyState label="Design Mockups" />
          )}
        </DocumentWrapper>

      </div>
    )
  }
)
