import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import { ToolLogoMarquee } from "@/components/landing/tool-logo-marquee"

const tools = [
  { name: "Cursor", src: "/logos/cursor.svg" },
  { name: "Codex", src: "/logos/openai.png" },
]

test("ToolLogoMarquee hides the duplicated visual pass from assistive technology", () => {
  const html = renderToStaticMarkup(<ToolLogoMarquee tools={tools} />)

  // One aria-hidden per decorative logo image (both copies) plus the single
  // inert duplicate-track wrapper.
  assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, tools.length * 2 + 1)
  assert.equal((html.match(/>Cursor</g) ?? []).length, 2)
  assert.match(html, /aria-hidden="true" inert=""/)
})

test("ToolLogoMarquee uses visible names instead of redundant logo alt text", () => {
  const html = renderToStaticMarkup(<ToolLogoMarquee tools={tools} />)

  assert.doesNotMatch(html, /alt="Cursor logo"/)
  assert.doesNotMatch(html, /alt="Codex logo"/)
  assert.equal((html.match(/alt=""/g) ?? []).length, tools.length * 2)
})
