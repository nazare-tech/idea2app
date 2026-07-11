# Code Review Remediation: 2026-07-10 Launch-Batch Findings

- linear: NAZ-68, NAZ-123, NAZ-124 (follow-up fixes), analytics foundation
- implemented: true
- implemented_at: 2026-07-10T22:30:00-07:00
- implementation summary: All 10 findings fixed in one commit. Verified: 537 unit tests pass (4 new/extended: idempotency fingerprint, DB-mirrored contact email regex, trailing-heading withholding in both streaming parsers), typecheck clean, lint clean apart from a pre-existing react-hooks/set-state-in-effect error in workspace-document-frame.tsx (confirmed present on the clean tree, untouched by this work). One pre-existing test updated: competitive alias test now commits its trailing heading with a newline, matching the new withhold rule.
- created: 2026-07-10

## Goal

Fix the 10 verified findings from the high-effort multi-agent review of commit range `c2628110..4a4b4c54` (contact form, product analytics, tier model routing, competitor mention links, workspace streaming).

## Findings and selected fixes (Recommendation A each)

1. **Stripe checkout idempotency key collides across attempts with differing analytics metadata** (`src/lib/stripe/checkout-idempotency.ts`). Fix: include the serialized analytics metadata fingerprint in the key hash. Same click retried (double-submit, network retry) keeps the same key; a new click (fresh attribution event id) gets a new key, so Stripe never sees one key with two payloads.
2. **Onboarding retry collapses maxAttempts to 1** (`src/app/api/generate-all/execute/route.ts`). `isBundledItem` compared `claimed.run_id` to `getQueueRunId()`, which now prefers the retry-minted `analyticsRunId`. Fix: compare against the enqueue-time `getRunMetadata(...).runId`; `getQueueRunId` stays analytics-only.
3. **Stale streaming preview shown on rerun** (`src/stores/generate-all-store.ts`). Fix: reset `streamingPreviews: {}` in `startGenerateAll`.
4. **Contact email validation weaker than DB constraint** (`src/lib/contact.ts`). Fix: mirror the DB regex `^[^@\s]+@[^@\s]+\.[^@\s]+$` so invalid emails 400 with a field error instead of 500 at insert.
5. **Upgrade attribution destroyed before checkout success** (`src/components/pricing/billing-plans-client.tsx`). Fix: read non-destructively (`getUpgradeAttribution`), consume only after a successful checkout response, right before redirect.
6. **Streaming parser commits a trailing partial `## Head` line** (`src/lib/planning-document-streaming.ts`, `src/lib/competitive-analysis-streaming.ts`). Fix: when not finished, withhold a final line that matches the H2 pattern until its newline arrives.
7. **Workspace analytics session leak on soft project switch** (`src/components/workspace/use-workspace-product-analytics.ts`). Fix: when the effect re-runs with a different projectId while a deferred session-end is pending, flush the old session synchronously and reset all per-session refs; same-project re-run (StrictMode) still just cancels the timer.
8. **Manual vs queue analytics builders diverge** (`src/lib/product-analytics/generation.ts` vs execute route). Fix: export shared `boundGenerationDurationMs` and `buildGenerationStepIdempotencyKey(runId, documentType)`; both paths use them (queue step key moves from `item.id` to `documentType`, safe because each run has one item per doc type and retries mint a new run id).
9. **Design-token violations** (`src/components/landing/contact-form.tsx` error color; `src/components/analysis/ai-prompt-files.tsx` em dash). Fix: `text-red-600` -> `text-destructive`; em dash sentence rewritten with a parenthetical and the duplicated "for this stack" removed.
10. **Planning-text doc-type set declared in ~5 places**. Fix: single source `PLANNING_TEXT_DOC_TYPES` + `isPlanningTextDocType` in `src/lib/document-definitions.ts`; store, status route, and execute route derive from it (`StreamingPreviewDocType` becomes an alias so consumers keep compiling).

## Test strategy

Extend unit tests where behavior changed: idempotency fingerprint, contact email regex, streaming trailing-heading withholding, store preview reset. Full run: `npm test`, typecheck, lint.

## Rollback

Single revertable commit; no schema changes.

## Architecture improvement opportunities

Selected: shared doc-type source (finding 10), shared analytics builders (finding 8). Deferred as separate work (flagged in review, not in this remediation): per-token re-parse cost in competitive streaming renderer, status-route delta transfer, `isUuid` consolidation, root-level `useSmoothedStream` placement, `getUserPlanName` per analytics flush.

## Critique

- Engineering: idempotency fingerprint widens key cardinality; acceptable because Stripe idempotency exists to dedupe identical retries, which still share a fingerprint.
- Risk: queue step idempotency key scheme change could double-count a step if an old-key event and new-key event exist for the same run in one deploy window; runs are short-lived and dashboards use `bool_or(generation_completed)`, so exposure is negligible.
- Product: contact validation tightening may reject previously "accepted" malformed emails; those all 500'd at insert anyway, so the change strictly improves UX.
