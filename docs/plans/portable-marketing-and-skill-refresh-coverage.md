# Skill Retirement Coverage

Date: 2026-07-29

This is the pre-removal evidence for the skill refresh. The checks compare instruction contracts because these skills route other tools; they are not executable drivers.

## Recovery

- Starter-kit snapshot: `/Users/Mukul/Documents/Codex Recovery/5_idea2app-skill-refresh-20260729-oDzxrr/project-starter-kit`
- Impeccable pre-v4.0.4 copy: `/Users/Mukul/Documents/Codex Recovery/5_idea2app-skill-refresh-20260729-oDzxrr/impeccable-before-v4.0.4`
- Retired global skills: `/Users/Mukul/Documents/Codex Recovery/5_idea2app-skill-refresh-20260729-oDzxrr/retired-global-skills`
- Both copies passed recursive comparison before any source was changed.

## VFX 4K Crosswalk

| Retiring `4k-vfx` contract | Surviving `vfx` contract | Result |
|---|---|---|
| Required Pika capabilities | Identical sorted capability list | Pass |
| Read every frame using contact sheets | Same all-frame workflow | Pass |
| Transcribe speech and analyze non-speech audio | Same two-part audio workflow | Pass |
| Write a Seedance prompt that locks subject, motion, camera, framing, lighting, palette, and timing | Same prompt contract with a resolution label | Pass |
| Estimate cost and require explicit approval before generation | Same mandatory agreement gate | Pass |
| Provider `seedance`, model `standard`, resolution `4k` | A 4K request selects `state.seedance_model = standard` and `state.resolution = 4k` | Pass |
| Use original clip as `reference_videos` and `@Video1` | Same reference contract | Pass |
| Do not pass `negative_prompt` or an FPS parameter | Same prohibited-parameter rules | Pass |
| Poll `task_status` and return the video URL | Same completion and delivery flow | Pass |
| Recover from rejected/downgraded resolution and re-gate charged retries | Same resolution failure path | Pass |

The pre-removal assertion passed. A live 4K render was not run because no source clip or paid-generation approval was supplied; static contract coverage does not claim provider execution.

## CI/UI Retirement Crosswalk

| Retiring global skill | Surviving project route | Positive coverage |
|---|---|---|
| `ci-watcher` | `.agents/skills/ci-operator/SKILL.md` → Watch Mode | Resolves the PR, uses `gh pr checks` as source of truth, watches pending checks, reads GitHub Actions failure logs, and reports status/links/next action |
| `fix-ci` | `.agents/skills/ci-operator/SKILL.md` → Diagnose + Fix Mode | Finds the first root failure, applies the smallest durable fix, verifies locally, and re-reads PR checks without assuming push authority |
| `loop-on-ci` | `.agents/skills/ci-operator/SKILL.md` → Loop Mode | Repeats fix/watch/recheck until green or genuinely blocked, retries a suspected flake once, and preserves external check links |
| `run-smoke-tests` | `.agents/skills/ui-verification/SKILL.md` → Smoke Suite | Discovers the repository command, runs the narrowest suite, inspects artifacts, fixes only when authorized, and reruns for stability |
| `control-ui` | `.agents/skills/ui-verification/SKILL.md` → Local Harness plus external browser routes | Reuses repository harnesses, supports web/Electron/CDP, captures before/after evidence, uses stable markers, and keeps browser drivers externally updated |

All five mappings passed. `AGENTS.md` routes CI work to `ci-operator` and UI work to `ui-verification`.
