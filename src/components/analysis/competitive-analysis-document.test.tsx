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

function buildV2Fixture(
  overrides: Partial<Record<CompetitiveAnalysisV2SectionName, string>> = {}
) {
  const sections: Record<CompetitiveAnalysisV2SectionName, string> = {
    "Executive Summary":
      "This category has real demand, but underserved workflows still exist for smaller teams.\n\nWin with a narrow wedge.\n\n- **Verdict**: Enter with a wedge\n- **Why now**: Buyers want automation\n- **Biggest risk**: Incumbent copy",
    "Direct Competitors":
      "### [Competitor One](https://competitor-one.example.com)\n- **Overview**: Broad platform\n- **Core Product/Service**: Workflow suite\n- **Market Positioning**: Generalist\n- **Strengths**: Strong distribution\n- **Key Edge**: Distribution engine\n- **Limitations**: Heavy onboarding\n- **Pricing Model**: Per seat\n- **Target Audience**: Mid-market\n\n### Competitor Two\n- **Overview**: Focused operator tool\n- **Core Product/Service**: Booking workflow automation\n- **Market Positioning**: Vertical specialist\n- **Strengths**: Fast setup\n- **Key Edge**: Mobile-first operations\n- **Limitations**: Narrow integration surface\n- **Pricing Model**: Usage-based\n- **Target Audience**: Solo service teams",
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
    "First Version Focus":
      "Ship one workflow first.\n\n- **Target user**: SMB operator\n- **Core loop**: Weekly task automation",
    "Recommended Next Moves":
      "1. Validate pricing willingness.\n2. Launch narrow.\n3. Invest in integrations.",
  }
  const mergedSections = { ...sections, ...overrides }

  return `# Competitive Analysis: Example Product\n\n${COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.map(
    (heading) => `## ${heading}\n${mergedSections[heading]}`
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
  assert.match(html, /Win with a narrow wedge\./)
  assert.match(html, /Assessment: Enter with a wedge/)
  assert.doesNotMatch(html, /Verdict: Enter with a wedge/)
  assert.match(html, /href="https:\/\/competitor-one\.example\.com\/"/)
  assert.match(html, /Key Edge/)
  assert.match(html, /Distribution engine/)
  assert.doesNotMatch(html, /predates Market Research v2/)
  assert.doesNotMatch(html, /Markdown/)
})

test("verified competitor sources link repeated mentions across structured Market Research", () => {
  const content = buildV2Fixture({
    "Executive Summary":
      "Competitor One leads the category, while Competitor Two remains unverified.\n\nCompetitor One has strong distribution.\n\n- **Assessment**: Differentiate from Competitor One\n- **Why now**: Buyers want automation\n- **Biggest risk**: Competitor One copies the wedge",
    "Direct Competitors":
      "### [Competitor One](https://stale-competitor-one.example.com)\n- **Overview**: Broad platform compared with Competitor Two\n- **Core Product/Service**: Workflow suite\n- **Market Positioning**: Generalist\n- **Strengths**: Strong distribution\n- **Key Edge**: Distribution engine\n- **Limitations**: Heavy onboarding\n- **Pricing Model**: Per seat\n- **Target Audience**: Mid-market\n\n### Competitor Two\n- **Overview**: Focused operator tool\n- **Core Product/Service**: Booking workflow automation\n- **Market Positioning**: Vertical specialist\n- **Strengths**: Fast setup\n- **Key Edge**: Mobile-first operations\n- **Limitations**: Narrow integration surface\n- **Pricing Model**: Usage-based\n- **Target Audience**: Solo service teams",
    "Feature Comparison":
      "Competitor One leads collaboration.\n\n| Dimension | Competitor One | Competitor Two |\n|---|---|---|\n| Setup | Medium | Fast |\n| Collaboration | Strong | Medium |",
    "Pricing Comparison":
      "| Product | Free Tier | Pricing Model |\n|---|---|---|\n| Competitor One | No | Per seat |",
    "Competitive Landscape Overview":
      "- Competitor One owns the broad-platform position.",
    "Positioning Map":
      "- **X-axis**: Competitor One compatibility\n- **Y-axis**: Collaboration depth\n\n| Competitor | X Score | Y Score | Placement Rationale | Evidence Confidence |\n|---|---:|---:|---|---|\n| Competitor One | 5 | 8 | Competitor One has broad reach | Competitor One public docs |",
  })
  const metadata = {
    document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
    live_research: {
      competitor_sources: [
        { name: "Competitor One", url: "https://competitor-one.example.com" },
        { name: "Unsafe", url: "javascript:alert(1)" },
      ],
    },
  }

  const overviewHtml = renderToStaticMarkup(
    <CompetitiveOverviewSection
      content={content}
      metadata={metadata}
      projectId="project-1"
    />
  )
  const detailHtml = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={content}
      metadata={metadata}
      projectId="project-1"
    />
  )

  for (const html of [overviewHtml, detailHtml]) {
    assert.match(
      html,
      /href="https:\/\/competitor-one\.example\.com\/"[^>]*target="_blank"[^>]*rel="noreferrer"/
    )
    assert.match(html, /class="[^"]*underline[^"]*underline-offset/)
    assert.doesNotMatch(html, /javascript:alert/)
  }

  assert.doesNotMatch(detailHtml, /href="https:\/\/stale-competitor-one\.example\.com\/"/)
  assert.match(detailHtml, />Competitor One<\/a> has broad reach/)
  assert.match(detailHtml, />Competitor One<\/a> public docs/)
  assert.match(detailHtml, /<th[^>]*>[^<]*<a[^>]*>Competitor One<\/a>/)
  assert.match(detailHtml, />Competitor One<\/a> compatibility/)
  assert.match(detailHtml, /href="https:\/\/www\.google\.com\/search\?q=Competitor(?:%20|\+)Two"/)
  assert.doesNotMatch(
    detailHtml,
    /href="https:\/\/competitor-one\.example\.com\/"[^>]*>Competitor Two<\/a>/
  )
})

test("new evidence metadata fails closed instead of rendering synthesized H3 links", () => {
  const html = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={buildV2Fixture()}
      metadata={{
        document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
        live_research: { competitor_sources: [] },
      }}
      projectId="project-1"
    />
  )

  // New reports treat metadata as authoritative. A model-authored H3 URL is
  // ignored when no evidence-backed pair exists, and the explicit competitor
  // cell uses the existing search fallback instead.
  assert.equal(
    countMatches(html, /href="https:\/\/competitor-one\.example\.com\//g),
    0
  )
  assert.match(
    html,
    /href="https:\/\/www\.google\.com\/search\?q=Competitor(?:%20|\+)One"/
  )
})

test("competitive overview renders one merged executive summary block", () => {
  const html = renderToStaticMarkup(
    <CompetitiveOverviewSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(html, /Executive Summary/)
  assert.match(html, /Market snapshot, entry assessment, and key risk\./)
  assert.match(html, /Assessment: Enter with a wedge/)
  assert.doesNotMatch(html, /Verdict: Enter with a wedge/)
  assert.doesNotMatch(html, /Opportunity Verdict/)
  assert.match(html, /text-\[22px\] font-medium leading-\[33px\] tracking-\[-0\.01em\]/)
  assert.doesNotMatch(html, /Market Intelligence/)
  assert.doesNotMatch(html, /-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10/)
  assert.doesNotMatch(html, /border-b border-\[#E0E0E0\]/)
  assert.match(html, /id="executive-summary"/)
  assert.doesNotMatch(html, /id="overview-executive-summary"/)
  assert.equal(html.includes("01 / 02"), false)
  assert.equal(html.includes("02 / 02"), false)
  assert.doesNotMatch(html, /Market Snapshot &amp; Entry Thesis/)
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
  assert.match(html, /Competitive landscape, customer segments, positioning, and recommended next moves\./)
  assert.doesNotMatch(html, /Deep Analysis/)
  assert.doesNotMatch(html, /-mx-5 bg-transparent px-5 pb-5 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10/)
  assert.doesNotMatch(html, /border-b border-\[#E0E0E0\]/)
  assert.match(html, /Direct Competitors/)
  assert.doesNotMatch(html, /Competitor Profiles &amp; Quick Comparison/)
  assert.match(html, /Competitor One/)
  assert.match(html, /Best Customer Segments/)
  assert.match(html, /How You&#x27;ll Reach Customers/)
  assert.equal(countMatches(html, /How You&#x27;ll Reach Customers/g), 1)
  assert.equal(countMatches(html, /Best Customer Segments/g), 1)
  assert.doesNotMatch(html, /Risks &amp; Competitor Responses/)
  assert.doesNotMatch(html, /Incumbents can copy a visible wedge/)
  assert.doesNotMatch(html, /Competitor response/)
  assert.doesNotMatch(html, /Internal \/ Positive/)
  assert.doesNotMatch(html, /Internal \/ Negative/)
  assert.doesNotMatch(html, /External \/ Positive/)
  assert.doesNotMatch(html, /External \/ Negative/)
  assert.match(html, /aria-label="Explain Positioning Map"/)
  assert.match(html, /aria-label="Explain Gap Analysis"/)
  assert.match(html, /aria-label="Explain Ways to Stand Out"/)
  assert.match(html, /aria-label="Explain What Makes It Hard to Copy"/)
  assert.match(html, /aria-label="Explain First Version Focus"/)
  assert.match(html, /Recommended Next Moves/)
  assert.match(html, /Validate pricing willingness/)
  assert.doesNotMatch(html, /border border-\[#E0E0E0\] bg-white px-6 py-5/)
  assert.doesNotMatch(html, /space-y-2 px-6 py-5/)
  assert.doesNotMatch(html, /px-6 pb-6/)
  assert.doesNotMatch(html, /border rounded-none/)
  assert.doesNotMatch(html, /border-\[#D8CEC5\] bg-\[#F5F0EB\]/)
})

test("competitive detail renders positioning scale and does not plot invalid scores", () => {
  const html = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={buildV2Fixture({
        "Positioning Map":
          "- **X-axis**: Ease of setup\n- **Y-axis**: Collaboration depth\n\n| Competitor | X Score | Y Score | Placement Rationale | Evidence Confidence |\n|---|---:|---:|---|---|\n| Competitor One | 5 | 8 | Broad platform | High: public docs |\n| Missing Score | unknown | 2 | Setup score unavailable | Low: insufficient evidence |",
      })}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  // Score-bar profiles replaced the scatter plot: axis labels, per-axis
  // scores, and no absolute-positioned plot points.
  assert.match(html, /Ease of setup/)
  assert.match(html, /Collaboration depth/)
  assert.match(html, /5\/10/)
  assert.match(html, /8\/10/)
  assert.match(html, /width:50%/)
  assert.match(html, /width:80%/)
  assert.match(html, /data-positioning-state="scored"/)
  assert.match(html, /aria-label="Competitor One: X 5\/10, Y 8\/10/)
  assert.match(html, /Unscored placements/)
  assert.match(html, /Missing Score/)
  assert.equal(countMatches(html, /data-positioning-state="scored"/g), 1)
  assert.equal(countMatches(html, /data-positioning-state="unscored"/g), 1)
  assert.doesNotMatch(html, /Positioning map with 0 to 10 X and Y score axes/)
})

test("competitive detail consolidates competitor profile cards into one quick comparison table", () => {
  const html = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(html, /Direct Competitors/)
  assert.doesNotMatch(html, /Competitor Profiles &amp; Quick Comparison/)
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
  assert.equal(countMatches(html, /href="https:\/\/competitor-one\.example\.com\//g), 4)
  // Positioning score profiles are the only allowed <article> elements;
  // competitor profiles must stay consolidated into the comparison table.
  assert.equal(
    countMatches(html, /<article/g),
    countMatches(html, /data-positioning-state="scored"/g),
  )
  assert.doesNotMatch(html, /<colgroup>/)
  assert.doesNotMatch(html, /Competitor Profiles &amp; Fast Comparison/)
  assert.doesNotMatch(html, />PROFILE</)
})

test("competitive detail shows fallback direct competitors without the fallback notice", () => {
  const html = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={buildV2Fixture({
        "Executive Summary":
          "The market is active, but this report lacks verified live competitor evidence.\n\nEvidence needs validation.\n\n- **Assessment**: Research before positioning\n- **Why now**: Buyers want trusted pet care\n- **Biggest risk**: Because no live competitor data was provided for this analysis, company-level claims are unverified",
        "Direct Competitors":
          "*Note: As no live competitor data was provided, the following profiles are conservative inferences.*\n\n### Rover\n- **Overview**: Inferred pet care incumbent\n- **Core Product/Service**: Pet services marketplace\n- **Market Positioning**: Broad consumer pet care\n- **Strengths**: Brand awareness\n- **Key Edge**: Marketplace liquidity\n- **Limitations**: Less focused on small animals\n- **Pricing Model**: Marketplace fee\n- **Target Audience**: Pet owners",
      })}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(html, /Direct Competitors/)
  assert.doesNotMatch(html, /evidence-limited candidates/)
  assert.doesNotMatch(html, /no live competitor data was provided/)
  assert.match(html, /Inferred pet care incumbent/)
  assert.match(html, /Marketplace liquidity/)
})

test("competitive markdown fallback hides saved direct competitor fallback notice", () => {
  const malformedContent = buildV2Fixture({
    "Direct Competitors":
      "Live competitor research was unavailable for this run, so these direct competitor profiles are evidence-limited candidates. Verify company fit, URLs, pricing, and positioning before relying on them.\n\n### Rover\n- **Overview**: Inferred pet care incumbent\n- **Pricing Model**: Verification needed",
  }).replace("## How You'll Reach Customers", "## Sales Plan")

  const html = renderToStaticMarkup(
    <CompetitiveAnalysisDocument
      content={malformedContent}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(html, /Designed modules view unavailable/)
  assert.match(html, /Direct Competitors/)
  assert.match(html, /Rover/)
  assert.match(html, /Inferred pet care incumbent/)
  assert.match(html, /Verification needed/)
  assert.doesNotMatch(html, /Live competitor research was unavailable/)
  assert.doesNotMatch(html, /evidence-limited candidates/)
  assert.doesNotMatch(html, /Verify company fit/)
})

test("competitive renderer normalizes redundant opportunity verdict into modules", () => {
  const oldShapeContent = `# Competitive Analysis: Fuel Kit

## Executive Summary
The category is active and crowded.

## Opportunity Verdict
Focused wedge can win.

- **Verdict**: Worth testing
- **Why now**: Buyers want better planning
- **Biggest risk**: Incumbent copy

## Direct Competitors
### Competitor One
- **Overview**: Broad platform

## Feature Comparison
Feature notes

## Pricing Comparison
Pricing notes

## Best Customer Segments
- Busy operators

## Competitive Landscape Overview
- Crowded top end

## Positioning Map
- **X-axis**: Ease
- **Y-axis**: Depth

## How You'll Reach Customers
- SEO

## Gap Analysis
- Lightweight workflows

## Ways to Stand Out
- Transparent pricing

## What Makes It Hard to Copy
- Embedded workflow context

## First Version Focus
Launch one workflow.

## Recommended Next Moves
1. Interview buyers`

  const overviewHtml = renderToStaticMarkup(
    <CompetitiveOverviewSection
      content={oldShapeContent}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )
  const detailHtml = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={oldShapeContent}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.match(overviewHtml, /id="executive-summary"/)
  assert.match(overviewHtml, /Focused wedge can win/)
  assert.doesNotMatch(overviewHtml, /no longer matches/)
  assert.doesNotMatch(overviewHtml, /Opportunity Verdict/)
  assert.doesNotMatch(overviewHtml, /Direct Competitors/)
  assert.match(detailHtml, /Market Research/)
  assert.match(detailHtml, /id="market-research-direct-competitors"/)
  assert.match(detailHtml, /id="market-research-feature-matrix"/)
  assert.match(detailHtml, /Commercial Fit/)
  assert.match(detailHtml, /Direct Competitors/)
  assert.doesNotMatch(detailHtml, /market-research-risks/)
  assert.doesNotMatch(detailHtml, /Risks &amp; Competitor Responses/)
  assert.doesNotMatch(detailHtml, /Internal \/ Positive/)
  assert.match(detailHtml, /Recommended Next Moves/)
  assert.doesNotMatch(detailHtml, /no longer matches/)
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

test("legacy markdown preserves authored links without automatic mention enrichment", () => {
  const html = renderToStaticMarkup(
    <CompetitiveAnalysisDocument
      content={
        "# Competitive Analysis: Legacy\n\nPlain Competitor One mention. [Authored link](https://authored.example)."
      }
      metadata={{
        live_research: {
          competitor_sources: [
            { name: "Competitor One", url: "https://competitor-one.example.com" },
          ],
        },
      }}
      currentVersion={0}
      projectId="project-1"
    />
  )

  assert.doesNotMatch(html, /href="https:\/\/competitor-one\.example\.com\/"/)
  assert.match(html, /href="https:\/\/authored\.example"/)
})

test("positioning map shows the 0/10 legend once and short axis names on bars", () => {
  const html = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={buildV2Fixture({
        "Positioning Map":
          "- **X-Axis: Workflow Automation** (0 = Fully manual editing and research, 10 = Fully autonomous AI generation and iteration)\n- **Y-Axis: Strategic Intelligence** (0 = Basic historical analytics, 10 = Predictive closed-loop testing)\n\n| Competitor | X Score | Y Score | Placement Rationale |\n|---|---:|---:|---|\n| Competitor One | 4 | 8 | Strong teamwork, slower setup |\n| Competitor Two | 8 | 3 | Fast setup, weaker collaboration |",
      })}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  assert.equal(countMatches(html, /How to read the scores/g), 1)
  // Endpoint definitions render once in the legend, not on every competitor bar.
  assert.equal(countMatches(html, /Fully manual editing and research/g), 1)
  assert.equal(countMatches(html, /Basic historical analytics/g), 1)
  // Bars repeat only the short axis name: legend (1) plus visible label and
  // aria-label per scored competitor (2 x 2).
  assert.equal(countMatches(html, /Workflow Automation/g), 5)
  assert.equal(countMatches(html, /data-positioning-state="scored"/g), 2)
})

test("competitor without a verified URL falls back to a web search link", () => {
  const html = renderToStaticMarkup(
    <CompetitiveDetailSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
    />
  )

  // Competitor One keeps its verified URL; Competitor Two has none in the
  // document, so its name links to a search instead of rendering unlinked.
  assert.match(html, /href="https:\/\/competitor-one\.example\.com\/"/)
  assert.match(
    html,
    /href="https:\/\/www\.google\.com\/search\?q=Competitor(?:%20|\+)Two"/
  )
})

test("executive summary surfaces the proposed project name when provided", () => {
  const html = renderToStaticMarkup(
    <CompetitiveOverviewSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
      projectName="Influencer Growth Loop AI"
    />
  )

  assert.match(html, /Proposed Name/)
  assert.match(html, /Influencer Growth Loop AI/)

  const withoutName = renderToStaticMarkup(
    <CompetitiveOverviewSection
      content={buildV2Fixture()}
      metadata={{ document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION }}
      projectId="project-1"
      projectName="Untitled"
    />
  )
  assert.doesNotMatch(withoutName, /Proposed Name/)
})
