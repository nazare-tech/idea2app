import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPromptContextBlock,
  definePromptLab,
  localJsonPersistence,
  validatePromptLabConfig,
  type PromptLabConfig,
} from "./index.js"

function createConfig(): PromptLabConfig {
  return {
    artifacts: [
      {
        id: "brief",
        label: "Idea Brief",
        outputKind: "markdown",
        defaultModel: "openai/gpt-5.4-mini",
        preview: "markdown",
        buildPrompt: async () => ({ system: "You are concise.", user: "Draft a brief." }),
        run: async () => ({ kind: "text", content: "Brief", metadata: {} }),
      },
      {
        id: "mockup",
        label: "Mockup",
        outputKind: "image",
        defaultModel: "openai/gpt-5.4-image-2",
        preview: "image",
        buildPrompt: async () => ({ system: "You design UI.", user: "Create a mockup." }),
        run: async () => ({
          kind: "image",
          images: [{ url: "data:image/png;base64,abc", alt: "Mockup" }],
          metadata: {},
        }),
      },
    ],
    projects: {
      listProjects: async () => [{ id: "project-1", label: "Project One" }],
      getProject: async () => ({ id: "project-1", label: "Project One" }),
      getProjectContext: async () => ({ summary: "A project summary" }),
    },
    persistence: localJsonPersistence({ path: "/tmp/promptlab-test-config.json" }),
  }
}

test("definePromptLab returns a validated config", () => {
  const config = definePromptLab(createConfig())

  assert.equal(config.artifacts.length, 2)
  assert.equal(config.artifacts[0].id, "brief")
  assert.doesNotThrow(() => validatePromptLabConfig(config))
})

test("validatePromptLabConfig rejects duplicate artifact ids", () => {
  const config = createConfig()
  config.artifacts[1] = { ...config.artifacts[1], id: "brief" }

  assert.throws(
    () => validatePromptLabConfig(config),
    /Duplicate artifact id: brief/,
  )
})

test("buildPromptContextBlock renders source labels and truncation", () => {
  const block = buildPromptContextBlock([
    {
      id: "project-summary",
      type: "project",
      label: "Project Summary",
      contentType: "text/plain",
      payload: { kind: "text", content: "A".repeat(20) },
    },
    {
      id: "market",
      type: "artifact",
      label: "Market Research",
      contentType: "text/markdown",
      payload: { kind: "text", content: "Market notes" },
    },
  ], { maxCharsPerSource: 15 })

  assert.match(block, /## Project Summary/)
  assert.match(block, /## Market Research/)
  assert.match(block, /truncated from 20 to 15 characters/)
  assert.match(block, /Market notes/)
})
