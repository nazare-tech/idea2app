import { UPGRADE_SURFACES, isRecord, isSafeToken, isUuid } from "@/lib/product-analytics/contracts"

export type CheckoutAnalyticsContext = {
  sourceSurface: typeof UPGRADE_SURFACES[number]
  sessionId?: string
  projectId?: string
  attributionEventId?: string
  experimentVariant?: string
}

export function parseCheckoutAnalyticsInput(value: unknown): CheckoutAnalyticsContext {
  const input = isRecord(value) ? value : {}
  return compactContext({
    sourceSurface: isUpgradeSurface(input.sourceSurface) ? input.sourceSurface : "billing",
    sessionId: isUuid(input.sessionId)
      ? input.sessionId
      : isUuid(input.analyticsSessionId)
        ? input.analyticsSessionId
        : undefined,
    projectId: isUuid(input.projectId) ? input.projectId : undefined,
    attributionEventId: isUuid(input.attributionEventId) ? input.attributionEventId : undefined,
    experimentVariant: isSafeToken(input.experimentVariant) ? input.experimentVariant : undefined,
  })
}

export function buildCheckoutAnalyticsMetadata(context: CheckoutAnalyticsContext) {
  return {
    analytics_source_surface: context.sourceSurface,
    ...(context.sessionId ? { analytics_session_id: context.sessionId } : {}),
    ...(context.projectId ? { analytics_project_id: context.projectId } : {}),
    ...(context.attributionEventId
      ? { analytics_attribution_event_id: context.attributionEventId }
      : {}),
    ...(context.experimentVariant ? { analytics_experiment_variant: context.experimentVariant } : {}),
  }
}

export function parseCheckoutAnalyticsMetadata(value: unknown): CheckoutAnalyticsContext {
  const metadata = isRecord(value) ? value : {}
  return parseCheckoutAnalyticsInput({
    sourceSurface: metadata.analytics_source_surface,
    sessionId: metadata.analytics_session_id,
    projectId: metadata.analytics_project_id,
    attributionEventId: metadata.analytics_attribution_event_id,
    experimentVariant: metadata.analytics_experiment_variant,
  })
}

function compactContext(context: CheckoutAnalyticsContext): CheckoutAnalyticsContext {
  return {
    sourceSurface: context.sourceSurface,
    ...(context.sessionId ? { sessionId: context.sessionId } : {}),
    ...(context.projectId ? { projectId: context.projectId } : {}),
    ...(context.attributionEventId ? { attributionEventId: context.attributionEventId } : {}),
    ...(context.experimentVariant ? { experimentVariant: context.experimentVariant } : {}),
  }
}

function isUpgradeSurface(value: unknown): value is CheckoutAnalyticsContext["sourceSurface"] {
  return typeof value === "string" && (UPGRADE_SURFACES as readonly string[]).includes(value)
}
