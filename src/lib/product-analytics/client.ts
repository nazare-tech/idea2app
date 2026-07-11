"use client"

import {
  MAX_PRODUCT_EVENTS_PER_BATCH,
  PRODUCT_EVENT_SCHEMA_VERSION,
  isUuid,
  type ClientProductEventInput,
  type ClientProductEventName,
  type ProductEventPropertyMap,
} from "@/lib/product-analytics/contracts"

const TAB_SESSION_KEY = "maker_compass_product_analytics_session"
const UPGRADE_ATTRIBUTION_KEY = "maker_compass_upgrade_attribution"
const FLUSH_DELAY_MS = 1_500
const RETRY_DELAY_MS = 2_500
const MAX_QUEUED_EVENTS = 100
const MAX_DELIVERY_RETRIES = 3

type DeliveryResult = "accepted" | "retry" | "drop"

export type ProductEventBatcher = ReturnType<typeof createProductEventBatcher>

export function createProductEventBatcher({
  deliver,
  schedule = (callback, delayMs) => window.setTimeout(callback, delayMs),
  cancel = (timerId) => window.clearTimeout(timerId),
}: {
  deliver: (events: ClientProductEventInput[], keepalive: boolean) => Promise<DeliveryResult>
  schedule?: (callback: () => void, delayMs: number) => number
  cancel?: (timerId: number) => void
}) {
  let queue: ClientProductEventInput[] = []
  let timerId: number | null = null
  let inFlight = false
  let consecutiveRetries = 0

  const scheduleFlush = (delayMs = FLUSH_DELAY_MS) => {
    if (timerId !== null || inFlight || queue.length === 0) return
    timerId = schedule(() => {
      timerId = null
      void flush(false)
    }, delayMs)
  }

  const flush = async (keepalive = false) => {
    if (queue.length === 0) return
    if (inFlight) {
      if (!keepalive) return
      const exitEvents = queue.splice(0, MAX_PRODUCT_EVENTS_PER_BATCH)
      try {
        const result = await deliver(exitEvents, true)
        if (result === "retry") queue = [...exitEvents, ...queue].slice(-MAX_QUEUED_EVENTS)
      } catch {
        queue = [...exitEvents, ...queue].slice(-MAX_QUEUED_EVENTS)
      }
      return
    }
    if (timerId !== null) {
      cancel(timerId)
      timerId = null
    }

    const events = queue.splice(0, MAX_PRODUCT_EVENTS_PER_BATCH)
    inFlight = true
    let result: DeliveryResult = "retry"
    try {
      result = await deliver(events, keepalive)
    } catch {
      result = "retry"
    } finally {
      inFlight = false
    }

    if (result === "retry") {
      consecutiveRetries += 1
      if (consecutiveRetries > MAX_DELIVERY_RETRIES) {
        consecutiveRetries = 0
        if (queue.length > 0) scheduleFlush()
        return
      }
      queue = [...events, ...queue].slice(-MAX_QUEUED_EVENTS)
      scheduleFlush(RETRY_DELAY_MS)
      return
    }
    consecutiveRetries = 0
    if (queue.length > 0) scheduleFlush(keepalive ? 0 : FLUSH_DELAY_MS)
  }

  return {
    enqueue(event: ClientProductEventInput) {
      queue.push(event)
      if (queue.length > MAX_QUEUED_EVENTS) queue = queue.slice(-MAX_QUEUED_EVENTS)
      if (queue.length >= MAX_PRODUCT_EVENTS_PER_BATCH) {
        void flush(false)
      } else {
        scheduleFlush()
      }
    },
    flush,
    size: () => queue.length,
    destroy() {
      if (timerId !== null) cancel(timerId)
      timerId = null
      queue = []
    },
  }
}

let singletonBatcher: ProductEventBatcher | null = null
let lifecycleInstalled = false

export function createProductAnalyticsSessionId() {
  return crypto.randomUUID()
}

export function getProductAnalyticsTabSessionId() {
  if (typeof window === "undefined") return null
  try {
    const existing = sessionStorage.getItem(TAB_SESSION_KEY)
    if (existing && isUuid(existing)) return existing
    const sessionId = createProductAnalyticsSessionId()
    sessionStorage.setItem(TAB_SESSION_KEY, sessionId)
    return sessionId
  } catch {
    return createProductAnalyticsSessionId()
  }
}

export function trackClientProductEvent<N extends ClientProductEventName>(
  eventName: N,
  properties: ProductEventPropertyMap[N],
  options: { projectId?: string; sessionId?: string } = {},
) {
  if (typeof window === "undefined") return null
  const sessionId = options.sessionId ?? getProductAnalyticsTabSessionId()
  if (!sessionId) return null
  const event = {
    eventId: crypto.randomUUID(),
    eventName,
    schemaVersion: PRODUCT_EVENT_SCHEMA_VERSION,
    occurredAt: new Date().toISOString(),
    sessionId,
    ...(options.projectId ? { projectId: options.projectId } : {}),
    properties,
  } as ClientProductEventInput

  getBatcher().enqueue(event)
  return event.eventId
}

export function flushProductEvents(keepalive = false) {
  return singletonBatcher?.flush(keepalive) ?? Promise.resolve()
}

export function rememberUpgradeAttribution(
  surface: ProductEventPropertyMap["upgrade_cta_clicked"]["surface"],
  projectId?: string,
  attributionEventId?: string | null,
) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(UPGRADE_ATTRIBUTION_KEY, JSON.stringify({
      sourceSurface: surface,
      ...(projectId && isUuid(projectId) ? { projectId } : {}),
      ...(attributionEventId && isUuid(attributionEventId) ? { attributionEventId } : {}),
    }))
  } catch {
    // Attribution is optional; event delivery still proceeds.
  }
}

export function getUpgradeAttribution() {
  if (typeof window === "undefined") return { sourceSurface: "billing" as const }
  try {
    const stored = sessionStorage.getItem(UPGRADE_ATTRIBUTION_KEY)
    const parsed = stored?.startsWith("{") ? JSON.parse(stored) as Record<string, unknown> : null
    const surface = parsed?.sourceSurface ?? stored
    if (
      surface === "project_composer" ||
      surface === "project_delete" ||
      surface === "preferences" ||
      surface === "mockup_entitlement"
    ) {
      return {
        sourceSurface: surface,
        ...(typeof parsed?.projectId === "string" && isUuid(parsed.projectId)
          ? { projectId: parsed.projectId }
          : {}),
        ...(typeof parsed?.attributionEventId === "string" && isUuid(parsed.attributionEventId)
          ? { attributionEventId: parsed.attributionEventId }
          : {}),
      }
    }
  } catch {
    // Fall back to the billing page itself.
  }
  return { sourceSurface: "billing" as const }
}

export function consumeUpgradeAttribution() {
  const surface = getUpgradeAttribution()
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(UPGRADE_ATTRIBUTION_KEY)
    } catch {
      // Attribution is optional.
    }
  }
  return surface
}

function getBatcher() {
  if (!singletonBatcher) {
    singletonBatcher = createProductEventBatcher({ deliver: deliverProductEvents })
  }
  if (!lifecycleInstalled) {
    lifecycleInstalled = true
    window.addEventListener("pagehide", () => {
      queueMicrotask(() => { void flushProductEvents(true) })
    })
  }
  return singletonBatcher
}

async function deliverProductEvents(events: ClientProductEventInput[], keepalive: boolean): Promise<DeliveryResult> {
  void keepalive
  const response = await fetch("/api/product-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ events }),
    // Every batch is below the browser's 64 KiB keepalive limit. Making normal
    // delivery navigation-safe also protects a request already in flight when
    // a pagehide summary is queued.
    keepalive: true,
  })
  if (response.ok) return "accepted"
  if (response.status === 429 || response.status >= 500) return "retry"
  return "drop"
}
