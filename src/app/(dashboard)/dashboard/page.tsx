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
    { name: "Total Projects", value: totalProjects || 0, icon: FolderKanban, gradient: "from-[#00d4ff] to-[#0ea5e9]" },
    { name: "Analyses Generated", value: totalAnalyses || 0, icon: FileText, gradient: "from-[#7c3aed] to-[#a855f7]" },
    { name: "Apps Deployed", value: totalDeployments || 0, icon: Rocket, gradient: "from-[#34d399] to-[#00d4ff]" },
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
          <h1 className="text-3xl font-black tracking-tight">Welcome back!</h1>
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
      <div className="grid gap-5 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name} className="group hover:border-[rgba(0,212,255,0.15)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.06)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {stat.name}
              </CardTitle>
              <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tracking-tight">{stat.value}</div>
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
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(0,212,255,0.04)] hover:border-[rgba(0,212,255,0.15)] transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 border border-[rgba(0,212,255,0.15)] flex items-center justify-center">
                      <Code className="h-5 w-5 text-[#00d4ff]" />
                    </div>
                    <div>
                      <h3 className="font-semibold tracking-tight">{project.name}</h3>
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
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[rgba(0,212,255,0.1)] to-[rgba(124,58,237,0.1)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-5">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
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
        {[
          { href: "/projects/new", icon: Plus, title: "New Project", desc: "Start a new business idea", gradient: "from-[#00d4ff] to-[#0ea5e9]" },
          { href: "/projects", icon: FolderKanban, title: "View Projects", desc: "Browse all your projects", gradient: "from-[#34d399] to-[#00d4ff]" },
          { href: "/billing", icon: FileText, title: "Manage Billing", desc: "View plans and credits", gradient: "from-[#fb923c] to-[#f472b6]" },
          { href: "/settings", icon: Rocket, title: "Settings", desc: "Configure your account", gradient: "from-[#7c3aed] to-[#a855f7]" },
        ].map((action) => (
          <Card key={action.href} className="group cursor-pointer hover:border-[rgba(0,212,255,0.15)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,212,255,0.06)] hover:-translate-y-0.5">
            <Link href={action.href}>
              <CardHeader>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-shadow duration-300`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base font-bold tracking-tight">{action.title}</CardTitle>
                <CardDescription>{action.desc}</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
