import test from "node:test"
import assert from "node:assert/strict"
import {
  COMPETITIVE_ANALYSIS_V2_DOCUMENT_VERSION,
  COMPETITIVE_ANALYSIS_V2_SECTION_ORDER,
  COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP,
  getCompetitiveAnalysisStructuredData,
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
    "Opportunity Verdict":
      "A focused entrant can win if it avoids the broad all-in-one category fight.\n\n- **Verdict**: Worth entering with a narrow wedge\n- **Why now**: Teams want automation tied to outcomes\n- **Biggest risk**: Fast incumbent copy",
    "Direct Competitors":
      "### [Competitor One](https://competitor-one.example) (conservative inference)\n- **Overview**: Strong incumbent\n- **Core Product/Service**: Workflow suite\n- **Market Positioning**: Broad platform\n- **Strengths**: Distribution and integrations\n- **Key Edge**: Distribution + integrations\n- **Limitations**: Heavy onboarding\n- **Pricing Model**: Per seat\n- **Target Audience**: Mid-market teams\n\n### Competitor Two\n- **Overview**: Specialist player\n- **Core Product/Service**: Single workflow tool\n- **Market Positioning**: Best-of-breed\n- **Strengths**: Fast setup\n- **Key Edge**: Fastest setup in category\n- **Limitations**: Narrow scope\n- **Pricing Model**: Usage-based\n- **Target Audience**: Operators",
    "Feature Comparison":
      "| Product | Setup | Collaboration | Automation |\n|---|---|---|---|\n| Competitor One | Medium | Strong | Medium |\n| Competitor Two | Fast | Weak | Strong |",
    "Pricing Comparison":
      "| Product | Free Tier | Pricing Model | Packaging Motion |\n|---|---|---|---|\n| Competitor One | No | Seat-based | Sales-assisted |\n| Competitor Two | Yes | Usage-based | Self-serve |",
    "Best Customer Segments":
      "- SMB teams are under-served when they need collaboration without enterprise overhead.\n- Agencies value repeatable workflows more than brand depth.",
    "Competitive Landscape Overview":
      "- The category is saturated at the top end.\n- Buyers compare onboarding speed and automation depth more than raw feature count.",
    "Positioning Map":
      "- **X-axis**: Ease of setup\n- **Y-axis**: Team collaboration depth\n\n| Competitor | X Score | Y Score | Placement Rationale |\n|---|---:|---:|---|\n| Competitor One | 4 | 8 | Strong teamwork, slower setup |\n| Competitor Two | 8 | 3 | Fast setup, weaker collaboration |",
    "How You'll Reach Customers":
      "- SEO captures high-intent traffic.\n- Integrations matter because workflow adjacency drives discovery.",
    "Gap Analysis":
      "- Buyers still lack a lightweight team-first tool.\n- Transparent pricing remains rare in this category.",
    "Ways to Stand Out":
      "- Lead with transparent pricing.\n- Optimize for team workflows before feature breadth.",
    "What Makes It Hard to Copy":
      "- Workflow lock-in can become meaningful if shared context and approvals are core.\n- Defensibility is weak without retained data or embedded integrations.",
    "SWOT Analysis":
      "| | Positive | Negative |\n|---|---|---|\n| **Internal** | Focused scope | Smaller brand |\n| **External** | Team whitespace | Incumbent copy risk |",
    "Risks & Competitor Responses":
      "- Incumbents can add the wedge if demand becomes obvious.\n- Distribution will fail if the ROI story is vague.",
    "First Version Focus":
      "Launch a single workflow that proves weekly time savings.\n\n- **Target user**: SMB operator\n- **Core loop**: Shared execution workflow\n- **Upgrade trigger**: Collaboration and automation limits",
    "Recommended Next Moves":
      "1. Validate willingness to pay with 10 buyer interviews.\n2. Ship one workflow before broadening the suite.\n3. Package the first paid tier around shared team value.",
  }

  const sections = { ...baseSections, ...overrides }

  return `# Competitive Analysis: Example Product\n\n${COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.map(
    (heading) => `## ${heading}\n${sections[heading]}`
  ).join("\n\n")}`
}

test("parseCompetitiveAnalysisV2 accepts a valid v2 document", () => {
  const parsed = parseCompetitiveAnalysisV2(buildV2Fixture())
  const structured = getCompetitiveAnalysisStructuredData(parsed)

  assert.equal(parsed.isValid, true)
  assert.equal(parsed.headings.length, 16)
  assert.equal(parsed.competitorEntries.length, 2)
  assert.match(parsed.sections["Pricing Comparison"] ?? "", /Pricing Model/)
  assert.equal(structured.directCompetitors[0]?.heading, "Competitor One")
  assert.equal(
    structured.directCompetitors[0]?.websiteUrl,
    "https://competitor-one.example"
  )
  assert.equal(structured.directCompetitors[0]?.fields["Strengths"], "Distribution and integrations")
  assert.equal(structured.directCompetitors[0]?.fields["Key Edge"], "Distribution + integrations")
  assert.equal(structured.positioningMap.points[0]?.x, 4)
  assert.equal(structured.swotAnalysis.matrix?.externalNegative, "Incumbent copy risk")
})

test("positioning map parser reads score columns by header and preserves confidence", () => {
  const parsed = parseCompetitiveAnalysisV2(
    buildV2Fixture({
      "Positioning Map":
        "- **X-axis**: Ease of setup\n- **Y-axis**: Collaboration depth\n\n| Placement Rationale | Evidence Confidence | Y Score | Competitor | X Score |\n|---|---|---:|---|---:|\n| Slow setup but deep collaboration | High: public docs and pricing pages | 8 | Competitor One | 4 |\n| Fast setup with light collaboration | Medium: inferred from onboarding copy | 3 | Competitor Two | 9 |",
    })
  )
  const structured = getCompetitiveAnalysisStructuredData(parsed)

  assert.equal(structured.positioningMap.points[0]?.competitor, "Competitor One")
  assert.equal(structured.positioningMap.points[0]?.x, 4)
  assert.equal(structured.positioningMap.points[0]?.y, 8)
  assert.equal(
    structured.positioningMap.points[0]?.rationale,
    "Slow setup but deep collaboration"
  )
  assert.equal(
    structured.positioningMap.points[0]?.evidence,
    "High: public docs and pricing pages"
  )
})

test("positioning map parser leaves invalid or out-of-range scores unplotted", () => {
  const parsed = parseCompetitiveAnalysisV2(
    buildV2Fixture({
      "Positioning Map":
        "- **X-axis**: Ease of setup\n- **Y-axis**: Collaboration depth\n\n| Competitor | X Score | Y Score | Placement Rationale |\n|---|---:|---:|---|\n| Competitor One | unknown | 8 | Missing setup score |\n| Competitor Two | 11 | 3 | Out of range setup score |\n| Competitor Three | 6 | 0 | Valid edge score |",
    })
  )
  const structured = getCompetitiveAnalysisStructuredData(parsed)

  assert.equal(structured.positioningMap.points[0]?.x, null)
  assert.equal(structured.positioningMap.points[0]?.y, 8)
  assert.equal(structured.positioningMap.points[1]?.x, null)
  assert.equal(structured.positioningMap.points[1]?.y, 3)
  assert.equal(structured.positioningMap.points[2]?.x, 6)
  assert.equal(structured.positioningMap.points[2]?.y, 0)
})

test("workspace section map keeps overview limited to summary and verdict", () => {
  const overviewSections = COMPETITIVE_ANALYSIS_V2_SECTION_ORDER.filter(
    (heading) => COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP[heading] === "overview"
  )

  assert.deepEqual(overviewSections, ["Executive Summary", "Opportunity Verdict"])
  assert.equal(
    COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP["Recommended Next Moves"],
    "market-research"
  )
  assert.equal(
    COMPETITIVE_ANALYSIS_V2_WORKSPACE_SECTION_MAP["How You'll Reach Customers"],
    "market-research"
  )
})

test("parseCompetitiveAnalysisV2 accepts legacy v2 heading aliases", () => {
  const legacyHeadingContent = buildV2Fixture()
    .replace("## Opportunity Verdict", "## Founder Verdict")
    .replace("## Feature Comparison", "## Feature and Workflow Matrix")
    .replace("## Pricing Comparison", "## Pricing and Packaging")
    .replace("## Best Customer Segments", "## Audience Segments")
    .replace("## How You'll Reach Customers", "## GTM / Distribution Signals")
    .replace("## Ways to Stand Out", "## Differentiation Wedges")
    .replace("## What Makes It Hard to Copy", "## Moat and Defensibility")
    .replace("## Risks & Competitor Responses", "## Risks and Countermoves")
    .replace("## First Version Focus", "## MVP Wedge Recommendation")
    .replace("## Recommended Next Moves", "## Strategic Recommendations")
  const parsed = parseCompetitiveAnalysisV2(legacyHeadingContent)
  const structured = getCompetitiveAnalysisStructuredData(parsed)

  assert.equal(parsed.isValid, true)
  assert.match(parsed.sections["Opportunity Verdict"] ?? "", /Worth entering/)
  assert.equal(structured.strategicRecommendations.length, 3)
})

test("legacy metadata defaults competitive research to markdown view", () => {
  const viewModel = getCompetitiveAnalysisViewModel(buildV2Fixture(), null)

  assert.equal(viewModel.documentVersion, "legacy")
  assert.equal(viewModel.defaultView, "markdown")
  assert.equal(viewModel.canRenderModules, false)
  assert.match(viewModel.legacyNotice ?? "", /predates Market Research v2/i)
})

test("v2 metadata with malformed content falls back to markdown and warns", () => {
  const malformed = buildV2Fixture().replace(
    "## How You'll Reach Customers",
    "## Sales Plan"
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
      "Pricing Comparison":
        "Evidence was insufficient to verify detailed pricing for every competitor.\n\n| Product | Free Tier | Pricing Model | Packaging Motion |\n|---|---|---|---|\n| Competitor One | Unknown | Evidence was insufficient to verify | Evidence was insufficient to verify |",
      "What Makes It Hard to Copy":
        "- Evidence was insufficient to verify strong proprietary defensibility.\n- Available competitor research suggests defensibility will depend on integration depth.",
    })
  )

  assert.equal(parsed.isValid, true)
  assert.match(parsed.sections["Pricing Comparison"] ?? "", /Evidence was insufficient/)
  assert.match(parsed.sections["What Makes It Hard to Copy"] ?? "", /Available competitor research suggests/)
})
