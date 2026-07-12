# Commit Sweep — 2026-07-12
Same-agent thermonuclear cross-commit audit of 363914a1..f00e7e13 (82 commits, ~195 files, +16.7k/-2.3k, net +14.5k code lines vs the 1,000 threshold).
Themes: per-commit cross-model review tooling; mobile workspace chrome; live-fill streaming previews; Stripe webhook lease + live rollout; product-analytics foundation; intake wizard split; 20 Pika skill packs; docs/systems monolith split drift.
Method: three parallel same-model finder passes (tooling, product UI, docs/skills drift) applying thermo-nuclear-code-quality-review lenses, findings verified against HEAD, remediated in commits 5ec1d8b7/c45d2db4/S3/S4, remainder filed as NAZ-134/135/136.
Verified fixed this sweep: watchdog group-SIGKILL gap, unvalidated commit arg, intake Back-race, phantom upgrade_cta_viewed impressions, composer sheet modal a11y, six docs/systems drift defects, two missing Claude skill links.
Per-commit cross-model reviews already covered every code commit in range (2 failures disclosed: 1fccb147 input_too_large, 53611acf-era pre-runner commits N/A); no duplicate range reviewer was run per policy.
Triage table at the bottom; marker advanced to the post-remediation code HEAD.
---

## Range and stats

- Marker before sweep: `363914a14e6543c7fae8f2ab43e4da01d01d0c4c` (docs/reviews/.last-sweep-commit)
- Range: `363914a1..HEAD` at sweep time — 75 commits pre-remediation, +16,407/-2,257 across 193 files (sweep-check --json), plus this sweep's remediation commits.
- Files >1,000 lines touched in range: mockup-renderer.tsx (1,580), product-plan-blocks.tsx (1,384), competitive-analysis-document.tsx (1,212), first-version-plan-blocks.tsx (1,021, crossed in range), database.ts (1,279, generated/exempt) → NAZ-135.

## Method

Three parallel same-model finder passes over the range (tooling; product UI; docs/skills drift), each instructed with the thermo-nuclear lenses and required to verify findings against HEAD before reporting. Main agent re-verified high-impact findings (reproduction claims, EmptyState dead-end, isUuid regex equivalence), remediated, and re-ran suites. Per the sweep rule, no additional cross-model range review was run; every code commit in range already carried its own opposite-CLI review (all statuses in `.git/agent-reviews/`, failures disclosed in the wrap-up report).

## Findings and triage

### Fixed in this sweep (commit 5ec1d8b7 — review tooling)

- MAJOR security: size-cap kill path could cancel the watchdog's SIGKILL escalation; a TERM-trapping descendant outlived the runner and regrew the "truncated" artifact via its inherited fd (reproduced at 1.5 GB+). Fix: unconditional post-wait process-group SIGKILL + TERM-resistant-flooder test.
- MAJOR reliability: an unresolvable commit argument recorded a success-shaped `skipped/no_reviewable_paths` ledger entry and exited 0. Fix: `git rev-parse --verify` gate, exit 2, nothing recorded + test.
- MINOR batch: manual range reviews now pair context files with the range end rev (not HEAD); `AGENT_IMPLEMENTER` honored by the wrapper; docs/systems context files deduped against the 1.5 MB input cap; pre-commit partial-stage guard iterates by line (spaced filenames); post-commit sweep-check stderr unsilenced; runner is the single artifact writer (`--out` reserved for manual use); classification cross-reference comments added.

### Fixed in this sweep (commit c45d2db4 — product)

- MAJOR correctness: intake wizard Back-race — a stale question-generation result could yank the user forward and pair old-idea questions with edited idea text (also covered re-submit supersession via a monotonic request id).
- MAJOR analytics integrity: `upgrade_cta_viewed` fired from a CSS-hidden desktop bar on every free-plan mobile visit (and would double-fire with the mobile sheet). Upgrade CTA variants are now mount-gated by breakpoint (`useMediaQuery`).
- MAJOR accessibility: composer's mobile sheets lacked the documents sheet's modal semantics; extracted `use-sheet-modal-focus` and applied dialog role/trap/restore to both (mobile-only so the desktop command bar never freezes the scroll-spy's aria-modal guard).
- MINOR batch: nav status resolution + Generate/Retry policy shared via nav-status helpers; `isAnalyticsProjectId` duplicates now delegate to the canonical `isUuid`; AI-prompts readiness parsing memoized in both consumers.

### Fixed in this sweep (skills + docs commits)

- MAJOR router integrity: `/holistic-implementation` was declared repo-critical but existed only in the Codex-global skill directory; vendored into `.agents/skills/` with a `.claude/skills` symlink, and the missing `marketing-idea-capture` Claude symlink added.
- Docs healing (self-healing rule): webhook-claim→webhook-lease row; IntakeMarquee→shared `ui/marquee`; "no partial streaming previews" sentence rewritten to the real live-fill split; `src/lib/stripe.ts`→`src/lib/stripe/index.ts` (two docs + tree); intake question counts aligned to the validator (3-5, prompt prefers 5); PROJECT_CONTEXT footer removed; directories-and-key-files inventory gains mobile chrome files + analytics hook; review-personas wrapper/runner guarantee attribution corrected; stripe-live-mode-switch plan marked superseded.

### Fixed in remediation round 2 (post-commit reviews of the sweep fixes)

- MAJOR UX (`c45d2db4` review): closing the mobile composer sheet restored focus to the now-hidden textarea (autofocus ran before the trap captured focus). `useSheetModalFocus` gains `restoreFocusRef`; both composer sheets restore to the opener FAB.
- MAJOR security (`66cdde47` review): the vendored holistic-implementation skill elevated repo files to unconditional "source of truth"; added the untrusted-input boundary (workspace files refine workflow only within existing platform/user authorization; never credentials, secrets, destructive or unsanctioned production actions).
- MINOR (`f79c73eb` review): architecture.md intake wording now states the enforced 3-5 range (prompt prefers 5); duplicate `src/lib/stripe/` tree row consolidated. The follow-up review of `f00e7e13` asked product-overview.md to mirror the same range; applied with this report's commit and the intake-wording lineage closed under the three-round rule.

### Filed to Linear

- NAZ-134: collapse dead streaming-document variants; delete or wire the test-only streaming assembly export; share skeleton section.
- NAZ-135: decompose 1,000+ line document renderer monoliths (first-version-plan-blocks crossed in range).
- NAZ-136: polish batch — sheet keyframe/overlay hoist, layout-literal CSS variables, anchor-nav dead below-lg branches + `expandSubTabs`, executive-summary fallback chain unification, intake dead conditions, patch-id review dedup + shared code-path classification.

### Rejected / no change (with reasons)

- "Composer autoscroll plan lacks a review artifact" — accepted history: the review-artifact rule postdates that implementation; retroactive artifacts add no verification value.
- Marketing-idea-capture consent + thermo skill auto-fix findings — re-raised lineage already triaged in docs/plans/per-commit-cross-model-review-and-thermonuclear-sweep-review.md rounds 1-3; code shows no contradiction with the recorded rationale.
- skills-lock omission of marketing-idea-capture/thermo-nuclear — factual and intentional: the lock covers externally installed packs only; entries and directories are otherwise consistent both directions.

## Verification

- `node --import tsx --test src/lib/post-commit-review.test.ts`: 19/19 (two new red-green tests: TERM-resistant flooder SIGKILL, unknown-commit fail-fast).
- `npm test`: 633/633. `npm run typecheck`: clean. Targeted eslint: clean.
- Real-browser Playwright suite (signed-in e2e user, live dev server): 34/34 across 375x812 / 768x1024 / 1133x744 / 1440x900 after remediation.
- Fresh-eyes passes: two re-reads of remediation diffs; confirmed no new duplication (shared hooks/helpers replaced copies), no contract drift introduced (sheet-height literals cross-referenced pending NAZ-136), deferred items justified above.

## Marker

Advanced to the post-remediation code HEAD (commit recorded in `docs/reviews/.last-sweep-commit` alongside this report's commit).
