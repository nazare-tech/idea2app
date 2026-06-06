import { constants } from "node:fs"
import { access, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { createEmptyStore } from "../core/index.js"

export interface PromptLabInitOptions {
  cwd: string
  force?: boolean
}

export interface PromptLabInitResult {
  created: string[]
}

const FILES = {
  config: "promptlab.config.ts",
  gitignore: path.join(".promptlab", ".gitignore"),
  store: path.join(".promptlab", "promptlab.local.json"),
  handoff: "PROMPTLAB_AGENT_HANDOFF.md",
} as const

export async function createPromptLabInitFiles({
  cwd,
  force = false,
}: PromptLabInitOptions): Promise<PromptLabInitResult> {
  const plannedFiles = Object.values(FILES)

  if (!force) {
    for (const relativePath of plannedFiles) {
      if (await exists(path.join(cwd, relativePath))) {
        throw new Error(`${relativePath} already exists. Re-run with --force to overwrite PromptLab stubs.`)
      }
    }
  }

  await mkdir(path.join(cwd, ".promptlab"), { recursive: true })
  await writeText(cwd, FILES.config, CONFIG_TEMPLATE)
  await writeText(cwd, FILES.gitignore, "promptlab.local.json\n*.corrupt\n*.tmp-*\n")
  await writeText(cwd, FILES.store, `${JSON.stringify(createEmptyStore(), null, 2)}\n`)
  await writeText(cwd, FILES.handoff, HANDOFF_TEMPLATE)

  return { created: plannedFiles }
}

async function writeText(cwd: string, relativePath: string, content: string) {
  await writeFile(path.join(cwd, relativePath), content, "utf8")
}

async function exists(filePath: string) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const CONFIG_TEMPLATE = `import { definePromptLab, localJsonPersistence } from "promptlab/core"

export default definePromptLab({
  artifacts: [
    {
      id: "example-artifact",
      label: "Example Artifact",
      outputKind: "markdown",
      defaultModel: "openai/gpt-5.4-mini",
      preview: "markdown",
      async buildPrompt({ project, selectedContext }) {
        // TODO: Build a project-specific prompt from your app's context sources.
        return {
          system: "You are helping iterate on an AI artifact.",
          user: [
            \`Project: \${project.label}\`,
            "Selected context:",
            JSON.stringify(selectedContext, null, 2),
          ].join("\\n\\n"),
        }
      },
      async run({ systemPrompt, userPrompt, model }) {
        // TODO: Call your app's existing model/API path here.
        return {
          kind: "text",
          content: [
            "# Example PromptLab Output",
            "",
            \`Model: \${model}\`,
            "",
            systemPrompt,
            "",
            userPrompt,
          ].join("\\n"),
        }
      },
    },
  ],
  projects: {
    async listProjects() {
      // TODO: Return projects or entities from your app.
      return [{ id: "local-demo", label: "Local Demo Project" }]
    },
    async getProject(projectId) {
      // TODO: Load one project by id.
      return { id: projectId, label: "Local Demo Project" }
    },
    async getProjectContext(projectId) {
      // TODO: Return safe, explicit project context.
      return { projectId }
    },
  },
  persistence: localJsonPersistence({ path: ".promptlab/promptlab.local.json" }),
})
`

const HANDOFF_TEMPLATE = `# PromptLab Agent Handoff

Wire the project adapter and artifact runner for this app.

## Scope
- Mount the PromptLab launcher only in local development.
- Use the generated \`promptlab.config.ts\` as the integration point.
- Keep PromptLab data local in \`.promptlab/promptlab.local.json\`.

## Adapter Work
1. Wire the project adapter to list and load the host app's project/entity records.
2. Add explicit context sources for artifacts, project summaries, and user-provided text.
3. Wire each artifact's \`buildPrompt\` function to compose safe prompts from selected context.
4. Wire each artifact's \`run\` function to the host app's existing API/model path.
5. Keep text, JSON, and image artifacts explicit through \`outputKind\` and \`preview\`.

## Safety Rules
- Do not read arbitrary repo files in v1.
- Do not read \`.env\`, secret files, credentials, private keys, or token stores.
- Do not send hidden context to model providers; every context item should be visible in PromptLab.
- Do not add production routes unless the user explicitly asks for a production/admin PromptLab.
`
