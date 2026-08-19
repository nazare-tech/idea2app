import { summarizeIntakeAnswers } from "@/lib/intake/summary"
import type { IntakeAnswer, IntakeQuestion } from "@/lib/intake/types"

export const PROJECT_EXPORT_MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const PROJECT_EXPORT_MAX_TEXT_BYTES = 10 * 1024 * 1024
export const PROJECT_EXPORT_MAX_TOTAL_BYTES = 80 * 1024 * 1024

export interface ProjectExportMetadata {
  projectName: string
  projectId: string
  createdAt?: string | null
  updatedAt?: string | null
  exportedAt: Date
}

export interface ProjectExportIntake {
  originalIdea?: string | null
  generatedSummary?: string | null
  questions?: unknown
  answers?: unknown
}

export interface ProjectExportManifestInput extends ProjectExportMetadata {
  includedPaths: string[]
  missingArtifacts: string[]
  warnings: string[]
}

function safeDate(value: string | null | undefined) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

function yamlString(value: string) {
  return JSON.stringify(value)
}

function frontMatter({
  title,
  artifactType,
  metadata,
  sourceUpdatedAt,
}: {
  title: string
  artifactType: string
  metadata: ProjectExportMetadata
  sourceUpdatedAt?: string | null
}) {
  const lines = [
    "---",
    `title: ${yamlString(title)}`,
    `artifact_type: ${yamlString(artifactType)}`,
    `project: ${yamlString(metadata.projectName)}`,
    `project_id: ${yamlString(metadata.projectId)}`,
    `exported_at: ${yamlString(metadata.exportedAt.toISOString())}`,
  ]
  const createdAt = safeDate(metadata.createdAt)
  const updatedAt = safeDate(sourceUpdatedAt ?? metadata.updatedAt)
  if (createdAt) lines.push(`project_created_at: ${yamlString(createdAt)}`)
  if (updatedAt) lines.push(`source_updated_at: ${yamlString(updatedAt)}`)
  lines.push("---", "")
  return lines.join("\n")
}

function isIntakeQuestion(value: unknown): value is IntakeQuestion {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<IntakeQuestion>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.question === "string" &&
    Array.isArray(candidate.options) &&
    candidate.options.every((option) => Boolean(
      option &&
      typeof option === "object" &&
      typeof option.id === "string" &&
      typeof option.label === "string",
    ))
  )
}

function isIntakeAnswer(value: unknown): value is IntakeAnswer {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Partial<IntakeAnswer>).questionId === "string",
  )
}

function normalizeMarkdownBody(content: string) {
  return `${content.trim()}\n`
}

export function slugifyExportName(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "")
  return slug || "project"
}

export function buildProjectExportNames(projectName: string, exportedAt: Date) {
  const projectSlug = slugifyExportName(projectName)
  const date = exportedAt.toISOString().slice(0, 10)
  return {
    archiveName: `${projectSlug}-export-${date}.zip`,
    rootDirectory: projectSlug,
  }
}

export function buildExportMarkdown({
  title,
  artifactType,
  content,
  metadata,
  sourceUpdatedAt,
}: {
  title: string
  artifactType: string
  content: string
  metadata: ProjectExportMetadata
  sourceUpdatedAt?: string | null
}) {
  return `${frontMatter({ title, artifactType, metadata, sourceUpdatedAt })}${normalizeMarkdownBody(content)}`
}

export function buildProjectBriefMarkdown(
  metadata: ProjectExportMetadata,
  intake: ProjectExportIntake | null,
  fallbackDescription?: string | null,
) {
  const originalIdea = intake?.originalIdea?.trim() || fallbackDescription?.trim() || "Not available."
  const summary = intake?.generatedSummary?.trim() || fallbackDescription?.trim()
  const questions = Array.isArray(intake?.questions)
    ? intake.questions.filter(isIntakeQuestion)
    : []
  const answers = Array.isArray(intake?.answers)
    ? intake.answers.filter(isIntakeAnswer)
    : []
  const answerItems = summarizeIntakeAnswers(questions, answers).filter((item) => item.answer)
  const sections = [
    `# ${metadata.projectName}`,
    "",
    "## Original Idea",
    "",
    originalIdea,
  ]

  if (summary && summary !== originalIdea) {
    sections.push("", "## Generated Summary", "", summary)
  }

  if (answerItems.length > 0) {
    sections.push("", "## Intake Questions and Answers", "")
    for (const item of answerItems) {
      sections.push(`### ${item.question}`, "", item.answer, "")
    }
  }

  return buildExportMarkdown({
    title: metadata.projectName,
    artifactType: "project-brief",
    content: sections.join("\n").trim(),
    metadata,
    sourceUpdatedAt: metadata.updatedAt,
  })
}

export function getImageFileExtension(contentType: string, storagePath: string) {
  const normalized = contentType.toLowerCase().split(";", 1)[0]?.trim()
  if (normalized === "image/jpeg") return "jpg"
  if (normalized === "image/png") return "png"
  if (normalized === "image/webp") return "webp"
  if (normalized && normalized !== "application/octet-stream") return null

  const pathExtension = storagePath.toLowerCase().match(/\.(png|jpe?g|webp)$/)?.[1]
  if (pathExtension === "jpeg") return "jpg"
  return pathExtension ?? null
}

export function isValidProjectExportMockupPath(projectId: string, storagePath: string) {
  if (
    !projectId ||
    projectId.includes("/") ||
    projectId.includes("\\") ||
    projectId.includes("\0")
  ) {
    return false
  }

  if (!storagePath || storagePath.includes("\\") || storagePath.includes("\0")) return false
  const parts = storagePath.split("/")
  return (
    parts.length >= 2 &&
    parts[0] === projectId &&
    parts.slice(1).every((part) => part.length > 0 && part !== "." && part !== "..")
  )
}

export function buildProjectExportReadme(input: ProjectExportManifestInput) {
  const lines = [
    frontMatter({
      title: `${input.projectName} Export`,
      artifactType: "export-manifest",
      metadata: input,
      sourceUpdatedAt: input.updatedAt,
    }).trimEnd(),
    `# ${input.projectName} Export`,
    "",
    `Exported ${input.exportedAt.toISOString()}.`,
    "",
    "## Included Files",
    "",
    ...input.includedPaths.map((path) => `- \`${path}\``),
  ]

  if (input.missingArtifacts.length > 0) {
    lines.push(
      "",
      "## Missing Artifacts",
      "",
      ...input.missingArtifacts.map((artifact) => `- ${artifact}`),
    )
  }

  if (input.warnings.length > 0) {
    lines.push(
      "",
      "## Export Warnings",
      "",
      ...input.warnings.map((warning) => `- ${warning}`),
    )
  }

  return `${lines.join("\n").trim()}\n`
}
