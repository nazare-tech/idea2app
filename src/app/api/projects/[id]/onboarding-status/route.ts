import { NextResponse } from "next/server"

import {
  buildOnboardingRedirectUrl,
  getOnboardingRunId,
  isOnboardingGenerationQueue,
  mapOnboardingLoadingRows,
} from "@/lib/onboarding-generation"
import {
  getGenerationQueueItems,
  queueItemRowToJson,
  recoverStaleGenerationQueueItems,
  syncGenerationQueueJson,
} from "@/lib/generation-queue-service"
import {
  COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
} from "@/lib/competitive-analysis-v2"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { DocumentType } from "@/lib/document-definitions"
import type { Json } from "@/types/database"

type EffectiveStatus = "running" | "ready" | "partial" | "error"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const requestedRunId = searchParams.get("runId")

  const { data: queueRow, error: queueError } = await supabase
    .from("generation_queues")
    .select("*")
    .eq("project_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (queueError && queueError.code !== "PGRST116") {
    return NextResponse.json({ error: queueError.message }, { status: 500 })
  }

  if (!queueRow || !isOnboardingGenerationQueue(queueRow)) {
    return NextResponse.json({ error: "Onboarding generation run not found" }, { status: 404 })
  }

  const runId = getOnboardingRunId(queueRow)
  if (requestedRunId && runId && requestedRunId !== runId) {
    return NextResponse.json({ error: "Onboarding generation run not found" }, { status: 404 })
  }

  const [
    competitiveResult,
    prdResult,
    mvpResult,
    launchResult,
  ] = await Promise.all([
    supabase
      .from("analyses")
      .select("id, metadata")
      .eq("project_id", id)
      .eq("type", "competitive-analysis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prds")
      .select("id")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("mvp_plans")
      .select("id")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("analyses")
      .select("id")
      .eq("project_id", id)
      .eq("type", "launch-plan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const competitiveReady = hasCompetitiveV2Metadata(competitiveResult.data?.metadata)
  const completedDocs: Partial<Record<DocumentType, boolean>> = {
    competitive: competitiveReady,
    prd: Boolean(prdResult.data?.id),
    mvp: Boolean(mvpResult.data?.id),
    launch: Boolean(launchResult.data?.id),
  }
  const queueSupabase = createServiceClient()
  let queueItems = await getGenerationQueueItems(queueSupabase, queueRow)
  const recoveredItems =
    queueRow.status === "running" || queueRow.status === "queued"
      ? await recoverStaleGenerationQueueItems(queueSupabase, queueItems)
      : []
  if (recoveredItems.length > 0) {
    queueItems = queueItems.map((item) => recoveredItems.find((updated) => updated.id === item.id) ?? item)
    await syncGenerationQueueJson(queueSupabase, queueRow, queueItems, {
      status: "running",
      completed_at: null,
      error_info: null,
    })
  }
  const queueForRows = {
    ...queueRow,
    queue: queueItems.map(queueItemRowToJson) as unknown as Json,
  }
  const rows = mapOnboardingLoadingRows({ queueRow: queueForRows, completedDocs }).map((row) => ({
    key: row.key,
    label: row.label,
    message: row.phrase,
    status: row.status,
    progressCap: row.status === "done" ? 100 : 90,
    docType: row.docType,
    error: row.error,
  }))
  const hasErrors = queueRow.status === "error" || rows.some((row) => row.status === "error")
  const hasActiveWork = queueItems.some((item) => item.status === "pending" || item.status === "generating")
  const allRowsDone = rows.every((row) => row.status === "done")
  const effectiveStatus: EffectiveStatus = competitiveReady
    ? hasErrors && !allRowsDone
      ? "partial"
      : "ready"
    : hasErrors && !hasActiveWork
      ? "error"
      : "running"

  const metadata = asRecord(queueRow.model_selections)
  const metadataRedirect = typeof metadata?.redirectUrl === "string" ? metadata.redirectUrl : null
  const redirectUrl = metadataRedirect || buildOnboardingRedirectUrl(project)

  return NextResponse.json({
    runId,
    status: queueRow.status,
    effectiveStatus,
    readyToRedirect: competitiveReady,
    redirectUrl,
    needsExecute: recoveredItems.length > 0,
    rows,
    errors: rows
      .filter((row) => row.error)
      .map((row) => ({ key: row.key, message: row.error })),
  })
}

function hasCompetitiveV2Metadata(metadata: Json | null | undefined) {
  const record = asRecord(metadata)
  return record?.document_version === COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
