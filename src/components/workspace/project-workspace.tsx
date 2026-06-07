"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnchorNav } from "@/components/layout/anchor-nav"
import { ScrollableContent } from "@/components/layout/scrollable-content"
import { ProjectHeader } from "@/components/layout/project-header"
import { parseDocumentStream } from "@/lib/parse-document-stream"
import {
  DOCUMENT_TYPES,
  GENERATE_ALL_DEFAULT_MODELS,
  type DocumentType,
} from "@/lib/document-definitions"
import {
  SCROLLABLE_NAV_ITEMS,
  filterNavItemsByRenderedSections,
} from "@/lib/document-sections"
import { GenerateAllHydrator } from "@/components/workspace/generate-all-hydrator"
import { useGenerateAll, type GenerateDocumentFn, type QueueItem } from "@/stores/generate-all-store"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { shouldResumeQueueAfterDocumentRetry } from "@/lib/generate-all-helpers"
import {
  buildDocumentGenerationDisplayStates,
  type MockupOptionStatus,
  type DocumentGenerationDisplayState,
} from "@/lib/document-generation-display-status"
import type { OpenRouterImageMockupOption } from "@/lib/openrouter-image-mockup-format"
import {
  DEFAULT_WORKSPACE_DOCUMENT,
  isWorkspaceDocumentType,
  resolveWorkspaceDocumentTab,
} from "@/lib/workspace-tab-policy"
import {
  chooseActiveScrollCandidate,
  type ScrollSyncCandidate,
} from "@/lib/workspace-scroll-sync"

const GENERATION_REQUEST_TIMEOUT_MS = 790_000
const GENERATION_REQUEST_TIMEOUT_SECONDS = GENERATION_REQUEST_TIMEOUT_MS / 1000
const GENERATION_TIMEOUT_MESSAGE = `Generation timed out after ${GENERATION_REQUEST_TIMEOUT_SECONDS} seconds. Please try again.`

interface Project {
  id: string
  name: string
  description: string | null
  status: string | null
}

interface Analysis {
  id: string
  type: string
  content: string
  created_at: string | null
  metadata?: Record<string, unknown> | null
}

interface PRD {
  id: string
  content: string
  created_at: string | null
}

interface TechSpec {
  id: string
  content: string
  created_at: string | null
}

interface MvpPlan {
  id: string
  content: string
  created_at: string | null
}

interface Mockup {
  id: string
  content: string
  model_used: string | null
  created_at: string | null
}

interface Deployment {
  id: string
  deployment_url: string | null
  github_repo_url: string | null
  status: string | null
  build_logs: string | null
  error_message: string | null
  created_at: string | null
}

interface ProjectWorkspaceProps {
  project: Project
  initialDocument?: DocumentType
  initialDocuments?: Partial<Record<DocumentType, unknown[]>>
  initialCredits?: number
  user: unknown
  isNewProject?: boolean
  hasStructuredIntake?: boolean
}

interface WorkspaceDocumentCollections {
  competitive: Analysis[]
  prd: PRD[]
  mvp: MvpPlan[]
  mockups: Mockup[]
  techspec: TechSpec[]
  deploy: Deployment[]
  launch: Analysis[]
}

const EMPTY_DOCUMENT_COLLECTIONS: WorkspaceDocumentCollections = {
  competitive: [],
  prd: [],
  mvp: [],
  mockups: [],
  techspec: [],
  deploy: [],
  launch: [],
}

type WorkspaceGenerationCounts = Partial<Record<DocumentType, number>>
type LegacyDocumentStatus = "done" | "in_progress" | "pending"
type MockupOptionGenerationResult =
  | { skipped: true }
  | {
      skipped: false
      option: OpenRouterImageMockupOption | null
      model: string
      designPlan?: unknown
      error?: string
    }

const VISIBLE_WORKSPACE_DOCUMENT_TYPES: DocumentType[] = Array.from(
  new Set(SCROLLABLE_NAV_ITEMS.map((item) => item.sourceType))
)

function applyWorkspaceDocuments(
  next: WorkspaceDocumentCollections,
  type: DocumentType,
  documents: WorkspaceDocumentCollections[keyof WorkspaceDocumentCollections] | undefined
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
    case "launch":
      next.launch = documents as Analysis[]
      break
  }
}

function getSourceTypeForScrollTarget(targetId: string): DocumentType | null {
  const navItem = SCROLLABLE_NAV_ITEMS.find(
    (item) => item.key === targetId || item.sections.some((section) => section.id === targetId)
  )

  return navItem?.sourceType ?? null
}

function isScrollableSubsectionId(targetId: string) {
  return SCROLLABLE_NAV_ITEMS.some((item) =>
    item.sections.some((section) => section.id === targetId)
  )
}

function areStringSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  if (left.size !== right.size) return false

  for (const value of left) {
    if (!right.has(value)) return false
  }

  return true
}

export function ProjectWorkspace({
  project,
  initialDocument = DEFAULT_WORKSPACE_DOCUMENT,
  initialDocuments,
  initialCredits = 0,
  user,
  isNewProject = false,
  hasStructuredIntake = false,
}: ProjectWorkspaceProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [projectName, setProjectName] = useState(project.name)
  const [draftProjectName, setDraftProjectName] = useState(project.name)
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [isSavingProjectName, setIsSavingProjectName] = useState(false)
  const [isNameSet, setIsNameSet] = useState(
    project.name !== "Untitled" || !!project.description
  )
  const [nameJustSet, setNameJustSet] = useState(false)
  const defaultActiveDocument: DocumentType = initialDocument
  const projectNameInputRef = useRef<HTMLInputElement>(null)
  const nameJustSetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeDocumentStorageKey = `project_${project.id}_active_tab`
  const mockupDraftRunStorageKey = `mockup_draft_run_${project.id}`
  const mockupDraftDesignPlanStorageKey = `mockup_draft_design_plan_${project.id}`

  useEffect(() => {
    setProjectName(project.name)
    setDraftProjectName(project.name)
  }, [project.name])

  useEffect(() => {
    if (isEditingProjectName) {
      projectNameInputRef.current?.focus()
      projectNameInputRef.current?.select()
    }
  }, [isEditingProjectName])

  useEffect(() => {
    return () => {
      if (nameJustSetTimerRef.current) clearTimeout(nameJustSetTimerRef.current)
    }
  }, [])

  const [activeDocument, setActiveDocument] = useState<DocumentType>(() => {
    // Only use searchParams for initial render to avoid hydration mismatch.
    return resolveWorkspaceDocumentTab(searchParams.get("tab"))
  })
  const [generatingDocuments, setGeneratingDocuments] = useState<Record<DocumentType, boolean>>({
    ...Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, false])),
  } as Record<DocumentType, boolean>)
  const [mockupOptionStatuses, setMockupOptionStatuses] = useState<MockupOptionStatus[]>([])
  const [mockupDraftRunId, setMockupDraftRunId] = useState<string | null>(null)
  const [mockupDraftOptions, setMockupDraftOptions] = useState<OpenRouterImageMockupOption[]>([])
  const [mockupDraftDesignPlan, setMockupDraftDesignPlan] = useState<unknown>(null)
  const [localGenerationErrors, setLocalGenerationErrors] = useState<Partial<Record<DocumentType, string>>>({})
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<Record<DocumentType, number>>({
    ...Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, 0])),
  } as Record<DocumentType, number>)
  // Local content overrides for immediate UI updates after inline edits
  // Key format: `${documentType}-${recordId}` -> updated content
  const [localContentOverrides, setLocalContentOverrides] = useState<Record<string, string>>({})
  const [credits, setCredits] = useState(initialCredits)
  const [documentCollections, setDocumentCollections] = useState<WorkspaceDocumentCollections>({
    ...EMPTY_DOCUMENT_COLLECTIONS,
    competitive: (initialDocuments?.competitive as Analysis[] | undefined) ?? [],
    prd: (initialDocuments?.prd as PRD[] | undefined) ?? [],
    mvp: (initialDocuments?.mvp as MvpPlan[] | undefined) ?? [],
    mockups: (initialDocuments?.mockups as Mockup[] | undefined) ?? [],
    techspec: (initialDocuments?.techspec as TechSpec[] | undefined) ?? [],
    deploy: (initialDocuments?.deploy as Deployment[] | undefined) ?? [],
    launch: (initialDocuments?.launch as Analysis[] | undefined) ?? [],
  })
  const [loadedDocuments, setLoadedDocuments] = useState<Record<DocumentType, boolean>>({
    prompt: true,
    competitive: Boolean(initialDocuments?.competitive),
    prd: Boolean(initialDocuments?.prd),
    mvp: Boolean(initialDocuments?.mvp),
    mockups: Boolean(initialDocuments?.mockups),
    techspec: Boolean(initialDocuments?.techspec),
    deploy: Boolean(initialDocuments?.deploy),
    launch: Boolean(initialDocuments?.launch),
  })
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false)
  const loadedDocumentsRef = useRef(loadedDocuments)
  const loadingDocumentsRef = useRef(new Set<DocumentType>())

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

  const generateAllQueue = useGenerateAll(project.id, (s) => s.queue)
  const generateAllStatus = useGenerateAll(project.id, (s) => s.status)
  const resumeGenerateAll = useGenerateAll(project.id, (s) => s.startGenerateAll)

  // Scroll-nav sync state
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [renderedSectionIds, setRenderedSectionIds] = useState<ReadonlySet<string>>(() => new Set())
  const isScrollingProgrammatically = useRef(false)

  const analyses = useMemo(
    () => [...documentCollections.competitive, ...documentCollections.launch],
    [documentCollections.competitive, documentCollections.launch]
  )
  const prds = documentCollections.prd
  const mvpPlans = documentCollections.mvp
  const mockups = documentCollections.mockups
  const techSpecs = documentCollections.techspec
  const deployments = documentCollections.deploy

  useEffect(() => {
    loadedDocumentsRef.current = loadedDocuments
  }, [loadedDocuments])

  const loadWorkspaceDocuments = useCallback(async (
    docTypes: DocumentType[],
    options?: { force?: boolean }
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
      const response = await fetch(`/api/projects/${project.id}/workspace?docs=${needed.join(",")}&tab=${activeDocument}`, {
        credentials: "same-origin",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to load workspace documents")
      }

      const payload = await response.json()
      const workspaceData = payload?.data
      if (!workspaceData) return

      setCredits(typeof workspaceData.credits === "number" ? workspaceData.credits : initialCredits)
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
  }, [activeDocument, initialCredits, project.id])

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

  // Helper functions for localStorage persistence
  const getStorageKey = useCallback((docType: DocumentType) => `generating_${project.id}_${docType}`, [project.id])

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
      case "launch":
        return analyses.filter(a => a.type === "launch-plan").length
      default:
        return 0
    }
  }, [analyses, prds, mvpPlans, mockups, techSpecs, deployments])

  const saveGeneratingState = useCallback((docType: DocumentType, isGenerating: boolean) => {
    const key = getStorageKey(docType)
    if (isGenerating) {
      localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        projectId: project.id,
        initialCount: getInitialCount(docType)
      }))
    } else {
      localStorage.removeItem(key)
    }
  }, [project.id, getInitialCount, getStorageKey])

  const loadGeneratingState = useCallback((docType: DocumentType): boolean => {
    const key = getStorageKey(docType)
    const stored = localStorage.getItem(key)
    if (!stored) return false

    try {
      const { timestamp } = JSON.parse(stored)
      // Mockups can run as three separate long image calls, so keep local
      // generation state long enough for the full sequence.
      if (Date.now() - timestamp > 1200000) {
        localStorage.removeItem(key)
        return false
      }
      return true
    } catch {
      localStorage.removeItem(key)
      return false
    }
  }, [getStorageKey])

  const hydrateGeneratingStateFromStorage = useCallback((): Record<DocumentType, boolean> => {
    if (typeof window === "undefined") {
      return {
        prompt: false,
        competitive: false,
        prd: false,
        mvp: false,
        mockups: false,
        techspec: false,
        deploy: false,
        launch: false,
      }
    }

    return {
      prompt: false,
      competitive: loadGeneratingState("competitive"),
      prd: loadGeneratingState("prd"),
      mvp: loadGeneratingState("mvp"),
      mockups: loadGeneratingState("mockups"),
      techspec: loadGeneratingState("techspec"),
      deploy: loadGeneratingState("deploy"),
      launch: loadGeneratingState("launch"),
    }
  }, [loadGeneratingState])

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

  const checkIfContentIncreased = useCallback((docType: DocumentType, remoteCount?: number): boolean => {
    const key = getStorageKey(docType)
    const stored = localStorage.getItem(key)
    if (!stored) return false

    try {
      const { initialCount } = JSON.parse(stored)
      const currentCount = remoteCount ?? getInitialCount(docType)
      return currentCount > initialCount
    } catch {
      return false
    }
  }, [getStorageKey, getInitialCount])

  // Restore and sync generation flags from localStorage
  useEffect(() => {
    setGeneratingDocuments(hydrateGeneratingStateFromStorage())
  }, [project.id, hydrateGeneratingStateFromStorage])

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
          void loadWorkspaceDocuments(["competitive", "prd", "mvp", "mockups", "techspec", "deploy", "launch"], { force: true })
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
    saveGeneratingState,
    router,
  ])

  useEffect(() => {
    if (activeDocument === "prompt") return // No scroll sync in prompt mode

    const container = scrollContainerRef.current
    if (!container) return

    let frameId: number | null = null

    const collectCandidates = (): ScrollSyncCandidate[] => {
      const candidates: ScrollSyncCandidate[] = []

      container.querySelectorAll<HTMLElement>("[data-section]").forEach((element) => {
        const sectionId = element.getAttribute("data-section")
        if (!sectionId) return
        candidates.push({
          id: sectionId,
          top: element.getBoundingClientRect().top,
        })
      })

      for (const item of SCROLLABLE_NAV_ITEMS) {
        for (const section of item.sections) {
          const element = container.querySelector<HTMLElement>(`#${CSS.escape(section.id)}`)
          if (!element) continue
          candidates.push({
            id: section.id,
            top: element.getBoundingClientRect().top,
          })
        }
      }

      return candidates
    }

    const updateActiveScrollTarget = () => {
      if (isScrollingProgrammatically.current) return

      const containerRect = container.getBoundingClientRect()
      const markerTop = containerRect.top + container.clientHeight * 0.22
      const activeCandidate = chooseActiveScrollCandidate(collectCandidates(), markerTop)
      if (!activeCandidate) return

      const nextSectionId = isScrollableSubsectionId(activeCandidate.id) ? activeCandidate.id : null
      setActiveSectionId((current) => current === nextSectionId ? current : nextSectionId)

      const currentHash = decodeURIComponent(window.location.hash.replace(/^#/, ""))
      if (currentHash !== activeCandidate.id) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#${activeCandidate.id}`
        )
      }
    }

    const scheduleUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        updateActiveScrollTarget()
      })
    }

    scheduleUpdate()
    container.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      container.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [activeDocument])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const navSectionIds = SCROLLABLE_NAV_ITEMS.flatMap((item) =>
      item.sections.map((section) => section.id)
    )

    const collectRenderedSectionIds = () => {
      const nextRenderedIds = new Set<string>()

      for (const sectionId of navSectionIds) {
        if (container.querySelector<HTMLElement>(`#${CSS.escape(sectionId)}`)) {
          nextRenderedIds.add(sectionId)
        }
      }

      setRenderedSectionIds((current) =>
        areStringSetsEqual(current, nextRenderedIds) ? current : nextRenderedIds
      )
    }

    collectRenderedSectionIds()

    const observer = new MutationObserver(collectRenderedSectionIds)
    observer.observe(container, {
      attributes: true,
      attributeFilter: ["id"],
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!activeSectionId || renderedSectionIds.has(activeSectionId)) return
    setActiveSectionId(null)
  }, [activeSectionId, renderedSectionIds])


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
      case "launch":
        return analyses.some(a => a.type === "launch-plan") ? "done" : "pending"
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

  const displayStates = buildDocumentGenerationDisplayStates({
    documentTypes: ["competitive", "prd", "mvp", "mockups", "launch"],
    labels: {
      competitive: "Market Research",
      prd: "Product Plan",
      mvp: "First Version Plan",
      mockups: "Design Mockups",
      launch: "Launch Plan",
    },
    hasContent: {
      competitive: analyses.some(a => a.type === "competitive-analysis"),
      prd: prds.length > 0,
      mvp: mvpPlans.length > 0,
      mockups: mockups.length > 0,
      launch: analyses.some(a => a.type === "launch-plan"),
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

  const getVersionsForDocument = (type: DocumentType) => {
    switch (type) {
      case "competitive":
        return analyses.filter(a => a.type === "competitive-analysis")
      case "prd":
        return prds
      case "mvp":
        return mvpPlans
      case "mockups":
        return mockups
      case "techspec":
        return techSpecs
      case "deploy":
        return deployments
      case "launch":
        return analyses.filter(a => a.type === "launch-plan")
      default:
        return []
    }
  }

  const getDocumentContent = (type: DocumentType): string | null => {
    const versionIndex = selectedVersionIndex[type] || 0

    // Helper to get record ID for local override lookup
    const getRecordId = (): string | null => {
      switch (type) {
        case "competitive":
          return analyses.filter(a => a.type === "competitive-analysis")[versionIndex]?.id || null
        case "prd":
          return prds[versionIndex]?.id || null
        case "mvp":
          return mvpPlans[versionIndex]?.id || null
        case "mockups":
          return mockups[versionIndex]?.id || null
        case "techspec":
          return techSpecs[versionIndex]?.id || null
        case "launch":
          return analyses.filter(a => a.type === "launch-plan")[versionIndex]?.id || null
        default:
          return null
      }
    }

    // Check for local override first (for immediate UI updates after inline edits)
    const recordId = getRecordId()
    if (recordId) {
      const overrideKey = `${type}-${recordId}`
      if (localContentOverrides[overrideKey]) {
        return localContentOverrides[overrideKey]
      }
    }

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
      case "launch":
        const launchPlans = analyses.filter(a => a.type === "launch-plan")
        return launchPlans[versionIndex]?.content || null
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
      case "launch":
        return analyses.filter(a => a.type === "launch-plan")[versionIndex]?.metadata || null
      default:
        return null
    }
  }

  const getTotalVersions = (type: DocumentType): number => {
    return getVersionsForDocument(type).length
  }

  const handleVersionChange = (type: DocumentType, index: number) => {
    setSelectedVersionIndex(prev => ({
      ...prev,
      [type]: index,
    }))
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

  const finishProjectRename = async () => {
    const nextName = draftProjectName.trim() || "Untitled"
    setIsEditingProjectName(false)

    if (nextName === projectName) {
      setDraftProjectName(projectName)
      return
    }

    setIsSavingProjectName(true)
    try {
      await handleProjectNameUpdate(nextName)
      setDraftProjectName(nextName)
      setIsNameSet(true)
    } catch {
      setDraftProjectName(projectName)
    } finally {
      setIsSavingProjectName(false)
    }
  }

  const handleProjectNameGenerated = useCallback((name: string) => {
    setProjectName(name)
    setDraftProjectName(name)
    setIsNameSet(true)
    setNameJustSet(true)
    if (nameJustSetTimerRef.current) clearTimeout(nameJustSetTimerRef.current)
    nameJustSetTimerRef.current = setTimeout(() => setNameJustSet(false), 1200)
  }, [])

  const handleDocumentSelect = (type: DocumentType) => {
    if (!isWorkspaceDocumentType(type)) {
      return
    }

    setActiveDocument(type)

    // Use window.history directly to avoid triggering Next.js RSC re-fetch.
    // router.push/replace with only search param changes re-fetches all server data,
    // causing a visible freeze. We only need the URL updated for deep-linking.
    if (typeof window !== "undefined") {
      const nextParams = new URLSearchParams(window.location.search)
      nextParams.set("tab", type)
      window.history.pushState(null, "", `${pathname}?${nextParams.toString()}`)
    }

  }

  const handleScrollNavigate = useCallback((targetId: string) => {
    const container = scrollContainerRef.current
    if (!container) return

    const target = container.querySelector(`#${CSS.escape(targetId)}`)
      || container.querySelector(`[data-section="${targetId}"]`)
    if (!target) return

    const sourceType = getSourceTypeForScrollTarget(targetId)
    if (sourceType) {
      setActiveDocument(sourceType)
      void loadWorkspaceDocuments([sourceType])
    }

    isScrollingProgrammatically.current = true
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const containerStyle = window.getComputedStyle(container)
    const scrollPaddingTop = parseFloat(containerStyle.scrollPaddingTop) || parseFloat(containerStyle.paddingTop) || 0
    container.scrollTo({
      top: Math.max(0, container.scrollTop + targetRect.top - containerRect.top - scrollPaddingTop),
      behavior: "auto",
    })

    // Update nav state immediately
    if (isScrollableSubsectionId(targetId)) {
      setActiveSectionId(targetId)
    } else {
      setActiveSectionId(null)
    }

    // Update URL hash for deep-linking
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${targetId}`)

    // Re-enable observer after the instant scroll and active-state render settle.
    setTimeout(() => {
      isScrollingProgrammatically.current = false
    }, 50)
  }, [loadWorkspaceDocuments])

  // Reset to latest version (index 0) when switching documents
  useEffect(() => {
    setSelectedVersionIndex(prev => ({
      ...prev,
      [activeDocument]: 0,
    }))
  }, [activeDocument])

  // Check prerequisites for document generation
  const checkPrerequisites = useCallback((type: DocumentType): { canGenerate: boolean; reason?: string } => {
    switch (type) {
      case "prompt":
        return { canGenerate: true }
      case "competitive":
        if (!project.description) {
          return { canGenerate: false, reason: "Please add a project description first" }
        }
        return { canGenerate: true }
      case "prd":
        const hasCompetitiveAnalysis = analyses.some(a => a.type === "competitive-analysis")
        if (!hasCompetitiveAnalysis) {
          return { canGenerate: false, reason: "Generate Market Research first" }
        }
        return { canGenerate: true }
      case "mvp":
        if (prds.length === 0) {
          return { canGenerate: false, reason: "Generate Product Plan first" }
        }
        return { canGenerate: true }
      case "mockups":
        if (mvpPlans.length === 0) {
          return { canGenerate: false, reason: "Generate First Version Plan first" }
        }
        return { canGenerate: true }
      case "techspec":
        if (prds.length === 0) {
          return { canGenerate: false, reason: "Generate Product Plan first" }
        }
        return { canGenerate: true }
      case "deploy":
        if (techSpecs.length === 0) {
          return { canGenerate: false, reason: "Generate Tech Spec first" }
        }
        return { canGenerate: true }
      case "launch":
        if (!project.description) {
          return { canGenerate: false, reason: "Please add a project description first" }
        }
        return { canGenerate: true }
      default:
        return { canGenerate: true }
    }
  }, [analyses, mvpPlans.length, prds.length, project.description, techSpecs.length])

  const documentStatuses = (["prompt", "competitive", "prd", "mvp", "mockups", "techspec", "deploy", "launch"] as DocumentType[]).map(
    type => ({ type, status: getDocumentStatus(type) })
  )

  const handleGenerateContent = async (
    model?: string,
    options?: {
      marketingBrief?: {
        targetAudience: string
        stage: string
        budget: string
        channels: string
        launchWindow: string
      }
    }
  ) => {
    const generatingType = activeDocument
    let didGenerate = false
    let wasStreaming = false

    // Set generating state for the active document
    setGeneratingDocuments(prev => ({ ...prev, [generatingType]: true }))
    saveGeneratingState(generatingType, true)

    try {
      let endpoint = ""

      switch (generatingType) {
        case "prompt":
          throw new Error("Prompt generation is not supported")
        case "competitive":
          endpoint = "/api/analysis/competitive-analysis"
          break
        case "prd":
          endpoint = "/api/analysis/prd"
          break
        case "mvp":
          endpoint = "/api/analysis/mvp-plan"
          break
        case "mockups":
          endpoint = "/api/mockups/generate"
          break
        case "techspec":
          endpoint = "/api/analysis/tech-spec"
          break
        case "deploy":
          endpoint = "/api/generate-app"
          break
        case "launch":
          endpoint = "/api/launch/plan"
          break
        default:
          throw new Error("Unsupported document type")
      }

      // Get market research for Product Plan generation
      const competitiveAnalysis = analyses.find(a => a.type === "competitive-analysis")

      // Get latest Product Plan for First Version Plan and tech spec generation
      const latestPrd = prds[0]

      // Get latest First Version Plan for mockup generation
      const latestMvp = mvpPlans[0]

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), GENERATION_REQUEST_TIMEOUT_MS)

      let response: Response
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            projectId: project.id,
            idea: project.description,
            name: projectName,
            ...(model && { model }),
            ...(!["deploy", "launch", "prd", "mvp"].includes(generatingType) && { stream: true }),
            ...(generatingType === "deploy" && { appType: "dynamic" }),
            ...(generatingType === "prd" && competitiveAnalysis?.content && {
              competitiveAnalysis: competitiveAnalysis.content
            }),
            ...(generatingType === "mvp" && latestPrd?.content && {
              prd: latestPrd.content
            }),
            ...(generatingType === "mockups" && latestMvp?.content && {
              mvpPlan: latestMvp.content,
              projectName: project.name
            }),
            ...(generatingType === "techspec" && latestPrd?.content && {
              prd: latestPrd.content
            }),
            ...(generatingType === "launch" && options?.marketingBrief && {
              marketingBrief: options.marketingBrief,
            }),
          }),
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        let errorMsg = "Failed to generate content"
        try {
          const errorData = await response.json()
          if (errorData?.error) errorMsg = errorData.error
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMsg)
      }

      const contentType = response.headers.get("Content-Type") ?? ""
      if (contentType.includes("application/x-ndjson")) {
        // Streaming path: process NDJSON events live
        wasStreaming = true
        let streamError: string | undefined
        await parseDocumentStream(response, {
          onStage: () => {},
          onToken: () => {},
          onDone: () => { didGenerate = true },
          onError: (message) => {
            streamError = message
          },
        })
        if (streamError) throw new Error(streamError)
      } else {
        // Non-streaming JSON path (deploy or fallback)
        didGenerate = true
      }
    } catch (error) {
      console.error("Error generating content:", error)
      if (error instanceof Error && error.name === "AbortError") {
        alert(GENERATION_TIMEOUT_MESSAGE)
      } else if (error instanceof Error) {
        alert(error.message)
      }
    } finally {
      // Clear generation state once request finishes
      setGeneratingDocuments(prev => ({ ...prev, [generatingType]: false }))
      saveGeneratingState(generatingType, false)
    }

    if (!didGenerate) return

    if (wasStreaming) {
      // DB save already committed before server sent 'done'; no delay needed
      await loadWorkspaceDocuments([generatingType], { force: true })
    } else {
      // Wait a moment for database transaction to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadWorkspaceDocuments([generatingType], { force: true })
    }
  }

  // Generate a specific document type (decoupled from activeDocument state).
  // Used by GenerateAllContext for sequential pipeline generation.
  const generateDocument: GenerateDocumentFn = useCallback(
    async (docType, model, options) => {
      setGeneratingDocuments(prev => ({ ...prev, [docType]: true }))
      saveGeneratingState(docType, true)
      setLocalGenerationErrors((prev) => ({ ...prev, [docType]: undefined }))

      try {
        const endpointMap: Record<string, string> = {
          competitive: "/api/analysis/competitive-analysis",
          prd: "/api/analysis/prd",
          mvp: "/api/analysis/mvp-plan",
          mockups: "/api/mockups/generate",
          launch: "/api/launch/plan",
        }
        const endpoint = endpointMap[docType]
        if (!endpoint) throw new Error(`Unsupported document type: ${docType}`)

        // Fetch prerequisites fresh from Supabase, with closure values as a fallback.
        // Supabase is preferred because router.refresh() may not have propagated into
        // the useCallback closure yet. If the Supabase query returns null (e.g. auth
        // hiccup or timing race), the closure value (kept fresh by _updateCallbacks
        // on every render) is used instead.
        let competitiveContent: string | undefined
        let prdContent: string | undefined
        let mvpContent: string | undefined

        const supabase = createSupabaseClient()

        if (docType === "prd") {
          const { data } = await supabase
            .from("analyses")
            .select("content")
            .eq("project_id", project.id)
            .eq("type", "competitive-analysis")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          competitiveContent =
            data?.content ??
            analyses.find((a) => a.type === "competitive-analysis")?.content
        } else if (docType === "mvp") {
          const { data } = await supabase
            .from("prds")
            .select("content")
            .eq("project_id", project.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          prdContent = data?.content ?? prds[0]?.content
        } else if (docType === "mockups") {
          const { data } = await supabase
            .from("mvp_plans")
            .select("content")
            .eq("project_id", project.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          mvpContent = data?.content ?? mvpPlans[0]?.content
          const { data: productPlanData } = await supabase
            .from("prds")
            .select("content")
            .eq("project_id", project.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          prdContent = productPlanData?.content ?? prds[0]?.content
        }

        if (docType === "mockups") {
          if (!mvpContent) {
            throw new Error("Generate First Version Plan first")
          }

          const optionLabels = ["A", "B", "C"] as const
          const isMockupFixtureMode =
            searchParams.get("mockupFixture") === "1" ||
            (typeof window !== "undefined" &&
              localStorage.getItem("makercompass_mockup_fixture_mode") === "true")
          const clearMockupDraftRun = () => {
            setMockupDraftRunId(null)
            setMockupDraftDesignPlan(null)
            if (typeof window !== "undefined") {
              localStorage.removeItem(mockupDraftRunStorageKey)
              localStorage.removeItem(mockupDraftDesignPlanStorageKey)
            }
          }

          if (isMockupFixtureMode) {
            setMockupOptionStatuses(optionLabels.map((label) => ({
              label: `Option ${label}`,
              status: "generating" as const,
              message: "Generating fixture",
            })))

            const response = await fetch("/api/mockups/fixture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId: project.id,
                projectName: project.name,
              }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok) {
              throw new Error(payload?.error || "Failed to generate fixture mockups")
            }

            setMockupOptionStatuses(optionLabels.map((label) => ({
              label: `Option ${label}`,
              status: "ready" as const,
              message: "Ready",
            })))
            setMockupDraftOptions([])
            clearMockupDraftRun()
            setLocalGenerationErrors((prev) => ({ ...prev, [docType]: undefined }))
            await loadWorkspaceDocuments([docType], { force: true })
            return true
          }

          const runId = mockupDraftRunId ?? crypto.randomUUID()
          if (!mockupDraftRunId) {
            setMockupDraftRunId(runId)
            if (typeof window !== "undefined") {
              localStorage.setItem(mockupDraftRunStorageKey, runId)
            }
          }
          const optionStatusLabels: Record<typeof optionLabels[number], string> = {
            A: "Option A",
            B: "Option B",
            C: "Option C",
          }
          const getOptionStatusLabel = (label: typeof optionLabels[number]) => optionStatusLabels[label]
          const updateMockupOptionStatus = (
            label: typeof optionLabels[number],
            status: MockupOptionStatus["status"],
            message: string,
          ) => {
            setMockupOptionStatuses((prev) => {
              const existing = new Map(prev.map((option) => [option.label, option]))
              existing.set(getOptionStatusLabel(label), {
                label: getOptionStatusLabel(label),
                status,
                message,
              })
              return optionLabels.map((optionLabel) =>
                existing.get(getOptionStatusLabel(optionLabel)) ?? {
                  label: getOptionStatusLabel(optionLabel),
                  status: "queued" as const,
                  message: "Queued",
                }
              )
            })
          }

          const optionsByLabel = new Map(
            mockupDraftOptions.map((option) => [option.label.toUpperCase(), option])
          )
          let activeMockupDesignPlan = mockupDraftDesignPlan
          const syncDraftOptions = () => {
            setMockupDraftOptions(
              optionLabels
                .map((optionLabel) => optionsByLabel.get(optionLabel))
                .filter((option): option is OpenRouterImageMockupOption => Boolean(option))
            )
          }
          const markStoredOptionsReady = (storedOptions: OpenRouterImageMockupOption[]) => {
            for (const option of storedOptions) {
              const label = option.label.toUpperCase() as typeof optionLabels[number]
              if (!optionLabels.includes(label)) continue

              optionsByLabel.set(label, option)
              updateMockupOptionStatus(label, "ready", "Recovered")
            }
            syncDraftOptions()
          }
          const recoverStoredOptions = async () => {
            const response = await fetch("/api/mockups/recover-options", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId: project.id,
                runId,
                designPlan: activeMockupDesignPlan,
              }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok) return

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
            markStoredOptionsReady(storedOptions)
          }

          setMockupOptionStatuses(optionLabels.map((label) => ({
            label: getOptionStatusLabel(label),
            status: optionsByLabel.has(label) ? "ready" : "queued",
            message: optionsByLabel.has(label) ? "Ready" : "Queued",
          })))

          const externalSignal = options?.signal
          const requestWithTimeout = async (
            url: string,
            init: Omit<RequestInit, "signal">,
            timeoutMs = GENERATION_REQUEST_TIMEOUT_MS,
          ) => {
            const requestController = new AbortController()
            const timeoutId = setTimeout(() => requestController.abort(), timeoutMs)
            const handleExternalAbort = () => requestController.abort()

            if (externalSignal) {
              if (externalSignal.aborted) {
                requestController.abort()
              } else {
                externalSignal.addEventListener("abort", handleExternalAbort, { once: true })
              }
            }

            try {
              return await fetch(url, {
                ...init,
                signal: requestController.signal,
              })
            } finally {
              clearTimeout(timeoutId)
              externalSignal?.removeEventListener("abort", handleExternalAbort)
            }
          }

          await recoverStoredOptions()

          const optionResults: MockupOptionGenerationResult[] = []
          for (const label of optionLabels) {
            const existingOption = optionsByLabel.get(label)
            if (existingOption) {
              optionResults.push({
                skipped: false,
                option: existingOption,
                model,
                designPlan: activeMockupDesignPlan ?? undefined,
              })
              continue
            }

            updateMockupOptionStatus(label, "generating", "Generating")

            try {
              const response = await requestWithTimeout("/api/mockups/generate-option", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectId: project.id,
                  mvpPlan: mvpContent,
                  projectName: project.name,
                  idea: project.description,
                  productPlan: prdContent,
                  label,
                  runId,
                  designPlan: activeMockupDesignPlan,
                }),
              })

              const payload = await response.json().catch(() => null)
              if (!response.ok) {
                optionResults.push({
                  skipped: false,
                  option: null,
                  model,
                  error: payload?.error || `Failed to generate mockup option ${label}`,
                })
                continue
              }
              if (payload?.skipped) {
                optionResults.push({ skipped: true })
                continue
              }

              const option = payload?.option as OpenRouterImageMockupOption | undefined
              const resultModel = typeof payload?.model === "string" ? payload.model : model
              const returnedDesignPlan = payload?.designPlan && typeof payload.designPlan === "object"
                ? payload.designPlan
                : null
              if (!option) {
                optionResults.push({
                  skipped: false,
                  option: null,
                  model: resultModel,
                  error: `Mockup option ${label} did not return image data`,
                })
                continue
              }
              if (returnedDesignPlan && !activeMockupDesignPlan) {
                activeMockupDesignPlan = returnedDesignPlan
                setMockupDraftDesignPlan(returnedDesignPlan)
                if (typeof window !== "undefined") {
                  localStorage.setItem(mockupDraftDesignPlanStorageKey, JSON.stringify(returnedDesignPlan))
                }
              }

              updateMockupOptionStatus(label, "ready", "Ready")
              optionsByLabel.set(label, option)
              syncDraftOptions()
              optionResults.push({
                skipped: false,
                option,
                model: resultModel,
                designPlan: returnedDesignPlan ?? activeMockupDesignPlan ?? undefined,
              })
            } catch (error) {
              if (externalSignal?.aborted) throw error

              optionResults.push({
                skipped: false,
                option: null,
                model,
                error: error instanceof Error
                  ? error.message
                  : `Failed to generate mockup option ${label}`,
              })
            }
          }

          const firstSkipped = optionResults.find((result) => result.skipped)
          if (firstSkipped) {
            setMockupDraftOptions([])
            clearMockupDraftRun()
            await loadWorkspaceDocuments([docType], { force: true })
            return true
          }

          await recoverStoredOptions()

          const failures = optionResults.filter((result) =>
            !result.skipped && Boolean(result.error)
          )
          const readyOptions = optionLabels
            .map((label) => optionsByLabel.get(label))
            .filter((option): option is OpenRouterImageMockupOption => Boolean(option))

          if (readyOptions.length !== optionLabels.length) {
            optionResults.forEach((result, index) => {
              if (!result.skipped && result.error) {
                updateMockupOptionStatus(optionLabels[index], "needs_retry", "Needs retry")
              }
            })
            optionLabels.forEach((label) => {
              if (!optionsByLabel.has(label)) {
                updateMockupOptionStatus(label, "needs_retry", "Needs retry")
              }
            })
            const message = failures[0]?.skipped === false && failures[0].error
              ? failures[0].error
              : "One or more mockup options are not available yet"
            throw new Error(message)
          }

          const fulfilledModel = optionResults.find((result) =>
            !result.skipped && result.option && typeof result.model === "string"
          )
          const finalizedModel = fulfilledModel?.skipped === false ? fulfilledModel.model : model
          const finalizedDesignPlan = optionResults.find((result) =>
            !result.skipped && result.designPlan
          )
          const finalizeResponse = await requestWithTimeout("/api/mockups/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              runId,
              model: finalizedModel,
              options: readyOptions,
              designPlan: finalizedDesignPlan?.skipped === false
                ? finalizedDesignPlan.designPlan
                : activeMockupDesignPlan,
            }),
          }, 60000)
          const finalizePayload = await finalizeResponse.json().catch(() => null)
          if (!finalizeResponse.ok) {
            throw new Error(finalizePayload?.error || "Failed to save generated mockups")
          }

          setMockupDraftOptions([])
          clearMockupDraftRun()
          setLocalGenerationErrors((prev) => ({ ...prev, [docType]: undefined }))
          await loadWorkspaceDocuments([docType], { force: true })
          return true
        }

        // Use external signal (from Generate All) if provided, otherwise create our own
        const externalSignal = options?.signal
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), GENERATION_REQUEST_TIMEOUT_MS)

        // If an external signal is provided, link it to our controller
        if (externalSignal) {
          if (externalSignal.aborted) {
            controller.abort()
          } else {
            externalSignal.addEventListener("abort", () => controller.abort(), { once: true })
          }
        }

        let response: Response
        try {
          response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              projectId: project.id,
              idea: project.description,
              name: projectName,
              ...(model && { model }),
              ...(!["launch", "prd", "mvp"].includes(docType) && { stream: true }),
              ...(docType === "prd" && competitiveContent && {
                competitiveAnalysis: competitiveContent,
              }),
              ...(docType === "mvp" && prdContent && {
                prd: prdContent,
              }),
              ...(docType === "launch" && options?.marketingBrief && {
                marketingBrief: options.marketingBrief,
              }),
            }),
          })
        } finally {
          clearTimeout(timeoutId)
        }

        if (!response.ok) {
          let errorMsg = "Failed to generate content"
          try {
            const errorData = await response.json()
            if (errorData?.error) errorMsg = errorData.error
          } catch {
            // ignore parse errors
          }
          throw new Error(errorMsg)
        }

        const contentType = response.headers.get("Content-Type") ?? ""
        if (contentType.includes("application/x-ndjson")) {
          let streamError: string | undefined
          await parseDocumentStream(response, {
            onStage: () => {},
            onToken: () => {},
            onDone: () => {},
            onError: (message) => { streamError = message },
          })
          if (streamError) throw new Error(streamError)
        }

        // Success — refresh data
        await loadWorkspaceDocuments([docType], { force: true })
        setLocalGenerationErrors((prev) => ({ ...prev, [docType]: undefined }))
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generation failed"
        setLocalGenerationErrors((prev) => ({ ...prev, [docType]: message }))
        // Re-throw abort errors so the caller can distinguish cancellation from failure
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error
        }
        if (error instanceof Error) throw error
        throw new Error("Unknown generation error")
      } finally {
        setGeneratingDocuments(prev => ({ ...prev, [docType]: false }))
        saveGeneratingState(docType, false)
      }
    },
    [
      analyses,
      loadWorkspaceDocuments,
      mockupDraftDesignPlan,
      mockupDraftDesignPlanStorageKey,
      mockupDraftOptions,
      mockupDraftRunId,
      mockupDraftRunStorageKey,
      mvpPlans,
      prds,
      project,
      projectName,
      saveGeneratingState,
      searchParams,
    ],
  )

  const handleGenerateDocument = useCallback(async (docType: DocumentType) => {
    const prerequisites = checkPrerequisites(docType)
    if (!prerequisites.canGenerate) {
      alert(prerequisites.reason ?? "This module is not ready to generate yet.")
      return
    }

    try {
      if (docType !== "mockups") {
        setMockupOptionStatuses([])
      }
      const didGenerate = await generateDocument(docType, GENERATE_ALL_DEFAULT_MODELS[docType] ?? "")
      if (
        didGenerate &&
        shouldResumeQueueAfterDocumentRetry({
          queueStatus: generateAllStatus,
          retriedDocType: docType,
          queue: generateAllQueue,
        })
      ) {
        await resumeGenerateAll()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed. Please try again."
      console.warn(`[WorkspaceGeneration] ${docType} failed: ${message}`)
      if (docType === "mockups") {
        return
      }
      if (error instanceof Error && error.name === "AbortError") {
        alert(GENERATION_TIMEOUT_MESSAGE)
      } else if (error instanceof Error) {
        alert(error.message)
      } else {
        alert("Generation failed. Please try again.")
      }
    }
  }, [checkPrerequisites, generateAllQueue, generateAllStatus, generateDocument, resumeGenerateAll])

  const handleUpdateDescription = async (description: string) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })

      if (!response.ok) {
        throw new Error("Failed to update description")
      }

      void loadWorkspaceDocuments([activeDocument], { force: true })
      // Fallback: unblock name editing if AI name generation failed silently
      if (!isNameSet) setTimeout(() => setIsNameSet(true), 3000)
    } catch (error) {
      console.error("Error updating description:", error)
    }
  }

  // Build document data map for ScrollableContent
  const scrollableDocuments: Record<string, {
    content: string | null
    metadata?: Record<string, unknown> | null
    isGenerating: boolean
    isLoading?: boolean
    displayState?: DocumentGenerationDisplayState
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
    },
    launch: {
      content: getDocumentContent("launch"),
      metadata: null,
      isGenerating: generatingDocuments["launch"] || displayStates.launch?.displayStatus === "generating",
      isLoading: !loadedDocuments.launch,
      displayState: displayStates.launch,
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
    router.refresh()
  }, [loadWorkspaceDocuments, router])

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
          nameJustSet={nameJustSet}
          onStartRename={() => {}}
          onFinishRename={async (name) => {
            await handleProjectNameUpdate(name)
          }}
          isSavingName={isSavingProjectName}
          user={user as { email?: string; full_name?: string; avatar_url?: string }}
          credits={credits}
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
