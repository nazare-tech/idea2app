// Prompt constants live in @/lib/prompts — re-exported here so that
// existing imports of prompt-chat-config.ts continue to work unchanged.
export { PROMPT_CHAT_SYSTEM, IDEA_SUMMARY_PROMPT, POST_SUMMARY_SYSTEM } from "@/lib/prompts"

// Available AI models from OpenRouter
export const AVAILABLE_MODELS = [
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Balanced performance and speed",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    description: "Think longer for complex tasks",
  },
  {
    id: "openai/gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    description: "Fastest for quick answers",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast and efficient from Google",
  },
  {
    id: "deepseek/deepseek-v3-2",
    name: "DeepSeek V3.2",
    description: "Cost-effective alternative",
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    description: "Powerful reasoning from Moonshot",
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fast and lightweight from Anthropic",
  },
  {
    id: "qwen/qwen3.5-flash",
    name: "Qwen 3.5 Flash",
    description: "Fast model from Alibaba",
  },
]

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6"

// ─── Document Tab Model Selection ─────────────────────────────────
// These models appear in the AI model selector on document tabs
// (Competitive Research, PRD, MVP Plan, Mockups, Tech Spec, Deploy).
// The selected model is used when the OpenRouter fallback is triggered.

export interface DocumentModel {
  id: string
  name: string
  description: string
  badge?: string
}

export const DOCUMENT_PRIMARY_MODELS: DocumentModel[] = [
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    description: "Think longer for complex tasks",
    badge: "Thinking",
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Balanced performance and speed",
    badge: "Efficient",
  },
  {
    id: "openai/gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    description: "Fastest for quick answers",
    badge: "Fastest",
  },
]

export const DOCUMENT_MORE_MODELS: DocumentModel[] = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast and efficient from Google",
  },
  {
    id: "deepseek/deepseek-v3-2",
    name: "DeepSeek V3.2",
    description: "Cost-effective alternative",
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    description: "Powerful reasoning from Moonshot",
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fast and lightweight from Anthropic",
  },
  {
    id: "qwen/qwen3.5-flash",
    name: "Qwen 3.5 Flash",
    description: "Fast model from Alibaba",
  },
]

// Per-tab default model selections
export const TAB_DEFAULT_MODELS: Record<string, string> = {
  prompt:      "anthropic/claude-sonnet-4-6",   // Explain the Prompt
  competitive: "google/gemini-3.1-pro-preview",  // Competitive Research
  prd:         "anthropic/claude-sonnet-4-6",    // PRD
  mvp:         "anthropic/claude-sonnet-4-6",    // MVP
  mockups:     "anthropic/claude-sonnet-4-6",    // Mockups
  launch:      "openai/gpt-5.4-mini",            // Marketing Plan
}

export const DEFAULT_DOCUMENT_MODEL = "anthropic/claude-sonnet-4-6"
