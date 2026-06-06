import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { createPromptLabInitFiles } from "./init.js"

test("createPromptLabInitFiles writes safe stubs and agent handoff", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "promptlab-init-"))
  try {
    const result = await createPromptLabInitFiles({ cwd: dir, force: false })

    assert.deepEqual(result.created.sort(), [
      ".promptlab/.gitignore",
      ".promptlab/promptlab.local.json",
      "PROMPTLAB_AGENT_HANDOFF.md",
      "promptlab.config.ts",
    ])

    const config = await readFile(path.join(dir, "promptlab.config.ts"), "utf8")
    assert.match(config, /definePromptLab/)
    assert.match(config, /TODO/)

    const handoff = await readFile(path.join(dir, "PROMPTLAB_AGENT_HANDOFF.md"), "utf8")
    assert.match(handoff, /Wire the project adapter/)
    assert.match(handoff, /Do not read arbitrary repo files/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("createPromptLabInitFiles refuses to overwrite by default", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "promptlab-init-"))
  try {
    await createPromptLabInitFiles({ cwd: dir, force: false })

    await assert.rejects(
      () => createPromptLabInitFiles({ cwd: dir, force: false }),
      /already exists/,
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
