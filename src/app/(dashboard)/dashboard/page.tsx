import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, FolderKanban, FileText, Code, Rocket, ArrowRight } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get recent projects
  const { data: projects } = await supabase
    .from("projects")
    .select("*, analyses(count), messages(count)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(5)

  // Get stats
  const { count: totalProjects } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)

  const { count: totalAnalyses } = await supabase
    .from("analyses")
    .select("*, projects!inner(*)", { count: "exact", head: true })
    .eq("projects.user_id", user!.id)

  const { count: totalDeployments } = await supabase
    .from("deployments")
    .select("*, projects!inner(*)", { count: "exact", head: true })
    .eq("projects.user_id", user!.id)
    .eq("status", "deployed")

  const stats = [
    { name: "Total Projects", value: totalProjects || 0, icon: FolderKanban },
    { name: "Analyses Generated", value: totalAnalyses || 0, icon: FileText },
    { name: "Apps Deployed", value: totalDeployments || 0, icon: Rocket },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success"
      case "draft":
        return "secondary"
      case "completed":
        return "default"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s an overview of your business ideas and projects.
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your latest business ideas and analyses</CardDescription>
          </div>
          <Link href="/projects">
            <Button variant="outline" size="sm" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {project.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={getStatusColor(project.status || "draft")}>
                      {project.status || "draft"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(project.updated_at || project.created_at!)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first business idea project
              </p>
              <Link href="/projects/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Project
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <Link href="/projects/new">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                <Plus className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-base">New Project</CardTitle>
              <CardDescription>Start a new business idea</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <Link href="/projects">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                <FolderKanban className="h-5 w-5 text-emerald-500" />
              </div>
              <CardTitle className="text-base">View Projects</CardTitle>
              <CardDescription>Browse all your projects</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <Link href="/billing">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
              <CardTitle className="text-base">Manage Billing</CardTitle>
              <CardDescription>View plans and credits</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <Link href="/settings">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
                <Rocket className="h-5 w-5 text-purple-500" />
              </div>
              <CardTitle className="text-base">Settings</CardTitle>
              <CardDescription>Configure your account</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
