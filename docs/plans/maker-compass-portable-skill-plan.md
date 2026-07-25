---
implemented: true
implemented_at: 2026-07-22T16:49:59Z
implementation_summary: Built and packaged a portable, API-free Codex skill; completed ten validated idea bundles with 60 canonical iOS and desktop-web mockups plus a batch gallery.
---

# Plan: Portable Maker Compass Idea-to-App Skill

## Goal

Create a distributable Codex skill that turns one product idea into a new self-contained folder of Maker Compass-style planning documents, derived AI build prompts, two-platform mockup plans, and six high-fidelity storyboard images. Run the skill ten times for five $10k+ MRR-inspired derivative concepts and five original concepts without calling OpenRouter or any direct model/image API.

## Assumptions

- “Everything Maker Compass does” means the current user-visible artifact chain: structured intake, Market Research, Product Plan, First Version Plan, derived AI Prompt files, and Design Mockups.
- Deprecated Prompt Chat, Project Composer, Launch Plan, legacy json-render wireframes, billing, persistence, and application orchestration are product infrastructure, not portable skill outputs.
- Codex’s built-in reasoning, web browsing, filesystem tools, and built-in image generation are allowed; direct HTTP model calls, SDK calls, OpenRouter, and API-key-dependent image CLIs are forbidden.
- Every batch idea receives three native iOS storyboard directions and three desktop-web storyboard directions. Each image preserves the supplied two-frame skeleton.
- TrustMRR values are time-sensitive evidence snapshots, not profit claims or guarantees that derivative concepts will perform similarly.

## Clarifying Questions

1. How faithfully should the skill reproduce Maker Compass?
   - Recommendation A: Preserve current artifact contracts and decision logic, adapted to local Markdown/image files.
   - Trade-off: Portable and maintainable; omits app-only queues, billing, database rows, and deprecated artifacts.
   - Recommendation B: Copy every prompt and historical artifact, including retired and internal-only flows.
   - Trade-off: More literal but noisy, contradictory, and coupled to Maker Compass infrastructure.
   - Selected: Recommendation A, because the user asked for the end result users see.
2. How should image generation work?
   - Recommendation A: Require Codex built-in image generation and package all four current storyboard skeletons as references.
   - Trade-off: No API key or SDK; requires a Codex setup exposing the built-in image tool.
   - Recommendation B: Generate image prompt files only and let users render elsewhere.
   - Trade-off: More portable but fails the requested end-to-end mockup outcome.
   - Selected: Recommendation A.
3. How detailed should ten demonstration runs be?
   - Recommendation A: Produce compact, decision-complete artifacts with full contracts and six final images per idea.
   - Trade-off: Keeps the batch reviewable while preserving downstream usefulness.
   - Recommendation B: Produce maximum-length production prompts for every document.
   - Trade-off: Much slower and harder to audit; image review becomes buried.
   - Selected: Recommendation A.

## Recommended First Step

Build and validate one portable skill draft plus one complete reference run before expanding to the remaining nine ideas; package only after reference-run refinements.

## Runtime and Change-Impact Analysis

### Repeated Work

- One skill run performs local folder scaffolding, five document-generation passes, derived prompt-file extraction, two mockup-planning passes, and six built-in image generations.
- Expected frequency: one run per idea; batch demonstration runs ten ideas. Worst case: 60 image calls plus targeted retries for failed visual verification.
- Work per run: local Markdown writes, local validation, optional built-in web research, six image generations, and image-file copying.

### Ownership, Scope, And Lifetime

- Each run owns one timestamped or explicitly named output directory. No shared mutable state between runs.
- Skill package owns immutable prompt/reference contracts, deterministic scaffolding/validation scripts, and skeleton assets.
- Failed runs retain completed files plus machine-readable `manifest.json`, allowing resume without regenerating successful images.

### Boundary And Cache Semantics

- Contracts exist between stage outputs: intake feeds research; research feeds Product Plan; Product Plan feeds First Version Plan; plans feed AI Prompt files and mockup plans.
- File names and required headings are the compatibility boundary. Validation checks presence, non-empty content, platform/direction coverage, and forbidden external-provider instructions.
- No cache. Existing output directories are never overwritten; new sibling run directories preserve recovery.

### Failure And Recovery

- Partial image failure affects one option only. Resume from the missing file listed in `manifest.json`.
- Duplicate invocation creates another uniquely named folder unless an explicit empty destination is supplied.
- Built-in image tool absence stops image production but preserves Markdown plans and final image prompts; direct API fallback remains forbidden.
- Blast radius is one output folder. Rollback removes the newly created skill/batch folders only after explicit approval.

### Risk-Matched Verification

| Risk | Observable evidence or test | Acceptance threshold |
|---|---|---|
| External API leakage | Recursive search of skill and run instructions | No OpenRouter/SDK/direct API execution path; explicit prohibition present |
| Missing artifacts | Deterministic validator | Every run has all required Markdown files and six named images |
| Contract drift | Heading/file-name validator plus manual review | Required current pipeline sections present in correct stage order |
| Image/skeleton mismatch | Pixel/aspect inspection plus visual review | Two fixed frames retained; mobile near 4:3, desktop near 21:9; no extra frames |
| Repetitive directions | Direction-plan review | A/B/C differ in layout strategy, navigation, density, and visual tone while sharing the same two screens |
| Unsupported revenue claims | Source links and evidence caveats | Five validated inspirations cite public TrustMRR pages and distinguish MRR from profit |

## Architecture Improvement Opportunities

- Stage contract references: centralize each artifact’s required shape in `references/`; selected. Benefit: portable prompt/parser alignment. Trade-off: more skill files.
- Idempotent per-run manifests: list expected/completed artifacts and resume rules; selected. Benefit: recoverable 60-image batch. Trade-off: small bookkeeping overhead.
- Deterministic zero-dependency scaffolder/validator: selected. Benefit: repeatability across Codex setups. Trade-off: validator checks structure, not semantic quality.
- Direct extraction of production TypeScript prompt constants at runtime: rejected. It would couple the packaged skill to this repository and break portability.
- External research MCP integration: deferred. Built-in web search is sufficient; mandatory MCP would violate portability.
- Automated API fallback for images: rejected. Conflicts with explicit user constraint.
- Four-platform skeleton bundle: selected. The ten-run batch renders requested native mobile and desktop web only, while the reusable package retains mobile web and native desktop support.
- Zero-dependency HTML gallery: selected. A PNG contact sheet remains optional because portable Pillow/ImageMagick availability cannot be assumed.

## Plan

1. Finish prompt/pipeline inventory; document active vs internal/deprecated surfaces.
2. Initialize the skill with the repository’s skill creator, then add compact stage contracts, output schema, safety policy, four skeleton assets, and deterministic scripts.
3. Validate the initial skill structure and portability audit.
4. Execute one full idea run, generate six images, inspect output, and adjust the skill.
5. Execute nine remaining runs in disjoint folders, including five cited $10k+ MRR-inspired derivatives and five original ideas.
6. Validate all ten folders, inspect the HTML gallery/full-resolution samples, run code/security/portability reviews, remediate, package the final refined skill, and finalize plan/review artifacts.

## Milestones

- Portable skill: valid `SKILL.md`, references, assets, scripts, and packaged zip.
- Reference run: one complete, validated idea folder with six visual directions.
- Batch: ten validated folders, 60 final images.
- Review: structural validation, visual evidence, security/API audit, and completed remediation notes.

## Validation

- Run skill quick validation and packaging validation.
- Run the scaffolder and validator against an empty temporary test run.
- Search for API clients, OpenRouter execution, keys, and direct HTTP generation instructions.
- Validate ten output manifests and image dimensions.
- Create a zero-dependency HTML gallery for all 60 images and visually inspect representative full-resolution images from mobile and desktop outputs.

## Risks And Mitigations

- Image generation volume may be slow: persist each output immediately and resume per manifest.
- Generated UI text may contain small artifacts: keep copy short, validate major labels, retry only unusable results.
- Revenue snapshots may change: include collection date and caveats.
- Prompt duplication may drift from the app: preserve stage contracts and source provenance instead of copying infrastructure-specific prose blindly.
- Package size may grow from skeleton assets: retain all four supported platform skeletons so custom `--platforms` runs remain self-contained; default runs still render only native mobile and desktop web.

## Rollback Or Recovery

- Changes are additive: one new skill directory and one plan/review pair in Git, plus ignored generated batch output and a regenerable packaged zip under `output/`.
- Preserve partial batches. Resume missing deliverables from `manifest.json`.
- Do not delete or overwrite existing repository files.

## Open Decisions

- None. Repository policy selects Recommendation A and allows autonomous implementation.

## Completion Evidence

- Portable skill structure, Python syntax, skill metadata, and direct-network audit pass.
- Ten manifests pass strict validation with zero errors and zero warnings.
- Sixty canonical final images exist: three native iOS and three desktop-web directions per idea.
- Batch gallery and per-run galleries render directly from safe manifest-relative paths.
- Malformed and path-traversal manifests fail cleanly without writing outside the run directory.

## Critique

### Software Architect

- Biggest risk is copying prose without preserving inter-stage contracts. File schemas, manifests, and source-attribution references keep the skill portable and evolvable.

### Product Manager

- Six images per idea exceed Maker Compass’s single-platform default but directly satisfy the user’s comparative mobile/desktop need. Compact documents keep focus on visual exploration.

### Customer Or End User

- Users need a predictable folder they can inspect, copy, and continue building from. Clear filenames and ready-to-paste AI prompts matter more than database fidelity.

### Engineering Implementer

- Model-generated Markdown cannot be fully unit-tested. Deterministic validation should focus on required files, headings, naming, provider bans, and image properties.

### Risk, Security, Or Operations

- No secrets, environment variables, direct model APIs, or production systems should be touched. Research claims need source/date caveats; regulated ideas need safer-MVP flags.
