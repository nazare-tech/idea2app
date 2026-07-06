"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { AnchorNav } from "@/components/layout/anchor-nav"
import { ScrollableContent } from "@/components/layout/scrollable-content"
import { ProjectHeader } from "@/components/layout/project-header"
import {
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/lib/document-definitions"
import {
  SCROLLABLE_NAV_ITEMS,
  filterNavItemsByRenderedSections,
} from "@/lib/document-sections"
import { GenerateAllHydrator } from "@/components/workspace/generate-all-hydrator"
import type { QueueItem } from "@/stores/generate-all-store"
import {
  buildDocumentGenerationDisplayStates,
  type MockupOptionStatus,
  type DocumentGenerationDisplayState,
} from "@/lib/document-generation-display-status"
import type { OpenRouterImageMockupOption } from "@/lib/mockups/openrouter-image-format"
import {
  DEFAULT_WORKSPACE_DOCUMENT,
  isWorkspaceDocumentType,
  resolveWorkspaceDocumentTab,
} from "@/lib/workspace-tab-policy"
import { useWorkspaceDocuments } from "./use-workspace-documents"
import { usePersistedGenerationState } from "./use-persisted-generation-state"
import { useWorkspaceScrollSync, getSourceTypeForScrollTarget } from "./use-workspace-scroll-sync"
import { useGenerateAllHydration } from "./use-generate-all-hydration"
import { useDocumentGeneration } from "./use-document-generation"
import type {
  LegacyDocumentStatus,
  ProjectWorkspaceProps,
  WorkspaceGenerationCounts,
} from "./workspace-types"

const VISIBLE_WORKSPACE_DOCUMENT_TYPES: DocumentType[] = Array.from(
  new Set(SCROLLABLE_NAV_ITEMS.map((item) => item.sourceType))
)

export function ProjectWorkspace({
  project,
  initialDocument = DEFAULT_WORKSPACE_DOCUMENT,
  initialDocuments,
  user,
}: ProjectWorkspaceProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [projectName, setProjectName] = useState(project.name)
  const [isNameSet, setIsNameSet] = useState(
    project.name !== "Untitled" || !!project.description
  )
  const defaultActiveDocument: DocumentType = initialDocument
  const activeDocumentStorageKey = `project_${project.id}_active_tab`
  const mockupDraftRunStorageKey = `mockup_draft_run_${project.id}`
  const mockupDraftDesignPlanStorageKey = `mockup_draft_design_plan_${project.id}`

  useEffect(() => {
    setProjectName(project.name)
  }, [project.name])

  const [activeDocument, setActiveDocument] = useState<DocumentType>(() => {
    // Only use searchParams for initial render to avoid hydration mismatch.
    return resolveWorkspaceDocumentTab(searchParams.get("tab"))
  })
  const [mockupOptionStatuses, setMockupOptionStatuses] = useState<MockupOptionStatus[]>([])
  const [mockupDraftRunId, setMockupDraftRunId] = useState<string | null>(null)
  const [mockupDraftOptions, setMockupDraftOptions] = useState<OpenRouterImageMockupOption[]>([])
  const [mockupDraftDesignPlan, setMockupDraftDesignPlan] = useState<unknown>(null)
  const [localGenerationErrors, setLocalGenerationErrors] = useState<Partial<Record<DocumentType, string>>>({})
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<Record<DocumentType, number>>({
    ...Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, 0])),
  } as Record<DocumentType, number>)
  const {
    documentCollections,
    loadedDocuments,
    isWorkspaceLoading,
    loadWorkspaceDocuments,
  } = useWorkspaceDocuments({
    projectId: project.id,
    activeDocument,
    initialDocuments,
  })

  useEffect(() => {
    if (typeof window === "undefined" || mockupDraftRunId) return

    const storedRunId = localStorage.getItem(mockupDraftRunStorageKey)
    if (storedRunId) {
      setMockupDraftRunId(storedRunId)
    }

    const storedDesignPlan = localStorage.getItem(mockupDraftDesignPlanStorageKey)
    if (storedDesignPlan) {
      try {
        setMockupDraftDesignPlan(JSON.parse(storedDesignPlan))
      } catch {
        localStorage.removeItem(mockupDraftDesignPlanStorageKey)
      }
    }
  }, [mockupDraftDesignPlanStorageKey, mockupDraftRunId, mockupDraftRunStorageKey])

  const analyses = documentCollections.competitive
  const prds = documentCollections.prd
  const mvpPlans = documentCollections.mvp
  const mockups = documentCollections.mockups
  const techSpecs = documentCollections.techspec
  const deployments = documentCollections.deploy

  const getGenerationSnapshot = useCallback(async (): Promise<WorkspaceGenerationCounts | null> => {
    try {
      const response = await fetch(`/api/projects/${project.id}/status`, {
        cache: "no-store",
      })

      if (!response.ok) return null

      const payload = await response.json()
      return (payload?.data?.counts as WorkspaceGenerationCounts | undefined) ?? null
    } catch {
      return null
    }
  }, [project.id])

  const getInitialCount = useCallback((docType: DocumentType): number => {
    switch (docType) {
      case "competitive":
        return analyses.filter(a => a.type === "competitive-analysis").length
      case "prd":
        return prds.length
      case "mvp":
        return mvpPlans.length
      case "mockups":
        return mockups.length
      case "techspec":
        return techSpecs.length
      case "deploy":
        return deployments.length
      default:
        return 0
    }
  }, [analyses, prds, mvpPlans, mockups, techSpecs, deployments])

  const { generateAllQueue, generateAllStatus, resumeGenerateAll } = useGenerateAllHydration(project.id)
  const {
    generatingDocuments,
    setGeneratingDocuments,
    saveGeneratingState,
    loadGeneratingState,
    checkIfContentIncreased,
  } = usePersistedGenerationState({
    projectId: project.id,
    getInitialCount,
  })
  const {
    scrollContainerRef,
    activeSectionId,
    renderedSectionIds,
    handleScrollNavigate,
  } = useWorkspaceScrollSync({
    activeDocument,
    setActiveDocument,
    loadWorkspaceDocuments,
  })

  useEffect(() => {
    setActiveDocument(resolveWorkspaceDocumentTab(searchParams.get("tab")))
  }, [searchParams])

  useEffect(() => {
    void loadWorkspaceDocuments([...VISIBLE_WORKSPACE_DOCUMENT_TYPES, activeDocument])
  }, [activeDocument, loadWorkspaceDocuments])

  useEffect(() => {
    if (typeof window === "undefined") return

    const hashTarget = decodeURIComponent(window.location.hash.replace(/^#/, ""))
    if (!hashTarget) return

    const sourceType = getSourceTypeForScrollTarget(hashTarget)
    if (!sourceType) return

    if (sourceType !== activeDocument) {
      setActiveDocument(sourceType)
    }

    void loadWorkspaceDocuments([sourceType])
  }, [activeDocument, loadWorkspaceDocuments])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(activeDocumentStorageKey, activeDocument)
    } catch {
      // Ignore localStorage write errors
    }

    const nextParams = new URLSearchParams(searchParams.toString())
    const urlTab = nextParams.get("tab")
    // Only push when activeDocument is leading the URL (e.g. tab click via handleDocumentSelect
    // already set both state and URL to the same value, so this is a no-op in the common case).
    // If the URL already has a valid doc type that differs from activeDocument it means the URL
    // changed first (Link click, browser back/fwd) — effect 282 will sync activeDocument to it.
    // Overriding the URL here would create an infinite redirect loop.
    if (
      urlTab !== activeDocument &&
      !isWorkspaceDocumentType(urlTab) &&
      activeDocument !== defaultActiveDocument
    ) {
      nextParams.set("tab", activeDocument)
      window.history.replaceState(null, "", `${pathname}?${nextParams.toString()}${window.location.hash}`)
    }
  }, [activeDocument, activeDocumentStorageKey, defaultActiveDocument, pathname, searchParams])

  // Poll for new content when documents are generating, and refresh only when versions arrive.
  useEffect(() => {
    const activeDocumentTypes = (Object.entries(generatingDocuments) as [DocumentType, boolean][])
      .filter(([, isGenerating]) => isGenerating)
      .map(([type]) => type)

    if (activeDocumentTypes.length === 0) return

    let isCanceled = false
    let pollDelayMs = 1000
    let pollTimeout: ReturnType<typeof setTimeout> | null = null

    const clearPoll = () => {
      if (pollTimeout) {
        clearTimeout(pollTimeout)
        pollTimeout = null
      }
    }

    const pollGenerationCompletion = async () => {
      if (isCanceled) return

      const snapshot = await getGenerationSnapshot()
      if (isCanceled) return

      const completedDocs: DocumentType[] = []
      const activeDocs: DocumentType[] = []

      for (const type of activeDocumentTypes) {
        if (!loadGeneratingState(type)) {
          completedDocs.push(type)
          continue
        }

        if (!snapshot) {
          activeDocs.push(type)
          continue
        }

        const remoteCount = snapshot[type]
        if (remoteCount === undefined) {
          activeDocs.push(type)
          continue
        }

        if (checkIfContentIncreased(type, remoteCount)) {
          completedDocs.push(type)
        } else {
          activeDocs.push(type)
        }
      }

      if (completedDocs.length > 0) {
        completedDocs.forEach((type) => {
          saveGeneratingState(type, false)
        })

        let didChange = false
        setGeneratingDocuments(prev => {
          const next = { ...prev }
          let changed = false

          for (const type of completedDocs) {
            if (next[type]) {
              next[type] = false
              changed = true
              didChange = true
            }
          }

          return changed ? next : prev
        })

        if (didChange) {
          void loadWorkspaceDocuments(["competitive", "prd", "mvp", "mockups", "techspec", "deploy"], { force: true })
        }
      }

      if (activeDocs.length > 0 && !isCanceled) {
        pollDelayMs = Math.min(6000, Math.round(pollDelayMs * 1.35))
        pollTimeout = setTimeout(() => {
          void pollGenerationCompletion()
        }, pollDelayMs)
      } else {
        clearPoll()
      }
    }

    pollGenerationCompletion()

    return () => {
      isCanceled = true
      clearPoll()
    }
  }, [
    generatingDocuments,
    getGenerationSnapshot,
    checkIfContentIncreased,
    loadGeneratingState,
    loadWorkspaceDocuments,
    saveGeneratingState,
    setGeneratingDocuments,
  ])

  const getLegacyDocumentStatus = (type: DocumentType): LegacyDocumentStatus => {
    // Check if document is currently generating
    if (generatingDocuments[type]) {
      return "in_progress"
    }

    switch (type) {
      case "prompt":
        return project.description ? "done" : "pending"
      case "competitive":
        return analyses.some(a => a.type === "competitive-analysis") ? "done" : "pending"
      case "prd":
        return prds.length > 0 ? "done" : "pending"
      case "mvp":
        return mvpPlans.length > 0 ? "done" : "pending"
      case "mockups":
        return mockups.length > 0 ? "done" : "pending"
      case "techspec":
        return techSpecs.length > 0 ? "done" : "pending"
      case "deploy":
        return deployments.length > 0 ? "done" : "pending"
      default:
        return "pending"
    }
  }

  const localFailureQueueItems = useMemo(() => (
    Object.entries(localGenerationErrors)
      .filter(([, error]) => Boolean(error))
      .map(([docType, error]) => ({
        docType: docType as DocumentType,
        label: DOCUMENT_TYPES.includes(docType as DocumentType) ? docType : "Document",
        status: "error" as const,
        creditCost: 0,
        error,
      } satisfies QueueItem))
  ), [localGenerationErrors])

  const mockupPreviewImages = useMemo(() => (
    Array.from(
      new Set(
        mockupDraftOptions
          .map((option) => option.imageUrl)
          .filter((imageUrl): imageUrl is string => Boolean(imageUrl?.trim()))
      )
    )
  ), [mockupDraftOptions])

  useEffect(() => {
    if (mockups.length > 0) {
      setMockupDraftOptions([])
      setMockupOptionStatuses([])
    }
  }, [mockups.length])

  useEffect(() => {
    if (mockups.length > 0 || !mockupDraftRunId) return

    const optionLabels = ["A", "B", "C"] as const
    const getOptionStatusLabel = (label: typeof optionLabels[number]) => `Option ${label}`
    let isCanceled = false

    const recoverLocalDraftOptions = async () => {
      try {
        const response = await fetch("/api/mockups/recover-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            runId: mockupDraftRunId,
            designPlan: mockupDraftDesignPlan,
          }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok || isCanceled) return

        const storedOptions = Array.isArray(payload?.options)
          ? payload.options.filter((option: unknown): option is OpenRouterImageMockupOption =>
            Boolean(
              option &&
              typeof option === "object" &&
              typeof (option as OpenRouterImageMockupOption).label === "string" &&
              typeof (option as OpenRouterImageMockupOption).storagePath === "string",
            )
          )
          : []

        if (storedOptions.length === 0) return

        setMockupDraftOptions((prev) => {
          const optionsByLabel = new Map(prev.map((option) => [option.label.toUpperCase(), option]))
          for (const option of storedOptions) {
            const label = option.label.toUpperCase()
            if (optionLabels.includes(label as typeof optionLabels[number])) {
              optionsByLabel.set(label, option)
            }
          }
          return optionLabels
            .map((label) => optionsByLabel.get(label))
            .filter((option): option is OpenRouterImageMockupOption => Boolean(option))
        })

        setMockupOptionStatuses((prev) => {
          const existing = new Map(prev.map((option) => [option.label, option]))
          for (const option of storedOptions) {
            const label = option.label.toUpperCase() as typeof optionLabels[number]
            if (!optionLabels.includes(label)) continue
            existing.set(getOptionStatusLabel(label), {
              label: getOptionStatusLabel(label),
              status: "ready",
              message: "Recovered",
            })
          }

          return optionLabels.map((label) =>
            existing.get(getOptionStatusLabel(label)) ?? {
              label: getOptionStatusLabel(label),
              status: "needs_retry" as const,
              message: "Needs retry",
            }
          )
        })
      } catch {
        // Draft recovery is opportunistic; manual generation can still retry missing options.
      }
    }

    void recoverLocalDraftOptions()

    return () => {
      isCanceled = true
    }
  }, [mockupDraftDesignPlan, mockupDraftRunId, mockups.length, project.id])

  useEffect(() => {
    if (mockups.length > 0) return

    const mockupQueueItem = generateAllQueue.find((item) =>
      item.docType === "mockups" &&
      item.status === "generating" &&
      typeof item.runId === "string" &&
      item.runId.trim().length > 0
    )
    const runId = mockupQueueItem?.runId?.trim()
    if (!runId) return

    const optionLabels = ["A", "B", "C"] as const
    const getOptionStatusLabel = (label: typeof optionLabels[number]) => `Option ${label}`
    let isCanceled = false

    const markRecoveredOptions = (storedOptions: OpenRouterImageMockupOption[]) => {
      if (storedOptions.length === 0) return

      setMockupDraftRunId(runId)
      setMockupDraftOptions((prev) => {
        const optionsByLabel = new Map(prev.map((option) => [option.label.toUpperCase(), option]))
        for (const option of storedOptions) {
          const label = option.label.toUpperCase()
          if (optionLabels.includes(label as typeof optionLabels[number])) {
            optionsByLabel.set(label, option)
          }
        }
        return optionLabels
          .map((label) => optionsByLabel.get(label))
          .filter((option): option is OpenRouterImageMockupOption => Boolean(option))
      })
      setMockupOptionStatuses((prev) => {
        const existing = new Map(prev.map((option) => [option.label, option]))
        for (const option of storedOptions) {
          const label = option.label.toUpperCase() as typeof optionLabels[number]
          if (!optionLabels.includes(label)) continue
          existing.set(getOptionStatusLabel(label), {
            label: getOptionStatusLabel(label),
            status: "ready",
            message: "Ready",
          })
        }

        return optionLabels.map((label) =>
          existing.get(getOptionStatusLabel(label)) ?? {
            label: getOptionStatusLabel(label),
            status: "generating" as const,
            message: "Generating",
          }
        )
      })
    }

    const recoverQueueOptions = async () => {
      try {
        const response = await fetch("/api/mockups/recover-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            runId,
          }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok || isCanceled) return

        const storedOptions = Array.isArray(payload?.options)
          ? payload.options.filter((option: unknown): option is OpenRouterImageMockupOption =>
            Boolean(
              option &&
              typeof option === "object" &&
              typeof (option as OpenRouterImageMockupOption).label === "string" &&
              typeof (option as OpenRouterImageMockupOption).storagePath === "string",
            )
          )
          : []
        markRecoveredOptions(storedOptions)
      } catch {
        // Recovery is opportunistic; the queue status remains the source of truth.
      }
    }

    setMockupOptionStatuses((prev) => {
      if (prev.length > 0) return prev
      return optionLabels.map((label) => ({
        label: getOptionStatusLabel(label),
        status: "generating" as const,
        message: "Generating",
      }))
    })
    void recoverQueueOptions()
    const interval = window.setInterval(() => {
      void recoverQueueOptions()
    }, 5000)

    return () => {
      isCanceled = true
      window.clearInterval(interval)
    }
  }, [generateAllQueue, mockups.length, project.id])

  const displayStates = buildDocumentGenerationDisplayStates({
    documentTypes: ["competitive", "prd", "mvp", "mockups"],
    labels: {
      competitive: "Market Research",
      prd: "Product Plan",
      mvp: "First Version Plan",
      mockups: "Design Mockups",
    },
    hasContent: {
      competitive: analyses.some(a => a.type === "competitive-analysis"),
      prd: prds.length > 0,
      mvp: mvpPlans.length > 0,
      mockups: mockups.length > 0,
    },
    queueItems: [...generateAllQueue, ...localFailureQueueItems],
    locallyGenerating: generatingDocuments,
    mockupOptionStatuses,
    mockupPreviewImages,
  })

  const getDocumentStatus = (type: DocumentType): LegacyDocumentStatus => {
    const displayState = displayStates[type]
    if (displayState?.navStatus === "done") return "done"
    if (displayState?.navStatus === "in_progress") return "in_progress"
    return getLegacyDocumentStatus(type)
  }

  const getDocumentContent = (type: DocumentType): string | null => {
    const versionIndex = selectedVersionIndex[type] || 0

    switch (type) {
      case "prompt":
        return project.description
      case "competitive":
        const compAnalyses = analyses.filter(a => a.type === "competitive-analysis")
        return compAnalyses[versionIndex]?.content || null
      case "prd":
        return prds[versionIndex]?.content || null
      case "mvp":
        return mvpPlans[versionIndex]?.content || null
      case "mockups":
        return mockups[versionIndex]?.content || null
      case "techspec":
        return techSpecs[versionIndex]?.content || null
      case "deploy":
        const deployment = deployments[versionIndex]
        if (!deployment) return null
        return deployment.deployment_url
          ? `**Deployment URL:** ${deployment.deployment_url}\n\n**Status:** ${deployment.status || "Unknown"}`
          : deployment.error_message || deployment.build_logs || null
      default:
        return null
    }
  }

  const getDocumentMetadata = (
    type: DocumentType
  ): Record<string, unknown> | null => {
    const versionIndex = selectedVersionIndex[type] || 0

    switch (type) {
      case "competitive":
        return analyses.filter(a => a.type === "competitive-analysis")[versionIndex]?.metadata || null
      default:
        return null
    }
  }

  const handleProjectNameUpdate = async (nextName: string) => {
    const trimmedName = nextName.trim() || "Untitled"
    const previousProjectName = projectName

    if (trimmedName === projectName) {
      return
    }

    setProjectName(trimmedName)

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        throw new Error("Failed to update project name")
      }
    } catch (error) {
      setProjectName(previousProjectName)
      console.error("Error updating project name:", error)
      throw error
    }
  }

  // Reset to latest version (index 0) when switching documents
  useEffect(() => {
    setSelectedVersionIndex(prev => ({
      ...prev,
      [activeDocument]: 0,
    }))
  }, [activeDocument])

  const { handleGenerateDocument } = useDocumentGeneration({
    analyses,
    prds,
    mvpPlans,
    techSpecs,
    project,
    projectName,
    searchParams,
    mockupDraftDesignPlan,
    mockupDraftDesignPlanStorageKey,
    mockupDraftOptions,
    mockupDraftRunId,
    mockupDraftRunStorageKey,
    generateAllQueue,
    generateAllStatus,
    loadWorkspaceDocuments,
    resumeGenerateAll,
    saveGeneratingState,
    setGeneratingDocuments,
    setLocalGenerationErrors,
    setMockupDraftDesignPlan,
    setMockupDraftOptions,
    setMockupDraftRunId,
    setMockupOptionStatuses,
  })
  // Build document data map for ScrollableContent
  const scrollableDocuments: Record<string, {
    content: string | null
    metadata?: Record<string, unknown> | null
    isGenerating: boolean
    isLoading?: boolean
    displayState?: DocumentGenerationDisplayState
    mockupDraftOptions?: OpenRouterImageMockupOption[]
  }> = {
    competitive: {
      content: getDocumentContent("competitive"),
      metadata: getDocumentMetadata("competitive"),
      isGenerating: generatingDocuments["competitive"] || displayStates.competitive?.displayStatus === "generating",
      isLoading: !loadedDocuments.competitive,
      displayState: displayStates.competitive,
    },
    prd: {
      content: getDocumentContent("prd"),
      metadata: null,
      isGenerating: generatingDocuments["prd"] || displayStates.prd?.displayStatus === "generating",
      isLoading: !loadedDocuments.prd,
      displayState: displayStates.prd,
    },
    mvp: {
      content: getDocumentContent("mvp"),
      metadata: null,
      isGenerating: generatingDocuments["mvp"] || displayStates.mvp?.displayStatus === "generating",
      isLoading: !loadedDocuments.mvp,
      displayState: displayStates.mvp,
    },
    mockups: {
      content: getDocumentContent("mockups"),
      metadata: null,
      isGenerating: generatingDocuments["mockups"] || displayStates.mockups?.displayStatus === "generating",
      isLoading: !loadedDocuments.mockups,
      displayState: displayStates.mockups,
      mockupDraftOptions,
    },
  }

  // Build status map for AnchorNav (keyed by sourceType)
  const navDocumentStatuses: Record<string, LegacyDocumentStatus | "needs_retry"> = {}
  const navDocumentDisplayStates: Record<string, DocumentGenerationDisplayState> = {}
  for (const item of SCROLLABLE_NAV_ITEMS) {
    if (!navDocumentStatuses[item.sourceType]) {
      const sourceType = item.sourceType as DocumentType
      navDocumentStatuses[item.sourceType] = displayStates[sourceType]?.navStatus ?? getDocumentStatus(sourceType)
    }
    if (displayStates[item.sourceType]) {
      navDocumentDisplayStates[item.key] = displayStates[item.sourceType]
    }
  }
  const visibleNavItems = filterNavItemsByRenderedSections(
    SCROLLABLE_NAV_ITEMS,
    renderedSectionIds,
  )

  const handleGenerationStepComplete = useCallback((completedDocTypes: DocumentType[]) => {
    const docTypes = completedDocTypes.length > 0
      ? completedDocTypes
      : VISIBLE_WORKSPACE_DOCUMENT_TYPES

    void loadWorkspaceDocuments(docTypes, { force: true })
  }, [loadWorkspaceDocuments])

  return (
    <>
      <GenerateAllHydrator
        projectId={project.id}
        onStepComplete={handleGenerationStepComplete}
        getDocumentStatus={getDocumentStatus}
      />
      <div className="flex flex-col h-screen">
        <ProjectHeader
          projectName={projectName}
          isNameSet={isNameSet}
          nameJustSet={false}
          onStartRename={() => {}}
          onFinishRename={async (name) => {
            await handleProjectNameUpdate(name)
            setIsNameSet(true)
          }}
          isSavingName={false}
          user={user as { email?: string; full_name?: string; avatar_url?: string }}
        />

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {isWorkspaceLoading ? (
            <div className="pointer-events-none absolute inset-x-0 top-16 z-10 h-0.5 overflow-hidden bg-transparent">
              <div className="h-full w-1/3 animate-[workspaceLoad_1s_ease-in-out_infinite] bg-primary/70" />
            </div>
          ) : null}
          <AnchorNav
            navItems={visibleNavItems}
            documentStatuses={navDocumentStatuses}
            documentDisplayStates={navDocumentDisplayStates}
            activeSectionId={activeSectionId}
            onNavigate={handleScrollNavigate}
            onGenerateDocument={handleGenerateDocument}
          />
          <ScrollableContent
            ref={scrollContainerRef}
            projectId={project.id}
            documents={scrollableDocuments}
            onGenerateDocument={handleGenerateDocument}
          />
        </div>
      </div>
    </>
  )
}
