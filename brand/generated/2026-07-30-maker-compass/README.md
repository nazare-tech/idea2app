# Maker Compass — brand kit

Generated 2026-07-30 by the `build-a-brand` skill, in-repo. Quick pass first, then the full
15-page brand book and the UI icon set.

This is the identity layer on top of the strategy that already lived in `brand/brand.md`.
Positioning, audience, voice, and messaging were carried forward unchanged; what is new here
is the mark, the wordmark and lockups, the exported tokens, and the AI prompt set.

## What's in here

```
brand-guidelines.pdf  the full 15-page brand book
quick-brand.pdf       4-page short form, for handoffs that do not need the full argument
brand.md              the portable spec. Paste into any AI tool with a task.
logo/                 symbol (SVG + 8 PNG sizes x 4 colours), wordmark, horizontal + stacked lockups
icons/                12 UI icons as standalone SVGs, currentColor
images/               10 photographs; 3 have brand assets perspective-composited on
fonts/                Hanken Grotesk variable + Fira Mono, OFL licensed
tokens/               tokens.css, tokens.json, tailwind.config.snippet.js
prompts/              system-prompt.md + 5 task starters
qa/                   page previews, contact sheet, and small-size logo checks used to sign this off
render/               intermediate page HTML, slot JPEGs, per-page PDFs
build-*.py            regeneration scripts. Every asset above is reproducible.
```

## Why 15 pages

Digital product, so the Icons page is in. Photography-only imagery, so Imagery Rules stays a
single page. That lands on 15 rather than 14 or 16.

## How to use it

**With an AI tool.** Paste `prompts/system-prompt.md` at the top of a Claude or GPT thread,
then your task. For imagery, paste `prompts/photography.md` instead. For a specific job, the
task starters (`tweet.md`, `landing-hero.md`, `email.md`, `error-message.md`) are pre-loaded
with on-voice and off-voice examples.

**With a developer.** Hand over `tokens/` and `logo/`. `tokens.css` drops into `:root`;
the Tailwind snippet pastes inside `theme.extend`. Note that all three token files are
*generated* from `DESIGN.json` and the `DESIGN.md` front matter, so do not hand-edit them.
Re-run `python3 build-tokens.py` after any design-system change.

**With a designer.** Hand over `brand.md` and `brand-guidelines.pdf`. The measurements in
`brand.md` are the spec; the book is the argument for them. `quick-brand.pdf` is the short
form when the full argument is not needed.

## Which logo file

| Context | File |
|---|---|
| Favicon | `logo/symbol/symbol-red-32.png` and `-16.png` (simplified silhouette) |
| App icon / social avatar | `logo/symbol/symbol-white-256.png` on an Action Red ground |
| Web header | `logo/lockup/horizontal/lockup-h-black.svg`, 140px minimum width |
| Dark background | any `-cream` variant |
| Over photography | any `-white` variant, placed on a dark quiet region |
| Print | `logo/lockup/stacked/lockup-s-black.svg`; match Action Red physically first |

The symbol's exports switch silhouette automatically: notched tail at 64px and up, simplified
solid below. Do not scale a large PNG down to make a favicon; use the 16 and 32 exports.

## Fonts

Both families are OFL licensed, which permits redistribution and embedding.

- Hanken Grotesk — https://fonts.google.com/specimen/Hanken+Grotesk (`HankenGrotesk[wght].ttf`
  is variable and covers every weight the system uses)
- Fira Mono — https://fonts.google.com/specimen/Fira+Mono (Regular / Medium / Bold)

Install the TTFs locally, or load from Google Fonts in web contexts. Any font stack must carry
Noto fallbacks so a non-Latin string never renders as tofu; the stacks in `tokens.css` already do.

## Regenerating

```bash
python3 build-symbol.py      # symbol SVG masters + PNG exports from authored geometry
python3 build-wordmark.py    # outlines the wordmark, assembles lockups (needs Chrome)
python3 build-icons.py       # the 12 UI icon SVGs
python3 build-tokens.py      # re-derives tokens from DESIGN.json + DESIGN.md
python3 build-composites.py  # warps logo/UI artwork onto the blank touchpoint photos
python3 build-pdf.py         # 4-page quick-brand.pdf
python3 build-book.py        # 15-page brand-guidelines.pdf
```

Run them in that order; later scripts read what earlier ones write. Needs Chrome for
rasterisation, plus numpy and Pillow for the compositing step.

## A note on the touchpoint photos

The phone, sticker, and tote were generated deliberately **blank**. Image models bake in garbled
pseudo-text and wrong-weight letterforms the moment a prompt mentions a logo, so the real artwork
is perspective-mapped on afterwards by `build-composites.py`. The mark stays correctly typeset,
the screen copy stays editable, and every shot can be regenerated when the wordmark or palette
changes. Source photos are kept alongside the composited versions.

## Not included

- Pantone matching for Action Red. Get it matched physically before any print run.
- A `prompts/illustration.md`, because the brand has no illustration medium.

## Canonical source

`brand/brand.md` at the repo root stays the canonical foundation. A proposed superset that folds
in the identity decisions above is parked at `brand/candidates/2026-07-30-maker-compass.md`
and has not been promoted.
