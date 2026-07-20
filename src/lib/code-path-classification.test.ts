import assert from "node:assert/strict"
import path from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"

const projectRoot = path.resolve(import.meta.dirname, "../..")
const classifier = path.join(projectRoot, "scripts/code-path-classification.mjs")

function classify(paths: string[]) {
  return spawnSync("node", [classifier, "--reviewable-stdin"], {
    cwd: projectRoot,
    input: `${paths.join("\n")}\n`,
    encoding: "utf8",
  })
}

test("shared code-path classifier covers code and workflow paths", () => {
  for (const reviewablePath of [
    "src/example.ts",
    "scripts/example.sh",
    "e2e/example.spec.ts",
    ".agents/skills/example/SKILL.md",
    "docs/operating-system/review-personas.md",
    "package.json",
    "next.config.ts",
  ]) {
    assert.equal(classify([reviewablePath]).status, 0, reviewablePath)
  }
})

test("shared code-path classifier excludes ordinary docs and lockfiles", () => {
  assert.equal(classify(["docs/notes.md", "package-lock.json"]).status, 3)
  assert.equal(classify(["docs/notes.md", "src/example.ts"]).status, 0)
})
