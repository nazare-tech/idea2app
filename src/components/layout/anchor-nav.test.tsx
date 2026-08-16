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

test("AnchorNav renders the Figma desktop rail hierarchy", () => {
  const html = renderToStaticMarkup(
    <AnchorNav
      documentStatuses={{ competitive: "done", prd: "done", mvp: "done", mockups: "done" }}
      activeSectionId="prd-introduction-overview"
      onNavigate={() => {}}
    />,
  )

  assert.match(html, /aria-label="Project documents"/)
  const iconOrder = [...html.matchAll(/lucide-(briefcase|chart-bar|clipboard-list|rocket|brush|sparkles)/g)]
    .map((match) => match[1])
  assert.deepEqual(iconOrder, [
    "briefcase",
    "chart-bar",
    "clipboard-list",
    "rocket",
    "brush",
    "sparkles",
  ])
  assert.match(
    html,
    /data-nav-target="executive-summary"[^>]*>.*lucide-briefcase.*Executive Summary<\/span><\/button>/,
  )
  assert.match(html, /text-\[17px\]/)
  assert.match(html, /data-nav-connector="branch"/)
  assert.match(
    html,
    /data-nav-target="prd-introduction-overview"[^>]*aria-current="location"[^>]*data-nav-active="true"/,
  )
  assert.match(html, /bg-sidebar-bg/)
  assert.doesNotMatch(html, /#22C55E/)
})
