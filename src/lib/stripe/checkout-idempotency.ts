import { createHash } from "node:crypto"

interface CheckoutIdempotencyInput {
  userId: string
  planPriceId: string
  stripePriceId: string
  /**
   * Serialized analytics metadata embedded in the session payload. Stripe
   * rejects a reused idempotency key when any request param differs, so
   * everything that varies between attempts (attribution event id, session
   * id, source surface) must vary the key too. Identical retries of one
   * attempt still share a key and dedupe.
   */
  analyticsFingerprint?: string
}

export function buildCheckoutSessionIdempotencyKey({
  userId,
  planPriceId,
  stripePriceId,
  analyticsFingerprint = "",
}: CheckoutIdempotencyInput) {
  const digest = createHash("sha256")
    .update(`${userId}:${planPriceId}:${stripePriceId}:${analyticsFingerprint}`)
    .digest("hex")

  return `checkout-session:${digest}`
}
