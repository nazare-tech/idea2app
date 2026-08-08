# Maker Compass Brand Foundation — proposed 2026-07-30

Status: **candidate, not promoted.** `brand/brand.md` remains canonical.

## What this proposes

`brand/brand.md` currently ends at strategy: positioning, audience, voice, messaging pillars,
and a prose description of the visual direction. It has no identity system, so anyone building
a surface has to re-derive the mark, the lockup measurements, and the token names from
`DESIGN.md` by hand.

This candidate is that file with **one section added** and **two lines changed**. Everything
else is byte-identical, so the diff is small enough to review in one pass.

- **Added:** an `## Identity System` section (below), covering the symbol, wordmark, lockup
  measurements, and where the generated assets and tokens live.
- **Changed:** the `Source detail` line now also points at the generated kit.
- **Changed:** the `Visual Direction` block gains a pointer to the identity section instead of
  restating colours in prose.

No strategy, positioning, audience, voice, pillar, or CTA content is altered. The full portable
spec, with colour tables, type hierarchy, imagery rules, and reference brands, lives at
`brand/generated/2026-07-30-maker-compass/brand.md` and is not proposed for promotion; it is
the kit's self-contained form.

## Why it was not promoted automatically

The repository designates `brand/brand.md` as the owner of the brand foundation and it holds
real, non-placeholder decisions. Overwriting it without review is exactly the failure that the
`candidates/` directory exists to prevent. Promote with:

```bash
# review first
diff -u brand/brand.md brand/candidates/2026-07-30-maker-compass.md
```

Then hand-apply the added section, or replace the file if the whole candidate reads correctly.

---

## Section to add

## Identity System

### Symbol — the bearing wedge

- Form: a single solid wedge, a compass needle rotated 32 degrees off vertical, with a notch cut
  into the tail. A bearing, not a compass rose. No circle, no cardinal points, no ornament.
- Rationale: the off-axis rotation reads as a direction already chosen rather than a centred
  needle still deciding. That is the product's argument in one shape.
- Small sizes: the notch reads from 64px up. At 32px and below, exports use a simplified solid
  silhouette at identical outline and optical weight. The switch is automatic in the build script.
- Geometry is authored, not traced. Exact coordinates on a 1024 grid live in
  `brand/generated/2026-07-30-maker-compass/logo/symbol/geometry.json`.

### Wordmark

- `MakerCompass`, set solid as one word in Hanken Grotesk, tracking `-0.045em`.
- Ownable detail is structural: **`Maker` at weight 800 against `Compass` at weight 500.** The
  weight break carries direction-then-subject hierarchy and survives being flattened to a single
  colour, which a two-tone wordmark would not.
- Glyphs are converted to real outlines, so the SVG carries no font dependency.

### Lockups

Cap height is the unit of measure, not the wordmark bounding box.

- Horizontal: symbol at 1.3 cap, gap 0.5 cap, symbol optically centred on the cap band.
- Stacked: symbol at 1.9 cap, gap 0.45 cap, wordmark centred beneath.
- Clear space: one cap height on all four sides.
- Minimum sizes: wordmark 90px wide, symbol 16px, horizontal lockup 140px. Below 140px, use the
  symbol alone.

### Colour variants

Four per asset: `red` (Action Red on light), `black` (Workshop Black on light), `cream` (on dark),
`white` (on photography and on Action Red fills).

### Where the assets live

- Logo, icons, images, fonts, tokens, and AI prompts:
  `brand/generated/2026-07-30-maker-compass/`
- The 15-page brand book: `brand/generated/2026-07-30-maker-compass/brand-guidelines.pdf`
- Design tokens are **generated** from `DESIGN.json` and the `DESIGN.md` front matter by
  `build-tokens.py`. Do not hand-edit `tokens.css`, `tokens.json`, or the Tailwind snippet;
  re-run the script after any design-system change so the kit cannot drift from the product.
- Colour values, type hierarchy, imagery rules, touchpoint specs, and reference brands:
  `brand/generated/2026-07-30-maker-compass/brand.md`

### Icon system

12 UI icons ship as standalone SVGs in the generated kit. 24x24 viewBox, 1.5px stroke,
`currentColor`, butt caps and miter joins, geometry on a 2px grid. Icons never carry Action Red.
Ten are conventional (`arrow-right`, `check`, `close`, `plus`, `menu`, `search`, `user`,
`settings`, `bell`, `info`); two are brand-specific: `scope` and `build-map`.

### Not yet produced

- Pantone match for Action Red, required before any print run
