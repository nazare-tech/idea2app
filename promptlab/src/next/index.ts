export interface PromptLabNextOptions {
  configPath?: string
}

export function createPromptLabNextIntegration(options: PromptLabNextOptions = {}) {
  return {
    configPath: options.configPath ?? "promptlab.config.ts",
    note: "PromptLab Next.js route helpers are planned after the core package contracts stabilize.",
  }
}
