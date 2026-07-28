---
implemented: true
implemented_at: 2026-07-26T22:25:41Z
implementation_summary: Extracted 60 validated standalone mobile screens, built a separate static gallery, and added a hardened reproducible builder with crop-map data.
---

# Plan: Individual Mobile Screen Gallery

## Goal

Extract the two device frames from each of the 30 native-mobile storyboards into 60 standalone PNGs and present them in a separate local gallery.

## Assumptions

- “Individual mobile screen” means the complete phone frame, shadow, and bottom breathing room; storyboard title text and sibling phone are excluded.
- Existing storyboards, manifests, and `gallery.html` remain unchanged.
- Current source set contains ten runs, three native-mobile directions per run, and two screens per storyboard.

## Clarifying Questions

1. Replace the mixed gallery or create a separate page?
   - Recommendation A: Create `mobile-screens-gallery.html` and link back to the original gallery. Preserves both views.
   - Recommendation B: Replace `gallery.html`. Fewer pages, but loses desktop and paired-storyboard context.
   - Selected: Recommendation A, matching the user’s explicit allowance for a new page.
2. Use one vertical crop for all storyboards?
   - Recommendation A: Use per-storyboard caption cutoffs plus shared horizontal boxes. Removes every title without cutting early phone frames.
   - Recommendation B: Use one fixed rectangle. Simpler, but measured layouts prove it cannot satisfy both constraints.
   - Selected: Recommendation A.

## Recommended First Step

Measure device and caption bounds across all 30 mobile storyboards, then validate two representative crops before batch generation.

## Runtime and Change-Impact Analysis

### Repeated Work

- One local batch processes 30 source PNGs into 60 crops and one static HTML file.
- Expected frequency: on demand. Worst case: rerun after replacing all 30 sources.
- Work per source: two deterministic ImageMagick crops, metadata validation, and HTML-card generation.

### Ownership, Scope, And Lifetime

- Derived assets live under `mobile-screens-gallery-assets/`; source runs remain owners of canonical storyboards.
- Crop-map JSON owns per-storyboard title cutoffs. Gallery owns no mutable runtime state; staged files are promoted only after all crops pass.
- Existing outputs are never replaced silently. Reruns use a new `--out` name or require explicit approval to remove the old derived set first.

### Boundary And Cache Semantics

- Inputs: canonical run manifests, mobile design plans, and complete native-mobile image paths.
- Outputs: relative image paths only; no `file:` URLs or external assets.
- Static browser cache may retain old crops after rerun; file names remain stable because each source identity is stable.

### Failure And Recovery

- Validate the full input/crop plan before writing outputs. A failed run leaves canonical source files untouched.
- Blast radius is the derived gallery directory and HTML page only.
- Recovery: rerun from the unchanged crop map or remove derived outputs after explicit approval.

### Risk-Matched Verification

| Risk | Evidence | Acceptance threshold |
|---|---|---|
| Titles remain or phones are clipped | Full-resolution sample review and contact-page browser review | Zero visible storyboard titles; full phone frame and shadow retained |
| Wrong screen mapping | Design-plan name paired with left/right order | 60 cards; screen 1 always left, screen 2 always right |
| Missing or unsafe assets | Builder validation | 10 runs, 30 unique inputs, 60 existing relative PNG outputs |
| Broken responsive page | Real browser at desktop and narrow viewport | Two-up pairs on desktop; readable single-column flow when narrow |

## Architecture Improvement Opportunities

- Reusable builder script: selected. Benefit: reproducible crops and validation. Trade-off: local ImageMagick prerequisite. Files: `scripts/build-mobile-screen-gallery.mjs`, `scripts/README.md`.
- Add derived crops to canonical run manifests: rejected. They are presentation derivatives, not Maker Compass final mockups.
- Automatic caption detection: deferred. Current inspected cutoff map is safer for this fixed batch; detection would add brittle computer-vision complexity.

## Plan

1. Add crop-map data and a safe, self-documenting builder.
2. Generate 60 crops plus separate HTML gallery.
3. Validate counts, dimensions, relative paths, and representative pixels.
4. Inspect desktop and narrow layouts in the real browser; capture evidence.
5. Run fresh-eyes, code, and security review; remediate findings.

## Milestones

- Extraction: 60 valid standalone PNGs.
- Gallery: grouped by idea and Option A/B/C with paired screen names.
- Verification: browser screenshots plus batch integrity report.

## Validation

- Builder exits zero and reports 10 ideas, 30 storyboards, 60 screens.
- ImageMagick identifies every crop as a readable PNG.
- HTML contains exactly 60 unique relative image sources.
- Full 60-screen contact sheet saved under `ui-evidence/2026-07-26/mobile-screen-gallery/`; browser screenshots were blocked by browser security policy for new local `file://` navigation.

## Risks And Mitigations

- Layout drift between generated storyboards: use measured per-source vertical cutoffs and generous shared horizontal bounds.
- Accidental source mutation: builder reads canonical sources and writes only to a separate derived directory.
- Shell/path injection: use argument arrays, resolved-path containment checks, and validated manifest keys.

## Rollback Or Recovery

- Existing gallery and storyboards are untouched. Derived page/assets can be regenerated from source.

## Open Decisions

- None.

## Completion Evidence

- Ten ideas, thirty canonical mobile storyboards, sixty unique standalone PNGs.
- Every source SHA matches its validated run manifest; every output pixel-matches its declared crop rectangle.
- All HTML image paths are unique, relative, present, and free of external/file URLs.
- Full contact-sheet review confirms no storyboard titles, clipped devices, missing shadows, or lost bottom spacing.
- Builder tests cover successful staged publication, overwrite refusal, symlink escape, stale hashes, overlapping crops, clipped crops, and failed-run cleanup.
- Real browser navigation to the new local file was rejected by browser URL policy. No alternate-browser bypass attempted. Responsive CSS remains statically reviewed but not browser-screenshot verified.

## Critique

### Software Architect

- Crop coordinates are batch-specific presentation data; keep them outside canonical manifests and code logic.

### Product Manager

- Individual screens improve scanning and comparison; preserve pair/option grouping so flow context remains visible.

### Customer Or End User

- Gallery should open locally, load lazily, and make screen identity obvious without exposing file-system noise.

### Engineering Implementer

- Validate all inputs before writing. Keep transformation deterministic and create-once.

### Risk, Security, Or Operations

- No network, credentials, APIs, or source overwrites. Treat manifest paths as untrusted.
