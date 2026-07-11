import { randomUUID } from "node:crypto"

import {
  PRODUCT_EVENT_SCHEMA_VERSION,
  validateServerEvent,
  type ProductEventPropertyMap,
  type ServerProductEventName,
} from "@/lib/product-analytics/contracts"
import { logError } from "@/lib/logger"
import { getUserPlanName } from "@/lib/project-allowance"
import { createServiceClient } from "@/lib/supabase/service"
import {
  getProductAnalyticsEnvironment,
  getProductAnalyticsRelease,
  normalizeProductAnalyticsPlanKey,
  type ProductEventRow,
  type ProductEventStorageSource,
} from "@/lib/product-analytics/storage"

export type RecordServerProductEventOptions<N extends ServerProductEventName> = {
  eventName: N
  idempotencyKey: string
  userId: string
  projectId?: string
  sessionId?: string
  occurredAt?: string
  properties: ProductEventPropertyMap[N]
  source?: Exclude<ProductEventStorageSource, "client">
  planName?: string
}

type ServerEventDependencies = {
  now?: () => Date
  loadPlanName?: (userId: string) => Promise<string>
  insertRow?: (row: ProductEventRow) => Promise<void>
  environment?: string
  appRelease?: string | null
}

export async function recordServerProductEvent<N extends ServerProductEventName>(
  options: RecordServerProductEventOptions<N>,
  dependencies: ServerEventDependencies = {},
) {
  try {
    const now = dependencies.now?.() ?? new Date()
    const event = validateServerEvent({
      eventId: randomUUID(),
      eventName: options.eventName,
      schemaVersion: PRODUCT_EVENT_SCHEMA_VERSION,
      occurredAt: options.occurredAt ?? now.toISOString(),
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      ...(options.projectId ? { projectId: options.projectId } : {}),
      properties: options.properties,
    }, now)
    const planName = options.planName ?? await (
      dependencies.loadPlanName?.(options.userId) ?? loadPlanName(options.userId)
    )
    const row: ProductEventRow = {
      id: randomUUID(),
      idempotency_key: options.idempotencyKey.slice(0, 240),
      event_name: event.eventName,
      schema_version: event.schemaVersion,
      source: options.source ?? "server",
      user_id: options.userId,
      project_id: event.projectId ?? null,
      session_id: event.sessionId ?? null,
      plan_key: normalizeProductAnalyticsPlanKey(planName),
      environment: dependencies.environment ?? getProductAnalyticsEnvironment(),
      app_release: dependencies.appRelease === undefined
        ? getProductAnalyticsRelease()
        : dependencies.appRelease,
      occurred_at: event.occurredAt,
      received_at: now.toISOString(),
      properties: event.properties,
    }

    await (dependencies.insertRow?.(row) ?? insertServerEventRow(row))
    return true
  } catch (error) {
    logError("ProductAnalytics", "server_event_write_failed", error, {
      eventName: options.eventName,
      userId: options.userId,
      projectId: options.projectId,
      source: options.source ?? "server",
    })
    return false
  }
}

async function loadPlanName(userId: string) {
  return getUserPlanName(createServiceClient(), userId)
}

async function insertServerEventRow(row: ProductEventRow) {
  const { error } = await createServiceClient()
    .from("product_events")
    .upsert(row, { onConflict: "idempotency_key", ignoreDuplicates: true })
  if (error) throw error
}
