"use client"

import { cn } from "@/lib/utils"
import {
  PenLine,
  Search,
  FileText,
  Target,
  Code,
  Rocket,
} from "lucide-react"

export type DocumentType = "prompt" | "competitive" | "prd" | "mvp" | "techspec" | "deploy"

interface DocumentStatus {
  type: DocumentType
  status: "done" | "in_progress" | "pending"
}

interface DocumentNavProps {
  projectName: string
  activeDocument: DocumentType
  onDocumentSelect: (type: DocumentType) => void
  documentStatuses: DocumentStatus[]
}

const documents: {
  type: DocumentType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  { type: "prompt", label: "Prompt", description: "Your input", icon: PenLine },
  { type: "competitive", label: "Competitive Research", description: "", icon: Search },
  { type: "prd", label: "PRD", description: "", icon: FileText },
  { type: "mvp", label: "MVP Plan", description: "", icon: Target },
  { type: "techspec", label: "Tech Spec", description: "", icon: Code },
  { type: "deploy", label: "Deploy", description: "", icon: Rocket },
]

function StatusBadge({ status }: { status: "done" | "in_progress" | "pending" }) {
  const statusConfig = {
    done: { label: "Done", className: "status-done" },
    in_progress: { label: "In Progress", className: "status-in-progress" },
    pending: { label: "Pending", className: "status-pending" },
  }

  const config = statusConfig[status]

  return (
    <span className={cn("text-[9px] font-medium font-mono px-2 py-0.5 rounded-sm", config.className)}>
      {config.label}
    </span>
  )
}

export function DocumentNav({
  projectName,
  activeDocument,
  onDocumentSelect,
  documentStatuses,
}: DocumentNavProps) {
  const getStatus = (type: DocumentType): "done" | "in_progress" | "pending" => {
    const docStatus = documentStatuses.find(d => d.type === type)
    return docStatus?.status || "pending"
  }

  return (
    <div className="flex h-full w-[280px] flex-col bg-card border-r border-border">
      {/* Project label */}
      <div className="px-6 pt-6 pb-3">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">
          {projectName}
        </p>
      </div>

      {/* Section Label */}
      <div className="px-6 pt-6 pb-3">
        <p className="text-[10px] font-medium tracking-[1px] font-mono text-muted-foreground">
          DOCUMENTS
        </p>
      </div>

      {/* Document List */}
      <nav className="flex-1 overflow-y-auto">
        {documents.map((doc, index) => {
          const isActive = activeDocument === doc.type
          const status = getStatus(doc.type)
          const isLast = index === documents.length - 1

          return (
            <button
              key={doc.type}
              onClick={() => onDocumentSelect(doc.type)}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors",
                isActive
                  ? "bg-background border-l-[3px] border-l-primary"
                  : "border-b border-border hover:bg-muted/50",
                isLast && !isActive && "border-b-0"
              )}
            >
              <doc.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-[13px] truncate",
                    isActive ? "font-semibold text-foreground" : "font-medium text-foreground"
                  )}
                >
                  {doc.label}
                </p>
                {doc.description && isActive && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {doc.description}
                  </p>
                )}
              </div>
              {doc.type !== "prompt" && <StatusBadge status={status} />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
