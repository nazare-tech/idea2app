// Prompt constants live in @/lib/prompts — re-exported here so that
// existing imports of prompt-chat-config.ts continue to work unchanged.
export { PROMPT_CHAT_SYSTEM, IDEA_SUMMARY_PROMPT, POST_SUMMARY_SYSTEM } from "@/lib/prompts"

/**
 * Default AI model per tab. Change these to switch the model used for each pipeline.
 * Keys match the DocumentType values used throughout the app.
 */
export const DEFAULT_MODELS: Record<string, string> = {
  prompt:      "anthropic/claude-sonnet-4-6",   // Prompt chat
  competitive: "google/gemini-3.1-pro-preview",  // Competitive Research
  prd:         "anthropic/claude-sonnet-4-6",    // PRD
  mvp:         "anthropic/claude-sonnet-4-6",    // MVP Plan
  mockups:     "anthropic/claude-sonnet-4-6",    // Mockups
  launch:      "openai/gpt-5.4-mini",            // Marketing Plan
}

/** Fallback when a tab key isn't in DEFAULT_MODELS */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6"
