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
    color: "blue",
  },
  {
    id: "gap-analysis",
    name: "Gap Analysis",
    description: "Identify market gaps, opportunities, and potential challenges",
    icon: Search,
    credits: CREDIT_COSTS["gap-analysis"],
    color: "emerald",
  },
]

const appTypes = [
  {
    id: "static",
    name: "Static Website",
    description: "HTML/CSS/JS - Simple and fast hosting",
    icon: Globe,
    credits: CREDIT_COSTS["app-static"],
  },
  {
    id: "dynamic",
    name: "Dynamic Website",
    description: "Next.js with API routes and database",
    icon: Monitor,
    credits: CREDIT_COSTS["app-dynamic"],
  },
  {
    id: "spa",
    name: "Single Page App",
    description: "React SPA with state management",
    icon: Smartphone,
    credits: CREDIT_COSTS["app-spa"],
  },
  {
    id: "pwa",
    name: "Progressive Web App",
    description: "PWA with offline support and service workers",
    icon: Zap,
    credits: CREDIT_COSTS["app-pwa"],
  },
]

export function AnalysisPanel({ projectId, project, analyses, credits, type }: AnalysisPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async (analysisType: string) => {
    setLoading(analysisType)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/analysis/${analysisType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          idea: project.description,
          name: project.name,
        }),
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

  if (type === "analysis") {
    return (
      <div className="space-y-6">
        {/* Action Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {analysisTypes.map((analysis) => (
            <Card key={analysis.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg bg-${analysis.color}-500/10 flex items-center justify-center`}>
                      <analysis.icon className={`h-5 w-5 text-${analysis.color}-500`} />
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
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Previous Results */}
        {analyses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Previous Results</h3>
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert prose-sm max-w-none max-h-[400px] overflow-y-auto [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
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
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-amber-500" />
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
                  onClick={() => runAnalysis("prd")}
                  disabled={loading !== null || credits < CREDIT_COSTS.prd}
                  size="sm"
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

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(prd.content || "")}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
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
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Code className="h-5 w-5 text-purple-500" />
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
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(spec.content || "")}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
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
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-emerald-500" />
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
                className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <app.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">{app.name}</h4>
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
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Previous Deployments */}
      {analyses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Deployments</h3>
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
