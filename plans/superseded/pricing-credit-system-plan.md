---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Pricing And Credit System Cleanup

## Goal
Audit every current credit/token-system surface, then update public and authenticated pricing so Maker Compass shows three plans instead of four: Free, Starter, and Pro. Each plan should draw from one shared list of 10 value items, with Free showing about 4, Starter showing 6-7, and Pro showing all 10.

## Assumptions
- "Remove Enterprise" means remove it from user-facing pricing cards and checkout/billing plan display, not delete historical Enterprise plan records or remove internal unlimited-plan fallback behavior.
- The existing internal accounting table/function names can stay as `credits` for now, while user-facing copy can say "tokens" or "plan benefits".
- Starter remains close to the current public price, currently `$29/mo` in `src/app/page.tsx`, even though the prompt remembered "around $20".
- Pro remains the most expensive public self-serve plan at the current `$79/mo`.
- This branch could not fast-forward to `origin/main` because local dirty files would be overwritten. `origin/main` was fetched and used as the latest reference, but the active worktree was not pulled cleanly.

## Clarifying Questions
1. What should Starter cost?
   - Recommendation A: Keep `$29/mo`.
   - Trade-off: Matches current landing copy and likely existing Stripe plan rows, but is above the user's "around $20" memory.
   - Recommendation B: Change Starter to `$19/mo` or `$20/mo`.
   - Trade-off: Closer to the prompt and older TODO notes, but requires Stripe/Supabase plan alignment so checkout does not disagree.
2. Should the billing page filter out Enterprise in code or should Enterprise be made non-public in Supabase?
   - Recommendation A: Add a code filter that hides `Enterprise` from public billing cards.
   - Trade-off: Fast and visible immediately, but the DB still says Enterprise is public.
   - Recommendation B: Add a migration/update path setting Enterprise `is_public = false` and `checkout_enabled = false`.
   - Trade-off: Cleaner source of truth, but it changes plan data and needs deployment/database migration coordination.
3. Should the plan features emphasize tokens or outcomes?
   - Recommendation A: Emphasize outcomes and include token/project limits as one or two rows.
   - Trade-off: Easier for buyers to understand, but less precise about metering.
   - Recommendation B: Keep token-heavy plan rows.
   - Trade-off: Transparent for power users, but makes the pricing page feel like infrastructure billing.
4. Should "design consulting" be a real entitlement now or marketing copy?
   - Recommendation A: Put "design consulting review" only on Pro as a light-touch benefit.
   - Trade-off: Strong premium differentiator, but creates a real service obligation.
   - Recommendation B: Avoid consulting for now and use "priority product/design guidance" wording.
   - Trade-off: Lower operational burden, but weaker premium positioning.
5. Should the 10-item list be identical in order across all plans?
   - Recommendation A: Use the same ordered list and show unavailable items muted or absent depending on existing UI fit.
   - Trade-off: Strong comparison clarity, but takes more layout work.
   - Recommendation B: Show only included items per card.
   - Trade-off: Faster and simpler, but users have to compare mentally.

## Recommended First Step
Approve the feature list and Enterprise-removal scope before code edits. The safest first implementation is a shared pricing configuration module used by the landing page, plus a small billing-page filter/normalizer so the authenticated pricing surface follows the same three-plan story even if Supabase still has extra public rows.

## Plan
1. Finish credit-system inventory.
   - Output: Categorized list of user-facing, backend, database, and legacy surfaces.
   - Validation: Cross-check `rg` results for `consume_credits`, `CreditBalance`, `credits`, `credit_cost`, `getTokenCost`, and plan display code.
2. Create a shared pricing feature model.
   - Likely file: `src/lib/pricing-plans.ts`.
   - Output: 10 canonical benefit strings plus per-plan inclusion counts.
   - Validation: Typecheck ensures both landing and billing can consume it.
3. Update landing pricing.
   - File: `src/app/page.tsx`.
   - Output: Three cards, no Enterprise card, 10-item benefit comparison with Free about 4, Starter 6-7, Pro 10.
   - Validation: Browser visual check of `/` desktop and mobile.
4. Update authenticated billing display.
   - File: `src/app/(dashboard)/billing/page.tsx`.
   - Output: No Enterprise self-serve card; plan features normalized to the same pricing feature set where possible.
   - Validation: Browser visual check of `/billing` if auth is available, otherwise compile/typecheck plus code inspection.
5. Decide and optionally add database migration.
   - Candidate: new Supabase migration setting Enterprise non-public and checkout-disabled.
   - Validation: Migration is reviewed for non-destructive behavior and does not delete plan records.
6. Update documentation if pricing architecture changes.
   - File: `PROJECT_CONTEXT.md`.
   - Output: Note that public self-serve pricing is three plans and Enterprise/internal plans are private/non-public.

## Proposed 10 Benefits
- 1 project on Free, higher monthly project allowances on paid plans
- Market research and competitor analysis
- Product Plan generation
- First Version Plan generation
- Design mockup generation
- Launch Plan generation
- Technical spec/export support
- App generation credits/tokens
- Priority support or faster help
- Pro design/product consulting review

## Suggested Inclusion
- Free: 1 project, market research, Product Plan, community support.
- Starter: Free items plus First Version Plan, Design Mockups, Launch Plan, and export support.
- Pro: All 10 items, including app generation, priority support, and design/product consulting review.

## Milestones
- Audit complete: Credit-system areas are documented with file references.
- Plan approved: Feature list, prices, and Enterprise hiding strategy are decided.
- UI updated: Landing and billing show three consistent plans.
- Verified: Typecheck/lint and browser visual checks pass or failures are documented.

## Validation
- `npm run lint` or the repo's focused lint/typecheck command if available.
- Focused unit tests for any new pure pricing helper if introduced.
- Browser verification with the Codex in-app browser for `/` and `/billing` when auth can be completed with `.env.e2e.local`.
- `rg -n "Enterprise|enterprise"` to confirm remaining references are intentional internal/database/history references.

## Risks And Mitigations
- Dirty worktree blocks syncing latest code: avoid overwriting, record the pull failure, and ask before stashing or rebasing.
- Stripe/Supabase price mismatch: keep existing prices unless a DB/Stripe update is part of scope.
- Enterprise removal could hide active subscribers' plan: do not delete records; if an active user is on Enterprise, current-plan display needs a safe fallback.
- Consulting promise creates operational load: phrase it as a limited review unless the business is ready to fulfill broader consulting.

## Rollback Or Recovery
- Revert code changes to pricing config and page components.
- If a migration is added, use a follow-up migration to restore Enterprise `is_public` / `checkout_enabled` flags; do not delete historical plan/subscription records.
- If browser verification catches layout issues, reduce feature-row density or switch to a comparison table.

## Open Decisions
- Starter price: `$29/mo` versus closer to `$20/mo`.
- Enterprise removal method: code filter versus Supabase migration.
- Whether "design consulting" is a concrete Pro entitlement.
- Whether public pricing should keep token math visible or shift mostly to outcome-based copy.

## Critique

### Software Architect
- A shared pricing config is preferable to hardcoding features twice, but the billing page currently depends on Supabase plan rows. The implementation must avoid pretending code is the source of truth if Stripe/Supabase still owns checkout eligibility.

### Product Manager
- The current pricing over-emphasizes tokens and even shows `~0 full report` for Free, which is poor buyer messaging. Outcome-based benefits with a token/allowance row will be clearer.

### Customer Or End User
- Users need to know what they can actually create, not just how many tokens they receive. The tier differences should be scannable without understanding internal metering.

### Engineering Implementer
- This is a narrow UI/product-copy change if prices stay unchanged. It becomes a billing-data change if plan prices or Enterprise visibility must be enforced in Supabase.

### Risk, Security, Or Operations
- Billing changes must not delete plans, alter subscriptions, or expose internal developer plans. Any Enterprise removal should be a visibility/checkout change only.
