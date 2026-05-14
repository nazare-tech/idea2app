import { NextResponse } from "next/server"

import {
  MOCKUP_STORAGE_BUCKET,
  OPENROUTER_IMAGE_MOCKUP_SOURCE,
} from "@/lib/openrouter-image-mockup-pipeline"
import {
  buildMockupImageProxyUrl,
  type OpenRouterImageMockupContent,
  type OpenRouterImageMockupOption,
} from "@/lib/openrouter-image-mockup-format"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentity,
} from "@/lib/active-document-policy"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

export const maxDuration = 300

const EXPECTED_LABELS = ["A", "B", "C"]

function normalizeOption(value: unknown, projectId: string): OpenRouterImageMockupOption | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  const label = typeof record.label === "string" ? record.label.trim().toUpperCase() : ""
  const title = typeof record.title === "string" ? record.title.trim() : ""
  const storagePath = typeof record.storagePath === "string" ? record.storagePath.trim() : ""
  const description = typeof record.description === "string" ? record.description.trim() : ""
  const contentType = typeof record.contentType === "string" ? record.contentType.trim() : "image/png"

  if (!EXPECTED_LABELS.includes(label) || !title || !storagePath) return null
  if (!storagePath.startsWith(`${projectId}/`)) return null
  if (!contentType.startsWith("image/")) return null

  return {
    label,
    title,
    imageUrl: buildMockupImageProxyUrl({ projectId, storagePath }),
    storagePath,
    description,
    contentType,
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
    const model = typeof body.model === "string" ? body.model.trim() : ""
    const runId = typeof body.runId === "string" ? body.runId.trim() : ""
    const rawOptions: unknown[] = Array.isArray(body.options) ? body.options : []

    if (!projectId || !model || !runId) {
      return NextResponse.json(
        { error: "projectId, model, and runId are required" },
        { status: 400 },
      )
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const documentIdentity = getActiveDocumentIdentity("mockups")
    if (documentIdentity) {
      const existingDocument = await findLatestActiveDocument(supabase, projectId, documentIdentity)
      if (existingDocument) {
        return NextResponse.json(createSkippedActiveDocumentPayload(existingDocument))
      }
    }

    const options = rawOptions
      .map((option: unknown) => normalizeOption(option, projectId))
      .filter((option: OpenRouterImageMockupOption | null): option is OpenRouterImageMockupOption => Boolean(option))
      .sort((left: OpenRouterImageMockupOption, right: OpenRouterImageMockupOption) =>
        EXPECTED_LABELS.indexOf(left.label) - EXPECTED_LABELS.indexOf(right.label)
      )

    const labels = new Set(options.map((option) => option.label))
    if (options.length !== EXPECTED_LABELS.length || EXPECTED_LABELS.some((label) => !labels.has(label))) {
      return NextResponse.json(
        { error: "All three mockup options are required before finalizing" },
        { status: 400 },
      )
    }

    const generatedAt = new Date().toISOString()
    const content: OpenRouterImageMockupContent = {
      type: OPENROUTER_IMAGE_MOCKUP_SOURCE,
      model,
      generatedAt,
      options,
    }
    const metadata = {
      source: OPENROUTER_IMAGE_MOCKUP_SOURCE,
      model,
      storage_bucket: MOCKUP_STORAGE_BUCKET,
      storage_run_id: runId,
      generated_at: generatedAt,
      generation_mode: "option_invocations",
    } satisfies Record<string, Json>

    const { data, error: insertError } = await supabase
      .from("mockups")
      .insert({
        project_id: projectId,
        content: JSON.stringify(content),
        model_used: model,
        metadata,
      })
      .select("id")
      .single()

    if (insertError || !data?.id) {
      throw new Error(`Failed to save generated mockups: ${insertError?.message ?? "missing output id"}`)
    }

    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    return NextResponse.json({
      id: data.id,
      content: JSON.stringify(content),
      model,
      source: OPENROUTER_IMAGE_MOCKUP_SOURCE,
    })
  } catch (error) {
    console.error("Mockup finalization error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save mockups" },
      { status: 500 },
    )
  }
}
