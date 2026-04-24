"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ContentEditor } from "@/components/layout/content-editor"
import { AnchorNav } from "@/components/layout/anchor-nav"
import { ScrollableContent } from "@/components/layout/scrollable-content"
import { ProjectHeader } from "@/components/layout/project-header"
import { parseDocumentStream, type StreamStage } from "@/lib/parse-document-stream"
import { DOCUMENT_TYPES, isDocumentType, type DocumentType } from "@/lib/document-definitions"
import { SCROLLABLE_NAV_ITEMS, getNavKeyForSection } from "@/lib/document-sections"
import { GenerateAllHydrator } from "@/components/workspace/generate-all-hydrator"
import type { GenerateDocumentFn } from "@/stores/generate-all-store"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"


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
  analyses: Analysis[]
  prds: PRD[]
  mvpPlans: MvpPlan[]
  mockups: Mockup[]
  techSpecs: TechSpec[]
  deployments: Deployment[]
  credits: number
  user: unknown
  isNewProject?: boolean
  hasStructuredIntake?: boolean
}

type WorkspaceGenerationCounts = Partial<Record<DocumentType, number>>

export function ProjectWorkspace({
  project,
  analyses,
  prds,
  mvpPlans,
  mockups,
  techSpecs,
  deployments,
  credits,
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
  const [isPromptOnlyMode, setIsPromptOnlyMode] = useState(isNewProject)
  const projectNameInputRef = useRef<HTMLInputElement>(null)
  const nameJustSetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeDocumentStorageKey = `project_${project.id}_active_tab`

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
    setIsPromptOnlyMode(isNewProject)
  }, [isNewProject])

  useEffect(() => {
    if (project.description) {
      setIsPromptOnlyMode(false)
    }
  }, [project.description])

  useEffect(() => {
    return () => {
      if (nameJustSetTimerRef.current) clearTimeout(nameJustSetTimerRef.current)
    }
  }, [])

  const getPersistedActiveDocument = useCallback((): DocumentType | null => {
    const tab = searchParams.get("tab")
    if (isDocumentType(tab)) {
      return tab
    }

    if (typeof window === "undefined") return null

    try {
      const stored = localStorage.getItem(activeDocumentStorageKey)
      if (isDocumentType(stored)) {
        return stored
      }
    } catch {
      return null
    }

    return null
  }, [activeDocumentStorageKey, searchParams])

  const [activeDocument, setActiveDocument] = useState<DocumentType>(() => {
    if (isNewProject || isPromptOnlyMode) return "prompt"

    // Only use searchParams for initial render to avoid hydration mismatch.
    // localStorage is restored in the useEffect below after hydration.
    const tab = searchParams.get("tab")
    if (isDocumentType(tab)) {
      return tab
    }

    return "prompt"
  })
  const [generatingDocuments, setGeneratingDocuments] = useState<Record<DocumentType, boolean>>({
    ...Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, false])),
  } as Record<DocumentType, boolean>)
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<Record<DocumentType, number>>({
    ...Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, 0])),
  } as Record<DocumentType, number>)
  // Local content overrides for immediate UI updates after inline edits
  // Key format: `${documentType}-${recordId}` -> updated content
  const [localContentOverrides, setLocalContentOverrides] = useState<Record<string, string>>({})

  // Streaming state for live NDJSON document generation
  const [streamStages, setStreamStages] = useState<StreamStage[]>([])
  const [streamCurrentStep, setStreamCurrentStep] = useState(0)
  const [streamContent, setStreamContent] = useState("")

  // Scroll-nav sync state
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeNavKey, setActiveNavKey] = useState<string | null>("overview")
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const isScrollingProgrammatically = useRef(false)

  const clearStreamState = useCallback(() => {
    setStreamStages([])
    setStreamCurrentStep(0)
    setStreamContent("")
  }, [])

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
      // Clear if older than 10 minutes (600000ms)
      if (Date.now() - timestamp > 600000) {
        localStorage.removeItem(key)
        return false
      }
      return true
    } catch {
      localStorage.removeItem(key)
      return false
    }
  }, [getStorageKey])

  const canSelectDocument = useCallback((documentType: DocumentType) => {
    return !(isPromptOnlyMode && documentType !== "prompt")
  }, [isPromptOnlyMode])

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
    // Use isPromptOnlyMode (client state) instead of isNewProject (server prop tied to ?new=1 URL
    // param). The ?new=1 param is never stripped from the URL, so isNewProject stays true after
    // the first render even once the user has a project description. isPromptOnlyMode correctly
    // reflects whether the user should be locked to the prompt tab.
    if (isPromptOnlyMode) {
      setActiveDocument("prompt")
      return
    }

    // Only restore from the URL tab param — ignore localStorage so that
    // removing ?tab= from the URL always resets to "prompt".
    const tab = searchParams.get("tab")
    const persistedDocument = isDocumentType(tab) ? tab : null

    if (!persistedDocument || !canSelectDocument(persistedDocument)) {
      setActiveDocument("prompt")
      return
    }

    setActiveDocument(persistedDocument)
  }, [isPromptOnlyMode, searchParams, canSelectDocument])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isPromptOnlyMode) return

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
    if (urlTab !== activeDocument && !isDocumentType(urlTab)) {
      nextParams.set("tab", activeDocument)
      window.history.replaceState(null, "", `${pathname}?${nextParams.toString()}`)
    }
  }, [activeDocument, activeDocumentStorageKey, isPromptOnlyMode, pathname, router, searchParams])

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
    if (isPromptOnlyMode) return

    setGeneratingDocuments(hydrateGeneratingStateFromStorage())
  }, [project.id, isPromptOnlyMode, hydrateGeneratingStateFromStorage])

  // Poll for new content when documents are generating, and refresh only when versions arrive.
  useEffect(() => {
    if (isPromptOnlyMode) return

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
          router.refresh()
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
    isPromptOnlyMode,
  ])

  // IntersectionObserver: sync scroll position → active nav item
  useEffect(() => {
    if (activeDocument === "prompt") return // No observer in prompt mode

    const container = scrollContainerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingProgrammatically.current) return

        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute("data-section")
            if (sectionId) {
              // It's a document-level section
              setActiveNavKey(sectionId)
            }
            const subId = entry.target.id
            if (subId && subId !== sectionId) {
              setActiveSectionId(subId)
              const parentKey = getNavKeyForSection(subId)
              if (parentKey) {
                setActiveNavKey(parentKey)
                window.history.replaceState(null, "", `#${subId}`)
              }
            } else if (sectionId) {
              window.history.replaceState(null, "", `#${sectionId}`)
            }
          }
        }
      },
      {
        root: container,
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      }
    )

    // Observe document-level sections
    const sections = container.querySelectorAll("[data-section]")
    sections.forEach((el) => observer.observe(el))

    // Observe sub-sections by ID
    for (const item of SCROLLABLE_NAV_ITEMS) {
      for (const section of item.sections) {
        const el = container.querySelector(`#${CSS.escape(section.id)}`)
        if (el) observer.observe(el)
      }
    }

    return () => observer.disconnect()
  }, [activeDocument])


  const getDocumentStatus = (type: DocumentType): "done" | "in_progress" | "pending" => {
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
    if (isPromptOnlyMode && type !== "prompt") {
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

    // If switching away from prompt, default to "overview" as the active nav key
    if (type !== "prompt") {
      setActiveNavKey(type === "competitive" ? "overview" : type)
    }
  }

  const handleScrollNavigate = useCallback((targetId: string) => {
    const container = scrollContainerRef.current
    if (!container) return

    const target = container.querySelector(`#${CSS.escape(targetId)}`)
      || container.querySelector(`[data-section="${targetId}"]`)
    if (!target) return

    isScrollingProgrammatically.current = true
    target.scrollIntoView({ behavior: "smooth", block: "start" })

    // Update nav state immediately
    const parentKey = getNavKeyForSection(targetId)
    if (parentKey) {
      setActiveNavKey(parentKey)
      setActiveSectionId(targetId)
    } else {
      // It's a top-level key
      setActiveNavKey(targetId)
      setActiveSectionId(null)
    }

    // Update URL hash for deep-linking
    window.history.replaceState(null, "", `#${targetId}`)

    // Re-enable observer after scroll animation completes
    setTimeout(() => {
      isScrollingProgrammatically.current = false
    }, 800)
  }, [])

  // Reset to latest version (index 0) when switching documents
  useEffect(() => {
    setSelectedVersionIndex(prev => ({
      ...prev,
      [activeDocument]: 0,
    }))
  }, [activeDocument])

  // Check prerequisites for document generation
  const checkPrerequisites = (type: DocumentType): { canGenerate: boolean; reason?: string } => {
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
          return { canGenerate: false, reason: "Generate Competitive Research first" }
        }
        return { canGenerate: true }
      case "mvp":
        if (prds.length === 0) {
          return { canGenerate: false, reason: "Generate PRD first" }
        }
        return { canGenerate: true }
      case "mockups":
        if (mvpPlans.length === 0) {
          return { canGenerate: false, reason: "Generate MVP Plan first" }
        }
        return { canGenerate: true }
      case "techspec":
        if (prds.length === 0) {
          return { canGenerate: false, reason: "Generate PRD first" }
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
  }

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

      // Get competitive analysis for PRD generation
      const competitiveAnalysis = analyses.find(a => a.type === "competitive-analysis")

      // Get latest PRD for MVP plan and tech spec generation
      const latestPrd = prds[0]

      // Get latest MVP plan for mockup generation
      const latestMvp = mvpPlans[0]

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 min client-side limit

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
            ...(generatingType !== "deploy" && generatingType !== "launch" && { stream: true }),
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
          onStage: (stage) => {
            setStreamStages(prev => {
              const existingIdx = prev.findIndex(s => s.step === stage.step)
              if (existingIdx >= 0) {
                const next = [...prev]
                next[existingIdx] = stage
                return next
              }
              return [...prev, stage]
            })
            setStreamCurrentStep(stage.step)
          },
          onToken: (content) => setStreamContent(prev => prev + content),
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
        alert("Generation timed out after 5 minutes. Please try again.")
      } else if (error instanceof Error) {
        alert(error.message)
      }
    } finally {
      // Clear generation state once request finishes
      setGeneratingDocuments(prev => ({ ...prev, [generatingType]: false }))
      saveGeneratingState(generatingType, false)
      // clearStreamState() is called after router.refresh() in the success path below
    }

    if (!didGenerate) return

    if (wasStreaming) {
      // DB save already committed before server sent 'done'; no delay needed
      router.refresh()
      clearStreamState()
    } else {
      // Wait a moment for database transaction to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      router.refresh()
    }
  }

  // Generate a specific document type (decoupled from activeDocument state).
  // Used by GenerateAllContext for sequential pipeline generation.
  const generateDocument: GenerateDocumentFn = useCallback(
    async (docType, model, options) => {
      setGeneratingDocuments(prev => ({ ...prev, [docType]: true }))
      saveGeneratingState(docType, true)

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
        }

        // Use external signal (from Generate All) if provided, otherwise create our own
        const externalSignal = options?.signal
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000)

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
              ...(docType !== "launch" && { stream: true }),
              ...(docType === "prd" && competitiveContent && {
                competitiveAnalysis: competitiveContent,
              }),
              ...(docType === "mvp" && prdContent && {
                prd: prdContent,
              }),
              ...(docType === "mockups" && mvpContent && {
                mvpPlan: mvpContent,
                projectName: project.name,
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
        router.refresh()
        return true
      } catch (error) {
        // Re-throw abort errors so the caller can distinguish cancellation from failure
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error
        }
        console.error(`Error generating ${docType}:`, error)
        if (error instanceof Error) throw error
        throw new Error("Unknown generation error")
      } finally {
        setGeneratingDocuments(prev => ({ ...prev, [docType]: false }))
        saveGeneratingState(docType, false)
      }
    },
    [project, projectName, router, saveGeneratingState, analyses, prds, mvpPlans],
  )

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

      router.refresh()
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
  }> = {
    competitive: {
      content: getDocumentContent("competitive"),
      metadata: getDocumentMetadata("competitive"),
      isGenerating: generatingDocuments["competitive"],
    },
    prd: {
      content: getDocumentContent("prd"),
      metadata: null,
      isGenerating: generatingDocuments["prd"],
    },
    mvp: {
      content: getDocumentContent("mvp"),
      metadata: null,
      isGenerating: generatingDocuments["mvp"],
    },
    mockups: {
      content: getDocumentContent("mockups"),
      metadata: null,
      isGenerating: generatingDocuments["mockups"],
    },
    launch: {
      content: getDocumentContent("launch"),
      metadata: null,
      isGenerating: generatingDocuments["launch"],
    },
  }

  // Build status map for AnchorNav (keyed by sourceType)
  const navDocumentStatuses: Record<string, "done" | "in_progress" | "pending"> = {}
  for (const item of SCROLLABLE_NAV_ITEMS) {
    if (!navDocumentStatuses[item.sourceType]) {
      navDocumentStatuses[item.sourceType] = getDocumentStatus(item.sourceType as DocumentType)
    }
  }

  return (
    <>
      <GenerateAllHydrator
        projectId={project.id}
        onStepComplete={router.refresh}
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

        {activeDocument === "prompt" ? (
          /* Prompt/Chat view — full width, existing ContentEditor */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Prompt exit bar — only visible when project has content */}
            {project.description && (
              <div className="flex items-center gap-2 border-b border-border/40 px-6 py-2 bg-secondary/30">
                <button
                  type="button"
                  onClick={() => handleDocumentSelect("competitive")}
                  className="cursor-pointer text-xs font-medium text-text-secondary hover:text-foreground transition-colors"
                >
                  ← View Documents
                </button>
              </div>
            )}
            <ContentEditor
              documentType="prompt"
              projectId={project.id}
              projectName={projectName}
              projectDescription={project.description || ""}
              content={getDocumentContent("prompt")}
              documentMetadata={null}
              onGenerateContent={handleGenerateContent}
              onUpdateDescription={handleUpdateDescription}
              onProjectNameGenerated={handleProjectNameGenerated}
              isGenerating={generatingDocuments["prompt"]}
              streamStages={streamStages}
              streamCurrentStep={streamCurrentStep}
              streamContent={streamContent}
              credits={credits}
              hasStructuredIntake={hasStructuredIntake}
              prerequisiteValidation={checkPrerequisites("prompt")}
              currentVersion={0}
              totalVersions={0}
            />
          </div>
        ) : (
          /* Scrollable document view — 2-column layout */
          <div className="flex flex-1 overflow-hidden">
            <AnchorNav
              documentStatuses={navDocumentStatuses}
              activeKey={activeNavKey}
              activeSectionId={activeSectionId}
              onNavigate={handleScrollNavigate}
              promptStatus={getDocumentStatus("prompt")}
              onSwitchToPrompt={() => handleDocumentSelect("prompt")}
            />
            <ScrollableContent
              ref={scrollContainerRef}
              projectId={project.id}
              projectName={projectName}
              documents={scrollableDocuments}
            />
          </div>
        )}
      </div>
    </>
  )
}
