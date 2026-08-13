import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardProjectCard } from "@/components/projects/dashboard-project-card"
import { NewProjectButton } from "@/components/projects/project-limit-dialog"
import { AppPageHeader, AppPageShell } from "@/components/layout/app-page-shell"
import { getProjectUrl } from "@/lib/project-routing"
import { getProjectAllowanceStatus } from "@/lib/project-allowance"
import {
  deriveDashboardMockupPreviews,
  type DashboardMockupPreview,
} from "@/lib/mockups/dashboard-thumbnail"
import { logError } from "@/lib/logger"
import { getCurrentUser } from "@/lib/supabase/current-user"

type ActiveProject = {
  id: string
  name: string
  description: string | null
  href: string
  createdAt: string | null
  updatedAt: string | null
  mockupPreviews: DashboardMockupPreview[]
  thumbnailUnavailable: boolean
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
  const projectDataResults = projectIds.length > 0
    ? await Promise.all([
        supabase
          .from("project_intakes")
          .select("project_id, original_idea")
          .eq("user_id", user!.id)
          .in("project_id", projectIds),
        supabase
          .from("mockups")
          .select("id, project_id, content, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false }),
      ])
    : null
  const projectIntakes = projectDataResults?.[0].data ?? []
  const mockupRows = projectDataResults?.[1].data ?? []
  const mockupQueryError = projectDataResults?.[1].error
  if (mockupQueryError) {
    logError("ProjectsPage", "mockup_thumbnail_query_failed", mockupQueryError, {
      userId: user!.id,
      projectCount: projectIds.length,
    })
  }
  const originalIdeaByProjectId = new Map(
    (projectIntakes ?? []).map((intake) => [intake.project_id, intake.original_idea])
  )
  const mockupPreviewsByProjectId = deriveDashboardMockupPreviews({
    authorizedProjectIds: projectIds,
    rows: mockupRows,
  })

  const activeProjects: ActiveProject[] = (projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    description: originalIdeaByProjectId.get(project.id) ?? project.description ?? null,
    href: getProjectUrl(project),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    mockupPreviews: mockupPreviewsByProjectId.get(project.id) ?? [],
    thumbnailUnavailable: Boolean(mockupQueryError),
  }))
  const welcomeName = getWelcomeName({
    profileFullName: profileData?.full_name,
    userMetadata: user?.user_metadata,
    email: user?.email,
  })

  return (
    <AppPageShell className="bg-transparent">
      <section className="text-text-primary">
        <AppPageHeader
          description={`Welcome, ${welcomeName}`}
          descriptionClassName="text-xl font-semibold leading-tight text-text-primary sm:text-2xl"
          actions={(
            <NewProjectButton
              allowance={allowanceStatus}
              className="h-9 bg-primary px-4 text-sm text-primary-foreground"
            />
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
          <div
            data-testid="dashboard-project-grid"
            className="mt-8 grid gap-8 grid-cols-[repeat(auto-fill,minmax(min(100%,430px),1fr))]"
          >
            {activeProjects.map((project) => (
              <DashboardProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description}
                href={project.href}
                createdAt={project.createdAt}
                updatedAt={project.updatedAt}
                mockupPreviews={project.mockupPreviews}
                thumbnailUnavailable={project.thumbnailUnavailable}
                showActions
                canDelete={allowanceStatus.planName.toLowerCase() !== "free"}
              />
            ))}
          </div>
        )}
      </section>
    </AppPageShell>
  )
}
