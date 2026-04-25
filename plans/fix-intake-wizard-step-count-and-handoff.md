# Plan: Fix Intake Wizard Step Count And Post-Submit Handoff

## Goal
Fix two issues in the `/projects/new` idea intake wizard:

1. The UI says `Step 2 of 4` even though the current wizard only has two steps.
2. Submitting the Step 2 answers routes the user into the Prompt/AI chat view, which should not be the default post-intake destination.

## Current Findings

- `src/components/projects/idea-intake-wizard.tsx` hardcodes `Step 1 of 4` and `Step 2 of 4`.
- The wizard only has two client states today: `idea` and `questions`.
- `src/app/api/projects/create-from-intake/route.ts` returns:
  - `projectUrl: \`${getProjectUrl(project)}?new=1&tab=prompt\``
- `src/components/workspace/project-workspace.tsx` treats `?new=1` as a prompt-only startup state and treats `tab=prompt` as the chat view.
- `PROJECT_CONTEXT.md` currently says completed intake lands in the workspace Prompt tab. If the intended product behavior is no longer Prompt tab first, update that context during implementation.

## Implementation Plan

### 1. Make the wizard step count match the actual flow

Update `src/components/projects/idea-intake-wizard.tsx`.

- Add a small shared constant, for example `const WIZARD_TOTAL_STEPS = 2`.
- Replace the hardcoded labels with `Step 1 of 2` and `Step 2 of 2`, preferably by deriving the label from the current `WizardStep`.
- Keep this local to the wizard. No dependency or architecture change is needed.

### 2. Stop routing completed intake to AI chat

Update `src/app/api/projects/create-from-intake/route.ts`.

- Change the returned `projectUrl` so it does not use `tab=prompt`.
- Prefer routing to the document workspace view, likely:
  - `projectUrl: \`${getProjectUrl(project)}?tab=competitive\``
- Avoid `?new=1` unless the workspace still needs it for a non-chat onboarding state. Today `?new=1` starts prompt-only mode, so removing it is the cleaner fix.

### 3. Make workspace defaults align with the new handoff

Update `src/components/workspace/project-workspace.tsx` if needed after step 2.

- Confirm that `?tab=competitive` opens the scrollable document workspace, not `PromptChatInterface`.
- If a project has `hasStructuredIntake === true` and a populated `project.description`, default to `"competitive"` when there is no valid `tab`.
- Keep `"prompt"` as the default only for projects that truly still need idea capture or follow-up chat.
- Ensure the Idea Brief entry in the left nav can still open the prompt/intake summary intentionally, but it should not be the automatic destination after Step 2 submission.

### 4. Update source-of-truth docs if behavior changes

Update `PROJECT_CONTEXT.md` during the implementation pass.

- Replace the current statement that users land in the workspace Prompt tab after intake.
- Document the new destination, for example: completed intake lands in the workspace document view with the Idea Brief marked complete.

### 5. Add focused regression coverage

Recommended checks:

- Add or update a lightweight test for the create-from-intake route response shape if this repo has a practical route-testing pattern.
- Add a component-level or browser regression check that verifies the wizard shows:
  - `Step 1 of 2` on the idea step.
  - `Step 2 of 2` on the question step.
- Add a browser check for the full happy path:
  - Enter idea.
  - Generate questions.
  - Answer all questions.
  - Submit.
  - Confirm the resulting URL does not contain `tab=prompt`.
  - Confirm the visible workspace is not `PromptChatInterface` / AI chat.

## Validation Plan

Run these after implementing the fix:

1. `npm run lint`
2. `npm test`
3. Manual browser test of `/projects/new`
4. Visual confirmation of both wizard steps
5. Post-submit confirmation that the user lands in the document workspace, not AI chat

## Acceptance Criteria

- The wizard never displays `of 4` unless two additional steps are actually added.
- The final Step 2 submit still creates exactly one `projects` row and one `project_intakes` row.
- The post-submit URL does not force `tab=prompt`.
- The first post-submit screen is the project document workspace, not the AI chat.
- `PROJECT_CONTEXT.md` matches the implemented behavior.
