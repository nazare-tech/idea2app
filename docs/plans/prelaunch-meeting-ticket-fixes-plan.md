---
implemented: true
implemented_at: 2026-07-09T21:23:35-07:00
implementation_summary: "All five code changes landed with ticket-specific Linear evidence. NAZ-38 was closed with owner approval despite the recorded clean-account Stripe lifecycle QA gap. NAZ-118, NAZ-119, and NAZ-120 evidence was replaced with a fresh Idea 1.1 project generated through the current pipeline; the older NAZ-118 screenshot remains compatibility evidence only."
---

# Plan: Pre-Launch Meeting Ticket Fixes

## Goal

Implement and independently verify NAZ-38, NAZ-114, NAZ-118, NAZ-119, and NAZ-120. Each ticket must have focused automated coverage, real-user Chrome verification where the behavior is visible, evidence saved under `ui-evidence/2026-07-09-prelaunch-ticket-fixes/`, and its own Linear comment with attached screenshot or video evidence.

## Assumptions

- NAZ-38 is limited to the configured Stripe test-mode checkout path. This work will not create live products, switch production keys, or make a real charge.
- The current Product Plan and First Version Plan prompt contracts and `SCROLLABLE_NAV_ITEMS` are canonical for renderer order.
- Current AI Prompts readiness requires the recommended tool plus the current prompt-file bundle; the legacy guardrails file is optional.
- Small configured AI/API spend is acceptable for a real fresh-project QA run, but open-ended or production spend is not.
- Existing user changes and untracked files outside this plan remain untouched.

## Clarifying Questions

1. How should Enter behave in multiline idea inputs?
   - Recommendation A: Enter submits, Shift+Enter inserts a newline, and IME composition/repeated keydown/disabled states do not submit.
   - Trade-off: Matches the meeting request and common chat-style ergonomics while preserving multiline entry through Shift+Enter.
   - Recommendation B: Cmd/Ctrl+Enter submits while plain Enter always inserts a newline.
   - Trade-off: Preserves native textarea behavior but does not satisfy the explicitly requested Enter-to-advance flow.
   - Selected: Recommendation A, because NAZ-114 explicitly requests Enter submission on both surfaces.

2. How should partial AI Prompts content appear?
   - Recommendation A: Use one shared readiness contract with waiting, partial, ready, and incomplete outcomes; show available content plus an explicit assembling/incomplete notice and keep the rail non-green until ready.
   - Trade-off: Truthful and durable across onboarding, rail, and body, with a small shared-helper change across several boundaries.
   - Recommendation B: Hide AI Prompts entirely until all files exist.
   - Trade-off: Simpler visual state but removes useful progressively available content and makes long waits feel opaque.
   - Selected: Recommendation A, because the product already uses progressive generation and the ticket requires partial readiness to be represented clearly.

3. Should the mockup lightbox change the shared artifact shell or use a separate modal?
   - Recommendation A: Add a media presentation variant to the shared `ArtifactLightbox` and use it only for mockup images.
   - Trade-off: Restores a near-full-viewport image while retaining shared focus, escape, overlay, and action behavior.
   - Recommendation B: Reintroduce a mockup-only modal.
   - Trade-off: Isolates image layout but duplicates accessibility and interaction logic.
   - Selected: Recommendation A, because it preserves the shared shell without forcing document previews into media dimensions.

4. Which order should generated plan renderers follow?
   - Recommendation A: Align current Product Plan and First Version Plan render order and anchors with their prompt and navigation contracts.
   - Trade-off: Fixes the reported success-metrics mismatch and the related hidden Team and Milestones / risk-first drift in one contract-alignment pass.
   - Recommendation B: Move only Success Metrics in Product Plan.
   - Trade-off: Smaller diff, but leaves known prompt/nav/render drift and a missing current Team and Milestones alias.
   - Selected: Recommendation A, because contract synchronization is already a repository preference and both renderers are in NAZ-120's stated investigation scope.

5. How should checkout failures be handled?
   - Recommendation A: Keep one request in flight, parse the response defensively, show an inline actionable error, and redirect only after receiving a validated Stripe Checkout URL.
   - Trade-off: Gives users deterministic feedback and prevents accidental duplicate sessions with modest client/helper coverage.
   - Recommendation B: Keep the current silent handler and rely on server logs.
   - Trade-off: Smaller change but preserves the observed failure mode and gives users no recovery path.
   - Selected: Recommendation A, because payment conversion failures must be visible and retryable.

## Recommended First Step

Add failing focused tests for the shared keyboard predicate, AI Prompts readiness matrix, media lightbox layout contract, generated-plan ordering/anchors, and checkout result handling before changing production behavior.

## Architecture Improvement Opportunities

- Shared AI Prompts readiness contract: centralize required-file and recommended-tool completeness so onboarding, workspace rail, and body cannot drift. Benefit: durable prompt/parser/render synchronization. Trade-off: touches client and server readers. Boundaries: `src/lib/ai-prompts-readiness.ts`, onboarding status, workspace/nav, AI Prompts renderer. Status: selected.
- Shared keyboard submission predicate: reuse the same IME/repeat/modifier rules on landing and intake. Benefit: consistent behavior and focused unit coverage. Trade-off: one small helper. Boundaries: `src/lib/intake/keyboard-submit.ts` and both idea components. Status: selected.
- Typed checkout response boundary: separate response validation and user-safe error selection from the component. Benefit: deterministic tests and no silent malformed responses. Trade-off: one small helper/module. Boundaries: billing client and Stripe checkout response. Status: selected.
- Shared lightbox media variant: preserve one accessibility shell while allowing image-specific dimensions. Benefit: avoids duplicate modal behavior. Trade-off: slightly broader shared component API. Boundaries: `ArtifactLightbox` and mockup renderer. Status: selected.
- Registry-driven renderer ordering: a fully data-driven renderer registry could prevent future prompt/nav drift. Benefit: stronger long-term contract safety. Trade-off: disproportionate refactor for five launch fixes. Boundaries: planning renderers and document registry. Status: deferred; focused order assertions are selected instead.
- Durable Stripe checkout idempotency key: prevents duplicate Checkout Sessions across client retries or concurrent tabs during Stripe's idempotency window. Benefit: stronger payment recovery. Trade-off: a stable user/selected-price key relies on Stripe's key-retention lifecycle rather than a new local pending-session table. Status: selected and implemented after security review.

## Plan

1. [x] Add red tests for checkout result handling and single-submit guards.
2. [x] Implement NAZ-38 client checkout feedback and test-mode redirect behavior without changing production secrets.
3. [x] Add red tests for shared Enter-key submission semantics.
4. [x] Implement NAZ-114 on landing and `/projects/new` idea inputs.
5. [x] Add red readiness-matrix and display-state tests for AI Prompts.
6. [x] Implement NAZ-118 across onboarding status, workspace rail, and AI Prompts body while keeping AI Prompts derived-only.
7. [x] Add red layout/contract tests for the mockup media lightbox.
8. [x] Implement NAZ-119 with the shared media presentation variant.
9. [x] Add red Product Plan and First Version Plan ordering/anchor tests.
10. [x] Implement NAZ-120 by aligning renderer order and aliases with prompt/nav contracts.
11. [x] Run focused tests after each ticket, then the full test suite, typecheck, lint, build, and `git diff --check`.
12. [ ] Run real Chrome QA for all five tickets, capture ticket-specific evidence, and save exact route/viewport/state details.
13. [x] Complete fresh-eyes review, code review, security review, and remediation; record results in the sibling review artifact and backend history where applicable.
14. [x] Upload the corresponding screenshot/video to each Linear issue and add a concise verification comment.

## Milestones

- Checkout milestone: one click produces either a Stripe test Checkout redirect or a visible retryable error.
- Intake milestone: landing and intake inputs share verified Enter/Shift+Enter semantics.
- Readiness milestone: AI Prompts never shows ready before its required derived bundle exists.
- Mockup milestone: a generated concept opens in a near-full-viewport viewer at desktop and mobile widths.
- Contract milestone: current Product Plan and First Version Plan headings render in prompt/nav order with matching anchors.
- Evidence milestone: NAZ-38, NAZ-114, NAZ-118, NAZ-119, and NAZ-120 each contain their own uploaded visual evidence and verification comment.

## Validation

- Focused Node tests for each new helper and affected renderer/state module.
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Real Chrome Profile 1 / Plasma verification using `.env.e2e.local` credentials without exposing values.
- Stripe test-mode checkout only; no real payment.
- Desktop and mobile screenshots or a short video for each ticket under `ui-evidence/2026-07-09-prelaunch-ticket-fixes/<ticket>/`.

## Risks And Mitigations

- Stripe environment mismatch: keep test mode, surface safe errors, and stop rather than using dummy values or live keys.
- Derived readiness false negatives on legacy documents: distinguish current required bundle from optional legacy files and show a settled incomplete state instead of an endless spinner.
- Renderer contract regressions: assert heading order and anchor IDs against the canonical prompt/nav contract.
- Shared lightbox regression for markdown previews: keep default document behavior unchanged and opt mockups into the media variant.
- Browser or dev-server instability: verify server reachability first, recover Chrome Profile 1, and do not substitute lower-level API verification for required UI evidence.
- Evidence privacy: avoid credentials, payment details, private email, and unrelated project content in screenshots/videos.

## Rollback Or Recovery

- Checkout: revert the client/helper change; no Stripe objects or production configuration are modified.
- Keyboard handling: remove the two handlers and shared predicate.
- AI Prompts: revert the readiness helper consumers; no queue or database migration is introduced.
- Lightbox: remove the media variant and return mockups to the default shell.
- Renderer ordering: revert JSX order/aliases and focused tests; generated markdown remains unchanged.

## Open Decisions

- None. Production Stripe activation and live credentials remain explicitly outside this implementation.

## Critique

### Software Architect

- The main structural risk is state drift: AI Prompts currently derives readiness separately in onboarding, navigation, and rendering. Centralizing that contract is worth the cross-file change.
- A full renderer registry refactor would be cleaner but is too large for a pre-launch bug batch; order/anchor regression tests provide the needed safety now.

### Product Manager

- NAZ-38, NAZ-118, and NAZ-119 directly affect trust and conversion and are true launch blockers. NAZ-114 and NAZ-120 are smaller but remove visible friction and inconsistency.
- Evidence must demonstrate behavior, not merely show changed source code.

### Customer Or End User

- Users need checkout failures to explain what happened, keyboard behavior to match expectation, progress indicators to tell the truth, mockups to be inspectable, and plan sections to follow a coherent sequence.

### Engineering Implementer

- Five tickets increase context-switching risk. Each phase should stay independently testable and avoid bundling unrelated refactors.
- Real AI Prompts transition evidence may require a fresh project and a longer QA window; keep the dev server running throughout.

### Risk, Security, Or Operations

- Payment work must not log or expose secrets and must validate authenticated plan/price eligibility server-side as it does today.
- Screenshots must not expose test credentials or personal billing data.
- No production switch, live charge, database migration, or RLS change is authorized by this batch.
