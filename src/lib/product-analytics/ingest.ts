import { randomUUID } from "node:crypto"

import {
  validateClientEventBatch,
  type ClientProductEventInput,
} from "@/lib/product-analytics/contracts"
import {
  getProductAnalyticsEnvironment,
  getProductAnalyticsRelease,
  normalizeProductAnalyticsPlanKey,
  type ProductEventRow,
} from "@/lib/product-analytics/storage"

export class ProductEventOwnershipError extends Error {
  constructor() {
    super("One or more projects are unavailable")
    this.name = "ProductEventOwnershipError"
  }
}

export class ProductEventQuotaError extends Error {
  constructor() {
    super("Daily product event quota exceeded")
    this.name = "ProductEventQuotaError"
  }
}

export type ClientEventIngestDependencies = {
  loadOwnedProjectIds: (projectIds: string[]) => Promise<string[]>
  loadPlanName: () => Promise<string>
  insertRows: (rows: ProductEventRow[]) => Promise<void>
  loadDailyEventCount?: (dayStartIso: string) => Promise<number>
  maxDailyEvents?: number
  now?: () => Date
  environment?: string
  appRelease?: string | null
}

export async function ingestClientProductEvents(
  input: unknown,
  userId: string,
  dependencies: ClientEventIngestDependencies,
) {
  const now = dependencies.now?.() ?? new Date()
  const events = validateClientEventBatch(input, now)
  if (dependencies.loadDailyEventCount) {
    const dayStartIso = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    )).toISOString()
    const currentCount = await dependencies.loadDailyEventCount(dayStartIso)
    if (currentCount + events.length > (dependencies.maxDailyEvents ?? 2_000)) {
      throw new ProductEventQuotaError()
    }
  }
  const projectIds = [...new Set(events.flatMap((event) => event.projectId ? [event.projectId] : []))]

  if (projectIds.length > 0) {
    const ownedProjectIds = new Set(await dependencies.loadOwnedProjectIds(projectIds))
    if (projectIds.some((projectId) => !ownedProjectIds.has(projectId))) {
      throw new ProductEventOwnershipError()
    }
  }

  const planKey = normalizeProductAnalyticsPlanKey(await dependencies.loadPlanName())
  const receivedAt = now.toISOString()
  const rows = events.map((event) => buildClientEventRow({
    event,
    userId,
    planKey,
    receivedAt,
    environment: dependencies.environment ?? getProductAnalyticsEnvironment(),
    appRelease: dependencies.appRelease === undefined
      ? getProductAnalyticsRelease()
      : dependencies.appRelease,
  }))

  await dependencies.insertRows(rows)
  return { accepted: rows.length }
}

function buildClientEventRow({
  event,
  userId,
  planKey,
  receivedAt,
  environment,
  appRelease,
}: {
  event: ClientProductEventInput
  userId: string
  planKey: ProductEventRow["plan_key"]
  receivedAt: string
  environment: string
  appRelease: string | null
}): ProductEventRow {
  return {
    id: randomUUID(),
    idempotency_key: `client:${userId}:${event.eventId}`,
    event_name: event.eventName,
    schema_version: event.schemaVersion,
    source: "client",
    user_id: userId,
    project_id: event.projectId ?? null,
    session_id: event.sessionId,
    plan_key: planKey,
    environment,
    app_release: appRelease,
    occurred_at: event.occurredAt,
    received_at: receivedAt,
    properties: event.properties,
  }
}
