import { AppPageShell } from "@/components/layout/app-page-shell"
import { getCurrentUser } from "@/lib/supabase/current-user"

export function ResearchInboxMovedNotice() {
  return (
    <section className="mx-auto w-full max-w-3xl border-t border-border pt-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
        Local workspace
      </p>
      <h1 className="mt-3 font-[family:var(--font-display)] text-[36px] font-medium italic leading-tight text-foreground">
        Research Inbox moved
      </h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-7 text-text-secondary">
        Research Inbox now runs as a separate local app so its research data,
        browser controls, and Codex jobs stay on your machine.
      </p>
      <div className="mt-6 border border-border bg-card p-5">
        <p className="font-mono text-[12px] text-foreground">npm run research-inbox:dev</p>
        <p className="mt-2 text-[14px] text-text-secondary">
          Then open http://127.0.0.1:4310/ in your browser.
        </p>
      </div>
    </section>
  )
}

export default async function ResearchPage() {
  const { user } = await getCurrentUser()
  if (!user) return null
  return <AppPageShell contentClassName="gap-6"><ResearchInboxMovedNotice /></AppPageShell>
}
