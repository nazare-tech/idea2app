import { NextResponse } from "next/server"

import { buildRequestLogContext, logError, logWarn } from "@/lib/logger"
import {
  ingestClientProductEvents,
  ProductEventOwnershipError,
  ProductEventQuotaError,
} from "@/lib/product-analytics/ingest"
import { ProductEventValidationError } from "@/lib/product-analytics/contracts"
import { getUserPlanName } from "@/lib/project-allowance"
import { getCachedPlanName } from "@/lib/product-analytics/plan-name-cache"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { readRequestTextWithLimit, RequestBodyTooLargeError } from "@/lib/read-request-body"

const MAX_REQUEST_BYTES = 64 * 1024

export async function POST(request: Request) {
  const requestLogContext = buildRequestLogContext(request)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isAllowedOrigin(request)) {
    logWarn("ProductAnalytics", "origin_rejected", { ...requestLogContext, userId: user.id })
    return NextResponse.json({ error: "Request rejected" }, { status: 403 })
  }

  const ip = getClientIp(request)
  const limits = await Promise.all([
    checkRateLimit({ key: `product-events:ip:${ip}`, limit: 600, windowMs: 60 * 60 * 1000 }),
    checkRateLimit({ key: `product-events:user-hour:${user.id}`, limit: 120, windowMs: 60 * 60 * 1000 }),
    checkRateLimit({ key: `product-events:user-day:${user.id}`, limit: 500, windowMs: 24 * 60 * 60 * 1000 }),
  ])
  const limited = limits.find((result) => result.limited)
  if (limited) {
    return NextResponse.json(
      { error: "Too many analytics requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    )
  }

  let rawBody: string
  try {
    rawBody = await readRequestTextWithLimit(request, MAX_REQUEST_BYTES)
  } catch (error) {
    if (!(error instanceof RequestBodyTooLargeError)) throw error
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })
  }

  try {
    const service = createServiceClient()
    const result = await ingestClientProductEvents(body, user.id, {
      loadOwnedProjectIds: async (projectIds) => {
        const { data, error } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id)
          .in("id", projectIds)
        if (error) throw error
        return (data ?? []).map((project) => project.id)
      },
      loadPlanName: () => getCachedPlanName(user.id, () => getUserPlanName(supabase, user.id)),
      insertRows: async (rows) => {
        const { error } = await service.rpc("ingest_product_event_batch", {
          p_user_id: user.id,
          p_rows: rows,
          p_daily_limit: 2_000,
        })
        if (error?.message?.includes("product_event_daily_quota_exceeded")) {
          throw new ProductEventQuotaError()
        }
        if (error) throw error
      },
    })
    return NextResponse.json(result, { status: 202 })
  } catch (error) {
    if (error instanceof ProductEventValidationError) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })
    }
    if (error instanceof ProductEventOwnershipError) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    if (error instanceof ProductEventQuotaError) {
      return NextResponse.json({ error: "Analytics quota exceeded" }, { status: 429 })
    }
    logError("ProductAnalytics", "client_event_ingest_failed", error, {
      ...requestLogContext,
      userId: user.id,
    })
    return NextResponse.json({ error: "Failed to record events" }, { status: 500 })
  }
}

function isAllowedOrigin(request: Request) {
  if (process.env.NODE_ENV !== "production") return true
  const origin = request.headers.get("origin")
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL
  if (!origin || !configuredOrigin) return false
  try {
    return new URL(origin).origin === new URL(configuredOrigin).origin
  } catch {
    return false
  }
}
