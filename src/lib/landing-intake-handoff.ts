export const LANDING_INTAKE_AUTOSTART_PARAM = "autostart"
export const LANDING_INTAKE_AUTOSTART_VALUE = "1"

export function buildLandingIntakeNextPath(token?: string | null): string {
  const params = new URLSearchParams()

  if (token) {
    params.set("intake", token)
  }

  params.set(LANDING_INTAKE_AUTOSTART_PARAM, LANDING_INTAKE_AUTOSTART_VALUE)

  return `/projects/new?${params.toString()}`
}

export function buildLandingAuthModalPath(nextPath: string): string {
  const params = new URLSearchParams({
    modal: "auth",
    mode: "signin",
    next: nextPath,
  })

  return `/?${params.toString()}`
}
