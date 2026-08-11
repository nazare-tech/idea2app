# Reviews

Cross-commit sweep reports and standalone review reports live here. Per-task review artifacts stay in `docs/plans/<slug>-review.md`.

## Sweep marker

`docs/reviews/.last-sweep-commit` holds one commit SHA: the point the last thermonuclear sweep covered. Seed it once, after the first real commit:

```bash
git rev-parse HEAD > docs/reviews/.last-sweep-commit
```

`node scripts/sweep-check.mjs` counts net added lines of code since that SHA (deletions offset additions, docs and lockfiles excluded, see `scripts/code-path-classification.mjs`). At net +1000 the sweep is due: the post-commit hook prints a notice and the `commit-sweep` skill runs in the active agent, writes `docs/reviews/commit-sweep-<YYYY-MM-DD>.md`, and advances the marker.

Without the marker file, sweep tracking is simply off; commits still work and `sweep-check.mjs` says so.

## Sweep reports

Name reports `commit-sweep-<YYYY-MM-DD>.md`, give them the 7-line greppable header (`docs/operating-system/doc-conventions.md`), and include the range, line stats, themed findings with severity and `file:line`, verification run, and a triage table (fixed / issue filed / rejected with reason). A sweep that finds nothing still produces a short report: silence is not evidence of a sweep.
