import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"

import {
  MOCKUP_ANTI_SLOP_RULES,
  MOCKUP_BRAND_KITS,
  formatMockupAntiSlopRules,
  formatMockupBrandKitForPrompt,
  isMockupBrandDirectionsEnabled,
  selectMockupBrandKitForOption,
  selectMockupBrandTriad,
} from "@/lib/mockups/brand-directions"

function hueDistance(a: number, b: number) {
  const delta = Math.abs(a - b) % 360
  return delta > 180 ? 360 - delta : delta
}

/** Deterministic pseudo project ids, enough to exercise the whole bank. */
function syntheticProjectIds(count: number) {
  return Array.from({ length: count }, (_, index) => `project-${index}-${(index * 2654435761) >>> 0}`)
}

describe("mockup brand bank data", () => {
  it("has at least 12 kits with unique ids and archetypes", () => {
    assert.ok(MOCKUP_BRAND_KITS.length >= 12)
    assert.equal(new Set(MOCKUP_BRAND_KITS.map((kit) => kit.id)).size, MOCKUP_BRAND_KITS.length)
    assert.equal(
      new Set(MOCKUP_BRAND_KITS.map((kit) => kit.archetype.desktop)).size,
      MOCKUP_BRAND_KITS.length,
    )
  })

  it("every kit passes WCAG AA on body and on-accent text", () => {
    for (const kit of MOCKUP_BRAND_KITS) {
      assert.ok(kit.bodyContrast >= 4.5, `${kit.name} body ${kit.bodyContrast}`)
      assert.ok(kit.accentTextContrast >= 4.5, `${kit.name} on-accent ${kit.accentTextContrast}`)
    }
  })

  it("every kit has distinct mobile archetype text without desktop-only patterns", () => {
    const desktopPatterns = [/left rail/i, /side\s*bar/i, /step rail on the left/i, /split master-detail/i, /three-pane/i]
    for (const kit of MOCKUP_BRAND_KITS) {
      assert.notEqual(kit.archetype.mobile, kit.archetype.desktop, kit.name)
      for (const pattern of desktopPatterns) {
        assert.ok(!pattern.test(kit.archetype.mobile), `${kit.name} mobile archetype contains ${pattern}`)
      }
    }
  })

  it("keeps blue underweighted: at most 2 kits in the 230-280 hue band", () => {
    const blue = MOCKUP_BRAND_KITS.filter((kit) => kit.accentHue >= 230 && kit.accentHue <= 280)
    assert.ok(blue.length <= 2, `blue kits: ${blue.map((kit) => kit.name).join(", ")}`)
  })

  it("every kit carries the semantic status ramp as hex values", () => {
    for (const kit of MOCKUP_BRAND_KITS) {
      for (const role of ["success", "warning", "error"] as const) {
        assert.match(kit.semantic[role], /^#[0-9a-f]{6}$/, `${kit.name} ${role}`)
      }
    }
  })
})

describe("selectMockupBrandTriad", () => {
  it("is deterministic for a given project id", () => {
    const a = selectMockupBrandTriad("11111111-2222-3333-4444-555555555555")
    const b = selectMockupBrandTriad("11111111-2222-3333-4444-555555555555")
    assert.deepEqual(a.map((kit) => kit.id), b.map((kit) => kit.id))
  })

  it("never places two kits within 60 degrees of accent hue in one triad", () => {
    for (const projectId of syntheticProjectIds(200)) {
      const triad = selectMockupBrandTriad(projectId)
      const hues = triad.map((kit) => kit.accentHue)
      assert.ok(hueDistance(hues[0], hues[1]) >= 60, projectId)
      assert.ok(hueDistance(hues[1], hues[2]) >= 60, projectId)
      assert.ok(hueDistance(hues[0], hues[2]) >= 60, projectId)
    }
  })

  it("spreads selection across the whole bank", () => {
    const usage = new Map<string, number>()
    for (const projectId of syntheticProjectIds(300)) {
      for (const kit of selectMockupBrandTriad(projectId)) {
        usage.set(kit.id, (usage.get(kit.id) ?? 0) + 1)
      }
    }
    // Every kit appears, and no kit dominates: with 900 slots over 15 kits the uniform
    // share is 60; the old ring-walk selection concentrated 47% of slots on 3 kits.
    for (const kit of MOCKUP_BRAND_KITS) {
      const count = usage.get(kit.id) ?? 0
      assert.ok(count > 0, `${kit.name} never selected`)
      assert.ok(count < 180, `${kit.name} over-selected: ${count} of 900 slots`)
    }
  })

  it("maps option labels to stable triad positions", () => {
    const projectId = "aaaa-bbbb"
    const triad = selectMockupBrandTriad(projectId)
    assert.equal(selectMockupBrandKitForOption(projectId, "A").id, triad[0].id)
    assert.equal(selectMockupBrandKitForOption(projectId, "b").id, triad[1].id)
    assert.equal(selectMockupBrandKitForOption(projectId, "C").id, triad[2].id)
  })
})

describe("formatMockupBrandKitForPrompt", () => {
  it("uses the mobile archetype on mobile platforms and desktop elsewhere", () => {
    const kit = MOCKUP_BRAND_KITS.find((candidate) => candidate.id === "trailhead")
    assert.ok(kit)
    const mobile = formatMockupBrandKitForPrompt(kit, "native-mobile-app")
    const desktop = formatMockupBrandKitForPrompt(kit, "desktop-web")
    assert.ok(mobile.includes(kit.archetype.mobile))
    assert.ok(!mobile.includes(kit.archetype.desktop))
    assert.ok(desktop.includes(kit.archetype.desktop))
  })

  it("carries the literal accent hex, semantic ramp, radius, and type pairing", () => {
    const kit = MOCKUP_BRAND_KITS[0]
    const block = formatMockupBrandKitForPrompt(kit, "desktop-web")
    assert.ok(block.includes(kit.accentHex))
    assert.ok(block.includes(kit.semantic.success))
    assert.ok(block.includes(kit.semantic.error))
    assert.ok(block.includes(`${kit.radius}px`))
    assert.ok(block.includes(kit.typePairing))
  })

  it("notes semantic clashes when the accent sits near a status hue", () => {
    const clashing = MOCKUP_BRAND_KITS.find((kit) => kit.semanticClashes.length > 0)
    assert.ok(clashing, "bank should contain at least one clash case (e.g. a green or red accent)")
    const block = formatMockupBrandKitForPrompt(clashing, "desktop-web")
    assert.ok(block.includes("icons and position"))
  })
})

describe("isMockupBrandDirectionsEnabled", () => {
  const original = process.env.MOCKUP_BRAND_DIRECTIONS_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.MOCKUP_BRAND_DIRECTIONS_ENABLED
    else process.env.MOCKUP_BRAND_DIRECTIONS_ENABLED = original
  })

  it("defaults on, and honors 0 / false as off", () => {
    delete process.env.MOCKUP_BRAND_DIRECTIONS_ENABLED
    assert.equal(isMockupBrandDirectionsEnabled(), true)
    process.env.MOCKUP_BRAND_DIRECTIONS_ENABLED = "0"
    assert.equal(isMockupBrandDirectionsEnabled(), false)
    process.env.MOCKUP_BRAND_DIRECTIONS_ENABLED = "false"
    assert.equal(isMockupBrandDirectionsEnabled(), false)
    process.env.MOCKUP_BRAND_DIRECTIONS_ENABLED = "1"
    assert.equal(isMockupBrandDirectionsEnabled(), true)
  })
})

describe("anti-slop rules", () => {
  it("renders every rule into the system prompt block", () => {
    const block = formatMockupAntiSlopRules()
    for (const rule of MOCKUP_ANTI_SLOP_RULES) {
      assert.ok(block.includes(rule))
    }
  })
})
