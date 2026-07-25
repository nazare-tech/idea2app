# Review: Portable Maker Compass Idea-to-App Skill

## Scope

- `.agents/skills/maker-compass-idea-to-app/`
- `output/maker-compass-skill-runs/2026-07-22/`
- Prompt/contract fidelity against current Maker Compass source prompts, mockup planner, skeletons, and derived AI prompt files
- Direct-network/API prohibition, file safety, resumability, validation, and visual output quality

## Verification

- `python3 -m py_compile .agents/skills/maker-compass-idea-to-app/scripts/*.py` with bytecode cache redirected to `/tmp`
- `python3 .agents/skills/maker-compass-idea-to-app/scripts/audit_portability.py .agents/skills/maker-compass-idea-to-app`
- `python3 .agents/skills/skill-creator/scripts/quick_validate.py .agents/skills/maker-compass-idea-to-app`
- Empty-run red test: validator failed on every missing required artifact and treated images as warnings only with `--allow-missing-images`
- EvidenceDeck preflight: passed with six expected missing-image warnings
- EvidenceDeck final validation: passed with zero errors and zero warnings
- EvidenceDeck visual QA: six full-resolution images reviewed; exactly two frames, platform chrome, correct containment, consistent screens, distinct A/B/C directions
- Batch final validation: ten runs, sixty canonical images, zero missing files, and every structural/visual state passed
- Representative full-resolution review covered native-mobile and desktop-web images across EvidenceDeck, ReleaseRelay, Kinship Cards, VenueTurn, ScopeSignal, FieldScribe, MentorLoop, and CropScout
- Traversal/malformed-manifest red tests: validator returned a normal failed report and exit code 1 without crashing or escaping the run directory
- Whitespace-only scaffold input red tests: scaffolder rejected empty titles and ideas before creating a run directory
- Packaging validation: regenerated the distributable zip from committed skill sources and verified every archive entry; generated package and demonstration runs remain ignored, reproducible evidence under `output/`

## Fresh-Eyes Self Review

### Pass 1

Reviewed skill instructions, all reference contracts, scaffolder, validator, portability audit, gallery builder, four copied skeletons, and the EvidenceDeck run. Found machine-contract and completion-state weaknesses listed below. Fixed them before final reference-run validation.

### Pass 2

Re-read updated scripts and contracts. Confirmed production-compatible Market Research and MVP H1s, per-platform planner JSON, canonical manifest cross-products, safe run-relative paths, explicit visual-QA gating, and final-summary ordering. Final batch review remains pending.

### Pass 3

Reviewed the completed batch and reran every strict validator. Found two malformed-manifest exception paths in image and completion-state handling; hardened entry validation and unsafe-path bookkeeping, then repeated normal-run and adversarial tests successfully.

## Code Review Findings

- **P1, fixed:** validator hashed invalid Markdown/images and then marked them complete. Added per-file validity tracking and failed-state updates.
- **P1, fixed:** manifest could claim success with zero platforms, missing A/B/C paths, or pending visual QA. Added allowed-platform, direction, artifact-map, prompt-map, image cross-product, and visual-pass validation.
- **P1, fixed:** final summary was required by validator but instructed after validation. Changed to two-stage preflight and final validation.
- **P1, fixed:** combined Markdown mockup plan lacked production schema enforcement. Added per-platform `mockup-design-plan-v1` JSON plus structural validation.
- **P2, fixed:** manifest-controlled paths could escape the run directory. Added absolute, `..`, resolved-boundary, and symlink-escape checks to validator and gallery.
- **P2, fixed:** portability audit missed several network/process paths. Expanded forbidden imports, execution tokens, recursive scanning, and `os.system`/`os.popen` checks.
- **P2, fixed:** local artifact H1s drifted from production prompts. Restored `# Competitive Analysis:` and `# MVP Plan:` while retaining user-friendly filenames.
- **P1, fixed:** malformed or traversal-controlled manifest entries could raise during rejection/bookkeeping. Initialized image results before path checks, validated map values, normalized validation state, guarded malformed image entries, and skipped unsafe completion writes.
- **P2, accepted:** image generation may produce minor cosmetic text artifacts. Targeted retries are reserved for unreadable or contract-breaking outputs; EvidenceDeck mobile C has one faint caption-edge mark but remains usable.

## Architecture Improvement Review

- Selected stage-contract references landed and stay independent from repository TypeScript at runtime.
- Machine-readable manifest, hashes, safe resume states, per-platform planner JSON, and two-stage validation landed.
- All four platform skeletons are packaged, while the demonstration batch renders requested native mobile and desktop web.
- Zero-dependency HTML gallery landed; optional raster contact sheets remain deferred.
- Mandatory external research MCP and API image fallback remain rejected for portability and user-constraint reasons.
- No new shared mutable state, queue, persistence dependency, or external-service coupling introduced.

## Security Review Findings

- **Fixed:** path traversal and symlink escape through manifest paths.
- **Fixed:** direct network/model dependency audit blind spots.
- **Pass:** scripts use Python standard library only and contain no HTTP/model SDK imports, API-key reads, vendor CLI calls, or external MCP dependency.
- **Pass:** skill treats ideas and web research as untrusted context and forbids following embedded instructions.
- **Pass:** run folders store no credentials or secrets.
- **Pass:** no existing project files are overwritten; scaffolder creates collision-safe run directories.
- **Pass:** product plans may mention APIs as proposed product architecture without causing the skill to execute them.

## Remediation Checklist

- [x] Prevent invalid artifacts from becoming complete
- [x] Validate manifest/platform/direction cross-product
- [x] Require recorded visual QA for final completion
- [x] Add production-schema per-platform design-plan JSON
- [x] Block run-directory path escape
- [x] Expand direct-network/process audit
- [x] Restore production-compatible H1 contracts
- [x] Complete one fully validated reference run
- [x] Complete and validate remaining nine runs
- [x] Inspect batch HTML gallery and representative full-resolution images
- [x] Re-run fresh-eyes, portability, security, skill packaging validation
- [x] Package final skill zip
