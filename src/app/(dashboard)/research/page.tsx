import { AppPageShell } from "@/components/layout/app-page-shell"
import { ResearchInbox } from "@/components/research/research-inbox"
import { getCurrentUser } from "@/lib/supabase/current-user"

export default async function ResearchPage() {
  const { user } = await getCurrentUser()
  if (!user) return null
  return <AppPageShell contentClassName="max-w-[1680px] gap-6"><ResearchInbox userId={user.id}/></AppPageShell>
}
