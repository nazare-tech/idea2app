# Review: OpenRouter Image Mockups Default

## Scope
- Replaced default mockup generation with OpenRouter-hosted image generation.
- Added private Supabase Storage persistence and an authenticated image proxy.
- Updated renderer support for `{ type: "openrouter-image" }`.
- Removed mockup credit consumption and stale user-facing Generate All start/credit copy.
- Kept legacy Stitch files and `/api/stitch/html` for existing saved Stitch mockups.

## Verification
- `node --import tsx --test src/lib/openrouter-image-mockup-pipeline.test.ts`
- `npm test`
- `npx tsc --noEmit`
- `npm run lint` — passes with pre-existing warnings in legacy workspace files.
- `npm run build`
- Playwright visual screenshot of the new renderer format: `output/playwright/openrouter-mockup-renderer.png`

## Code Review Findings
- Fixed: manual `/api/mockups/generate` and server-side `generateProjectDocument()` now use the same OpenRouter image pipeline, avoiding provider drift between direct generation and onboarding/server queue generation.
- Fixed: route no longer consumes/refunds credits for mockups; shared token economics now treat mockups as project-bundled with cost `0`.
- Fixed: renderer now detects `openrouter-image` before JSON-render/legacy parsing, so image mockup JSON is not misrendered as markdown.
- Fixed: stale Generate All idle/start and credit display copy was removed from the reusable status block while status/retry behavior remains.

## Security Review Findings
- Fixed: storage objects are private and served through `/api/mockups/image`, which authenticates, rate limits, checks project ownership, and verifies the requested storage path exists in saved mockup content before streaming the image.
- Fixed: OpenRouter image generation uses `OPENROUTER_API_KEY` through OpenRouter only. No direct OpenAI API key or Images API fallback was introduced.
- Fixed: request validation now enforces string fields and input length limits before invoking the provider.
- Fixed: decoded image data URLs are restricted to PNG/JPEG/WebP and capped at the same 10 MB limit as the storage bucket.
- Residual risk: if image upload succeeds but the later database insert fails, the generated storage objects can become orphaned. This is operational cleanup risk, not a cross-user data exposure risk. A future cleanup job or insert-before-upload design could address it.

## Remediation Checklist
- [x] Add request type/size validation to `/api/mockups/generate`.
- [x] Add image MIME and size validation before Supabase Storage upload.
- [x] Verify no direct OpenAI API fallback exists in the mockup path.
- [x] Verify private image proxy checks ownership against saved `mockups.content`.
