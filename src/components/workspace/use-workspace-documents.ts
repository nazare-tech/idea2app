"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { DocumentType } from "@/lib/document-definitions"
import type {
  Analysis,
  Deployment,
  Mockup,
  MvpPlan,
  PRD,
  TechSpec,
  WorkspaceDocumentCollections,
} from "./workspace-types"

const EMPTY_DOCUMENT_COLLECTIONS: WorkspaceDocumentCollections = {
  competitive: [],
  prd: [],
  mvp: [],
  mockups: [],
  techspec: [],
  deploy: [],
}

function applyWorkspaceDocuments(
  next: WorkspaceDocumentCollections,
  type: DocumentType,
  documents: WorkspaceDocumentCollections[keyof WorkspaceDocumentCollections] | undefined,
) {
  if (!documents) return

  switch (type) {
    case "competitive":
      next.competitive = documents as Analysis[]
      break
    case "prd":
      next.prd = documents as PRD[]
      break
    case "mvp":
      next.mvp = documents as MvpPlan[]
      break
    case "mockups":
      next.mockups = documents as Mockup[]
      break
    case "techspec":
      next.techspec = documents as TechSpec[]
      break
    case "deploy":
      next.deploy = documents as Deployment[]
      break
  }
}

export function useWorkspaceDocuments({
  projectId,
  activeDocument,
  initialDocuments,
}: {
  projectId: string
  activeDocument: DocumentType
  initialDocuments?: Partial<Record<DocumentType, unknown[]>>
}) {
  const [documentCollections, setDocumentCollections] = useState<WorkspaceDocumentCollections>({
    ...EMPTY_DOCUMENT_COLLECTIONS,
    competitive: (initialDocuments?.competitive as Analysis[] | undefined) ?? [],
    prd: (initialDocuments?.prd as PRD[] | undefined) ?? [],
    mvp: (initialDocuments?.mvp as MvpPlan[] | undefined) ?? [],
    mockups: (initialDocuments?.mockups as Mockup[] | undefined) ?? [],
    techspec: (initialDocuments?.techspec as TechSpec[] | undefined) ?? [],
    deploy: (initialDocuments?.deploy as Deployment[] | undefined) ?? [],
  })
  const [loadedDocuments, setLoadedDocuments] = useState<Record<DocumentType, boolean>>({
    prompt: true,
    competitive: Boolean(initialDocuments?.competitive),
    prd: Boolean(initialDocuments?.prd),
    mvp: Boolean(initialDocuments?.mvp),
    mockups: Boolean(initialDocuments?.mockups),
    techspec: Boolean(initialDocuments?.techspec),
    deploy: Boolean(initialDocuments?.deploy),
  })
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false)
  const loadedDocumentsRef = useRef(loadedDocuments)
  const loadingDocumentsRef = useRef(new Set<DocumentType>())

  useEffect(() => {
    loadedDocumentsRef.current = loadedDocuments
  }, [loadedDocuments])

  const loadWorkspaceDocuments = useCallback(async (
    docTypes: DocumentType[],
    options?: { force?: boolean },
  ) => {
    const uniqueDocs = Array.from(new Set(docTypes)).filter((type) => type !== "prompt")
    const needed = uniqueDocs.filter((type) => {
      if (loadingDocumentsRef.current.has(type)) return false
      return options?.force || !loadedDocumentsRef.current[type]
    })
    if (needed.length === 0) return

    needed.forEach((type) => loadingDocumentsRef.current.add(type))
    setIsWorkspaceLoading(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/workspace?docs=${needed.join(",")}&tab=${activeDocument}`,
        {
          credentials: "same-origin",
          cache: "no-store",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to load workspace documents")
      }

      const payload = await response.json()
      const workspaceData = payload?.data
      if (!workspaceData) return

      setDocumentCollections((prev) => {
        const next = { ...prev }
        const incomingDocuments = workspaceData.documents as Partial<WorkspaceDocumentCollections> | undefined

        for (const type of needed) {
          applyWorkspaceDocuments(next, type, incomingDocuments?.[type as keyof WorkspaceDocumentCollections])
        }

        return next
      })
      setLoadedDocuments((prev) => {
        const next = { ...prev }
        needed.forEach((type) => {
          next[type] = true
        })
        return next
      })
    } finally {
      needed.forEach((type) => loadingDocumentsRef.current.delete(type))
      setIsWorkspaceLoading(false)
    }
  }, [activeDocument, projectId])

  return {
    documentCollections,
    loadedDocuments,
    isWorkspaceLoading,
    loadWorkspaceDocuments,
  }
}
