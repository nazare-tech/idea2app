import test from "node:test"
import assert from "node:assert/strict"
import {
  COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
  COMPETITIVE_ANALYSIS_V2_SECTION_ORDER,
  getCompetitiveAnalysisViewModel,
  parseCompetitiveAnalysisV2,
  type CompetitiveAnalysisV2SectionName,
} from "./competitive-analysis-v2"

function buildV2Fixture(
  overrides: Partial<Record<CompetitiveAnalysisV2SectionName, string>> = {}
) {
  const baseSections: Record<CompetitiveAnalysisV2SectionName, string> = {
    "Executive Summary":
      "This market is active and crowded, but the most valuable workflows are still fragmented for smaller teams.",
    "Founder Verdict":
      "A focused entrant can win if it avoids the broad all-in-one category fight.\n\n- **Verdict**: Worth entering with a narrow wedge\n- **Why now**: Teams want automation tied to outcomes\n- **Biggest risk**: Fast incumbent copy",
    "Direct Competitors":
      "### Competitor One\n- **Overview**: Strong incumbent\n- **Core Product/Service**: Workflow suite\n- **Market Positioning**: Broad platform\n- **Strengths**: Distribution and integrations\n- **Limitations**: Heavy onboarding\n- **Pricing Model**: Per seat\n- **Target Audience**: Mid-market teams\n\n### Competitor Two\n- **Overview**: Specialist player\n- **Core Product/Service**: Single workflow tool\n- **Market Positioning**: Best-of-breed\n- **Strengths**: Fast setup\n- **Limitations**: Narrow scope\n- **Pricing Model**: Usage-based\n- **Target Audience**: Operators",
    "Feature and Workflow Matrix":
      "| Product | Setup | Collaboration | Automation |\n|---|---|---|---|\n| Competitor One | Medium | Strong | Medium |\n| Competitor Two | Fast | Weak | Strong |",
    "Pricing and Packaging":
      "| Product | Free Tier | Pricing Model | Packaging Motion |\n|---|---|---|---|\n| Competitor One | No | Seat-based | Sales-assisted |\n| Competitor Two | Yes | Usage-based | Self-serve |",
    "Audience Segments":
      "- SMB teams are under-served when they need collaboration without enterprise overhead.\n- Agencies value repeatable workflows more than brand depth.",
    "Competitive Landscape Overview":
      "- The category is saturated at the top end.\n- Buyers compare onboarding speed and automation depth more than raw feature count.",
    "Positioning Map":
      "- **X-axis**: Ease of setup\n- **Y-axis**: Team collaboration depth\n\n| Competitor | X Score | Y Score | Placement Rationale |\n|---|---:|---:|---|\n| Competitor One | 4 | 8 | Strong teamwork, slower setup |\n| Competitor Two | 8 | 3 | Fast setup, weaker collaboration |",
    "GTM / Distribution Signals":
      "- SEO captures high-intent traffic.\n- Integrations matter because workflow adjacency drives discovery.",
    "Gap Analysis":
      "- Buyers still lack a lightweight team-first tool.\n- Transparent pricing remains rare in this category.",
    "Differentiation Wedges":
      "- Lead with transparent pricing.\n- Optimize for team workflows before feature breadth.",
    "Moat and Defensibility":
      "- Workflow lock-in can become meaningful if shared context and approvals are core.\n- Defensibility is weak without retained data or embedded integrations.",
    "SWOT Analysis":
      "| | Positive | Negative |\n|---|---|---|\n| **Internal** | Focused scope | Smaller brand |\n| **External** | Team whitespace | Incumbent copy risk |",
    "Risks and Countermoves":
      "- Incumbents can add the wedge if demand becomes obvious.\n- Distribution will fail if the ROI story is vague.",
    "MVP Wedge Recommendation":
      "Launch a single workflow that proves weekly time savings.\n\n- **Target user**: SMB operator\n- **Core loop**: Shared execution workflow\n- **Upgrade trigger**: Collaboration and automation limits",
    "Strategic Recommendations":
      "1. Validate willingness to pay with 10 buyer interviews.\n2. Ship one workflow before broadening the suite.\n3. Package the first paid tier around shared team value.",
  }

  const sections = { ...baseSections, ...overrides }

  return `# Competitive Analysis: Example Product\n\n${COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.map(
    (heading) => `## ${heading}\n${sections[heading]}`
  ).join("\n\n")}`
}

test("parseCompetitiveAnalysisV2 accepts a valid v2 document", () => {
  const parsed = parseCompetitiveAnalysisV2(buildV2Fixture())

  assert.equal(parsed.isValid, true)
  assert.equal(parsed.headings.length, 16)
  assert.equal(parsed.competitorEntries.length, 2)
  assert.match(parsed.sections["Pricing and Packaging"] ?? "", /Pricing Model/)
})

test("legacy metadata defaults competitive research to markdown view", () => {
  const viewModel = getCompetitiveAnalysisViewModel(buildV2Fixture(), null)

  assert.equal(viewModel.documentVersion, "legacy")
  assert.equal(viewModel.defaultView, "markdown")
  assert.equal(viewModel.canRenderModules, false)
  assert.match(viewModel.legacyNotice ?? "", /predates Competitive Research v2/i)
})

test("v2 metadata with malformed content falls back to markdown and warns", () => {
  const malformed = buildV2Fixture().replace(
    "## GTM / Distribution Signals",
    "## Go To Market"
  )
  const viewModel = getCompetitiveAnalysisViewModel(malformed, {
    document_version: COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
  })

  assert.equal(viewModel.documentVersion, COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION)
  assert.equal(viewModel.defaultView, "markdown")
  assert.equal(viewModel.canRenderModules, false)
  assert.match(viewModel.warning ?? "", /no longer matches/i)
})

test("evidence-light fallback text still yields a valid v2 document", () => {
  const parsed = parseCompetitiveAnalysisV2(
    buildV2Fixture({
      "Pricing and Packaging":
        "Evidence was insufficient to verify detailed pricing for every competitor.\n\n| Product | Free Tier | Pricing Model | Packaging Motion |\n|---|---|---|---|\n| Competitor One | Unknown | Evidence was insufficient to verify | Evidence was insufficient to verify |",
      "Moat and Defensibility":
        "- Evidence was insufficient to verify strong proprietary defensibility.\n- Available competitor research suggests defensibility will depend on integration depth.",
    })
  )

  assert.equal(parsed.isValid, true)
  assert.match(parsed.sections["Pricing and Packaging"] ?? "", /Evidence was insufficient/)
  assert.match(parsed.sections["Moat and Defensibility"] ?? "", /Available competitor research suggests/)
})
