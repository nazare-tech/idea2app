import { buildProjectExportNames } from "@/lib/project-export"
import type { ProjectExportFailureKind } from "@/lib/product-analytics/contracts"

const PROJECT_EXPORT_TIMEOUT_MS = 5 * 60_000

export class ProjectExportError extends Error {
  constructor(message: string, readonly kind: ProjectExportFailureKind) {
    super(message)
    this.name = "ProjectExportError"
  }
}

export function getAttachmentFileName(header: string | null) {
  const match = header?.match(/(?:^|;)\s*filename="?([^";]+)"?/i)
  const fileName = match?.[1]?.trim()
  if (
    !fileName ||
    fileName.length > 180 ||
    !fileName.toLowerCase().endsWith(".zip") ||
    /[\\/\u0000-\u001f\u007f]/.test(fileName)
  ) {
    return null
  }
  return fileName
}

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json() as { error?: unknown }
    return typeof body.error === "string" && body.error.trim()
      ? body.error
      : "Unable to export project."
  } catch {
    return "Unable to export project."
  }
}

export async function downloadProjectExport({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PROJECT_EXPORT_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`/api/projects/${projectId}/export`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
  } catch {
    throw new ProjectExportError(
      controller.signal.aborted
        ? "Project export took too long. Please try again."
        : "Unable to reach the export service. Please try again.",
      "request",
    )
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new ProjectExportError(await getErrorMessage(response), "request")
  }
  if (response.headers.get("content-type")?.split(";", 1)[0] !== "application/zip") {
    throw new ProjectExportError("Export service returned an invalid archive.", "archive")
  }

  let blob: Blob
  try {
    blob = await response.blob()
  } catch {
    throw new ProjectExportError("Export archive could not be read. Please try again.", "archive")
  }
  if (blob.size === 0) {
    throw new ProjectExportError("Export archive was empty. Please try again.", "archive")
  }

  const fallbackName = buildProjectExportNames(projectName, new Date()).archiveName
  const fileName = getAttachmentFileName(response.headers.get("content-disposition")) ?? fallbackName
  const url = URL.createObjectURL(blob)
  let anchor: HTMLAnchorElement | null = null
  try {
    anchor = document.createElement("a")
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
  } catch {
    URL.revokeObjectURL(url)
    throw new ProjectExportError("Browser could not start the download. Please try again.", "download")
  } finally {
    anchor?.remove()
  }

  // Some browsers resolve blob URLs asynchronously after the synthetic click.
  // Keep it alive long enough for the download manager to claim the bytes.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)

  return fileName
}
