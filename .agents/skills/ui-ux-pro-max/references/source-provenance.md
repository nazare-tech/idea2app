# Source provenance

- Upstream: `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
- Release: `v2.14.1` (2026-08-06)
- Commit: `abb7f2fd5a083fa1ff55c326a963ff0d95c33f99`
- Source path: `src/ui-ux-pro-max`
- Upstream pre-license bundle SHA-256: `842522bdacd1960b3d7eb5c5f34d524261b0aba59eb9afec70cb1749d464164f`
- License: MIT; local copy in `../LICENSE`

The local `scripts/design_system.py` copy removes upstream trailing whitespace so the repository passes `git diff --check`; executable behavior is unchanged. Its checked local hash is recorded below.

This is a pinned repository snapshot. The license gate checked the upstream repository's MIT declaration; no separate catalog-data exception was found in this version. It did not obtain a separate representation from the copyright holder.

Runtime product code does not invoke the bundled Python scripts or access the network. The author-time refresh command runs the skill's required `search.py <product query> --design-system --json` workflow for every pinned product and freezes the raw results in `vendor/ui-ux-pro-max/product-design-systems.json`. Normal generation and CI consume that fixture only:

```sh
node scripts/generate-pro-max-style-catalog.mjs --refresh-fixtures
node scripts/generate-pro-max-style-catalog.mjs --check
```

Pinned input SHA-256 values:

- `styles.csv`: `1bf9c1d8484a0a7a54fb67555902380446865b604c8449e47a449cb3d9c1ef88`
- `colors.csv`: `cb26759805217edaaa31b09836aec09eab0fe245c58f5884e9a16ef802c6e26a`
- `typography.csv`: `7abead73de0e43e09544f164cb60cd431674e411f1e063e555a8b44d51273328`
- `products.csv`: `e9749e4fd8f7d4c94919c25ebd347a4adaddb671e7b01d33fbc2c87d447e6667`
- `ui-reasoning.csv`: `06e4369445388ba9b7a57347510b125b7a2145bbf8546a327ba50292503b204a`
- `search.py`: `69a349d69543f35f45a12c0c82922c550d1b0a16a2b37f6b1406afb2ad2919c8`
- `core.py`: `64c149019196ee24647464a27278eb96d3b4638ded73ebfc35ccd2bc99c083a9`
- `design_system.py`: `64b14f27f55e19358214cd92388f6aae01e46a13d51fe270ddc0d2dac8298d8f`
- frozen design systems: `2dee4cdf117b8983c4adac495157cdb57de8235f42c0ecd62fe2b7a325e26576`

Only reviewed identifiers, semantic colors, typography pairs, pattern names, and short decision-rule tokens enter the compact TypeScript runtime catalog. Raw upstream prose remains outside the runtime bundle.
