# Review: OpenRouter-Managed Exa for Market Research

## Outcome

Implemented OpenRouter's current `openrouter:web_search` server tool with the managed Exa engine as the primary Market Research discovery path. Perplexity and Tavily remain non-fatal fallback providers. Candidate URLs receive the existing syntactic public HTTP(S) safety checks but intentionally do not receive reachability, redirect, company-identity, or product-relevance validation; that work remains P1 backlog issue [NAZ-129](https://linear.app/nazareworkspace/issue/NAZ-129/add-mandatory-competitor-url-and-identity-validation-after-exa).

## Scope Reviewed

- Provider-neutral bounded competitor parser and status classification.
- OpenRouter Exa request, response, citation parsing, timeout, retry, and model selection.
- Exa-first orchestration, Perplexity/Tavily fallback, progress callbacks, persisted provenance, and rollback flag.
- Synthesis prompt/context behavior, including unmatched citations and prompt-injection boundaries.
- Architecture/setup documentation and the fresh standardized Idea 1.1 user flow.

## Verification

- `node --import tsx --test src/lib/competitor-research.test.ts src/lib/analysis-pipelines.test.ts src/lib/competitive-analysis-prompt.test.ts src/lib/openrouter-competitor-research.test.ts`: 36 passed.
- `npm test`: 562 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- Scoped ESLint across changed TypeScript files: passed.
- `git diff --check`: passed.
- Live adapter smoke used the configured OpenRouter account and returned four parsed competitors plus five bounded citations through `google/gemini-3.5-flash-20260519`.
- Real authenticated Chrome/Profile Plasma flow created fresh Idea 1.1 project `f3f634a7-f4fc-4603-a1e5-95f7911da1d3` and rendered Market Research at `/projects/f3f634a7-f4fc-4603-a1e5-95f7911da1d3-signal-driven-roadmap-intelligence#market-research-direct-competitors` at 1430x1439.
- The saved analysis metadata reported `provider_used: openrouter_exa`, search status `found`, model `google/gemini-3.5-flash-20260519`, five citations, and `fallback_used: false`. The rendered competitors were Enterpret, Sentra, and HyperOrbit.
- Screenshot: `ui-evidence/2026-07-10/openrouter-exa-market-research/fresh-idea-1-1-direct-competitors.png`.

## Code Review Findings And Remediation

- Fixed: unmatched Exa citations were counted but omitted from synthesis unless their URL exactly matched a candidate URL. Bounded unmatched citations now appear in an Additional Research Evidence section; regression coverage verifies URL and excerpt retention.
- Fixed: the competitor-details progress stage occurred after extraction. The progress contract now emits `Reviewing competitor evidence...` from the orchestration boundary, before Tavily extraction on fallback and immediately after Exa returns on the primary path; callback-order tests cover both paths.
- Fixed: fallback provenance previously reported `perplexity_tavily` when Tavily produced no evidence and treated all-failed extraction as success. Provider metadata now distinguishes `perplexity` and `perplexity_tavily`; extraction states distinguish success, partial, empty, missing configuration, and failure. Tests cover missing, thrown, empty, all-failed, and partial cases.
- Added: model-authored candidate arrays and fields now have explicit count and length bounds before further processing.
- Fixed: progress callback exceptions could be caught as provider failures, discard a valid Exa result, or misclassify Tavily. Callback failures now use a distinct error and propagate without triggering fallback; primary and fallback regression tests cover the behavior.
- Fixed: Tavily logs no longer claim success for empty, partial, or all-failed outcomes. A neutral completion event records the classified extraction status.

## Security Review Findings And Remediation

- Fixed: external search excerpts were bounded but not explicitly classified as untrusted data. The system prompt now forbids following instructions embedded in records, URLs, titles, or excerpts; the prompt uses the secure builder's escaped `user_input name="competitorContext"` boundary. A malicious delimiter/excerpt regression test protects this boundary.
- Confirmed: provider credentials stay server-side; time, retry, result, citation, JSON, candidate, and excerpt limits are bounded; logs omit prompts and excerpts; authentication, ownership, persistence authority, and RLS are unchanged.
- Accepted deferred risk: syntactically public Exa candidate URLs can still be stale, parked, repurposed, misleading, or malicious. They are not fetched by this server path, but they may become clickable in the UI. NAZ-129 owns reachability, redirect, identity, relevance, and SSRF-aware validation.

## Architecture Improvement Review

- Landed: provider-neutral parser, dedicated OpenRouter Exa adapter, dependency-injected orchestration, explicit metadata provenance, fallback classification, bounded untrusted research context, and fast rollback flag.
- Deferred: mandatory URL/identity validation remains deferred by explicit product decision to NAZ-129.
- Rejected: historical metadata migration remains unnecessary because it could imply provenance that older rows do not have.
- No new authorization gap, database migration, non-idempotent persistence path, or recovery blind spot was introduced. The intentional trust gap is visible in documentation and the backlog ticket.

## Product Analytics Review

No new product analytics event is warranted. This changes an internal research provider and metadata provenance, not a new user-visible feature, intentional user action, entitlement, or trusted lifecycle transition. Existing generation lifecycle events remain authoritative.

## Recovery

Set `OPENROUTER_EXA_MARKET_RESEARCH_DISABLED=1` to restore Perplexity/Tavily as the primary path without reverting or rewriting saved reports. No schema rollback is required.

## Final Re-review

Independent final code and security re-reviews found no remaining actionable findings after remediation.
