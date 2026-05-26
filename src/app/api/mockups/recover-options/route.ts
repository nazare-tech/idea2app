import { NextResponse } from "next/server"

import {
  MOCKUP_STORAGE_BUCKET,
  OPENROUTER_MOCKUP_OPTION_CONFIGS,
  getOpenRouterMockupImageModel,
} from "@/lib/openrouter-image-mockup-pipeline"
import {
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  buildMockupImageProxyUrl,
  type OpenRouterImageMockupScreen,
  type OpenRouterImageMockupOption,
} from "@/lib/openrouter-image-mockup-format"
import { parseMockupDesignPlan } from "@/lib/mockup-design-plan"
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

function getScreensFromDesignPlan(value: unknown): OpenRouterImageMockupScreen[] | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.screens)) return undefined

  const screens = record.screens
    .map((screen) => {
      if (!screen || typeof screen !== "object") return null
      const screenRecord = screen as Record<string, unknown>
      const name = typeof screenRecord.name === "string" ? screenRecord.name.trim() : ""
      const caption = typeof screenRecord.caption === "string" ? screenRecord.caption.trim() : ""
      if (!name || !caption) return null
      return {
        name,
        caption,
        ...(typeof screenRecord.purpose === "string" && screenRecord.purpose.trim()
          ? { purpose: screenRecord.purpose.trim() }
          : {}),
        ...(typeof screenRecord.happyPathState === "string" && screenRecord.happyPathState.trim()
          ? { happyPathState: screenRecord.happyPathState.trim() }
          : {}),
      }
    })
    .filter((screen): screen is OpenRouterImageMockupScreen => Boolean(screen))

  return screens.length > 0 ? screens : undefined
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
    let screens: OpenRouterImageMockupScreen[] | undefined
    if (body.designPlan && typeof body.designPlan === "object") {
      try {
        screens = getScreensFromDesignPlan(parseMockupDesignPlan(JSON.stringify(body.designPlan)))
      } catch {
        return NextResponse.json({ error: "Invalid mockup design plan" }, { status: 400 })
      }
    }

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
        `option-${lowerLabel}-storyboard.png`,
        `option-${lowerLabel}-storyboard.jpg`,
        `option-${lowerLabel}-storyboard.jpeg`,
        `option-${lowerLabel}-storyboard.webp`,
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
        ...(screens ? { screens } : {}),
      })
    }

    return NextResponse.json({
      options,
      model: getOpenRouterMockupImageModel(),
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
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
