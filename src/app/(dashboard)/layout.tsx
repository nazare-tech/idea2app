import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

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

  // Get user credits
  const { data: credits } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user.id)
    .single()

  const userInfo = {
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name,
    avatar_url: profile?.avatar_url ?? undefined,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar credits={credits?.balance || 0} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={userInfo} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
