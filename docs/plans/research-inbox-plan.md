---
implemented: false
implemented_at:
implementation_summary: "Code complete; required authenticated Chrome evidence is blocked by an invalid test-account refresh token."
---

# Plan: Project-Agnostic Social Research Inbox

## Goal

Build an authenticated, sellable research workbench at `/research` that turns Last30Days output into a filterable action inbox. Seed it with current Maker Compass problem research. Users can track seen/saved/archived/replied state, generate drafts through Codex CLI, select a browser/posting path, and request broader or preference-guided results.

## Assumptions

- Current deliverable is a strong local-first first version inside Maker Compass, with project-agnostic domain types and provider boundaries.
- Last30Days is discovery-only; it never posts. Reply posting needs a separate, explicitly confirmed connector.
- Public social posting is not run during QA.
- Existing uncommitted work belongs to the user and must remain untouched.

## Clarifying Questions

1. Where should inbox state live first?
   - Recommendation A: Versioned, authenticated-user-scoped local persistence behind a repository boundary. Ships now without an unapplied production migration; single-browser limitation is explicit.
   - Recommendation B: New normalized Supabase tables and RLS. Multi-device, but requires migration rollout and larger authorization/test scope.
   - Selected: Recommendation A. Fastest reversible first version; Supabase repository is a documented next adapter.
2. How should posting work?
   - Recommendation A: Explicit confirmation, a full dry-run connector, and copy/open manual fallback. Codex-controlled Chrome is restricted to non-production single-operator mode with an allowlisted user.
   - Recommendation B: Direct per-network API integrations now.
   - Selected: Recommendation A. No credentials exist for network APIs; avoids pretending unsupported posting succeeded.
3. How should “find more” learn?
   - Recommendation A: Transparent weighted ranking from replied, saved, and archived exemplars, showing why each item surfaced.
   - Recommendation B: Opaque generated preference profile.
   - Selected: Recommendation A. Inspectable, reversible, easier to debug.

## Recommended First Step

Define provider-neutral item/state contracts and pure ranking/persistence behavior with tests before building the page.

## Runtime And Change-Impact Analysis

### Repeated Work

- Filter/ranking recomputes only when source, status, query, sort, or feedback state changes.
- Local persistence writes are debounced/coalesced per explicit user action, not polling.
- Hosted draft generation uses the existing OpenRouter path with paid-plan gating and rate limits. Optional Codex CLI runs only in non-production single-operator mode with an allowlisted user.
- Expected feed: tens to low hundreds of records. Current seed renders a small first page; progressive “find more” adds bounded batches.

### Ownership, Scope, And Lifetime

- `ResearchInboxState` belongs to one authenticated user ID plus workspace slug in versioned browser storage. Foreign namespaces are ignored across auth changes.
- Server reply generation owns only one request lifecycle; client retains draft/state.
- Posting confirmation binds exact item, exact draft hash, connector mode, and explicit user action. `post_attempted_at` and `unknown_outcome` are written before connector execution.
- Reset is a visible local action; no background deletion.

### Boundary And Cache Semantics

- Seed data is immutable source evidence. User state stores deltas keyed by stable item ID.
- Unknown/older local payload versions fall back safely to defaults.
- Browser choice is an allowlisted logical mode, never an executable path or cookie.
- External comment text is untrusted and securely delimited before Codex input.

### Failure And Recovery

- Draft failure preserves item and existing draft; retry remains available.
- Post failure never marks replied. Unknown outcomes survive reload and require manual reconciliation before retry.
- Manual copy/open remains available when automated connector is disabled.
- Corrupt local state is ignored, not allowed to crash the page.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| State loss | Pure persistence tests plus real-browser reload | Seen/saved/archived/draft state survives reload |
| Bad adaptive ranking | Deterministic unit tests | Replied outranks saved; archived demotes; no-feedback stays broad |
| Prompt injection | Prompt-builder tests | Untrusted text stays bounded/delimited; no shell interpolation |
| Duplicate posting | Confirmation/idempotency contract plus dry-run real UI path | Attempt persists before invoke; unknown outcomes block retry; failures never report success |
| UI overload | Real Chrome at 390x844 and 1440x900 | No horizontal overflow; controls remain keyboard/touch usable |
| Slow interaction | Browser interaction | Filter/save/archive feedback visible within 100ms locally |

## Architecture Improvement Opportunities

- Selected: Repository seam plus one reply-generator interface shared by hosted OpenRouter and local Codex adapters. Benefit: reusable core without needless port layers. Trade-off: posting/discovery remain direct until a second real implementation exists.
- Selected: Immutable seed plus state deltas. Benefit: safe reset, compact persistence, no evidence mutation. Trade-off: merge layer required.
- Selected: Transparent preference scoring. Benefit: explains curation and avoids hidden profile drift. Trade-off: simpler than learned embeddings.
- Selected: Secure no-shell Codex invocation, restricted to `NODE_ENV !== "production"` and `RESEARCH_CODEX_OPERATOR_USER_ID`. Benefit: prompt text cannot become shell syntax and hosted users cannot act through operator credentials. Trade-off: local single-operator only.
- Deferred: Normalized Supabase repository, durable jobs/leases, connector credentials, and multi-device state. Needed before hosted multi-user sale; too broad for this first UI increment.
- Deferred: Live Last30Days worker ingestion. This increment labels progressive expansion honestly as “Find more in this research” and expands a retained curated seed backlog; no unbacked live-discovery claim.
- Rejected: Claiming universal automated posting through a generic browser name. Unsupported and unsafe without per-connector capability checks.

## Plan

1. Add sanitized/paraphrased typed seed, user-scoped state, filtering, preference ranking, persistence, and tests. Test feature transfer: unlabeled items similar to replied exemplars outrank dissimilar items; no-feedback restores neutral order.
2. Add authenticated paid-plan OpenRouter draft API, optional single-operator Codex adapter, and guarded dry-run posting state machine with validation, rate limits, secure prompts, and tests.
3. Build responsive editorial inbox UI: source/status/search filters, seen/save/archive, reply editor, manual copy/open, explicit dry-run confirmation, and broad/adaptive “Find more in this research.” Freeze current row order until explicit expansion.
4. Wire `/research` into authenticated shell. Append backend history and update API/setup/system docs for routes, persistence schema version, env flags, and hosted limitations.
5. Run focused tests, typecheck, lint, real Chrome verification/evidence, fresh-eyes review, code/security review, remediation.

## Milestones

- Data core green: state and ranking tests pass.
- Reply core green: Codex generation route handles success/config/error safely.
- UI complete: all requested interactions exist and persist.
- Verified: desktop/mobile screenshots plus review artifact.

## Validation

- Focused Node tests for pure research modules and rendered static states.
- `npm run typecheck`, `npm run lint`, focused/full tests as risk permits.
- Real authenticated Chrome: filter by source, save, archive/undo, generate draft, reload, browser select, confirm post boundary, broad/adaptive find-more.
- No public external post during verification. Exercise full confirm/invoke/outcome/state path through dry-run connector.

## Risks And Mitigations

- Nested Codex runtime can be unavailable or slow: bounded timeout, actionable 503, manual reply editing remains usable.
- Local-first state is device-bound: label it; preserve repository interface for Supabase adapter.
- Research can contain hostile text: sanitize and XML-delimit; never execute URLs or content.
- Existing dirty worktree overlaps docs/UI: edit new files and narrow additive sections only.

## Rollback Or Recovery

- Remove `/research`, API routes, and research modules; existing project flows remain unchanged.
- User can reset local workspace state from the UI.
- Hosted production never exposes Codex/browser posting. Local connector requires non-production mode plus matching `RESEARCH_CODEX_OPERATOR_USER_ID`.

## Open Decisions

- None blocking. Recommendation A applies under repository policy.

## Critique

### Software Architect

- Local-first is intentionally not the hosted end state. Provider/repository seams must be real, not aspirational comments.

### Product Manager

- Main value is triage-to-action, not another research report. Saved/replied feedback must visibly improve curation.

### Customer Or End User

- Dense feeds become exhausting. Status filters, clear provenance, and one primary action per row are required.

### Engineering Implementer

- Avoid a monolithic client component. Keep filtering/ranking/persistence pure and split item/reply UI.

### Risk, Security, Or Operations

- External posting is the critical boundary. Never optimistic-update posted state or retry unknown outcomes blindly.

## Analytics Decision

- No product analytics events in this first version. Operational state remains local and content-bearing fields must never enter generic analytics. Add typed, content-free events only when a named funnel decision exists.

## Plan Evaluation

- Opposite-model evaluation: completed 2026-08-15 after one sandbox DNS retry.
- Accepted: all three blockers; hosted/local adapter split; user-scoped persistence; progressive seed expansion labeling; unknown-outcome posting state; dry-run proof; sanitized seed; explicit ranking-transfer test; backend history/docs; hidden unavailable connector controls; frozen session order; paid-plan draft gating.
- Rejected: none. Scope narrowed where required.

## Entitlement Decision

- Research reading/triage is available to authenticated users. Hosted AI reply generation mirrors the existing paid-plan composer gate. Local Codex reply generation additionally requires the operator-user allowlist. Public automatic posting is not part of hosted first version.
