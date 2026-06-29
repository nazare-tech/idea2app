# Review: Real UI Verification Evidence

## Scope
- Updated `AGENTS.md` with repo-local rules for real UI verification, no shortcut route/provider/fixture bypasses, and screenshot/video evidence.
- Updated `.codex/AGENTS.md` with the same verification standard in concise task-management form.
- Updated the global holistic implementation skill outside the repo so user-facing changes require real UI verification evidence.

## Verification
- `git diff --check -- AGENTS.md .codex/AGENTS.md docs/plans/real-ui-verification-evidence-plan.md docs/plans/real-ui-verification-evidence-review.md`
- Searched repo and global skill instructions for the new real UI, no-shortcut, screenshot, and video evidence wording.
- No UI screenshot/video was produced for this task because it changed workflow markdown only and no application UI behavior.

## Code Review Findings
- No application code was changed.
- The new rule explicitly allows reporting blockers when real dependencies are unavailable, unsafe, credential-gated, or unexpectedly costly.

## Security Review Findings
- No secrets or credential values were added.
- The instruction keeps the existing rule to never print or commit e2e credential values.
- Screenshots/videos must avoid exposing secrets or private data.

## Remediation Checklist
- [x] Add repo-local real UI evidence rule.
- [x] Add concise Codex local verification rule.
- [x] Add plan artifact.
- [x] Update global holistic skill.
- [x] Run markdown/diff validation.
