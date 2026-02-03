"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  PenLine,
  Search,
  FileText,
  Code,
  Boxes,
  Rocket,
  Pencil,
  Sparkles,
  Loader2,
  Download,
  Copy,
} from "lucide-react"
import { DocumentType } from "./document-nav"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { downloadMarkdownAsPDF } from "@/lib/pdf-utils"

interface ContentEditorProps {
  documentType: DocumentType
  projectDescription: string
  content: string | null
  onGenerateContent: () => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  isGenerating: boolean
  credits: number
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
  techspec: {
    title: "Tech Spec",
    subtitle: "Technical specifications and architecture",
    icon: Code,
    creditCost: 10,
  },
  architecture: {
    title: "Architecture",
    subtitle: "System design and infrastructure",
    icon: Boxes,
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
  projectDescription,
  content,
  onGenerateContent,
  onUpdateDescription,
  isGenerating,
  credits,
  currentVersion = 0,
  totalVersions = 0,
  onVersionChange,
}: ContentEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState(projectDescription)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [copied, setCopied] = useState(false)

  const config = documentConfig[documentType]

  const handleSaveDescription = async () => {
    await onUpdateDescription(editedDescription)
    setIsEditing(false)
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

  const canGenerate = credits >= config.creditCost

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
          {totalVersions > 1 && documentType !== "prompt" && (
            <div className="flex items-center gap-2 ml-4 px-3 py-1.5 bg-secondary border border-border rounded-md">
              <button
                onClick={() => onVersionChange?.(Math.min(currentVersion + 1, totalVersions - 1))}
                disabled={currentVersion >= totalVersions - 1}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ←
              </button>
              <span className="text-xs font-mono text-muted-foreground">
                {currentVersion + 1} / {totalVersions}
              </span>
              <button
                onClick={() => onVersionChange?.(Math.max(currentVersion - 1, 0))}
                disabled={currentVersion <= 0}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                →
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {documentType === "prompt" && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Edit</span>
            </button>
          )}
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
                {isGenerating ? "Generating..." : `Generate (${config.creditCost} credits)`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {documentType === "prompt" ? (
            <div className="bg-card border border-border rounded-lg p-8">
              <p className="text-[10px] font-medium tracking-[1px] font-mono text-muted-foreground mb-5">
                WRITE YOUR IDEA
              </p>
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full h-48 p-4 bg-secondary border border-border rounded-md text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Describe your project idea..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveDescription}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditedDescription(projectDescription)
                        setIsEditing(false)
                      }}
                      className="px-4 py-2 border border-border rounded-md text-xs font-medium hover:bg-muted/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-secondary border border-border rounded-md p-4">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {projectDescription || "No description provided. Click Edit to add your project idea."}
                  </p>
                </div>
              )}
            </div>
          ) : (
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
                <MarkdownRenderer content={content} />
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
          )}
        </div>
      </div>
    </div>
  )
}
