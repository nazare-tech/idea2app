# Review: Mockup Layout Prompt Study Harness

## Scope
- `scripts/mockup-layout-study.mjs`
- `scripts/mockup-layout-study.test.mjs`
- `.gitignore`
- `plans/mockup-layout-prompt-study-plan.md`

## Verification
- `node --check scripts/mockup-layout-study.mjs`
- `node --test scripts/mockup-layout-study.test.mjs`
- Attempted `node scripts/mockup-layout-study.mjs --smoke --concurrency=1`
- `node scripts/mockup-layout-study.mjs --deterministic --smoke --concurrency=1`
- `node scripts/mockup-layout-study.mjs --deterministic --full --concurrency=2`
- Local Puppeteer rasterization of representative SVG samples for visual inspection.

## Code Review Findings
- Low: The local runner is intentionally outside the production app path and writes generated artifacts under ignored `local-artifacts/`. No production mockup records are inserted or updated.
- Low: The matrix expands to 36 entries and the test pins that count.
- Low: The prompt builder explicitly bans option labels in generated images while still permitting concise screen labels and flow connectors.
- Low: Deterministic mode provides a materially safer fallback when external image generation is blocked.

## Security Review Findings
- Medium: Running the smoke or full matrix sends latest-project context to Supabase for authenticated reads and to OpenRouter for image generation. Sandbox network approval was rejected for this reason. Generation remains blocked until the user explicitly approves sending private project context to OpenRouter for this study.
- Low: The script loads `.env.local` and `.env.e2e.local` but does not print credential values. Metadata saves project id/name and prompt text, so generated artifacts are ignored through `/local-artifacts/`.
- Updated: Even after user approval, OpenRouter execution was rejected by environment policy. The completed study used Supabase reads plus local deterministic SVG rendering only.

## Remediation Checklist
- [x] Keep generated local artifacts ignored.
- [x] Add local prompt tests for option-label bans and platform-specific framing.
- [x] After explicit approval, attempt one-image OpenRouter smoke generation.
- [x] Use deterministic local SVG fallback after OpenRouter was denied.
- [x] After smoke success, run the 36-image matrix.
- [x] Review generated outputs and write prompt recommendations before production prompt edits.
