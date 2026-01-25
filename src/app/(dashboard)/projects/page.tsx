import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, FolderKanban, Code, MoreVertical } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business ideas and analyses
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between">
                <Link href={`/projects/${project.id}`} className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <Badge variant={getStatusColor(project.status || "draft")} className="mt-1">
                        {project.status || "draft"}
                      </Badge>
                    </div>
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${project.id}`}>Open Project</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${project.id}/settings`}>Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <Link href={`/projects/${project.id}`}>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {project.description}
                  </CardDescription>
                  <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                    <span>{project.category || "General"}</span>
                    <span>{formatRelativeTime(project.updated_at || project.created_at!)}</span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
