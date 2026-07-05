---
implemented: true
implemented_at: 2026-06-22T04:39:18Z
implementation_summary: Fixed competitive-analysis live-research state handling so empty or unusable provider data no longer masquerades as live competitor research, and added diagnostics plus regression tests.
---

# Plan: Fix Competitive Analysis Live Data Loss

## Goal
Find why the newest Nazara account projects saved Market Research reports that said no live competitors were found, determine whether this is a transient external API failure or an application bug, fix the code path if it is a bug, and verify with focused tests plus a real local/browser or API check without exposing credentials.

## Assumptions
- The failure is in the competitive-analysis generation path, not the renderer, because the symptom says the generated report did not receive competitor API data.
- The relevant pipeline is `src/lib/analysis-pipelines.ts` using `src/lib/perplexity.ts`, `src/lib/tavily.ts`, and `src/lib/prompts/competitive-analysis.ts`.
- Nazara account credentials are available in the local environment or existing browser/auth state. I will not print or commit credential values.
- Live reproduction may require approved network access because Perplexity, Tavily, Supabase, and local auth calls are external services.
- Existing uncommitted work in the repo is unrelated and must be preserved.

## Clarifying Questions
1. Should I prioritize diagnosing the two existing Nazara reports before changing code?
   - Recommendation A: Yes, inspect those saved reports and queue/API metadata first.
   - Trade-off: Stronger root-cause confidence, but it may require live Supabase/auth access.
   - Recommendation B: Start from local unit-level reproduction of empty API responses.
   - Trade-off: Faster and less dependent on production data, but it may miss an account-specific or deployment-only issue.
2. If live Perplexity or Tavily calls fail during verification, should the product block report generation or degrade with a clearer warning?
   - Recommendation A: Degrade gracefully, but make the missing-data reason explicit in logs/metadata and avoid claiming no competitors exist.
   - Trade-off: Users still get a report, but quality can be lower when external providers fail.
   - Recommendation B: Fail the Market Research step and show Retry.
   - Trade-off: More honest data quality, but onboarding can block entirely on an external provider outage.
3. Should existing bad Nazara reports be regenerated after the code fix?
   - Recommendation A: Do not mutate existing reports without explicit approval; verify the fix on a new or isolated run.
   - Trade-off: Avoids overwriting user artifacts, but the two bad reports remain bad until manually regenerated.
   - Recommendation B: Regenerate the two affected reports after confirming the bug.
   - Trade-off: Better user-facing cleanup, but it changes existing saved artifacts and may consume provider usage.

## Recommended First Step
Use subagents for parallel diagnosis: one explorer maps the competitive-analysis data path and recent code changes, while another checks available tests and likely fixture seams. In the main thread, inspect the two Nazara projects through the app or database using existing credentials/auth state, without exposing secrets.

## Plan
1. Diagnose the saved failures.
   - Identify the two most recent Nazara projects, their saved `analyses` rows, queue item statuses, metadata, and report wording.
   - Look for evidence of Perplexity/Tavily failures, empty URL extraction, malformed response parsing, or prompt-level wording that turns missing data into "no competitors found."
2. Map the code path.
   - Read `src/lib/analysis-pipelines.ts`, `src/lib/perplexity.ts`, `src/lib/tavily.ts`, `src/lib/prompts/competitive-analysis.ts`, and related tests.
   - Check whether API responses are parsed robustly and whether fallback states distinguish "provider failed" from "no competitors exist."
3. Reproduce with the smallest useful test.
   - Add or adjust a focused test around the pipeline behavior that currently produces a false "no live competitors found" result.
   - Prefer mocking Perplexity/Tavily/OpenRouter over spending live provider calls in unit tests.
4. Implement the smallest fix.
   - Preserve graceful degradation, but pass accurate live-data status into synthesis and metadata.
   - Ensure parser failures, missing API keys, provider errors, and true empty search results are distinguishable.
   - Avoid hardcoding any credentials or provider data.
5. Verify.
   - Run focused tests, then broader relevant tests/typecheck if feasible.
   - Run a local real-account or API verification against the actual workspace using the Codex browser/browser workflow by default, or authenticated API calls when that is the tighter check.
   - Confirm a new Market Research run either includes live competitors or surfaces a clear provider-failure state instead of incorrectly saying no live competitors were found.
6. Review and remediate.
   - Do fresh-eyes review passes over modified files.
   - Write `docs/plans/competitive-analysis-live-data-bug-review.md` with code review, security review, verification, and any remediation checklist.
   - Apply final fixes and update this plan metadata.

## Milestones
- Root cause identified: the bad reports can be explained by either provider outage/configuration or a specific code/prompt parsing bug.
- Regression covered: at least one focused test fails before the fix and passes after.
- Behavior fixed: missing live API data is no longer presented as "no live competitors found" unless the API truly found no competitors.
- Live/path verification complete: local or real-account check confirms the corrected path.

## Validation
- Focused unit/integration tests for competitive-analysis generation behavior.
- `npm test` or a scoped `node --import tsx --test ...` command depending on test surface and runtime.
- `npm run typecheck` if available/feasible.
- Codex browser or authenticated API verification for the Nazara account/projects, without printing secrets.

## Risks And Mitigations
- External APIs may be unavailable during verification: mock the failure mode in tests and record live check as inconclusive if the provider is down.
- Production account data could be accidentally altered: inspect first; do not regenerate or patch saved Nazara reports without explicit approval.
- Unrelated dirty worktree changes could be overwritten: use scoped edits and review diffs before applying patches.
- Provider responses may contain unexpected shapes: validate structured parsing and keep logs informative without leaking sensitive content.

## Rollback Or Recovery
- Revert only the files changed for this fix if the behavior regresses.
- Since existing bad reports are not automatically mutated, rollback does not need data migration.
- If a migration or metadata schema update becomes necessary, add a separate recovery note before implementing it.

## Open Decisions
- Whether to inspect production/Supabase data directly or only through the authenticated UI.
- Whether to regenerate the two bad Nazara reports after the code fix.
- Whether provider failures should block onboarding or produce a degraded but explicitly labeled report.

## Critique

### Software Architect
- The current graceful-degradation design is reasonable, but it needs a stronger state model. "No results," "API failed," "extraction failed," and "no API configured" should not collapse into one prompt-visible sentence.

### Product Manager
- Users care less about which provider failed and more about whether the market research is trustworthy. The fix should prevent confident false negatives and make Retry/re-generation decisions obvious.

### Customer Or End User
- A founder seeing "no live competitors found" may wrongly believe the idea has no competition. That is materially worse than a temporary "live competitor lookup failed" message.

### Engineering Implementer
- The likely fix should stay near the pipeline and prompt boundary, with tests around response classification. Avoid large renderer changes unless diagnosis proves the renderer transformed good data into bad wording.

### Risk, Security, Or Operations
- This touches authenticated account inspection and external APIs. Keep credentials out of logs, avoid printing report payloads that may include private user ideas unless needed, and do not mutate saved reports without approval.
