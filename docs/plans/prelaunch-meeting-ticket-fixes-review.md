---
reviewed_at: 2026-07-09T21:30:00-07:00
implementation_complete: true
stripe_happy_path_complete: false
stripe_gap_accepted_by_owner: true
---

# Review: Pre-Launch Meeting Ticket Fixes

## Scope

Reviewed NAZ-38, NAZ-114, NAZ-118, NAZ-119, and NAZ-120 across the current diff, focused tests, full repository gates, security boundaries, and real Chrome Profile 1 / Plasma behavior.

## Verification

- `npm test`: 443 passed, 0 failed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with one pre-existing warning in `output/playwright/prod-full-flow.mjs` for unused `pageText`.
- `npm run build`: passed, including the Webpack/chunky+vendor regression guard.
- `git diff --check`: passed.
- Real Chrome: `http://localhost:3000`, default desktop viewport, authenticated with `.env.e2e.local` without retaining credential values in evidence.

## UI Evidence

- NAZ-38: `/billing`, active internal-development subscription, one-click portal failure feedback and subscriber `Manage plan` routing: `ui-evidence/2026-07-09-prelaunch-ticket-fixes/NAZ-38/billing-single-click-feedback.png`.
- NAZ-114: `/` landing idea textarea, valid idea + Enter opened the same authenticated continuation path as the primary CTA: `ui-evidence/2026-07-09-prelaunch-ticket-fixes/NAZ-114/landing-enter-submitted.png`.
- Fresh project for NAZ-118/119/120: `Signal Roadmap Intelligence Suite` (`b104e9e3-45a2-4eeb-87bf-e5bc76f39184`), created through the real Idea 1.1 intake and current onboarding pipeline on 2026-07-09.
- NAZ-118 live transition: while Product Plan was saved and First Version Plan was generating, the rail showed AI Prompts generating and the body showed `Still assembling AI Prompts` with the currently available Product Plan-derived files: `ui-evidence/2026-07-09-prelaunch-ticket-fixes/NAZ-118/fresh-project/ai-prompts-partial-live.png`.
- NAZ-118 terminal state: after the same fresh generation completed, AI Prompts truthfully showed needs-retry/incomplete because the generated plans omitted at least one required handoff section: `ui-evidence/2026-07-09-prelaunch-ticket-fixes/NAZ-118/fresh-project/ai-prompts-incomplete-current.png`. The older Signal To Roadmap screenshot remains supplemental legacy compatibility evidence only.
- NAZ-119: the fresh project's generated Concept 1 opened in the near-full-viewport media lightbox with copy/download/close controls visible: `ui-evidence/2026-07-09-prelaunch-ticket-fixes/NAZ-119/fresh-project/mockup-full-view-current.png`.
- NAZ-120: the fresh project's Product Plan rail and body show Introduction, Goals, Team & Milestones, Success Metrics, then User Personas; the First Version rail is risk-first: `ui-evidence/2026-07-09-prelaunch-ticket-fixes/NAZ-120/fresh-project/product-plan-order-current.png`.

## Code Review Findings And Remediation

- Fixed server-side checkout replay risk by adding a stable Stripe idempotency key per user and selected plan price; client single-flight remains as immediate UX protection.
- Fixed same-render Enter races with synchronous `useRef` locks on landing pending-intake creation and intake question generation.
- Fixed settled-empty and failed-upstream AI Prompts states so terminal incomplete/error results do not appear as endlessly generating.
- Fixed First Version Plan rail order to match the risk-first renderer contract.
- No actionable lightbox defect remained after the media presentation change.

## Security Review

- Checkout and portal redirects are accepted only for HTTPS URLs on `checkout.stripe.com` or `billing.stripe.com`.
- Checkout still authenticates the user and validates active/public/checkout-enabled plan and price records server-side.
- Onboarding status authenticates the user, verifies project/queue ownership before service reads, and returns readiness metadata rather than document bodies.
- No secrets, payment details, or credential values are stored in evidence or repository files.
- Residual test gap: there is no route-level concurrent checkout test or onboarding authorization test; focused pure-contract tests and the existing route ownership implementation reduce but do not eliminate this risk.

## Stripe QA Limitation

The configured e2e account has a private internal-development subscription whose saved test Stripe customer no longer exists in the active Stripe test account. The real portal call therefore returned Stripe `resource_missing`; the UI now exposes the safe API error instead of swallowing it. A clean self-serve account was attempted through the real signup UI, but the first account required confirmation in a mailbox not connected to this session and a second connected-mailbox attempt hit Supabase's email rate limit. Checkout completion, webhook-created subscription rows, portal cancellation, and cancellation webhook transitions remain unverified. The owner explicitly accepted this residual QA gap and requested that NAZ-38 be closed; Linear now records the issue as Done.

## Architecture Improvement Review

- Selected shared AI Prompts readiness contract landed across onboarding, rail, and body. No new database queue item was introduced.
- Selected shared keyboard predicate and synchronous request locks landed on both idea entrypoints.
- Selected Stripe response boundary and server idempotency landed; no secret/configuration change was made.
- Selected media lightbox variant landed while the default document lightbox contract remained unchanged.
- Selected prompt/nav/renderer order synchronization landed with focused Product Plan and First Version Plan assertions.
- Registry-driven renderer composition remains deferred because it is disproportionate to this launch batch.
- Remaining recovery blind spot: test Stripe customer/subscription fixtures can drift across test-account resets; a repeatable confirmed clean billing QA account or scripted test-clock fixture is still needed.

## Remediation Status

Code review and security findings are remediated. NAZ-38 code safeguards are implemented and evidenced, and the owner accepted closure with the full Stripe lifecycle limitation recorded. A fresh Idea 1.1 project now verifies NAZ-118's transient partial and terminal incomplete states, NAZ-119's generated mockup lightbox, and NAZ-120's current generated-plan ordering.
