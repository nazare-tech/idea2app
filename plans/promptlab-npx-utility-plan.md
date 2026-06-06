# Plan: PromptLab Generic Npx Utility

## Goal
Create PromptLab as an open-source local development tool for solo AI-product builders. PromptLab should install into a user's existing repo, provide a fixed but generic prompt/artifact workbench as a large modal sheet, store drafts/runs as local developer artifacts, support text/JSON/image artifacts, and rely on host-provided context and runner adapters instead of owning each app's generation semantics.

MakerCompass should be the dogfood integration, but PromptLab should live in a separate Git repository so the package boundary is real from the start.

## Current Facts
- MakerCompass Prompt Lab is local-development-only at `/dev/prompt-lab`.
- The current UI lives in `src/components/dev/prompt-lab-client.tsx` and assumes MakerCompass projects, artifacts, OpenRouter model lists, Supabase-backed drafts/runs, and MakerCompass workspace renderers.
- Prompt composition and execution live in `src/lib/prompt-lab.ts`.
- API routes live under `src/app/api/dev/prompt-lab/*`.
- Prompt Lab persistence currently uses Supabase tables `prompt_lab_experiments` and `prompt_lab_runs`.
- Prompt Lab is currently page-only; no local `AgentVis` component was found in this repo.
- npm executable packages use the `package.json` `bin` field; `npx` now runs through `npm exec` and infers which binary to run from the package's `bin` entries.

## External Tool Research
- Agentation's basic setup is the closest model: install `agentation` as a dev dependency, add a React component near the root, and gate it with `NODE_ENV === "development"`. It does not require a backend for basic copy/paste use. Its MCP package is optional and runs locally when the user wants real-time agent sync.
- Agentation also offers an agent skill that detects the framework, installs the package, wires the component, and recommends MCP setup. That is a strong precedent for PromptLab's "npx plus agent handoff" onboarding.
- Agenteract uses a generic local dev server config and can launch configured app dev servers through a central CLI. That is powerful, but it introduces a server orchestrator and PTY bridge, which is too much for PromptLab v1.
- Agentuity owns a full project framework and therefore ships its own CLI/dev server. PromptLab should not copy that unless it becomes a full framework, which is outside this scope.
- Inngest AgentKit's dev server is useful for observability but requires the app to expose HTTP endpoints and adds a second server. That is a bad default for solo builders who just want a local workbench inside their app.
- Vercel AI Elements, assistant-ui, shadcn AI components, prompt-kit, and similar libraries provide prompt/composer UI patterns with attachment support. For v1, PromptLab should borrow the pattern, not depend deeply on them, because those libraries often assume shadcn, AI SDK, or chat-first flows.

## Decisions From User Feedback
- Brand: PromptLab.
- Release model: open source.
- Target user: solo builders using AI coding agents, not teams adding a production SaaS admin tool.
- Runtime scope: local development only.
- Runtime model: embedded dev-only React component/modal inside the host app's existing dev server.
- Repo shape: separate Git repository for PromptLab, then dogfood into MakerCompass.
- Persistence: local developer artifacts, preferably JSON under `.promptlab/`; no database in v1.
- Artifact support: text, JSON, and image artifacts in v1.
- Artifact dependency graph: not in v1.
- Context composer: host-provided project/artifact/context sources only in v1; no automatic repo file ingestion.
- Composer implementation: lightweight internal composer using proven patterns from AI Elements, assistant-ui, shadcn AI, and prompt-kit without taking a heavy dependency on one library in v1.
- UI customization: fixed generic PromptLab UI with modest configuration and extension points.
- CLI onboarding: create safe stubs plus an agent handoff file by default; avoid direct codemods unless later added as an explicit opt-in.
- Model execution: host-owned `run` adapter, with optional helper factories for OpenAI, Anthropic, OpenRouter text, and OpenAI-compatible image calls.
- Package shape: one `promptlab` package for v1, using subpath exports such as `promptlab/core`, `promptlab/react`, and `promptlab/next`.
- MakerCompass surface: modal sheet becomes the primary surface; the existing page can remain temporarily only as a rollback bridge during migration.
- Launch definition: dogfood inside MakerCompass, published npm package, docs site, demo video, and example repo.

## Resolved Questions
1. Runtime model: embedded dev-only React component/modal inside the host app's existing dev server.
   - Trade-off accepted: simplest mental model, no second process, same app runtime/context, and if the app server is killed PromptLab correctly disappears too.
   - Trade-off rejected for v1: a standalone server would be more framework-agnostic later, but creates port/process lifecycle confusion and forces every app to expose a bridge API.

2. CLI onboarding: safe stubs plus agent handoff file by default.
   - Trade-off accepted: safer across unknown apps and aligned with solo builders using Codex/Cursor/Claude, but not fully automatic on first run.
   - Trade-off rejected for v1: codemods are faster in happy-path Next/Vite apps, but brittle around custom layouts, aliases, styling, and app shells.

3. Composer UI: lightweight internal composer built from proven external patterns.
   - Trade-off accepted: fewer dependencies and better fit for artifact workflows, while still borrowing known attachment/chip/composer patterns.
   - Trade-off rejected for v1: adopting assistant-ui or AI Elements wholesale would move faster, but imports chat-runtime and styling assumptions PromptLab does not need.

4. Model execution: host-owned `run` adapter with optional provider helper factories.
   - Trade-off accepted: generic and safe while still giving solo builders working examples; the host app or agent controls real API behavior.
   - Trade-off rejected for v1: a built-in local model gateway demos well, but quickly turns PromptLab into a provider abstraction product.

5. Package shape: one `promptlab` package with subpath exports such as `promptlab/core`, `promptlab/react`, and `promptlab/next`.
   - Trade-off accepted: simpler install, simpler `npx promptlab init`, and less release overhead; internal boundaries must stay disciplined.
   - Trade-off rejected for v1: separate packages like `@promptlab/core`, `@promptlab/react`, `@promptlab/next`, and `@promptlab/cli` are cleaner long-term, but add package management and publishing complexity before product-market fit.

## Recommended First Step
Create a new `promptlab` repository and build the package-shaped core there with a fake fixture app before migrating MakerCompass. The first dogfood target should be MakerCompass, but the extraction boundary should be proven outside MakerCompass so Supabase, OpenRouter, and MakerCompass document assumptions do not leak into the public API.

## Recommended Npx Command
Use:

```bash
npx promptlab@latest init
```

Package:
- npm package name: `promptlab`, if available.
- binary name: `promptlab`.
- primary command: `promptlab init`.

Why this over `create-promptlab`: PromptLab is not primarily creating a new app; it is adding a local dev tool to an existing repo. `promptlab init` communicates that better. If `promptlab` is unavailable on npm, fallback to `@promptlab/cli` with the same binary and `npx @promptlab/cli@latest init`.

## Product Shape
PromptLab should install as:
- A dev-only modal launcher component mounted near the host app root.
- A local JSON persistence file, such as `.promptlab/promptlab.local.json`.
- A `promptlab.config.ts` file that defines artifacts, host context sources, preview types, and run adapters.
- An agent handoff file, such as `PROMPTLAB_AGENT_HANDOFF.md`, that tells Codex/Cursor/Claude exactly which adapters to wire.

The public promise:

> Add a local prompt/artifact workbench to your AI app, then let your coding agent wire the project-specific adapters.

## Public Contract Sketch
```ts
export default definePromptLab({
  artifacts: [
    {
      id: "market-research",
      label: "Market Research",
      outputKind: "markdown",
      defaultModel: "openai/gpt-5.4-mini",
      buildPrompt: async ({ project, contextSources, selectedContext }) => ({
        system: "...",
        user: "...",
      }),
      run: async ({ systemPrompt, userPrompt, model, project, selectedContext }) => ({
        content: "...",
        metadata: {},
      }),
      preview: "markdown",
    },
    {
      id: "mockup",
      label: "Design Mockup",
      outputKind: "image",
      defaultModel: "openai/gpt-5.4-image-2",
      buildPrompt: async ({ project, selectedContext }) => ({
        system: "...",
        user: "...",
      }),
      run: async (input) => ({
        content: [{ type: "image", url: "data:image/png;base64,..." }],
        metadata: {},
      }),
      preview: "image",
    },
  ],
  projects,
  persistence: localJsonPersistence({ path: ".promptlab/promptlab.local.json" }),
})
```

## Host Integration Contract
- Project source:
  - `listProjects()`
  - `getProject(projectId)`
  - `getProjectContext(projectId)`
- Context source:
  - `listContextSources(projectId)`
  - `getContextSourceContent(projectId, sourceId)`
  - Source types should include host artifacts, project summaries, selected app records, and user-provided text.
- Prompt builder:
  - `buildPrompt({ project, contextSources, selectedContext, artifact })`
- Runner:
  - `run({ artifact, systemPrompt, userPrompt, model, selectedContext })`
- Local persistence:
  - `listDrafts`, `saveDraft`, `deleteDraft`
  - `listRuns`, `saveRun`
- Preview:
  - Built-ins: markdown, plain text, JSON, image gallery.
  - Optional React renderer per artifact later.

## Context Composer Design
Use only host-provided context sources in v1. This keeps PromptLab generic without becoming a repo-file browser.

```ts
type PromptLabContextSource = {
  id: string
  type: "artifact" | "project" | "text" | "record" | "image"
  label: string
  description?: string
  contentType: "text/plain" | "text/markdown" | "application/json" | "image/png" | "image/jpeg"
  load: () => Promise<PromptLabContextPayload>
}
```

The UI should present these as chips/cards that users can drag or add into the composer. The final prompt context block should include labels, provenance, deterministic ordering, size limits, and truncation notices.

## Modal Recommendation
PromptLab's primary surface should be a large modal sheet, not a page.

Recommended shape:
- Floating dev-only launcher.
- Dialog or sheet covering nearly the full viewport.
- Full height with roughly 40px left/right margin on desktop.
- Responsive fallback to full-screen on small screens.
- Internal tabs: Setup, Context, Prompts, History, Output.
- Internal scrolling so host page scroll stays stable.
- Fixed generic UI, with host-provided artifact labels, context sources, model list, and preview type.

MakerCompass may keep `/dev/prompt-lab` temporarily during migration, but the target product should not require a full page workbench.

## Plan
1. Create the new PromptLab repository.
   - Output: open-source repo with package skeleton, license, README, TypeScript config, build setup, lint/test scripts, and a fixture app.
   - Validation: package builds and tests run in the new repo.

2. Define core contracts.
   - Output: `definePromptLab`, artifact definitions, context source contracts, local persistence contracts, run result types, and config validation.
   - Validation: unit tests for valid/invalid configs, text/JSON/image artifacts, and local JSON persistence.

3. Build local JSON persistence.
   - Output: `.promptlab/promptlab.local.json` persistence with drafts, runs, metadata, and simple migration/version field.
   - Validation: tests cover create/list/delete drafts, create/list runs, corrupted JSON recovery, and ignored missing file.

4. Build the React modal workbench.
   - Output: fixed generic modal UI with setup, context, prompts, history, and output tabs.
   - Validation: fixture app browser check confirms launch/open/close, context selection, draft save, fake run, run history, markdown/JSON/image preview.

5. Build optional model helper adapters.
   - Output: helper factories for OpenAI-compatible text and image runners, plus examples for OpenRouter.
   - Validation: unit tests mock provider calls; no real API calls in CI.

6. Build `promptlab init`.
   - Output: CLI detects project shape, creates `promptlab.config.ts`, `.promptlab/.gitignore`, local JSON store, agent handoff markdown, and framework-specific setup instructions. It should avoid invasive edits by default.
   - Validation: run against a fixture React/Next app and verify generated files are correct.

7. Dogfood in MakerCompass.
   - Output: replace the current page-first Prompt Lab with PromptLab package integration, keeping MakerCompass-specific adapters in MakerCompass.
   - Validation: existing Prompt Lab behavior works through the modal, including MakerCompass text artifacts and mockup/image artifacts.

8. Publish beta.
   - Output: npm package, docs site, example repo, demo video, beta changelog.
   - Validation: install from npm in a clean repo, run `npx promptlab@latest init`, start the host dev server, and complete a fake run.

## Implementation Status
- [x] Create package-shaped PromptLab scaffold under `promptlab/` with package metadata, MIT license, README, TypeScript config, subpath exports, and `promptlab` bin path.
- [x] Define core contracts for artifacts, projects, context sources, prompt builders, run results, config validation, and package exports.
- [x] Implement in-process PromptLab runtime to resolve projects/context, build prompts, run artifacts, and persist run records.
- [x] Implement local JSON persistence for drafts/runs with schema versioning, atomic writes, missing-file initialization, and corrupted-file backup.
- [x] Implement `promptlab init` safe stubs for `promptlab.config.ts`, `.promptlab/.gitignore`, `.promptlab/promptlab.local.json`, and `PROMPTLAB_AGENT_HANDOFF.md`.
- [x] Add an initial `promptlab/react` modal launcher shell and `promptlab/next` placeholder export.
- [x] Verify focused tests, typecheck, build, built CLI smoke, and package dry run.
- [ ] Move or publish this package as a true separate Git repository. Current implementation is a package-shaped directory inside this workspace to stay within safe writable roots.
- [ ] Expand the React modal from placeholder shell into the full setup/context/prompts/history/output workbench.
- [ ] Add optional provider helper factories for OpenAI/Anthropic/OpenRouter text and image calls.
- [ ] Dogfood the package in MakerCompass.
- [ ] Publish npm beta, docs site, example repo, and demo video.

## Milestones
- Repo Milestone: new PromptLab repo builds and tests.
- Contract Milestone: core config/context/run/persistence types are stable enough to dogfood.
- Modal Milestone: fixture app has a working wide modal sheet.
- Image Milestone: image artifact preview and mocked image runner work.
- Npx Milestone: initializer creates safe stubs and agent handoff.
- MakerCompass Dogfood Milestone: MakerCompass uses PromptLab as a package-shaped integration.
- Beta Milestone: public npm package, docs site, demo video, and example repo are published.

## Validation
- Unit tests for config validation, context source serialization, prompt construction, local JSON persistence, run result validation, and image artifact payloads.
- Browser verification for the modal in a fixture app and in MakerCompass using the Codex in-app browser.
- Packaging checks: `npm pack --dry-run`, local tarball install, `npx promptlab@latest init` equivalent via local package, and TypeScript import tests.
- Fixture app smoke test: initialize, mount modal, select context, save draft, run fake text artifact, run fake image artifact, view history.
- MakerCompass dogfood: run existing Prompt Lab text and image workflows through the new modal integration.

## Risks And Mitigations
- Risk: Embedded React-only v1 excludes non-React apps.
  - Mitigation: state React/Next/Vite as v1 scope; standalone server can be a v2 path.
- Risk: The modal cannot function when the host dev server is stopped.
  - Mitigation: accept this as correct behavior because PromptLab depends on host context; local JSON keeps saved drafts/runs across restarts.
- Risk: CLI-generated edits break custom app shells.
  - Mitigation: default to safe stubs plus agent handoff; add opt-in codemods later.
- Risk: Local JSON persistence gets corrupted.
  - Mitigation: write atomically, keep backups, validate schema version, and show recovery guidance.
- Risk: Host-provided context leaks sensitive data.
  - Mitigation: require visible provenance, size caps, explicit selection, and host redaction hooks.
- Risk: Image support expands scope.
  - Mitigation: support image artifact types and preview in v1, but keep provider-specific image generation in optional helpers and host adapters.

## Rollback Or Recovery
- MakerCompass keeps its existing Prompt Lab route until the package integration is validated.
- PromptLab package starts in a fixture app before touching MakerCompass.
- If npm publishing exposes package-boundary issues, continue dogfooding through a local tarball or git dependency.
- If the modal design proves too cramped, increase viewport coverage rather than reintroducing a separate full-page surface.

## Open Decisions
- Confirm npm package name availability: `promptlab` preferred, `@promptlab/cli` fallback.
- Choose license.
- Decide whether the init command should offer an opt-in direct edit mode for Next/Vite.
- Decide whether to ship MCP/agent sync in v1 or leave it for v2.
- Decide whether docs live in the package repo or a separate docs site repo.

## Critique

### Software Architect
- The correct abstraction boundary is "artifact experiments over host-provided context", not "document generation." PromptLab should not own a business-document pipeline.
- A separate repo is the right forcing function. If the core cannot run in a fixture app, it is not generic enough for npm.
- Avoid hardcoded artifact enums and database schemas. Public PromptLab should validate artifact IDs from config and persist local JSON records generically.

### Product Manager
- The sharp v1 promise is: "Add a local prompt/artifact workbench to your AI app in one command, then let your coding agent wire the adapters."
- Solo builders care about first success more than enterprise flexibility. Make the first run obvious with fake/sample adapters and a generated agent handoff.
- A single large modal sheet is the right primary surface. It keeps PromptLab accessible from anywhere without creating another route users must remember.

### Customer Or End User
- Users should understand every context item that enters a prompt. Context chips with labels and provenance are more trustworthy than hidden automatic file scanning.
- Losing local draft history is acceptable if users know it is local-only and can commit/export it if they care.
- Image artifacts need to feel first-class in the viewer, even if the generation call is host-provided.

### Engineering Implementer
- Build package-shaped in a separate repo first, then integrate MakerCompass as a consumer.
- Keep v1 implementation narrow: React modal, local JSON, host context sources, host runner adapters, markdown/JSON/image preview.
- The existing MakerCompass page is too app-specific to extract directly. Use it as reference material, not as the package source.

### Risk, Security, Or Operations
- Do not read arbitrary repo files in v1. Host apps must explicitly expose context sources.
- No install scripts that run surprising code. `promptlab init` should write visible files and explain what changed.
- The package tarball must exclude MakerCompass code, private env names, generated run history, and local test artifacts.
