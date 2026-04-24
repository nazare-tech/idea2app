import { redirect } from "next/navigation"

import { IdeaIntakeWizard } from "@/components/projects/idea-intake-wizard"
import { createClient } from "@/lib/supabase/server"

interface NewProjectPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const resolvedSearchParams = await searchParams
  const intakeParam = resolvedSearchParams.intake
  const pendingToken = Array.isArray(intakeParam) ? intakeParam[0] : intakeParam
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const nextPath = `/projects/new${pendingToken ? `?intake=${encodeURIComponent(pendingToken)}` : ""}`
    redirect(`/?modal=auth&mode=signin&next=${encodeURIComponent(nextPath)}`)
  }

  return <IdeaIntakeWizard pendingToken={pendingToken ?? null} />
}
