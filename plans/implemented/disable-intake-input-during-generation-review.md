# Review: Disable Intake Input During Generation

## Scope
- `src/components/projects/idea-intake-wizard.tsx`
- `plans/disable-intake-input-during-generation-plan.md`

## Verification
- `npm run lint -- src/components/projects/idea-intake-wizard.tsx` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `node --import tsx --test src/lib/intake-question-generation.test.ts src/lib/landing-intake-handoff.test.ts` passed.
- Authenticated browser verification passed at `http://localhost:3000/projects/new` using the local e2e credentials from `.env.e2e.local` without printing secrets.
- The browser check intercepted `/api/intake/questions` with a short delayed failure to hold the transient loading state open, then verified:
  - Before generation: textarea enabled, example section title/cards visible at opacity `1`, three examples enabled.
  - During generation: textarea disabled, example section title/cards opacity `0`, pointer events `none`, `aria-hidden="true"`, all three examples disabled, and `Generating questions` visible.
  - After forced failure: textarea enabled again, example section title/cards opacity `1`, `aria-hidden="false"`, all examples enabled again, and the error message visible.
- Screenshot captured at `tmp/intake-step1-locked-state.png`.

## Code Review Findings
- No blocking findings.
- The Step 1 lock is centralized as `isIdeaStepLocked = isLoadingPending || isGeneratingQuestions`.
- The textarea uses the derived lock state and keeps the existing disabled styling.
- Example idea buttons remain mounted for stable layout, fade out through `opacity-0`, and are disabled so invisible controls are not clickable or keyboard-focusable.
- Failure recovery is handled by the existing `finally` path in `generateQuestions`, which resets `isGeneratingQuestions` and fades the examples back in.

## Security Review Findings
- No security findings.
- The change is client-side UI state only. It does not alter authentication, authorization, secrets, API payload validation, database access, payments, webhooks, SSR boundaries, or external API calls.

## Remediation Checklist
- [x] No remediation required from review.
