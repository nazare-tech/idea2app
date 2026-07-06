import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { ProjectWorkspace } from "@/components/workspace/project-workspace"
import { APP_BRAND_NAME } from "@/lib/app-brand"
import { buildProjectRef, parseProjectRef } from "@/lib/project-routing"
import {
  getProjectAllowanceStatus,
  type ProjectAllowanceClient,
} from "@/lib/project-allowance"
import {
  DEFAULT_WORKSPACE_DOCUMENT,
  isWorkspaceDocumentType,
  shouldRedirectBlockedWorkspaceTab,
} from "@/lib/workspace-tab-policy"

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
      title: `Project | ${APP_BRAND_NAME}`,
    }
  }

  return {
    title: `${result.project.name} | ${APP_BRAND_NAME}`,
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const projectId = parsedProjectRef.id

  const [{ data: profileData }, allowanceStatus] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user!.id)
      .single(),
    getProjectAllowanceStatus(
      supabase as unknown as ProjectAllowanceClient,
      user!.id
    ),
  ])

  // The "Ask this project" composer is a paid-plan feature; free users see an
  // upgrade CTA instead. The composer API enforces the same rule server-side.
  const composerEnabled = allowanceStatus.planName.toLowerCase() !== "free"

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
  const requestedTab = Array.isArray(resolvedSearchParams.tab)
    ? resolvedSearchParams.tab[0]
    : resolvedSearchParams.tab
  const shouldRedirectPromptTab = shouldRedirectBlockedWorkspaceTab(requestedTab)

  if (projectRef !== canonicalProjectRef || shouldRedirectPromptTab) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (key === "tab" && shouldRedirectPromptTab) {
        continue
      }
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, item))
      } else if (typeof value === "string") {
        query.set(key, value)
      }
    }

    const queryString = query.toString()
    const fragment = shouldRedirectPromptTab ? "#executive-summary" : ""
    redirect(`/projects/${canonicalProjectRef}${queryString ? `?${queryString}` : ""}${fragment}`)
  }

  const initialDocument = isWorkspaceDocumentType(requestedTab)
    ? requestedTab
    : DEFAULT_WORKSPACE_DOCUMENT

  return (
    <ProjectWorkspace
      project={project}
      initialDocument={initialDocument}
      initialDocuments={{}}
      user={{
        email: user?.email,
        full_name: profileData?.full_name ?? undefined,
        avatar_url: profileData?.avatar_url ?? undefined,
      }}
      composerEnabled={composerEnabled}
    />
  )
}
