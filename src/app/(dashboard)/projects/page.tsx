import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { DashboardProjectCard } from "@/components/projects/dashboard-project-card"
import { InspirationProjectsSection } from "@/components/projects/inspiration-projects-section"

type ActiveProject = {
  id: string
  name: string
  description: string | null
  href: string
}

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

  const activeProjects: ActiveProject[] = (projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    href: `/projects/${project.id}`,
  }))

  return (
    <div className="flex flex-col h-full bg-background px-6 py-6 md:px-12 md:py-6 lg:px-[56px] lg:py-6">
      <section className="rounded-2xl border border-border-subtle bg-text-primary p-8 text-white">
        <header className="mb-7">
          <h1 className="font-bold text-[24px] leading-tight tracking-[-0.5px] text-white">
            Projects
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Manage and organize your AI-powered applications.
          </p>
        </header>

        {activeProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/30 bg-[#1f1f1f] p-8 text-center">
            <p className="text-base text-text-muted">No projects yet.</p>
            <p className="mt-1 text-sm text-text-muted/80">
              Create your first idea to get started.
            </p>
            <Link href="/projects/new" className="mt-4 inline-block">
              <Button className="bg-[#FF3B30] px-5 text-white">New Project</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {activeProjects.map((project) => (
              <DashboardProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                href={project.href}
                showDelete
              />
            ))}
          </div>
        )}
      </section>

      <div className="h-[1px] bg-border-subtle my-6" />

      <InspirationProjectsSection />
    </div>
  )
}
