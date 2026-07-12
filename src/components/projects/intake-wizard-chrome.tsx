// Shared chrome for the intake wizard's two steps.

export const WIZARD_TOTAL_STEPS = 2

export const WIZARD_PRIMARY_BUTTON_CLASS =
  "h-11 rounded-md bg-text-primary px-[18px] font-[family:var(--font-display)] text-[13px] font-medium text-white hover:bg-text-primary/90 sm:h-10"

export const WIZARD_OUTLINE_BUTTON_CLASS =
  "h-11 rounded-md border-text-primary bg-transparent px-[18px] font-[family:var(--font-display)] text-[13px] font-medium text-text-primary hover:bg-background sm:h-10"

export function WizardStepKicker({ step }: { step: number }) {
  return (
    <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
      Step {step} of {WIZARD_TOTAL_STEPS}
    </p>
  )
}

export function WizardError({ error }: { error: string | null }) {
  if (!error) return null

  return (
    <p className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {error}
    </p>
  )
}
