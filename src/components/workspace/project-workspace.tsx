"use client"

import { useState } from "react"
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
  techSpecs: TechSpec[]
  deployments: Deployment[]
  credits: number
}

export function ProjectWorkspace({
  project,
  analyses,
  prds,
  techSpecs,
  deployments,
  credits,
}: ProjectWorkspaceProps) {
  const router = useRouter()
  const [activeDocument, setActiveDocument] = useState<DocumentType>("prompt")
  const [isGenerating, setIsGenerating] = useState(false)

  const getDocumentStatus = (type: DocumentType): "done" | "in_progress" | "pending" => {
    switch (type) {
      case "prompt":
        return project.description ? "done" : "pending"
      case "competitive":
        return analyses.some(a => a.type === "competitive-analysis") ? "done" : "pending"
      case "gap":
        return analyses.some(a => a.type === "gap-analysis") ? "done" : "pending"
      case "prd":
        return prds.length > 0 ? "done" : "pending"
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

  const getDocumentContent = (type: DocumentType): string | null => {
    switch (type) {
      case "prompt":
        return project.description
      case "competitive":
        const compAnalysis = analyses.find(a => a.type === "competitive-analysis")
        return compAnalysis?.content || null
      case "gap":
        const gapAnalysis = analyses.find(a => a.type === "gap-analysis")
        return gapAnalysis?.content || null
      case "prd":
        return prds[0]?.content || null
      case "techspec":
      case "architecture":
        return techSpecs[0]?.content || null
      case "deploy":
        const deployment = deployments[0]
        if (!deployment) return null
        return deployment.deployment_url
          ? `**Deployment URL:** ${deployment.deployment_url}\n\n**Status:** ${deployment.status || "Unknown"}`
          : deployment.error_message || deployment.build_logs || null
      default:
        return null
    }
  }

  const documentStatuses = (["prompt", "competitive", "gap", "prd", "techspec", "architecture", "deploy"] as DocumentType[]).map(
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
        case "gap":
          endpoint = "/api/analysis/gap-analysis"
          break
        case "prd":
          endpoint = "/api/analysis/prd"
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

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          ...(activeDocument === "deploy" && { appType: "dynamic" }),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate content")
      }

      router.refresh()
    } catch (error) {
      console.error("Error generating content:", error)
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
        />
      </div>
    </div>
  )
}
