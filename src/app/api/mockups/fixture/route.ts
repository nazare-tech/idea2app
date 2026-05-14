import { NextResponse } from "next/server"

import {
  OPENROUTER_MOCKUP_OPTION_CONFIGS,
  OPENROUTER_IMAGE_MOCKUP_SOURCE,
} from "@/lib/openrouter-image-mockup-pipeline"
import type {
  OpenRouterImageMockupContent,
  OpenRouterImageMockupOption,
} from "@/lib/openrouter-image-mockup-format"
import {
  createSkippedActiveDocumentPayload,
  findLatestActiveDocument,
  getActiveDocumentIdentity,
} from "@/lib/active-document-policy"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

export const maxDuration = 60

function isFixtureGenerationEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_MOCKUP_FIXTURE_GENERATION === "true"
}

function buildFixtureSvgDataUrl({
  label,
  title,
  projectName,
}: {
  label: string
  title: string
  projectName: string
}) {
  const accent = label === "A" ? "#2563eb" : label === "B" ? "#0f766e" : "#7c3aed"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#f8fafc"/>
  <rect x="96" y="72" width="1408" height="756" rx="28" fill="#ffffff" stroke="#dbe4ee" stroke-width="2"/>
  <rect x="96" y="72" width="1408" height="96" rx="28" fill="#0f172a"/>
  <text x="136" y="132" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">${escapeXml(projectName)}</text>
  <circle cx="1440" cy="120" r="20" fill="${accent}"/>
  <text x="136" y="242" fill="#0f172a" font-family="Arial, sans-serif" font-size="46" font-weight="700">Option ${label}: ${escapeXml(title)}</text>
  <text x="136" y="292" fill="#64748b" font-family="Arial, sans-serif" font-size="24">Fixture mockup for no-credit local testing</text>
  <rect x="136" y="352" width="392" height="296" rx="18" fill="#eef2ff" stroke="#c7d2fe"/>
  <rect x="576" y="352" width="392" height="296" rx="18" fill="#ecfeff" stroke="#a5f3fc"/>
  <rect x="1016" y="352" width="392" height="296" rx="18" fill="#f5f3ff" stroke="#ddd6fe"/>
  <rect x="176" y="404" width="220" height="28" rx="14" fill="${accent}"/>
  <rect x="176" y="462" width="292" height="18" rx="9" fill="#94a3b8"/>
  <rect x="176" y="508" width="236" height="18" rx="9" fill="#cbd5e1"/>
  <rect x="616" y="404" width="128" height="128" rx="22" fill="${accent}" opacity="0.92"/>
  <rect x="784" y="414" width="144" height="18" rx="9" fill="#64748b"/>
  <rect x="784" y="462" width="104" height="18" rx="9" fill="#cbd5e1"/>
  <rect x="1056" y="404" width="276" height="24" rx="12" fill="#475569"/>
  <rect x="1056" y="470" width="172" height="96" rx="14" fill="${accent}" opacity="0.82"/>
  <rect x="1248" y="470" width="120" height="96" rx="14" fill="#e2e8f0"/>
  <rect x="136" y="702" width="1272" height="48" rx="24" fill="#e2e8f0"/>
  <rect x="136" y="702" width="${label === "A" ? "420" : label === "B" ? "720" : "1030"}" height="48" rx="24" fill="${accent}"/>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function POST(request: Request) {
  try {
    if (!isFixtureGenerationEnabled()) {
      return NextResponse.json(
        { error: "Mockup fixture generation is disabled for this environment" },
        { status: 403 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
    const projectName = typeof body.projectName === "string" ? body.projectName.trim() : "Project"

    if (!projectId || projectName.length > 160) {
      return NextResponse.json({ error: "projectId and projectName are required" }, { status: 400 })
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

    const generatedAt = new Date().toISOString()
    const model = "fixture/mockup-no-credit"
    const options: OpenRouterImageMockupOption[] = OPENROUTER_MOCKUP_OPTION_CONFIGS.map((config) => ({
      label: config.label,
      title: config.title,
      imageUrl: buildFixtureSvgDataUrl({
        label: config.label,
        title: config.title,
        projectName,
      }),
      storagePath: `fixture/${projectId}/option-${config.label.toLowerCase()}.svg`,
      description: config.strategy,
      contentType: "image/svg+xml",
    }))

    const content: OpenRouterImageMockupContent = {
      type: OPENROUTER_IMAGE_MOCKUP_SOURCE,
      model,
      generatedAt,
      options,
    }
    const metadata = {
      source: OPENROUTER_IMAGE_MOCKUP_SOURCE,
      model,
      generated_at: generatedAt,
      generation_mode: "fixture",
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
      throw new Error(`Failed to save fixture mockups: ${insertError?.message ?? "missing output id"}`)
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
      fixture: true,
    })
  } catch (error) {
    console.error("Mockup fixture generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate fixture mockups" },
      { status: 500 },
    )
  }
}
