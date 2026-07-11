import { redirect } from "next/navigation"

import { IdeaIntakeWizard } from "@/components/projects/idea-intake-wizard"
import { ProjectLimitRouteGate } from "@/components/projects/project-limit-dialog"
import {
  LANDING_INTAKE_AUTOSTART_PARAM,
  LANDING_INTAKE_AUTOSTART_VALUE,
} from "@/lib/landing-intake-handoff"
import { getProjectAllowanceStatus } from "@/lib/project-allowance"
import { getCurrentUser } from "@/lib/supabase/current-user"

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
  const { user, supabase } = await getCurrentUser()

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

  // Block the wizard when the user is out of project allowance so they cannot fill
  // it out only to be rejected at Create project. count_failed and other transient
  // reasons fall through to the wizard (the create route re-checks allowance).
  const allowanceStatus = await getProjectAllowanceStatus(supabase, user.id)
  if (!allowanceStatus.canCreate && allowanceStatus.reason === "limit_reached") {
    return (
      <ProjectLimitRouteGate
        used={allowanceStatus.used}
        planName={allowanceStatus.planName}
      />
    )
  }

  return <IdeaIntakeWizard pendingToken={pendingToken ?? null} autoStartQuestions={autoStartQuestions} />
}
