---
implemented: false
implemented_at:
implementation_summary:
---

# Plan: Ten Scenario Quality Gate

## Goal
Define and run ten realistic, repeatable scenarios that cover Maker Compass's major capabilities, record pass/fail evidence for each outcome, fix root causes for any failure, rerun affected scenarios, then rerun the complete set until all scenarios meet the original quality bar.

## Assumptions
- The existing local environment files contain the credentials and service configuration needed for authenticated verification; secret values will not be printed, committed, or copied into test artifacts.
- Existing tests should be reused where they already verify the capability, with new tests or browser checks added only where the quality gate has a real coverage gap.
- The primary evaluation method will be pass/fail per scenario, with explicit evidence captured as command output summaries, test names, API status checks, screenshots where useful, or review notes.
- Full external AI generation can be expensive and slow, so scenario checks should prefer existing deterministic units, local fixtures, prompt-contract checks, route behavior checks, and mockup fixture generation unless a real external call is necessary to reproduce a failure.
- The current branch has pre-existing uncommitted changes; this plan will not revert or overwrite unrelated work.

## Evaluation Method
Each scenario uses the same method:

1. Run under the local repo conditions from the same branch and environment.
2. Evaluate with a binary `PASS` or `FAIL`.
3. Record evidence: command, focused test names or browser/API observation, and failure text when applicable.
4. If failed, identify the underlying cause, make the smallest targeted fix, rerun the failed scenario, then rerun the complete ten-scenario set.

The original quality bar is: all ten scenarios pass, followed by `npm run lint`, `npm run typecheck`, `npm test`, and the most relevant build or UI verification that is feasible in the local environment.

## Ten Scenarios

1. **Landing, waitlist, and auth handoff**
   - Capability: public landing page, waitlist mode, idea capture, safe auth redirect handoff.
   - Success criteria: waitlist email validation is correct, landing idea handoff preserves safe redirect state, auth modal/page links remain internal, and no raw idea text is leaked into redirect URLs.
   - Candidate evidence: `src/lib/waitlist.test.ts`, `src/lib/landing-intake-handoff.test.ts`, focused route/component checks if needed.

2. **Authentication and protected route boundaries**
   - Capability: session protection, safe redirects, deprecated prompt access policy.
   - Success criteria: unauthenticated protected routes/API calls reject or redirect, safe redirect sanitization blocks external destinations, and `/api/prompt-chat` returns `410 Gone`.
   - Candidate evidence: `src/lib/safe-redirect.test.ts`, `src/lib/workspace-tab-policy.test.ts`, `src/app/api/launch/plan/route.test.ts`, focused route checks.

3. **Idea intake question contract**
   - Capability: AI question normalization, required primary-platform question, answer modes.
   - Success criteria: generated/normalized questions always include exactly one required supported `primary-platform` single-select question; invalid text-only or stale question shapes fail deterministically.
   - Candidate evidence: `src/lib/intake-required-questions.test.ts`, `src/lib/intake-question-generation.test.ts`, `src/lib/intake-summary.test.ts`.

4. **Project creation allowance and intake persistence**
   - Capability: project allowance, paid/free entitlement behavior, structured intake summary.
   - Success criteria: free and paid allowance windows behave as documented, project creation inputs validate required platform answers, and intake summaries remain readable and structured.
   - Candidate evidence: `src/lib/project-allowance.test.ts`, intake summary tests, focused route/helper tests if gaps are found.

5. **Generate All / onboarding queue orchestration**
   - Capability: durable generation queues, dependency ordering, status display, missing-only generation.
   - Success criteria: queue building strips client authority fields, dependencies are ordered correctly, existing active documents are skipped without charge, stale generating items recover, and display states match queue/document state.
   - Candidate evidence: `src/lib/generate-all-helpers.test.ts`, `src/lib/generation-queue-service.test.ts`, `src/lib/onboarding-generation.test.ts`, `src/lib/document-generation-display-status.test.ts`, `src/lib/active-document-policy.test.ts`.

6. **Market Research v2 generation and rendering contract**
   - Capability: competitive-analysis prompt, parser, founder-friendly section layout, legacy fallback.
   - Success criteria: prompts use the v2 contract, parser recognizes required sections and competitor fields, renderer displays v2 blocks, and malformed/legacy content falls back safely.
   - Candidate evidence: `src/lib/competitive-analysis-prompt.test.ts`, `src/lib/competitive-analysis-v2.test.ts`, `src/components/analysis/competitive-analysis-document.test.tsx`.

7. **Product Plan and First Version Plan contracts/rendering**
   - Capability: PRD and MVP prompt builders, parsers, document block renderers.
   - Success criteria: shared production/default prompt request shapes stay aligned, parsers accept current and legacy formats, and renderers preserve expected personas, user stories, requirements, phases, validation, and guardrail sections.
   - Candidate evidence: `src/lib/product-plan-prompt-request.test.ts`, `src/lib/first-version-plan-prompt-request.test.ts`, `src/lib/prd-document.test.ts`, `src/lib/mvp-plan-document.test.ts`, `src/components/analysis/planning-document-blocks.test.tsx`.

8. **Design mockup planning, fixture generation, and rendering**
   - Capability: hidden design-plan validation, OpenRouter image prompt construction, fixture/no-credit mockups, authenticated image rendering.
   - Success criteria: design plans normalize to exactly three options with two platform-specific screens each, generated prompts preserve storyboard constraints, fixture mockups produce renderer-compatible metadata, and renderer displays all options without relying on external image credits.
   - Candidate evidence: `src/lib/mockup-design-plan.test.ts`, `src/lib/openrouter-image-mockup-pipeline.test.ts`, `src/lib/mockup-format-contract.test.ts`, `src/components/ui/mockup-renderer.test.tsx`, `src/components/ui/mockup-generation-loader.test.tsx`.

9. **Workspace, Prompt Lab, export, and app-generation boundaries**
   - Capability: workspace anchors, scroll sync, lazy document loading, local-dev Prompt Lab defaults, PDF/app-generation/deployment API guardrails.
   - Success criteria: section IDs and nav policies remain consistent, deprecated Prompt tab is unreachable, Prompt Lab defaults stay aligned with production builders, clipboard/export helpers handle browser limitations, and expensive endpoints reject unauthorized requests.
   - Candidate evidence: `src/lib/document-sections.test.ts`, `src/lib/workspace-scroll-sync.test.ts`, `src/lib/workspace-tab-policy.test.ts`, `src/lib/clipboard.test.ts`, `src/lib/prompt-lab.test.ts`, `src/lib/prompt-lab-default-state.test.ts`, focused API checks as needed.

10. **Billing, subscriptions, credits, and secure operations**
    - Capability: Stripe subscription sync, token economics, credit/refund assumptions, security-sensitive route behavior.
    - Success criteria: Stripe webhook mapping and entitlement updates are deterministic, credit/token economics stay within expected limits, service-role-only operations are not exposed to clients, and no test/log output reveals secrets.
    - Candidate evidence: `src/lib/stripe-subscription-sync.test.ts`, `src/lib/token-economics.test.ts`, security review notes, focused route checks.

## Recommended First Step
Run the existing focused tests that correspond to the ten scenarios and record the first evidence table. If failures appear, classify whether each is a scenario failure, an outdated test expectation, or an environment issue before editing code.

## Plan
1. Map existing tests to the ten scenarios and identify any missing executable checks.
2. Run focused scenario test groups under one repeatable command strategy.
3. Record results in a review/evidence markdown file.
4. Fix root causes for any failed scenario with minimal, scoped edits.
5. Rerun affected scenarios after each fix.
6. Rerun the complete ten-scenario set and standard repo gates.
7. Perform fresh-eyes, code review, and security review; document findings and remediations.
8. Update this plan metadata when all ten scenarios pass.

## Milestones
- **Scenario Matrix Locked**: The ten scenarios and success criteria above remain unchanged during the run.
- **Initial Evidence Captured**: Every scenario has a first pass/fail result and evidence.
- **Failures Remediated**: Each failing scenario has a root cause and fix.
- **Full Rerun Green**: All ten scenarios pass in a complete rerun.
- **Review Complete**: Fresh-eyes, code review, security review, and remediation notes are documented.

## Validation
- Focused scenario tests or browser/API checks for each scenario.
- Full `npm test`.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build` if feasible after local fixes.
- Codex in-app browser verification for any user-facing UI change that is made during remediation.

## Risks And Mitigations
- **Live external AI/API calls may be slow or costly**: Prefer deterministic prompt, parser, fixture, and route checks; call live endpoints only when required to validate the real behavior.
- **Existing dirty worktree may contain unrelated changes**: Inspect diffs before editing touched files and avoid reverting unrelated work.
- **Authentication tests may need real local credentials**: Use `.env`/`.env.local`/`.env.e2e.local` through normal environment loading without printing values.
- **Browser verification may require a running dev server**: Start `npm run dev` only when UI verification is needed, then provide the local URL.

## Rollback Or Recovery
- New test or documentation files can be removed if they prove unnecessary, but only after confirming with the user if deletion is required.
- Code fixes should be narrow and reversible through normal git diff review.
- If a failure is caused by unavailable local services rather than product behavior, record it as an environment blocker and provide the exact missing dependency without lowering the success criteria.

## Open Decisions
- Whether to include a real browser login path in the first full run or reserve browser verification for failures/UI remediations.
  - Recommendation A: Run browser login and at least one authenticated workspace check before the first full rerun.
  - Trade-off: Better user-journey evidence, but slower and more dependent on local Supabase/test-account state.
  - Recommendation B: Use deterministic tests first, then browser-check only any UI paths touched by fixes.
  - Trade-off: Faster and less brittle, but weaker coverage of real authenticated flows.
- Whether `npm run build` should be mandatory for the final gate if external services or local build constraints block it.
  - Recommendation A: Treat `npm run build` as mandatory unless it fails from a documented environment dependency.
  - Trade-off: Higher release confidence, but may expose slow or unrelated build issues.
  - Recommendation B: Stop at lint, typecheck, full tests, and focused browser/API checks.
  - Trade-off: Faster turnaround, but less confidence in Next.js production compatibility.
- Whether to create a dedicated scenario runner script or keep the gate as mapped npm test groups plus documented evidence.
  - Recommendation A: Keep the first pass as mapped npm test groups and evidence notes.
  - Trade-off: Minimal new code and lower risk, but the gate is less automated.
  - Recommendation B: Add a dedicated scenario runner/report script.
  - Trade-off: More repeatable long-term, but adds maintenance surface during an already broad verification task.

## Critique

### Software Architect
- The ten scenarios cover user journeys and internal contracts, but several capabilities are currently verified through unit-level contracts rather than true end-to-end flows. That is pragmatic for cost and determinism, but any future release gate should add a small browser suite for auth, project creation, workspace loading, and mockup fixture rendering.

### Product Manager
- The scenario list follows the actual customer journey from landing through planning artifacts, mockups, billing, and workspace use. The main product risk is that deterministic tests may pass while the live AI workflow still produces poor content, so evidence should call out where live generation was intentionally avoided.

### Customer Or End User
- A customer cares that the app accepts an idea, creates a project, generates usable documents, displays them clearly, and does not lose progress. The plan covers those outcomes, but browser-level verification should be added for any remediated UI issue.

### Engineering Implementer
- The existing test files are broad enough to start quickly. The implementation risk is spending time building a large new harness instead of first using the tests already present. Add only the missing checks that directly close scenario gaps.

### Risk, Security, Or Operations
- This task touches auth, billing, external AI, and private credentials. The safest execution path is to avoid logging environment values, prefer mocked or fixture-backed tests, and explicitly review authorization and secret-handling implications for every fix.
