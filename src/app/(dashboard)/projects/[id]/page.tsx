import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ChatInterface } from "@/components/chat/chat-interface"
import { AnalysisPanel } from "@/components/analysis/analysis-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, BarChart3, FileText, Code, Rocket } from "lucide-react"

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Get messages
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true })

  // Get analyses
  const { data: analyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get PRDs
  const { data: prds } = await supabase
    .from("prds")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get tech specs
  const { data: techSpecs } = await supabase
    .from("tech_specs")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get deployments
  const { data: deployments } = await supabase
    .from("deployments")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get user credits
  const { data: credits } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user!.id)
    .single()

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 border border-[rgba(0,212,255,0.15)] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.1)]">
                <Code className="h-6 w-6 text-[#00d4ff]" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl font-black tracking-tight">{project.name}</CardTitle>
                  <Badge variant={project.status === "active" ? "success" : "secondary"}>
                    {project.status || "draft"}
                  </Badge>
                </div>
                <CardDescription className="mt-1">{project.description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="prd" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">PRD</span>
          </TabsTrigger>
          <TabsTrigger value="techspec" className="gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Tech Spec</span>
          </TabsTrigger>
          <TabsTrigger value="deploy" className="gap-2">
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">Deploy</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <ChatInterface
            projectId={id}
            initialMessages={messages || []}
            credits={credits?.balance || 0}
          />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <AnalysisPanel
            projectId={id}
            project={project}
            analyses={analyses || []}
            credits={credits?.balance || 0}
            type="analysis"
          />
        </TabsContent>

        <TabsContent value="prd" className="space-y-4">
          <AnalysisPanel
            projectId={id}
            project={project}
            analyses={prds || []}
            competitiveAnalyses={analyses || []}
            credits={credits?.balance || 0}
            type="prd"
          />
        </TabsContent>

        <TabsContent value="techspec" className="space-y-4">
          <AnalysisPanel
            projectId={id}
            project={project}
            analyses={techSpecs || []}
            prds={prds || []}
            credits={credits?.balance || 0}
            type="techspec"
          />
        </TabsContent>

        <TabsContent value="deploy" className="space-y-4">
          <AnalysisPanel
            projectId={id}
            project={project}
            analyses={deployments || []}
            credits={credits?.balance || 0}
            type="deploy"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
