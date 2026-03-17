import { createClient as createServerClient } from "@/lib/supabase/server"
import { getProjectUrl } from "@/lib/project-routing"
import { redirect } from "next/navigation"

const UNTITLED_PROJECT_NAME = "Untitled"

export default async function NewProjectPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: UNTITLED_PROJECT_NAME,
      description: "",
      category: "other",
      status: "draft",
    })
    .select("id, name")
    .single()

  if (error || !data?.id) {
    redirect("/projects?error=failed_to_create_project")
  }

  redirect(`${getProjectUrl(data)}?new=1`)
}
