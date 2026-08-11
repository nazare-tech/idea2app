---
name: marketing-idea-capture
description: This skill should be used when a user labels a message as a marketing idea or marketing message, asks to save a marketing idea, or asks to develop one into publishable content. It stores the source idea in the designated repository's marketing folder, creates a concise capture by default, and expands into channel drafts only when requested.
---

# Marketing Idea Capture

Capture marketing thinking in the project that owns it. Do not send it to an external notes app, a global notes directory, or a publishing service.

## Trigger

Run this workflow before replying when the user says “this is a marketing idea,” “marketing message,” “save/capture this marketing idea,” or clearly asks to turn an idea into marketing content.

Select one mode:

- **Capture** (default): preserve the idea and add only enough structure to make it useful later.
- **Develop**: use only when the user asks for scripts, posts, a campaign, or publishable drafts.

Never publish, schedule, message, upload, or create an external draft unless the user separately authorizes that action.

## Resolve The Destination

1. Resolve the repository root with `git rev-parse --show-toplevel`.
2. The repository is a valid marketing destination only when `marketing/README.md` exists and states that this repository owns its marketing captures.
3. If the marker is missing, ask the user to confirm the intended repository before writing. After confirmation, create the marker and folder structure first.
4. If no Git root exists, do not silently use the active workspace. Explain that the capture would be unversioned and ask for an explicit persistent project directory.
5. Read `brand/brand.md` when present and populated. Use it for audience, voice, positioning, and naming; do not invent missing brand decisions.

## Path Contract

Write captures beneath:

```text
marketing/ideas/YYYY/MM/YYYY-MM-DD-<idea-slug>.md
```

Use a short kebab-case slug. If the path exists, allocate `-v2`, `-v3`, and so on. Never overwrite.

Related work belongs in:

- `marketing/drafts/` — developed channel-ready drafts
- `marketing/campaigns/` — multi-asset campaign plans and launch packages
- `marketing/research/` — sources, claim checks, audience evidence, and examples

The capture file remains the source record even when developed outputs are stored elsewhere.

## Capture Workflow

1. Preserve the user's source idea verbatim. Do not polish the raw text.
2. Infer the likely audience and brand only when supported by the current conversation or `brand/brand.md`; otherwise use `unknown`.
3. Write the compact capture template below.
4. Label facts, statistics, customer claims, and examples that lack evidence as research needs.
5. Re-read the exact saved file.
6. Verify that `## Raw idea` contains the user's verbatim source text before reporting success.
7. Return the saved repository-relative path, the strongest recommended format, and the next useful action.

If creation or verification fails, state the failure and return the proposed capture in chat. Never claim a path was saved merely because the filename exists.

## Capture Template

```markdown
---
created: YYYY-MM-DD
status: idea
brand: <brand-name | unknown>
audience: <primary audience | unknown>
channels: [<likely-channel>, <likely-channel>]
---

# <Working title>

## Raw idea

<User idea verbatim>

## Content angle

<Audience tension, useful promise, point of view, and natural CTA>

## Best formats

1. **<Format>** — <why it fits>
2. **<Format>** — <why it fits>
3. **<Format>** — <why it fits>

## Hooks

- <Hook with a concrete tension, observation, or result>
- <Distinct hook from another angle>

## Research / proof to collect

- [ ] <Claim, source, screenshot, customer evidence, example, or metric needed>

## Next action

<The smallest useful next step>
```

## Develop Mode

When the user explicitly asks to develop the idea:

1. Create or update the capture first.
2. Choose only the formats that fit the idea and audience. Do not generate every channel by habit.
3. Use `marketing-writing-style` for all agent-written marketing prose. Keep the user's `## Raw idea` verbatim.
4. Use `content-director` when available and the request needs format-specific art direction. Keep this skill responsible for repository storage and verification.
5. Store developed work under `marketing/drafts/YYYY/MM/<capture-slug>/`, linking back to the source capture.
6. A full multi-platform pack may include:
   - Two short-video scripts with hook, spoken copy, shot/on-screen beats, duration, and CTA
   - Two LinkedIn posts
   - Two X posts
   - Two X threads
   - A concise repurposing plan
7. Use placeholders for facts, links, screenshots, or product claims that need confirmation.

Campaign-level work belongs under `marketing/campaigns/<campaign-slug>/`, with the source capture linked at the top.

## Quality Bar

- Hooks are specific, audience-relevant, and meaningfully different.
- The raw idea is verbatim and clearly separated from agent interpretation.
- Recommendations are ranked; volume is not a substitute for judgment.
- Drafts follow the repository's populated brand foundation.
- Agent-written copy passes the `marketing-writing-style` audit.
- No machine-specific absolute paths appear in saved content or instructions.
