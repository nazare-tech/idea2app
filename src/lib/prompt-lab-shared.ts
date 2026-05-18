import type { LaunchPlanBrief } from "@/lib/prompts"

export const PROMPT_LAB_ARTIFACTS = [
  "competitive",
  "prd",
  "mvp",
  "mockups",
  "launch",
] as const

export type PromptLabArtifact = typeof PROMPT_LAB_ARTIFACTS[number]

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
