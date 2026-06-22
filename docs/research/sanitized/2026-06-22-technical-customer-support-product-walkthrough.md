# Research: Product Walkthrough With Technical Operator

Date: 2026-06-22
Participant: Technical operator with support-workflow experience
Research type: Moderated product walkthrough
Sanitization status: Sanitized
Raw source: Not committed

Sanitized from raw transcript. Raw source not committed.

## Summary

A technically fluent participant walked through the Maker Compass landing page, idea intake, generated Market Research, Product Plan, First Version Plan, and mockup output using a domain-specific startup idea. The strongest positive signal was that the generated artifacts felt useful and credible, especially personas, risks, dependencies, suggested stack, first-version scope, and mockups. The strongest negative signal was that the experience is too text-heavy and several labels assume startup/product-management fluency that a first-time founder may not have.

The participant repeatedly asked for clearer visual structure, earlier orientation, and more explicit guidance on what to do next. They also wanted the generated plan to bridge from strategy into execution: roles, agent prompts, prerequisites, success thresholds, and implementation-ready files.

## Participant Context

The participant has experience evaluating customer workflows, AI tools, and startup/product planning artifacts. They used a past domain-specific startup concept as the test idea, which made it easier to judge whether the generated market and build guidance was directionally accurate.

## Key Insights

- The landing page communicates the broad promise, but the participant was not immediately sure what the first run produces versus what the long-term product outcome is.
- The landing-page before/after framing was unclear. The participant expected a clearer mapping from user input to generated output.
- The page felt visually busy on first pass, with no obvious scanning path.
- The onboarding platform question confused "native mobile app" with "mobile app"; labels like "iOS or Android app" versus "mobile website" would be clearer.
- The generation/loading moment needs to keep the user engaged. The participant was ready to navigate away and suggested showing questions, strategies, or next-step thinking while generation runs.
- The generated Market Research contained useful domain-specific insight, but competitor-unavailable states and the positioning map were confusing enough that the participant skipped them.
- Some generated strategy language assumes business or technical fluency. Terms such as internal/external risk framing, proprietary data assets, project size, and team-size estimates need clearer explanations.
- The participant wanted a way to ask follow-up questions about a generated artifact without leaving Maker Compass.
- Product Plan content is valuable but too text-heavy. The participant wanted optional visual summaries such as timelines, charts, and milestone maps rather than only dense text.
- Goals, milestones, team shape, timeline, and success metrics felt like they should appear earlier because they orient the rest of the plan.
- Role/team recommendations are not valuable enough unless they explain why each role is needed and where that role maps into requirements, milestones, or implementation steps.
- There is a strong opportunity to generate implementation-ready role prompts, `AGENTS.md`, prompt files, and prerequisite guidance for tools such as the selected app framework, backend, and deployment stack.
- The First Version Plan was especially useful once the participant reached suggested stack, core flow, MVP scope, and AI-friendly build sequence, but some tables and labels made it harder to parse.
- The validation plan needs clearer framing as a research plan: who to test with, what to ask, what to do, and what threshold means success.
- The participant saw strong value in minimum success thresholds between phases so a founder or agent team knows when to proceed.
- Mockups were a strong hook, but generated artifact quality should be evaluated methodically across model choices because perceived mockup quality directly affects trust.

## Pain Points

- Unclear landing-page outcome and input/output relationship.
- Confusing onboarding platform labels.
- Loader reset and insufficient waiting-state content during generation.
- Market Research failure states and positioning map readability.
- Dense generated text without enough visual hierarchy or alternate visual views.
- Startup/product jargon that first-time founders may need explained.
- Team-size and role recommendations without role-to-work mapping.
- Technical considerations without likely cost/prerequisite context.
- First Version Plan scope and validation tables that are hard to interpret.
- Build prompt guidance that assumes the user already knows how to set up the target tooling.

## Jobs To Be Done

- When I arrive on the landing page, I want to quickly understand what I give Maker Compass and what I get back, so I can decide whether to try it.
- When I answer onboarding questions, I want labels that match my mental model, so I do not choose the wrong platform.
- When I wait for generation, I want relevant prompts or next-step ideas, so I stay engaged instead of leaving.
- When I read generated research, I want confusing business terms explained in plain language, so I can act without taking the text elsewhere.
- When I read a Product Plan, I want a quick visual map of goals, milestones, team, and metrics before the details, so I understand the shape of the work.
- When I see a recommended team or agent setup, I want role responsibilities and ready-to-use prompts, so I know how to execute the plan.
- When I reach the build prompt, I want prerequisites and generated files, so I can move into Codex or another coding tool with less translation.

## Product Opportunities

- Clarify the landing page around "input idea -> generated artifacts -> implementation plan."
- Add example toggles that show one idea and the exact output bundle it produces.
- Improve onboarding platform copy.
- Enrich loading states with contextual prompts, strategy questions, and progress that does not reset unexpectedly.
- Rework Market Research fallbacks and remove or redesign low-signal maps.
- Add plain-language explanations and optional artifact chat.
- Reorder Product Plan and First Version Plan to surface goals, milestones, success thresholds, team plan, and suggested stack earlier.
- Generate role/workstream maps and implementation-ready agent prompt artifacts.
- Add technical prerequisite and likely-cost callouts for recommended stacks, APIs, app-store accounts, and payment providers.
- Run structured beta testing with external testers after the next polish pass.
- Run methodical artifact-quality comparisons across model choices and review-agent patterns without exposing sensitive provider details.

## Risks / Concerns

- Too much text too early may cause users to skim past the highest-value content.
- If technical or business jargon is not explained, users may leave Maker Compass to ask another AI tool for clarification.
- If generated team recommendations read like human hiring requirements instead of possible agent/workstream roles, users may perceive the plan as unaffordable.
- If the build prompt assumes prerequisites are already installed, users may fail immediately after the handoff.
- If mockup quality varies widely, user trust may swing based on the least polished visual artifact.

## Open Questions

- Should the first paid version prioritize artifact chat, or can plain-language explainers cover the near-term need?
- Should Product Plan and First Version Plan be reordered in prompt output, display output, or both?
- What is the right distinction between human roles, AI agent roles, and implementation workstreams?
- Should generated implementation files be available as a downloadable bundle, copied snippets, or a workspace-style file tree?
- Which external beta-testing service, if any, should be used after the next UX polish pass?

## Linear Follow-Ups

- NAZ-83: Clarify landing page input-to-output promise
- NAZ-84: Clarify onboarding platform choice labels
- NAZ-85: Improve generation waiting state with contextual guidance
- NAZ-86: Rework Market Research fallback states and positioning map
- NAZ-87: Add plain-language explainers for generated strategy terms
- NAZ-88: Reorder Product Plan around goals, timeline, team, and success thresholds
- NAZ-89: Map Product Plan requirements to roles and workstreams
- NAZ-90: Generate implementation-ready agent prompts and project files
- NAZ-91: Add prerequisite and likely-cost callouts to technical sections
- NAZ-92: Clarify First Version validation plan and phase thresholds
- NAZ-93: Evaluate external beta-testing panel for product feedback
- NAZ-94: Run artifact-quality A/B tests across model and review-agent setups

## Existing Related Linear Issues

- NAZ-12: Auth and onboarding polish before launch
- NAZ-13: Header, branding, landing page, and navigation polish
- NAZ-14: Generated artifact quality and document rendering polish
- NAZ-17: Post-launch roadmap discovery backlog
- NAZ-26: Run mobile responsiveness QA for landing and onboarding
- NAZ-36: Iterate Product Plan and First Version Plan prompt quality
- NAZ-61: Evaluate lower-cost LLM model mix and competitor-pricing web access
- NAZ-65: Rework PRD section order and remove User Experience section
- NAZ-66: Consolidate MVP plan tables and terminology cleanup
- NAZ-69: Reorder generated prompt sections after validation planning
