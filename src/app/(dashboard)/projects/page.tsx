import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus, FolderOpen } from "lucide-react"
import { ProjectCard } from "@/components/projects/project-card"
import { Button } from "@/components/ui/button"

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

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and organize your AI-powered applications.
          </p>
        </div>

        {!projects || projects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No projects yet
              </h2>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                Start by creating your first project. Describe your business idea and
                let AI help you build it into reality.
              </p>
              <Link href="/projects/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  updated_at: project.updated_at || project.created_at || new Date().toISOString()
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
