import { redirect } from "next/navigation"

import { IdeaIntakeWizard } from "@/components/projects/idea-intake-wizard"
import {
  LANDING_INTAKE_AUTOSTART_PARAM,
  LANDING_INTAKE_AUTOSTART_VALUE,
} from "@/lib/landing-intake-handoff"
import { createClient } from "@/lib/supabase/server"

interface NewProjectPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const resolvedSearchParams = await searchParams
  const intakeParam = resolvedSearchParams.intake
  const autostartParam = resolvedSearchParams[LANDING_INTAKE_AUTOSTART_PARAM]
  const pendingToken = Array.isArray(intakeParam) ? intakeParam[0] : intakeParam
  const autoStartQuestions = Array.isArray(autostartParam)
    ? autostartParam.includes(LANDING_INTAKE_AUTOSTART_VALUE)
    : autostartParam === LANDING_INTAKE_AUTOSTART_VALUE
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const params = new URLSearchParams()
    if (pendingToken) params.set("intake", pendingToken)
    if (autoStartQuestions) {
      params.set(LANDING_INTAKE_AUTOSTART_PARAM, LANDING_INTAKE_AUTOSTART_VALUE)
    }
    const query = params.toString()
    const nextPath = `/projects/new${query ? `?${query}` : ""}`
    redirect(`/?modal=auth&mode=signin&next=${encodeURIComponent(nextPath)}`)
  }

  return <IdeaIntakeWizard pendingToken={pendingToken ?? null} autoStartQuestions={autoStartQuestions} />
}
