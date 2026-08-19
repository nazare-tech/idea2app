import assert from "node:assert/strict"
import test from "node:test"

import {
  buildExportMarkdown,
  buildProjectBriefMarkdown,
  buildProjectExportNames,
  buildProjectExportReadme,
  getImageFileExtension,
  isValidProjectExportMockupPath,
} from "./project-export"

const metadata = {
  projectName: "Café / Compass",
  projectId: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-18T12:00:00.000Z",
  exportedAt: new Date("2026-08-19T12:00:00.000Z"),
}

test("buildProjectExportNames creates stable cross-platform ZIP and root names", () => {
  assert.deepEqual(buildProjectExportNames(metadata.projectName, metadata.exportedAt), {
    archiveName: "cafe-compass-export-2026-08-19.zip",
    rootDirectory: "cafe-compass",
  })
  assert.equal(
    buildProjectExportNames("🧭", metadata.exportedAt).archiveName,
    "project-export-2026-08-19.zip",
  )
})

test("buildProjectBriefMarkdown includes original idea, summary, and resolved intake answers", () => {
  const markdown = buildProjectBriefMarkdown(metadata, {
    originalIdea: "Help neighborhood bakers sell daily surplus.",
    generatedSummary: "A local surplus marketplace for independent bakeries.",
    questions: [
      {
        id: "audience",
        question: "Who is it for?",
        selectionMode: "single",
        options: [{ id: "bakers", label: "Independent bakers" }],
        allowOther: true,
      },
      {
        id: "platform",
        question: "Which platform?",
        selectionMode: "single",
        options: [],
        allowOther: true,
      },
    ],
    answers: [
      { questionId: "audience", selectedOptionIds: ["bakers"] },
      { questionId: "platform", decideForMe: true },
    ],
  })

  assert.match(markdown, /artifact_type: "project-brief"/)
  assert.match(markdown, /## Original Idea/)
  assert.match(markdown, /Help neighborhood bakers sell daily surplus\./)
  assert.match(markdown, /### Who is it for\?/)
  assert.match(markdown, /Independent bakers/)
  assert.match(markdown, /Decide for me \(pick the best fit for this idea\)/)
})

test("export markdown and README keep metadata and partial-export notes content-safe", () => {
  const document = buildExportMarkdown({
    title: "Product Plan",
    artifactType: "product-plan",
    content: "# Product Plan\n\nBuild the smallest useful workflow.",
    metadata,
    sourceUpdatedAt: "2026-08-17T12:00:00.000Z",
  })
  assert.match(document, /source_updated_at: "2026-08-17T12:00:00\.000Z"/)
  assert.match(document, /# Product Plan/)

  const readme = buildProjectExportReadme({
    ...metadata,
    includedPaths: ["README.md", "documents/product-plan.md"],
    missingArtifacts: ["Market Research has not been generated."],
    warnings: ["Mockup Concept 2 could not be downloaded and was omitted."],
  })
  assert.match(readme, /## Included Files/)
  assert.match(readme, /## Missing Artifacts/)
  assert.match(readme, /## Export Warnings/)
})

test("getImageFileExtension accepts only supported stored image formats", () => {
  assert.equal(getImageFileExtension("image/jpeg", "project/image.bin"), "jpg")
  assert.equal(getImageFileExtension("", "project/concept.webp"), "webp")
  assert.equal(getImageFileExtension("image/svg+xml", "project/concept.svg"), null)
  assert.equal(getImageFileExtension("text/html", "project/concept.png"), null)
})

test("isValidProjectExportMockupPath stays beneath the owned project prefix", () => {
  const projectId = "11111111-1111-4111-8111-111111111111"
  assert.equal(
    isValidProjectExportMockupPath(projectId, `${projectId}/run-123/option-a.png`),
    true,
  )
  assert.equal(isValidProjectExportMockupPath(projectId, `${projectId}/concept.png`), true)
  assert.equal(isValidProjectExportMockupPath(projectId, `other-project/concept.png`), false)
  assert.equal(isValidProjectExportMockupPath(projectId, `${projectId}/../secret.png`), false)
  assert.equal(isValidProjectExportMockupPath(projectId, `${projectId}//concept.png`), false)
  assert.equal(isValidProjectExportMockupPath(projectId, `${projectId}\\concept.png`), false)
})
