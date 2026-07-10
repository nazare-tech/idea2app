# Meeting: Weekly Maker Compass Sync

Date: 2026-07-08
Type: Product / Engineering / Ops
Attendees: Founder, Co-founder
Sanitization status: Sanitized
Raw source: Not committed

Sanitized from raw transcript. Raw source not committed.

## Summary

The meeting reviewed the current Maker Compass launch state after a broad landing page, workspace, billing, and generated-artifact polish pass. The product is closer to launch, but several launch-readiness items remain: live Stripe setup, a broken paid-upgrade handoff observed during the walkthrough, production support email, Pro-plan model promises, workspace composer usage controls, waitlist policy, launch marketing, and a few UI regressions or quality gaps.

The later discussion explored a separate agentic booking idea. That discussion is not captured here except for the small Maker Compass-relevant observations about using Maker Compass itself to evaluate competitors and the intake keyboard-flow follow-up.

## Decisions

- Keep launch momentum focused on Maker Compass rather than continuing open-ended product polish.
- Treat the current landing page as launch-ready enough after the remaining launch-readiness changes are completed.
- Keep the early-access/waitlist gate for now, then revisit removal if signups approach the configured cap.
- Keep the project composer blocked for free users for now; remaining work should focus on paid-plan usage policy and abuse/spend controls.
- Prefer launching and observing user behavior before aggressively restricting composer input to suggestion pills only.
- Keep Design Mockups available for the initial launch, measure whether users reach and value them, then revisit plan entitlements. If concepts are gated later, generate them in advance so an upgrade can reveal them without a new wait.
- Use a dedicated launch marketing plan as the next product milestone.

## Discussion By Topic

### Landing Page And Launch Readiness

The landing page was reviewed as substantially cleaner after the latest motion, FAQ, footer, pricing, and hero updates. Remaining launch-readiness work includes production Stripe configuration, support/contact email provisioning, and a marketing plan for where to launch.

### Billing, Pricing, And Model Entitlements

The current Stripe setup is still in test mode and needs live-mode production setup before launch. During the walkthrough, a paid-plan CTA required a second click and then failed to hand off to Stripe Checkout, so the existing checkout QA work has a concrete reproduction to verify. The team also discussed that Pro users should receive the higher-quality AI/model behavior promised by the pricing tier, while expensive model usage should be bounded by an explicit plan or usage policy.

### Workspace And Generated Artifact Polish

The walkthrough surfaced several workspace quality items:

- The Market Research "Proposed Name" card helps clarify when the generated project name appears in competitor comparisons.
- Competitor entries should prefer direct source links when available and graceful search fallback when not.
- Competitor pricing extraction remains weak enough to require a dedicated research/data-path decision.
- The positioning-map replacement is better than the previous graph, but the spacing between score bars can be too tight.
- Product/First Version Plan section ordering has at least one visible mismatch around success metrics.
- AI Prompts prompt-file cards may need clearer click affordance before keeping duplicate copy actions on closed cards.
- AI Prompts can appear complete while some derived prompt files are still being assembled.
- The design mockup lightbox/viewer showed a regression where the expected full-view display was not appearing correctly.
- The Design Mockups queued state in the workspace navigation was understood without extra explanation; preserve that clarity while fixing the viewer and readiness states.

### Project Composer

The project composer was reviewed as useful and already gated away from free users in a way that clearly communicated the upgrade path. The launch decision is to preserve free-form text for paid users and treat suggestion pills as guidance; any stricter input gating should follow observed usage, cost, or misuse. Remaining concerns are plan-level usage policy and whether Starter and Pro tiers need different rate limits, context limits, or model settings.

### Measurement And Mockup Entitlements

The team explicitly deferred blurring or locking additional mockup concepts until an initial user cohort shows how people progress through the workspace and whether mockups or downloadable prompt files provide the strongest value. Existing analytics should be audited for artifact reach, mockup inspection, prompt-file interaction, and drop-off before changing entitlements.

### Waitlist And Launch Marketing

The team discussed whether to remove the early-access gate. The selected direction was to keep the cap for now and revisit once signup volume approaches the cap. The next major non-code task is to produce a launch marketing plan using the collected marketing resources.

### Separate Product Idea

The later discussion explored a separate agentic booking concept. It is intentionally excluded from Maker Compass follow-ups, except that the team noted Maker Compass should be useful for competitor discovery and platform recommendation on new ideas.

## Risks / Concerns

- Pro-plan pricing can create a trust gap if model quality does not differ meaningfully from lower tiers.
- Free-form composer input can create ongoing AI spend if paid-plan limits are too loose.
- Provider credit depletion can interrupt generation even when product-level limits are correct; launch operations need balance monitoring and a replenishment or alert path.
- Live Stripe, webhook, customer portal, and support email setup are launch-critical operational dependencies.
- A broken or multi-click checkout handoff can block paid conversion even after live Stripe configuration is complete.
- Competitor pricing claims can become unreliable if the app depends on model browsing without a consistent extraction path.
- The waitlist cap may reduce conversion if left in place too long, but removing it too early can increase support and cost risk.

## Open Questions

- What exact model or generation quality difference should Pro receive versus Free and Starter?
- Should composer usage be gated by plan limits, rate limits, project count, credits, or a hybrid policy?
- What initial usage threshold is sufficient before revisiting Design Mockup entitlements?
- Do current analytics reliably show whether users reach and interact with Design Mockups and AI Prompt files?
- What is the launch support email address and where should it be provisioned?
- Which launch channels should be tested first, and what counts as a successful first marketing experiment?
- When should the early-access cap be removed: at a fixed signup count, after a stability milestone, or manually?

## Linear Follow-Ups

- NAZ-39: Configure live Stripe products, prices, webhooks, and portal
- NAZ-15: Billing go-live and project-based pricing cleanup
- NAZ-38: Run Stripe test-mode checkout, subscription, portal, and cancellation QA
- NAZ-123: Define Pro model quality entitlement versus lower tiers
- NAZ-124: Define AI usage and cost limits for expensive generation paths
- NAZ-125: Set Project Composer usage controls by paid plan
- NAZ-126: Evaluate Design Mockup entitlements after initial usage data
- NAZ-117: Provision production support email for public contact surfaces
- NAZ-68: Link competitor mentions to source URLs in Market Research
- NAZ-61: Evaluate lower-cost LLM model mix and competitor-pricing web access
- NAZ-86: Rework Market Research fallback states and positioning map
- NAZ-111: Clarify and evaluate editable AI build prompt controls
- NAZ-90: Generate implementation-ready agent prompts and project files
- NAZ-127: Make AI Prompt file cards clearly inspectable and simplify closed-card actions
- NAZ-118: Fix AI Prompts readiness state while derived files are still incomplete
- NAZ-119: Fix design mockup lightbox viewer regression
- NAZ-120: Fix generated plan success-metrics section ordering mismatch
- NAZ-121: Decide early-access waitlist cap policy before launch
- NAZ-122: Create first Maker Compass launch marketing plan and channel experiment (due 2026-07-14)
- NAZ-43: Define activation, retention, churn, and engagement event taxonomy
- NAZ-114: Submit idea with Enter key from intake idea input

## Linear Coverage

| Insight / action item | Disposition | Linear reference |
| --- | --- | --- |
| Configure live Stripe products, prices, webhook, and customer portal before launch. | existing issue | NAZ-39 |
| Keep billing go-live and project-based pricing cleanup on the launch-critical path. | existing issue | NAZ-15 |
| Fix the observed multi-click paid CTA and failed Stripe Checkout handoff. | updated issue | NAZ-38 |
| Define Pro model/quality entitlement versus Free and Starter. | new issue | NAZ-123 |
| Define usage and cost limits for expensive AI generation paths. | new issue | NAZ-124 |
| Decide composer usage controls by paid plan, including Starter versus Pro limits. | new issue | NAZ-125 |
| Launch paid Composer with free-form input and use pills as guidance until evidence supports a restriction. | updated issue | NAZ-125 |
| Preserve the clear Free-plan Composer lock in both UI and API behavior. | synthesis only | None |
| Add provider-balance monitoring and a replenishment or alert runbook to AI cost controls. | updated issue | NAZ-124 |
| Provision production support email and connect it to public contact surfaces. | new issue | NAZ-117 |
| Preserve direct competitor links and fallback search behavior. | existing issue | NAZ-68 |
| Improve competitor-pricing extraction path and model/web research decision. | existing issue | NAZ-61 |
| Improve positioning-map score-bar readability. | existing issue | NAZ-86 |
| Preserve the "Proposed Name" card as a useful clarity guardrail in competitor comparisons. | synthesis only | None |
| Revisit AI Prompts closed-card copy and download actions after the inspect affordance is clear. | new issue | NAZ-127 |
| Make AI Prompts cards visibly clickable and keyboard-inspectable. | new issue | NAZ-127 |
| Fix AI Prompts derived loading state when prompt files are not all ready. | new issue | NAZ-118 |
| Fix design mockup lightbox/viewer regression. | new issue | NAZ-119 |
| Preserve the clear Design Mockups queued state in workspace navigation. | synthesis only | None |
| Measure whether users reach mockups and prompt files before changing plan entitlements. | updated issue | NAZ-43 |
| Evaluate Free, Starter, and Pro Design Mockup entitlements after initial usage data. | new issue | NAZ-126 |
| If mockups are gated later, pre-generate locked concepts so paid access reveals them immediately. | new issue | NAZ-126 |
| Fix success-metrics ordering mismatch in generated plan rendering. | new issue | NAZ-120 |
| Keep the waitlist cap for now and define the signup-volume or stability trigger for removing it. | new issue | NAZ-121 |
| Build first launch marketing plan and channel experiment from collected marketing resources. | new issue | NAZ-122 |
| Treat the current product as launch-ready enough after explicit blockers; avoid reopening broad polish without evidence. | synthesis only | None |
| Submit idea with Enter from landing/intake idea input. | existing issue | NAZ-114 |
| Dogfood Maker Compass on new ideas to validate competitor discovery and platform recommendation quality. | synthesis only | None |
| Ignore separate agentic booking idea for Maker Compass backlog. | not product-relevant | None |

## Related Links

- Related research:
- Related decision:
- Related Linear project: Maker Compass MVP Launch Backlog
