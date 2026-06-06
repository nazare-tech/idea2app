import { notFound } from "next/navigation"

import { MockupGenerationLoader } from "@/components/ui/mockup-generation-loader"
import { MockupRenderer } from "@/components/ui/mockup-renderer"
import { OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE } from "@/lib/openrouter-image-mockup-format"

export const dynamic = "force-static"

const screens = [
  {
    name: "Intake complete",
    caption: "Capture context",
    purpose: "Show setup data already entered",
    happyPathState: "The user has provided the key project inputs",
  },
  {
    name: "Active workspace",
    caption: "Use the workflow",
    purpose: "Show the main product surface in use",
    happyPathState: "The workspace has generated useful working context",
  },
  {
    name: "Value delivered",
    caption: "Review output",
    purpose: "Show the primary value moment",
    happyPathState: "The user can act on the finished result",
  },
]

function buildStoryboardSvg(label: string, title: string) {
  const accent = label === "A" ? "#2563eb" : label === "B" ? "#0f766e" : "#7c3aed"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="672" viewBox="0 0 1536 672">
    <rect width="1536" height="672" fill="#ffffff"/>
    <text x="64" y="68" fill="#0f172a" font-family="Arial, sans-serif" font-size="32" font-weight="700">Option ${label}: ${title}</text>
    <text x="64" y="104" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Storyboard preview fixture</text>
    <g transform="translate(64 148)">
      <rect width="420" height="360" rx="22" fill="#f8fafc" stroke="#dbe4ee" stroke-width="2"/>
      <rect x="28" y="28" width="364" height="56" rx="16" fill="${accent}"/>
      <rect x="28" y="116" width="250" height="22" rx="11" fill="#334155"/>
      <rect x="28" y="162" width="330" height="16" rx="8" fill="#94a3b8"/>
      <rect x="28" y="206" width="150" height="92" rx="16" fill="#e2e8f0"/>
      <rect x="204" y="206" width="154" height="92" rx="16" fill="#dbeafe"/>
      <text x="0" y="412" fill="#475569" font-family="Arial, sans-serif" font-size="18">1. Intake complete</text>
    </g>
    <g transform="translate(558 148)">
      <rect width="420" height="360" rx="22" fill="#f8fafc" stroke="#dbe4ee" stroke-width="2"/>
      <rect x="28" y="28" width="130" height="304" rx="18" fill="#e2e8f0"/>
      <rect x="190" y="28" width="202" height="34" rx="17" fill="${accent}"/>
      <rect x="190" y="96" width="156" height="20" rx="10" fill="#334155"/>
      <rect x="190" y="144" width="202" height="16" rx="8" fill="#94a3b8"/>
      <rect x="190" y="190" width="202" height="78" rx="16" fill="#ccfbf1"/>
      <text x="0" y="412" fill="#475569" font-family="Arial, sans-serif" font-size="18">2. Active workspace</text>
    </g>
    <g transform="translate(1052 148)">
      <rect width="420" height="360" rx="22" fill="#f8fafc" stroke="#dbe4ee" stroke-width="2"/>
      <rect x="28" y="28" width="292" height="24" rx="12" fill="#334155"/>
      <rect x="28" y="86" width="364" height="72" rx="18" fill="#ede9fe"/>
      <rect x="28" y="184" width="172" height="112" rx="18" fill="${accent}" opacity="0.88"/>
      <rect x="220" y="184" width="172" height="112" rx="18" fill="#e2e8f0"/>
      <text x="0" y="412" fill="#475569" font-family="Arial, sans-serif" font-size="18">3. Value delivered</text>
    </g>
  </svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const content = JSON.stringify({
  type: OPENROUTER_IMAGE_MOCKUP_STORYBOARD_SOURCE,
  model: "fixture/mockup-no-credit",
  generatedAt: "2026-05-25T12:00:00.000Z",
  options: [
    {
      label: "A",
      title: "Focused dashboard",
      imageUrl: buildStoryboardSvg("A", "Focused dashboard"),
      storagePath: "fixture/preview/option-a-storyboard.svg",
      description: "Dense but calm workflow with fast scanning and obvious next actions.",
      contentType: "image/svg+xml",
      screens,
      width: 1536,
      height: 672,
    },
    {
      label: "B",
      title: "Guided workflow",
      imageUrl: buildStoryboardSvg("B", "Guided workflow"),
      storagePath: "fixture/preview/option-b-storyboard.svg",
      description: "Step-by-step product flow that emphasizes progression and decision support.",
      contentType: "image/svg+xml",
      screens,
      width: 1536,
      height: 672,
    },
    {
      label: "C",
      title: "Executive overview",
      imageUrl: buildStoryboardSvg("C", "Executive overview"),
      storagePath: "fixture/preview/option-c-storyboard.svg",
      description: "Polished overview direction with stronger hierarchy and presentation value.",
      contentType: "image/svg+xml",
      screens,
      width: 1536,
      height: 672,
    },
  ],
})

export default function MockupRendererPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <header>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Local development
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Storyboard Mockup Renderer Preview</h1>
        </header>
        <section className="rounded-lg bg-card px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-4">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Generation state
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Design mockups loading preview</h2>
          </div>
          <MockupGenerationLoader />
        </section>

        <MockupRenderer content={content} projectId="preview" projectName="Preview" />
      </div>
    </main>
  )
}
