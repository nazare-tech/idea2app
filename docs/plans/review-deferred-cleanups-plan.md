# Review Deferred Cleanups: Validators, Streaming Perf, Status Deltas, Plan-Key Cache

- linear: follow-ups from the 2026-07-10 review (docs/plans/code-review-remediation-2026-07-10-plan.md, Deferred list)
- implemented: true
- implemented_at: 2026-07-10T23:55:00-07:00
- implementation summary: All five items landed. Shared validators exported from contracts.ts (six isUuid copies deleted, checkout-analytics reuses isSafeToken/isRecord). Smoothing moved into PlanningStreamingDocument / CompetitiveStreamingDocument (workspace passes raw previews; per-tick re-renders stay in the leaf; timers die on unmount; motion-lab passes smoothTail={false}). Competitive structure/structured-data/mention-link sources now memo on the raw 3s poll content; only the active section tail is word-revealed. Status route delta protocol in src/lib/generation/streaming-preview.ts (full/suffix/unchanged) with the store reporting previewLengths on both fetch sites; intake wizard unchanged and still receives full content. Plan-key TTL cache (5 min, 500 entries) in src/lib/product-analytics/plan-name-cache.ts wired into /api/product-events. Verified: 575 unit tests pass (38 new across streaming-preview protocol, plan-name cache, contact/idempotency from prior batch), typecheck clean, lint clean except the pre-existing workspace-document-frame set-state-in-effect error, and a dev-server motion-lab smoke run rendered the streaming Market Research document with zero console errors. Residual risk: the suffix protocol was verified by unit tests and code review, not a live paid generation run; a desync falls back to keep-existing plus self-heal on the next poll, and legacy full-content mode remains the default for clients that send no lengths.
- created: 2026-07-10

## Goal

Fix the five efficiency/duplication findings deferred from the launch remediation batch.

## Scope and selected approach (Recommendation A each)

1. **Validator consolidation.** Export `isUuid`, `isSafeToken`, `isRecord` from `src/lib/product-analytics/contracts.ts` (client-safe module, already imported by most call sites) and delete the copies in client.ts, checkout-analytics.ts, upgrade-cta-link.tsx, mockups finalize/generate-option routes.
2. **Smoothing moved to the leaf.** Remove the three root-level `useSmoothedStream` hooks from project-workspace.tsx; pass raw gated preview text down. `PlanningStreamingDocument` and `CompetitiveStreamingDocument` smooth internally, so per-tick re-renders stay inside the streaming subtree and idle workspaces run zero timers (components unmount when the saved document loads). Dev motion-lab passes `smoothTail={false}` to keep its manual reveal control.
3. **Competitive per-tick cost.** Parse and structured data (including the competitor-mention regex/provider sources) are memoized on the raw 3s poll content; only the active section's prose tail is word-revealed per tick. Word reveal no longer recompiles regexes or rebuilds structured data 20x/sec. Planning documents keep per-tick markdown assembly, but it is string concat over pre-parsed sections and now leaf-scoped.
4. **Status delta transfer.** `/api/generate-all/status` accepts `previewDocType` + `previewLength` (the client's current preview length). Response modes: `full` (no client state, doc switch, or server content shorter than client = replaced run), `suffix` (server longer: send only the new tail + baseLength), `unchanged` (equal lengths: no content resent). Store sends its lengths on both fetch sites and merges accordingly. Intake wizard sends no params and keeps getting full content (backward compatible).
5. **Plan-key cache.** Module-level TTL cache (5 min, bounded 500 entries) around `getUserPlanName` in the product-events route so a batch flush every few seconds stops paying a subscriptions lookup per flush. Plan changes propagate within the TTL; analytics plan snapshots tolerate that staleness by design.

## Test strategy

Unit tests: shared validators still enforced (existing contracts tests), status-route merge logic in store (new merge unit test), streaming parse memo behavior via existing streaming tests, plan-key cache TTL behavior (new test if the cache is a pure helper). Full run: npm test, typecheck, lint (pre-existing workspace-document-frame error excluded).

## Rollback

Single commit revert; no schema or API-breaking changes (status route params optional).

## Critique

- Engineering: smoothing inside components changes reveal start on mount (starts from zero); acceptable because the components only mount at stream start.
- Risk: suffix protocol must never desync — merge only appends when existing length equals baseLength, otherwise it falls back to requesting full (client just keeps state; next poll sends its true length and the server responds accordingly).
- Over-engineering check: no generic delta framework, no cache library; smallest mechanism per finding.
