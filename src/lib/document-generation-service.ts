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
  COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP,
} from "@/lib/competitive-analysis-v2"
import { linkifyBareUrls } from "@/lib/markdown-links"
import { cleanupAbandonedMockupOptionDrafts, deleteMockupOptionDrafts, upsertMockupOptionDraft } from "@/lib/mockup-option-drafts"
import { generateOpenRouterImageMockup } from "@/lib/openrouter-image-mockup-pipeline"
import { getProjectIntakeContextForAi } from "@/lib/project-intake-context"
import { createServiceClient } from "@/lib/supabase/service"
import type { Database, Json } from "@/types/database"
import {
  findLatestActiveDocument,
  getActiveDocumentIdentityForDocumentType,
} from "@/lib/active-document-policy"
import { logError, logInfo, type LogContext } from "@/lib/logger"

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
  userId?: string | null
  runId?: string | null
  logContext?: LogContext
}

export interface GeneratedProjectDocument {
  outputTable: string
  outputId: string
  skippedExisting?: boolean
}

function buildAnalysisMetadata(
  type: string,
  result: { source: string; model: string; metadata?: { [key: string]: Json | undefined } },
): AnalysisMetadata {
  const metadata: { [key: string]: Json | undefined } = {
    source: result.source,
    model: result.model,
    generated_at: new Date().toISOString(),
    ...(result.metadata ?? {}),
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
  userId,
  runId,
  logContext = {},
}: GenerateProjectDocumentInput): Promise<GeneratedProjectDocument | null> {
  const baseLogContext = { ...logContext, projectId, docType, modelId }
  logInfo("DocumentGeneration", "started", baseLogContext)

  try {
    const identity = getActiveDocumentIdentityForDocumentType(docType)
    if (identity) {
      const existing = await findLatestActiveDocument(supabase, projectId, identity)
      if (existing) {
        logInfo("DocumentGeneration", "skipped_existing", {
          ...baseLogContext,
          outputTable: existing.outputTable,
          outputId: existing.outputId,
        })
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
      return logGeneratedOutput(
        requireGeneratedOutput(data, error, "analyses"),
        baseLogContext,
      )
    } else if (docType === "prd") {
      const { data: analysisRow } = await supabase
        .from("analyses")
        .select("content")
        .eq("project_id", projectId)
        .eq("type", "competitive-analysis")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      logInfo("DocumentGeneration", "upstream_loaded", {
        ...baseLogContext,
        upstreamDocType: "competitive",
        hasContent: Boolean(analysisRow?.content),
      })
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
      return logGeneratedOutput(
        requireGeneratedOutput(data, error, "prds"),
        baseLogContext,
      )
    } else if (docType === "mvp") {
      const { data: prdRow } = await supabase
        .from("prds")
        .select("content")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      logInfo("DocumentGeneration", "upstream_loaded", {
        ...baseLogContext,
        upstreamDocType: "prd",
        hasContent: Boolean(prdRow?.content),
      })
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
      return logGeneratedOutput(
        requireGeneratedOutput(data, error, "mvp_plans"),
        baseLogContext,
      )
    } else if (docType === "mockups") {
      const { data: mvpRow } = await supabase
        .from("mvp_plans")
        .select("content")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      logInfo("DocumentGeneration", "upstream_loaded", {
        ...baseLogContext,
        upstreamDocType: "mvp",
        hasContent: Boolean(mvpRow?.content),
      })
      if (userId) {
        try {
          const cleanupSummary = await cleanupAbandonedMockupOptionDrafts({
            supabase,
            projectId,
            userId,
            excludeRunId: runId ?? undefined,
          })
          if (cleanupSummary.rowCount > 0) {
            logInfo("DocumentGeneration", "abandoned_mockup_drafts_cleaned", {
              ...baseLogContext,
              ...cleanupSummary,
            })
          }
        } catch (cleanupError) {
          logError("DocumentGeneration", "abandoned_mockup_draft_cleanup_failed", cleanupError, baseLogContext)
        }
      }
      const result = await generateOpenRouterImageMockup({
        mvpPlan: mvpRow?.content ?? `First Version Plan for ${name}: ${idea}`,
        projectName: name,
        projectId,
        runId: runId ?? undefined,
        onOptionGenerated: userId
          ? (payload) =>
              upsertMockupOptionDraft({
                supabase,
                projectId,
                userId,
                runId: payload.runId,
                option: payload.option,
                model: payload.model,
                designPlan: payload.designPlan,
              })
          : undefined,
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
      if (!error && data?.id && userId) {
        try {
          await deleteMockupOptionDrafts({
            supabase,
            storageSupabase: createServiceClient(),
            projectId,
            userId,
            runId: result.runId,
            deleteStorageObjects: true,
          })
        } catch (cleanupError) {
          logError("DocumentGeneration", "mockup_draft_cleanup_failed", cleanupError, baseLogContext)
        }
      }
      return logGeneratedOutput(
        requireGeneratedOutput(data, error, "mockups"),
        baseLogContext,
      )
    } else if (docType === "techspec") {
      const { data: prdRow } = await supabase
        .from("prds")
        .select("content")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      logInfo("DocumentGeneration", "upstream_loaded", {
        ...baseLogContext,
        upstreamDocType: "prd",
        hasContent: Boolean(prdRow?.content),
      })
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
      return logGeneratedOutput(
        requireGeneratedOutput(data, error, "tech_specs"),
        baseLogContext,
      )
    }

    logInfo("DocumentGeneration", "unsupported_doc_type", baseLogContext)
    return null
  } catch (error) {
    logError("DocumentGeneration", "failed", error, baseLogContext)
    throw error
  }
}

function logGeneratedOutput(
  output: GeneratedProjectDocument,
  context: LogContext,
): GeneratedProjectDocument {
  logInfo("DocumentGeneration", "saved", {
    ...context,
    outputTable: output.outputTable,
    outputId: output.outputId,
  })
  return output
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
