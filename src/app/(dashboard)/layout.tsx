import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getCurrentUser } from "@/lib/supabase/current-user"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { user } = await getCurrentUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single()

  return (
    <DashboardShell
      user={{
        email: user.email,
        full_name: profileData?.full_name ?? undefined,
        avatar_url: profileData?.avatar_url ?? undefined,
      }}
    >
      {children}
    </DashboardShell>
  )
}
