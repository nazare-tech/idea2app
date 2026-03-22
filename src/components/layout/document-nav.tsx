"use client"

import { cn } from "@/lib/utils"
import {
  NAV_DOCUMENT_DEFINITIONS,
  type DocumentType,
} from "@/lib/document-definitions"

export type { DocumentType } from "@/lib/document-definitions"

interface DocumentStatus {
  type: DocumentType
  status: "done" | "in_progress" | "pending"
}

interface DocumentNavProps {
  projectName: string
  activeDocument: DocumentType
  onDocumentSelect: (type: DocumentType) => void
  documentStatuses: DocumentStatus[]
  isNewProject?: boolean
  shouldFocusName?: boolean
  onProjectNameUpdate?: (name: string) => Promise<void> | void
}

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
  activeDocument,
  onDocumentSelect,
  documentStatuses,
  isNewProject = false,
}: DocumentNavProps) {
  const getStatus = (type: DocumentType): "done" | "in_progress" | "pending" => {
    const docStatus = documentStatuses.find(d => d.type === type)
    return docStatus?.status || "pending"
  }

  const canSelectDocument = (type: DocumentType) => {
    return !(isNewProject && type !== "prompt")
  }

  return (
    <div className="flex h-full w-[280px] flex-col bg-card border-r border-border">
      {/* Document List */}
      <nav className="flex-1 overflow-y-auto">
        {NAV_DOCUMENT_DEFINITIONS.map((doc, index) => {
          const isActive = activeDocument === doc.type
          const status = getStatus(doc.type)
          const isLast = index === NAV_DOCUMENT_DEFINITIONS.length - 1

          return (
            <button
              key={doc.type}
              onClick={() => onDocumentSelect(doc.type)}
              disabled={!canSelectDocument(doc.type)}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors",
                !canSelectDocument(doc.type)
                  ? "cursor-not-allowed opacity-50"
                  : "",
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
