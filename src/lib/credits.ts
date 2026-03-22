export const UNLIMITED_CREDITS_THRESHOLD = 999999

export function hasUnlimitedCredits(credits: number): boolean {
  return credits >= UNLIMITED_CREDITS_THRESHOLD
}

export function formatCreditsValue(
  credits: number,
  options?: {
    compact?: boolean
    unlimitedLabel?: string
  }
): string {
  const compact = options?.compact ?? false
  const unlimitedLabel = options?.unlimitedLabel ?? "Unlimited"

  if (hasUnlimitedCredits(credits)) {
    return compact ? "∞" : unlimitedLabel
  }

  return credits.toLocaleString()
}

export function formatRemainingCredits(credits: number): string {
  return hasUnlimitedCredits(credits)
    ? "Unlimited credits"
    : `${credits.toLocaleString()} credits remaining`
}
