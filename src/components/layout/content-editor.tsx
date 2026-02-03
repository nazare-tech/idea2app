"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  PenLine,
  Search,
  GitCompare,
  FileText,
  Code,
  Boxes,
  Rocket,
  Pencil,
  Sparkles,
  Loader2,
} from "lucide-react"
import { DocumentType } from "./document-nav"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ContentEditorProps {
  documentType: DocumentType
  projectDescription: string
  content: string | null
  onGenerateContent: () => Promise<void>
  onUpdateDescription: (description: string) => Promise<void>
  isGenerating: boolean
  credits: number
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
  gap: {
    title: "Gap Analysis",
    subtitle: "Identify market opportunities",
    icon: GitCompare,
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
}: ContentEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState(projectDescription)

  const config = documentConfig[documentType]

  const handleSaveDescription = async () => {
    await onUpdateDescription(editedDescription)
    setIsEditing(false)
  }

  const canGenerate = credits >= config.creditCost

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5 border-b border-border">
        <div className="flex items-center gap-3">
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
          {documentType === "prompt" && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Edit</span>
            </button>
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
              {content ? (
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
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
