---
name: marketing-idea-capture
description: This skill should be used when a user labels a message as a marketing idea or marketing message, or asks to turn an idea into personal-brand or Maker Compass marketing content. It captures the idea in Obsidian through the configured CLI and produces ranked platform recommendations, hooks, scripts, and social drafts.
---

# Marketing-Idea Capture

## Trigger

Run this workflow when the user explicitly says “this is a marketing idea,” “marketing message,” or clearly asks to turn a raw idea into personal-brand or Maker Compass marketing content.

## Source of Truth

- Use Obsidian vault `/Users/Mukul/Documents/openclaw`.
- Store new captures in `Content Ideas & Marketing/`, never in `Resources/Personal Brand & Social Media`, `Resources/MakerCompass/Marketing`, or `Resources/Marketing-Strategy`; those are inspiration/reference material.
- Use the configured Obsidian CLI to create folders and notes. Do not replace it with direct filesystem writes.
- Run `/opt/homebrew/bin/obsidian` with `vault=openclaw`. Ensure Obsidian is running before executing a command; otherwise the CLI cannot connect.

## Workflow

1. Infer whether the idea serves the personal brand, Maker Compass, or both. Default to both: lead with personal experience and use a light Maker Compass CTA only when relevant.
2. Read relevant inspiration notes in the vault only when they materially help with voice, positioning, or prior coverage. Never overwrite them.
3. Choose a concise date-prefixed kebab-case filename: `YYYY-MM-DD-<idea-slug>.md`. If a note already exists, create a versioned sibling rather than overwriting it.
4. Create the capture folder if absent and create the note through the configured Obsidian CLI.
5. Fill the note using the template below. Preserve the user’s source idea verbatim. Label unverified claims as needing research; do not invent results, customer quotes, or statistics.
6. Return the same usable content in chat, starting with the top recommendation and the saved note path.

## Format Selection

Rank the three best publishing formats for this specific idea. Consider audience intent, how much proof/story the idea needs, production effort, and reuse value.

- Treat **short vertical video** as TikTok, Instagram Reels, and YouTube Shorts by default.
- Consider X single posts, X threads, LinkedIn posts, LinkedIn articles, long-form YouTube, newsletters, carousels, or a blog post when they better fit.
- Give a one-sentence reason and a suggested distribution plan for each rank.
- For each selected format, supply two distinct publishable options. Do not force an X article over an X post/thread unless depth, evergreen search value, and evidence support it.

## Hook Standard

Use `content-research-writer` guidance: make hooks specific, audience-relevant, curious, and value-promising. Produce two different angles rather than shallow rewrites. Prefer a concrete tension, surprising observation, contrarian point of view, or short story over generic “here are five tips” openings.

## Required Draft Pack

Every capture includes:

1. A ranked top-three format recommendation with two options per format.
2. Two short-video scripts. Include hook, spoken script, on-screen text/shot beats, CTA, and recommended duration. Make them usable for TikTok, Reels, and Shorts.
3. Two LinkedIn post drafts.
4. Two X single-post drafts.
5. Two X thread drafts, each with a hook post, numbered body posts, and CTA.
6. A brief repurposing note stating how to adapt the strongest option for Instagram, TikTok, YouTube, LinkedIn, and X.

Keep draft copy clean and editable. Use placeholders for facts, links, screenshots, or product claims that need confirmation.

## Obsidian Note Template

```markdown
---
created: YYYY-MM-DD
status: idea
brand: personal | maker-compass | both
---

# <Working title>

## Raw idea

<User idea verbatim>

## Content angle

<Audience, tension, promise, and CTA>

## Top formats

1. **<Format>** — <why now / why this audience>
   - Option A: <angle>
   - Option B: <angle>
2. **<Format>** — <why>
   - Option A: <angle>
   - Option B: <angle>
3. **<Format>** — <why>
   - Option A: <angle>
   - Option B: <angle>

## Video scripts

### Script A — <angle>
- Hook:
- Duration:
- Spoken script:
- On-screen text / shots:
- CTA:

### Script B — <angle>
- Hook:
- Duration:
- Spoken script:
- On-screen text / shots:
- CTA:

## LinkedIn

### Option A
<draft>

### Option B
<draft>

## X single posts

### Option A
<draft>

### Option B
<draft>

## X threads

### Option A
1/ <hook>

### Option B
1/ <hook>

## Repurposing

<Platform-specific adaptation note>

## Research / proof to collect

- [ ] <Claim, source, screenshot, example, or metric needed>
```

## CLI Configuration

```text
Command: /opt/homebrew/bin/obsidian
Vault option: vault=openclaw
Configured on: 2026-07-11
```
