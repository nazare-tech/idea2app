import { NextResponse } from "next/server"

import {
  MOCKUP_STORAGE_BUCKET,
  OPENROUTER_MOCKUP_OPTION_CONFIGS,
  getOpenRouterMockupImageModel,
} from "@/lib/openrouter-image-mockup-pipeline"
import {
  OPENROUTER_IMAGE_MOCKUP_SOURCE,
  buildMockupImageProxyUrl,
  type OpenRouterImageMockupOption,
} from "@/lib/openrouter-image-mockup-format"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export const maxDuration = 60

const SAFE_RUN_ID = /^[A-Za-z0-9_-]+$/

function getContentTypeFromName(name: string) {
  const lowerName = name.toLowerCase()
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg"
  if (lowerName.endsWith(".webp")) return "image/webp"
  if (lowerName.endsWith(".png")) return "image/png"
  return null
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
    const runId = typeof body.runId === "string" ? body.runId.trim() : ""

    if (!projectId || !runId || !SAFE_RUN_ID.test(runId)) {
      return NextResponse.json({ error: "projectId and a valid runId are required" }, { status: 400 })
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

    const storageSupabase = createServiceClient()
    const prefix = `${projectId}/${runId}`
    const { data: files, error } = await storageSupabase.storage
      .from(MOCKUP_STORAGE_BUCKET)
      .list(prefix, { limit: 20 })

    if (error) {
      throw new Error(`Failed to inspect saved mockup images: ${error.message}`)
    }

    const fileByName = new Map(
      (files ?? []).map((file) => [file.name.toLowerCase(), file]),
    )
    const options: OpenRouterImageMockupOption[] = []

    for (const config of OPENROUTER_MOCKUP_OPTION_CONFIGS) {
      const lowerLabel = config.label.toLowerCase()
      const file = [
        `option-${lowerLabel}.png`,
        `option-${lowerLabel}.jpg`,
        `option-${lowerLabel}.jpeg`,
        `option-${lowerLabel}.webp`,
      ]
        .map((name) => fileByName.get(name))
        .find(Boolean)

      if (!file) continue

      const contentType = getContentTypeFromName(file.name)
      if (!contentType) continue

      const storagePath = `${prefix}/${file.name}`
      options.push({
        label: config.label,
        title: config.title,
        imageUrl: buildMockupImageProxyUrl({ projectId, storagePath }),
        storagePath,
        description: config.strategy,
        contentType,
      })
    }

    return NextResponse.json({
      options,
      model: getOpenRouterMockupImageModel(),
      source: OPENROUTER_IMAGE_MOCKUP_SOURCE,
      runId,
    })
  } catch (error) {
    console.error("Mockup option recovery error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to recover generated mockup options" },
      { status: 500 },
    )
  }
}
