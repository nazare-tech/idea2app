import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ProjectCardThumbnail } from "./dashboard-project-thumbnail"
import { deriveDashboardMockupPreviews } from "@/lib/mockups/dashboard-thumbnail"

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

test("deriveDashboardMockupPreviews returns first valid A/B/C options in canonical order", () => {
  const previews = deriveDashboardMockupPreviews({
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
          { label: " c ", storagePath: `${PROJECT_ID}/new/option-c-storyboard.png` },
          { label: "A", storagePath: `${OTHER_PROJECT_ID}/new/wrong-project-a.png` },
          { label: "b", storagePath: `${PROJECT_ID}/new/option-b-storyboard.png` },
          { label: " a ", storagePath: `${PROJECT_ID}/new/first-valid-a.png` },
          { label: "A", storagePath: `${PROJECT_ID}/new/second-valid-a.png` },
          { label: "D", storagePath: `${PROJECT_ID}/new/unknown-option.png` },
        ]),
      },
    ],
  })

  assert.deepEqual(previews.get(PROJECT_ID), [
    {
      label: "A",
      url: `/api/mockups/image?projectId=${PROJECT_ID}&path=${encodeURIComponent(`${PROJECT_ID}/new/first-valid-a.png`)}`,
    },
    {
      label: "B",
      url: `/api/mockups/image?projectId=${PROJECT_ID}&path=${encodeURIComponent(`${PROJECT_ID}/new/option-b-storyboard.png`)}`,
    },
    {
      label: "C",
      url: `/api/mockups/image?projectId=${PROJECT_ID}&path=${encodeURIComponent(`${PROJECT_ID}/new/option-c-storyboard.png`)}`,
    },
  ])
})

test("deriveDashboardMockupPreviews keeps newest-row semantics for malformed content", () => {
  const previews = deriveDashboardMockupPreviews({
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

  assert.equal(previews.has(PROJECT_ID), false)
})

test("deriveDashboardMockupPreviews omits invalid options independently", () => {
  const previews = deriveDashboardMockupPreviews({
    authorizedProjectIds: [PROJECT_ID],
    rows: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        project_id: PROJECT_ID,
        created_at: "2026-08-09T12:00:00.000Z",
        content: buildMockupContent([
          { label: "A" },
          { label: "B", storagePath: `${PROJECT_ID}/run/option-b-storyboard.png` },
          { label: "C", storagePath: `${PROJECT_ID}/run/../secret.png` },
        ]),
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

  assert.deepEqual(previews.get(PROJECT_ID), [{
    label: "B",
    url: `/api/mockups/image?projectId=${PROJECT_ID}&path=${encodeURIComponent(`${PROJECT_ID}/run/option-b-storyboard.png`)}`,
  }])
  assert.equal(previews.has(OTHER_PROJECT_ID), false)
})

test("deriveDashboardMockupPreviews supports exact controlled A/B/C fixture SVGs", () => {
  const fixtureUrls = {
    A: "data:image/svg+xml;charset=utf-8,%3Csvg%20id%3D%22a%22%3E%3C%2Fsvg%3E",
    B: "data:image/svg+xml;charset=utf-8,%3Csvg%20id%3D%22b%22%3E%3C%2Fsvg%3E",
    C: "data:image/svg+xml;charset=utf-8,%3Csvg%20id%3D%22c%22%3E%3C%2Fsvg%3E",
  } as const
  const previews = deriveDashboardMockupPreviews({
    authorizedProjectIds: [PROJECT_ID],
    rows: [{
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      project_id: PROJECT_ID,
      created_at: "2026-08-09T12:00:00.000Z",
      content: JSON.stringify({
        type: "openrouter-image-v2",
        model: "fixture/mockup-no-credit",
        generatedAt: "2026-08-09T12:00:00.000Z",
        options: ["C", "A", "B"].map((label) => ({
          label,
          title: `Option ${label}`,
          imageUrl: fixtureUrls[label as keyof typeof fixtureUrls],
          storagePath: `fixture/${PROJECT_ID}/option-${label.toLowerCase()}-storyboard.svg`,
          description: "",
          contentType: "image/svg+xml",
        })),
      }),
    }],
  })

  assert.deepEqual(previews.get(PROJECT_ID), [
    { label: "A", url: fixtureUrls.A },
    { label: "B", url: fixtureUrls.B },
    { label: "C", url: fixtureUrls.C },
  ])
})

test("deriveDashboardMockupPreviews rejects mismatched fixture paths", () => {
  const previews = deriveDashboardMockupPreviews({
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
          imageUrl: "data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E",
          storagePath: `fixture/${PROJECT_ID}/option-b-storyboard.svg`,
          description: "",
          contentType: "image/svg+xml",
        }],
      }),
    }],
  })

  assert.equal(previews.has(PROJECT_ID), false)
})

test("ProjectCardThumbnail renders a stable empty state", () => {
  const markup = renderToStaticMarkup(<ProjectCardThumbnail previews={[]} />)

  assert.match(markup, /data-thumbnail-canvas="true"/)
  assert.match(markup, /rounded-\[24px\]/)
  assert.match(markup, /h-\[378px\]/)
  assert.match(markup, /border-\[#dbdbdb\]/)
  assert.match(markup, /bg-white p-5/)
  assert.match(markup, /No mockup preview/)
  assert.doesNotMatch(markup, /<img/)
})

test("ProjectCardThumbnail distinguishes a query failure from an empty state", () => {
  const markup = renderToStaticMarkup(
    <ProjectCardThumbnail previews={[]} unavailable />,
  )

  assert.match(markup, /data-thumbnail-state="unavailable"/)
  assert.match(markup, /Preview unavailable/)
  assert.doesNotMatch(markup, /No mockup preview/)
})

test("ProjectCardThumbnail renders a lazy decorative image", () => {
  const thumbnailUrl = `/api/mockups/image?projectId=${PROJECT_ID}&path=preview.png`
  const markup = renderToStaticMarkup(
    <ProjectCardThumbnail previews={[{ label: "A", url: thumbnailUrl }]} />,
  )

  assert.match(markup, /<img/)
  assert.match(markup, /alt=""/)
  assert.match(markup, /loading="lazy"/)
  assert.match(markup, /decoding="async"/)
  assert.match(markup, /fetchPriority="low"/)
  assert.match(markup, /rounded-\[24px\]/)
  assert.match(markup, /h-\[378px\]/)
  assert.match(markup, /object-contain/)
  assert.match(markup, /data-thumbnail-active-label="A"/)
  assert.match(markup, /data-thumbnail-state="loading"/)
  assert.match(markup, /data-testid="dashboard-project-thumbnail-loading"/)
  assert.match(markup, /Loading mockup option A/)
  assert.match(markup, /projectId=/)
  assert.doesNotMatch(markup, /No mockup preview/)
})

test("ProjectCardThumbnail exposes all three lazy slides while displaying option A", () => {
  const markup = renderToStaticMarkup(
    <ProjectCardThumbnail
      previews={[
        { label: "A", url: "/a.png" },
        { label: "B", url: "/b.png" },
        { label: "C", url: "/c.png" },
      ]}
    />,
  )

  assert.match(markup, /data-thumbnail-count="3"/)
  assert.match(markup, /src="\/a.png"/)
  assert.match(markup, /src="\/b.png"/)
  assert.match(markup, /src="\/c.png"/)
  assert.match(markup, /src="\/a.png"[^>]*class="[^"]*block/)
  assert.match(markup, /src="\/b.png"[^>]*class="[^"]*hidden/)
  assert.equal(
    (markup.match(/data-testid="dashboard-project-thumbnail-loading"/g) ?? []).length,
    1,
  )
})
