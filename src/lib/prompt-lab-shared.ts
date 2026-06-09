import type { LaunchPlanBrief } from "@/lib/prompts"

export const PROMPT_LAB_ARTIFACTS = [
  "competitive",
  "prd",
  "mvp",
  "mockups",
  "launch",
] as const

export type PromptLabArtifact = typeof PROMPT_LAB_ARTIFACTS[number]

export interface PromptLabModelOption {
  id: string
  label: string
  description: string
}

export const PROMPT_LAB_ARTIFACT_LABELS: Record<PromptLabArtifact, string> = {
  competitive: "Market Research",
  prd: "Product Plan",
  mvp: "First Version Plan",
  mockups: "Design Mockups",
  launch: "Launch Plan",
}

export const PROMPT_LAB_DEFAULT_LAUNCH_BRIEF: LaunchPlanBrief = {
  targetAudience: "Early adopters and tech-savvy users",
  stage: "Pre-launch",
  budget: "Bootstrap / Lean",
  channels: "Product Hunt, X, Show HN, Founder communities, Email/waitlist",
  launchWindow: "Next 30 days",
}

export const PROMPT_LAB_MOCKUP_SKIP_IMAGE_GENERATION_DEFAULT = true

export const PROMPT_LAB_TEXT_MODEL_OPTIONS: PromptLabModelOption[] = [
  {
    id: "anthropic/claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Strong general reasoning and long-form artifact drafting.",
  },
  {
    id: "anthropic/claude-opus-4.6",
    label: "Claude Opus 4.6",
    description: "Highest-quality Anthropic option for deep prompt evaluation.",
  },
  {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "Balanced OpenAI model for fast prompt iteration.",
  },
  {
    id: "openai/gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    description: "Higher-capability OpenAI option for final prompt checks.",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
    description: "Large-context Google model used by Market Research defaults.",
  },
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    description: "Fast Google model for broad iteration.",
  },
  {
    id: "x-ai/grok-4.3",
    label: "Grok 4.3",
    description: "xAI reasoning model for comparison runs.",
  },
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    description: "Popular open reasoning model.",
  },
  {
    id: "qwen/qwen3.7-max",
    label: "Qwen3.7 Max",
    description: "Large Qwen model for coding and productivity-style artifacts.",
  },
  {
    id: "qwen/qwen3.6-plus",
    label: "Qwen3.6 Plus",
    description: "Qwen agentic coding and reasoning model for artifact structure comparisons.",
  },
  {
    id: "xiaomi/mimo-v2.5-pro",
    label: "MiMo V2.5 Pro",
    description: "Xiaomi long-context model for agentic and software-heavy prompt tests.",
  },
  {
    id: "moonshotai/kimi-k2-thinking",
    label: "Kimi K2 Thinking",
    description: "Moonshot reasoning model for alternate artifact structure.",
  },
  {
    id: "mistralai/mistral-medium-3-5",
    label: "Mistral Medium 3.5",
    description: "Mistral general-purpose model for cost and style comparisons.",
  },
]

export const PROMPT_LAB_IMAGE_MODEL_OPTIONS: PromptLabModelOption[] = [
  {
    id: "openai/gpt-5.4-image-2",
    label: "GPT-5.4 Image 2",
    description: "Default OpenRouter-hosted OpenAI image mockup model.",
  },
  {
    id: "google/gemini-2.5-flash-image",
    label: "Nano Banana",
    description: "Fast Google image model with strong contextual understanding.",
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    label: "Nano Banana 2",
    description: "Lower-cost fallback image model when OpenAI image generation is too expensive.",
  },
  {
    id: "google/gemini-3-pro-image-preview",
    label: "Nano Banana Pro",
    description: "Google image model for higher-fidelity visual synthesis.",
  },
  {
    id: "black-forest-labs/flux.2-pro",
    label: "FLUX.2 Pro",
    description: "High-quality image generation and editing model.",
  },
  {
    id: "black-forest-labs/flux.2-klein-4b",
    label: "FLUX.2 Klein 4B",
    description: "Fast and cost-conscious FLUX.2 image option.",
  },
  {
    id: "openai/gpt-5-image-mini",
    label: "GPT-5 Image Mini",
    description: "Lower-latency OpenAI image model for quick mockup passes.",
  },
]

export function getBasePromptLabModelOptions(artifact: PromptLabArtifact) {
  return artifact === "mockups"
    ? PROMPT_LAB_IMAGE_MODEL_OPTIONS
    : PROMPT_LAB_TEXT_MODEL_OPTIONS
}

export function getPromptLabModelOptions(
  artifact: PromptLabArtifact,
  currentModel = "",
): PromptLabModelOption[] {
  const baseOptions = getBasePromptLabModelOptions(artifact)
  const trimmedModel = currentModel.trim()

  if (!trimmedModel || baseOptions.some((option) => option.id === trimmedModel)) {
    return baseOptions
  }

  return [
    {
      id: trimmedModel,
      label: `${trimmedModel} (current)`,
      description: "Saved or configured model outside the curated Prompt Lab list.",
    },
    ...baseOptions,
  ]
}
