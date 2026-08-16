import assert from "node:assert/strict"
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { CodexUnavailableError, generateWithCodex } from "./codex-runner"

test("passes prompts and caller options to a sandboxed Codex invocation", { skip: process.platform === "win32" }, async (t) => {
  const fixtureDirectory = await mkdtemp(path.join(os.tmpdir(), "research-inbox-runner-test-"))
  const executable = path.join(fixtureDirectory, "fake-codex")
  const previousExecutable = process.env.RESEARCH_CODEX_PATH

  await writeFile(executable, `#!/usr/bin/env node
const fs = require("node:fs")
const outputIndex = process.argv.indexOf("--output-last-message")
let input = ""
process.stdin.on("data", (chunk) => { input += chunk })
process.stdin.on("end", () => {
  const finish = () => fs.writeFileSync(process.argv[outputIndex + 1], input === "oversize" ? "x".repeat(128) : input + "|" + process.cwd())
  if (input === "slow") setTimeout(finish, 100)
  else finish()
})
`)
  await chmod(executable, 0o755)
  process.env.RESEARCH_CODEX_PATH = executable

  t.after(async () => {
    if (previousExecutable === undefined) delete process.env.RESEARCH_CODEX_PATH
    else process.env.RESEARCH_CODEX_PATH = previousExecutable
    await rm(fixtureDirectory, { recursive: true, force: true })
  })

  await t.test("passes the prompt and sanitizes purpose for temporary paths", async () => {
    const result = await generateWithCodex("article prompt", { purpose: "Article Draft!", outputCap: 5_000 })
    const [prompt, cwd] = result.split("|")
    assert.equal(prompt, "article prompt")
    assert.match(path.basename(cwd), /^research-inbox-article-draft-/)
  })

  await t.test("rejects oversized output instead of returning sliced text", async () => {
    await assert.rejects(
      generateWithCodex("oversize", { outputCap: 64 }),
      (error: unknown) => error instanceof CodexUnavailableError && /exceeded the 64-byte limit/.test(error.message),
    )
  })

  await t.test("honors a caller timeout", async () => {
    await assert.rejects(
      generateWithCodex("slow", { timeoutMs: 50 }),
      (error: unknown) => error instanceof CodexUnavailableError && /timed out/.test(error.message),
    )
  })
})
