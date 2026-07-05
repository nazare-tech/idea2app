# Review: New Project Onboarding Documents And Mockups

## Scope
- Added Mockups to the onboarding queue and loading/status mapping.
- Switched OpenRouter mockup image generation back to the OpenAI image-output model `openai/gpt-5.4-image-2`; there is no Gemini fallback.
- Added concurrent image option generation with explicit request timeout handling.
- Created the missing private Supabase Storage `mockups` bucket in the connected environment.

## Verification
- `npm test`
- `npx tsc --noEmit`
- Playwright authenticated `/projects/new` flow created project `Product Pulse Intelligence`.
- Queue completed with Competitive, PRD, MVP, Mockups, and Marketing all saved.
- Verified mockup row `ea73c308-85bb-40f0-90a6-2772d7717cdd` contains 3 OpenRouter image options.
- Verified rendered image options A, B, and C through `/api/mockups/image` with nonzero browser image dimensions.

## Code Review Findings
- No blocking findings after remediation.
- Earlier failure modes found and fixed:
  - Onboarding omitted Mockups entirely.
  - OpenRouter image model calls could hold the queue without a clear timeout.
  - The previous default image model was available but too slow/unreliable in this flow.
  - The connected Supabase project was missing the private `mockups` storage bucket.

## Security Review Findings
- No blocking findings after remediation.
- The mockup image proxy still requires authentication and validates that the requested storage path belongs to a saved mockup owned by the current user.
- Generated image files are stored in a private Supabase Storage bucket, not public URLs.
- Secrets were not hardcoded; runtime uses `OPENROUTER_API_KEY` from the environment and `OPENROUTER_MOCKUP_IMAGE_MODEL` remains configurable.

## Remediation Checklist
- [x] Add Mockups to onboarding queue after MVP.
- [x] Add Mockups loading/status row and completion detection.
- [x] Add focused onboarding tests.
- [x] Add explicit OpenRouter image timeout handling.
- [x] Increase stale generation lease to align with image request timeout.
- [x] Switch default image model to a faster OpenRouter image-output model.
- [x] Create missing private Supabase Storage bucket in the connected environment.
- [x] Verify end-to-end with Playwright and saved mockup images.
