---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Milestone 2, Dead Code Removal And High-Leverage Improvements

## Goal
Make all future work cheaper: delete the verified-dead legacy UI clusters (roughly 4,000 lines), decompose the 1,946-line `project-workspace.tsx` god component into testable hooks, make PDF export actually work on Vercel, add error monitoring with structured logging, add route-level tests for the billing money paths, and replace the stub README. After this milestone, the repo a contributor reads is the repo that runs.

## Assumptions
- Milestones 0 and 1 are complete: CI enforces tests, generate-app and stitch code are gone, `/api/chat` and `/api/prompt-chat` are 410-gated. This finalizes the dead-code inventory below.
- Vercel is the production target (Pro plan, given the 540 second function durations already configured).
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

## Clarifying Questions
1. What shape should the `project-workspace.tsx` decomposition take?
   - Recommendation A: Hooks-first extraction, one hook per commit, keeping a single orchestrator component: `useWorkspaceDocuments` (lazy loading and version state), `useGenerateAllHydration` (queue store wiring), `useWorkspaceScrollSync` (hash and scroll, pairs with the existing `workspace-scroll-sync.ts`), `useDocumentGeneration` (dispatch and local generation flags).
   - Trade-off: Lowest-risk path with reviewable steps and unit-testable hooks, but the JSX tree stays in one file until a later pass.
   - Recommendation B: Split into feature components (per-document sections own their state).
   - Trade-off: Better long-term shape but a much larger single change with higher regression risk; can follow A later.
2. How should PDF export run on Vercel?
   - Recommendation A: Swap `puppeteer` for `puppeteer-core` plus `@sparticuz/chromium`, with env-aware executable resolution replacing the hardcoded desktop Chrome paths in `src/app/api/generate-pdf/route.ts:26-37`.
   - Trade-off: Keeps the existing hardened route and API contract; adds one deploy-target-specific dependency.
   - Recommendation B: Drop server-side PDF and ship a print stylesheet (browser print to PDF).
   - Trade-off: Removes Puppeteer entirely (size, cold starts, basic-ftp advisory chain), but changes the user-facing feature and loses the styled PDF template.
3. Which monitoring service?
   - Recommendation A: Sentry (free tier, first-class Next.js App Router SDK, captures route errors and the existing `global-error.tsx`).
   - Trade-off: One new vendor and DSN env var; generous free quota for a pre-launch product.
   - Recommendation B: Vercel log drain to Logflare/Axiom.
   - Trade-off: Keeps everything in the hosting vendor, but error grouping, alerting, and stack traces are weaker than purpose-built error tracking.

## Recommended First Step
Re-run the dead-code verification greps (imports and JSX usage for every file in the inventory) on the post-Milestone-1 tree, then delete the first cluster (`content-editor`, `document-nav`, `analysis-panel`, `sidebar`) in a single commit and confirm build plus tests stay green. This proves the inventory method before the larger deletions.

## Plan
1. [ ] Re-verify the dead-code inventory against the current tree (grep for each module path and JSX tag; the audit greps are reproducible).
2. [ ] Deletion commit 1: `content-editor.tsx`, `document-nav.tsx`, `analysis-panel.tsx`, `sidebar.tsx`.
3. [ ] Deletion commit 2: `chat-interface.tsx`, `prompt-chat-interface.tsx`; reduce `src/app/api/prompt-chat/route.ts` to a minimal 410 stub (keep GET and POST exports returning the deprecation response); retire `prompt-chat-stage.ts` and `prompt-chat-intent.ts` plus their tests if the stub no longer imports them; check `prompt-chat-config.ts` for remaining importers (`DEFAULT_MODELS` is referenced by live code) and keep only what is used.
4. [ ] Clean the dead branches inside live files (unused handlers in `project-workspace.tsx`, unused values in `openrouter-image-mockup-pipeline.ts`) so lint warnings drop to near zero.
5. [ ] Workspace decomposition per Clarifying Question 1, one hook per commit:
   - Extract the hook, move state and effects verbatim, wire it in, run typecheck plus tests.
   - Manual QA after each commit using the relevant `QA_TEST_PLAN.md` flows (load workspace, generate a document, refresh mid-generation, hash navigation, version switching).
   - Add focused unit tests for hooks with extractable pure logic.
6. [ ] PDF on Vercel per Clarifying Question 2: implement, then validate on a Vercel preview deployment by exporting a real Product Plan PDF.
7. [ ] Monitoring per Clarifying Question 3:
   - Install and configure the SDK (server plus client config, `global-error.tsx` hook-in).
   - Add `src/lib/logger.ts` (level-aware, JSON in production) and migrate the highest-value `console.*` call sites first: webhook logging in `src/app/api/stripe/webhook/route.ts`, queue executor errors, credit refund failures.
   - Add an alert for repeated Stripe webhook failures (closes `docs/SECURITY_RELEASE_CHECKLIST.md` section 3 items).
8. [ ] Billing-path route tests (the April review's open recommendation):
   - consume succeeds, generation fails, refund is called (queue executor path).
   - Duplicate Stripe webhook event is claimed once (claim/reclaim logic with a mocked admin client).
   - Checkout rejects non-public or checkout-disabled plans (mocked plan lookup).
9. [ ] Rewrite `README.md`: what Maker Compass is, prerequisites, env var table (names and purpose only, no values), `npm run dev/test/lint/typecheck`, pointer to `PROJECT_CONTEXT.md`, `docs/`, and `plans/`.
10. [ ] Update `PROJECT_CONTEXT.md`: directory map drops deleted components, workspace section documents the hook structure, tech stack notes the monitoring addition and the Puppeteer change.

## Milestones
- Dead Code Gone: inventory files deleted, build and tests green, lint warnings near zero.
- Workspace Decomposed: `project-workspace.tsx` under roughly 800 lines with four extracted hooks, no behavior change observed in manual QA.
- PDF Works In Production: a real document exports successfully from a Vercel deployment.
- Failures Are Visible: a thrown route error appears in the monitoring dashboard with a stack trace; webhook failures alert.
- Money Paths Tested: the three billing-path tests run in CI.
- Onboarding Exists: README answers what, how to run, and where the real docs are.

## Validation
- `npm test`, `npm run typecheck`, `npm run lint` after every commit
- `npm run build` locally and on a Vercel preview
- Manual QA flows from `QA_TEST_PLAN.md` after each decomposition commit
- PDF export verified on the preview deployment, not just locally
- Force one test error in a route on preview and confirm it reaches the monitoring dashboard
- `git log --oneline` shows the decomposition as a sequence of small, individually green commits

## Risks And Mitigations
- Risk: A "dead" file is actually referenced dynamically (string-built import or route-level magic).
  - Mitigation: The inventory was verified by both import-path and JSX-tag greps; the build itself is the final check since Next.js fails on unresolved imports, and each deletion commit is small enough to bisect.
- Risk: The workspace decomposition subtly changes effect ordering and breaks queue hydration or scroll sync.
  - Mitigation: Move code verbatim per hook, one commit each, with the manual QA loop after every step; `workspace-scroll-sync.ts` and `generate-all` helpers already have tests that pin core logic.
- Risk: `@sparticuz/chromium` version drifts from `puppeteer-core` compatibility.
  - Mitigation: Pin both to a known-compatible pair and record the pairing in a comment; validate on preview before merging.
- Risk: Monitoring SDK adds noticeable cold-start weight.
  - Mitigation: Use the lightweight server config, sample traces conservatively, and measure a preview deployment before and after.

## Rollback Or Recovery
- Deletions and refactors are ordinary commits; `git revert` restores any step, and deleted files remain in git history permanently.
- The Puppeteer change is isolated to one route plus two package entries; reverting restores local-only behavior.
- Monitoring is additive; removing the SDK and env var disables it cleanly.

## Open Decisions
- Whether `prompt-chat-config.ts` should be folded into `document-definitions.ts` once its only remaining export is `DEFAULT_MODELS` (defer until step 3 reveals the true remaining surface).
- Whether to keep `src/app/api/chat/route.ts` code under the 410 gate or reduce it to a stub like prompt-chat; owner said chat may return, so default is keep-under-gate.

## Critique

### Software Architect
- Deletion before decomposition is the right order: refactoring around dead code wastes effort and the inventory is strongest immediately after Milestone 1 closes the routes.
- Hooks-first extraction respects the existing seams (the store, the scroll-sync lib, the document registry) instead of inventing a new architecture mid-flight.

### Product Manager
- PDF export is a headline feature that currently cannot work in production; fixing it quietly before launch avoids a day-one support issue.
- Nothing else here is user-visible, which is the point: this milestone buys velocity for the next feature, not features themselves.

### Customer Or End User
- Users get working PDF downloads and, indirectly, faster fixes when something breaks because errors now surface with context.

### Engineering Implementer
- The decomposition is the only multi-day item; everything else is a half-day or less. Resist bundling: ten small green commits beat one heroic diff.
- Write the three billing tests against the extracted pure logic where possible; mocking the full Supabase client is acceptable for the webhook claim test since the logic is pure conditionals over query results.

### Risk, Security, Or Operations
- Removing roughly 4,000 dead lines and the Puppeteer-bundled Chrome shrinks both the attack surface and the audit surface.
- Monitoring closes the checklist section 3 gap: today a production webhook failure is invisible unless someone reads Vercel logs at the right moment.
