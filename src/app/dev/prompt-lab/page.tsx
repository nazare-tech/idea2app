import { notFound, redirect } from "next/navigation"

import { PromptLabClient, type PromptLabProjectOption } from "@/components/dev/prompt-lab-client"
import { AppPageHeader, AppPageShell } from "@/components/layout/app-page-shell"
import { isPromptLabEnabled } from "@/lib/prompt-lab"
import { createClient } from "@/lib/supabase/server"

export default async function PromptLabPage() {
  if (!isPromptLabEnabled()) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  const projectOptions: PromptLabProjectOption[] = (projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    updatedAt: project.updated_at,
  }))

  return (
    <AppPageShell contentClassName="max-w-[1800px]">
      <AppPageHeader
        eyebrow="Local development"
        title="Prompt Lab"
        description="Iterate artifact prompts against real project context without creating workflow artifacts, spending app credits, or touching production renderers."
      />
      <PromptLabClient projects={projectOptions} />
    </AppPageShell>
  )
}
