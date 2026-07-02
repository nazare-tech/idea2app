# Review: Brand Wordmark Client Manifest Fix

## Scope
- `src/components/layout/brand-wordmark.tsx`
- `src/components/layout/header-logo.tsx`
- Runtime routes that render the shared wordmark: `/`, `/auth`, `/forgot-password`

## Verification
- `npm run typecheck` passed.
- `npm run lint` passed with one pre-existing warning in `output/playwright/prod-full-flow.mjs` for unused `pageText`; no errors and no warnings in changed files.
- `npm run build` first failed in the sandbox because Next could not fetch Google Fonts. Re-ran with approved network access and the build passed, including `scripts/guard-webpack-chunky.mjs`.
- Host-level `curl -I http://localhost:3000/` returned `200 OK`.
- In-app browser verification:
  - `/` loaded without the React Client Manifest error and with no console errors.
  - `/auth` loaded without the React Client Manifest error and with no console errors.
  - `/forgot-password` loaded without the React Client Manifest error and with no console errors.

## UI Evidence
- `/` at default in-app browser viewport: `ui-evidence/2026-07-02-brand-wordmark-manifest/landing-1280x720.png`
- `/auth` at default in-app browser viewport: `ui-evidence/2026-07-02-brand-wordmark-manifest/auth-1280x720.png`
- `/forgot-password` at default in-app browser viewport: `ui-evidence/2026-07-02-brand-wordmark-manifest/forgot-password-1280x720.png`

## Fresh-Eyes Self Review
- Pass 1: Re-read the changed wordmark/logo files and confirmed they only use `next/link`, `next/image`, constants, type-only React imports, and class-name helpers. No fix needed.
- Pass 2: Reviewed the full task diff and import shape. Client consumers can still import the components through the client graph, while server pages no longer need `BrandWordmark` as a manifest client reference. No fix needed.

## Code Review Findings
- None.

## Security Review Findings
- None. The change does not touch auth, secrets, RLS, data access, external API calls, payments, or persistence.

## Remediation Checklist
- [x] No remediation required.
