import { NextResponse } from "next/server"

import {
  OPENROUTER_MOCKUP_OPTION_CONFIGS,
  OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="672" viewBox="0 0 1536 672">
	  <rect width="1536" height="672" fill="#ffffff"/>
	  <text x="64" y="68" fill="#0f172a" font-family="Arial, sans-serif" font-size="32" font-weight="700">Option ${label}: ${escapeXml(title)}</text>
	  <text x="64" y="104" fill="#64748b" font-family="Arial, sans-serif" font-size="18">${escapeXml(projectName)} storyboard fixture</text>
	  <g transform="translate(64 148)">
	    <rect width="420" height="360" rx="22" fill="#f8fafc" stroke="#dbe4ee" stroke-width="2"/>
	    <rect x="28" y="28" width="364" height="56" rx="16" fill="${accent}"/>
	    <rect x="28" y="116" width="250" height="22" rx="11" fill="#334155"/>
	    <rect x="28" y="162" width="330" height="16" rx="8" fill="#94a3b8"/>
	    <rect x="28" y="206" width="150" height="92" rx="16" fill="#e2e8f0"/>
	    <rect x="204" y="206" width="154" height="92" rx="16" fill="#dbeafe"/>
	    <text x="0" y="412" fill="#475569" font-family="Arial, sans-serif" font-size="18">1. Intake complete</text>
	  </g>
	  <g transform="translate(558 148)">
	    <rect width="420" height="360" rx="22" fill="#f8fafc" stroke="#dbe4ee" stroke-width="2"/>
	    <rect x="28" y="28" width="130" height="304" rx="18" fill="#e2e8f0"/>
	    <rect x="190" y="28" width="202" height="34" rx="17" fill="${accent}"/>
	    <rect x="190" y="96" width="156" height="20" rx="10" fill="#334155"/>
	    <rect x="190" y="144" width="202" height="16" rx="8" fill="#94a3b8"/>
	    <rect x="190" y="190" width="202" height="78" rx="16" fill="#ccfbf1"/>
	    <text x="0" y="412" fill="#475569" font-family="Arial, sans-serif" font-size="18">2. Active workspace</text>
	  </g>
	  <g transform="translate(1052 148)">
	    <rect width="420" height="360" rx="22" fill="#f8fafc" stroke="#dbe4ee" stroke-width="2"/>
	    <rect x="28" y="28" width="292" height="24" rx="12" fill="#334155"/>
	    <rect x="28" y="86" width="364" height="72" rx="18" fill="#ede9fe"/>
	    <rect x="28" y="184" width="172" height="112" rx="18" fill="${accent}" opacity="0.88"/>
	    <rect x="220" y="184" width="172" height="112" rx="18" fill="#e2e8f0"/>
	    <text x="0" y="412" fill="#475569" font-family="Arial, sans-serif" font-size="18">3. Value delivered</text>
	  </g>
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
    const screens = [
      {
        name: "Intake complete",
        caption: "Capture the user's context",
        purpose: "Show completed setup with real data",
        happyPathState: "The user has already provided the key inputs",
      },
      {
        name: "Active workspace",
        caption: "Use the core workflow",
        purpose: "Show the main product surface in use",
        happyPathState: "The product has generated useful working context",
      },
      {
        name: "Value delivered",
        caption: "Review the finished output",
        purpose: "Show the product's primary value moment",
        happyPathState: "The user can act on the completed result",
      },
    ]
    const designPlan = {
      version: "mockup-design-plan-v1",
      primaryPlatform: "desktop-web",
      happyPathScenario: "A returning user completes the core MVP workflow with realistic saved data.",
      targetUser: "Primary MVP user",
      screens,
      directions: OPENROUTER_MOCKUP_OPTION_CONFIGS.map((config) => ({
        label: config.label,
        name: config.title,
        layoutStrategy: config.strategy,
        navigationPattern: "Horizontal storyboard",
        density: "Medium",
        visualTone: "Clean product UI",
        reusableMotifs: ["Cards", "Status blocks", "Action rows"],
        consistencyNotes: "Keep each screen in the same visual system.",
      })),
    }
    const options: OpenRouterImageMockupOption[] = OPENROUTER_MOCKUP_OPTION_CONFIGS.map((config) => ({
      label: config.label,
      title: config.title,
      imageUrl: buildFixtureSvgDataUrl({
        label: config.label,
        title: config.title,
        projectName,
      }),
      storagePath: `fixture/${projectId}/option-${config.label.toLowerCase()}-storyboard.svg`,
      description: config.strategy,
      contentType: "image/svg+xml",
      screens,
      width: 1536,
      height: 672,
    }))

    const content: OpenRouterImageMockupContent = {
      type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      model,
      generatedAt,
      options,
    }
    const metadata = {
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
      model,
      generated_at: generatedAt,
      generation_mode: "fixture",
      design_plan: designPlan as unknown as Json,
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
      source: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
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
