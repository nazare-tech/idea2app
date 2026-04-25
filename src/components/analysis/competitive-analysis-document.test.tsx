import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import {
  CompetitiveAnalysisDocument,
  CompetitiveDetailSection,
  CompetitiveOverviewSection,
} from "./competitive-analysis-document"
import {
  COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
  COMPETITIVE_ANALYSIS_V2_SECTION_ORDER,
  type CompetitiveAnalysisV2SectionName,
} from "@/lib/competitive-analysis-v2"

function buildV2Fixture() {
  const sections: Record<CompetitiveAnalysisV2SectionName, string> = {
    "Executive Summary":
      "This category has real demand, but underserved workflows still exist for smaller teams.",
    "Founder Verdict":
      "Win with a narrow wedge.\n\n- **Verdict**: Enter with a wedge\n- **Why now**: Buyers want automation\n- **Biggest risk**: Incumbent copy",
    "Direct Competitors":
      "### [Competitor One](https://competitor-one.example)\n- **Overview**: Broad platform\n- **Core Product/Service**: Workflow suite\n- **Market Positioning**: Generalist\n- **Strengths**: Strong distribution\n- **Key Edge**: Distribution engine\n- **Limitations**: Heavy onboarding\n- **Pricing Model**: Per seat\n- **Target Audience**: Mid-market",
    "Feature and Workflow Matrix":
      "| Product | Setup | Collaboration |\n|---|---|---|\n| Competitor One | Medium | Strong |",
    "Pricing and Packaging":
      "| Product | Free Tier | Pricing Model |\n|---|---|---|\n| Competitor One | No | Per seat |",
    "Audience Segments": "- SMB teams remain under-served.",
    "Competitive Landscape Overview":
      "- The top of the market is crowded.\n- Clear workflow differentiation still matters.",
    "Positioning Map":
      "- **X-axis**: Ease of setup\n- **Y-axis**: Collaboration depth\n\n| Competitor | X Score | Y Score | Placement Rationale |\n|---|---:|---:|---|\n| Competitor One | 5 | 8 | Broad platform |",
    "GTM / Distribution Signals": "- SEO is strong.\n- Integrations matter.",
    "Gap Analysis": "- Teams want faster setup.\n- Transparent pricing is scarce.",
    "Differentiation Wedges": "- Lead with transparent pricing.",
    "Moat and Defensibility": "- Integration depth is the best moat.",
    "SWOT Analysis":
      "| | Positive | Negative |\n|---|---|---|\n| **Internal** | Focus | Small team |\n| **External** | White space | Copy risk |",
    "Risks and Countermoves": "- Incumbents can copy a visible wedge.",
    "MVP Wedge Recommendation":
      "Ship one workflow first.\n\n- **Target user**: SMB operator\n- **Core loop**: Weekly task automation",
    "Strategic Recommendations":
      "1. Validate pricing willingness.\n2. Launch narrow.\n3. Invest in integrations.",
  }

  return `# Competitive Analysis: Example Product\n\n${COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.map(
    (heading) => `## ${heading}\n${sections[heading]}`
  ).join("\n\n")}`
}

test("competitive v2 document renders modules-first hybrid UI", () => {
  const html = renderToStaticMarkup(
    <CompetitiveAnalysisDocument
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      currentVersion={0}
      projectId="project-1"
    />
  )

  assert.match(html, /Competitive Research/)
  assert.match(html, /Competitor Profiles &amp; Fast Comparison/)
  assert.match(html, /Founder Verdict/)
  assert.match(html, /Win with a narrow wedge\./)
  assert.match(html, /href="https:\/\/competitor-one\.example"/)
  assert.match(html, /Key Edge/)
  assert.match(html, /Distribution engine/)
  assert.doesNotMatch(html, /predates Competitive Research v2/)
  assert.doesNotMatch(html, /Markdown/)
})

test("competitive overview renders only executive summary and founder verdict", () => {
  const html = renderToStaticMarkup(
    <CompetitiveOverviewSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(html, /Overview/)
  assert.match(html, /Market Snapshot &amp; Entry Thesis/)
  assert.match(html, /Founder Verdict/)
  assert.match(html, /Win with a narrow wedge\./)
  assert.doesNotMatch(html, /Competitor Profiles &amp; Fast Comparison/)
  assert.doesNotMatch(html, /Competitor One/)
  assert.doesNotMatch(html, /Strategic Recommendations/)
  assert.doesNotMatch(html, /Validate pricing willingness/)
  assert.doesNotMatch(html, /The top of the market is crowded/)
})

test("competitive detail owns market research and strategy modules", () => {
  const html = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(html, /Market Research/)
  assert.match(html, /Competitor Profiles &amp; Fast Comparison/)
  assert.match(html, /Competitor One/)
  assert.match(html, /Audience Segments/)
  assert.match(html, /GTM \/ Distribution Signals/)
  assert.match(html, /Strategic Recommendations/)
  assert.match(html, /Validate pricing willingness/)
})

test("legacy competitive document falls back to markdown renderer", () => {
  const html = renderToStaticMarkup(
    <CompetitiveAnalysisDocument
      content={"# Competitive Analysis: Legacy\n\n## Market Overview\nLegacy content"}
      metadata={null}
      currentVersion={0}
      projectId="project-1"
    />
  )

  // Legacy content falls back to MarkdownRenderer (no regenerate button since feature was removed)
  assert.match(html, /Competitive Analysis: Legacy/i)
  assert.doesNotMatch(html, /Regenerate as V2/)
})
