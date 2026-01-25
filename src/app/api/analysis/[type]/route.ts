import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { callN8NWebhook } from "@/lib/n8n"
import { callOpenRouterFallback } from "@/lib/openrouter"
import { CREDIT_COSTS, type AnalysisType } from "@/lib/utils"

interface AnalysisParams {
  params: Promise<{ type: string }>
}

export async function POST(request: Request, { params }: AnalysisParams) {
  try {
    const { type } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, idea, name } = await request.json()

    if (!projectId || !idea || !name) {
      return NextResponse.json(
        { error: "projectId, idea, and name are required" },
        { status: 400 }
      )
    }

    // Validate analysis type
    const validTypes = ["competitive-analysis", "gap-analysis", "prd", "tech-spec"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid analysis type: ${type}` },
        { status: 400 }
      )
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check and deduct credits
    const creditCost = CREDIT_COSTS[type as AnalysisType] || 5
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: type,
      p_description: `${type} for "${name}"`,
    })

    if (!consumed) {
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 402 }
      )
    }

    // Try N8N webhook first, then fallback to OpenRouter
    let result: { content: string; source: string }

    try {
      result = await callN8NWebhook(type, {
        idea,
        name,
        projectId,
      })
    } catch {
      console.log(`N8N webhook failed for ${type}, using OpenRouter fallback`)
      result = await callOpenRouterFallback(type, idea, name)
    }

    // Store the result based on type
    if (type === "prd") {
      await supabase.from("prds").insert({
        project_id: projectId,
        content: result.content,
      })
    } else if (type === "tech-spec") {
      await supabase.from("tech_specs").insert({
        project_id: projectId,
        content: result.content,
      })
    } else {
      await supabase.from("analyses").insert({
        project_id: projectId,
        type,
        content: result.content,
        metadata: { source: result.source },
      })
    }

    // Update project
    await supabase
      .from("projects")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", projectId)

    return NextResponse.json({
      content: result.content,
      source: result.source,
      type,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: "Failed to generate analysis. Please try again." },
      { status: 500 }
    )
  }
}
