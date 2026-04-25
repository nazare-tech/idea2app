import type { SupabaseClient } from "@supabase/supabase-js"

import {
  runCompetitiveAnalysis,
  runMVPPlan,
  runPRD,
  runTechSpec,
} from "@/lib/analysis-pipelines"
import {
  COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
  COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION,
} from "@/lib/competitive-analysis-v2"
import { linkifyBareUrls } from "@/lib/markdown-links"
import { getProjectIntakeContextForAi } from "@/lib/project-intake-context"
import { generateStitchMockup } from "@/lib/stitch-pipeline"
import type { Database } from "@/types/database"
import {
  findLatestActiveDocument,
  getActiveDocumentIdentityForDocumentType,
} from "@/lib/active-document-policy"

type ServerSupabaseClient = SupabaseClient<Database>

type AnalysisMetadata = Database["public"]["Tables"]["analyses"]["Insert"]["metadata"]
type InsertError = { message: string } | null

export interface DocumentGenerationProject {
  description: string
  name: string
}

export interface GenerateProjectDocumentInput {
  docType: string
  modelId?: string
  supabase: ServerSupabaseClient
  projectId: string
  project: DocumentGenerationProject
}

export interface GeneratedProjectDocument {
  outputTable: string
  outputId: string
  skippedExisting?: boolean
}

function buildAnalysisMetadata(
  type: string,
  result: { source: string; model: string },
): AnalysisMetadata {
  const metadata: Record<string, string> = {
    source: result.source,
    model: result.model,
    generated_at: new Date().toISOString(),
  }

  if (type === "competitive-analysis") {
    metadata.document_version = COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION
    metadata.prompt_version = COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION
  }

  return metadata
}

export async function generateProjectDocument({
  docType,
  modelId,
  supabase,
  projectId,
  project,
}: GenerateProjectDocumentInput): Promise<GeneratedProjectDocument | null> {
  const identity = getActiveDocumentIdentityForDocumentType(docType)
  if (identity) {
    const existing = await findLatestActiveDocument(supabase, projectId, identity)
    if (existing) {
      return {
        outputTable: existing.outputTable,
        outputId: existing.outputId,
        skippedExisting: true,
      }
    }
  }

  const idea = await getProjectIntakeContextForAi(
    supabase,
    projectId,
    project.description,
  )
  const name = project.name

  if (docType === "competitive") {
    const result = await runCompetitiveAnalysis({ idea, name, model: modelId })
    const content = linkifyBareUrls(result.content)
    const { data, error } = await supabase
      .from("analyses")
      .insert({
        project_id: projectId,
        type: "competitive-analysis",
        content,
        metadata: buildAnalysisMetadata("competitive-analysis", result),
      })
      .select("id")
      .single()
    return requireGeneratedOutput(data, error, "analyses")
  } else if (docType === "prd") {
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
    const { data, error } = await supabase
      .from("prds")
      .insert({ project_id: projectId, content })
      .select("id")
      .single()
    return requireGeneratedOutput(data, error, "prds")
  } else if (docType === "mvp") {
    const { data: prdRow } = await supabase
      .from("prds")
      .select("content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const result = await runMVPPlan({
      idea,
      name,
      prd: prdRow?.content,
      model: modelId,
    })
    const content = linkifyBareUrls(result.content)
    const { data, error } = await supabase
      .from("mvp_plans")
      .insert({ project_id: projectId, content })
      .select("id")
      .single()
    return requireGeneratedOutput(data, error, "mvp_plans")
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
    const { data, error } = await supabase
      .from("mockups")
      .insert({
        project_id: projectId,
        content,
        model_used: "stitch",
        metadata: { source: "stitch", generated_at: new Date().toISOString() },
      })
      .select("id")
      .single()
    return requireGeneratedOutput(data, error, "mockups")
  } else if (docType === "launch") {
    const channels = [
      "Product Hunt",
      "X",
      "Show HN",
      "Founder communities",
      "Email/waitlist",
    ]
    const content = buildLaunchPlanContent(name, idea, {
      targetAudience: "Early adopters and tech-savvy users",
      stage: "Pre-launch",
      budget: "Bootstrap / Lean",
      channels: channels.join(", "),
      launchWindow: "Next 30 days",
    })
    const { data, error } = await supabase
      .from("analyses")
      .insert({
        project_id: projectId,
        type: "launch-plan",
        content,
        metadata: { source: "inhouse", generated_at: new Date().toISOString() },
      })
      .select("id")
      .single()
    return requireGeneratedOutput(data, error, "analyses")
  } else if (docType === "techspec") {
    const { data: prdRow } = await supabase
      .from("prds")
      .select("content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const result = await runTechSpec({
      idea,
      name,
      prd: prdRow?.content,
      model: modelId,
    })
    const content = linkifyBareUrls(result.content)
    const { data, error } = await supabase
      .from("tech_specs")
      .insert({ project_id: projectId, content })
      .select("id")
      .single()
    return requireGeneratedOutput(data, error, "tech_specs")
  }

  return null
}

function requireGeneratedOutput(
  data: { id?: string } | null,
  error: InsertError,
  outputTable: string,
): GeneratedProjectDocument {
  if (error) {
    throw new Error(`Failed to save generated document to ${outputTable}: ${error.message}`)
  }

  if (!data?.id) {
    throw new Error(`Failed to save generated document to ${outputTable}: missing output id`)
  }

  return { outputTable, outputId: data.id }
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
  const channels = brief.channels
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
  const immediateChannels = channels.slice(0, 3)
  const scheduledChannels = channels.slice(3)

  return `# Marketing Plan: ${name}

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
