"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Loader2,
  Download,
  FileDown,
} from "lucide-react"
import type { DocumentType } from "@/lib/document-definitions"
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
}

interface ContentEditorProps {
  documentType: DocumentType
  projectId: string
  documentId?: string | null
  projectName: string
  projectDescription: string
  content: string | null
  documentMetadata?: Record<string, unknown> | null
  onGenerateContent: (model?: string) => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  onProjectNameGenerated?: (name: string) => void
  isGenerating: boolean
  streamStages?: StreamStage[]
  streamCurrentStep?: number
  streamContent?: string
  credits: number
  hasStructuredIntake?: boolean
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
  documentId,
  projectName,
  projectDescription,
  content,
  documentMetadata,
  onGenerateContent,
  onUpdateDescription,
  onProjectNameGenerated,
  isGenerating,
  credits,
  prerequisiteValidation,
  currentVersion = 0,
  streamStages,
  streamCurrentStep,
  streamContent,
  hasStructuredIntake = false,
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

  const handleIdeaSummary = async (summary: string) => {
    // Update the project description with the summary
    await onUpdateDescription(summary)
  }

  const handleDownloadPDF = async () => {
    if (!content) return
    if (documentType !== "prompt" && !documentId) return
    setDownloadingPdf(true)
    try {
      await downloadMarkdownAsPDF({
        projectId,
        documentId: documentId ?? undefined,
        documentType,
      })
    } catch (error) {
      console.error("Error downloading PDF:", error)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const generateAllStatus = useGenerateAll(projectId, (s) => s.status)
  const isGenerateAllRunning = generateAllStatus === "running"

  const canGenerate = credits >= dynamicCreditCost && (prerequisiteValidation?.canGenerate ?? true) && !isGenerateAllRunning
  const disabledReason = isGenerateAllRunning
    ? "Generate All is in progress"
    : !prerequisiteValidation?.canGenerate
    ? prerequisiteValidation?.reason
    : credits < dynamicCreditCost
      ? `Insufficient credits (need ${dynamicCreditCost})`
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
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <config.icon className="h-[18px] w-[18px] text-primary" />
            <div className="min-w-0">
              <h1 className="text-xl ui-font-semibold text-foreground ui-tracking-tight">
                {config.title}
              </h1>
              <p className="text-[11px] text-muted-foreground ui-font-mono break-words">
                {config.subtitle}
              </p>
            </div>
          </div>

          {documentType !== "prompt" ? (
            <div className="flex flex-wrap items-center gap-3">
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
                    onClick={() => onGenerateContent(undefined)}
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
                      {isGenerating
                        ? "Generating..."
                        : dynamicCreditCost > 0
                          ? `Generate (${dynamicCreditCost} credits)`
                          : "Generate"}
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
              onProjectNameGenerated={onProjectNameGenerated}
              credits={credits}
              disableInitialAutoStart={hasStructuredIntake}
            />
          ) : (
            <div className="h-full overflow-y-auto p-3 sm:p-6 lg:p-10 relative">
              <div className="flex justify-center items-start relative" ref={containerRef}>
                {/* Document Container with Resize Handles */}
                <div
                  className="relative w-full"
                  style={isFullWidthDocument ? { width: "100%" } : { width: `min(100%, ${documentWidth}px)` }}
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
                          className="absolute left-0 top-0 bottom-0 z-20 hidden w-3 cursor-col-resize bg-transparent transition-colors hover:bg-primary/10 lg:block"
                          onMouseDown={(e) => handleResizeStart('left', e)}
                        >
                          <div className="sticky top-1/2 -translate-y-1/2 flex items-center justify-center h-16">
                            <div className="w-1 h-full bg-border group-hover:bg-primary transition-colors rounded-full" />
                          </div>
                        </div>

                        {/* Right Resize Handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 z-20 hidden w-3 cursor-col-resize bg-transparent transition-colors hover:bg-primary/10 lg:block"
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
                        <MockupRenderer content={content} projectName={projectName} projectId={projectId} />
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
