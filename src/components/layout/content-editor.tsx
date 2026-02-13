"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  PenLine,
  Search,
  FileText,
  Target,
  Code,
  Rocket,
  Sparkles,
  Loader2,
  Download,
  Copy,
  GripVertical,
} from "lucide-react"
import { DocumentType } from "./document-nav"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { downloadMarkdownAsPDF } from "@/lib/pdf-utils"
import { PromptChatInterface } from "@/components/chat/prompt-chat-interface"

interface ContentEditorProps {
  documentType: DocumentType
  projectId: string
  projectName: string
  projectDescription: string
  content: string | null
  onGenerateContent: () => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  onUpdateContent?: (newContent: string) => Promise<void>
  isGenerating: boolean
  credits: number
  prerequisiteValidation?: { canGenerate: boolean; reason?: string }
  currentVersion?: number
  totalVersions?: number
  onVersionChange?: (version: number) => void
}

const documentConfig: Record<
  DocumentType,
  { title: string; subtitle: string; icon: React.ElementType; creditCost: number }
> = {
  prompt: {
    title: "Prompt",
    subtitle: "Define your project requirements and goals",
    icon: PenLine,
    creditCost: 0,
  },
  competitive: {
    title: "Competitive Research",
    subtitle: "Market analysis and competitor insights",
    icon: Search,
    creditCost: 5,
  },
  prd: {
    title: "PRD",
    subtitle: "Product requirements document",
    icon: FileText,
    creditCost: 10,
  },
  mvp: {
    title: "MVP Plan",
    subtitle: "Minimum viable product development plan",
    icon: Target,
    creditCost: 10,
  },
  techspec: {
    title: "Tech Spec",
    subtitle: "Technical specifications and architecture",
    icon: Code,
    creditCost: 10,
  },
  deploy: {
    title: "Deploy",
    subtitle: "Generate and deploy your application",
    icon: Rocket,
    creditCost: 5,
  },
}

// Width constraints for document resizing
const MIN_DOCUMENT_WIDTH = 640 // Minimum width for readability (tablet size)
const MAX_DOCUMENT_WIDTH = 1400 // Maximum width for optimal reading experience
const DEFAULT_DOCUMENT_WIDTH = 896 // Default max-w-4xl in pixels

export function ContentEditor({
  documentType,
  projectId,
  projectName,
  projectDescription,
  content,
  onGenerateContent,
  onUpdateDescription,
  onUpdateContent,
  isGenerating,
  credits,
  prerequisiteValidation,
  currentVersion = 0,
  totalVersions = 0,
  onVersionChange,
}: ContentEditorProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [copied, setCopied] = useState(false)
  const [documentWidth, setDocumentWidth] = useState(DEFAULT_DOCUMENT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeEdge, setResizeEdge] = useState<'left' | 'right' | null>(null)

  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const config = documentConfig[documentType]

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
      setDocumentWidth(newWidth)
    }

    const handleMouseUp = () => {
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

  const handleCopyContent = async () => {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const canGenerate = credits >= config.creditCost && (prerequisiteValidation?.canGenerate ?? true)
  const disabledReason = !prerequisiteValidation?.canGenerate
    ? prerequisiteValidation?.reason
    : credits < config.creditCost
      ? `Insufficient credits (need ${config.creditCost})`
      : undefined

  return (
    <>
      <style jsx>{`
        .loader {
          animation: rotate 1s infinite;
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
          animation: ball1 1s infinite;
          background-color: #ca3a31;
          box-shadow: 30px 0 0 #d3d3d3;
          margin-bottom: 10px;
        }
        .loader:after {
          animation: ball2 1s infinite;
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
        <div className="flex items-center justify-between px-10 py-5 border-b border-border">
        <div className="flex items-center gap-4">
          <config.icon className="h-[18px] w-[18px] text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {config.title}
            </h1>
            <p className="text-[11px] text-muted-foreground font-mono">
              {config.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {documentType !== "prompt" && content && (
            <>
              <button
                onClick={handleCopyContent}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted/50 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{copied ? "Copied!" : "Copy"}</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPdf}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-medium">
                  {downloadingPdf ? "Generating..." : "Download PDF"}
                </span>
              </button>
            </>
          )}
          {documentType !== "prompt" && (
            <div className="relative group">
              <button
                onClick={onGenerateContent}
                disabled={isGenerating || !canGenerate}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-md transition-colors",
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
                <span className="text-xs font-semibold">
                  {isGenerating ? "Generating..." : content ? `Regenerate (${config.creditCost} credits)` : `Generate (${config.creditCost} credits)`}
                </span>
              </button>
              {!canGenerate && disabledReason && !isGenerating && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md text-xs shadow-lg border border-border whitespace-nowrap">
                    {disabledReason}
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-popover"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
            <div className="flex justify-center items-start relative" ref={containerRef}>
              {/* Left Resize Handle */}
              <div
                className="group absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-10 flex items-center justify-center hover:bg-primary/10 transition-colors"
                onMouseDown={(e) => handleResizeStart('left', e)}
                style={{ left: `calc(50% - ${documentWidth / 2}px)` }}
              >
                <div className="h-16 w-1 bg-border group-hover:bg-primary transition-colors rounded-full" />
                <GripVertical className="absolute h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
              </div>

              {/* Document Container */}
              <div
                className="space-y-8 transition-all"
                style={{ width: `${documentWidth}px` }}
              >
                <div className="bg-card border border-border rounded-lg p-8">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-24">
                      <span className="loader"></span>
                      <div className="mt-6 text-center">
                        <p className="text-sm font-medium text-foreground mb-2">
                          Generating {config.title}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This may take a moment
                        </p>
                      </div>
                    </div>
                  ) : content ? (
                    <MarkdownRenderer
                      content={content}
                      projectId={projectId}
                      enableInlineEditing={true}
                      onContentUpdate={onUpdateContent}
                    />
                  ) : (
                    <div className="text-center py-16">
                      <config.icon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        No {config.title.toLowerCase()} generated yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click &quot;Generate&quot; to create your {config.title.toLowerCase()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Resize Handle */}
              <div
                className="group absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-10 flex items-center justify-center hover:bg-primary/10 transition-colors"
                onMouseDown={(e) => handleResizeStart('right', e)}
                style={{ right: `calc(50% - ${documentWidth / 2}px)` }}
              >
                <div className="h-16 w-1 bg-border group-hover:bg-primary transition-colors rounded-full" />
                <GripVertical className="absolute h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
