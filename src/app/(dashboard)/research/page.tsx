import { AppPageShell } from "@/components/layout/app-page-shell"
import { getCurrentUser } from "@/lib/supabase/current-user"
import { ResearchInboxMovedNotice } from "./research-inbox-moved-notice"

export default async function ResearchPage() {
  const { user } = await getCurrentUser()
  if (!user) return null
  return (
    <AppPageShell contentClassName="gap-6">
      <ResearchInboxMovedNotice />
    </AppPageShell>
  )
}
