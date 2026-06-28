# Tokenomics Guide

This document explains how credits are earned, spent, and calculated across Maker Compass.

---

## Overview

Credits are the internal accounting unit used for AI generations that are billed outside bundled project creation. New users receive signup credits, and paid plans can receive recurring allowances.

---

## The Formula

Most text generations use this formula:

```text
credits = ceil(base_cost * model_multiplier / 5) * 5
```

This rounds generation costs up to the nearest multiple of 5.

Exceptions:
- **Mockups**: included in project generation
- **Edit with AI**: always 2 credits when that surface is active

Chat is currently disabled. If it returns, its historical formula was `ceil(1 * model_multiplier)`.

---

## Base Costs

| Action | Base Cost |
|--------|-----------|
| Competitive Research | 15 |
| PRD | 10 |
| MVP Plan | 10 |
| Tech Spec | 10 |
| Marketing / Launch Plan | 5 |
| Mockups | Included |
| Edit with AI | 2 |
| Chat | Disabled |

---

## Model Multipliers

Models are tiered by capability and cost. A higher multiplier means more credits per generation.

| Model | Multiplier | Tier |
|-------|------------|------|
| Gemini 3.1 Pro Preview | 1.25x | Thinking |
| Claude Sonnet 4.6 | 1.15x | Efficient |
| Gemini 2.5 Flash | 0.90x | Fast |
| Kimi K2.5 | 0.90x | Fast |
| GPT-5.4 Mini | 0.85x | Fastest |
| Claude Haiku 4.5 | 0.85x | Fastest |
| DeepSeek V3.2 | 0.80x | Budget |
| Qwen 3.5 Flash | 0.80x | Budget |

---

## Credit Costs By Generation And Model

### Competitive Research

| Model | Credits |
|-------|---------|
| Gemini 3.1 Pro Preview | 20 |
| Claude Sonnet 4.6 | 20 |
| Gemini 2.5 Flash | 15 |
| Kimi K2.5 | 15 |
| GPT-5.4 Mini | 15 |
| Claude Haiku 4.5 | 15 |
| DeepSeek V3.2 | 15 |
| Qwen 3.5 Flash | 15 |

### PRD / MVP Plan / Tech Spec

| Model | Credits |
|-------|---------|
| Gemini 3.1 Pro Preview | 15 |
| Claude Sonnet 4.6 | 15 |
| Gemini 2.5 Flash | 10 |
| Kimi K2.5 | 10 |
| GPT-5.4 Mini | 10 |
| Claude Haiku 4.5 | 10 |
| DeepSeek V3.2 | 10 |
| Qwen 3.5 Flash | 10 |

### Marketing / Launch Plan

Launch Plan is archived in production, but the local Prompt Lab can still use the prompt.

| Model | Credits |
|-------|---------|
| Gemini 3.1 Pro Preview | 10 |
| Claude Sonnet 4.6 | 10 |
| Gemini 2.5 Flash | 5 |
| Kimi K2.5 | 5 |
| GPT-5.4 Mini | 5 |
| Claude Haiku 4.5 | 5 |
| DeepSeek V3.2 | 5 |
| Qwen 3.5 Flash | 5 |

---

## Generate All Totals

Generate All runs Competitive Research -> PRD -> MVP Plan -> Mockups.

| Models used | Total |
|-------------|-------|
| Gemini 3.1 Pro / Claude Sonnet | 50 |
| All other models | 35 |

---

## Implementation

All credit logic lives in [`src/lib/token-economics.ts`](src/lib/token-economics.ts).

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
getTokenCost("document-edit", model) // always 2
getTokenCost("mockup", model)        // always 0
getTokenCost("chat", model)          // historical: ceil(1 * multiplier)
getTokenCost("prd", model)           // ceilTo5(10 * multiplier)
```

To adjust any cost, change the relevant value in `BASE_ACTION_TOKENS` or `MODEL_MULTIPLIERS`.
