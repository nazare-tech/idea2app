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

const FIXTURE_MODEL = "fixture/mockup-no-credit"
const FIXTURE_SVG_DATA_URL_PREFIX = "data:image/svg+xml;charset=utf-8,"

function getCreatedAtTimestamp(value: string | null) {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function compareNewestFirst(left: DashboardMockupRow, right: DashboardMockupRow) {
  const timestampDifference = getCreatedAtTimestamp(right.created_at) - getCreatedAtTimestamp(left.created_at)

  return timestampDifference || right.id.localeCompare(left.id)
}

export function deriveDashboardMockupThumbnailUrls({
  authorizedProjectIds,
  rows,
}: {
  authorizedProjectIds: string[]
  rows: DashboardMockupRow[]
}) {
  const authorizedIds = new Set(authorizedProjectIds)
  const newestRowsByProjectId = new Map<string, DashboardMockupRow>()

  for (const row of [...rows].sort(compareNewestFirst)) {
    if (!authorizedIds.has(row.project_id) || newestRowsByProjectId.has(row.project_id)) continue
    newestRowsByProjectId.set(row.project_id, row)
  }

  const thumbnailUrls = new Map<string, string>()
  for (const [projectId, row] of newestRowsByProjectId) {
    const mockup = parseOpenRouterImageMockupContent(row.content)
    const optionA = mockup?.options.find(
      (option) => option.label.trim().toUpperCase() === "A",
    )
    const storagePath = optionA?.storagePath.trim()

    // The no-credit fixture is a controlled local SVG and is intentionally not uploaded.
    if (
      mockup?.model === FIXTURE_MODEL &&
      storagePath === `fixture/${projectId}/option-a-storyboard.svg` &&
      optionA?.imageUrl.startsWith(FIXTURE_SVG_DATA_URL_PREFIX)
    ) {
      thumbnailUrls.set(projectId, optionA.imageUrl)
      continue
    }

    if (!storagePath || !storagePath.startsWith(`${projectId}/`) || storagePath.includes("..")) continue

    thumbnailUrls.set(projectId, buildMockupImageProxyUrl({ projectId, storagePath }))
  }

  return thumbnailUrls
}
