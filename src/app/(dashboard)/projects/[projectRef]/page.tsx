import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { ProjectWorkspace } from "@/components/workspace/project-workspace"
import { buildProjectRef, parseProjectRef } from "@/lib/project-routing"

interface ProjectPageProps {
  params: Promise<{ projectRef: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getProjectForCurrentUser(projectRef: string) {
  const parsedProjectRef = parseProjectRef(projectRef)
  if (!parsedProjectRef) {
    return null
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", parsedProjectRef.id)
    .eq("user_id", user.id)
    .single()

  if (error || !project) {
    return null
  }

  return { project, parsedProjectRef }
}

export async function generateMetadata({ params }: { params: Promise<{ projectRef: string }> }): Promise<Metadata> {
  const { projectRef } = await params
  const result = await getProjectForCurrentUser(projectRef)

  if (!result) {
    return {
      title: "Project | Idea2App",
    }
  }

  return {
    title: `${result.project.name} | Idea2App`,
  }
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { projectRef } = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  const parsedProjectRef = parseProjectRef(projectRef)
  if (!parsedProjectRef) {
    notFound()
  }

  const newProjectFlag = resolvedSearchParams.new
  const isNewProject =
    newProjectFlag === "1" || newProjectFlag === "true"

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const projectId = parsedProjectRef.id

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single()

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user!.id)
    .single()

  if (error || !project) {
    notFound()
  }

  const canonicalProjectRef = buildProjectRef(project.id, project.name)
  if (projectRef !== canonicalProjectRef) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, item))
      } else if (typeof value === "string") {
        query.set(key, value)
      }
    }

    const queryString = query.toString()
    redirect(`/projects/${canonicalProjectRef}${queryString ? `?${queryString}` : ""}`)
  }

  const [
    { data: analyses },
    { data: prds },
    { data: mvpPlans },
    { data: mockups },
    { data: techSpecs },
    { data: deployments },
    { data: credits },
  ] = await Promise.all([
    supabase.from("analyses").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("prds").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("mvp_plans").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from("mockups" as any).select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("tech_specs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("deployments").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("credits").select("balance").eq("user_id", user!.id).single(),
  ])

  return (
    <ProjectWorkspace
      project={project}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analyses={(analyses as any) || []}
      prds={prds || []}
      mvpPlans={mvpPlans || []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockups={(mockups as any) || []}
      techSpecs={techSpecs || []}
      deployments={deployments || []}
      credits={credits?.balance || 0}
      user={{
        email: user?.email,
        full_name: profileData?.full_name ?? undefined,
        avatar_url: profileData?.avatar_url ?? undefined,
      }}
      isNewProject={isNewProject}
    />
  )
}
