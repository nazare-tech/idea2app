---
implemented: true
implemented_at: 2026-06-19
implementation_summary: Removed the retired PDF export route/helper/dependencies; confirmed the legacy UI/chat dead-code inventory was already absent while preserving the prompt-chat 410 tombstone; decomposed `project-workspace.tsx` into focused workspace hooks; added Sentry App Router monitoring plus structured logging; extracted and tested billing/Stripe money-path helpers; rewrote README and updated project/security docs.
---

# Plan: Milestone 2, Dead Code Removal And High-Leverage Improvements

## Goal
Make all future work cheaper: delete the verified-dead legacy UI clusters (roughly 4,000 lines), decompose the 1,946-line `project-workspace.tsx` god component into testable hooks, remove the retired PDF export surface, add error monitoring with structured logging, add route-level tests for the billing money paths, and replace the stub README. After this milestone, the repo a contributor reads is the repo that runs.

## Assumptions
- Milestones 0 and 1 are complete: CI enforces tests, generate-app and stitch code are gone, `/api/chat` and `/api/prompt-chat` are 410-gated. This finalizes the dead-code inventory below.
- Vercel is the production target (Pro plan, given the 540 second function durations already configured).
- PDF export is no longer a product feature and should be removed rather than repaired.
- `callOpenRouterFallback` and `src/lib/prompts/legacy-fallback.ts` are LIVE (used by the gap-analysis path in `src/app/api/analysis/[type]/route.ts:225,331`) and are explicitly excluded from deletion.
- `src/components/layout/header.tsx` is LIVE (imported by `dashboard-shell.tsx`) and is excluded; only `sidebar.tsx` from that legacy pair is dead.
- Behavior-preserving refactors only: the workspace decomposition changes structure, not features.

## Dead Code Inventory (Verified By Import And JSX-Usage Search)
- `src/components/layout/content-editor.tsx` (585 lines): imported by nothing; sole importer of the next two.
- `src/components/chat/prompt-chat-interface.tsx` (572 lines) and `src/components/layout/document-nav.tsx`: only imported by content-editor.
- `src/components/analysis/analysis-panel.tsx` (677 lines): no importers, no JSX usage.
- `src/components/chat/chat-interface.tsx`: no JSX usage anywhere (its `/api/chat` caller role ended when the route was gated in Milestone 1).
- `src/components/layout/sidebar.tsx`: no importers.
- `src/app/api/prompt-chat/route.ts`: 652 lines of handler code behind an unconditional `isPromptChatDisabled() { return true }` gate at line 37; only the 410 stub is reachable.
- `src/lib/prompt-chat-stage.ts`, `src/lib/prompt-chat-intent.ts`: only imported by the gated route body (verify at execution time; their tests also retire with them).
- Dead branches inside live files flagged by lint: unused handlers in `src/components/workspace/project-workspace.tsx` (lines around 1008, 1120, 1124, 1810) and unused values in `src/lib/openrouter-image-mockup-pipeline.ts` (lines 224, 688).

## Resolved Decisions
1. The `project-workspace.tsx` decomposition will use Recommendation A.
   - Selected approach: Hooks-first extraction, one hook per commit, keeping a single orchestrator component: `useWorkspaceDocuments` (lazy loading and version state), `useGenerateAllHydration` (queue store wiring), `useWorkspaceScrollSync` (hash and scroll, pairs with the existing `workspace-scroll-sync.ts`), `useDocumentGeneration` (dispatch and local generation flags).
   - Trade-off: Lowest-risk path with reviewable steps and unit-testable hooks, but the JSX tree stays in one file until a later pass.
   - Deferred alternative: Split into feature components (per-document sections own their state).
   - Trade-off: Better long-term shape but a much larger single change with higher regression risk; can follow A later.
2. Retired PDF export will use Recommendation A.
   - Selected approach: Delete the PDF API route, client helper, UI entry points, Puppeteer dependency path, and related docs/tests in one scoped removal commit.
   - Trade-off: Best matches the current product direction and reduces dependency/security surface, but any future PDF return would need to be rebuilt deliberately.
   - Deferred alternative: Leave a minimal `410 Gone` route temporarily while removing UI entry points.
   - Trade-off: Safer if unknown external clients still call the endpoint, but leaves dead API surface in the repo.
3. Monitoring will use Recommendation A.
   - Selected approach: Sentry (free tier, first-class Next.js App Router SDK, captures route errors and the existing `global-error.tsx`).
   - Trade-off: One new vendor and DSN env var; generous free quota for a pre-launch product.
   - Deferred alternative: Vercel log drain to Logflare/Axiom.
   - Trade-off: Keeps everything in the hosting vendor, but error grouping, alerting, and stack traces are weaker than purpose-built error tracking.

## Recommended First Step
Re-run the dead-code verification greps (imports and JSX usage for every file in the inventory) on the post-Milestone-1 tree, then delete the first cluster (`content-editor`, `document-nav`, `analysis-panel`, `sidebar`) in a single commit and confirm build plus tests stay green. This proves the inventory method before the larger deletions.

## Plan
1. [x] Re-verify the dead-code inventory against the current tree (grep for each module path and JSX tag; the audit greps are reproducible).
2. [x] Deletion commit 1: `content-editor.tsx`, `document-nav.tsx`, `analysis-panel.tsx`, `sidebar.tsx`. These files were already absent when implementation began.
3. [x] Deletion commit 2: `chat-interface.tsx`, `prompt-chat-interface.tsx`; reduce `src/app/api/prompt-chat/route.ts` to a minimal 410 stub (keep GET and POST exports returning the deprecation response); retire `prompt-chat-stage.ts` and `prompt-chat-intent.ts` plus their tests if the stub no longer imports them; check `prompt-chat-config.ts` for remaining importers (`DEFAULT_MODELS` is referenced by live code) and keep only what is used. The route was already a minimal 410 tombstone and removed internals were already absent.
4. [x] Clean the dead branches inside live files (unused handlers in `project-workspace.tsx`, unused values in `openrouter-image-mockup-pipeline.ts`) so lint warnings drop to near zero.
5. [x] Workspace decomposition using the selected hooks-first approach, one hook per phase:
   - Extract the hook, move state and effects verbatim, wire it in, run typecheck plus tests.
   - Manual QA after each commit using the relevant `QA_TEST_PLAN.md` flows (load workspace, generate a document, refresh mid-generation, hash navigation, version switching).
   - Add focused unit tests for hooks with extractable pure logic.
6. [x] Remove retired PDF export using the selected full-removal approach: delete the route/helper/UI/docs/dependencies, then confirm no PDF entry points remain and build/tests stay green.
7. [x] Monitoring using the selected Sentry approach:
   - Install and configure the SDK (server plus client config, `global-error.tsx` hook-in).
   - Add `src/lib/logger.ts` (level-aware, JSON in production) and migrate the highest-value `console.*` call sites first: webhook logging in `src/app/api/stripe/webhook/route.ts`, queue executor errors, credit refund failures.
   - Add an alert for repeated Stripe webhook failures (closes `docs/SECURITY_RELEASE_CHECKLIST.md` section 3 items).
8. [x] Billing-path route tests (the April review's open recommendation):
   - consume succeeds, generation fails, refund is called (queue executor path).
   - Duplicate Stripe webhook event is claimed once (claim/reclaim logic with a mocked admin client).
   - Checkout rejects non-public or checkout-disabled plans (mocked plan lookup).
9. [x] Rewrite `README.md`: what Maker Compass is, prerequisites, env var table (names and purpose only, no values), `npm run dev/test/lint/typecheck`, pointer to `PROJECT_CONTEXT.md`, `docs/`, and `plans/`.
10. [x] Update `PROJECT_CONTEXT.md`: directory map drops deleted components, workspace section documents the hook structure, tech stack notes the Sentry monitoring addition and PDF export removal.

## Milestones
- Dead Code Gone: inventory files deleted, build and tests green, lint warnings near zero.
- Workspace Decomposed: `project-workspace.tsx` under roughly 800 lines with four extracted hooks, no behavior change observed in manual QA.
- PDF Export Removed: no UI entry points, helper calls, route usage, or Puppeteer dependency path remain for the retired feature.
- Failures Are Visible: a thrown route error appears in the monitoring dashboard with a stack trace; webhook failures alert.
- Money Paths Tested: the three billing-path tests run in CI.
- Onboarding Exists: README answers what, how to run, and where the real docs are.

## Validation
- `npm test`, `npm run typecheck`, `npm run lint` after every commit
- `npm run build` locally and on a Vercel preview
- Manual QA flows from `QA_TEST_PLAN.md` after each decomposition commit
- Search verifies no live PDF export entry points remain; build verifies deleted imports are gone
- Force one test error in a route on preview and confirm it reaches the monitoring dashboard
- `git log --oneline` shows the decomposition as a sequence of small, individually green commits

## Risks And Mitigations
- Risk: A "dead" file is actually referenced dynamically (string-built import or route-level magic).
  - Mitigation: The inventory was verified by both import-path and JSX-tag greps; the build itself is the final check since Next.js fails on unresolved imports, and each deletion commit is small enough to bisect.
- Risk: The workspace decomposition subtly changes effect ordering and breaks queue hydration or scroll sync.
  - Mitigation: Move code verbatim per hook, one commit each, with the manual QA loop after every step; `workspace-scroll-sync.ts` and `generate-all` helpers already have tests that pin core logic.
- Risk: Removing PDF export misses a hidden client helper, old button, or package reference.
  - Mitigation: Search for `generate-pdf`, `pdf-utils`, `puppeteer`, `marked`, and PDF/export UI labels; rely on build/typecheck to catch deleted imports.
- Risk: Monitoring SDK adds noticeable cold-start weight.
  - Mitigation: Use the lightweight server config, sample traces conservatively, and measure a preview deployment before and after.

## Rollback Or Recovery
- Deletions and refactors are ordinary commits; `git revert` restores any step, and deleted files remain in git history permanently.
- PDF export removal is isolated to the retired route/helper/UI/docs/dependency surface; reverting that commit restores the old feature surface if needed.
- Monitoring is additive; removing the SDK and env var disables it cleanly.

## Open Decisions
- Whether `prompt-chat-config.ts` should be folded into `document-definitions.ts` once its only remaining export is `DEFAULT_MODELS` (defer until step 3 reveals the true remaining surface).
- Whether to keep `src/app/api/chat/route.ts` code under the 410 gate or reduce it to a stub like prompt-chat; owner said chat may return, so default is keep-under-gate.

## Critique

### Software Architect
- Deletion before decomposition is the right order: refactoring around dead code wastes effort and the inventory is strongest immediately after Milestone 1 closes the routes.
- Hooks-first extraction respects the existing seams (the store, the scroll-sync lib, the document registry) instead of inventing a new architecture mid-flight.

### Product Manager
- Removing retired PDF export keeps the product surface honest: users only see supported features, and the team avoids maintaining a broken path.
- Nothing else here is user-visible, which is the point: this milestone buys velocity for the next feature, not features themselves.

### Customer Or End User
- Users lose no supported feature because PDF export is already retired, and they indirectly get faster fixes when something breaks because errors now surface with context.

### Engineering Implementer
- The decomposition is the only multi-day item; everything else is a half-day or less. Resist bundling: ten small green commits beat one heroic diff.
- Write the three billing tests against the extracted pure logic where possible; mocking the full Supabase client is acceptable for the webhook claim test since the logic is pure conditionals over query results.

### Risk, Security, Or Operations
- Removing roughly 4,000 dead lines and the Puppeteer-bundled Chrome shrinks both the attack surface and the audit surface.
- Monitoring closes the checklist section 3 gap: today a production webhook failure is invisible unless someone reads Vercel logs at the right moment.
