# PromptLab

PromptLab is a local prompt and artifact workbench for solo AI app builders. It is designed to run inside your app's existing development server as a dev-only React modal.

## Install Shape

```bash
npx promptlab@latest init
```

The initializer creates:

- `promptlab.config.ts`
- `.promptlab/promptlab.local.json`
- `.promptlab/.gitignore`
- `PROMPTLAB_AGENT_HANDOFF.md`

PromptLab does not read arbitrary repository files in v1. Host apps explicitly expose project records, context sources, prompt builders, and artifact runners through `promptlab.config.ts`.

## Package Exports

- `promptlab/core` for contracts, config validation, context serialization, and local JSON persistence.
- `promptlab/react` for the dev-only modal launcher.
- `promptlab/next` for Next.js integration helpers as they stabilize.

## Current Status

This package is in early development. The first dogfood integration target is MakerCompass.
