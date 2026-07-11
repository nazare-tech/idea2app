---
implemented: true
implemented_at: 2026-07-11T06:26:00Z
implementation_summary: OpenRouter-managed Exa is now the primary bounded competitor-research path, with Perplexity/Tavily fallback, explicit provider provenance, untrusted-evidence prompt isolation, rollback controls, and real fresh-project UI verification. Reachability and identity validation remain intentionally deferred to NAZ-129.
linear_follow_up: https://linear.app/nazareworkspace/issue/NAZ-129/add-mandatory-competitor-url-and-identity-validation-after-exa
---

# Plan: OpenRouter-Managed Exa for Market Research

## Goal

Make OpenRouter-managed Exa the primary live competitor-research path for Market Research, while retaining the current Perplexity/Tavily chain as a non-fatal fallback. This implementation intentionally excludes reachability, redirect, company-identity, and product-relevance validation; that trust layer is deferred to P1 backlog issue NAZ-129.

## Assumptions

- OpenRouter remains the only credential required for the primary search path; Exa is selected as a server-managed engine and does not require a separate Exa key.
- The research call uses the standard-tier Gemini 3.5 Flash model for predictable low cost, independent of the plan-tier model used for final report synthesis.
- Existing syntactic/public-URL sanitization remains in place as a rendering security boundary. It is not treated as the deferred identity-validation layer.
- Existing saved Market Research rows are not migrated or regenerated.
- The current branch and unrelated dirty-worktree changes must be preserved.

## Clarifying Questions

1. Which OpenRouter web-search interface should be used?
   - Recommendation A: Use the current `openrouter:web_search` server tool with `engine: "exa"`, bounded to five results and one five-result total budget.
   - Trade-off: This is OpenRouter's supported direction, but the model decides whether to search; the prompt must explicitly require a current search, and absence of citations should trigger fallback.
   - Recommendation B: Use the deprecated `plugins: [{ id: "web", engine: "exa" }]` interface, which always searches once.
   - Trade-off: More deterministic today, but it starts new production work on a deprecated API.
   - Selected: Recommendation A, because it follows the current OpenRouter contract and keeps migration risk low.
2. When should the legacy providers run?
   - Recommendation A: Run Perplexity/Tavily only when Exa errors, produces invalid JSON, returns no usable public URLs, or provides no web citations.
   - Trade-off: Keeps Exa primary and controls cost while preserving graceful degradation.
   - Recommendation B: Always run both paths and merge results.
   - Trade-off: More evidence, but doubles provider cost/latency and makes source precedence less clear.
   - Selected: Recommendation A, matching the user's request to make Exa the primary path.
3. Should Exa candidate URLs be identity-validated before use?
   - Recommendation A: Do not add reachability or company-identity validation in this change; persist syntactically safe Exa candidate URLs and defer deeper validation to NAZ-129.
   - Trade-off: Ships the tested low-cost path quickly, while accepting known bad-link risk.
   - Recommendation B: Block implementation on the mandatory validation layer.
   - Trade-off: Better trust guarantees, but contradicts the user's explicit decision to defer validation.
   - Selected: Recommendation A by explicit user direction.

## Recommended First Step

Add focused red tests for the OpenRouter Exa request shape, bounded citation parsing, shared competitor JSON parsing, primary/fallback orchestration, and metadata provenance before changing the live pipeline.

## Architecture Improvement Opportunities

- Shared provider-neutral competitor parser: centralize the existing JSON extraction and candidate types so OpenRouter and Perplexity cannot drift. Benefit: one prompt/parser contract and smaller fallback code. Trade-off: a focused refactor of Perplexity parsing. Likely files: `src/lib/competitor-research.ts`, `src/lib/perplexity.ts`, tests. Status: selected.
- Dedicated Exa retrieval module: isolate OpenRouter-specific server-tool request/annotation parsing from the large analysis orchestrator. Benefit: testable provider boundary and easier server-tool evolution. Trade-off: one new module. Likely files: `src/lib/openrouter-competitor-research.ts` and tests. Status: selected.
- Provider orchestration helper with dependency injection: keep primary/fallback selection testable without paid requests. Benefit: deterministic tests and clear metadata. Trade-off: modest new type surface. Likely file: `src/lib/analysis-pipelines.ts`. Status: selected.
- Fast rollback flag: `OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=1` restores Perplexity/Tavily-primary behavior without reverting a deploy. Benefit: operational recovery from beta server-tool regressions. Trade-off: one documented environment flag. Status: selected.
- Mandatory URL and identity validation: catches 404, repurposed, parked, and unrelated domains. Benefit: stronger user trust. Trade-off: added latency and implementation scope. Likely boundary: post-search, pre-synthesis server validator. Status: explicitly deferred to NAZ-129.
- Historical report migration: could retrofit provider metadata into older reports. Benefit: uniform metadata. Trade-off: inaccurate provenance and destructive rewrite risk. Status: rejected as unnecessary.

## Plan

1. Add provider-neutral candidate/evidence types and parser tests; adapt Perplexity to reuse the parser without behavior changes.
2. Add the OpenRouter-managed Exa retrieval module using the supported server tool, bounded results/context, explicit current-web prompt, citation extraction limits, retry, and timeout handling.
3. Add testable orchestration that prefers Exa and invokes Perplexity/Tavily only for configured failure conditions.
4. Feed Exa annotations into the existing synthesis context, persist provider/status/citation metadata, and preserve safe competitor-source rendering behavior.
5. Update prompt wording, project architecture context, backend change history, and environment/rollback documentation.
6. Run focused tests, typecheck, lint, full relevant tests, fresh-eyes reviews, code review, and security review; remediate findings.
7. Verify through the real authenticated local UI with a fresh standardized Idea 1.1 project and capture Market Research evidence under `ui-evidence/2026-07-10/openrouter-exa-market-research/`.

## Milestones

- Provider boundary green: Exa request and response parsing pass isolated tests.
- Fallback green: orchestration proves Exa-first success and Perplexity/Tavily fallback without external calls.
- Pipeline green: Market Research metadata and synthesis context identify the actual provider used.
- Real-flow green: a fresh project produces Market Research through OpenRouter-managed Exa and renders usable competitor output.

## Validation

- Node tests for provider parser, Exa adapter, analysis orchestration, prompts, and competitor-source metadata.
- TypeScript typecheck and scoped ESLint.
- `git diff --check` and relevant full test suite.
- Real Chrome/Profile Plasma authenticated intake flow using Idea 1.1.
- Inspect the fresh analysis row metadata and server logs for `provider_used: openrouter_exa`, Exa citation count, no fallback, and bounded research model.
- Screenshot the fresh Market Research route and record viewport/state/path.

## Risks And Mitigations

- OpenRouter server tool is beta and may choose not to search: require citations for primary-path success and fall back when none are returned.
- Exa can return stale or incorrect official URLs: preserve syntactic URL safety and renderer fail-closed behavior where sources are absent; track full validation in NAZ-129.
- Third-party excerpts are untrusted prompt content: delimit them as evidence, explicitly forbid following embedded instructions, pass them through the bounded secure prompt builder, cap citation count and content length, and never execute HTML.
- Provider outage or key issue: preserve non-fatal Perplexity/Tavily fallback and add the rollback flag.
- Dirty-worktree overlap: avoid Generate All route changes and patch only the provider/pipeline-specific hunks in shared files.

## Rollback Or Recovery

- Set `OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=1` to restore the legacy primary path immediately.
- Remove the Exa adapter and orchestration branch to return to Perplexity/Tavily; no schema migration or historical rewrite is required.
- Existing reports remain readable because new metadata fields are optional and stored in the existing JSON metadata column.

## Open Decisions

- None. The user explicitly approved Exa without the deferred validation layer.

## Critique

### Software Architect

- A separate retrieval adapter and shared parser keep the beta OpenRouter contract out of the main pipeline. The primary weakness is intentionally trusting model-proposed URLs without identity validation; the source metadata must make that provenance explicit rather than calling it verified.

### Product Manager

- Exa's cost and direct excerpts make it a practical primary research path. The known bad-link risk remains customer-visible, so NAZ-129 should stay P1 and this implementation must not imply that candidate identity was verified.

### Customer Or End User

- Users should receive fresher competitor results and fewer missing-research fallbacks. They can still encounter an inaccurate link until NAZ-129 ships, which is an explicit accepted trade-off.

### Engineering Implementer

- The largest integration risk is interleaving new provider metadata with existing NAZ-68 source-link and NAZ-123 model-routing work. Tests must cover compatibility and patches must preserve both.

### Risk, Security, Or Operations

- Search snippets and URLs are untrusted external input. Keep them bounded, escaped by React, sanitized to public HTTP(S) for links, and isolated from secrets/logs. No new auth, RLS, payment, or database migration is required.
