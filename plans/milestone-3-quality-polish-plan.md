---
implemented: true
implemented_at: 2026-06-21
implementation_summary: "Credits are hidden from reachable user-facing surfaces while internal accounting remains; explicit plan project allowances are backed by migration/manual SQL; planning renderers and tests are split; intake and shared rate limits are hardened with Redis REST support; Mermaid SVG is sanitized; project context and review notes are updated."
---

# Plan: Milestone 3, Quality And Polish

## Goal
Finish the remaining medium and low findings worth doing: hide credits from all user-facing surfaces while keeping internal credit accounting, split the 3,620-line `planning-document-blocks.tsx` by document type, close the small rate-limiting gaps and move limiting to durable storage, sanitize Mermaid SVG injection, and trim `PROJECT_CONTEXT.md` back into an accurate reference. After this milestone, the repo carries no known finding above Low severity.

## Assumptions
- Milestones 0 to 2 are complete: gates green, critical findings closed, dead code gone, monitoring live.
- Credits remain the internal accounting unit but are not shown to users (owner decision, 2026-06-11). The existing `plans/remove-credits-and-future-entitlements-plan.md` is the authoritative deep plan for the entitlement model; this milestone executes the user-facing hiding and coordinates with that plan rather than duplicating it.
- Real users may exist by the time this milestone runs (post-launch), so changes here are more conservative than Milestone 1's deletions: feature behavior is preserved unless stated.
- The Pencil-style renderer test suites (`planning-document-blocks.test.tsx`, `competitive-analysis-document.test.tsx`, parser tests) are the safety net for the renderer split.

## Findings Driving This Plan
- Credit UI is visible across user-facing surfaces: `src/components/ui/credit-balance.tsx`, `dashboard-shell.tsx`, `project-header.tsx`, `header-profile-menu.tsx`, billing page copy; this contradicts the project-based pricing direction already recorded in `TODO.md` (Project-Based Pricing Cleanup section).
- `src/components/analysis/planning-document-blocks.tsx` is 3,620 lines containing 54 components spanning two document types plus shared primitives; it is the largest file in the repo and every renderer change touches it.
- `src/app/api/intake/questions/route.ts` calls OpenRouter with auth but no rate limit, the only AI route without one.
- `src/lib/rate-limit.ts` is per-instance in-memory (documented as a post-MVP item) and its `pruneRateLimitBuckets()` is exported but never called, so buckets grow for an instance's lifetime.
- `src/components/ui/markdown-renderer.tsx:342,393` injects Mermaid-rendered SVG via `dangerouslySetInnerHTML` from AI-generated markdown, with a CSP that allows inline script; `beautiful-mermaid` is pinned at 0.1.3 while 1.x is current.
- Billing entitlements fall back to regex-parsing plan display names and feature strings (`src/lib/project-allowance.ts:407-522`); explicit fields exist in the lookup chain but are not guaranteed populated.
- `PROJECT_CONTEXT.md` is 1,548 lines with several 500-plus-word feature bullets; at least one claim was already corrected in Milestone 1 (app generation), and the document mixes changelog narrative with current-state reference.

## Confirmed Decisions
- Credits stay as internal accounting; users never see credit balances, costs, or credit-denominated errors (owner, 2026-06-11).
- The entitlement-model overhaul itself follows `plans/remove-credits-and-future-entitlements-plan.md`; this milestone does not redesign entitlements.
- Owner approved the recommended implementation decisions on 2026-06-21.

## Resolved Implementation Decisions
1. Hidden credit failures use plan-language messaging, not generic retry copy and not user-visible credit language. Map old insufficient-credit/402 paths to copy such as "You've reached your plan limit. Upgrade to continue." with a billing-page call to action.
2. Core project outputs are included inside an allowed project: Market Research, Product Plan, First Version Plan, and Design Mockups. Hidden credit balances must not block those included flows.
3. Manual regeneration/versioning remains out of scope. Preserve active-document singleton behavior until regeneration is designed as an explicit product entitlement.
4. Durable rate limiting should be implemented now using Upstash Redis behind the existing `checkRateLimit` helper, with Redis-compatible Vercel KV acceptable only if the deployment already has it wired. Local development keeps an in-memory fallback.
5. Intake question generation should use conservative configurable defaults: start with 5 requests per signed-in user per hour plus 20 requests per IP per hour, then tune from logs.
6. Split `planning-document-blocks.tsx` into three files along existing seams: `product-plan-blocks.tsx`, `first-version-plan-blocks.tsx`, and `planning-blocks-shared.tsx`, with `planning-document-blocks.tsx` kept temporarily as a re-export barrel.
7. Delete `credit-balance.tsx` if the inventory proves no reachable user-facing or internal admin surface still needs it.
8. Billing should replace credit display with project-allowance usage where available, for example "2 of 5 projects used this month."
9. Plan entitlement fields should be populated through both a Supabase migration and manual production DB update notes, with resolver-equivalence tests before any data change.
10. Include Mermaid sanitization and the Mermaid-related package update. Skip unrelated optional dependency bumps unless the full milestone is already green and the update is very low risk.
11. Trim `PROJECT_CONTEXT.md` into a current-state architecture reference, removing long narrative history and keeping detailed history in plans/git.

## Recommended First Step
Inventory every user-visible credit surface with `grep -rn "credit" src/components src/app --include="*.tsx"` against the post-Milestone-2 tree (the dead components that mentioned credits are already gone), and classify each hit as: display to remove, internal logic to keep, or copy to rewrite. That inventory becomes the checklist for step 1 and the review artifact for the credit-hiding work.

## Plan
1. [x] Hide credits from user-facing UI per the inventory:
   - Remove or replace `CreditBalance` displays in `dashboard-shell.tsx`, `project-header.tsx`, `header-profile-menu.tsx`.
   - Rewrite insufficient-credit error paths to plan-language messaging with billing-page calls to action.
   - Replace billing credit display with visible project-allowance usage where available.
   - Keep all server-side `consume_credits`/refund logic untouched; this is display-layer only.
   - Cross-check against `plans/remove-credits-and-future-entitlements-plan.md` so the two efforts stay aligned, and record in that plan what this step already covered.
2. [x] Populate explicit entitlement fields for live plans (`monthly_project_allowance` on the plans rows) so `project-allowance.ts` resolves from `plan_field`, demoting name/feature-string parsing to a true fallback; add a logged warning when the fallback path is used in production. Implement this with a Supabase migration plus manual production DB update notes, after a resolver-equivalence test proves the explicit fields match current plan-name fallback behavior.
3. [x] Split `planning-document-blocks.tsx` into `product-plan-blocks.tsx`, `first-version-plan-blocks.tsx`, and `planning-blocks-shared.tsx`; move components verbatim, keep `planning-document-blocks.tsx` as a temporary re-export barrel, keep `planning-document-blocks.test.tsx` passing throughout, and split the test file along the same seams.
4. [x] Rate-limit `src/app/api/intake/questions/route.ts` with the same pattern as sibling AI routes: signed-in user key plus IP key, starting at 5 requests per user per hour and 20 requests per IP per hour.
5. [x] Durable rate limiting with Upstash Redis behind `checkRateLimit`, Redis-compatible Vercel KV acceptable if already wired, and in-memory fallback for local dev; delete `pruneRateLimitBuckets` or call it on a cadence inside the in-memory fallback.
6. [x] Sanitize Mermaid SVG: run renderer output through DOMPurify (in SVG profile) before `dangerouslySetInnerHTML` in `markdown-renderer.tsx`; bump `beautiful-mermaid` 0.1.3 to current 1.x and visually verify diagram rendering and the expand modal in both themes.
7. [x] Trim `PROJECT_CONTEXT.md`: cap feature bullets near 100 words, move narrative history into a short changelog section or delete it (git history is the changelog), verify every remaining claim against code, and confirm section 12 file references still exist.
8. [x] Optional, timeboxed: skipped unrelated dependency bumps by default; only `beautiful-mermaid` and `dompurify` were changed for this milestone.

## Milestones
- Credits Invisible: no user-facing surface renders credit balances, costs, or credit-denominated errors; internal accounting unchanged.
- Entitlements Explicit: every live plan resolves allowance from an explicit field; fallback parsing logs when used.
- Renderer Split: no component file over roughly 800 lines except generated `database.ts`; renderer tests green.
- Limits Durable: rate limits hold across serverless instances; every AI route is limited.
- Markdown Hardened: Mermaid SVG passes through sanitization; library current.
- Context Accurate: `PROJECT_CONTEXT.md` reads as current-state reference with no claims contradicted by code.

## Validation
- `npm test`, `npm run typecheck`, `npm run lint` green after each step
- `grep -rn "credit" src/components --include="*.tsx"` shows only internal logic or removed-display remnants per the inventory classification
- Manual QA: dashboard, workspace generation, billing upgrade flow, and an induced limit-reached state all show plan-language messaging
- Rate limit verified across two concurrent preview instances (two rapid request bursts from one IP)
- Mermaid: render a document with a diagram, expand modal, light and dark themes
- Renderer snapshot: one legacy-contract and one current-contract Product Plan and First Version Plan render identically before and after the split (existing test fixtures cover both contracts)

## Risks And Mitigations
- Risk: Hiding credit errors without a mapping layer leaves users with dead-end failures.
  - Mitigation: Clarifying Question 1 makes the replacement messaging an explicit decision before any display is removed; the inventory ensures no error path is missed.
- Risk: The renderer split silently changes rendering despite tests.
  - Mitigation: Components move verbatim, the barrel preserves import paths, and the before/after fixture comparison in Validation catches visual contract drift.
- Risk: Populating plan fields in production mismatches what plan names currently imply, changing live allowances.
  - Mitigation: Set fields to exactly what `PLAN_NAME_PROJECT_ALLOWANCES` resolves today (`src/lib/project-allowance.ts:5-15`), verified by running the resolver against both paths in a test before the data change.
- Risk: `beautiful-mermaid` 0.1.x to 1.x is a breaking jump.
  - Mitigation: It is isolated to `markdown-renderer.tsx`; the visual QA step covers the remaining consumer, and the bump reverts cleanly if rendering regresses. PDF export is retired and should not be part of this validation path.
- Risk: Upstash adds latency to every limited route.
  - Mitigation: Single round-trip token-bucket pattern, measured on preview; limits only guard expensive routes where one Redis call is noise.

## Rollback Or Recovery
- All steps are ordinary commits; display-layer credit hiding reverts without data impact.
- The plan-field population is additive data; clearing the fields restores name-based fallback behavior.
- The renderer barrel means the split can revert file-by-file.
- Rate limiting and sanitization are behind small seams (`checkRateLimit`, one renderer call site) and disable cleanly.

## Open Decisions
- Product decisions needed for this milestone are resolved as of 2026-06-21.
- CSP tightening (nonce-based script-src) remains explicitly deferred; revisit when there is a second engineer or a pentest.

## Critique

### Software Architect
- Executing the display-layer hiding now while deferring the entitlement redesign to the existing dedicated plan is the right separation; doing both at once would couple a UI sweep to a billing-model migration.
- The barrel-file split is unglamorous but correct: it converts the repo's largest file into three navigable ones with near-zero regression surface.

### Product Manager
- Hiding credits completes the project-based pricing story users are actually sold; visible credit math undermines the "one project, everything included" pitch.
- The limit-reached upgrade prompt (Clarifying Question 1, Recommendation A) is the only revenue-relevant copy in this milestone; it deserves the wording care.

### Customer Or End User
- Users stop seeing an accounting system they were never meant to think about, and failure states finally speak their language: plans and projects, not credits.

### Engineering Implementer
- Steps 1 and 3 are sweeps best done with the grep inventory open in one pane; everything else is an afternoon each.
- Write the resolver-equivalence test (step 2 mitigation) before touching plan rows; it is ten lines and removes all guesswork.

### Risk, Security, Or Operations
- Durable rate limiting and Mermaid sanitization close the last two Medium security findings from the audit; after this milestone the known-risk register is Low-only.
- The plan-field change touches live billing data; do it with the same care as a migration: verified equivalence first, one plan at a time, observed for a cycle.
