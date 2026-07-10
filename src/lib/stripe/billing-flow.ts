export type BillingPlanCtaMode =
  | "current"
  | "free"
  | "checkout"
  | "manage"
  | "unavailable"

export function getBillingPlanCtaMode({
  isFree,
  isCurrentPlan,
  hasSubscription,
  canCheckout,
}: {
  isFree: boolean
  isCurrentPlan: boolean
  hasSubscription: boolean
  canCheckout: boolean
}): BillingPlanCtaMode {
  if (isCurrentPlan) return "current"
  if (isFree) return "free"
  if (hasSubscription) return "manage"
  return canCheckout ? "checkout" : "unavailable"
}

function isHostedStripeUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false

  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      (url.hostname === "checkout.stripe.com" || url.hostname === "billing.stripe.com")
    )
  } catch {
    return false
  }
}

export function parseStripeRedirectResponse(
  payload: unknown,
  status: number,
  fallbackError: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null

  if (status >= 200 && status < 300 && isHostedStripeUrl(record?.url)) {
    return { ok: true, url: record.url }
  }

  const error = typeof record?.error === "string" ? record.error.trim() : ""
  return {
    ok: false,
    error: error && error.length <= 240 ? error : fallbackError,
  }
}
