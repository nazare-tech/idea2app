# Review: Reusable Project Starter Kit

## Scope

- New self-contained `project-starter-kit/` with canonical agent rules, Claude adapter, project-context template, plans/reviews/history, research/meeting privacy protocol, optional analytics and React/Next.js overlays, and two compact skills.
- Generalized recommendation lessons from Maker Compass plans without copying product architecture or machine-specific browser instructions.
- Documentation-only change; no application code, data, dependencies, runtime, or UI changed.

## Verification

- File inventory — 18 starter-kit files present.
- Internal backticked-path check — `reference_check=0`; every non-placeholder kit reference exists.
- Placeholder check — 61 visible `{{PLACEHOLDER}}` tokens in `PROJECT_CONTEXT.md`; zero raw angle-bracket placeholders across kit Markdown.
- Product/machine leakage scan — zero matches for named projects/tickets, browser profile, provider names, local route, or test credential variable names outside the deliberate README exclusion wording.
- Secret-pattern scan — zero credible API key, JWT, private-key, or assigned-password matches.
- `git diff --check -- project-starter-kit docs/plans/reusable-project-starter-kit-plan.md` — passed.
- No UI evidence: no user interface or runtime behavior changed.

## Fresh-Eyes Self Review

### Pass 1

- Re-read all 18 kit files.
- Found README onboarding omitted `.gitignore.template` merge instructions and described placeholders ambiguously. Fixed both.
- Found the holistic skill used an ambiguous recommendation-rules path. Made it repository-relative.
- Added an optional privacy-conscious product analytics contract after confirming this learning was reusable but not universal.

### Pass 2

- Independent reviewer found 0 critical, 5 medium, and 3 low portability/documentation findings.
- Fixed all: bounded subagent delegation, scoped-edit versus destructive replacement wording, conditional analytics reference, Markdown-safe placeholders, runtime-specific skill discovery guidance, optional task tracker semantics, temporary transcript-ingestion nuance, and plan compatibility acceptance criteria.
- Reran reference, leakage, secret, placeholder, and whitespace checks after remediation.

## Code Review Findings

- No application-code findings; no code changed.
- Documentation contradictions found during review were remediated.

## Architecture Improvement Review

- Canonical `AGENTS.md` source landed; `CLAUDE.md` is a thin adapter, preventing duplicated-rule drift.
- Framework-neutral context and workflow landed; React/Next.js and analytics guidance are optional overlays.
- Reusable plan/review/backend-history/privacy templates landed.
- Runtime-neutral core landed. Skill discovery differences are documented, and the full workflow remains usable without skills.
- Automated upstream synchronization remains deferred until another real consumer demonstrates maintenance demand.
- Copying every existing skill remains rejected: many are large, third-party, domain-specific, or runtime-dependent.
- No new brittle runtime contract, non-idempotent path, authorization gap, or recovery blind spot exists because the change is static documentation.

## Security Review Findings

- No credentials or credential-shaped values included.
- Starter rules require server-derived ownership, cross-account denial checks, bounded external/AI handling, secret-manager use, and approval for destructive/auth-weakening actions.
- Transcript protocol permits only explicitly approved temporary ingestion and prohibits durable/raw redistribution.
- `.gitignore.template` excludes local secrets and private transcript storage while preserving `.env.example`.
- No security remediation remains.

## Remediation Checklist

- [x] Clarify safe scoped edits versus destructive whole-file replacement.
- [x] Make subagent delegation useful and bounded, not availability-driven.
- [x] Replace raw HTML-like placeholders with visible `{{PLACEHOLDER}}` tokens.
- [x] Document skill-runtime discovery differences.
- [x] Qualify analytics and task-tracker rules as optional/configured.
- [x] Clarify temporary transcript ingestion and retention.
- [x] Rerun final checks.

## Remaining Risks

- Starter is a curated snapshot, not automatically synchronized with future learnings. README documents manual maintenance.
- Non-Codex runtimes may require skill installation in a different location; canonical `AGENTS.md` remains the fallback.
