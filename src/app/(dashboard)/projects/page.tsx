import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { DashboardProjectCard } from "@/components/projects/dashboard-project-card"
import { AppPageHeader, AppPageShell } from "@/components/layout/app-page-shell"
import { getProjectUrl } from "@/lib/project-routing"

type ActiveProject = {
  id: string
  name: string
  description: string | null
  href: string
  updatedAt: string | null
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
    href: getProjectUrl(project),
    updatedAt: project.updated_at,
  }))

  return (
    <AppPageShell>
      <section className="text-text-primary">
        <AppPageHeader
          eyebrow="Workspace"
          title="Projects"
          description="Manage the ideas, plans, and generated artifacts you are actively shaping."
          actions={
            <Link href="/projects/new" className="shrink-0" prefetch={false}>
              <Button className="bg-primary px-5 text-primary-foreground">New Project</Button>
            </Link>
          }
        />

        {activeProjects.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border-strong bg-card p-8 text-center sm:p-10">
            <p className="text-base font-semibold text-text-primary">No projects yet.</p>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-text-secondary">
              Create your first idea to get started.
            </p>
            <Link href="/projects/new" className="mt-4 inline-block">
              <Button className="bg-primary px-5 text-primary-foreground">New Project</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
            {activeProjects.map((project) => (
              <DashboardProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                href={project.href}
                updatedAt={project.updatedAt}
                showDelete
              />
            ))}
          </div>
        )}
      </section>
    </AppPageShell>
  )
}
