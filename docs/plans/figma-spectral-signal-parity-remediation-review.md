# Review: Figma Spectral Signal Render-Parity Remediation

## Outcome

Implemented and verified the `/dev/spectral-signal` remediation. The live route and capture path now share one deterministic multipass renderer. The authored origin frame is calibrated to the exact Figma composite; subsequent frames modulate that calibrated emission with the live ring/lens/bloom pipeline rather than retaining a fixed additive copy of frame zero.

The private Figma shader source remains unavailable, and Figma's timeline exporter omits its custom shader effects. Therefore only the origin composite can be proven against Figma pixels. Moving phases are an equivalent reconstruction using the exact assets, geometry, effect order/parameters available from Figma, and authored nonuniform rotation timestamps.

## Implemented Scope

- Exact authored nonuniform motion timestamps with four-second periodic sampling.
- Original RGBA ring assets, local middle/inner lens passes, root lens pass, reduced-resolution bloom, and final reference-calibrated emission modulation.
- WebGL2 plus half-float color-buffer capability gate; unsupported devices remain on the exact static Figma fallback.
- Context-loss generation guard, centralized GPU disposal, visibility-aware animation, and reduced-motion fallback.
- Development-only fixed-time capture query/event with canvas-native PNG output.
- Repeatable 240-frame capture tool with no-overwrite writes, preflighted ffmpeg, provenance manifest, lossless WebM, color-faithful 4:4:4 MP4, and broadly compatible padded BT.709 4:2:0 MP4.

## Review Findings And Remediation

1. **P1 — additive reference anchoring ghosted frame zero during motion.** Replaced additive residual blending with a background-subtracted procedural-emission ratio and nonlinear transfer. There is no fixed reference-emission floor: departed highlights return toward the stage background while new positions brighten, and the loop origin remains exact.
2. **P1 — hardware-browser parity was not proven by SwiftShader capture.** Added capture-mode canvas PNG exposure and saved real-Chrome hardware frames at `t=0` and `t=1.25`. Hardware versus SwiftShader is exact at `t=0`; `t=1.25` MAE is `4.70433 / 65535` (`0.0000717835` normalized).
3. **P2 — WebGL1 could expose unsupported half-float targets.** Removed WebGL1 initialization and require WebGL2 `EXT_color_buffer_float` before renderer creation.
4. **P2 — context loss could race asynchronous texture setup.** Added a context-loss generation flag; a renderer finishing after loss is immediately disposed and never made visible.
5. **P2 — capture browser test could silently pass on fallback.** It now reports an explicit skip when the default Playwright project lacks the required extension; when WebGL is available it asserts 680×711, stopped time, changed pixels across timestamps, identical repeated seeks, and no clock drift.
6. **P2 — odd-size 4:4:4 MP4 was mislabeled compatible.** Kept it as the color-faithful MP4 and added a separate 680×712 `yuv420p` High-profile BT.709 derivative with one background row for broad playback.
7. **P2 — capture could overwrite files appearing after its initial check.** PNG writes use exclusive creation and ffmpeg uses `-n`; ffmpeg availability is checked before any frames are written.
8. **P3 — evidence lacked provenance.** Every capture now emits `capture-manifest.json` with URL, renderer, viewport, timing, and artifact descriptions.

## Verification

- `npm test`: 760 passed.
- `npm run typecheck`: passed.
- Targeted ESLint and `git diff --check`: passed.
- Focused unit tests: 7 passed.
- Focused Playwright: viewport/fallback and reduced-motion checks passed; deterministic canvas assertions explicitly skip in the default project when its half-float extension is unavailable. The dedicated capture runner hard-fails unless WebGL initializes.
- Final capture: 240 PNGs at 680×711, timestamps `n / 60` for `n=0...239`.
- Lossless WebM: 680×711, 60 fps, 240 frames, 4.000 seconds.
- Color-faithful MP4: 680×711, 60 fps, 240 frames, 4.000 seconds, H.264 4:4:4.
- Compatible MP4: 680×712, 60 fps, 240 frames, 4.000 seconds, H.264 High `yuv420p`, BT.709 tags; the added bottom row is `#3b3b3b`.
- Figma reference versus final frame 0: MAE `0` (pixel-identical).
- Real Chrome hardware versus SwiftShader frame 0: MAE `0`.
- Real Chrome hardware versus SwiftShader at 1.25 seconds: normalized MAE `0.0000717835`.

## Security Review

No authentication, API, persistence, billing, analytics, or user-data boundary changed. Capture hooks exist only on the already development-gated route. The capture script performs local browser/file/ffmpeg work, refuses a non-empty output directory, uses exclusive frame writes, and passes no application secrets to output or logs.

## Evidence

- `ui-evidence/2026-08-14/figma-spectral-signal-parity/final-render-v6/frame-0000.png`
- `ui-evidence/2026-08-14/figma-spectral-signal-parity/hardware-v6-t0.png`
- `ui-evidence/2026-08-14/figma-spectral-signal-parity/hardware-v6-t1.25.png`
- `ui-evidence/2026-08-14/figma-spectral-signal-parity/final-render-v6/spectral-signal-lossless.webm`
- `ui-evidence/2026-08-14/figma-spectral-signal-parity/final-render-v6/spectral-signal-color-faithful.mp4`
- `ui-evidence/2026-08-14/figma-spectral-signal-parity/final-render-v6/spectral-signal-compatible.mp4`
- `ui-evidence/2026-08-14/figma-spectral-signal-parity/final-render-v6/capture-manifest.json`
