import test from "node:test"
import assert from "node:assert/strict"

import {
  buildStreamingPlanningMarkdown,
  parseStreamingPlanningDocument,
  sanitizeStreamingPlanningTail,
} from "@/lib/planning-document-streaming"

test("sections complete only when the next H2 arrives", () => {
  const content = [
    "# Product Plan",
    "",
    "## 1. Introduction/Overview",
    "",
    "An intro paragraph.",
    "",
    "## 2. Goals",
    "",
    "1. **Business Goal:** Grow",
  ].join("\n")

  const { preamble, sections } = parseStreamingPlanningDocument(content, { finished: false })

  assert.equal(preamble, "# Product Plan")
  assert.equal(sections.length, 2)
  assert.equal(sections[0].complete, true)
  assert.equal(sections[0].heading, "1. Introduction/Overview")
  assert.equal(sections[1].complete, false)
})

test("finished marks the last section complete", () => {
  const { sections } = parseStreamingPlanningDocument("## Goals\n\nDone.", { finished: true })
  assert.equal(sections[0].complete, true)
})

test("sanitize withholds a trailing partial heading line", () => {
  assert.equal(
    sanitizeStreamingPlanningTail("Some prose.\n### 2.1 Busine"),
    "Some prose.",
  )
})

test("sanitize withholds a trailing partial table row", () => {
  assert.equal(
    sanitizeStreamingPlanningTail("Intro.\n| Metric | Target"),
    "Intro.",
  )
})

test("sanitize drops a lone unclosed bold marker", () => {
  assert.equal(
    sanitizeStreamingPlanningTail("Line one.\n\n**Assessment: still writing"),
    "Line one.\n\nAssessment: still writing",
  )
})

test("committed markdown keeps complete sections verbatim and sanitizes the tail", () => {
  const content = [
    "# First Version Plan",
    "",
    "## MVP Summary",
    "",
    "A complete summary.",
    "",
    "## Target User and Problem",
    "",
    "Solo founders **who",
  ].join("\n")

  const result = buildStreamingPlanningMarkdown(content, { finished: false })

  assert.match(result.markdown, /# First Version Plan/)
  assert.match(result.markdown, /## MVP Summary\n\nA complete summary\./)
  assert.match(result.markdown, /## Target User and Problem/)
  // The unclosed bold marker is dropped so the tail streams as plain prose.
  assert.match(result.markdown, /Solo founders who/)
  assert.doesNotMatch(result.markdown, /\*\*/)
  assert.equal(result.activeHeading, "Target User and Problem")
  assert.deepEqual(result.headings, ["MVP Summary", "Target User and Problem"])
})

test("a trailing partially-streamed heading line is withheld until its newline arrives", () => {
  const content = [
    "## MVP Summary",
    "",
    "A complete summary.",
    "",
    "## Core User Fl",
  ].join("\n")

  const streaming = buildStreamingPlanningMarkdown(content, { finished: false })
  assert.deepEqual(streaming.headings, ["MVP Summary"])
  assert.doesNotMatch(streaming.markdown, /Core User Fl/)

  // The newline after the heading commits it.
  const committed = buildStreamingPlanningMarkdown(`${content}\n`, { finished: false })
  assert.deepEqual(committed.headings, ["MVP Summary", "Core User Fl"])

  // A finished document keeps its final heading even without a trailing newline.
  const finished = buildStreamingPlanningMarkdown(content, { finished: true })
  assert.deepEqual(finished.headings, ["MVP Summary", "Core User Fl"])
})
