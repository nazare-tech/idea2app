# Research: Founder Product Walkthrough

Date: 2026-06-24
Participant: Founder research participant
Research type: Moderated product walkthrough
Sanitization status: Sanitized
Sensitivity level: Public-safe default
Raw source: Not committed

Sanitized from raw transcript. Raw source not committed.

## Summary

A founder participant walked through the Maker Compass landing page, idea intake, generated Market Research, Product Plan, First Version Plan, Design Mockups, and AI Prompts. The strongest positive signal was that the generated product planning content felt useful as a starting point, especially when it organized business goals, risks, plans, and actionable next steps. The strongest negative signal was that the product currently feels too static and too dense: the participant wanted to interrogate claims, push back on assumptions, answer more clarifying questions, and collaborate with the generated output instead of only reading it.

The participant also surfaced a positioning question: Maker Compass may be more valuable as a thinking and alignment tool than as a one-way document generator. Several suggested use cases cluster around collaborative planning, fundraising preparation, market-risk exploration, and structured idea comparison.

## Participant Context

The participant is a founder and evaluated the product through the lens of someone exploring a new business idea. They appeared comfortable with AI-assisted thinking workflows, long-form planning artifacts, and iterative document workflows.

## Key Insights

- The landing page was directionally clear enough to start, but visually busy and hard to parse.
- The participant expected more value before being asked to create an account.
- The product should clarify that it currently focuses on online businesses if that is the intended scope.
- Intake questions need clearer intent. The participant wanted to know why a question is being asked and what output it will affect, including that mockups will be generated.
- The participant wanted more answer flexibility in intake, including a way to type an option when the provided choices do not fit.
- Side-tab navigation worked well as an orientation pattern.
- Market Research needs stronger trust signals. The participant wanted sources for assertions and clearer explanations of how generated business numbers were derived.
- The positioning map was low-value and hard to read.
- Product Plan presentation was stronger than Market Research presentation, but the reason behind generated goals and metrics was still unclear.
- The participant did not understand the distinction between Product Plan, First Version Plan, MVP, validation plan, and AI Prompts without more explanation.
- Tooltips and explanation affordances were either missing, broken, or insufficiently visible.
- First Version Plan was hard to understand. The participant expected it to focus on what to build first, which key risks to retire, and which first actions to take.
- The validation plan felt useful, but should live inside the first-version/MVP framing as concrete action rather than as abstract product-plan material.
- Mockup generation was too slow and should not block all options until every option is complete.
- Mockups should be inspectable in a larger or full-screen view.
- The product needs an explicit next step after the first plan is generated, including a purchase or upgrade CTA where appropriate.
- The workspace has too much information in one long page. Market research, planning, mockups, and AI prompts may need clearer page or stage separation.
- The participant wanted interactive follow-up: chat, comments on the document, a way to say "this is not what I want," and ways to revise assumptions.
- The participant wanted the system to ask more questions and make recommendations, similar to an AI planning partner.
- Market size, capital requirements, customer location, customer acquisition, and first risk-retirement experiments mattered more than technical execution for the tested business idea.
- The generated content may be useful for fundraising preparation, internal product brainstorming, alignment, and live market monitoring.
- The participant suggested comparing different ideas and potentially managing execution through a collaborative backlog or kanban-style prioritization surface.

## Pain Points

- Landing page is too visually busy.
- Account creation appears before enough value has been shown.
- Online-business scope is not explicit enough.
- Intake questions do not explain their purpose or downstream impact.
- Competitive research can fail or produce low-trust claims without enough source context.
- Generated business goals and success metrics need rationale.
- Positioning map creates confusion.
- Artifact names and section labels assume product-management familiarity.
- Tooltip/explanation affordances are not sufficient.
- First Version Plan does not clearly communicate first actions, key risks, or MVP-only scope.
- Success metrics can fail to populate concrete numbers.
- Mockup generation latency blocks perceived progress.
- Mockups are not easy to inspect.
- The workspace is dense and mixes strategic, visual, and implementation content in a way that feels odd.
- There is no obvious interactive loop for challenging or revising generated output.
- There is no obvious CTA after the first valuable artifact is generated.

## Jobs To Be Done

- When I land on Maker Compass, I want to quickly understand whether this is for my kind of business, so I do not waste time entering an idea that will not fit.
- When I start, I want to see enough generated value before signup, so I trust the product before creating an account.
- When I answer intake questions, I want to understand why each question matters, so I can answer thoughtfully.
- When I read generated claims, I want sources and rationale, so I can decide whether to trust or challenge them.
- When I review my first plan, I want to know the first actions and biggest risks, so I can decide what to do next.
- When I disagree with the generated plan, I want to comment, chat, or revise assumptions, so the output becomes mine.
- When mockups are generating, I want to see each option as it finishes, so the experience does not feel stuck.
- When I view mockups, I want to inspect them full-screen, so I can judge details.
- When I reach the end of a plan, I want a clear next step, so I know whether to buy, build, revise, or compare ideas.

## Product Opportunities

- Rebuild the landing page around a simpler promise, example generated ideas, and online-business scope.
- Move signup until after the user has answered meaningful intake questions or seen generated value.
- Add short question-purpose copy to intake, including downstream artifacts affected by each answer.
- Improve answer flexibility with an "Other" path where the generated choices are incomplete.
- Add evidence trails for generated business claims, including citations, formulas, source counts, and assumption labels.
- Delete or replace the positioning map with a clearer competitive summary.
- Rename or explain Product Plan, First Version Plan, MVP, Validation Plan, and AI Prompts in user-facing language.
- Reframe First Version Plan around first actions, key risks, MVP scope, and validation experiments.
- Progressive-render mockup options as each option is ready.
- Add full-screen mockup viewing.
- Add post-plan CTAs for purchase, upgrade, export, build handoff, or revision.
- Split the workspace into clearer pages or stages while preserving the useful side-tab navigation pattern.
- Add artifact chat, inline comments, or assumption editing so users can challenge and revise generated plans.
- Explore idea comparison, collaborative backlog prioritization, and fundraising-support variants as follow-on product directions.

## Risks / Concerns

- A one-way document generator may not be sticky enough if users immediately move to another AI tool to interrogate the output.
- Unexplained numbers and unsourced claims can reduce trust even when the generated recommendation is plausible.
- Too much content on one page may cause users to miss the highest-value next actions.
- If artifact names stay abstract, non-product-manager founders may misunderstand what each document is for.
- Slow mockup generation can make the product feel stalled even if the final output is useful.
- A single generic artifact sequence may not fit businesses where market, capital, or operational risk matters more than software implementation risk.

## Open Questions

- Should the first paid version focus on artifact chat/comments, clearer explanations, or both?
- Should Maker Compass position itself as a business-plan generator, a product-planning tool, or a founder thinking/alignment workspace?
- Which artifact names best match user expectations: Business Plan, Product Plan, MVP Plan, First Action Plan, Validation Plan, AI Build Prompts, or another taxonomy?
- How much generated value should be shown before signup without increasing cost or abuse risk?
- What is the minimum viable evidence trail for generated claims without overloading the document UI?
- Should idea comparison and kanban-style prioritization be a separate exploration mode or part of the main workspace?

## Linear Follow-Ups

- NAZ-95: Add evidence and rationale trails for generated claims
- NAZ-96: Reframe first-run output around key risks and first actions
- NAZ-97: Explore interactive artifact refinement with chat, comments, and assumptions
- NAZ-98: Redesign workspace stages and artifact naming for founder comprehension
- NAZ-99: Add post-plan CTA and next-action handoff
- NAZ-100: Progressively reveal mockup options and add full-screen viewing
- NAZ-101: Fix missing numeric success metrics in generated plans
- NAZ-102: Explore idea comparison and collaborative planning surfaces
- NAZ-103: Improve landing and intake funnel clarity before auth
- NAZ-104: Fix tooltip and inline explainer affordances across generated artifacts
- NAZ-105: Define adaptive follow-up question loop after artifact generation
- NAZ-106: Explore support boundary for non-software and operations-heavy ideas
- NAZ-107: Explore fundraising and partner-facing output package
- NAZ-108: Explore live market monitoring and refreshable research
- NAZ-109: Support richer project context ingestion from URLs and notes
- NAZ-110: Add concise product walkthrough or explainer video
- NAZ-111: Clarify and evaluate editable AI build prompt controls

## Existing Related Linear Issues

- NAZ-13: Header, branding, landing page, and navigation polish
- NAZ-29: Polish landing hero copy, graphics, and animation quality
- NAZ-32: Tune mockup prompts away from generic dashboards
- NAZ-67: Make Design Mockups prominent and collapse dense requirements
- NAZ-68: Link competitor mentions to source URLs in Market Research
- NAZ-83: Clarify landing page input-to-output promise
- NAZ-86: Rework Market Research fallback states and positioning map
- NAZ-87: Add plain-language explainers for generated strategy terms
- NAZ-92: Clarify First Version validation plan and phase thresholds
