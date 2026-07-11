import type { ProductEventInput, ProductEventName } from "@/lib/product-analytics/contracts"

export type ProductEventStorageSource = "client" | "server" | "stripe_webhook"
export type ProductAnalyticsPlanKey = "free" | "starter" | "pro" | "premium" | "unknown"

export type ProductEventRow = {
  id: string
  idempotency_key: string
  event_name: ProductEventName
  schema_version: number
  source: ProductEventStorageSource
  user_id: string
  project_id: string | null
  session_id: string | null
  plan_key: ProductAnalyticsPlanKey
  environment: string
  app_release: string | null
  occurred_at: string
  received_at: string
  properties: ProductEventInput["properties"]
}

export function normalizeProductAnalyticsPlanKey(planName: string): ProductAnalyticsPlanKey {
  const normalized = planName.trim().toLowerCase()
  if (normalized === "starter" || normalized === "basic") return "starter"
  if (normalized === "pro" || normalized === "growth") return "pro"
  if (
    normalized === "premium" ||
    normalized === "team" ||
    normalized === "business" ||
    normalized === "enterprise" ||
    normalized === "internal dev"
  ) {
    return "premium"
  }
  if (normalized === "free") return "free"
  return "unknown"
}

export function getProductAnalyticsEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return (env.VERCEL_ENV || env.NODE_ENV || "development").slice(0, 32)
}

export function getProductAnalyticsRelease(env: NodeJS.ProcessEnv = process.env) {
  const release = env.VERCEL_GIT_COMMIT_SHA || env.NEXT_PUBLIC_APP_RELEASE
  return release ? release.slice(0, 80) : null
}
