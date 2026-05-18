import type { SupabaseClient } from "@supabase/supabase-js"

import {
  runCompetitiveAnalysis,
  runLaunchPlan,
  runMVPPlan,
  runPRD,
  runTechSpec,
} from "@/lib/analysis-pipelines"
import {
  COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
  COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION,
  COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP,
} from "@/lib/competitive-analysis-v2"
import { linkifyBareUrls } from "@/lib/markdown-links"
import { generateOpenRouterImageMockup } from "@/lib/openrouter-image-mockup-pipeline"
import { getProjectIntakeContextForAi } from "@/lib/project-intake-context"
import type { Database, Json } from "@/types/database"
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
  const metadata: { [key: string]: Json | undefined } = {
    source: result.source,
    model: result.model,
    generated_at: new Date().toISOString(),
  }

  if (type === "competitive-analysis") {
    metadata.document_version = COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION
    metadata.prompt_version = COMPETITIVE_ANALYSIS_V2_PROMPT_VERSION
    metadata.workspace_section_map = {
      ...COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP,
    }
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
    const result = await generateOpenRouterImageMockup({
      mvpPlan: mvpRow?.content ?? `First Version Plan for ${name}: ${idea}`,
      projectName: name,
      projectId,
    })
    const { data, error } = await supabase
      .from("mockups")
      .insert({
        project_id: projectId,
        content: result.content,
        model_used: result.model,
        metadata: result.metadata,
      })
      .select("id")
      .single()
    return requireGeneratedOutput(data, error, "mockups")
  } else if (docType === "launch") {
    const result = await runLaunchPlan({
      idea,
      name,
      model: modelId,
      brief: {
        targetAudience: "Early adopters and tech-savvy users",
        stage: "Pre-launch",
        budget: "Bootstrap / Lean",
        channels: "Product Hunt, X, Show HN, Founder communities, Email/waitlist",
        launchWindow: "Next 30 days",
      },
    })
    const content = linkifyBareUrls(result.content)
    const { data, error } = await supabase
      .from("analyses")
      .insert({
        project_id: projectId,
        type: "launch-plan",
        content,
        metadata: { source: result.source, model: result.model, generated_at: new Date().toISOString() },
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
