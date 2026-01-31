"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { CREDIT_COSTS } from "@/lib/utils"
import {
  BarChart3,
  Search,
  FileText,
  Code,
  Rocket,
  Globe,
  Smartphone,
  Monitor,
  Zap,
  Download,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { downloadMarkdownAsPDF } from "@/lib/pdf-utils"

interface AnalysisPanelProps {
  projectId: string
  project: {
    id: string
    name: string
    description: string
  }
  analyses: Array<{
    id: string
    content?: string
    type?: string
    status?: string | null
    deployment_url?: string | null
    created_at: string | null
    [key: string]: unknown
  }>
  competitiveAnalyses?: Array<{
    id: string
    content?: string
    type?: string
    created_at: string | null
    [key: string]: unknown
  }>
  credits: number
  type: "analysis" | "prd" | "techspec" | "deploy"
}

const analysisTypes = [
  {
    id: "competitive-analysis",
    name: "Competitive Analysis",
    description: "Analyze competitors, market positioning, and industry landscape",
    icon: BarChart3,
    credits: CREDIT_COSTS["competitive-analysis"],
    gradient: "from-[#00d4ff] to-[#0ea5e9]",
  },
  {
    id: "gap-analysis",
    name: "Gap Analysis",
    description: "Identify market gaps, opportunities, and potential challenges",
    icon: Search,
    credits: CREDIT_COSTS["gap-analysis"],
    gradient: "from-[#34d399] to-[#00d4ff]",
  },
]

const appTypes = [
  {
    id: "static",
    name: "Static Website",
    description: "HTML/CSS/JS - Simple and fast hosting",
    icon: Globe,
    credits: CREDIT_COSTS["app-static"],
    gradient: "from-[#00d4ff] to-[#0ea5e9]",
  },
  {
    id: "dynamic",
    name: "Dynamic Website",
    description: "Next.js with API routes and database",
    icon: Monitor,
    credits: CREDIT_COSTS["app-dynamic"],
    gradient: "from-[#7c3aed] to-[#a855f7]",
  },
  {
    id: "spa",
    name: "Single Page App",
    description: "React SPA with state management",
    icon: Smartphone,
    credits: CREDIT_COSTS["app-spa"],
    gradient: "from-[#f472b6] to-[#fb923c]",
  },
  {
    id: "pwa",
    name: "Progressive Web App",
    description: "PWA with offline support and service workers",
    icon: Zap,
    credits: CREDIT_COSTS["app-pwa"],
    gradient: "from-[#34d399] to-[#00d4ff]",
  },
]

export function AnalysisPanel({ projectId, project, analyses, competitiveAnalyses, credits, type }: AnalysisPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)
  const [showCompetitiveAnalysisBanner, setShowCompetitiveAnalysisBanner] = useState(false)

  // Get the latest competitive analysis
  const latestCompetitiveAnalysis = competitiveAnalyses?.find(
    (analysis) => analysis.type === "competitive-analysis"
  )

  const runAnalysis = async (analysisType: string) => {
    setLoading(analysisType)
    setError(null)
    setResult(null)

    try {
      const payload: {
        projectId: string
        idea: string
        name: string
        competitiveAnalysis?: string
      } = {
        projectId,
        idea: project.description,
        name: project.name,
      }

      // Include competitive analysis for PRD generation
      if (analysisType === "prd" && latestCompetitiveAnalysis?.content) {
        payload.competitiveAnalysis = latestCompetitiveAnalysis.content
      }

      const response = await fetch(`/api/analysis/${analysisType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed")
      }

      setResult(data.content)
      // Refresh to show updated analyses list
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(null)
    }
  }

  const generateApp = async (appType: string) => {
    setLoading(appType)
    setError(null)

    try {
      const response = await fetch("/api/generate-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          appType,
          idea: project.description,
          name: project.name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "App generation failed")
      }

      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(null)
    }
  }

  const handleDownloadPDF = async (
    analysisId: string,
    content: string,
    analysisType: string
  ) => {
    setDownloadingPdf(analysisId)
    try {
      const filename = `${project.name}-${analysisType}-${new Date().toISOString().split("T")[0]}.pdf`
      await downloadMarkdownAsPDF(content, filename, project.name, analysisType)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF")
    } finally {
      setDownloadingPdf(null)
    }
  }

  const proseClasses = `
    prose prose-invert prose-sm max-w-none
    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-foreground [&_h1]:border-b [&_h1]:border-[rgba(0,212,255,0.2)] [&_h1]:pb-2
    [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-foreground
    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-foreground
    [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-foreground
    [&_p]:text-foreground [&_p]:mb-3 [&_p]:leading-relaxed
    [&_ul]:my-3 [&_ul]:space-y-1 [&_ul]:pl-6
    [&_ol]:my-3 [&_ol]:space-y-1 [&_ol]:pl-6
    [&_li]:text-foreground [&_li]:leading-relaxed
    [&_strong]:text-foreground [&_strong]:font-semibold
    [&_em]:text-foreground [&_em]:italic
    [&_a]:text-[#00d4ff] [&_a]:underline [&_a]:hover:text-[#00b8e6] [&_a]:transition-colors
    [&_code]:text-[#00d4ff] [&_code]:bg-[rgba(0,212,255,0.08)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
    [&_pre]:bg-[rgba(255,255,255,0.05)] [&_pre]:border [&_pre]:border-[rgba(255,255,255,0.1)] [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-3 [&_pre]:overflow-x-auto
    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground
    [&_blockquote]:border-l-4 [&_blockquote]:border-[#00d4ff] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-3
    [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse
    [&_th]:border [&_th]:border-[rgba(255,255,255,0.1)] [&_th]:bg-[rgba(0,212,255,0.1)] [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
    [&_td]:border [&_td]:border-[rgba(255,255,255,0.1)] [&_td]:px-4 [&_td]:py-2
    [&_hr]:border-[rgba(255,255,255,0.1)] [&_hr]:my-4
  `.trim()

  if (type === "analysis") {
    return (
      <div className="space-y-6">
        {/* Action Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {analysisTypes.map((analysis) => (
            <Card key={analysis.id} className="group hover:border-[rgba(0,212,255,0.2)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,212,255,0.06)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${analysis.gradient} flex items-center justify-center shadow-lg`}>
                      <analysis.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{analysis.name}</CardTitle>
                      <CardDescription>{analysis.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{analysis.credits} credits</Badge>
                  <Button
                    onClick={() => runAnalysis(analysis.id)}
                    disabled={loading !== null || credits < analysis.credits}
                    size="sm"
                  >
                    {loading === analysis.id ? (
                      <>
                        <Spinner size="sm" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.2)] text-[#ff6b8a] text-sm">
            {error}
          </div>
        )}

        {/* Previous Results */}
        {analyses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-tight">Previous Results</h3>
            {analyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>{analysis.type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(analysis.created_at!).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(analysis.content || "")
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadPDF(
                            analysis.id,
                            analysis.content || "",
                            analysis.type || "analysis"
                          )
                        }
                        disabled={downloadingPdf === analysis.id}
                      >
                        {downloadingPdf === analysis.id ? (
                          <>
                            <Spinner size="sm" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Download PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`${proseClasses} max-h-[400px] overflow-y-auto`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {analysis.content || ""}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (type === "prd") {
    const hasCompetitiveAnalysis = !!latestCompetitiveAnalysis
    const isPrdButtonDisabled = loading !== null || credits < CREDIT_COSTS.prd || !hasCompetitiveAnalysis

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#fb923c] to-[#f472b6] flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Product Requirements Document</CardTitle>
                  <CardDescription>
                    Generate a comprehensive PRD for your business idea
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{CREDIT_COSTS.prd} credits</Badge>
                <Button
                  onClick={() => {
                    if (!hasCompetitiveAnalysis) {
                      setShowCompetitiveAnalysisBanner(true)
                      return
                    }
                    runAnalysis("prd")
                  }}
                  disabled={isPrdButtonDisabled}
                  size="sm"
                  className={!hasCompetitiveAnalysis ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {loading === "prd" ? (
                    <>
                      <Spinner size="sm" />
                      Generating...
                    </>
                  ) : (
                    "Generate PRD"
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {showCompetitiveAnalysisBanner && !hasCompetitiveAnalysis && (
          <div className="p-4 rounded-xl bg-[rgba(255,165,0,0.1)] border border-[rgba(255,165,0,0.2)] text-[#ffa500] text-sm flex items-center justify-between">
            <span>You need to generate a Competitive Analysis first before creating a PRD.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompetitiveAnalysisBanner(false)}
              className="text-[#ffa500] hover:text-[#ff8c00]"
            >
              Dismiss
            </Button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.2)] text-[#ff6b8a] text-sm">
            {error}
          </div>
        )}

        {analyses.length > 0 && (
          <div className="space-y-4">
            {analyses.map((prd) => (
              <Card key={prd.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Version {String((prd as Record<string, unknown>).version || 1)} | {new Date(prd.created_at!).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(prd.content || "")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadPDF(prd.id, prd.content || "", "prd")
                        }
                        disabled={downloadingPdf === prd.id}
                      >
                        {downloadingPdf === prd.id ? (
                          <>
                            <Spinner size="sm" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Download PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={proseClasses}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {prd.content || ""}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (type === "techspec") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] flex items-center justify-center shadow-lg">
                  <Code className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Technical Specification</CardTitle>
                  <CardDescription>
                    Generate detailed technical specifications for your product
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{CREDIT_COSTS["tech-spec"]} credits</Badge>
                <Button
                  onClick={() => runAnalysis("tech-spec")}
                  disabled={loading !== null || credits < CREDIT_COSTS["tech-spec"]}
                  size="sm"
                >
                  {loading === "tech-spec" ? (
                    <>
                      <Spinner size="sm" />
                      Generating...
                    </>
                  ) : (
                    "Generate Tech Spec"
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <div className="p-4 rounded-xl bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.2)] text-[#ff6b8a] text-sm">
            {error}
          </div>
        )}

        {analyses.length > 0 && (
          <div className="space-y-4">
            {analyses.map((spec) => (
              <Card key={spec.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Version {String((spec as Record<string, unknown>).version || 1)} | {new Date(spec.created_at!).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(spec.content || "")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadPDF(spec.id, spec.content || "", "tech-spec")
                        }
                        disabled={downloadingPdf === spec.id}
                      >
                        {downloadingPdf === spec.id ? (
                          <>
                            <Spinner size="sm" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Download PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={proseClasses}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {spec.content || ""}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Deploy tab
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#34d399] to-[#00d4ff] flex items-center justify-center shadow-lg">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Generate & Deploy Application</CardTitle>
              <CardDescription>
                Choose an app type to generate and deploy a working prototype
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {appTypes.map((app) => (
              <div
                key={app.id}
                className="group p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.03)] transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-shadow duration-300`}>
                    <app.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold tracking-tight">{app.name}</h4>
                    <p className="text-sm text-muted-foreground">{app.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{app.credits} credits</Badge>
                  <Button
                    onClick={() => generateApp(app.id)}
                    disabled={loading !== null || credits < app.credits}
                    size="sm"
                    variant="outline"
                  >
                    {loading === app.id ? (
                      <>
                        <Spinner size="sm" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.2)] text-[#ff6b8a] text-sm">
          {error}
        </div>
      )}

      {/* Previous Deployments */}
      {analyses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight">Deployments</h3>
          {analyses.map((deployment) => (
            <Card key={deployment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={deployment.status === "deployed" ? "success" : deployment.status === "failed" ? "destructive" : "secondary"}
                    >
                      {deployment.status || "pending"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(deployment.created_at!).toLocaleDateString()}
                    </span>
                  </div>
                  {deployment.deployment_url && (
                    <a
                      href={deployment.deployment_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        View App
                      </Button>
                    </a>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
