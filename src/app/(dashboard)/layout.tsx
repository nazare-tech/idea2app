import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"

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
    <DashboardShell projects={projects || []} user={userInfo}>
      {children}
    </DashboardShell>
  )
}
