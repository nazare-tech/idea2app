---
implemented: true
implemented_at: 2026-06-29T19:28:56Z
implementation_summary: Added repo and global workflow rules requiring real UI verification and screenshot/video evidence for UI-visible work.
---

# Plan: Real UI Verification Evidence

## Goal
Make real UI verification evidence mandatory for UI-visible work, and prevent shortcut testing that bypasses auth, routes, databases, image generation, or other real product flows just to save time.

## Assumptions
- The global holistic skill should own the general expectation that user-facing work is verified through the real product experience.
- This repo's `AGENTS.md` should own the specific browser workflow, e2e credential handling, and evidence requirements.
- Screenshot evidence is enough for static UI states; video is better for motion, loading, generation progress, or multi-step flows.
- If real UI verification is blocked by unavailable dependencies, credentials, cost, or safety, the correct behavior is to report the blocker rather than fake the path.

## Clarifying Questions
1. Should this rule live in the global skill or this repo's `AGENTS.md`?
   - Recommendation A: Put the general rule in the global skill and repo-specific details in `AGENTS.md`.
   - Trade-off: Applies the right principle everywhere while keeping local browser/credential details local.
   - Recommendation B: Put everything only in `AGENTS.md`.
   - Trade-off: Avoids global behavior changes, but other repos using the holistic skill would not inherit the real-UI standard.
   - Selected: Recommendation A.
2. Should tests be allowed to use fixtures or patched routes when real generation is slow?
   - Recommendation A: No, use the real UI path by default and report blockers instead of bypassing.
   - Trade-off: Slower but more trustworthy and matches real user behavior.
   - Recommendation B: Allow fixtures for speed unless the user explicitly asks for real generation.
   - Trade-off: Faster but can miss integration failures and gives weaker evidence.
   - Selected: Recommendation A.
3. What evidence should be shared?
   - Recommendation A: Screenshot for static UI states, video for motion/loading/generation/multi-step flows.
   - Trade-off: Practical evidence without over-producing video for every simple state.
   - Recommendation B: Always record video.
   - Trade-off: More complete but heavier and often unnecessary for static changes.
   - Selected: Recommendation A.

## Recommended First Step
Update `AGENTS.md` and `.codex/AGENTS.md` with the repo-local evidence rule, then update the global holistic skill with the general real-user verification requirement.

## Plan
1. Add repo-local UI verification evidence rules to `AGENTS.md`.
2. Mirror the short verification requirement in `.codex/AGENTS.md`.
3. Update the global holistic skill to require real UI/user-facing verification and evidence.
4. Add review notes and validate markdown diffs.

## Validation
- `git diff --check` for touched repo files.
- Search touched instructions for the new real UI and evidence rules.
- Confirm no application runtime code changed for this instruction-only update.

## Risks And Mitigations
- Risk: Real UI verification can be slow for image generation and long async flows.
  - Mitigation: The rule explicitly values realism over speed and requires reporting blockers instead of bypassing.
- Risk: Evidence could expose credentials or sensitive user data.
  - Mitigation: Existing credential rules remain; screenshots/videos should avoid exposing secrets and never print `.env.e2e.local` values.
- Risk: Some backend changes have no meaningful UI path.
  - Mitigation: The rule allows API/log/database verification when no meaningful UI evidence exists, but requires explaining why.

## Rollback Or Recovery
Revert the instruction changes in `AGENTS.md`, `.codex/AGENTS.md`, and the global holistic skill. No app runtime behavior or database state is affected.

## Open Decisions
- None.

## Critique

### Software Architect
- Putting the general requirement in the global skill and repo-specific details in `AGENTS.md` keeps the responsibility boundary clean.

### Product Manager
- Real evidence in the task thread should reduce false confidence and make review easier.

### Customer Or End User
- The product is more likely to behave correctly for real users because verification follows the actual UI path.

### Engineering Implementer
- This increases verification time, but it catches integration and loading issues that unit checks miss.

### Risk, Security, Or Operations
- Evidence capture must avoid leaking credentials, tokens, private data, or raw env values.
