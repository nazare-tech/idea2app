import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ProjectCardDetails } from "./dashboard-project-card-details"

test("ProjectCardDetails matches the transparent Figma details area", () => {
  const markup = renderToStaticMarkup(
    <ProjectCardDetails
      name="Vetted Event Photographers On Demand"
      description="A marketplace matching event hosts with vetted photographers."
      createdLabel="Created: 29 days ago"
    />,
  )

  assert.match(markup, /data-testid="dashboard-project-card-details"/)
  assert.match(markup, /title="Vetted Event Photographers On Demand"/)
  assert.match(markup, /h-\[160\.6px\]/)
  assert.match(markup, /px-2 py-5/)
  assert.doesNotMatch(markup, /bg-\[#f6f6f6\]/)
  assert.doesNotMatch(markup, /border-t/)
  assert.doesNotMatch(markup, /border-\[#c9c9c9\]/)
  assert.match(markup, /h-\[21\.6px\]/)
  assert.match(markup, /font-medium/)
  assert.doesNotMatch(markup, /font-bold/)
  assert.match(markup, /leading-\[normal\]/)
  assert.match(markup, /data-testid="dashboard-project-card-description-slot"/)
  assert.match(markup, /h-\[72px\]/)
  assert.match(markup, /data-testid="dashboard-project-card-description"/)
  assert.match(markup, /whitespace-pre-wrap/)
  assert.match(markup, /\[word-break:break-word\]/)
  assert.doesNotMatch(markup, /max-h-\[67\.2px\]/)
  assert.doesNotMatch(markup, /line-clamp-4/)
  assert.doesNotMatch(markup, /-webkit-line-clamp/)
  assert.doesNotMatch(markup, /-webkit-box-orient/)
  assert.match(markup, /italic/)
  assert.match(markup, /mt-auto/)
})

test("ProjectCardDetails preserves the existing missing-description fallback", () => {
  const markup = renderToStaticMarkup(
    <ProjectCardDetails
      name="Untitled"
      description={null}
      createdLabel="Created: recently"
    />,
  )

  assert.match(markup, /No project context captured yet\./)
})

test("ProjectCardDetails reserves inert title space for a sibling action", () => {
  const markup = renderToStaticMarkup(
    <ProjectCardDetails
      name="A project name long enough to truncate before actions"
      description="Description"
      createdLabel="Created: recently"
      reserveTitleActionSpace
    />,
  )

  assert.match(markup, /data-testid="dashboard-project-card-title"/)
  assert.match(markup, /data-testid="dashboard-project-card-title-action-space"/)
  assert.match(markup, /w-8 shrink-0 self-stretch/)
  assert.doesNotMatch(markup, /<button/)
})
