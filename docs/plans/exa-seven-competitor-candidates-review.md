# Review: Exa Seven-Candidate Competitor Discovery

## Outcome

Code and documentation are complete. Real authenticated UI verification remains pending Chrome connection recovery permission, so the implementation plan remains `implemented: false`.

## Scope

- Exa-specific seven-result tool budget and discovery prompts.
- Deterministic seven-candidate response cap.
- Final three-to-five direct-competitor selection, including the supported-fewer-than-three policy.
- Legacy Perplexity prompt compatibility.
- Prompt injection boundaries, URL/content bounds, documentation, and rollback behavior.

## Verification

- Red-green focused tests covered 7/7 request shape, seven-candidate response cap, Exa directness/no-padding instructions, synthesis filtering, fewer-than-three policy, secure delimiter escaping, and legacy fallback behavior.
- `npm test`: 578 passed, 0 failed.
- `npm run typecheck`: passed.
- Scoped ESLint across changed TypeScript files: passed.
- `git diff --check`: passed.
- Chrome health: Google Chrome 149 installed and running; selected Profile 1 has the ChatGPT Chrome Extension installed/enabled; native messaging manifest exists and is valid. Browser discovery and one delayed retry returned no controllable Chrome instance. Opening a fresh Chrome window requires user permission before retrying.

## Fresh-Eyes Self Review

- Pass 1 found synthesis wording that treated every researched candidate as a real competitor. Fixed by describing research as a candidate pool requiring evidence-based selection.
- Pass 2 reviewed source, tests, prompt version, project context, backend history, and rollback references. No additional issue found before independent review.

## Code Review Findings

- Fixed, medium: Exa output could retain 8–10 model-authored candidates because only the shared ten-candidate parser cap existed. `parseOpenRouterExaCompletion` now slices to seven; regression test covers nine returned candidates.
- Fixed, medium: one or two credible candidates conflicted with a strict three-to-five output requirement. Synthesis now outputs only supported matches when fewer than three exist, never weak or invented padding.
- Fixed, medium: shared prompt refactoring unintentionally changed Perplexity fallback behavior. Legacy Perplexity system prompt is restored; Exa owns the new stricter criteria.
- Fixed, low: added secure delimiter escaping coverage and provider-specific prompt compatibility coverage.

## Architecture Improvement Review

- Landed: Exa-specific prompt contract, deterministic provider cap, discovery-versus-display contract separation, prompt-version bump, and rollback compatibility.
- Deferred: reachability, redirect, company-identity, and deterministic relevance validation remain owned by NAZ-129.
- No new duplication affecting runtime ownership, non-idempotent path, authorization gap, or recovery blind spot was introduced. Shared JSON response schema avoids duplicating the structured output contract across provider prompts.

## Security Review Findings

- Confirmed: idea/name values still pass through `buildSecurePrompt`; regression coverage proves escaped prompt delimiters.
- Confirmed: external records remain bounded untrusted evidence; URLs still pass existing public HTTP(S) syntactic filtering; Exa retains seven candidates, ten citations, and 2,000 characters per search result.
- Confirmed: no secrets, auth/RLS, database schema, permissions, logging payloads, payments, or new endpoints changed.
- Accepted deferred risk: prompt filtering cannot guarantee company identity or direct relevance. NAZ-129 remains required for that trust boundary.

## Product Analytics Review

No new event is warranted. This changes internal competitor discovery quality, not a new impression, intentional action, entitlement, or trusted lifecycle transition. Existing generation lifecycle events remain authoritative.

## Remediation Checklist

- [x] Hard-cap retained Exa candidates at seven.
- [x] Define fewer-than-three behavior without padding.
- [x] Restore legacy Perplexity prompt behavior.
- [x] Add injection-boundary and compatibility tests.
- [ ] Recover Chrome connection, create a fresh Idea 1.1 project through the real intake flow, inspect generated Direct Competitors, and save screenshot evidence under `ui-evidence/2026-07-11/exa-seven-competitor-candidates/`.
