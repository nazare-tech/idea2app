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

function countMatches(html: string, pattern: RegExp) {
  return html.match(pattern)?.length ?? 0
}

function buildV2Fixture() {
  const sections: Record<CompetitiveAnalysisV2SectionName, string> = {
    "Executive Summary":
      "This category has real demand, but underserved workflows still exist for smaller teams.",
    "Opportunity Verdict":
      "Win with a narrow wedge.\n\n- **Verdict**: Enter with a wedge\n- **Why now**: Buyers want automation\n- **Biggest risk**: Incumbent copy",
    "Direct Competitors":
      "### [Competitor One](https://competitor-one.example)\n- **Overview**: Broad platform\n- **Core Product/Service**: Workflow suite\n- **Market Positioning**: Generalist\n- **Strengths**: Strong distribution\n- **Key Edge**: Distribution engine\n- **Limitations**: Heavy onboarding\n- **Pricing Model**: Per seat\n- **Target Audience**: Mid-market\n\n### Competitor Two\n- **Overview**: Focused operator tool\n- **Core Product/Service**: Booking workflow automation\n- **Market Positioning**: Vertical specialist\n- **Strengths**: Fast setup\n- **Key Edge**: Mobile-first operations\n- **Limitations**: Narrow integration surface\n- **Pricing Model**: Usage-based\n- **Target Audience**: Solo service teams",
    "Feature Comparison":
      "| Product | Setup | Collaboration |\n|---|---|---|\n| Competitor One | Medium | Strong |",
    "Pricing Comparison":
      "| Product | Free Tier | Pricing Model |\n|---|---|---|\n| Competitor One | No | Per seat |",
    "Best Customer Segments": "- SMB teams remain under-served.",
    "Competitive Landscape Overview":
      "- The top of the market is crowded.\n- Clear workflow differentiation still matters.",
    "Positioning Map":
      "- **X-axis**: Ease of setup\n- **Y-axis**: Collaboration depth\n\n| Competitor | X Score | Y Score | Placement Rationale |\n|---|---:|---:|---|\n| Competitor One | 5 | 8 | Broad platform |",
    "How You'll Reach Customers": "- SEO is strong.\n- Integrations matter.",
    "Gap Analysis": "- Teams want faster setup.\n- Transparent pricing is scarce.",
    "Ways to Stand Out": "- Lead with transparent pricing.",
    "What Makes It Hard to Copy": "- Integration depth is the best moat.",
    "SWOT Analysis":
      "| | Positive | Negative |\n|---|---|---|\n| **Internal** | Focus | Small team |\n| **External** | White space | Copy risk |",
    "Risks & Competitor Responses": "- Incumbents can copy a visible wedge.",
    "First Version Focus":
      "Ship one workflow first.\n\n- **Target user**: SMB operator\n- **Core loop**: Weekly task automation",
    "Recommended Next Moves":
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

  assert.match(html, /Market Research/)
  assert.match(html, /Competitor Profiles &amp; Quick Comparison/)
  assert.match(html, /Opportunity Verdict/)
  assert.match(html, /Win with a narrow wedge\./)
  assert.match(html, /href="https:\/\/competitor-one\.example"/)
  assert.match(html, /Key Edge/)
  assert.match(html, /Distribution engine/)
  assert.doesNotMatch(html, /predates Market Research v2/)
  assert.doesNotMatch(html, /Markdown/)
})

test("competitive overview renders only executive summary and opportunity verdict", () => {
  const html = renderToStaticMarkup(
    <CompetitiveOverviewSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(html, /Overview/)
  assert.match(html, /-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10/)
  assert.doesNotMatch(html, /border-b border-\[#E0E0E0\]/)
  assert.match(html, /Market Snapshot &amp; Entry Thesis/)
  assert.match(html, /Opportunity Verdict/)
  assert.match(html, /Win with a narrow wedge\./)
  assert.doesNotMatch(html, /border border-\[#E0E0E0\] bg-white px-6 py-5/)
  assert.doesNotMatch(html, /space-y-2 px-6 py-5/)
  assert.doesNotMatch(html, /px-6 pb-6/)
  assert.doesNotMatch(html, /Competitor Profiles &amp; Quick Comparison/)
  assert.doesNotMatch(html, /border rounded-none/)
  assert.doesNotMatch(html, /border-\[#D8CEC5\] bg-\[#F5F0EB\]/)
  assert.doesNotMatch(html, /Competitor One/)
  assert.doesNotMatch(html, /Recommended Next Moves/)
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
  assert.match(html, /-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10/)
  assert.doesNotMatch(html, /border-b border-\[#E0E0E0\]/)
  assert.match(html, /Competitor Profiles &amp; Quick Comparison/)
  assert.match(html, /Competitor One/)
  assert.match(html, /Best Customer Segments/)
  assert.match(html, /How You&#x27;ll Reach Customers/)
  assert.match(html, /Recommended Next Moves/)
  assert.match(html, /Validate pricing willingness/)
  assert.doesNotMatch(html, /border border-\[#E0E0E0\] bg-white px-6 py-5/)
  assert.doesNotMatch(html, /space-y-2 px-6 py-5/)
  assert.doesNotMatch(html, /px-6 pb-6/)
  assert.doesNotMatch(html, /border rounded-none/)
  assert.doesNotMatch(html, /border-\[#D8CEC5\] bg-\[#F5F0EB\]/)
})

test("competitive detail consolidates competitor profile cards into one quick comparison table", () => {
  const html = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(html, /Competitor Profiles &amp; Quick Comparison/)
  assert.match(html, /w-\[clamp\(960px,100%,1240px\)\] table-fixed/)
  assert.equal(countMatches(html, /max-w-\[310px\]/g), 12)
  assert.match(html, /Commercial Fit/)
  assert.match(html, /Advantage \/ Risk/)
  assert.match(html, /Broad platform/)
  assert.match(html, /Workflow suite/)
  assert.match(html, /Generalist/)
  assert.match(html, /Strong distribution/)
  assert.match(html, /Distribution engine/)
  assert.match(html, /Heavy onboarding/)
  assert.match(html, /Per seat/)
  assert.match(html, /Mid-market/)
  assert.match(html, /Focused operator tool/)
  assert.match(html, /Booking workflow automation/)
  assert.match(html, /Usage-based/)
  assert.match(html, /Solo service teams/)
  assert.equal(countMatches(html, /href="https:\/\/competitor-one\.example"/g), 1)
  assert.doesNotMatch(html, /<article/)
  assert.doesNotMatch(html, /<colgroup>/)
  assert.doesNotMatch(html, /Competitor Profiles &amp; Fast Comparison/)
  assert.doesNotMatch(html, />PROFILE</)
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
