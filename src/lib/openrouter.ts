// src/lib/openrouter.ts
// Shared OpenRouter client singleton. Every server-side OpenRouter call goes
// through this one configured client so base URL, credentials, and default
// headers have a single point of control.

import OpenAI from "openai"

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

let client: OpenAI | null = null

/**
 * Returns the shared OpenRouter client, creating it on first use so the
 * API key is read from the environment at call time (not import time).
 */
export function getOpenRouterClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY || "",
    })
  }
  return client
}

/** True when an OpenRouter API key is configured. */
export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY)
}
