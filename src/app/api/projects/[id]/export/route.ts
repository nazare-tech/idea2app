import { NextResponse } from "next/server"

import {
  AI_PROMPT_FILE_PLACEHOLDERS,
  buildAiPromptFiles,
} from "@/lib/ai-prompt-files"
import { buildRequestLogContext, logError, logWarn } from "@/lib/logger"
import {
  getImageFileExtension,
  PROJECT_EXPORT_MAX_IMAGE_BYTES,
  PROJECT_EXPORT_MAX_TEXT_BYTES,
  PROJECT_EXPORT_MAX_TOTAL_BYTES,
  buildExportMarkdown,
  buildProjectBriefMarkdown,
  buildProjectExportNames,
  buildProjectExportReadme,
  isValidProjectExportMockupPath,
  type ProjectExportMetadata,
} from "@/lib/project-export"
import {
  isValidDraftMockupImagePath,
  parseOpenRouterImageMockupContent,
} from "@/lib/mockups/openrouter-image-format"
import { MOCKUP_STORAGE_BUCKET } from "@/lib/mockups/storage"
import { extractSectionsByHeading } from "@/lib/planning-document-parser"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createZipArchiveStream, type ZipEntry } from "@/lib/zip"

export const runtime = "nodejs"
export const maxDuration = 300

type ArtifactResult<T> = {
  data: T | null
  error: { message: string } | null
}

function resultWarning(label: string, result: ArtifactResult<unknown>, warnings: string[]) {
  if (result.error) warnings.push(`${label} could not be loaded and was omitted.`)
}

function getStorageRunId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  const storageRunId = (metadata as Record<string, unknown>).storage_run_id
  return typeof storageRunId === "string" && storageRunId.trim()
    ? storageRunId.trim()
    : null
}

function getLatestSourceDate(...values: Array<string | null | undefined>) {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => Number.isFinite(date.getTime()))
  if (dates.length === 0) return undefined
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestLogContext = buildRequestLogContext(request)
  const { id: projectId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logWarn("ProjectExport", "unauthorized", { ...requestLogContext, projectId })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const logContext = { ...requestLogContext, userId: user.id, projectId }
  const [userRateLimit, ipRateLimit] = await Promise.all([
    checkRateLimit({
      key: `project-export:user:${user.id}`,
      limit: 10,
      windowMs: 60_000,
    }),
    checkRateLimit({
      key: `project-export:ip:${getClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    }),
  ])
  if (userRateLimit.limited || ipRateLimit.limited) {
    return NextResponse.json(
      { error: "Too many exports. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(
            userRateLimit.retryAfterSeconds,
            ipRateLimit.retryAfterSeconds,
          )),
        },
      },
    )
  }

  try {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description, created_at, updated_at")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (projectError) {
      logError("ProjectExport", "project_lookup_failed", projectError, logContext)
      return NextResponse.json({ error: "Unable to load project" }, { status: 500 })
    }
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const [intakeResult, marketResult, productPlanResult, firstVersionResult, mockupResult] = await Promise.all([
      supabase
        .from("project_intakes")
        .select("original_idea, generated_summary, questions_json, answers_json, updated_at")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("analyses")
        .select("content, created_at")
        .eq("project_id", projectId)
        .eq("type", "competitive-analysis")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("prds")
        .select("content, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("mvp_plans")
        .select("content, created_at, updated_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("mockups")
        .select("content, metadata, created_at, updated_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const exportedAt = new Date()
    const modifiedAt = new Date(project.updated_at ?? project.created_at ?? exportedAt)
    const metadata: ProjectExportMetadata = {
      projectName: project.name,
      projectId,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      exportedAt,
    }
    const { archiveName, rootDirectory } = buildProjectExportNames(project.name, exportedAt)
    const entries: ZipEntry[] = []
    const includedPaths: string[] = []
    const missingArtifacts: string[] = []
    const warnings: string[] = []
    let totalBytes = 0

    resultWarning("Project intake", intakeResult, warnings)
    resultWarning("Market Research", marketResult, warnings)
    resultWarning("Product Plan", productPlanResult, warnings)
    resultWarning("First Version Plan", firstVersionResult, warnings)
    resultWarning("Design Mockups", mockupResult, warnings)

    const addTextFile = (
      relativePath: string,
      content: string,
      sourceDate?: string | null,
      enforceLimits = true,
    ) => {
      const date = sourceDate ? new Date(sourceDate) : modifiedAt
      const data = new TextEncoder().encode(content)
      if (enforceLimits && data.byteLength > PROJECT_EXPORT_MAX_TEXT_BYTES) {
        warnings.push(`${relativePath} exceeded the per-document export limit and was omitted.`)
        return
      }
      if (enforceLimits && totalBytes + data.byteLength > PROJECT_EXPORT_MAX_TOTAL_BYTES) {
        warnings.push(`${relativePath} exceeded the total export limit and was omitted.`)
        return
      }
      entries.push({
        path: `${rootDirectory}/${relativePath}`,
        data,
        modifiedAt: Number.isFinite(date.getTime()) ? date : modifiedAt,
      })
      includedPaths.push(relativePath)
      totalBytes += data.byteLength
    }

    addTextFile(
      "documents/project-brief.md",
      buildProjectBriefMarkdown(
        metadata,
        intakeResult.data
          ? {
              originalIdea: intakeResult.data.original_idea,
              generatedSummary: intakeResult.data.generated_summary,
              questions: intakeResult.data.questions_json,
              answers: intakeResult.data.answers_json,
            }
          : null,
        project.description,
      ),
      intakeResult.data?.updated_at,
    )

    const textArtifacts = [
      {
        content: marketResult.data?.content,
        sourceDate: marketResult.data?.created_at,
        error: marketResult.error,
        title: "Market Research",
        artifactType: "market-research",
        relativePath: "documents/market-research.md",
      },
      {
        content: productPlanResult.data?.content,
        sourceDate: productPlanResult.data?.created_at,
        error: productPlanResult.error,
        title: "Product Plan",
        artifactType: "product-plan",
        relativePath: "documents/product-plan.md",
      },
      {
        content: firstVersionResult.data?.content,
        sourceDate: firstVersionResult.data?.updated_at ?? firstVersionResult.data?.created_at,
        error: firstVersionResult.error,
        title: "First Version Plan",
        artifactType: "first-version-plan",
        relativePath: "documents/first-version-plan.md",
      },
    ]

    for (const artifact of textArtifacts) {
      if (artifact.content?.trim()) {
        addTextFile(
          artifact.relativePath,
          buildExportMarkdown({
            title: artifact.title,
            artifactType: artifact.artifactType,
            content: artifact.content,
            metadata,
            sourceUpdatedAt: artifact.sourceDate,
          }),
          artifact.sourceDate,
        )
      } else if (!artifact.error) {
        missingArtifacts.push(`${artifact.title} has not been generated.`)
      }
    }

    const promptFiles = buildAiPromptFiles({
      prdSections: extractSectionsByHeading(productPlanResult.data?.content ?? "", 2),
      mvpSections: extractSectionsByHeading(firstVersionResult.data?.content ?? "", 2),
    })
    const productPlanPromptFiles = new Set([
      "functional-requirements.md",
      "user-stories-and-acceptance-criteria.md",
      "technical-considerations.md",
      "sub-agents.md",
    ])
    const productPlanDate = productPlanResult.data?.created_at
    const firstVersionDate = firstVersionResult.data?.updated_at ?? firstVersionResult.data?.created_at
    const combinedPlanDate = getLatestSourceDate(productPlanDate, firstVersionDate)
    for (const promptFile of promptFiles) {
      const promptSourceDate = productPlanPromptFiles.has(promptFile.fileName)
        ? productPlanDate
        : promptFile.fileName === "project-context.md"
          ? combinedPlanDate
          : firstVersionDate
      addTextFile(
        `prompts/${promptFile.fileName}`,
        buildExportMarkdown({
          title: promptFile.title,
          artifactType: "ai-prompt",
          content: promptFile.content,
          metadata,
          sourceUpdatedAt: promptSourceDate,
        }),
        promptSourceDate,
      )
    }
    const exportedPromptFileNames = new Set(promptFiles.map((file) => file.fileName))
    for (const expectedPromptFile of AI_PROMPT_FILE_PLACEHOLDERS) {
      if (!exportedPromptFileNames.has(expectedPromptFile.fileName)) {
        missingArtifacts.push(`${expectedPromptFile.fileName} could not be derived from the current planning documents.`)
      }
    }

    const parsedMockup = mockupResult.data?.content
      ? parseOpenRouterImageMockupContent(mockupResult.data.content)
      : null
    if (!mockupResult.error && !parsedMockup) {
      missingArtifacts.push("Finalized Design Mockups have not been generated.")
    }

    if (parsedMockup) {
      const storageSupabase = createServiceClient()
      const storageRunId = getStorageRunId(mockupResult.data?.metadata)
      const downloadedMockups = await Promise.all(parsedMockup.options.map(async (option, index) => {
        const path = option.storagePath
        if (
          !storageRunId ||
          !isValidProjectExportMockupPath(projectId, path) ||
          !isValidDraftMockupImagePath({ projectId, storagePath: path, draftRunId: storageRunId })
        ) {
          return { index, warning: `Mockup Concept ${index + 1} had no valid finalized image and was omitted.` }
        }

        const { data: blob, error } = await storageSupabase.storage
          .from(MOCKUP_STORAGE_BUCKET)
          .download(path)
        if (error || !blob) {
          return { index, warning: `Mockup Concept ${index + 1} could not be downloaded and was omitted.` }
        }

        const contentType = blob.type || option.contentType
        const extension = getImageFileExtension(contentType, path)
        if (!extension) {
          return { index, warning: `Mockup Concept ${index + 1} used an unsupported image format and was omitted.` }
        }

        const bytes = new Uint8Array(await blob.arrayBuffer())
        if (bytes.byteLength > PROJECT_EXPORT_MAX_IMAGE_BYTES) {
          return { index, warning: `Mockup Concept ${index + 1} exceeded the per-image export limit and was omitted.` }
        }

        return { index, bytes, extension }
      }))

      for (const downloaded of downloadedMockups) {
        if (downloaded.warning) {
          warnings.push(downloaded.warning)
          continue
        }
        const { bytes, extension, index } = downloaded
        if (!bytes || !extension) continue
        if (totalBytes + bytes.byteLength > PROJECT_EXPORT_MAX_TOTAL_BYTES) {
          warnings.push(`Mockup Concept ${index + 1} exceeded the total export limit and was omitted.`)
          continue
        }

        const relativePath = `mockups/concept-${index + 1}.${extension}`
        entries.push({
          path: `${rootDirectory}/${relativePath}`,
          data: bytes,
          modifiedAt: new Date(mockupResult.data?.updated_at ?? mockupResult.data?.created_at ?? exportedAt),
        })
        includedPaths.push(relativePath)
        totalBytes += bytes.byteLength
      }
    }

    const readmePath = "README.md"
    addTextFile(
      readmePath,
      buildProjectExportReadme({
        ...metadata,
        includedPaths: [readmePath, ...includedPaths],
        missingArtifacts,
        warnings,
      }),
      project.updated_at,
      false,
    )

    return new Response(createZipArchiveStream(entries), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archiveName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    logError("ProjectExport", "export_failed", error, logContext)
    return NextResponse.json({ error: "Unable to export project" }, { status: 500 })
  }
}
