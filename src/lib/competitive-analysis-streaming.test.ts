import assert from "node:assert/strict"
import test from "node:test"

import {
  getSafeStreamTail,
  parseStreamingCompetitiveAnalysis,
} from "./competitive-analysis-streaming"

const PARTIAL_DOC = `# Competitive Analysis: Signal To Roadmap

## Executive Summary
The category is evolving rapidly.

*   **Assessment**: High potential.

## Direct Competitors
### Productboard
- **Overview**: Product management platform.

## Feature Comparison
| Dimension | Us |
| :--- | :--- |
| Ingestion | Multi`

test("all sections before the last H2 are complete; the tail section is active", () => {
  const result = parseStreamingCompetitiveAnalysis(PARTIAL_DOC, { finished: false })

  assert.deepEqual(
    result.sections.map((section) => [section.name, section.complete]),
    [
      ["Executive Summary", true],
      ["Direct Competitors", true],
      ["Feature Comparison", false],
    ]
  )
  assert.equal(result.activeSection?.name, "Feature Comparison")
  assert.ok(result.completeSectionNames.has("Executive Summary"))
  assert.ok(!result.completeSectionNames.has("Feature Comparison"))
})

test("finished stream marks the final section complete with no active section", () => {
  const result = parseStreamingCompetitiveAnalysis(PARTIAL_DOC, { finished: true })

  assert.equal(result.activeSection, null)
  assert.ok(result.completeSectionNames.has("Feature Comparison"))
})

test("alias headings resolve to canonical section names", () => {
  // The second heading carries a trailing newline: a bare "## Next" tail
  // would be withheld as potentially mid-stream.
  const result = parseStreamingCompetitiveAnalysis(
    "## MVP Wedge Recommendation\nFocus tightly.\n\n## Next\n",
    { finished: false }
  )

  assert.equal(result.sections[0].name, "First Version Focus")
  assert.equal(result.sections[1].name, null)
})

test("content with no headings yet has no sections", () => {
  const result = parseStreamingCompetitiveAnalysis("# Competitive Analysis: Sig", {
    finished: false,
  })

  assert.deepEqual(result.sections, [])
  assert.equal(result.activeSection, null)
})

test("safe tail shows finished prose lines as they stream", () => {
  const tail = getSafeStreamTail("First finished line.\nSecond line still growi")

  assert.equal(tail.visibleText, "First finished line.\nSecond line still growi")
  assert.equal(tail.buffering, null)
})

test("safe tail withholds everything from the first table row onward", () => {
  const tail = getSafeStreamTail(
    "Intro paragraph.\n| Col A | Col B |\n| :--- | :--- |\n| a | b"
  )

  assert.equal(tail.visibleText, "Intro paragraph.")
  assert.equal(tail.buffering, "table")
})

test("safe tail withholds a trailing line with unclosed bold", () => {
  const tail = getSafeStreamTail("Done line.\n*   **Assessm")

  assert.equal(tail.visibleText, "Done line.")
  assert.equal(tail.buffering, null)
})

test("safe tail withholds a trailing partial heading", () => {
  const tail = getSafeStreamTail("Done line.\n### Product")

  assert.equal(tail.visibleText, "Done line.")
  assert.equal(tail.buffering, null)
})

test("safe tail keeps a completed bold label line", () => {
  const tail = getSafeStreamTail("*   **Assessment**: High potential, but requires")

  assert.equal(tail.visibleText, "*   **Assessment**: High potential, but requires")
  assert.equal(tail.buffering, null)
})

test("safe tail of empty text is empty", () => {
  assert.deepEqual(getSafeStreamTail(""), { visibleText: "", buffering: null })
})

test("a trailing partially-streamed heading line is withheld until its newline arrives", () => {
  const content = "## Executive Summary\n\nDone prose.\n\n## Feature Mat"

  const streaming = parseStreamingCompetitiveAnalysis(content, { finished: false })
  assert.deepEqual(streaming.sections.map((section) => section.heading), ["Executive Summary"])

  const committed = parseStreamingCompetitiveAnalysis(`${content}\n`, { finished: false })
  assert.deepEqual(
    committed.sections.map((section) => section.heading),
    ["Executive Summary", "Feature Mat"],
  )

  const finished = parseStreamingCompetitiveAnalysis(content, { finished: true })
  assert.deepEqual(
    finished.sections.map((section) => section.heading),
    ["Executive Summary", "Feature Mat"],
  )
})
