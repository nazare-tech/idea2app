import test from "node:test"
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"

import { HeroBuildMap } from "./hero-build-map"
import {
  BUILD_MAP_MOCKUPS,
  BUILD_MAP_NODE_LABELS,
  BUILD_MAP_SCENARIOS,
  PANEL_ORDER,
  TALL_LAYOUT,
  WIDE_LAYOUT,
  type BuildMapLayout,
} from "@/lib/landing-hero-build-map"

const VARIANT_COUNT = 2
const [first] = BUILD_MAP_SCENARIOS

test("HeroBuildMap renders both breakpoint variants of all five nodes", () => {
  const html = renderToStaticMarkup(<HeroBuildMap />)

  // One idea line, one research box, one plan box, one prompt box per variant.
  assert.equal((html.match(/data-bm-idea-text/g) ?? []).length, VARIANT_COUNT)
  assert.equal((html.match(/data-bm-research/g) ?? []).length, VARIANT_COUNT)
  assert.equal((html.match(/data-bm-plan/g) ?? []).length, VARIANT_COUNT)
  assert.equal((html.match(/data-bm-prompt/g) ?? []).length, VARIANT_COUNT)
  // Four content panels per variant, one per fade index.
  assert.equal((html.match(/data-bm-fade/g) ?? []).length, PANEL_ORDER.length * VARIANT_COUNT)

  for (const { name, detail } of Object.values(BUILD_MAP_NODE_LABELS)) {
    assert.equal((html.match(new RegExp(`>${name}<`, "g")) ?? []).length, VARIANT_COUNT, name)
    assert.equal((html.match(new RegExp(`>${detail}<`, "g")) ?? []).length, VARIANT_COUNT, detail)
  }

  assert.equal(
    (html.match(/data-bm-mock=/g) ?? []).length,
    BUILD_MAP_MOCKUPS.length * VARIANT_COUNT
  )
})

test("HeroBuildMap paints the first scenario server-side, before the cycle runs", () => {
  const html = renderToStaticMarkup(<HeroBuildMap />)

  assert.ok(html.includes(first.idea), "typed idea line is present without JS")
  assert.equal((html.match(/>Productboard</g) ?? []).length, VARIANT_COUNT)
  assert.equal((html.match(/>Maya Chen</g) ?? []).length, VARIANT_COUNT)
  assert.equal((html.match(/>prompt-01\.md</g) ?? []).length, VARIANT_COUNT)
  // Panels start revealed so a no-JS or reduced-motion visitor reads real content.
  assert.match(html, /data-bm-fade="0"[^>]*style="opacity:1/)
})

test("HeroBuildMap is decorative: one aria-hidden root, no alt text to read", () => {
  const html = renderToStaticMarkup(<HeroBuildMap />)

  // React emits a preload link for the eagerly loaded mockup ahead of the tree,
  // so the root is matched in place rather than anchored to the string start.
  assert.match(html, /<div aria-hidden="true"><div class="w-full overflow-hidden hidden lg:block"/)
  assert.equal((html.match(/alt=""/g) ?? []).length, (3 + BUILD_MAP_MOCKUPS.length) * VARIANT_COUNT)
  assert.doesNotMatch(html, /alt="[^"]+"/)
})

test("build map mockup images exist on disk", () => {
  for (const mockup of BUILD_MAP_MOCKUPS) {
    const path = join(process.cwd(), "public", mockup.src)
    assert.ok(existsSync(path), `missing ${mockup.src}`)
  }
})

function assertPercent(value: string, label: string) {
  assert.match(value, /^-?\d+(\.\d+)?%$/, `${label} is not a percentage: ${value}`)
}

function assertLayout(layout: BuildMapLayout, label: string) {
  assert.ok(layout.canvas.width > 0 && layout.canvas.height > 0, `${label} canvas`)
  assert.ok(layout.maxWidth > 0, `${label} maxWidth`)
  assert.equal(layout.connectors.length, 4, `${label} connectors`)
  for (const connector of layout.connectors) {
    assert.match(connector.d, /^M[\d.,\s CLc]+$/, `${label} path`)
    assert.ok(connector.delay > 0, `${label} connector delay`)
  }
  assert.ok(layout.joints.length >= 7, `${label} joints`)
  for (const joint of layout.joints) {
    assertPercent(joint.left, `${label} joint left`)
    assert.match(joint.top, /^(-?\d+(\.\d+)?%|calc\(.+\))$/, `${label} joint top`)
  }
  assert.equal(layout.nodes.length, 5, `${label} nodes`)
  assert.deepEqual(
    layout.nodes.map((node) => node.id),
    ["idea", "research", "plan", "design", "prompt"],
    `${label} node order`
  )
  for (const node of layout.nodes) {
    assertPercent(node.left, `${label} ${node.id} left`)
    assertPercent(node.top, `${label} ${node.id} top`)
    assertPercent(node.width, `${label} ${node.id} width`)
    assertPercent(node.height, `${label} ${node.id} height`)
  }
}

test("both layouts are complete and positioned in percentages", () => {
  assertLayout(WIDE_LAYOUT, "wide")
  assertLayout(TALL_LAYOUT, "tall")
})

test("every scenario fills every node slot", () => {
  assert.ok(BUILD_MAP_SCENARIOS.length >= 2, "the cycle needs something to cycle through")
  for (const scenario of BUILD_MAP_SCENARIOS) {
    assert.ok(scenario.idea.length > 20, scenario.idea)
    assert.equal(scenario.competitors.length, 3, scenario.idea)
    assert.equal(scenario.goals.length, 3, scenario.idea)
    assert.equal(scenario.files.length, 5, scenario.idea)
    assert.ok(
      scenario.mockup >= 0 && scenario.mockup < BUILD_MAP_MOCKUPS.length,
      `mockup index out of range: ${scenario.mockup}`
    )
    for (const competitor of scenario.competitors) {
      assert.match(competitor.domain, /^[a-z0-9.-]+\.[a-z]{2,}$/, competitor.domain)
      assert.ok(competitor.name.length > 0, competitor.domain)
    }
    assert.ok(scenario.persona.initials.length === 2, scenario.persona.initials)
  }
})
