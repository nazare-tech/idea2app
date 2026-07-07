import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardProjectCard } from "@/components/projects/dashboard-project-card"
import { AppPageHeader, AppPageShell } from "@/components/layout/app-page-shell"
import { getProjectUrl } from "@/lib/project-routing"
import { getProjectAllowanceStatus } from "@/lib/project-allowance"
import { getCurrentUser } from "@/lib/supabase/current-user"

type ActiveProject = {
  id: string
  name: string
  description: string | null
  href: string
  createdAt: string | null
  updatedAt: string | null
}

function getWelcomeName({
  profileFullName,
  userMetadata,
  email,
}: {
  profileFullName?: string | null
  userMetadata?: Record<string, unknown>
  email?: string | null
}) {
  const metadataName = userMetadata?.full_name ?? userMetadata?.name
  const name = profileFullName ?? (typeof metadataName === "string" ? metadataName : null)

  return name?.trim() || email?.split("@")[0] || "there"
}

export default async function ProjectsPage() {
  const { user, supabase } = await getCurrentUser()

  const [{ data: projects }, allowanceStatus, { data: profileData }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false }),
    getProjectAllowanceStatus(supabase, user!.id),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user!.id)
      .single(),
  ])

  const projectIds = (projects ?? []).map((project) => project.id)
  const { data: projectIntakes } = projectIds.length > 0
    ? await supabase
        .from("project_intakes")
        .select("project_id, original_idea")
        .eq("user_id", user!.id)
        .in("project_id", projectIds)
    : { data: [] }
  const originalIdeaByProjectId = new Map(
    (projectIntakes ?? []).map((intake) => [intake.project_id, intake.original_idea])
  )

  const activeProjects: ActiveProject[] = (projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    description: originalIdeaByProjectId.get(project.id) ?? project.description ?? null,
    href: getProjectUrl(project),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }))
  const welcomeName = getWelcomeName({
    profileFullName: profileData?.full_name,
    userMetadata: user?.user_metadata,
    email: user?.email,
  })

  return (
    <AppPageShell>
      <section className="text-text-primary">
        <AppPageHeader
          description={`Welcome, ${welcomeName}`}
          descriptionClassName="text-xl font-semibold leading-tight text-text-primary sm:text-2xl"
          actions={(
            <Link href="/projects/new" className="shrink-0" prefetch={false}>
              <Button className="h-9 bg-primary px-4 text-sm text-primary-foreground">
                New Project
              </Button>
            </Link>
          )}
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
          <div className="mt-8 grid gap-5 grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))]">
            {activeProjects.map((project) => (
              <DashboardProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                href={project.href}
                createdAt={project.createdAt}
                updatedAt={project.updatedAt}
                showDelete
                canDelete={allowanceStatus.planName.toLowerCase() !== "free"}
              />
            ))}
          </div>
        )}
      </section>
    </AppPageShell>
  )
}
