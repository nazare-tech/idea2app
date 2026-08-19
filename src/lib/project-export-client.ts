import { buildProjectExportNames } from "@/lib/project-export"

export type ProjectExportFailureKind = "request" | "archive" | "download"

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
  let response: Response
  try {
    response = await fetch(`/api/projects/${projectId}/export`, {
      credentials: "same-origin",
    })
  } catch {
    throw new ProjectExportError("Unable to reach the export service. Please try again.", "request")
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
  try {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } catch {
    throw new ProjectExportError("Browser could not start the download. Please try again.", "download")
  } finally {
    URL.revokeObjectURL(url)
  }

  return fileName
}
