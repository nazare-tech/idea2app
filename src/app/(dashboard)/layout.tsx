import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProjectSidebar } from "@/components/layout/project-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Get all projects for the sidebar
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const userInfo = {
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar
        projects={projects || []}
        user={userInfo}
      />
      {/* Vertical Divider */}
      <div className="w-px bg-border" />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
