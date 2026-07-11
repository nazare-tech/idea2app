import type Stripe from "stripe"

export function isStripeMissingResourceError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "resource_missing"
  )
}

export async function getUsableStripeCustomerId(
  stripe: Stripe,
  customerId: string | null,
  expectedUserId: string
) {
  if (!customerId) return null

  try {
    const customer = await stripe.customers.retrieve(customerId)
    if ("deleted" in customer && customer.deleted) return null
    if (customer.metadata.supabase_user_id !== expectedUserId) return null
    return customer.id
  } catch (error) {
    if (isStripeMissingResourceError(error)) return null
    throw error
  }
}

export function buildStripeCustomerIdempotencyKey(
  userId: string,
  observedCustomerId: string | null
) {
  return `makercompass:customer:${userId}:${observedCustomerId ?? "none"}`
}
