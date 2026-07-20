import test from "node:test"
import assert from "node:assert/strict"

import {
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

test("a trailing partially-streamed heading line is withheld until its newline arrives", () => {
  const content = [
    "## MVP Summary",
    "",
    "A complete summary.",
    "",
    "## Core User Fl",
  ].join("\n")

  const streaming = parseStreamingPlanningDocument(content, { finished: false })
  assert.deepEqual(streaming.sections.map((section) => section.heading), ["MVP Summary"])

  // The newline after the heading commits it.
  const committed = parseStreamingPlanningDocument(`${content}\n`, { finished: false })
  assert.deepEqual(
    committed.sections.map((section) => section.heading),
    ["MVP Summary", "Core User Fl"],
  )

  // A finished document keeps its final heading even without a trailing newline.
  const finished = parseStreamingPlanningDocument(content, { finished: true })
  assert.deepEqual(
    finished.sections.map((section) => section.heading),
    ["MVP Summary", "Core User Fl"],
  )
})
