# Review: Portable Project Rules And Metrics Handoff

## Scope

- Generated `project-context.md` assembly and prompt-file usage guidance.
- First Version Plan tool/stack, analytics, TDD, and ownership instructions.
- Product Plan Success Metrics propagation into the derived rules file.
- Lovable/v0 browser-builder compatibility and conditional Cloudflare/D1 behavior.
- Tests, source-of-truth documentation, and real UI evidence from a fresh Idea 1.1 project.

## Verification

- Task-focused prompt/render tests — 19 passed, 0 failed after final remediation.
- `npm test` passed earlier in the task with 531 passed and 0 failed. A final run after concurrent unrelated untracked Stripe analytics files appeared reported 536 passed and 1 failed: `src/lib/stripe/checkout-analytics.test.ts` expects absent optional attribution keys, while `src/lib/stripe/checkout-analytics.ts` returns those keys with `undefined`. An isolated rerun reproduces that unrelated failure (2 passed, 1 failed); this task does not edit either untracked Stripe file.
- `npm run typecheck` — passed.
- Scoped ESLint for all changed TypeScript/TSX files — passed.
- `git diff --check` for task files — passed.
- Real `/projects/new` Idea 1.1 flow using configured OpenRouter generation — created `Signal To Roadmap` (`291f20f5-ef38-460a-b04f-568d6f4b47dd`).
- Chrome Profile `Plasma`, route `http://localhost:3000/projects/291f20f5-ef38-460a-b04f-568d6f4b47dd-signal-to-roadmap#ai-prompts`, viewport 1144 × 933, state: Product Plan and First Version Plan complete; `project-context.md` preview open while Design Mockups continued independently.
- Rendered preview checks passed for project-specific metrics, activation, business conversion, performance, existing-database storage, no D1/Neon contradiction, red-green-refactor, ownership/cross-account denial, security review, rollback/recovery, and browser-builder project-instructions fallback.

## UI Evidence

- `ui-evidence/2026-07-10/portable-project-rules/project-context-preview-top-1144x933.png` — portable introduction plus project context and Build Approach.
- `ui-evidence/2026-07-10/portable-project-rules/project-context-metrics-rules-1144x933.png` — generated user, business, and technical/performance metrics.
- `ui-evidence/2026-07-10/portable-project-rules/project-context-working-rules-1144x933.png` — planning, TDD, acceptance-check fallback, ownership, destructive-change guardrails, real-flow verification, review/security, documentation, and completion reporting.

## Fresh-Eyes Self Review

### Pass 1

- Reviewed the generated file content, assembler boundaries, prompt alignment, tests, and visible usage guide.
- Found missing medium/large-change critique and destructive/paid-service stop conditions; added both with a red-green test.
- Found duplicated instrumentation-rule branches; consolidated them into one shared builder and reran focused tests/lint.

### Pass 2

- Re-read the changed prompt and generated output from a portability and trust-boundary perspective, supplemented by an independent subagent review and the fresh Chrome project.
- Found the pre-existing universal Cloudflare/D1 default could conflict with Lovable/v0. Remediated by choosing tool and stack as one decision: Lovable Cloud/Supabase for Lovable, supported Supabase/Neon/Upstash paths for v0, and conditional Cloudflare defaults for compatible repo-aware paths. Verified against [Lovable Cloud documentation](https://docs.lovable.dev/integrations/cloud), [Lovable FAQ](https://docs.lovable.dev/introduction/faq), and [v0 full-stack documentation](https://v0.dev/docs/full-stack-apps).
- Found D1's no-RLS guidance did not explicitly reject client-supplied ownership authority. Added verified-server-session identity derivation, per-read/write ownership filtering, and cross-tenant/cross-account denial tests to both prompt and generated rules.
- The live project exposed a second storage-selection bug: deployment used Cloudflare while the database was Neon. Replaced broad Cloudflare detection with Database-row D1 detection and added a mixed Cloudflare + Neon regression test.
- The final independent re-review found two generic tactical examples still named D1 outside the conditional database guidance. Replaced them with the selected platform's database tool and updated source documentation to say D1 only when the Build Approach Database row selects D1.

## Code Review Findings

- **P1 — Forced Cloudflare/D1 with Lovable/v0:** fixed. Tool and stack are now selected together, with browser-builder-native paths and explicit handoff requirements for non-native infrastructure.
- **P1 — Client-controlled ownership / IDOR risk:** fixed. Ownership authority must come from the verified server session and cross-account denial is required.
- **P1 — Cloudflare deployment incorrectly implied D1 analytics:** fixed. D1 is selected only when the Build Approach Database row chooses D1; Neon/Supabase remain the analytics store when selected.
- **P2 — Duplicate instrumentation branches:** fixed through a shared section builder.
- **P2 — Legacy/missing metrics coverage:** fixed. The rules file emits a four-category suggested starting set when Product Plan Success Metrics are missing.
- **P2 — Unconditional D1 tactical examples:** fixed. Generic operating/tactical guidance now refers to the selected application's database tool; D1 remains limited to an explicitly selected D1 database path.
- No remaining high- or medium-priority findings in the task scope.

## Architecture Improvement Review

- Prompt/parser/render contract tests landed and cover metrics propagation, portable TDD/review rules, browser-builder fallback, D1 and non-D1 storage, and mixed deployment/database stacks.
- Project-specific metrics propagation landed without changing saved document schemas or AI Prompts readiness.
- Database-relative analytics guidance landed; it uses the selected application database and defers a separate analytics vendor.
- Tool/stack compatibility and server-derived ownership invariants landed after review.
- A dedicated template module remains deferred: the assembler is still used in one boundary and is covered directly; extracting another file now would add movement without reuse.
- No new non-idempotent writes, authorization gaps, recovery blind spots, or prompt/parser/render drift found after remediation.

## Security Review Findings

- **Analytics privacy:** events prohibit secrets, credentials, raw prompts, generated content, and sensitive personal data; fixed and tested.
- **Authorization boundary:** verified server identity owns user/org scope; client identifiers are not authority; fixed and tested.
- **D1 isolation:** every read/write must filter by session-derived ownership and include cross-tenant denial tests; fixed and tested.
- **Secret handling:** sensitive API calls remain server-side and secrets remain in environment/platform secret storage; present.
- **Destructive/paid actions:** generated rules require explicit approval before destructive data changes, auth weakening, secret exposure, irreversible production changes, or unapproved paid services; present.

## Remediation Checklist

- [x] Make Cloudflare/D1 conditional on the selected build path.
- [x] Add Lovable and v0 native stack paths.
- [x] Add verified-session ownership and cross-tenant denial requirements.
- [x] Keep analytics in Neon/Supabase when that is the selected database.
- [x] Remove unconditional D1 examples outside the selected-database path.
- [x] Add missing-metrics compatibility coverage.
- [x] Remove duplicated instrumentation-rule branches.
- [x] Run focused tests, typecheck, lint, diff check, fresh real-UI verification, and audit the unrelated concurrent full-suite failure.
