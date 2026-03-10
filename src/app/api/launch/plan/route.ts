import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let userId: string | undefined
  let projectId: string | undefined
  const creditsConsumed = 5

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    const body = await request.json()
    const { projectId: incomingProjectId, idea, name } = body
    projectId = incomingProjectId

    if (!projectId || !idea || !name) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, idea, and name are required"
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      statusCode = 404
      errorType = "not_found"
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditsConsumed,
      p_action: "launch-plan",
      p_description: `launch-plan for \"${name}\"`,
    })

    if (!consumed) {
      statusCode = 402
      errorType = "insufficient_credits"
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 402 }
      )
    }

    const content = `# Launch Plan — ${name}

## Positioning
- **Product:** ${name}
- **Who it is for:** Founders/operators looking to go from idea to build faster.
- **Core value prop:** ${idea.slice(0, 220)}${idea.length > 220 ? "..." : ""}

## Channel Priority
### Immediate (this week)
1. Product Hunt prep (tagline, one-liner, first comment draft)
2. X thread + short demo clip
3. Founder communities (curated, relevant only)

### Scheduled (next 2 weeks)
1. Show HN launch post
2. Niche directories relevant to your ICP
3. Email list + waitlist update

### Skip for MVP
- Broad paid spend before message/activation fit
- Heavy multi-channel automation without moderation

## Copy Pack (MVP)
### Product Hunt tagline
Build and ship your app idea with AI-guided docs, specs, and launch workflows.

### Short description
${name} helps turn raw ideas into build-ready plans and launch assets so teams can move from concept to customer faster.

### Founder comment template
We built ${name} to reduce the chaos between "idea" and "shipping." Looking for feedback on workflow clarity and launch readiness.

## 14-Day Execution Checklist
- [ ] Finalize positioning + one-liner
- [ ] Prepare launch assets (logo, screenshots, demo)
- [ ] Publish launch post + founder comment
- [ ] Track signups, activation, and feedback themes
- [ ] Ship one improvement from launch feedback within 48h
`

    await supabase.from("analyses").insert({
      project_id: projectId,
      type: "launch-plan",
      content,
      metadata: {
        source: "inhouse",
        model: "heuristic-launch-mvp-v1",
        generated_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({ content, type: "launch-plan", source: "inhouse" })
  } catch (error) {
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json({ error: "Failed to generate launch plan." }, { status: 500 })
  } finally {
    if (userId) {
      trackAPIMetrics({
        endpoint: "/api/launch/plan",
        method: "POST",
        featureType: "analysis",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed: statusCode === 200 ? creditsConsumed : 0,
        errorType,
        errorMessage,
      })
    }
  }
}
