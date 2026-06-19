---
implemented: false
implemented_at:
implementation_summary:
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

## Clarifying Questions
1. When credit checks fail internally (insufficient credits), what do users see instead?
   - Recommendation A: Plan-language messaging: "You've reached your plan limit, upgrade to continue", mapped from the same 402 responses, with the billing page as the call to action.
   - Trade-off: Requires an error-message mapping layer in the workspace fetch handlers, but matches the project-based pricing story users are sold.
   - Recommendation B: Generic retry messaging.
   - Trade-off: Trivial to implement but hides the real cause and loses the upgrade prompt.
2. Should durable rate limiting use Upstash Redis or stay in-memory until traffic justifies it?
   - Recommendation A: Adopt Upstash (or Vercel KV) behind the existing `checkRateLimit` signature so call sites do not change; in-memory remains the local-dev fallback.
   - Trade-off: One new service and env vars, but limits finally hold across serverless instances; the current limiter is advisory under real traffic.
   - Recommendation B: Defer until post-launch metrics show abuse.
   - Trade-off: Zero work now, but the first abuse incident is also the first time limits matter.
3. How should the renderer split be sliced?
   - Recommendation A: Three files along existing seams: `product-plan-blocks.tsx`, `first-version-plan-blocks.tsx`, `planning-blocks-shared.tsx` (primitives: section frames, stat rows, cards), with `planning-document-blocks.tsx` kept temporarily as a re-export barrel so imports do not churn.
   - Trade-off: Mechanical and low-risk; the barrel adds one indirection until imports are updated.
   - Recommendation B: Split per component into a directory of 50-plus files.
   - Trade-off: Maximum granularity but high churn and no behavioral payoff over A.

## Recommended First Step
Inventory every user-visible credit surface with `grep -rn "credit" src/components src/app --include="*.tsx"` against the post-Milestone-2 tree (the dead components that mentioned credits are already gone), and classify each hit as: display to remove, internal logic to keep, or copy to rewrite. That inventory becomes the checklist for step 1 and the review artifact for the credit-hiding work.

## Plan
1. [ ] Hide credits from user-facing UI per the inventory:
   - Remove or replace `CreditBalance` displays in `dashboard-shell.tsx`, `project-header.tsx`, `header-profile-menu.tsx`.
   - Rewrite insufficient-credit error paths per Clarifying Question 1 decision (workspace generation handlers, billing page copy).
   - Keep all server-side `consume_credits`/refund logic untouched; this is display-layer only.
   - Cross-check against `plans/remove-credits-and-future-entitlements-plan.md` so the two efforts stay aligned, and record in that plan what this step already covered.
2. [ ] Populate explicit entitlement fields for live plans (`monthly_project_allowance` on the plans rows) so `project-allowance.ts` resolves from `plan_field`, demoting name/feature-string parsing to a true fallback; add a logged warning when the fallback path is used in production.
3. [ ] Split `planning-document-blocks.tsx` per Clarifying Question 3 decision; move components verbatim, keep `planning-document-blocks.test.tsx` passing throughout, split the test file along the same seams.
4. [ ] Rate-limit `src/app/api/intake/questions/route.ts` with the same pattern as sibling AI routes (per-user plus IP key, conservative limit).
5. [ ] Durable rate limiting per Clarifying Question 2 decision: storage-backed implementation behind `checkRateLimit`, in-memory fallback for local dev; delete `pruneRateLimitBuckets` or call it on a cadence inside the in-memory fallback.
6. [ ] Sanitize Mermaid SVG: run renderer output through DOMPurify (in SVG profile) before `dangerouslySetInnerHTML` in `markdown-renderer.tsx`; bump `beautiful-mermaid` 0.1.3 to current 1.x and visually verify diagram rendering and the expand modal in both themes.
7. [ ] Trim `PROJECT_CONTEXT.md`: cap feature bullets near 100 words, move narrative history into a short changelog section or delete it (git history is the changelog), verify every remaining claim against code, and confirm section 12 file references still exist.
8. [ ] Optional, timeboxed: bump `@supabase/ssr` and `@anthropic-ai/sdk` minor/patch ranges with a full local smoke flow; skip majors unless an advisory forces them.

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
- Whether `credit-balance.tsx` is deleted or kept for a future internal admin view (default: delete, git remembers).
- Whether the billing page should show project-allowance usage ("2 of 3 projects this month") as the replacement for credit display; leans yes, but copy belongs with the remove-credits plan.
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
