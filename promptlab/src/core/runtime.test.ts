import assert from "node:assert/strict"
import test from "node:test"

import {
  createPromptLabRuntime,
  definePromptLab,
  type PromptLabPersistenceAdapter,
} from "./index.js"

function createMemoryPersistence(): PromptLabPersistenceAdapter {
  const drafts: Awaited<ReturnType<PromptLabPersistenceAdapter["listDrafts"]>> = []
  const runs: Awaited<ReturnType<PromptLabPersistenceAdapter["listRuns"]>> = []

  return {
    async listDrafts() {
      return drafts
    },
    async saveDraft(input) {
      const draft = {
        ...input,
        id: `draft-${drafts.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      drafts.unshift(draft)
      return draft
    },
    async deleteDraft(id) {
      const index = drafts.findIndex((draft) => draft.id === id)
      if (index >= 0) drafts.splice(index, 1)
    },
    async listRuns() {
      return runs
    },
    async saveRun(input) {
      const run = {
        ...input,
        id: `run-${runs.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      runs.unshift(run)
      return run
    },
  }
}

test("createPromptLabRuntime builds prompts with selected host context and persists runs", async () => {
  const persistence = createMemoryPersistence()
  const config = definePromptLab({
    artifacts: [
      {
        id: "brief",
        label: "Brief",
        outputKind: "markdown",
        defaultModel: "model-default",
        preview: "markdown",
        async buildPrompt({ project, selectedContext }) {
          return {
            system: "System",
            user: `${project.label}: ${selectedContext.map((source) => source.label).join(", ")}`,
          }
        },
        async run({ userPrompt, model }) {
          return { kind: "text", content: `${model}: ${userPrompt}` }
        },
      },
    ],
    projects: {
      async listProjects() {
        return [{ id: "project-1", label: "Project One" }]
      },
      async getProject(projectId) {
        return { id: projectId, label: "Project One" }
      },
      async getProjectContext(projectId) {
        return { projectId }
      },
    },
    contextSources: {
      async listContextSources() {
        return [
          {
            id: "summary",
            type: "project",
            label: "Summary",
            contentType: "text/plain",
            load: async () => ({ kind: "text", content: "Summary text" }),
          },
        ]
      },
    },
    persistence,
  })

  const runtime = createPromptLabRuntime(config)
  const prompt = await runtime.buildPrompt({
    projectId: "project-1",
    artifactId: "brief",
    selectedContextIds: ["summary"],
  })

  assert.equal(prompt.user, "Project One: Summary")

  const run = await runtime.runArtifact({
    projectId: "project-1",
    artifactId: "brief",
    selectedContextIds: ["summary"],
    title: "Brief run",
  })

  assert.equal(run.record?.title, "Brief run")
  assert.equal(run.result.kind, "text")
  assert.match(run.result.kind === "text" ? run.result.content : "", /model-default/)
  assert.equal((await persistence.listRuns()).length, 1)
})
