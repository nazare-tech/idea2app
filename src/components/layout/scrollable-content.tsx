// src/components/layout/scrollable-content.tsx
"use client"

import React, { forwardRef, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { AlertCircle, CheckCircle2, Circle, Loader2, RotateCcw } from "lucide-react"

// The WebGL generation loader pulls in img-fx + three. Load it only when a
// mockup generation is actually on screen instead of shipping it with every
// workspace visit.
const MockupGenerationLoader = dynamic(
  () =>
    import("@/components/ui/mockup-generation-loader").then(
      (module) => module.MockupGenerationLoader
    ),
  { ssr: false }
)
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import {
  CompetitiveOverviewSection,
  CompetitiveDetailSection,
} from "@/components/analysis/competitive-analysis-document"
import { CompetitiveStreamingDocument } from "@/components/analysis/competitive-streaming-document"
import {
  AiPromptsDocumentBlocks,
  MvpPlanDocumentBlocks,
  PrdDocumentBlocks,
} from "@/components/analysis/planning-document-blocks"
import { WorkspaceDocumentFrame as DocumentWrapper } from "@/components/layout/workspace-document-frame"
import type { DocumentType } from "@/lib/document-definitions"
import { SCROLLABLE_NAV_ITEMS } from "@/lib/document-sections"
import type { StreamStage } from "@/lib/parse-document-stream"
import type {
  DocumentGenerationDisplayState,
  MockupOptionStatus,
} from "@/lib/document-generation-display-status"
import type { OpenRouterImageMockupOption } from "@/lib/mockups/openrouter-image-format"
import { cn } from "@/lib/utils"
import { getAiPromptsReadiness } from "@/lib/ai-prompts-readiness"

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
  /** Current project name, shown as the proposed name in the Executive Summary */
  projectName?: string
  activeDocument?: DocumentType
  documents: Record<string, DocumentData>
  /**
   * Partial Market Research markdown streamed during onboarding generation.
   * While present (and no saved document exists) the Executive Summary and
   * Market Research sections render the live streaming document instead of
   * static generating placeholders.
   */
  competitiveStreamingContent?: string | null
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

// navKey -> owning document type, from the same registry the nav rail uses.
// Containment for each deferred frame is derived from this mapping so a
// section's active state can never drift from its nav item (AI Prompts, for
// example, is sourced from the First Version Plan).
const NAV_SOURCE_TYPES = new Map<string, DocumentType>(
  SCROLLABLE_NAV_ITEMS.map((item) => [item.key, item.sourceType]),
)

/** One below-the-fold workspace document section. */
interface DeferredSection {
  navKey: string
  label: string
  /** Height estimate for content-visibility containment (containIntrinsicSize) */
  intrinsicSize: string
  /** Document whose loading/generating status drives skeletons and retries */
  statusData?: DocumentData
  /** AI Prompts also shows a skeleton while its other source (Product Plan) loads */
  skeletonFallbackData?: DocumentData
  hasContent: boolean
  renderContent: () => React.ReactNode
  /** Mockups render their own progress module instead of the generic status */
  renderStatus?: (state: DocumentGenerationDisplayState) => React.ReactNode
}

/** Shared skeleton/content/status/empty fallback chain for deferred sections. */
function DeferredSectionBody({
  section,
  renderDeferred,
  onGenerateDocument,
}: {
  section: DeferredSection
  renderDeferred: boolean
  onGenerateDocument?: (docType: DocumentType) => void
}) {
  const { label, statusData, skeletonFallbackData } = section

  if (!renderDeferred) {
    return <DocumentSkeleton label={label} />
  }

  if (section.hasContent) {
    return <>{section.renderContent()}</>
  }

  const displayState = statusData?.displayState
  if (displayState && displayState.displayStatus !== "idle") {
    if (section.renderStatus) {
      return <>{section.renderStatus(displayState)}</>
    }
    return (
      <GenerationStatusModule
        label={label}
        state={displayState}
        onGenerateDocument={onGenerateDocument}
      />
    )
  }

  if (statusData?.isGenerating || statusData?.isLoading || skeletonFallbackData?.isLoading) {
    return <DocumentSkeleton label={label} mode={getSkeletonMode(statusData ?? skeletonFallbackData)} />
  }

  return <EmptyState label={label} />
}

function MockupsSection({ content, projectId }: { content: string; projectId: string }) {
  return (
    <div>
      <header className="pb-8">
        <h1 className="font-[family:var(--font-display)] text-[36px] font-bold leading-[1.12] tracking-[-0.05em] text-[#0A0A0A] md:text-[44px] md:leading-[66px]">
          Design Mockups
        </h1>
        <p className="mt-1 max-w-3xl text-[16px] leading-[25.6px] text-[#666666]">
          Three visual concepts for the first version. Click a concept to view it full size.
        </p>
      </header>
      <MockupRenderer content={content} projectId={projectId} />
    </div>
  )
}

export const ScrollableContent = forwardRef<HTMLDivElement, ScrollableContentProps>(
  function ScrollableContent({ projectId, projectName, activeDocument, documents, competitiveStreamingContent, onGenerateDocument }, ref) {
    const competitiveData = documents["competitive"]
    const prdData = documents["prd"]
    const mvpData = documents["mvp"]
    const mockupsData = documents["mockups"]
    const aiPromptsReadiness = getAiPromptsReadiness({
      prdContent: prdData?.content,
      mvpContent: mvpData?.content,
      prdSettled: Boolean(prdData?.content) && !prdData?.isGenerating && !prdData?.isLoading,
      mvpSettled: Boolean(mvpData?.content) && !mvpData?.isGenerating && !mvpData?.isLoading,
    })
    // Defer rendering of all sections below the first one to the next animation
    // frame. This allows the browser to paint the initial layout (first section +
    // skeletons) before doing the heavy markdown/structured-data rendering work,
    // preventing the "Page Unresponsive" freeze when switching to document view.
    const [renderDeferred, setRenderDeferred] = useState(false)

    useEffect(() => {
      const id = requestAnimationFrame(() => setRenderDeferred(true))
      return () => cancelAnimationFrame(id)
    }, [])

    const deferredSections: DeferredSection[] = [
      {
        navKey: "market-research",
        label: "Market Research",
        intrinsicSize: "auto 2600px",
        statusData: competitiveData,
        hasContent: Boolean(competitiveData?.content),
        renderContent: () => (
          <CompetitiveDetailSection
            content={competitiveData!.content!}
            metadata={competitiveData!.metadata}
            projectId={projectId}
          />
        ),
        // Live-stream detail sections while onboarding writes the document.
        // The live-fill variant promises the full section skeleton from the
        // first token, so no separate generating module is needed once the
        // stream exists.
        renderStatus: (state) =>
          competitiveStreamingContent ? (
            <CompetitiveStreamingDocument
              content={competitiveStreamingContent}
              finished={false}
              variant="live-fill"
              parts="detail"
            />
          ) : (
            <GenerationStatusModule
              label="Market Research"
              state={state}
              onGenerateDocument={onGenerateDocument}
            />
          ),
      },
      {
        navKey: "prd",
        label: "Product Plan",
        intrinsicSize: "auto 3200px",
        statusData: prdData,
        hasContent: Boolean(prdData?.content),
        renderContent: () => (
          <PrdDocumentBlocks content={prdData!.content!} projectId={projectId} />
        ),
      },
      {
        navKey: "mvp",
        label: "First Version Plan",
        intrinsicSize: "auto 2800px",
        statusData: mvpData,
        hasContent: Boolean(mvpData?.content),
        renderContent: () => (
          <MvpPlanDocumentBlocks content={mvpData!.content!} projectId={projectId} />
        ),
      },
      {
        navKey: "mockups",
        label: "Design Mockups",
        intrinsicSize: "auto 1200px",
        statusData: mockupsData,
        hasContent: Boolean(mockupsData?.content),
        renderContent: () => (
          <MockupsSection content={mockupsData!.content!} projectId={projectId} />
        ),
        renderStatus: (state) => (
          <MockupProgressModule
            state={state}
            draftOptions={mockupsData?.mockupDraftOptions}
            onGenerateDocument={onGenerateDocument}
          />
        ),
      },
      {
        // Derived from the Product Plan and First Version Plan; status follows
        // the First Version Plan (its nav sourceType) with the Product Plan as
        // the extra loading signal.
        navKey: "ai-prompts",
        label: "AI Prompts",
        intrinsicSize: "auto 1800px",
        statusData: mvpData,
        skeletonFallbackData: prdData,
        hasContent: aiPromptsReadiness.status !== "waiting",
        renderContent: () => (
          <AiPromptsDocumentBlocks
            prdContent={prdData?.content ?? null}
            mvpContent={mvpData?.content ?? null}
            projectId={projectId}
            prdSettled={Boolean(prdData?.content) && !prdData?.isGenerating && !prdData?.isLoading}
            mvpSettled={Boolean(mvpData?.content) && !mvpData?.isGenerating && !mvpData?.isLoading}
          />
        ),
      },
    ]

    return (
      <div
        ref={ref}
        className="flex-1 space-y-8 overflow-y-auto bg-background px-3 pb-28 pt-3 sm:px-6 sm:pb-32 sm:pt-4 lg:px-8"
      >
        {/* Executive Summary — rendered immediately (first visible section) */}
        <DocumentWrapper navKey="executive-summary">
          {competitiveData?.content ? (
            <CompetitiveOverviewSection
              content={competitiveData.content}
              metadata={competitiveData.metadata}
              projectId={projectId}
              projectName={projectName}
            />
          ) : competitiveStreamingContent ? (
            <CompetitiveStreamingDocument
              content={competitiveStreamingContent}
              finished={false}
              variant="live-fill"
              parts="overview"
              projectName={projectName}
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

        {deferredSections.map((section) => (
          <DocumentWrapper
            key={section.navKey}
            navKey={section.navKey}
            performanceContain={activeDocument !== NAV_SOURCE_TYPES.get(section.navKey)}
            intrinsicSize={section.intrinsicSize}
          >
            <DeferredSectionBody
              section={section}
              renderDeferred={renderDeferred}
              onGenerateDocument={onGenerateDocument}
            />
          </DocumentWrapper>
        ))}

      </div>
    )
  }
)
