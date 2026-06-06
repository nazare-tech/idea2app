# Review: PromptLab Package Scaffold

## Scope
- `promptlab/package.json`
- `promptlab/tsconfig.json`
- `promptlab/src/core/*`
- `promptlab/src/cli/*`
- `promptlab/src/react/index.tsx`
- `promptlab/src/next/index.ts`
- `promptlab/README.md`
- `promptlab/LICENSE`
- `plans/promptlab-npx-utility-plan.md`

## Verification
- Red state confirmed first:
  - `node --import tsx --test promptlab/src/core/config.test.ts promptlab/src/core/local-json-persistence.test.ts promptlab/src/cli/init.test.ts`
  - Failed on missing `promptlab/src/core/index.js` and `promptlab/src/cli/init.js`.
- Green focused tests:
  - `node --import tsx --test promptlab/src/core/config.test.ts promptlab/src/core/local-json-persistence.test.ts promptlab/src/cli/init.test.ts`
  - 8 passing tests.
- Runtime test:
  - `node --import tsx --test promptlab/src/core/config.test.ts promptlab/src/core/local-json-persistence.test.ts promptlab/src/core/runtime.test.ts promptlab/src/cli/init.test.ts`
  - 9 passing tests.
- Typecheck:
  - `./node_modules/.bin/tsc -p promptlab/tsconfig.json --noEmit`
- Build:
  - `./node_modules/.bin/tsc -p promptlab/tsconfig.json`
- Package dry run:
  - `npm --cache /private/tmp/promptlab-npm-cache pack --dry-run`
  - Confirmed compiled tests are excluded from the package tarball after updating `tsconfig.json`.
- Built CLI smoke:
  - Ran `node promptlab/dist/cli/index.js init` in a temp directory and confirmed it wrote `promptlab.config.ts`, `.promptlab/.gitignore`, `.promptlab/promptlab.local.json`, and `PROMPTLAB_AGENT_HANDOFF.md`.

## Code Review Findings
- Fixed: Generated `promptlab.config.ts` included `persistence`, but `PromptLabConfig` initially did not type that property. Added optional `persistence?: PromptLabPersistenceAdapter` and covered it in the config test.
- Fixed: Initial package build emitted compiled test files into `dist`, which appeared in `npm pack --dry-run`. Excluded `src/**/*.test.ts` and `src/**/*.test.tsx` from the build.
- Fixed: React launcher defaulted to `process.env.NODE_ENV` directly. Replaced with a `typeof process` guard so browser runtimes without a `process` global do not throw.
- Added: Core runtime now connects project loading, host context-source selection, prompt building, artifact execution, and optional persistence for completed/failed run records.
- Deferred: `promptlab/react` is currently an initial modal shell, not the full setup/context/prompts/history/output workbench. This is explicitly tracked as incomplete in the plan checklist.
- Deferred: The implementation lives in `promptlab/` inside this workspace rather than a true sibling Git repo. This avoids sandbox write issues and accidental nested gitlinks for now, but it still needs to be moved or initialized as a separate repository before publishing.

## Security Review Findings
- Pass: `promptlab init` writes visible local files only and refuses to overwrite by default unless `--force` is passed.
- Pass: The generated handoff explicitly says not to read arbitrary repo files, `.env`, secret files, credentials, private keys, or token stores.
- Pass: No package code calls external model providers by default; model execution remains host-owned through artifact `run` adapters.
- Pass: Local JSON persistence writes only to the configured path and uses atomic temp-file writes.
- Residual risk: Host adapters can still expose sensitive context if implemented poorly. The current mitigation is explicit context-source APIs plus the generated safety instructions; a future phase should add redaction hooks and context-size limits at the core API level.

## Remediation Checklist
- [x] Add `persistence` to `PromptLabConfig`.
- [x] Exclude tests from package build output.
- [x] Guard React launcher runtime detection.
- [ ] Build full modal workbench with accessible focus handling, keyboard close behavior, body-scroll management, and browser verification.
- [ ] Add core redaction hooks and context-size limit APIs.
- [ ] Move PromptLab into a true separate repo or add it intentionally as a submodule/path dependency before publication.
