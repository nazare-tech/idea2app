import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ProjectWorkspace } from "@/components/workspace/project-workspace"

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Get analyses
  const { data: analyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get PRDs
  const { data: prds } = await supabase
    .from("prds")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get MVP plans
  const { data: mvpPlans } = await supabase
    .from("mvp_plans")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get tech specs
  const { data: techSpecs } = await supabase
    .from("tech_specs")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get deployments
  const { data: deployments } = await supabase
    .from("deployments")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

  // Get user credits
  const { data: credits } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user!.id)
    .single()

  return (
    <ProjectWorkspace
      project={project}
      analyses={analyses || []}
      prds={prds || []}
      mvpPlans={mvpPlans || []}
      techSpecs={techSpecs || []}
      deployments={deployments || []}
      credits={credits?.balance || 0}
    />
  )
}
