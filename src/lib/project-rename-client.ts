import { validateProjectName } from "@/lib/project-name"

const RENAME_FAILURE_MESSAGE = "Unable to rename project. Please try again."
const DEFAULT_RENAME_TIMEOUT_MS = 15_000

interface RequestProjectRenameOptions {
  projectId: string
  draft: unknown
  fetcher?: typeof fetch
  timeoutMs?: number
}

export async function requestProjectRename({
  projectId,
  draft,
  fetcher = fetch,
  timeoutMs = DEFAULT_RENAME_TIMEOUT_MS,
}: RequestProjectRenameOptions): Promise<string> {
  const validation = validateProjectName(draft)
  if (!validation.ok) {
    throw new Error(validation.error)
  }

  let response: Response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    response = await fetcher(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: validation.name }),
      signal: controller.signal,
    })
  } catch {
    throw new Error(RENAME_FAILURE_MESSAGE)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(RENAME_FAILURE_MESSAGE)
  }

  try {
    const result = await response.json() as { data?: { name?: unknown } }
    const persistedName = validateProjectName(result.data?.name)
    if (!persistedName.ok) {
      throw new Error(RENAME_FAILURE_MESSAGE)
    }
    return persistedName.name
  } catch (error) {
    if (error instanceof Error && error.message === RENAME_FAILURE_MESSAGE) {
      throw error
    }
    throw new Error(RENAME_FAILURE_MESSAGE)
  }
}
