import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"

import * as BrandIcons from "./brand-icons"

/**
 * Each exported icon must carry the exact geometry of its brand-kit source SVG
 * (`brand/generated/2026-07-30-maker-compass/icons/`). Rendering the wrong
 * glyph, or drifting from the kit, fails here — generic attribute checks would
 * not catch either.
 */
const KIT_DIR = join(process.cwd(), "brand/generated/2026-07-30-maker-compass/icons")

const ICON_TO_KIT_FILE: Record<string, string> = {
  ArrowRight: "arrow-right.svg",
  Bell: "bell.svg",
  Check: "check.svg",
  Plus: "plus.svg",
  Settings: "settings.svg",
  User: "user.svg",
  X: "close.svg",
}

/** Path `d` strings (and circle cx/cy/r triples) in document order. */
function geometry(markup: string): string[] {
  const shapes: string[] = []
  for (const match of markup.matchAll(/<path d="([^"]+)"/g)) shapes.push(match[1])
  for (const match of markup.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g)) {
    shapes.push(`circle:${match[1]},${match[2]},${match[3]}`)
  }
  return shapes.sort()
}

for (const [exportName, kitFile] of Object.entries(ICON_TO_KIT_FILE)) {
  test(`brand icon ${exportName} matches kit geometry (${kitFile})`, () => {
    const Icon = BrandIcons[exportName as keyof typeof BrandIcons]
    assert.ok(Icon, `missing export ${exportName}`)
    const rendered = renderToStaticMarkup(<Icon />)
    const kit = readFileSync(join(KIT_DIR, kitFile), "utf8")

    assert.deepEqual(geometry(rendered), geometry(kit), "path data drifted from the kit")
    // Construction rules from the kit: 1.5px stroke, butt caps, miter joins,
    // currentColor, 24x24 viewBox.
    for (const attr of [
      'viewBox="0 0 24 24"',
      'stroke="currentColor"',
      'stroke-width="1.5"',
      'stroke-linecap="butt"',
      'stroke-linejoin="miter"',
      'fill="none"',
    ]) {
      assert.ok(rendered.includes(attr), `missing ${attr}`)
    }
  })
}

test("swapped call sites no longer import brand glyph names from lucide-react", () => {
  // The Phase 2 swap inventory: every file that moved one of the seven brand
  // glyphs off lucide. Importing the same name from lucide again in these
  // files is a regression back to the rounded style.
  const swapped: Record<string, string[]> = {
    "src/app/page.tsx": ["ArrowRight"],
    "src/app/forgot-password/page.tsx": ["Check"],
    "src/app/(dashboard)/preferences/page.tsx": ["Bell", "Settings", "User"],
    "src/components/ui/artifact-lightbox.tsx": ["Check", "X"],
    "src/components/ui/dropdown-menu.tsx": ["Check"],
    "src/components/landing/faq-section.tsx": ["Plus"],
    "src/components/landing/waitlist-form.tsx": ["ArrowRight"],
    "src/components/landing/contact-form.tsx": ["ArrowRight"],
    "src/components/landing/landing-idea-capture.tsx": ["ArrowRight"],
    "src/components/analysis/ai-prompt-files.tsx": ["Check"],
    "src/components/auth/auth-modal.tsx": ["X"],
    "src/components/auth/auth-form-content.tsx": ["Check"],
    "src/components/projects/project-limit-dialog.tsx": ["X"],
    "src/components/projects/intake-question-step.tsx": ["Check"],
    "src/components/workspace/mobile-document-bar.tsx": ["X"],
    "src/components/pricing/plan-card.tsx": ["Check"],
  }

  for (const [file, names] of Object.entries(swapped)) {
    const source = readFileSync(join(process.cwd(), file), "utf8")
    const lucideImport = source.match(/import \{([^}]+)\} from "lucide-react"/)
    const lucideNames = lucideImport
      ? lucideImport[1].split(",").map((name) => name.trim())
      : []
    for (const name of names) {
      assert.ok(
        !lucideNames.includes(name),
        `${file} imports ${name} from lucide-react; use @/components/icons/brand-icons`
      )
      assert.ok(
        source.includes("@/components/icons/brand-icons"),
        `${file} lost its brand-icons import`
      )
    }
  }
})
