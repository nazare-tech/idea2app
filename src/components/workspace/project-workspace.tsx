"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DocumentNav, DocumentType } from "@/components/layout/document-nav"
import { ContentEditor } from "@/components/layout/content-editor"

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
}

export function ProjectWorkspace({
  project,
  analyses,
  prds,
  mvpPlans,
  techSpecs,
  deployments,
  credits,
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

  // Helper functions for localStorage persistence
  const getStorageKey = (docType: DocumentType) => `generating_${project.id}_${docType}`

  const getInitialCount = (docType: DocumentType): number => {
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
  }

  const saveGeneratingState = (docType: DocumentType, isGenerating: boolean) => {
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
  }

  const loadGeneratingState = (docType: DocumentType): boolean => {
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
  }

  const checkIfContentIncreased = (docType: DocumentType): boolean => {
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
  }

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
  }, [project.id])

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
  }, [analyses, prds, mvpPlans, techSpecs, deployments, generatingDocuments])

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

  return (
    <div className="flex h-full">
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
      <div className="flex-1">
        <ContentEditor
          documentType={activeDocument}
          projectDescription={project.description || ""}
          content={getDocumentContent(activeDocument)}
          onGenerateContent={handleGenerateContent}
          onUpdateDescription={handleUpdateDescription}
          isGenerating={generatingDocuments[activeDocument]}
          credits={credits}
          prerequisiteValidation={checkPrerequisites(activeDocument)}
          currentVersion={selectedVersionIndex[activeDocument] || 0}
          totalVersions={getTotalVersions(activeDocument)}
          onVersionChange={(index) => handleVersionChange(activeDocument, index)}
        />
      </div>
    </div>
  )
}
