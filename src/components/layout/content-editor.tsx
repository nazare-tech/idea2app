"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Loader2,
  Download,
  FileDown,
} from "lucide-react"
import { DocumentType } from "./document-nav"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import { CompetitiveAnalysisDocument } from "@/components/analysis/competitive-analysis-document"
import { downloadMarkdownAsPDF } from "@/lib/pdf-utils"
import { PromptChatInterface } from "@/components/chat/prompt-chat-interface"
import { GenerationStreamPanel } from "@/components/workspace/generation-stream-panel"
import type { StreamStage } from "@/lib/parse-document-stream"
import { getDocumentDefinition } from "@/lib/document-definitions"
import { getTokenCost, type TokenBillableAction } from "@/lib/token-economics"
import { useGenerateAll } from "@/stores/generate-all-store"

// Maps document tab types to their billable action key in token-economics
const DOC_TYPE_TO_ACTION: Partial<Record<DocumentType, TokenBillableAction>> = {
  competitive: "competitive-analysis",
  prd: "prd",
  mvp: "mvp-plan",
  mockups: "mockup",
  techspec: "tech-spec",
  launch: "launch-plan",
}

interface MarketingBrief {
  targetAudience: string
  stage: string
  budget: string
  channels: string
  launchWindow: string
}

interface ContentEditorProps {
  documentType: DocumentType
  projectId: string
  projectName: string
  projectDescription: string
  content: string | null
  documentMetadata?: Record<string, unknown> | null
  onGenerateContent: (model?: string, options?: { marketingBrief?: MarketingBrief }) => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  isGenerating: boolean
  streamStages?: StreamStage[]
  streamCurrentStep?: number
  streamContent?: string
  credits: number
  prerequisiteValidation?: { canGenerate: boolean; reason?: string }
  currentVersion?: number
  totalVersions?: number
  onVersionChange?: (version: number) => void
}

// Width constraints for document resizing
const MIN_DOCUMENT_WIDTH = 640 // Minimum width for readability (tablet size)
const MAX_DOCUMENT_WIDTH = 1400 // Maximum width for optimal reading experience
const DEFAULT_DOCUMENT_WIDTH = 896 // Default max-w-4xl in pixels
const FULL_WIDTH_DOCUMENT = Number.MAX_SAFE_INTEGER

export function ContentEditor({
  documentType,
  projectId,
  projectName,
  projectDescription,
  content,
  documentMetadata,
  onGenerateContent,
  onUpdateDescription,
  isGenerating,
  credits,
  prerequisiteValidation,
  currentVersion = 0,
  streamStages,
  streamCurrentStep,
  streamContent,
}: ContentEditorProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const isMockupsDocument = documentType === "mockups"
  const isCompetitiveDocument = documentType === "competitive"
  const isFullWidthDocument = isMockupsDocument || isCompetitiveDocument

  const [documentWidth, setDocumentWidth] = useState(
    isFullWidthDocument ? FULL_WIDTH_DOCUMENT : DEFAULT_DOCUMENT_WIDTH
  )
  const [isResizing, setIsResizing] = useState(false)
  const [resizeEdge, setResizeEdge] = useState<'left' | 'right' | null>(null)
  const [marketingBrief, setMarketingBrief] = useState<MarketingBrief>({
    targetAudience: "",
    stage: "",
    budget: "",
    channels: "",
    launchWindow: "",
  })

  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)
  const resizeRafRef = useRef<number | null>(null)
  const pendingDocumentWidthRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const config = getDocumentDefinition(documentType)

  // Recalculate credit cost based on document type.
  const action = DOC_TYPE_TO_ACTION[documentType]
  const dynamicCreditCost = action
    ? getTokenCost(action, undefined)
    : config.creditCost

  useEffect(() => {
    setDocumentWidth(isFullWidthDocument ? FULL_WIDTH_DOCUMENT : DEFAULT_DOCUMENT_WIDTH)
  }, [isFullWidthDocument])

  // Handle mouse move during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeEdge) return

      const delta = resizeEdge === 'right'
        ? e.clientX - resizeStartX.current
        : resizeStartX.current - e.clientX

      // Calculate maximum width based on available container space
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth
      const maxWidth = Math.min(MAX_DOCUMENT_WIDTH, containerWidth - 200) // Leave 100px padding on each side

      const newWidth = Math.max(
        MIN_DOCUMENT_WIDTH,
        Math.min(resizeStartWidth.current + delta, maxWidth)
      )

      pendingDocumentWidthRef.current = newWidth

      if (resizeRafRef.current === null) {
        resizeRafRef.current = requestAnimationFrame(() => {
          resizeRafRef.current = null

          if (pendingDocumentWidthRef.current !== null) {
            setDocumentWidth(pendingDocumentWidthRef.current)
            pendingDocumentWidthRef.current = null
          }
        })
      }
    }

    const handleMouseUp = () => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }

      if (pendingDocumentWidthRef.current !== null) {
        setDocumentWidth(pendingDocumentWidthRef.current)
        pendingDocumentWidthRef.current = null
      }

      setIsResizing(false)
      setResizeEdge(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)

        if (resizeRafRef.current !== null) {
          cancelAnimationFrame(resizeRafRef.current)
          resizeRafRef.current = null
        }
      }
    }
  }, [isResizing, resizeEdge])

  const handleResizeStart = (edge: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    setResizeEdge(edge)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = documentWidth
  }

  useEffect(() => {
    if (typeof window === "undefined" || documentType !== "launch") return

    const key = `project_${projectId}_marketing_brief`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MarketingBrief
        setMarketingBrief({
          targetAudience: parsed.targetAudience || "",
          stage: parsed.stage || "",
          budget: parsed.budget || "",
          channels: parsed.channels || "",
          launchWindow: parsed.launchWindow || "",
        })
        return
      } catch {
        // ignore invalid local data
      }
    }

    // Autofill from existing project docs (best-effort)
    const audienceMatch = projectDescription.match(/target audience[:\s]*([\s\S]*?)(?:\n##|\n\n##|$)/i)
    const audience = audienceMatch?.[1]
      ?.replace(/\n+/g, " ")
      ?.replace(/\*\*/g, "")
      ?.trim()

    setMarketingBrief((prev) => ({
      targetAudience: prev.targetAudience || audience || "",
      stage: prev.stage || "MVP",
      budget: prev.budget || "",
      channels: prev.channels || "Product Hunt, X, Reddit, Email",
      launchWindow: prev.launchWindow || "next 14 days",
    }))
  }, [documentType, projectId, projectDescription])

  useEffect(() => {
    if (typeof window === "undefined" || documentType !== "launch") return
    localStorage.setItem(`project_${projectId}_marketing_brief`, JSON.stringify(marketingBrief))
  }, [documentType, projectId, marketingBrief])

  const handleIdeaSummary = async (summary: string) => {
    // Update the project description with the summary
    await onUpdateDescription(summary)
  }

  const handleDownloadPDF = async () => {
    if (!content) return
    setDownloadingPdf(true)
    try {
      const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`
      await downloadMarkdownAsPDF(content, filename, "Project Document", config.title)
    } catch (error) {
      console.error("Error downloading PDF:", error)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const generateAllStatus = useGenerateAll(projectId, (s) => s.status)
  const isGenerateAllRunning = generateAllStatus === "running"

  const isMarketingBriefComplete = documentType !== "launch" || Object.values(marketingBrief).every(v => v.trim().length > 0)
  const canGenerate = credits >= dynamicCreditCost && (prerequisiteValidation?.canGenerate ?? true) && isMarketingBriefComplete && !isGenerateAllRunning
  const disabledReason = isGenerateAllRunning
    ? "Generate All is in progress"
    : !prerequisiteValidation?.canGenerate
    ? prerequisiteValidation?.reason
    : credits < dynamicCreditCost
      ? `Insufficient credits (need ${dynamicCreditCost})`
      : !isMarketingBriefComplete
        ? "Complete all marketing brief fields first"
        : undefined

  return (
    <>
      <style jsx>{`
        .loader {
          animation: rotate 2s infinite;
          height: 50px;
          width: 50px;
        }

        .loader:before,
        .loader:after {
          border-radius: 50%;
          content: "";
          display: block;
          height: 20px;
          width: 20px;
        }
        .loader:before {
          animation: ball1 2s infinite;
          background-color: #ca3a31;
          box-shadow: 30px 0 0 #d3d3d3;
          margin-bottom: 10px;
        }
        .loader:after {
          animation: ball2 2s infinite;
          background-color: #d3d3d3;
          box-shadow: 30px 0 0 #ca3a31;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg) scale(0.8) }
          50% { transform: rotate(360deg) scale(1.2) }
          100% { transform: rotate(720deg) scale(0.8) }
        }

        @keyframes ball1 {
          0% {
            box-shadow: 30px 0 0 #d3d3d3;
          }
          50% {
            box-shadow: 0 0 0 #d3d3d3;
            margin-bottom: 0;
            transform: translate(15px, 15px);
          }
          100% {
            box-shadow: 30px 0 0 #d3d3d3;
            margin-bottom: 10px;
          }
        }

        @keyframes ball2 {
          0% {
            box-shadow: 30px 0 0 #ca3a31;
          }
          50% {
            box-shadow: 0 0 0 #ca3a31;
            margin-top: -20px;
            transform: translate(15px, 15px);
          }
          100% {
            box-shadow: 30px 0 0 #ca3a31;
            margin-top: 0;
          }
        }
      `}</style>
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <div className="ui-row-between px-10 py-5 border-b border-border">
          <div className="flex items-center gap-4">
            <config.icon className="h-[18px] w-[18px] text-primary" />
            <div>
              <h1 className="text-xl ui-font-semibold text-foreground ui-tracking-tight">
                {config.title}
              </h1>
              <p className="text-[11px] text-muted-foreground ui-font-mono">
                {config.subtitle}
              </p>
            </div>
          </div>

          {documentType !== "prompt" ? (
            <div className="ui-row-gap-3">
              {content && !isMockupsDocument && (
                isCompetitiveDocument ? (
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPdf}
                    className="ui-row-gap-2 ui-px-4 ui-py-2 border border-border rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs ui-font-medium">
                      {downloadingPdf ? "Generating PDF..." : "Download PDF"}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPdf || isGenerating}
                    className="ui-row-gap-2 px-3 ui-py-2 rounded-md border border-border text-xs ui-font-semibold transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>Download PDF</span>
                  </button>
                )
              )}
              {!content && (
                <div className="relative group">
                  <button
                    onClick={() => onGenerateContent(undefined, documentType === "launch" ? { marketingBrief } : undefined)}
                    disabled={isGenerating || !canGenerate}
                    className={cn(
                      "ui-row-gap-2 px-5 ui-py-2 rounded-md transition-colors",
                      canGenerate
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs ui-font-semibold">
                      {isGenerating ? "Generating..." : `Generate (${dynamicCreditCost} credits)`}
                    </span>
                  </button>
                  {!canGenerate && disabledReason && !isGenerating && (
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                      <div className="bg-popover text-popover-foreground ui-px-3 ui-py-2 rounded-md text-xs shadow-lg border border-border whitespace-nowrap">
                        {disabledReason}
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-popover"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground ui-font-mono">
              Guided conversation
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {documentType === "prompt" ? (
            <PromptChatInterface
              projectId={projectId}
              projectName={projectName}
              initialIdea={projectDescription}
              onIdeaSummary={handleIdeaSummary}
              credits={credits}
            />
          ) : (
            <div className="h-full overflow-y-auto p-10 relative">
              {documentType === "launch" && (
                <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-border bg-card p-4">
                  <p className="mb-3 text-sm font-semibold">Marketing Brief (required)</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Target audience (e.g., PMs at SaaS startups)"
                      value={marketingBrief.targetAudience}
                      onChange={(e) => setMarketingBrief(prev => ({ ...prev, targetAudience: e.target.value }))}
                    />
                    <input
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Stage (idea / MVP / growth)"
                      value={marketingBrief.stage}
                      onChange={(e) => setMarketingBrief(prev => ({ ...prev, stage: e.target.value }))}
                    />
                    <input
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Budget (e.g., $500, $2k/mo)"
                      value={marketingBrief.budget}
                      onChange={(e) => setMarketingBrief(prev => ({ ...prev, budget: e.target.value }))}
                    />
                    <input
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Launch window (e.g., next 2 weeks)"
                      value={marketingBrief.launchWindow}
                      onChange={(e) => setMarketingBrief(prev => ({ ...prev, launchWindow: e.target.value }))}
                    />
                    <input
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2"
                      placeholder="Channels (comma-separated: PH, X, HN, Reddit, email...)"
                      value={marketingBrief.channels}
                      onChange={(e) => setMarketingBrief(prev => ({ ...prev, channels: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-center items-start relative" ref={containerRef}>
                {/* Document Container with Resize Handles */}
                <div
                  className="transition-all relative"
                  style={isFullWidthDocument ? { width: "100%" } : { width: `${documentWidth}px` }}
                >
                  <div className={cn(
                    "border border-border relative",
                    isMockupsDocument
                      ? "rounded-lg bg-card p-4 md:p-6"
                      : isCompetitiveDocument
                        ? "rounded-none bg-white p-0"
                        : "rounded-lg bg-card p-8"
                  )}>
                    {!isFullWidthDocument && (
                      <>
                        {/* Left Resize Handle */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-20 group bg-transparent hover:bg-primary/10 transition-colors"
                          onMouseDown={(e) => handleResizeStart('left', e)}
                        >
                          <div className="sticky top-1/2 -translate-y-1/2 flex items-center justify-center h-16">
                            <div className="w-1 h-full bg-border group-hover:bg-primary transition-colors rounded-full" />
                          </div>
                        </div>

                        {/* Right Resize Handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 group bg-transparent hover:bg-primary/10 transition-colors"
                          onMouseDown={(e) => handleResizeStart('right', e)}
                        >
                          <div className="sticky top-1/2 -translate-y-1/2 flex items-center justify-center h-16">
                            <div className="w-1 h-full bg-border group-hover:bg-primary transition-colors rounded-full" />
                          </div>
                        </div>
                      </>
                    )}
                    {/* isGenerating is the sole render gate — streamStages is intentionally
                        ignored when isGenerating is false, preventing stale stage UI */}
                    {isGenerating ? (
                      streamStages && streamStages.length > 0 ? (
                        <GenerationStreamPanel
                          documentTitle={config.title}
                          stages={streamStages}
                          currentStep={streamCurrentStep ?? 0}
                          streamContent={streamContent ?? ""}
                          projectId={projectId}
                          showLiveContent={!isCompetitiveDocument}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-24">
                          <span className="loader"></span>
                          <div className="mt-6 text-center">
                            <p className="text-sm ui-font-medium text-foreground mb-2">
                              Generating {config.title}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              This may take a moment
                            </p>
                          </div>
                        </div>
                      )
                    ) : content ? (
                      documentType === "mockups" ? (
                        <MockupRenderer content={content} projectName={projectName} />
                      ) : documentType === "competitive" ? (
                        <CompetitiveAnalysisDocument
                          content={content}
                          metadata={documentMetadata}
                          currentVersion={currentVersion}
                          projectId={projectId}
                        />
                      ) : (
                        <MarkdownRenderer
                          content={content}
                          projectId={projectId}
                        />
                      )
                    ) : (
                      <div className="text-center py-16">
                        <config.icon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="ui-text-sm-muted mb-2">
                          No {config.title.toLowerCase()} generated yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click &quot;Generate&quot; to create your {config.title.toLowerCase()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
