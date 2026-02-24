"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DocumentNav, DocumentType } from "@/components/layout/document-nav"
import { ContentEditor } from "@/components/layout/content-editor"
import { Header } from "@/components/layout/header"


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
  techSpecs: TechSpec[]
  deployments: Deployment[]
  credits: number
  user: unknown
}

export function ProjectWorkspace({
  project,
  analyses,
  prds,
  mvpPlans,
  techSpecs,
  deployments,
  credits,
  user,
}: ProjectWorkspaceProps) {
  const router = useRouter()
  const [activeDocument, setActiveDocument] = useState<DocumentType>("prompt")
  const [generatingDocuments, setGeneratingDocuments] = useState<Record<DocumentType, boolean>>({
    prompt: false,
    competitive: false,
    prd: false,
    mvp: false,
    techspec: false,
    deploy: false,
  })
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<Record<DocumentType, number>>({
    prompt: 0,
    competitive: 0,
    prd: 0,
    mvp: 0,
    techspec: 0,
    deploy: 0,
  })
  // Local content overrides for immediate UI updates after inline edits
  // Key format: `${documentType}-${recordId}` -> updated content
  const [localContentOverrides, setLocalContentOverrides] = useState<Record<string, string>>({})

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
      case "techspec":
        return techSpecs.length
      case "deploy":
        return deployments.length
      default:
        return 0
    }
  }, [analyses, prds, mvpPlans, techSpecs, deployments])

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
  }, [project.id, analyses, prds, mvpPlans, techSpecs, deployments])

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
  }, [project.id, getStorageKey])

  const checkIfContentIncreased = useCallback((docType: DocumentType): boolean => {
    const key = getStorageKey(docType)
    const stored = localStorage.getItem(key)
    if (!stored) return false

    try {
      const { initialCount } = JSON.parse(stored)
      const currentCount = getInitialCount(docType)
      return currentCount > initialCount
    } catch {
      return false
    }
  }, [project.id, analyses, prds, mvpPlans, techSpecs, deployments])

  // Restore generating states from localStorage on mount
  useEffect(() => {
    const restored: Record<DocumentType, boolean> = {
      prompt: false,
      competitive: loadGeneratingState("competitive"),
      prd: loadGeneratingState("prd"),
      mvp: loadGeneratingState("mvp"),
      techspec: loadGeneratingState("techspec"),
      deploy: loadGeneratingState("deploy"),
    }
    setGeneratingDocuments(restored)
    setGeneratingDocuments(restored)
  }, [project.id, loadGeneratingState])

  // Poll for new content when documents are generating
  useEffect(() => {
    const isAnyDocGenerating = Object.values(generatingDocuments).some(Boolean)
    if (!isAnyDocGenerating) return

    const pollInterval = setInterval(() => {
      router.refresh()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [generatingDocuments, router])

  // Clear generating state when new content is detected
  useEffect(() => {
    const checkAndClearStates = () => {
      if (generatingDocuments.competitive && checkIfContentIncreased("competitive")) {
        setGeneratingDocuments(prev => ({ ...prev, competitive: false }))
        saveGeneratingState("competitive", false)
      }
      if (generatingDocuments.prd && checkIfContentIncreased("prd")) {
        setGeneratingDocuments(prev => ({ ...prev, prd: false }))
        saveGeneratingState("prd", false)
      }
      if (generatingDocuments.mvp && checkIfContentIncreased("mvp")) {
        setGeneratingDocuments(prev => ({ ...prev, mvp: false }))
        saveGeneratingState("mvp", false)
      }
      if (generatingDocuments.techspec && checkIfContentIncreased("techspec")) {
        setGeneratingDocuments(prev => ({ ...prev, techspec: false }))
        saveGeneratingState("techspec", false)
      }
      if (generatingDocuments.deploy && checkIfContentIncreased("deploy")) {
        setGeneratingDocuments(prev => ({ ...prev, deploy: false }))
        saveGeneratingState("deploy", false)
      }
    }
    checkAndClearStates()
    checkAndClearStates()
  }, [analyses, prds, mvpPlans, techSpecs, deployments, generatingDocuments, checkIfContentIncreased, saveGeneratingState])

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
      case "techspec":
        return techSpecs.length > 0 ? "done" : "pending"
      case "deploy":
        return deployments.length > 0 ? "done" : "pending"
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
      case "techspec":
        return techSpecs
      case "deploy":
        return deployments
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
        case "techspec":
          return techSpecs[versionIndex]?.id || null
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

  const getTotalVersions = (type: DocumentType): number => {
    return getVersionsForDocument(type).length
  }

  const handleVersionChange = (type: DocumentType, index: number) => {
    setSelectedVersionIndex(prev => ({
      ...prev,
      [type]: index,
    }))
  }

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
      default:
        return { canGenerate: true }
    }
  }

  const documentStatuses = (["prompt", "competitive", "prd", "mvp", "techspec", "deploy"] as DocumentType[]).map(
    type => ({ type, status: getDocumentStatus(type) })
  )

  const handleGenerateContent = async () => {
    // Set generating state for the active document
    setGeneratingDocuments(prev => ({ ...prev, [activeDocument]: true }))
    saveGeneratingState(activeDocument, true)

    try {
      let endpoint = ""

      switch (activeDocument) {
        case "competitive":
          endpoint = "/api/analysis/competitive-analysis"
          break
        case "prd":
          endpoint = "/api/analysis/prd"
          break
        case "mvp":
          endpoint = "/api/analysis/mvp-plan"
          break
        case "techspec":
          endpoint = "/api/analysis/tech-spec"
          break
        case "deploy":
          endpoint = "/api/generate-app"
          break
        default:
          return
      }

      // Get competitive analysis for PRD generation
      const competitiveAnalysis = analyses.find(a => a.type === "competitive-analysis")

      // Get latest PRD for MVP plan and tech spec generation
      const latestPrd = prds[0]

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
            name: project.name,
            ...(activeDocument === "deploy" && { appType: "dynamic" }),
            ...(activeDocument === "prd" && competitiveAnalysis?.content && {
              competitiveAnalysis: competitiveAnalysis.content
            }),
            ...(activeDocument === "mvp" && latestPrd?.content && {
              prd: latestPrd.content
            }),
            ...(activeDocument === "techspec" && latestPrd?.content && {
              prd: latestPrd.content
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
        } catch { /* ignore parse errors */ }
        throw new Error(errorMsg)
      }

      // Wait a moment for database transaction to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Force a hard refresh to ensure latest data is loaded
      window.location.reload()
    } catch (error) {
      console.error("Error generating content:", error)

      // Clear generating state on error
      setGeneratingDocuments(prev => ({ ...prev, [activeDocument]: false }))
      saveGeneratingState(activeDocument, false)

      if (error instanceof Error && error.name === "AbortError") {
        alert("Generation timed out after 5 minutes. Please try again.")
      } else if (error instanceof Error) {
        alert(error.message)
      }
    }
    // Note: We don't clear the generating state in finally because we want it to persist
    // until the page reloads or new content is detected
  }

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
    } catch (error) {
      console.error("Error updating description:", error)
    }
  }

  const handleUpdateContent = async (newContent: string) => {
    try {
      const versionIndex = selectedVersionIndex[activeDocument] || 0

      // Determine which table and ID to update based on document type
      let endpoint = ""
      let recordId = ""

      switch (activeDocument) {
        case "competitive":
          const compAnalysis = analyses.filter(a => a.type === "competitive-analysis")[versionIndex]
          if (compAnalysis) {
            endpoint = `/api/analyses/${compAnalysis.id}`
            recordId = compAnalysis.id
          }
          break
        case "prd":
          const prd = prds[versionIndex]
          if (prd) {
            endpoint = `/api/prds/${prd.id}`
            recordId = prd.id
          }
          break
        case "mvp":
          const mvp = mvpPlans[versionIndex]
          if (mvp) {
            endpoint = `/api/mvp-plans/${mvp.id}`
            recordId = mvp.id
          }
          break
        case "techspec":
          const techSpec = techSpecs[versionIndex]
          if (techSpec) {
            endpoint = `/api/tech-specs/${techSpec.id}`
            recordId = techSpec.id
          }
          break
        default:
          return
      }

      if (!endpoint || !recordId) {
        throw new Error("Cannot update content: no record found")
      }

      // Update local state immediately for instant UI feedback
      const overrideKey = `${activeDocument}-${recordId}`
      setLocalContentOverrides(prev => ({
        ...prev,
        [overrideKey]: newContent,
      }))

      // Persist to backend
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      })

      if (!response.ok) {
        // Revert local override on error
        setLocalContentOverrides(prev => {
          const updated = { ...prev }
          delete updated[overrideKey]
          return updated
        })
        throw new Error("Failed to update content")
      }

      // Clear local override after successful save (server data will be fresh on next refresh)
      // Keep it for now to avoid flicker - it will be cleared on page navigation
    } catch (error) {
      console.error("Error updating content:", error)
      alert(error instanceof Error ? error.message : "Failed to update content")
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        user={user as any}
        rightContent={
          activeDocument === "prompt" ? (
            <span className="hidden md:inline-flex items-center gap-2 text-sm">
              Credits: {credits >= 999999 ? "∞" : credits.toLocaleString()}
            </span>
          ) : undefined
        }
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold tracking-tight">Idea2App</span>
        </div>
      </Header>

      <div className="flex flex-1 overflow-hidden">
        {/* Document Navigation */}
        <DocumentNav
          projectName={project.name}
          activeDocument={activeDocument}
          onDocumentSelect={setActiveDocument}
          documentStatuses={documentStatuses}
        />

        {/* Vertical Divider */}
        <div className="w-px bg-border" />

        {/* Content Editor */}
        <div className="flex-1 overflow-hidden">
          <ContentEditor
            documentType={activeDocument}
            projectId={project.id}
            projectName={project.name}
            projectDescription={project.description || ""}
            content={getDocumentContent(activeDocument)}
            onGenerateContent={handleGenerateContent}
            onUpdateDescription={handleUpdateDescription}
            onUpdateContent={handleUpdateContent}
            isGenerating={generatingDocuments[activeDocument]}
            credits={credits}
            prerequisiteValidation={checkPrerequisites(activeDocument)}
            currentVersion={selectedVersionIndex[activeDocument] || 0}
            totalVersions={getTotalVersions(activeDocument)}
            onVersionChange={(index) => handleVersionChange(activeDocument, index)}
          />
        </div>
      </div>
    </div>
  )
}
