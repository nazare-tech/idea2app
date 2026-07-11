---
implemented: true
implemented_at: 2026-07-11T02:29:34Z
implementation_summary: Generated project context now carries portable holistic delivery rules, project-specific metrics, database-relative instrumentation, tool-compatible stacks, and verified ownership safeguards across repo agents and browser builders.
---

# Plan: Portable Project Rules And Metrics Handoff

## Goal

Strengthen every generated `project-context.md` handoff so it can serve as `AGENTS.md`, `CLAUDE.md`, or pasted project instructions in browser-based builders such as Lovable and v0. The file should carry project-specific success metrics plus portable rules for test-driven delivery, product instrumentation, scoped planning, verification, review, security, recovery, and documentation without depending on Codex skills or terminal-only features.

## Assumptions

- `project-context.md` remains the single generated context-and-rules artifact; users rename or paste it according to their build tool.
- Product Plan Success Metrics are the project-specific source for what to measure.
- The recommended application database is the initial metrics store for a small product. Use D1 only when the Build Approach Database row selects D1; a Cloudflare deployment can instead retain Neon, Supabase, or another selected database. Lovable and v0 use their supported native database paths. An external analytics platform is deferred until scale or analysis needs justify it.
- The existing dirty worktree contains user-owned and parallel work. Changes will remain narrow and preserve surrounding edits.
- This changes a user-visible generated artifact, so focused tests and real UI verification are required.

## Clarifying Questions

1. Should the holistic workflow be shipped as a separate skill or embedded in the generated rules?
   - Recommendation A: Embed its portable behaviors in `project-context.md`.
   - Trade-off: Works across tools and stays visible, but cannot rely on Codex-specific automation.
   - Recommendation B: Generate a separate platform-specific skill.
   - Trade-off: More automation in supported tools, but it fails the Lovable/v0 portability requirement and creates duplicate guidance.
   - Selected: Recommendation A, explicitly directed by the user.

2. How should product metrics be represented?
   - Recommendation A: Include the project-specific Success Metrics section and add durable instrumentation rules covering product, business, reliability, and performance events.
   - Trade-off: More useful and testable than generic analytics advice, with a modest increase in file length.
   - Recommendation B: Add only a generic reminder to consider analytics later.
   - Trade-off: Shorter, but too easy for builders to defer until the product can no longer answer baseline questions.
   - Selected: Recommendation A.

3. Where should a small product store product events?
   - Recommendation A: Use an append-only table in the already-recommended application database, with controlled event names/properties and no sensitive payloads.
   - Trade-off: Low cost and operational simplicity; advanced funnel tooling may require SQL or a later analytics integration.
   - Recommendation B: Add a dedicated analytics vendor from day one.
   - Trade-off: Faster dashboards, but additional cost, privacy surface, vendor setup, and source-of-truth complexity.
   - Selected: Recommendation A, matching the user's Cloudflare/D1 example.

4. How should the rules work in tools without a terminal or automatic repo-instruction discovery?
   - Recommendation A: Express requirements as behaviors and explicitly tell users to paste the file into project instructions/knowledge when auto-discovery is unavailable.
   - Trade-off: Portable across coding agents and browser builders, although execution quality still depends on the selected tool.
   - Recommendation B: Use exact shell commands, skill names, and subagent workflows.
   - Trade-off: Stronger automation in one environment but brittle elsewhere.
   - Selected: Recommendation A.

5. Should Cloudflare/D1 remain mandatory when the recommended build tool is Lovable or v0?
   - Recommendation A: Choose the build tool and stack as one compatible decision: D1 only for a Cloudflare+D1 database path, the explicitly selected external database for mixed Cloudflare deployments, Lovable Cloud/Supabase for Lovable, and a supported Supabase/Neon/Upstash integration for v0.
   - Trade-off: Produces a buildable handoff across tools, but the prompt must maintain a small compatibility matrix as platforms evolve.
   - Recommendation B: Apply Cloudflare/D1 to every web product regardless of tool.
   - Trade-off: One uniform infrastructure default, but browser builders may be unable to configure or verify it in their native workflow.
   - Selected: Recommendation A after architecture review; it best matches the user's conditional “if recommending Cloudflare” requirement and cross-platform goal.

## Recommended First Step

Add a focused failing contract test for the generated `project-context.md`: project-specific metrics, red-green-refactor guidance, instrumentation/storage/privacy rules, planning/review/security/recovery behaviors, and browser-builder fallback instructions must all be present.

## Architecture Improvement Opportunities

- **Prompt/parser/render contract test — selected.** Benefit: prevents future UI or generation work from silently dropping the portable rules. Trade-off: wording changes require deliberate test updates. Likely boundary: `src/components/analysis/first-version-plan-blocks.test.tsx`.
- **Project-specific metrics propagation — selected.** Benefit: the rules file carries the actual Product Plan metrics instead of generic placeholders. Trade-off: `buildProjectContextFile` must accept both PRD and MVP sections. Likely boundary: `src/components/analysis/ai-prompt-files.tsx`.
- **Database-relative analytics guidance — selected.** Benefit: works with D1, Supabase, or another recommended stack without hardcoding a second system. Trade-off: advanced analytics remain a later decision. Likely boundary: generated Working Rules content and MVP prompt defaults.
- **Platform-neutral execution contract — selected.** Benefit: Codex, Claude Code, Cursor, Lovable, v0, Bolt, and Replit can all follow the same outcomes. Trade-off: rules cannot assume subagents, shell access, branches, or local skills. Likely boundary: generated file intro and working rules.
- **Tool/stack compatibility matrix — selected.** Benefit: avoids recommending browser builders with infrastructure they cannot natively configure or verify. Trade-off: official platform paths must be kept current. Likely boundary: `src/lib/prompts/mvp-plan.ts` and its contract tests.
- **Server-derived ownership invariant — selected.** Benefit: prevents client-supplied user/org identifiers from becoming authorization authority, especially because D1 lacks RLS. Trade-off: every read/write needs explicit ownership filtering and cross-tenant tests. Likely boundaries: generated working rules and Cloudflare prompt defaults.
- **Dedicated template module for generated rules — deferred.** Benefit: could isolate a growing template from the React component. Trade-off: unnecessary file movement for one assembler that remains small and already has focused tests; revisit if more generated file types reuse the same rules.
- **Third-party analytics or warehouse integration — rejected as over-engineering.** The current goal is durable instrumentation from day one, not a new analytics operations stack.

## Implementation Phases

1. **Red contract**
   - Add a focused test fixture with Product Plan Success Metrics and a First Version Plan.
   - Assert the generated project context contains the project metrics and portable delivery/instrumentation rules.
   - Run the focused test and confirm it fails for the missing behavior.
2. **Portable rules implementation**
   - Thread PRD sections into the project-context assembler.
   - Add concise sections for product metrics/instrumentation and holistic delivery rules.
   - Update the usage guide for browser builders that require pasted project instructions.
   - Keep the output stack-relative and avoid platform-specific commands.
3. **Prompt alignment and documentation**
   - Make the MVP generation prompt recommend the existing app database for lightweight analytics, naming D1 for the Cloudflare default.
   - Coordinate the recommended build tool with a stack it supports natively; keep Cloudflare as a conditional repo-aware path rather than a universal mandate.
   - Require verified-session ownership derivation and cross-tenant denial tests at authenticated data boundaries.
   - Update `PROJECT_CONTEXT.md` with the new generated-file contract.
4. **Verification and review**
   - Run focused tests, typecheck, and lint for changed files.
   - Verify the visible file preview through the real local UI and save screenshot evidence.
   - Perform two fresh-eyes passes, code review, architecture review, and security/privacy review; remediate findings.

## Milestones

- **Contract captured:** A failing test describes the portable rules and metrics output.
- **Generated handoff complete:** Every current-format project can produce the strengthened file.
- **Cross-tool guidance complete:** Both repository-aware agents and browser builders receive usable setup instructions.
- **Verified:** Tests and real UI evidence confirm the file content is present and readable.

## Test Strategy

- Focused unit/render test for `buildAiPromptFiles` and the AI Prompt document blocks.
- Assertions for Product Plan metric propagation and all non-negotiable rule categories.
- TypeScript typecheck and scoped lint.
- Real Chrome verification of the AI Prompts project-context preview, recording route, viewport, state, and screenshot path.

## Rollback Or Recovery

- Revert the added project-context sections and usage-guide sentence; no database migration or saved project data is changed.
- Existing generated Product Plan and First Version Plan rows remain compatible because the file is assembled at read time.

## Open Decisions

- None. The workspace policy selects Recommendation A and the user explicitly asked for a portable embedded rules approach.

## Critique

### Software Architect

- The strongest boundary is the derived handoff assembler because it improves existing and future projects without altering stored document schemas. Keep platform-specific capabilities out of the contract.

### Product Manager

- “Add analytics” is not actionable by itself. The artifact needs both specific success measures and a minimal event discipline that supports decisions without burdening an early-stage founder.

### Customer Or End User

- Nontechnical users should not need to know whether their tool recognizes `AGENTS.md`. The usage guide must explain the paste-into-project-instructions fallback in ordinary language.

### Engineering Implementer

- The rules should be strict enough to change implementation behavior but short enough that browser builders retain and follow them. Avoid copying the holistic skill verbatim.

### Risk, Security, Or Operations

- Analytics guidance must prohibit secrets, content, credentials, and unnecessary personal data. Product events are evidence, not business authority, and should not introduce an external vendor by default.

## Implementation Outcome

- Implemented the project-specific metrics handoff, portable holistic working rules, red-green-refactor/acceptance-check fallback, real-flow verification, review/security/recovery safeguards, and browser-builder setup guidance.
- Coordinated tool and stack recommendations so Lovable and v0 use supported native data paths while D1 remains available only when the Build Approach Database row selects D1.
- Added verified-session ownership rules and conditional database-relative analytics storage, including the mixed Cloudflare deployment + Neon database case found during live QA.
- Verification and remediation details: `docs/plans/portable-project-rules-review.md`.
- Fresh UI evidence: `ui-evidence/2026-07-10/portable-project-rules/` at 1144 × 933 on the fresh `Signal To Roadmap` Idea 1.1 project.
