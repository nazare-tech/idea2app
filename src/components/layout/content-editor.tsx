"use client"

import { useState } from "react"
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

  const config = documentConfig[documentType]

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
          <div className="h-full overflow-y-auto p-10">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-card border border-border rounded-lg p-8">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border-4 border-primary/20"></div>
                      <div className="absolute top-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-primary"></div>
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-sm font-medium text-foreground mb-2">
                        Generating {config.title}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This may take a moment
                      </p>
                    </div>
                    {/* Animated dots */}
                    <div className="mt-4 flex gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
          </div>
        )}
      </div>
    </div>
  )
}
