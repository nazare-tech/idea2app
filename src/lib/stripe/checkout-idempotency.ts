import { createHash } from "node:crypto"

interface CheckoutIdempotencyInput {
  userId: string
  planPriceId: string
  stripePriceId: string
}

export function buildCheckoutSessionIdempotencyKey({
  userId,
  planPriceId,
  stripePriceId,
}: CheckoutIdempotencyInput) {
  const digest = createHash("sha256")
    .update(`${userId}:${planPriceId}:${stripePriceId}`)
    .digest("hex")

  return `checkout-session:${digest}`
}
