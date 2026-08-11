# Review: Portable Marketing Core And Skill Refresh

## Scope

- Refreshed retained upstream skills: Pika `vfx`, `build-a-brand`, `persona-builder`, `content-director`; global Playwright; global Impeccable.
- Retired project `4k-vfx` and global `ci-watcher`, `fix-ci`, `loop-on-ci`, `run-smoke-tests`, `control-ui`.
- Replaced machine-specific marketing capture with repository-local capture.
- Added runtime-neutral brand and marketing structures.
- Upgraded the restored starter kit with plan-stage review, brand/marketing, CI/UI routing, runtime links, licenses, and source metadata.

## Recovery Evidence

- Verified pre-edit starter snapshot: `/Users/Mukul/Documents/Codex Recovery/5_idea2app-skill-refresh-20260729-oDzxrr/project-starter-kit`
- Pre-update Impeccable copy: `/Users/Mukul/Documents/Codex Recovery/5_idea2app-skill-refresh-20260729-oDzxrr/impeccable-before-v4.0.4`
- Retired global skills: `/Users/Mukul/Documents/Codex Recovery/5_idea2app-skill-refresh-20260729-oDzxrr/retired-global-skills`
- No baseline starter file is missing after the upgrade: 40 files before, 63 files after.

## Verification

- Pika update before local overrides matched audited upstream revision `f27b3ba28a7be7c5f3a74d8fdd54b770f5d8157b`.
- Playwright `SKILL.md`: SHA-256 `0ffaabcc8e0990627c4725f18bf1c7955534a796c1c199e872909de2013ce6a8`.
- Impeccable `SKILL.md`: SHA-256 `a1ea82ce80f4db6f53757a84fc37b639fdc2354ca25e54a30ab6d45dcf944628` (v4.0.4).
- Compared the full Impeccable directory with official commit `9a949fb543d44cfb406f61bcab99d95d7f12cf1d`; restored four fallback references omitted by the official updater and confirmed an exact recursive diff. Global lock now records tree `850a11a6cdb2d9adba331d3c02033af6880df640`.
- Parsed official folded YAML frontmatter with PyYAML for updated Pika skills; verified names/descriptions and no literal angle brackets in descriptions.
- Ran `.agents/skills/skill-creator/scripts/quick_validate.py` successfully for locally authored/current CI, UI, marketing, and all non-Pika starter skills.
- Ran `bash -n`/`sh -n` on starter review scripts and hook.
- Parsed `skills-lock.json` and starter `skills-manifest.json`.
- Parsed root `skills-overrides.json`; verified durable upstream/local bundle hashes for `vfx` and `build-a-brand`.
- Resolved every starter `.claude/skills/` link to a real `SKILL.md`.
- Ran starter plan evaluator in `--dry-run` mode; it selected the opposite CLI and produced a bounded plan prompt without spend.
- Ran `git diff --check`.
- Static marketing contract checks passed: designated repository marker, local path, deterministic versioning, verbatim raw idea, no machine-specific vault paths.
- VFX and CI/UI retirement crosswalks passed; details are in `portable-marketing-and-skill-refresh-coverage.md`.
- Verified every retired global source path is absent and every recoverable copy is present.
- Verified Pika/CI/UI license files are present in the starter kit.

## Real-Flow Evidence

- No UI behavior changed, so browser evidence is not applicable.
- No paid 4K render ran because no clip or spend authorization was supplied. The field-by-field instruction contract passed; live provider execution remains explicitly unverified.
- No real pull request or browser session was needed to prove router instruction coverage; external drivers remain separately managed.

## Implementation Incident And Remediation

`npx skills check --project` unexpectedly performed updates instead of a read-only check. It began refreshing unrelated Pika skills. The process was interrupted. Every out-of-scope tracked skill was restored byte-for-byte to its prior Git state, unintended lock hashes were restored from `HEAD`, intended `build-a-brand` and `vfx` overrides were re-applied from the verified starter copy, and the final status/diff contains no tracked out-of-scope Pika skill changes. The command is not used as validation.

## Fresh-Eyes Review

### Starter Kit

- Fixed copy instructions that omitted `.claude/`, `brand/`, `marketing/`, and the manifest.
- Added the blocking plan-evaluation gate to the bundled holistic orchestrator.
- Added a default ignore policy for large generated brand packages.
- Corrected stale opt-in commit-review comments.
- Expanded source paths plus upstream/vendored bundle hashes in `skills-manifest.json`.

### Skills, Retirement, And Portability

- Populated current `brand/brand.md` from the existing Maker Compass message instead of leaving an all-unknown canonical template.
- Normalized `build-a-brand` frontmatter so the repository validator passes, and recorded the override.
- Recorded the starter UI router's deliberate generic paid/production-action policy.
- Added the exact retired-skill recovery directory to the coverage artifact.
- Restored official `content-director` bytes after validator-specific experimentation.
- Repaired Impeccable's omitted fallback files and stale global provenance lock.
- Added root override metadata so future upstream refreshes preserve local VFX and brand-output behavior.

## Architecture Improvement Review

- Progressive marketing capture landed: concise by default, developed drafts opt-in.
- Runtime-neutral brand foundation landed; paid/generated brand work remains optional.
- Starter source manifest landed for vendored third-party provenance and local overrides.
- Root override manifest landed for upstream-managed skills that intentionally differ locally.
- Third-party CI/browser drivers remain external rather than copied into consolidated routers.

## Security Review

- Marketing data stays in an explicitly designated local repository and is never auto-published.
- Capture paths never overwrite existing ideas.
- Brand enhancement preserves explicit cost approval before paid generation.
- Persistent recovery copies stay outside repositories and skill-discovery roots.

## Remaining Risks

- Live 4K provider execution is not verified without explicit paid-test authorization.
- Global skill catalog changes become visible to newly initialized sessions; this session's original in-memory catalog is stale by design.
