/**
 * /api/generate-all/execute
 *
 * Server-side orchestrator for the "Generate All" pipeline.
 *
 * This route replaces the client-side runLoop() in generate-all-store.ts.
 * It runs on the server for the full 300s window, so generation is durable
 * even if the user closes the browser tab.
 *
 * Flow:
 *   1. Read queue + model_selections from generation_queues DB row
 *   2. For each pending item (in order):
 *      a. Check if queue was cancelled
 *      b. Deduct credits
 *      c. Mark item as "generating" in DB
 *      d. Run the appropriate pipeline function
 *      e. Save result to the correct table (analyses/prds/mvp_plans/mockups)
 *      f. Mark item as "done" in DB
 *   3. On any failure: refund that step's credits + mark error + stop
 *   4. On completion: mark overall status "completed"
 *
 * The frontend polls /api/generate-all/status every 3s to read progress.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  runCompetitiveAnalysis,
  runPRD,
  runMVPPlan,
  runTechSpec,
} from "@/lib/analysis-pipelines"
import { generateStitchMockup } from "@/lib/stitch-pipeline"
import { getTokenCost } from "@/lib/token-economics"
import { linkifyBareUrls } from "@/lib/markdown-links"
import { GENERATE_ALL_ACTION_MAP } from "@/lib/token-economics"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export const maxDuration = 300

type SB = SupabaseClient<Database>

// ─── Queue helpers ───────────────────────────────────────────────────────────

interface QueueItem {
  docType: string
  label: string
  status: string
  creditCost: number
  stageMessage?: string
  error?: string
}

/** Read the full generation_queues row for a project */
async function fetchQueueRow(supabase: SB, projectId: string, userId: string) {
  const { data } = await supabase
    .from("generation_queues")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single()
  return data
}

/** Write the mutated queue array + optional top-level fields back to DB */
async function persistQueue(
  supabase: SB,
  projectId: string,
  userId: string,
  queue: QueueItem[],
  extra: Record<string, unknown> = {},
) {
  await supabase
    .from("generation_queues")
    .update({ queue: queue as unknown as Database["public"]["Tables"]["generation_queues"]["Update"]["queue"], ...extra })
    .eq("project_id", projectId)
    .eq("user_id", userId)
}

// ─── Per-step execution ──────────────────────────────────────────────────────

async function runStep(
  docType: string,
  modelId: string | undefined,
  supabase: SB,
  projectId: string,
  project: { description: string; name: string },
): Promise<void> {
  const idea = project.description
  const name = project.name

  if (docType === "competitive") {
    const result = await runCompetitiveAnalysis({ idea, name, model: modelId })
    const content = linkifyBareUrls(result.content)
    await supabase.from("analyses").insert({
      project_id: projectId,
      type: "competitive-analysis",
      content,
      metadata: {
        source: result.source,
        model: result.model,
        generated_at: new Date().toISOString(),
      },
    })
  } else if (docType === "prd") {
    // Fetch latest competitive analysis as context
    const { data: analysisRow } = await supabase
      .from("analyses")
      .select("content")
      .eq("project_id", projectId)
      .eq("type", "competitive-analysis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const result = await runPRD({
      idea,
      name,
      competitiveAnalysis: analysisRow?.content,
      model: modelId,
    })
    const content = linkifyBareUrls(result.content)
    await supabase.from("prds").insert({ project_id: projectId, content })
  } else if (docType === "mvp") {
    const { data: prdRow } = await supabase
      .from("prds")
      .select("content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const result = await runMVPPlan({ idea, name, prd: prdRow?.content, model: modelId })
    const content = linkifyBareUrls(result.content)
    await supabase.from("mvp_plans").insert({ project_id: projectId, content })
  } else if (docType === "mockups") {
    const { data: mvpRow } = await supabase
      .from("mvp_plans")
      .select("content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const content = await generateStitchMockup(
      mvpRow?.content ?? `MVP plan for ${name}: ${idea}`,
      name,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("mockups").insert({
      project_id: projectId,
      content,
      model_used: "stitch",
      metadata: { source: "stitch", generated_at: new Date().toISOString() },
    })
  } else if (docType === "launch") {
    // Lightweight template-based generation (no LLM call)
    const channels = ["Product Hunt", "X", "Show HN", "Founder communities", "Email/waitlist"]
    const content = buildLaunchPlanContent(name, idea, {
      targetAudience: "Early adopters and tech-savvy users",
      stage: "Pre-launch",
      budget: "Bootstrap / Lean",
      channels: channels.join(", "),
      launchWindow: "Next 30 days",
    })
    await supabase.from("analyses").insert({
      project_id: projectId,
      type: "launch-plan",
      content,
      metadata: { source: "inhouse", generated_at: new Date().toISOString() },
    })
  } else if (docType === "techspec") {
    const { data: prdRow } = await supabase
      .from("prds")
      .select("content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const result = await runTechSpec({ idea, name, prd: prdRow?.content, model: modelId })
    const content = linkifyBareUrls(result.content)
    await supabase.from("tech_specs").insert({ project_id: projectId, content })
  }
}

function buildLaunchPlanContent(
  name: string,
  idea: string,
  brief: {
    targetAudience: string
    stage: string
    budget: string
    channels: string
    launchWindow: string
  },
): string {
  const channels = brief.channels.split(",").map((c) => c.trim()).filter(Boolean)
  const immediateChannels = channels.slice(0, 3)
  const scheduledChannels = channels.slice(3)

  return `# Marketing Plan — ${name}

## Brief Inputs
- **Target audience:** ${brief.targetAudience}
- **Stage:** ${brief.stage}
- **Budget:** ${brief.budget}
- **Launch window:** ${brief.launchWindow}
- **Channels:** ${channels.join(", ")}

## Positioning
- **Product:** ${name}
- **Who it is for:** ${brief.targetAudience}
- **Core value prop:** ${idea.slice(0, 240)}${idea.length > 240 ? "..." : ""}

## Channel Priority
### Immediate (${brief.launchWindow})
${immediateChannels.length > 0 ? immediateChannels.map((c, i) => `${i + 1}. ${c}`).join("\n") : "1. Product Hunt\n2. X\n3. Founder communities"}

### Scheduled (next cycle)
${scheduledChannels.length > 0 ? scheduledChannels.map((c, i) => `${i + 1}. ${c}`).join("\n") : "1. Show HN\n2. Niche communities\n3. Email/waitlist"}

### Budget Allocation (starting point)
- **Content & creative:** 40%
- **Distribution/boosts:** 40%
- **Experiments:** 20%

> Adjust for stage: **${brief.stage}** and budget ceiling **${brief.budget}**.

## Copy Pack (MVP)
### One-liner
${name} helps ${brief.targetAudience} move from idea to launch faster with clearer execution and distribution planning.

### Short description
${name} turns raw concepts into build-ready plans and practical marketing execution so teams can ship and validate faster.

### Founder comment template
We are launching ${name} for ${brief.targetAudience}. Current stage: ${brief.stage}. Looking for feedback on messaging clarity, channel fit, and activation friction.

## 14-Day Execution Checklist
- [ ] Finalize positioning + one-liner
- [ ] Prepare launch assets (logo, screenshots, demo)
- [ ] Ship first 3 channel posts
- [ ] Track signups, activation, and channel-level conversion
- [ ] Publish one iteration based on feedback within 48h
`
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { projectId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { projectId } = body
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Read queue state from DB
  const queueRow = await fetchQueueRow(supabase, projectId, user.id)
  if (!queueRow) {
    return NextResponse.json({ error: "No queue found — call /start first" }, { status: 404 })
  }

  const modelSelections: Record<string, string> = (queueRow.model_selections as Record<string, string>) ?? {}
  const queue: QueueItem[] = (queueRow.queue as unknown as QueueItem[]) ?? []

  // Determine pending items in order
  const pendingItems = queue
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.status === "pending")

  if (pendingItems.length === 0) {
    return NextResponse.json({ message: "Nothing to generate" })
  }

  // Update overall status to "running" in case it was interrupted
  await supabase
    .from("generation_queues")
    .update({ status: "running" })
    .eq("project_id", projectId)
    .eq("user_id", user.id)

  // ─── Sequential execution loop ──────────────────────────────────────────
  for (const { item, index } of pendingItems) {
    // Check for cancellation before each step
    const freshRow = await fetchQueueRow(supabase, projectId, user.id)
    if (!freshRow || freshRow.status === "cancelled") {
      console.log(`[GenerateAll] Cancelled before step "${item.docType}"`)
      break
    }

    const action = GENERATE_ALL_ACTION_MAP[item.docType]
    const model = modelSelections[item.docType]
    const creditCost = action ? getTokenCost(action, model) : item.creditCost

    // Deduct credits for this step
    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_action: action ?? item.docType,
      p_description: `${item.label} for "${project.name}" (Generate All)`,
    })

    if (!consumed) {
      // Insufficient credits — mark this item and stop
      const updatedQueue = [...(freshRow.queue as unknown as QueueItem[])]
      updatedQueue[index] = {
        ...updatedQueue[index],
        status: "error",
        stageMessage: undefined,
        error: "Insufficient credits",
      }
      await persistQueue(supabase, projectId, user.id, updatedQueue, {
        status: "error",
        current_index: index,
        error_info: { message: "Insufficient credits", docType: item.docType },
      })
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    // Mark item as "generating"
    {
      const currentRow = await fetchQueueRow(supabase, projectId, user.id)
      const mutableQueue = [...(currentRow!.queue as unknown as QueueItem[])]
      mutableQueue[index] = { ...mutableQueue[index], status: "generating", stageMessage: "Generating..." }
      await persistQueue(supabase, projectId, user.id, mutableQueue, { current_index: index })
    }

    try {
      console.log(`[GenerateAll] Running step "${item.docType}" with model "${model}"`)
      await runStep(item.docType, model, supabase, projectId, project)
      console.log(`[GenerateAll] Step "${item.docType}" completed`)

      // Mark item as "done"
      const afterRow = await fetchQueueRow(supabase, projectId, user.id)
      const doneQueue = [...(afterRow!.queue as unknown as QueueItem[])]
      doneQueue[index] = { ...doneQueue[index], status: "done", stageMessage: undefined }
      await persistQueue(supabase, projectId, user.id, doneQueue, { current_index: index + 1 })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Generation failed"
      console.error(`[GenerateAll] Step "${item.docType}" failed:`, errorMsg)

      // Refund credits for this step
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)("refund_credits", {
          p_user_id: user.id,
          p_amount: creditCost,
          p_action: action ?? item.docType,
          p_description: `${item.label} failed — credits refunded (Generate All)`,
        })
      } catch (refundErr) {
        console.error("[GenerateAll] Credit refund failed:", refundErr)
      }

      // Mark item + overall as "error"
      const errRow = await fetchQueueRow(supabase, projectId, user.id)
      const errQueue = [...(errRow!.queue as unknown as QueueItem[])]
      errQueue[index] = {
        ...errQueue[index],
        status: "error",
        stageMessage: undefined,
        error: errorMsg,
      }
      await persistQueue(supabase, projectId, user.id, errQueue, {
        status: "error",
        current_index: index,
        error_info: { message: errorMsg, docType: item.docType },
      })

      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }
  }

  // All pending steps completed — check if there are still errors or everything is done
  const finalRow = await fetchQueueRow(supabase, projectId, user.id)
  if (finalRow && finalRow.status !== "cancelled" && finalRow.status !== "error") {
    const finalQueue = (finalRow.queue as unknown as QueueItem[])
    const allDone = finalQueue.every((q) => q.status === "done" || q.status === "skipped")
    await persistQueue(supabase, projectId, user.id, finalQueue, {
      status: allDone ? "completed" : finalRow.status,
      completed_at: new Date().toISOString(),
    })
  }

  // Update project last-modified timestamp
  await supabase
    .from("projects")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", projectId)

  return NextResponse.json({ success: true })
}
