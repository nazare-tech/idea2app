import { createServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/database"

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

export async function refundCreditsServerSide({
  userId,
  amount,
  action,
  description,
  metadata,
}: {
  userId: string
  amount: number
  action: string
  description: string
  metadata?: Json
}) {
  if (!userId || amount <= 0) {
    return { refunded: false, error: null }
  }

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("refund_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_action: action,
    p_description: description,
    ...(metadata !== undefined ? { p_metadata: metadata } : {}),
  })

  if (error) {
    return {
      refunded: false,
      error: error.message ?? "Refund failed",
    }
  }

  return { refunded: true, error: null }
}
