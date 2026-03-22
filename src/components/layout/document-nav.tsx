"use client"

import { cn } from "@/lib/utils"
import {
  StackedTabNav,
  type StackedTabNavItem,
} from "@/components/layout/stacked-tab-nav"
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

  const items: StackedTabNavItem[] = NAV_DOCUMENT_DEFINITIONS.map((doc) => ({
    key: doc.type,
    label: doc.label,
    description: doc.description,
    icon: doc.icon,
    disabled: !canSelectDocument(doc.type),
    onSelect: () => onDocumentSelect(doc.type),
    trailing: doc.type !== "prompt" ? <StatusBadge status={getStatus(doc.type)} /> : undefined,
  }))

  return (
    <StackedTabNav items={items} activeKey={activeDocument} />
  )
}
