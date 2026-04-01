# Tokenomics Guide

This document explains how credits are earned, spent, and calculated across the idea2app platform.

---

## Overview

Credits are the in-app currency used to run AI generations. Every generation deducts credits from the user's balance. The cost depends on two things: **what** is being generated and **which AI model** is selected.

New users receive **150 credits** on signup — enough for 1–2 full project runs.

---

## The Formula

All major generations use this formula:

```
credits = ceil(base_cost × model_multiplier / 5) × 5
```

This rounds every cost **up** to the nearest multiple of 5 (e.g. 12.5 → 15, 17.25 → 20).

Two actions are exceptions and bypass this formula entirely:
- **Mockups** — always **30 credits** (fixed; uses Stitch SDK, not a selectable model)
- **Edit with AI** — always **2 credits** (flat; lightweight inline edit)

Chat messages use a simpler formula: `ceil(1 × model_multiplier)`, giving either **1 or 2** per message.

---

## Base Costs

| Action | Base Cost |
|--------|-----------|
| Competitive Research | 15 |
| PRD | 10 |
| MVP Plan | 10 |
| Tech Spec | 10 |
| Marketing / Launch Plan | 5 |
| Mockups | 30 (fixed) |
| Edit with AI | 2 (flat) |
| Chat (Explain the Idea) | 1 |

---

## Model Multipliers

Models are tiered by capability and cost. A higher multiplier means more credits per generation.

| Model | Multiplier | Tier |
|-------|-----------|------|
| Gemini 3.1 Pro Preview | 1.25× | Thinking |
| Claude Sonnet 4.6 | 1.15× | Efficient |
| Gemini 2.5 Flash | 0.90× | Fast |
| Kimi K2.5 | 0.90× | Fast |
| GPT-5.4 Mini | 0.85× | Fastest |
| Claude Haiku 4.5 | 0.85× | Fastest |
| DeepSeek V3.2 | 0.80× | Budget |
| Qwen 3.5 Flash | 0.80× | Budget |

---

## Credit Costs by Generation and Model

### Competitive Research (base = 15)

| Model | Credits |
|-------|---------|
| Gemini 3.1 Pro Preview | **20** |
| Claude Sonnet 4.6 | **20** |
| Gemini 2.5 Flash | **15** |
| Kimi K2.5 | **15** |
| GPT-5.4 Mini | **15** |
| Claude Haiku 4.5 | **15** |
| DeepSeek V3.2 | **15** |
| Qwen 3.5 Flash | **15** |

### PRD / MVP Plan / Tech Spec (base = 10)

| Model | Credits |
|-------|---------|
| Gemini 3.1 Pro Preview | **15** |
| Claude Sonnet 4.6 | **15** |
| Gemini 2.5 Flash | **10** |
| Kimi K2.5 | **10** |
| GPT-5.4 Mini | **10** |
| Claude Haiku 4.5 | **10** |
| DeepSeek V3.2 | **10** |
| Qwen 3.5 Flash | **10** |

### Marketing / Launch Plan (base = 5)

| Model | Credits |
|-------|---------|
| Gemini 3.1 Pro Preview | **10** |
| Claude Sonnet 4.6 | **10** |
| Gemini 2.5 Flash | **5** |
| Kimi K2.5 | **5** |
| GPT-5.4 Mini | **5** |
| Claude Haiku 4.5 | **5** |
| DeepSeek V3.2 | **5** |
| Qwen 3.5 Flash | **5** |

### Fixed / Flat Costs

| Action | Credits |
|--------|---------|
| Mockups | **30** (always) |
| Edit with AI | **2** (always) |
| Chat message — budget/fast models | **1** |
| Chat message — Sonnet / Gemini Pro | **2** |

---

## Generate All Totals

Generate All runs Competitive Research → PRD → MVP Plan → Mockups → Marketing in sequence.

| Models used | Total |
|-------------|-------|
| Gemini 3.1 Pro / Claude Sonnet | **90** (20+15+15+30+10) |
| All other models | **70** (15+10+10+30+5) |

With 150 starting credits: approximately **1.7 premium runs** or **2.1 budget runs**.

---

## App Generation

App generation costs are fixed regardless of model.

| App Type | Credits |
|----------|---------|
| Static Website | 50 |
| Dynamic Website (Next.js) | 100 |
| Single Page App (React SPA) | 150 |
| Progressive Web App (PWA) | 200 |

---

## Implementation

All credit logic lives in one file: [`src/lib/token-economics.ts`](src/lib/token-economics.ts)

Key exports:

| Export | Purpose |
|--------|---------|
| `BASE_ACTION_TOKENS` | Base cost per action |
| `MODEL_MULTIPLIERS` | Multiplier list, matched by model ID substring |
| `getModelTokenMultiplier(modelId)` | Returns multiplier for a given model ID |
| `getTokenCost(action, modelId?)` | Returns final credit cost for an action + model |
| `estimateGenerateAllCost(modelSelections, skipTypes)` | Total cost for a Generate All run |
| `GENERATE_ALL_ACTION_MAP` | Maps Generate All doc types to billable action keys |

The `getTokenCost` function routing:

```ts
getTokenCost("document-edit", ...)  // → always 2
getTokenCost("mockup", ...)         // → always 30
getTokenCost("chat", model)         // → Math.ceil(1 × multiplier) → 1 or 2
getTokenCost("prd", model)          // → ceilTo5(10 × multiplier)
// etc.
```

To adjust any cost, change the relevant value in `BASE_ACTION_TOKENS` or `MODEL_MULTIPLIERS`. The UI button text, Generate All estimates, and credit sufficiency checks all derive from `getTokenCost` automatically.
