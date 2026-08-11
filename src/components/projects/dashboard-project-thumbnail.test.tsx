import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ProjectCardThumbnail } from "./dashboard-project-thumbnail"
import { deriveDashboardMockupThumbnailUrls } from "@/lib/mockups/dashboard-thumbnail"

const PROJECT_ID = "11111111-1111-4111-8111-111111111111"
const OTHER_PROJECT_ID = "22222222-2222-4222-8222-222222222222"

function buildMockupContent(options: Array<{
  label: string
  storagePath?: string
  imageUrl?: string
}>) {
  return JSON.stringify({
    type: "openrouter-image-v2",
    model: "openai/gpt-5.4-image-2",
    generatedAt: "2026-08-09T12:00:00.000Z",
    options: options.map((option) => ({
      label: option.label,
      title: `Option ${option.label}`,
      imageUrl: option.imageUrl ?? `/api/mockups/image?projectId=${PROJECT_ID}`,
      storagePath: option.storagePath ?? "",
      description: "",
      contentType: "image/png",
    })),
  })
}

test("deriveDashboardMockupThumbnailUrls selects Version A by label from the newest row", () => {
  const urls = deriveDashboardMockupThumbnailUrls({
    authorizedProjectIds: [PROJECT_ID],
    rows: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        project_id: PROJECT_ID,
        created_at: "2026-08-08T12:00:00.000Z",
        content: buildMockupContent([
          { label: "A", storagePath: `${PROJECT_ID}/old/option-a-storyboard.png` },
        ]),
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        project_id: PROJECT_ID,
        created_at: "2026-08-09T12:00:00.000Z",
        content: buildMockupContent([
          { label: "B", storagePath: `${PROJECT_ID}/new/option-b-storyboard.png` },
          { label: "A", storagePath: `${PROJECT_ID}/new/option-a-storyboard.png` },
        ]),
      },
    ],
  })

  assert.equal(
    urls.get(PROJECT_ID),
    `/api/mockups/image?projectId=${PROJECT_ID}&path=${encodeURIComponent(`${PROJECT_ID}/new/option-a-storyboard.png`)}`,
  )
})

test("deriveDashboardMockupThumbnailUrls keeps newest-row semantics for malformed content", () => {
  const urls = deriveDashboardMockupThumbnailUrls({
    authorizedProjectIds: [PROJECT_ID],
    rows: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        project_id: PROJECT_ID,
        created_at: "2026-08-09T12:00:00.000Z",
        content: "retired html mockup",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        project_id: PROJECT_ID,
        created_at: "2026-08-08T12:00:00.000Z",
        content: buildMockupContent([
          { label: "A", storagePath: `${PROJECT_ID}/old/option-a-storyboard.png` },
        ]),
      },
    ],
  })

  assert.equal(urls.has(PROJECT_ID), false)
})

test("deriveDashboardMockupThumbnailUrls ignores unauthorized project rows and missing storage paths", () => {
  const urls = deriveDashboardMockupThumbnailUrls({
    authorizedProjectIds: [PROJECT_ID],
    rows: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        project_id: PROJECT_ID,
        created_at: "2026-08-09T12:00:00.000Z",
        content: buildMockupContent([{ label: "A" }]),
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        project_id: OTHER_PROJECT_ID,
        created_at: "2026-08-09T12:00:00.000Z",
        content: buildMockupContent([
          { label: "A", storagePath: `${OTHER_PROJECT_ID}/run/option-a-storyboard.png` },
        ]),
      },
    ],
  })

  assert.equal(urls.size, 0)
})

test("deriveDashboardMockupThumbnailUrls supports the controlled no-credit fixture SVG", () => {
  const fixtureUrl = "data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E"
  const urls = deriveDashboardMockupThumbnailUrls({
    authorizedProjectIds: [PROJECT_ID],
    rows: [{
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      project_id: PROJECT_ID,
      created_at: "2026-08-09T12:00:00.000Z",
      content: JSON.stringify({
        type: "openrouter-image-v2",
        model: "fixture/mockup-no-credit",
        generatedAt: "2026-08-09T12:00:00.000Z",
        options: [{
          label: "A",
          title: "Option A",
          imageUrl: fixtureUrl,
          storagePath: `fixture/${PROJECT_ID}/option-a-storyboard.svg`,
          description: "",
          contentType: "image/svg+xml",
        }],
      }),
    }],
  })

  assert.equal(urls.get(PROJECT_ID), fixtureUrl)
})

test("ProjectCardThumbnail renders a stable empty state", () => {
  const markup = renderToStaticMarkup(<ProjectCardThumbnail thumbnailUrl={null} />)

  assert.match(markup, /data-thumbnail-canvas="true"/)
  assert.match(markup, /rounded-\[24px\]/)
  assert.match(markup, /bg-card p-5/)
  assert.match(markup, /max-h-\[300px\]/)
  assert.match(markup, /No mockup preview/)
  assert.doesNotMatch(markup, /<img/)
})

test("ProjectCardThumbnail distinguishes a query failure from an empty state", () => {
  const markup = renderToStaticMarkup(
    <ProjectCardThumbnail thumbnailUrl={null} unavailable />,
  )

  assert.match(markup, /data-thumbnail-state="unavailable"/)
  assert.match(markup, /Preview unavailable/)
  assert.doesNotMatch(markup, /No mockup preview/)
})

test("ProjectCardThumbnail renders a lazy decorative image", () => {
  const thumbnailUrl = `/api/mockups/image?projectId=${PROJECT_ID}&path=preview.png`
  const markup = renderToStaticMarkup(<ProjectCardThumbnail thumbnailUrl={thumbnailUrl} />)

  assert.match(markup, /<img/)
  assert.match(markup, /alt=""/)
  assert.match(markup, /loading="lazy"/)
  assert.match(markup, /decoding="async"/)
  assert.match(markup, /fetchPriority="low"/)
  assert.match(markup, /rounded-\[24px\]/)
  assert.match(markup, /max-h-\[300px\]/)
  assert.match(markup, /projectId=/)
  assert.doesNotMatch(markup, /No mockup preview/)
})
