import {
  buildMockupImageProxyUrl,
  parseOpenRouterImageMockupContent,
} from "@/lib/mockups/openrouter-image-format"

export interface DashboardMockupRow {
  id: string
  project_id: string
  content: string
  created_at: string | null
}

export interface DashboardMockupPreview {
  label: "A" | "B" | "C"
  url: string
}

const FIXTURE_MODEL = "fixture/mockup-no-credit"
const FIXTURE_SVG_DATA_URL_PREFIX = "data:image/svg+xml;charset=utf-8,"
const DASHBOARD_MOCKUP_LABELS = ["A", "B", "C"] as const

function getCreatedAtTimestamp(value: string | null) {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function compareNewestFirst(left: DashboardMockupRow, right: DashboardMockupRow) {
  const timestampDifference = getCreatedAtTimestamp(right.created_at) - getCreatedAtTimestamp(left.created_at)

  return timestampDifference || right.id.localeCompare(left.id)
}

function isSafeProjectStoragePath({
  projectId,
  storagePath,
}: {
  projectId: string
  storagePath: string
}) {
  if (
    !projectId ||
    projectId.includes("/") ||
    projectId.includes("\\") ||
    projectId.includes("..") ||
    storagePath.includes("..") ||
    storagePath.includes("\\")
  ) {
    return false
  }

  const pathParts = storagePath.split("/")
  return (
    pathParts.length >= 2 &&
    pathParts[0] === projectId &&
    pathParts.slice(1).every(
      (part) => Boolean(part) && part !== "." && !/[\u0000-\u001f\u007f]/.test(part),
    )
  )
}

function getDashboardMockupOptionUrl({
  label,
  model,
  projectId,
  imageUrl,
  storagePath,
}: {
  label: DashboardMockupPreview["label"]
  model: string
  projectId: string
  imageUrl: string
  storagePath: string
}) {
  const normalizedStoragePath = storagePath.trim()

  if (model === FIXTURE_MODEL) {
    const expectedPath = `fixture/${projectId}/option-${label.toLowerCase()}-storyboard.svg`
    return normalizedStoragePath === expectedPath && imageUrl.startsWith(FIXTURE_SVG_DATA_URL_PREFIX)
      ? imageUrl
      : null
  }

  if (!isSafeProjectStoragePath({ projectId, storagePath: normalizedStoragePath })) return null
  return buildMockupImageProxyUrl({ projectId, storagePath: normalizedStoragePath })
}

export function deriveDashboardMockupPreviews({
  authorizedProjectIds,
  rows,
}: {
  authorizedProjectIds: string[]
  rows: DashboardMockupRow[]
}): Map<string, DashboardMockupPreview[]> {
  const authorizedIds = new Set(authorizedProjectIds)
  const newestRowsByProjectId = new Map<string, DashboardMockupRow>()

  for (const row of [...rows].sort(compareNewestFirst)) {
    if (!authorizedIds.has(row.project_id) || newestRowsByProjectId.has(row.project_id)) continue
    newestRowsByProjectId.set(row.project_id, row)
  }

  const previewsByProjectId = new Map<string, DashboardMockupPreview[]>()
  for (const [projectId, row] of newestRowsByProjectId) {
    const mockup = parseOpenRouterImageMockupContent(row.content)
    if (!mockup) continue

    const previews: DashboardMockupPreview[] = []
    for (const label of DASHBOARD_MOCKUP_LABELS) {
      for (const option of mockup.options) {
        if (option.label.trim().toUpperCase() !== label) continue

        const url = getDashboardMockupOptionUrl({
          label,
          model: mockup.model,
          projectId,
          imageUrl: option.imageUrl,
          storagePath: option.storagePath,
        })
        if (!url) continue

        previews.push({ label, url })
        break
      }
    }

    if (previews.length > 0) previewsByProjectId.set(projectId, previews)
  }

  return previewsByProjectId
}
