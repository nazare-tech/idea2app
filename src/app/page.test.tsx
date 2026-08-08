import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import { ToolLogoMarquee } from "@/components/landing/tool-logo-marquee"
import { FeatureScrollytelling } from "@/components/landing/feature-scrollytelling"
import { HeroDotField } from "@/components/landing/hero-dot-field"
import { SiteFooter } from "@/components/landing/site-footer"

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

test("FeatureScrollytelling has visible first-paint artwork before its motion loop starts", () => {
  const html = renderToStaticMarkup(<FeatureScrollytelling />)

  assert.equal((html.match(/data-stage-set/g) ?? []).length, 5)
  assert.equal((html.match(/data-stage-card/g) ?? []).length, 18)
  assert.match(html, /data-stage-set[^>]*class="absolute inset-0 opacity-100"/)
  assert.match(html, /data-stage-card[^>]*style="[^"]*opacity:1/)
  assert.match(html, /data-hero-dot-field="true"/)
})

test("landing magnetic line field is a section background that moves with native layout", () => {
  const html = renderToStaticMarkup(<HeroDotField />)

  assert.match(html, /data-hero-dot-field="true"/)
  assert.match(html, /class="[^"]*absolute[^"]*inset-0[^"]*"/)
})

test("public footer does not render the retired compass watermark", () => {
  const html = renderToStaticMarkup(<SiteFooter />)

  assert.doesNotMatch(html, /viewBox="0 0 47\.9971 33\.5966"/)
  assert.doesNotMatch(html, /-bottom-\[150px\]/)
  assert.match(html, /bg-\[#F5F0EB\]\/80/)
})
