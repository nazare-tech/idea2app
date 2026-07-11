import type { ProductEventPropertyMap } from "@/lib/product-analytics/contracts"
import { recordServerProductEvent } from "@/lib/product-analytics/server"

type DocumentType = ProductEventPropertyMap["generation_step_completed"]["documentType"]

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
  const durationMs = Math.min(24 * 60 * 60 * 1000, Math.max(0, Date.now() - options.startedAt))
  await Promise.all([
    recordServerProductEvent({
      eventName: "generation_step_completed",
      idempotencyKey: `generation:${options.runId}:step:${options.documentType}`,
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
