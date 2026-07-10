import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { AnchorNav } from "@/components/layout/anchor-nav"
import type { DocumentNavItem } from "@/lib/document-sections"

test("AnchorNav lets a derived document override its source document status", () => {
  const items: DocumentNavItem[] = [
    { key: "mvp", label: "First Version Plan", sourceType: "mvp", sections: [] },
    { key: "ai-prompts", label: "AI Prompts", sourceType: "mvp", sections: [] },
  ]

  const html = renderToStaticMarkup(
    <AnchorNav
      navItems={items}
      documentStatuses={{ mvp: "done", "ai-prompts": "pending" }}
      activeSectionId={null}
      onNavigate={() => {}}
    />,
  )

  assert.match(html, /First Version Plan, done/)
  assert.match(html, /AI Prompts, pending/)
})

test("AnchorNav never offers Retry for a derived incomplete item", () => {
  const items: DocumentNavItem[] = [
    { key: "mvp", label: "First Version Plan", sourceType: "mvp", sections: [] },
    { key: "ai-prompts", label: "AI Prompts", sourceType: "mvp", derived: true, sections: [] },
  ]

  const html = renderToStaticMarkup(
    <AnchorNav
      navItems={items}
      documentStatuses={{ mvp: "needs_retry", "ai-prompts": "needs_retry" }}
      activeSectionId={null}
      onNavigate={() => {}}
      onGenerateDocument={() => {}}
    />,
  )

  // The real queue-backed document keeps its Retry action; the derived AI
  // Prompts row states the incomplete fact without offering a fake retry.
  assert.match(html, /Retry/)
  assert.match(html, /Incomplete/)
  const retryCount = html.split(">Retry<").length - 1
  assert.equal(retryCount, 1)
})
