# Plan: Figma-Based Intake Submission Loading State

## Goal
Use the Figma node `58:1105` from MakerCompass as the full-page post-answer loading state in the Idea Intake Wizard, shown immediately after the user answers the generated idea questions and clicks Create Project. The loading state should remain visible while the app creates the project and generates the initial Overview + Market Research content, then redirect into the new project view with Overview and Market Research available.

## Assumptions
- The loading state belongs in `/projects/new`, inside `IdeaIntakeWizard`, after Step 2 answers are submitted.
- The Figma design is a visual reference, not code to paste directly.
- The implementation should reuse the app's existing Next.js, React, TypeScript, Tailwind, Sora, Space Grotesk, and component patterns.
- Figma remote asset URLs should not be used directly because they expire; use stable local/lucide icons that visually match the Figma icons.
- Project creation should be treated as one bundled product action: consuming one project creates the project and generates the project documents rather than requiring the user to manually generate each document afterward.
- The initial create flow should generate at least the content needed for Overview and Market Research before redirecting. If Overview depends on the complete document set, keep the user on the loading screen until all required documents are generated.
- In the current codebase, Overview and Market Research are two UI sections of one saved `competitive-analysis` document, not two separate backend documents.
- PRD, MVP plan, and Marketing can remain pending after redirect, but their rows should still appear in the loading state as future/pending modules.
- The product is being renamed from Idea2App to Maker Compass, so visible app branding should be updated as part of or immediately before this loading-state work.

## Confirmed Decisions
1. Keep the Figma loading rows: `Overview`, `Market research`, `PRD`, `MVP plan`, and `Marketing`.
2. Show this as a full-page replacement state matching the Figma header and centered content layout.
3. Animate progress bars on a timed loop: move from 0% to about 90% over roughly 20 seconds, hold at 90% while work continues, then complete to 100% once the relevant document generation completes.
4. Redirect to the project view's Overview section using `#overview` as the product-facing URL shape. If the current implementation still needs `tab=competitive`, refactor routing so the user-facing target can be just the project URL plus `#overview`.
5. PRD, MVP plan, and Marketing should be generated as part of the same project-creation queue. If Overview + Market Research are ready but later documents fail, the user can be taken to the project view with failed later documents showing Retry buttons.
6. Use plausible status phrases on the right side of each loading row; they do not need to reflect exact backend stage telemetry.
7. Rename visible product branding from Idea2App to Maker Compass across the app.
8. Keep the loading component reusable for any new-project creation flow.
9. Add automated Playwright coverage as part of the first end-to-end implementation after the backend status contract is stable, not as a later optional polish task.

## Recommended First Step
Do not start with the Figma loading UI. First refactor the backend into shared project-creation and document-generation services without changing behavior. Once the existing manual Generate All flow and individual generation routes use the same service path, add a durable onboarding queue contract that project creation can start and the loading screen can poll.

## Current Backend State
- Server-side document generation exists today.
- `/api/projects/create-from-intake` currently creates the project, writes `project_intakes`, generates a project name, and returns a URL. It does not start document generation.
- `/api/analysis/[type]` can generate individual documents server-side and already handles ownership, intake context, credit checks, persistence, metrics, and refunds.
- `/api/generate-all/start`, `/api/generate-all/execute`, and `/api/generate-all/status` implement a database-backed generation queue. The browser starts the queue, fires the execute route, and polls status.
- `generate-all/execute` runs on the server with `maxDuration = 300` and can continue after the tab closes once execution has started, but it is currently triggered by a manual Generate All UI flow, not by project creation.
- The current Generate All queue is sequential: competitive → PRD → MVP → mockups → launch. It is not dependency-aware parallel orchestration yet.
- Current Generate All behavior still deducts/refunds credits per step. The new project-based flow should remove that credit accounting for bundled onboarding generation.
- Current Generate All failure behavior stops at the first failed step after refunding. It does not yet do automatic bounded retries or continue to later independent docs.
- Before reusing Generate All for onboarding, competitive saves need to include the v2 metadata required by the designed Overview/Market Research renderer.

## Staged Implementation Plan

### Stage 0: Baseline The Contract And Keep Behavior Stable
- Map the current generation entry points before editing: `/api/projects/create-from-intake`, `/api/analysis/[type]`, `/api/generate-all/start`, `/api/generate-all/execute`, `/api/generate-all/status`, `src/stores/generate-all-store.ts`, and the workspace retry/generate controls.
- Define the initial onboarding document bundle: `competitive` creates the saved `competitive-analysis` document that powers both Overview and Market Research; `prd`, `mvp`, and `launch` continue as later queue items; `techspec` can be added if the product wants it in the initial bundle.
- Define the dependency graph explicitly:
  - `competitive`: depends on project + intake only.
  - `launch` / Marketing: can depend on project + intake only unless product wants PRD context.
  - `prd`: depends on `competitive`.
  - `mvp`: depends on `prd`.
  - `techspec`: depends on `prd` and can run in parallel with `mvp`.
  - `mockups`: depends on `mvp`.
- Decide the minimum landing condition: redirect when the `competitive-analysis` row exists with v2 metadata, unless implementation discovers Overview truly depends on all generated docs.
- Validation: write down the final queue item statuses, dependency names, and redirect rule before any code changes.

### Stage 1: Extract Shared Backend Services Without Changing UX
- Move project/intake creation logic out of `/api/projects/create-from-intake` into a reusable server service. The route should remain a thin wrapper that validates the request and calls the service.
- Move `runStep()` and document persistence out of `/api/generate-all/execute` into a typed backend generation service.
- Create a backend document generation registry with `docType`, label, dependencies, default model, runner, persistence target, metadata builder, and whether the item is included in onboarding.
- Keep the manual Generate All UI and individual document routes working exactly as they do today while they begin calling the shared service.
- Fix the known competitive metadata gap in Generate All: saved `competitive-analysis` documents must include `document_version` and `prompt_version` compatible with `competitive-analysis-v2`.
- Validation: existing Generate All still works, individual generation still works, and competitive documents generated through either path render in the v2 Overview/Market Research UI.

### Stage 2: Normalize The Durable Queue Contract
- Replace the weak queue JSON shape with a stronger item contract. Prefer a `generation_queue_items` table for item-level locking and retries; if that is too large for this stage, extend the JSON items with `runId`, `source`, `idempotencyKey`, `attempt`, `maxAttempts`, `dependsOn`, `startedAt`, `completedAt`, `outputTable`, `outputId`, `error`, and `creditStatus`.
- Add top-level run statuses that support partial success: `queued`, `running`, `partial`, `completed`, `cancelled`, and `error`.
- Add executor locking or compare-and-swap updates so two `/execute` calls cannot run the same item, save duplicate documents, or double-charge credits.
- Add idempotency for duplicate final submits. Use `pendingToken` when present and otherwise accept a client idempotency key from the wizard submission.
- Record output row references on queue items so retries can skip already-created artifacts for the same run.
- Validation: duplicate calls to start/execute the same run do not create duplicate projects, duplicate queue items, duplicate document rows, or duplicate charges.

### Stage 3: Add Project-Creation Bundled Queue Without UI Replacement Yet
- Extend `/api/projects/create-from-intake` so it creates the project, writes `project_intakes`, claims the pending token, and creates the onboarding generation run in one durable server operation.
- Keep monthly project allowance as the gate before project insertion. This still consumes one project allowance for the bundled project creation flow.
- Do not charge separate consumer credits for onboarding documents. Mark the queue `source` as `onboarding` or `project_creation` so bundled generation bypasses credit deduction while legacy/manual generation can keep its current credit behavior until pricing is fully migrated.
- Return `{ project, projectUrl, generationRunId, statusUrl }`. The user-facing `projectUrl` should target `${getProjectUrl(project)}#overview` once routing supports it.
- Keep project/intake rows if later document generation fails; the user should land in a partial/retryable project state rather than lose the project.
- Validation: submitting the wizard creates exactly one project, one intake, one generation run, and pending queue items without running long AI calls inline in the request.

### Stage 4: Build The Server Executor, Retry Model, And Status API
- Refactor `/api/generate-all/execute` into a generic generation-run executor that can process both legacy Generate All and onboarding runs.
- Start with max concurrency `1` until locking, idempotency, and retries are verified. Then move to max concurrency `2` for independent items such as Marketing and later Tech Spec.
- Add bounded automatic retries with exponential backoff per item. Retry only items whose dependencies are done.
- Continue independent items when possible. If PRD fails, dependent MVP/Mockups stay blocked, but independent Marketing can still complete.
- Expose a focused status response for the loading screen: per-row status for `Overview`, `Market research`, `PRD`, `MVP plan`, and `Marketing`, plus `readyToRedirect`, `redirectUrl`, and retryable errors.
- Validation: forced transient failures retry automatically; forced permanent failures produce a `partial` run with completed artifacts preserved and blocked items clearly marked.

### Stage 5: Wire The Figma Loading UI To The Stable Status API
- Create `src/components/projects/intake-submission-loading-panel.tsx`.
- Match the Figma hierarchy: Maker Compass header, small eyebrow, large Space Grotesk headline, supporting sentence, horizontal dividers, and progress rows with lucide icons.
- Use row labels exactly as confirmed: `Overview`, `Market research`, `PRD`, `MVP plan`, and `Marketing`.
- Insert the panel into `src/components/projects/idea-intake-wizard.tsx` while `step === "questions"` and the create/generation chain is active.
- Freeze the answer form after submit. Clear `isCreatingProject` only on recoverable error; let navigation replace the page on success.
- Animate each row from 0% to 90% over about 20 seconds, hold at 90% until backend completion, then complete to 100%. Respect `prefers-reduced-motion`.
- Validation: delayed backend responses keep the full-page loading state visible, and no row reaches 100% before the backend marks the matching artifact ready.

### Stage 6: Routing, Workspace Retry UX, And Generate All Deprecation
- Refactor project routing so the product-facing success target can be `${getProjectUrl(project)}#overview`.
- Keep old deep links such as `?tab=competitive#overview` working during transition.
- Fix hash updates in `ProjectWorkspace` so changing anchors does not accidentally drop required search params before the canonical route work is complete.
- Add persistent inline Retry controls for failed document stages in the workspace, backed by queue item retry semantics. Replace one-off `alert()` failures where practical.
- Hide the manual Generate All start button for projects created with the onboarding bundle. Keep active legacy Generate All queues readable/resumable until old flows are retired.
- Treat `GenerateAllBlock`, `GenerateAllHydrator`, `GenerateAllNavBadge`, and `src/stores/generate-all-store.ts` as legacy UI during the transition, then remove or simplify them after no current flow depends on manual Generate All.
- Validation: a project with Overview/Market Research complete and PRD/MVP/Marketing failed after retries lands in the workspace, shows completed content, and offers Retry for failed later docs.

### Stage 7: Maker Compass Branding
- Add or centralize app-brand constants before doing broad string replacement.
- Replace visible `Idea2App` app/product copy with `Maker Compass` in layouts, metadata, auth copy, headers, footers, alt text, and project-page titles.
- Keep package names, internal storage keys, and safe local URLs unchanged unless a separate migration is justified.
- Update `PROJECT_CONTEXT.md` after implementation because this is a product identity and architecture change.
- Validation: `rg "Idea2App|Idea2app" src PROJECT_CONTEXT.md README.md` returns only intentional internal/package references.

### Stage 8: Automated And Visual Verification
- Add Playwright after the status API is stable, not before. The first useful test should stub or delay the status endpoint and verify the loading screen, progress behavior, and redirect.
- Cover successful intake submit through redirect to `#overview`.
- Cover a partial generation result where Overview and Market Research are ready but PRD/MVP/Marketing need Retry.
- Cover route/hash behavior for both canonical `#overview` and legacy `?tab=competitive#overview` links.
- Cover mobile and desktop screenshots for the loading state to catch text overlap.
- Run focused lint/type checks after each stage and `npx tsc --noEmit` before merging the backend stages.
- Validation: Playwright confirms the user never lands on an empty project shell after answering intake questions.

## Milestones
- Stage 0 complete: the dependency graph, minimum landing condition, queue statuses, and redirect rule are documented before code changes.
- Stage 1 complete: shared backend project/intake and document-generation services exist, existing Generate All and individual generation behavior still works, and competitive metadata is v2-correct.
- Stage 2 complete: generation runs have item-level idempotency, locking, retry metadata, output references, and partial-success statuses.
- Stage 3 complete: new-project submission creates the project, intake, and onboarding generation run without long AI work inline in the submit request.
- Stage 4 complete: the executor can process onboarding runs with retries, dependency handling, and a loading-screen status response.
- Stage 5 complete: Step 2 submit shows the full-page Figma loading panel until Overview + Market Research are ready.
- Stage 6 complete: the user lands at `#overview`, failed later docs show Retry, and manual Generate All is hidden or legacy-only for bundled projects.
- Stage 7 complete: user-visible app copy says Maker Compass.
- Stage 8 complete: Playwright and visual checks cover success, partial failure, retry, route/hash behavior, and mobile/desktop loading UI.

## Validation
- Stage 1 service extraction tests: existing Generate All and individual document generation still save the same document types, with v2 metadata for competitive analysis.
- Stage 2 concurrency/idempotency checks: duplicate submit/start/execute calls do not duplicate projects, queue items, document rows, or credit events.
- Stage 3 API checks: `/api/projects/create-from-intake` returns `generationRunId` and `statusUrl`, creates the onboarding run, and does not wait for AI generation inline.
- Stage 4 executor checks: forced transient failures retry; forced permanent failures produce `partial`; completed output row ids are recorded.
- Stage 5 UI checks: loading panel appears after final answer submit, answer edits are frozen, and progress holds at 90% until status completion.
- Stage 6 routing/retry checks: redirect lands at `#overview`, legacy `?tab=competitive#overview` still works, and failed later docs show Retry.
- Stage 7 branding check: `rg "Idea2App|Idea2app" src PROJECT_CONTEXT.md README.md` returns only intentional internal/package references.
- Stage 8 Playwright checks: intake loading state, progress behavior, redirect, partial failure retry, and mobile/desktop screenshots.
- `npm run lint -- src/components/projects/idea-intake-wizard.tsx src/components/projects/intake-submission-loading-panel.tsx src/app/api/projects/create-from-intake/route.ts src/app/api/generate-all/execute/route.ts`
- `npx tsc --noEmit`

## Risks And Mitigations
- Risk: Bundled generation makes new-project creation slow or fragile.
  - Mitigation: use a durable queue, dependency-aware parallelism, automatic retries, and redirect only once the minimum useful content is ready.
- Risk: Refactoring the backend and UI in one pass creates too much blast radius.
  - Mitigation: ship the backend stages first behind unchanged behavior, then wire onboarding, then wire the loading UI.
- Risk: Duplicate submit or duplicate executor calls create duplicate projects, documents, or credit charges.
  - Mitigation: add submission idempotency, output row references, and executor item locking before project creation starts generation.
- Risk: A JSON queue becomes hard to lock safely as retries and parallelism are added.
  - Mitigation: prefer a `generation_queue_items` table; if JSON is retained temporarily, use compare-and-swap updates and keep concurrency at `1` until safe.
- Risk: Legacy credit accounting conflicts with the new project-based onboarding bundle.
  - Mitigation: add a queue `source`/mode so onboarding generation bypasses per-document credit deduction while legacy/manual generation keeps current behavior during migration.
- Risk: The Figma labels imply PRD/MVP/Marketing are generated before redirect.
  - Mitigation: make PRD/MVP/Marketing real queue items; if they cannot complete before redirect, show them as failed/pending with Retry in the project view.
- Risk: Loading state flickers because `finally` clears `isCreatingProject` after `router.push`.
  - Mitigation: clear the state only on error; let navigation replace the page on success.
- Risk: Figma asset URLs expire.
  - Mitigation: use lucide icons or local inline SVGs, not remote Figma asset URLs.
- Risk: Mobile layout inherits fixed Figma dimensions.
  - Mitigation: use responsive max widths and stacked row content below small breakpoints.
- Risk: The loading screen is visually inconsistent with the existing wizard.
  - Mitigation: keep the Figma panel language but map colors/fonts to existing tokens and wizard surface patterns.
- Risk: Brand rename touches many files and can become noisy.
  - Mitigation: separate user-visible product copy from package/internal identifiers, and update `PROJECT_CONTEXT.md` only for durable architectural/product naming changes.
- Risk: Playwright tests become brittle if written before the status API is final.
  - Mitigation: add the test in the first end-to-end stage after the backend status response is stable, with route stubs for long-running generation.

## Open Decisions
- Whether Overview can be considered complete as soon as competitive analysis exists, or whether Overview depends on the full generated document set. If it depends on all documents, keep the user on the loading screen until all documents complete.
- Whether to add a normalized `generation_queue_items` table now, or first extend the current `generation_queues.queue` JSON with stronger item fields.
- Which document types are independent enough to generate in parallel after competitive analysis, and which must remain sequential. The recommended starting point is max concurrency `1`, then `2` after locking is proven.
- The exact retry policy: number of automatic retries, backoff timing, and when to switch from loading-screen retry to in-project Retry buttons.
- Whether Marketing should run directly from intake/project context or wait for PRD context.

## Critique

### Software Architect
- The first architectural move should be extraction, not new UI. Shared services and a stronger queue contract reduce the risk of having three subtly different generation paths: individual generation, manual Generate All, and onboarding generation.

### Product Manager
- The staged rollout protects the user promise. Users should only see the new loading experience once the backend can reliably produce Overview and Market Research before redirecting.

### Customer Or End User
- The user should see clear momentum and then land on real generated content. PRD/MVP/Marketing can be shown as upcoming work, but the completed rows must correspond to content that is actually ready.

### Engineering Implementer
- The highest-risk work is not the Figma panel; it is idempotent orchestration. Implementers should handle duplicate submits, duplicate executor calls, output row references, competitive v2 metadata, and partial failure before adding concurrency.

### Risk, Security, Or Operations
- No new secrets should be needed. The operational risk is long-running AI generation during onboarding; use existing timeout/retry patterns, avoid orphan projects, preserve partial success, and keep legacy/manual generation available until the onboarding queue is proven.
