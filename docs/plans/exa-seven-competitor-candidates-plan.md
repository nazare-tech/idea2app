---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Exa Seven-Candidate Competitor Discovery

## Goal

Let OpenRouter-managed Exa discover up to seven credible direct-competitor candidates, then make Market Research select only the strongest three to five direct competitors rather than treating every search candidate as display-worthy.

## Assumptions

- “Actual competitors” means current companies/products that materially overlap the same buyer, problem, workflow, and value proposition; directories, articles, generic platforms, and merely adjacent alternatives should be excluded.
- Exa remains a candidate-discovery input. Reachability, company identity, and deterministic relevance validation remain deferred to NAZ-129.
- Perplexity/Tavily fallback behavior stays at its existing three-to-five prompt contract.
- Existing saved Market Research rows are unchanged.
- Unrelated dirty-worktree changes, including `.claude/settings.local.json`, must be preserved.

## Clarifying Questions

1. Should seven be the search-candidate count or the displayed competitor count?
   - Recommendation A: Ask Exa for up to seven ranked candidates, then display only the strongest three to five direct competitors; show fewer if fewer than three credible matches exist.
   - Trade-off: Gives synthesis room to discard weak results while preserving the current UI density.
   - Recommendation B: Display all seven candidates.
   - Trade-off: More coverage, but conflicts with the requested three-to-five direct-competitor output and increases noise.
   - Selected: Recommendation A, matching the user’s stated goal while refusing to pad with non-competitors.
2. Should adjacent alternatives fill the seven-candidate quota?
   - Recommendation A: Return fewer than seven when seven credible direct matches cannot be supported; do not pad with adjacent results.
   - Trade-off: Candidate count may be lower, but trust and relevance improve.
   - Recommendation B: Fill unused slots with clearly labeled adjacent alternatives.
   - Trade-off: More context, but weak entries can leak into the final report.
   - Selected: Recommendation A, because the user prioritized actual direct competitors.
3. Should this change implement mandatory identity/relevance validation?
   - Recommendation A: Strengthen discovery and synthesis filtering now; leave deterministic URL/identity/relevance validation to NAZ-129.
   - Trade-off: Small, reversible scope; model judgment still cannot guarantee every candidate is valid.
   - Recommendation B: Block this change on a new network validation layer.
   - Trade-off: Stronger trust boundary, but much larger scope, latency, SSRF risk, and duplication of tracked work.
   - Selected: Recommendation A, consistent with the existing accepted provider experiment and tracked follow-up.

## Recommended First Step

Add failing contract tests proving Exa requests seven search results, asks for up to seven ranked direct candidates without padding, and tells final synthesis to select only three to five strong direct competitors.

## Runtime and Change-Impact Analysis

### Repeated Work

- Trigger: one Exa discovery call per new Market Research generation attempt, with existing retry behavior on retryable provider failures.
- Expected and worst-case frequency: unchanged call count; each attempt can now retrieve at most seven results instead of five. Existing retry maximum remains unchanged.
- Work per update: up to two extra search results, each bounded to 2,000 characters by the OpenRouter tool request. Parsing remains bounded to ten candidates; citation count remains bounded to ten.

### Ownership, Scope, And Lifetime

- Changed resource: Exa request budget and Exa-specific candidate-selection instructions for one request lifetime.
- Narrowest owner: `src/lib/openrouter-competitor-research.ts`; final report selection remains in `src/lib/prompts/competitive-analysis.ts`.
- Fan-out: candidate context flows into one Market Research synthesis call and optional metadata; workspace synthesis aims for three to five direct competitors but permits fewer when evidence supports fewer.
- Retry/restart/completion: existing pipeline retry, fallback, save, and queue behavior stays unchanged.

### Boundary And Cache Semantics

- Contract changes: OpenRouter Exa tool budget changes from five to seven; Exa response prompt target changes from three-to-five to up-to-seven ranked candidates; synthesis still emits three-to-five entries.
- Cache behavior: none.
- Compatibility: parser already accepts up to ten candidates. Existing reports and fallback provider output remain compatible.

### Failure And Recovery

- Partial/duplicate/stale behavior: model may return fewer than seven, duplicate, weak, or more than seven candidates; the Exa adapter hard-caps retained candidates at seven, prompt forbids quota padding, and synthesis rejects weak/adjacent entries. If fewer than three supported matches remain, it outputs fewer rather than inventing entries. Existing URL normalization remains active.
- Blast radius: only newly generated Market Research documents using the Exa primary path.
- Recovery: `OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=1` restores the fallback primary path; reverting prompt/request constants requires no data migration.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| Exa still receives five-result budget | Request-shape unit test | `max_results` and `max_total_results` both equal 7 |
| Exa model still returns only 3–5 candidates | Prompt contract test | Exa request asks for up to 7 ranked direct candidates and explicitly allows fewer |
| Weak candidates leak into displayed set | Synthesis prompt contract test | Prompt requires selecting 3–5 strongest direct matches and excluding adjacent/weak results |
| Shared fallback behavior accidentally changes | Perplexity prompt tests/full focused suite | Existing fallback tests remain green |
| Payload becomes unbounded | Existing parser/context bounds plus focused tests | Candidate parser cap remains 10; tool result text remains 2,000 characters each; synthesis context remains 15,000 characters |

## Architecture Improvement Opportunities

- Exa-specific request contract: keep seven-candidate behavior at the Exa adapter boundary so the legacy Perplexity fallback remains stable. Benefit: no provider contract drift. Trade-off: small explicit prompt customization. Likely files: `src/lib/openrouter-competitor-research.ts`, `src/lib/prompts/competitor-search.ts`. Status: selected.
- Prompt/search/render contract sync: distinguish discovery candidates (up to seven) from rendered direct competitors (three to five). Benefit: prevents “fetch seven” from becoming “show seven.” Trade-off: two contract tests. Likely files: search prompt, synthesis prompt, tests. Status: selected.
- Deterministic URL/company/relevance validation: stronger trust guarantees. Trade-off: network latency, redirect/SSRF controls, and larger scope. Likely boundary: post-search validator before synthesis. Status: deferred to NAZ-129.
- New analytics event: internal provider quality change has no new impression, action, entitlement, or lifecycle transition. Status: rejected as unnecessary; existing generation lifecycle events remain authoritative.

## Plan

1. Add red tests for seven-result Exa request and direct-candidate discovery wording.
2. Add red synthesis-prompt test for selecting three to five strongest direct competitors while discarding weak candidates.
3. Implement the scoped Exa request/prompt and synthesis-contract changes.
4. Update `PROJECT_CONTEXT.md` and backend change history.
5. Run focused tests, typecheck, scoped lint, diff check, fresh-eyes review, code review, and security review; remediate findings.
6. Verify a fresh Idea 1.1 project through the real Chrome UI if configured live services and browser remain available; capture evidence under `ui-evidence/2026-07-11/exa-seven-competitor-candidates/`. If unavailable, report the blocker without substituting fixtures or API-only generation.

## Milestones

- Discovery contract green: Exa budget and prompt target seven credible candidates.
- Synthesis contract green: displayed output remains three to five direct matches.
- Verification green: focused tests and static checks pass; live fresh-project evidence captured or honestly blocked.

## Validation

- Focused Node tests for Exa request shape and competitive-analysis prompt behavior.
- Typecheck, scoped ESLint, `git diff --check`, and relevant test suite.
- Fresh authenticated Chrome/Profile Plasma Idea 1.1 generation, saved metadata/log inspection, and Direct Competitors screenshot when live verification is available.

## Risks And Mitigations

- More Exa results increase context/cost slightly: retain one search call, 2,000 characters per result, ten-citation cap, ten-candidate parser cap, and 15,000-character synthesis input cap.
- “Actual competitor” remains model-judged: require current official website, same buyer/problem/workflow/value proposition, ranked directness, and no quota padding; keep NAZ-129 visible.
- Prompt drift between providers: apply seven-candidate wording only to Exa; preserve fallback prompt behavior.
- External content remains untrusted: retain secure prompt delimiters, public HTTP(S) URL filtering, content bounds, and no execution of source content.

## Rollback Or Recovery

- Set `OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=1` for immediate provider rollback.
- Revert the Exa cap and prompt clauses. No migration or saved-row rewrite is needed.

## Open Decisions

- Real Chrome UI verification is pending permission to open a fresh Profile 1 window after browser discovery returned no controllable Chrome instance despite healthy extension/native-host checks.

## Critique

### Software Architect

- Candidate discovery and final display are separate contracts and must stay explicit. Prompt-only relevance filtering improves quality but does not replace the deferred validation boundary.

### Product Manager

- Seven candidates improve recall only if the report discards weak matches. Success is better direct-competitor precision, not always filling seven slots.

### Customer Or End User

- Users should see three to five more credible direct competitors, not a longer noisy list. A bad candidate can still appear until deterministic validation ships.

### Engineering Implementer

- Parser bounds already support seven. Minimal safe work is request/prompt/test/documentation alignment, not a new filtering framework.

### Risk, Security, Or Operations

- Two extra bounded results slightly expand untrusted context. Existing URL/content bounds, prompt isolation, fallback, and rollback controls contain the added exposure.
