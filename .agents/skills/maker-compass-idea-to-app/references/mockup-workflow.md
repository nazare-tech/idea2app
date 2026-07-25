# Mockup Workflow

## Platform Assets

Resolve paths relative to the skill directory:

- `desktop-web`: `assets/desktop-web-storyboard-skeleton.png`, target ratio 2.334, accepted ratio 1.95–2.70.
- `mobile-web`: `assets/mobile-web-storyboard-skeleton.png`, target ratio 1.360, accepted ratio 1.15–1.70.
- `native-mobile-app`: `assets/native-mobile-app-storyboard-skeleton.png`, target ratio 1.360, accepted ratio 1.15–1.70.
- `native-desktop-app`: `assets/native-desktop-app-storyboard-skeleton.png`, target ratio 2.334, accepted ratio 1.95–2.70.

Batch default: render native-mobile-app and desktop-web only, three directions each.

## Direction Roles

Create product-specific strategies; avoid forcing these names when a better concept exists.

- Direction A: focused, scanable, status-and-next-action emphasis.
- Direction B: guided, progressive, decision-support emphasis.
- Direction C: spatial, editorial, visual-object, or overview emphasis.

Directions must differ in information architecture, navigation pattern, density, and visual tone while sharing the same two screens and happy-path data.

## Built-In Edit Procedure

1. Inspect the selected skeleton with Codex `view_image` before first use.
2. Read the matching platform section and direction from `mockups/design-plan.md`.
3. Write one prompt file under `mockups/image-prompts/`.
4. Call Codex built-in image generation once with `referenced_image_paths` containing only the skeleton path.
5. Copy the generated result into the exact output filename immediately.
6. Inspect the saved image with `view_image`.
7. Retry only if a contract item fails.

Never use the fallback image CLI or any API-key path.

## Prompt Template

```text
Use case: ui-mockup
Asset type: high-fidelity two-screen product storyboard
Primary request: Edit the attached <platform> storyboard skeleton in place for <product name>, Direction <letter>.
Subject: Two populated happy-path screens for <target user> completing <scenario>.
Screen 1 caption (verbatim): "1. <screen name>"
Screen 1 content: <specific UI, visible data, controls, state>
Screen 2 caption (verbatim): "2. <screen name>"
Screen 2 content: <specific UI, visible data, controls, state>
Direction strategy: <layout, navigation, density, tone, motifs>
Style/medium: polished modern software UI, legible product design, realistic populated data
Constraints: Treat attached image as edit target. Preserve exact canvas, white background, two frame positions, frame sizes, captions, shadows, alignment, and device/browser chrome. Replace only purple placeholder interiors and existing caption text. Keep all UI inside frame interiors. Keep exactly two frames.
Avoid: extra frames, arrows, rationale cards, direction labels, "Option A/B/C", marketing landing-page sections, lorem ipsum, watermarks, code, content outside frames.
```

Keep visible copy short. Favor 1–3 word labels, realistic names, a few concise metrics, clear states, and one obvious primary action per screen.

## Visual QA

Inspect every final image at high detail:

- fixed two-frame composition preserved;
- captions appear once in original caption positions;
- skeleton chrome remains visually intact;
- purple placeholders fully replaced;
- no content leaks outside interiors;
- major labels readable;
- interface matches target user and happy path;
- platform conventions feel plausible;
- direction differs materially from sibling options.

Structural validation cannot prove semantic preservation. Record visual inspection separately in `run-summary.md`.
