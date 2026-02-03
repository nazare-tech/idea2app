import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, FolderOpen, Lightbulb } from "lucide-react"

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

  // If there are projects, redirect to the first one
  if (projects && projects.length > 0) {
    redirect(`/projects/${projects[0].id}`)
  }

  // Show empty state for new users
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <FolderOpen className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-3">
          Welcome to Projects
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Start by creating your first project. Describe your business idea and let AI help you build it into reality.
        </p>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Your First Project
        </Link>
        <div className="mt-10 pt-8 border-t border-border">
          <div className="flex items-start gap-4 text-left">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Lightbulb className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm mb-1">
                How it works
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Describe your idea, and we&apos;ll generate competitive research, gap analysis, PRD, tech specs, and even deployable code.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
