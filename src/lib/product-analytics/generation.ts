import type { ProductEventPropertyMap } from "@/lib/product-analytics/contracts"
import { recordServerProductEvent } from "@/lib/product-analytics/server"

type DocumentType = ProductEventPropertyMap["generation_step_completed"]["documentType"]

export const MAX_GENERATION_ANALYTICS_DURATION_MS = 24 * 60 * 60 * 1000

/** Clamp a generation duration to [0, 24h] for analytics properties. */
export function boundGenerationDurationMs(durationMs: number) {
  return Math.min(MAX_GENERATION_ANALYTICS_DURATION_MS, Math.max(0, Math.round(durationMs)))
}

/**
 * Step idempotency key shared by the manual and Generate All paths so the
 * two sources dedupe the same way: one step event per (runId, documentType).
 * Safe for queue runs because each run has one item per doc type and retries
 * mint a fresh run id.
 */
export function buildGenerationStepIdempotencyKey(runId: string, documentType: DocumentType) {
  return `generation:${runId}:step:${documentType}`
}

export function getAnalyticsDocumentType(analysisType: string): DocumentType | null {
  if (analysisType === "competitive-analysis") return "competitive"
  if (analysisType === "prd") return "prd"
  if (analysisType === "mvp-plan") return "mvp"
  if (analysisType === "mockups") return "mockups"
  return null
}

export function recordManualGenerationStarted(options: {
  runId: string
  userId: string
  projectId: string
  planName?: string
}) {
  return recordServerProductEvent({
    eventName: "generation_started",
    idempotencyKey: `generation:${options.runId}:started`,
    userId: options.userId,
    projectId: options.projectId,
    planName: options.planName,
    properties: { runId: options.runId, mode: "manual" },
  })
}

export async function recordManualGenerationCompleted(options: {
  runId: string
  userId: string
  projectId: string
  documentType: DocumentType
  startedAt: number
  planName?: string
}) {
  const durationMs = boundGenerationDurationMs(Date.now() - options.startedAt)
  await Promise.all([
    recordServerProductEvent({
      eventName: "generation_step_completed",
      idempotencyKey: buildGenerationStepIdempotencyKey(options.runId, options.documentType),
      userId: options.userId,
      projectId: options.projectId,
      planName: options.planName,
      properties: {
        runId: options.runId,
        mode: "manual",
        documentType: options.documentType,
        durationMs,
      },
    }),
    recordServerProductEvent({
      eventName: "generation_completed",
      idempotencyKey: `generation:${options.runId}:completed`,
      userId: options.userId,
      projectId: options.projectId,
      planName: options.planName,
      properties: { runId: options.runId, mode: "manual", durationMs },
    }),
  ])
}

export function recordManualGenerationFailed(options: {
  runId: string
  userId: string
  projectId: string
  documentType: DocumentType
  failureKind: ProductEventPropertyMap["generation_failed"]["failureKind"]
  planName?: string
}) {
  return recordServerProductEvent({
    eventName: "generation_failed",
    idempotencyKey: `generation:${options.runId}:failed`,
    userId: options.userId,
    projectId: options.projectId,
    planName: options.planName,
    properties: {
      runId: options.runId,
      mode: "manual",
      documentType: options.documentType,
      failureKind: options.failureKind,
    },
  })
}
