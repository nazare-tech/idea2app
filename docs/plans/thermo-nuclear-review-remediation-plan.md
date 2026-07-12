---
implemented: true
implemented_at: 2026-07-12T01:35:00Z
implementation_summary: Applied all thermo-nuclear review findings in seven chunked commits; fixed the reveal resetKey bug, merged the Stripe webhook lease protocol into one module with truthful finalization outcomes, made queue-item partial clears atomic with terminal status, collapsed hydrate/poll onto one status-payload reducer (deleting the client completion PATCH and its dead route), consolidated the competitor-source channel into competitor-mention-links, split the intake wizard into a phase machine plus step modules, unified the two marquees, and landed the minors batch (shared useReducedMotion, hero anchor derivation, shared script env parser, allowance prop slice).
---

# Plan: Thermo-Nuclear Code Quality Review Remediation

## Goal

Apply all findings from the 2026-07-11 thermo-nuclear code quality review of `origin/main..HEAD` (8 commits: intake Option 1 flow, reveal pacing, competitor streaming links, allowance gate, generate-all hydrate resilience, Stripe operational hardening). Behavior stays identical except where a finding is itself a behavior bug (B1, B3, B4, minor merge heuristics).

## Findings Being Remediated

### Blockers
- **B1** `competitive-streaming-document.tsx:268`: `resetKey: activeSection?.name ?? null` collapses consecutive unmapped sections (both `name === null`) to one key, so the word reveal does not reset between them. Fix: key on `heading`.
- **B2** `generate-all-store.ts`: hydrate's 5-attempt retry loop wraps side effects (auto-cancel POST, completion PATCH, `kickOffExecute`), and hydrate is a second divergent interpreter of the status payload. Fix: retry only the fetch; extract one `applyStatusPayload` reducer shared by hydrate and poll that trusts server-computed `dbRow.status`/`current_index`.
- **B3** `api/stripe/webhook/route.ts`: catch block conflates "handler failed" with "processed-write failed", stamping fully-processed events `failed` (immediately reclaimable, re-running side effects). Fix: only the event `switch` is guarded by the failure-stamping catch; a finalize failure logs and returns 500 without writing `failed`.
- **B4** `queue-service.ts`: `metadataWritten` compat flag races (`writeMetadata` outside `inFlight`, per-instance flag orphans metadata after stale-recovery reclaim) and terminal clear is non-atomic with status. Fix: fold `partial_content: null, partial_metadata: null` into terminal/reset/recovery updates, delete `finish()` spin-wait interplay for metadata and the flag; migration ships in this branch so no pre-migration compat.

### Majors
- **M1** Competitor-source channel smeared across five generic layers, `{ name, url }` shape inline-spelled 8+ times, wire shape `live_research.competitor_sources` hand-spelled at 2 write sites plus a client-side `metadataLike` shim. Fix: `competitor-mention-links.ts` owns the channel: export `CompetitorSource` everywhere, add `buildCompetitorSourceMetadata`, use `normalizeCompetitorSources` in `streaming-preview.ts` merge, let `getCompetitiveAnalysisStructuredData` accept extra sources and delete the shim.
- **M2** `idea-intake-wizard.tsx` is a 775-line god component with an implicit state machine decoded from boolean algebra plus a dead `isCreatingProject` branch. Fix: explicit `phase` union; extract `src/lib/intake/answers.ts` (pure answer-draft helpers), `src/lib/intake/wait-for-first-token.ts`, and split `IdeaStep` / `QuestionsStep` / `QuestionCard` components.
- **M3** Second marquee implementation (`IntakeMarquee` + new CSS) duplicating `ToolLogoMarquee` + CSS. Fix: promote the better one to `src/components/ui/marquee.tsx` with `durationSeconds`/`fadeWidth` props, port both call sites, delete the `.landing-logo-marquee` CSS block.

### Merged Stripe lease module (with B3)
- Claim + finalizer are one lease protocol split across two files with the fence predicate duplicated and two error conventions. Fix: `src/lib/stripe/webhook-lease.ts` exposing `claimWebhookEvent(...) -> { lease }` and `finalizeWebhookEvent(supabase, lease, outcome)`; distinguish lease-loss from missing-row in logs; use `.single()` instead of `.maybeSingle()` + invented null-lease invariant.

### Minors
- Extract shared `useReducedMotion` hook; migrate 5 ad-hoc detectors.
- Competitor-source "larger set wins" merge: replace with mode-aware replacement (full payload replaces sources).
- Hydrate retry classifies errors: retry network/5xx, fail fast on 4xx/parse.
- Wizard: chunk example rows programmatically; dead creating branch deleted (part of M2); button style string to a shared constant/variant.
- Hero artwork: derive side positioning from data, drop dual coordinate systems.
- Scripts: extract shared `.env` parser `scripts/lib/env.mjs`, reuse in both scripts.

## Recommendation A/B

- **A (selected):** Land remediation as a series of behavior-preserving refactor commits on `main`, each chunk verified by the full test suite + typecheck, with real-UI verification only for chunks that change user-visible flows (B1 reveal reset, M2 wizard, M3 marquee).
- B: Single mega-commit. Rejected: unreviewable, violates chunked-commit request.

## Test Strategy

- `npm test` (or repo runner) + typecheck after every chunk.
- New/updated unit tests: webhook-lease finalize outcomes, applyStatusPayload reducer, queue-service atomic clears, streaming-preview source replacement, answers helpers.
- Real-UI verification pass at the end for intake wizard, loader, marquees, competitive streaming reveal, per AGENTS.md evidence rules.

## Rollback

Each chunk is an independent commit; revert individually. No schema changes beyond already-shipped migration.

## Architecture Improvement Opportunities

- Generic `onStreamMetadata(Json)` channel replacing doc-specific callbacks: **deferred** (larger contract change; M1 consolidation reduces the pain now, revisit at second per-doc metadata consumer).
- Per-docType streaming validator map in status route: **deferred** with same trigger.
- Shared `Marquee` primitive: **selected** (M3).
- Shared `useReducedMotion`: **selected**.
- Wizard phase state machine: **selected** (M2).

## Critique

- Engineering: biggest risk is B2/M1 touching the same store file; sequence B2 before M1 and rerun tests between.
- Product: no visible behavior change intended except bug fixes; wizard split must not alter flow or copy.
- Risk: webhook refactor touches billing path; lease semantics covered by existing behavioral tests plus new outcome tests before route rewiring.
