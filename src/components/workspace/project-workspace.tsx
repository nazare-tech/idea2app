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
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<Record<DocumentType, number>>({
    prompt: 0,
    competitive: 0,
    prd: 0,
    mvp: 0,
    techspec: 0,
    architecture: 0,
    deploy: 0,
  })

  const getDocumentStatus = (type: DocumentType): "done" | "in_progress" | "pending" => {
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
      case "architecture":
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
      case "architecture":
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
      case "architecture":
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

  const documentStatuses = (["prompt", "competitive", "prd", "mvp", "techspec", "architecture", "deploy"] as DocumentType[]).map(
    type => ({ type, status: getDocumentStatus(type) })
  )

  const handleGenerateContent = async () => {
    setIsGenerating(true)
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
        case "architecture":
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
            ...((activeDocument === "techspec" || activeDocument === "architecture") && latestPrd?.content && {
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
      if (error instanceof Error && error.name === "AbortError") {
        alert("Generation timed out after 5 minutes. Please try again.")
      } else if (error instanceof Error) {
        alert(error.message)
      }
    } finally {
      setIsGenerating(false)
    }
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
          isGenerating={isGenerating}
          credits={credits}
          currentVersion={selectedVersionIndex[activeDocument] || 0}
          totalVersions={getTotalVersions(activeDocument)}
          onVersionChange={(index) => handleVersionChange(activeDocument, index)}
        />
      </div>
    </div>
  )
}
