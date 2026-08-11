import assert from "node:assert/strict"
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"

const projectRoot = path.resolve(import.meta.dirname, "../..")
const wrapper = path.join(projectRoot, "scripts/agent-review.sh")

// Every case below stays in --dry-run or fails before the reviewer launches, so
// the suite never spends reviewer-CLI tokens.
function runWrapper(...args: string[]) {
  return spawnSync(wrapper, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, AGENT_IMPLEMENTER: "claude", CLAUDECODE: "1" },
  })
}

async function writePlan(body: string) {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-review-plan-"))
  const planPath = path.join(directory, "some-plan.md")
  await writeFile(planPath, body)
  return planPath
}

test("plan mode builds a bounded plan prompt and routes to the opposite CLI", async () => {
  const planPath = await writePlan("# Plan: thing\n\n## Goal\n\nDo the thing.\n")
  const result = runWrapper("--plan", planPath, "--dry-run")

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stderr, /reviewer=codex exec/)
  assert.match(result.stderr, /scope=the implementation plan .*some-plan\.md, before any of it is built/)
  assert.match(result.stdout, /DRY RUN — would pipe a \d+-byte bounded review prompt/)
})

test("Codex plans route to Opus at medium effort and never Fable", async () => {
  const planPath = await writePlan("# Plan: thing\n\n## Goal\n\nDo the thing.\n")
  const result = runWrapper("--implementer", "codex", "--plan", planPath, "--dry-run")

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stderr, /reviewer=claude -p \(Opus 5 via opus alias, medium effort/)
  assert.match(result.stdout, /--model opus/)
  assert.match(result.stdout, /--effort medium/)
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /fable/i)
})

test("plan mode sends more than the plan file, so system-doc headers are included", async () => {
  const planPath = await writePlan("# Plan: thing\n\n## Goal\n\nDo the thing.\n")
  const planBytes = (await stat(planPath)).size
  const result = runWrapper("--plan", planPath, "--dry-run")

  assert.equal(result.status, 0, result.stderr)
  const promptBytes = Number(/would pipe a (\d+)-byte/.exec(result.stdout)?.[1])
  assert.ok(Number.isFinite(promptBytes), result.stdout)
  // The prompt is the plan plus the plan-lens contract plus a head -7 of every
  // system doc: comfortably larger than the plan alone. A regression that drops
  // the doc-header sweep collapses toward the plan size.
  assert.ok(promptBytes > planBytes + 10_000, `prompt ${promptBytes} vs plan ${planBytes}`)
})

test("post-commit hook only notifies about the sweep and never calls the reviewer", async () => {
  const hook = await readFile(path.join(projectRoot, ".githooks/post-commit"), "utf8")
  const executable = hook
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n")

  assert.match(executable, /sweep-check\.mjs --notify/)
  assert.doesNotMatch(executable, /post-commit-review\.sh/)
  assert.doesNotMatch(executable, /agent-review\.sh/)
})

test("plan mode rejects diff-mode selectors instead of silently ignoring them", async () => {
  const planPath = await writePlan("# Plan: thing\n")

  const withRange = runWrapper("--plan", planPath, "--range", "HEAD~1..HEAD", "--dry-run")
  assert.equal(withRange.status, 2)
  assert.match(withRange.stderr, /mutually exclusive/)

  const withReviewRoot = runWrapper("--plan", planPath, "--review-root", projectRoot, "--dry-run")
  assert.equal(withReviewRoot.status, 2)
  assert.match(withReviewRoot.stderr, /--review-root does not apply/)
})

test("plan mode refuses a missing or empty plan rather than reviewing nothing", async () => {
  const missing = runWrapper("--plan", path.join(tmpdir(), "definitely-absent-plan.md"), "--dry-run")
  assert.equal(missing.status, 2)
  assert.match(missing.stderr, /must be a readable file/)

  const emptyPlan = await writePlan("")
  const empty = runWrapper("--plan", emptyPlan, "--dry-run")
  assert.equal(empty.status, 2)
  assert.match(empty.stderr, /is empty/)
})

test("plan mode applies the same secret-shaped-input refusal as diff mode", async () => {
  const planPath = await writePlan(
    "# Plan: leak\n\nUse this key: sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n",
  )
  const result = runWrapper("--plan", planPath, "--dry-run")

  assert.equal(result.status, 4)
  assert.match(result.stderr, /secret-like material/)
})
