import assert from "node:assert/strict"
import { chmod, cp, mkdtemp, mkdir, readdir, readFile, realpath, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn, spawnSync } from "node:child_process"
import { once } from "node:events"
import test from "node:test"

const projectRoot = path.resolve(import.meta.dirname, "../..")
const runnerSource = path.join(projectRoot, "scripts/post-commit-review.sh")
const agentReviewerSource = path.join(projectRoot, "scripts/agent-review.sh")
const pathClassifierSource = path.join(projectRoot, "scripts/code-path-classification.mjs")

type ReviewStatus = {
  commit: string
  implementer: string
  reviewer: string | null
  status: "passed" | "findings" | "failed" | "skipped"
  timestamp: string
  failureClass?: string
  reason?: string
  patchId?: string
  parent?: string
  tree?: string
  duplicateOf?: string
}

function git(repo: string, ...args: string[]) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

async function createRepo() {
  const repo = await mkdtemp(path.join(tmpdir(), "post-commit-review-"))
  await mkdir(path.join(repo, "scripts"), { recursive: true })
  await cp(runnerSource, path.join(repo, "scripts/post-commit-review.sh"))
  await cp(pathClassifierSource, path.join(repo, "scripts/code-path-classification.mjs"))
  await chmod(path.join(repo, "scripts/post-commit-review.sh"), 0o755)

  git(repo, "init", "-q")
  git(repo, "config", "user.email", "test@example.com")
  git(repo, "config", "user.name", "Test User")
  await writeFile(path.join(repo, "README.md"), "initial\n")
  git(repo, "add", "README.md")
  git(repo, "commit", "-qm", "initial")
  return repo
}

async function commitFile(repo: string, relativePath: string, content = "export const value = 1\n") {
  const absolutePath = path.join(repo, relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, content)
  git(repo, "add", relativePath)
  git(repo, "commit", "-qm", `add ${relativePath}`)
  return git(repo, "rev-parse", "HEAD")
}

async function installFakeReviewer(
  repo: string,
  options: {
    output?: string
    stderr?: string
    exitCode?: number
    delaySeconds?: number
    floodBytes?: number
    missingFromReviewRoot?: string
    resistantChildPidPath?: string
  } = {},
) {
  const invocationPath = path.join(repo, ".git/fake-review-invocation.txt")
  const script = `#!/bin/sh
printf '%s\\n' "$@" > "${invocationPath}"
review_root=""
previous=""
for argument in "$@"; do
  if [ "$previous" = "--review-root" ]; then review_root="$argument"; fi
  previous="$argument"
done
${options.missingFromReviewRoot ? `if [ -e "$review_root/${options.missingFromReviewRoot}" ]; then echo "sensitive file entered review root" >&2; exit 9; fi` : ""}
${options.resistantChildPidPath ? `sh -c 'trap "" TERM HUP; while :; do sleep 1; done' & child_pid=$!; echo "$child_pid" > "${options.resistantChildPidPath}"; wait "$child_pid"` : ""}
${options.floodBytes ? `yes x | head -c ${options.floodBytes}` : ""}
${options.delaySeconds ? `sleep ${options.delaySeconds}` : ""}
${options.output ? `printf '%s\\n' '${options.output}'` : ""}
${options.stderr ? `printf '%s\\n' '${options.stderr}' >&2` : ""}
exit ${options.exitCode ?? 0}
`
  const reviewerPath = path.join(repo, "scripts/agent-review.sh")
  await writeFile(reviewerPath, script)
  await chmod(reviewerPath, 0o755)
  return invocationPath
}

type ReviewEnvOverrides = Record<string, string | undefined>

function reviewEnvironment(implementer?: string, extraEnv: ReviewEnvOverrides = {}) {
  const env = { ...process.env }
  delete env.CLAUDECODE
  delete env.CODEX_THREAD_ID
  delete env.AGENT_IMPLEMENTER
  if (implementer !== undefined) env.AGENT_IMPLEMENTER = implementer
  Object.assign(env, extraEnv)

  return env
}

function runReview(
  repo: string,
  implementer?: string,
  extraEnv: ReviewEnvOverrides = {},
  commit?: string,
) {
  const args = ["scripts/post-commit-review.sh"]
  if (commit) args.push(commit)

  return spawnSync("bash", args, {
    cwd: repo,
    env: reviewEnvironment(implementer, extraEnv),
    encoding: "utf8",
  })
}

async function readStatus(repo: string, sha: string) {
  const statusPath = path.join(repo, `.git/agent-reviews/${sha}.json`)
  return JSON.parse(await readFile(statusPath, "utf8")) as ReviewStatus
}

test("routes Codex commits to Claude review with exact immutable commit range", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/example.ts")
  await writeFile(path.join(repo, ".env.e2e.local"), "SECRET=must-not-enter-review-root\n")
  const invocationPath = await installFakeReviewer(repo, {
    output: "NO FINDINGS",
    missingFromReviewRoot: ".env.e2e.local",
  })
  await writeFile(path.join(repo, "src/uncommitted.ts"), "export const dirty = true\n")

  const result = runReview(repo, "codex")

  assert.equal(result.status, 0, result.stderr)
  const args = (await readFile(invocationPath, "utf8")).trim().split("\n")
  const gitDirectory = await realpath(path.join(repo, ".git"))
  assert.deepEqual(args.slice(0, 6), [
    "--implementer",
    "codex",
    "--range",
    `${sha}^..${sha}`,
    "--review-root",
    args[5],
  ])
  assert.match(args[5] ?? "", /agent-review\./)
  // The runner's captured stdout stream is the single artifact writer; no --out.
  assert.deepEqual(args.slice(6), [])
  const { timestamp, patchId, parent, tree, ...status } = await readStatus(repo, sha)
  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T/)
  assert.match(patchId ?? "", /^[0-9a-f]{40,64}$/)
  assert.equal(parent, git(repo, "rev-parse", `${sha}^`))
  assert.equal(tree, git(repo, "rev-parse", `${sha}^{tree}`))
  assert.deepEqual(status, {
    commit: sha,
    implementer: "codex",
    reviewer: "claude",
    status: "passed",
  })
  const statusMode = (await stat(path.join(gitDirectory, `agent-reviews/${sha}.json`))).mode & 0o777
  assert.equal(statusMode, 0o600)
})

test("routes Claude commits to Codex review", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "scripts/example.sh", "#!/bin/sh\n")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const result = runReview(repo, "claude")

  assert.equal(result.status, 0, result.stderr)
  const args = await readFile(invocationPath, "utf8")
  assert.match(args, /--implementer\nclaude\n/)
  const status = await readStatus(repo, sha)
  assert.equal(status.reviewer, "codex")
  assert.equal(status.status, "passed")
})

test("reviews code paths and skips docs-only commits without invoking reviewer", async () => {
  const repo = await createRepo()
  const docsSha = await commitFile(repo, "docs/notes.md", "notes\n")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const docsResult = runReview(repo, "codex")

  assert.equal(docsResult.status, 0, docsResult.stderr)
  await assert.rejects(readFile(invocationPath, "utf8"), { code: "ENOENT" })
  assert.match(docsResult.stderr, new RegExp(docsSha))
  const { timestamp, ...status } = await readStatus(repo, docsSha)
  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(status, {
    commit: docsSha,
    implementer: "codex",
    reviewer: "claude",
    status: "skipped",
    reason: "no_reviewable_paths",
  })

  const codeSha = await commitFile(repo, "e2e/example.spec.ts")
  const codeResult = runReview(repo, "codex")
  assert.equal(codeResult.status, 0, codeResult.stderr)
  assert.match(await readFile(invocationPath, "utf8"), new RegExp(codeSha))

  const workflowSha = await commitFile(repo, ".agents/skills/example/SKILL.md", "# Example\n")
  const workflowResult = runReview(repo, "codex")
  assert.equal(workflowResult.status, 0, workflowResult.stderr)
  assert.match(await readFile(invocationPath, "utf8"), new RegExp(workflowSha))
})

test("persists findings status and reviewer output", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "supabase/functions/example.ts")
  const finding = "MAJOR security src/example.ts:1 — unsafe input. Failure. Fix: validate."
  await installFakeReviewer(repo, { output: finding })

  const result = runReview(repo, "codex")

  assert.equal(result.status, 0, result.stderr)
  assert.equal((await readStatus(repo, sha)).status, "findings")
  assert.equal(
    (await readFile(path.join(repo, `.git/agent-reviews/${sha}.txt`), "utf8")).trim(),
    finding,
  )
})

test("does not accept noisy output containing NO FINDINGS as a pass", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/example.ts")
  await installFakeReviewer(repo, { output: "unexpected preface\\nNO FINDINGS" })

  const result = runReview(repo, "codex")

  assert.equal(result.status, 0, result.stderr)
  assert.equal((await readStatus(repo, sha)).status, "findings")
})

test("reviews a root code commit against the empty tree", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "post-commit-review-root-"))
  await mkdir(path.join(repo, "scripts"), { recursive: true })
  await cp(runnerSource, path.join(repo, "scripts/post-commit-review.sh"))
  await cp(pathClassifierSource, path.join(repo, "scripts/code-path-classification.mjs"))
  await chmod(path.join(repo, "scripts/post-commit-review.sh"), 0o755)
  git(repo, "init", "-q")
  git(repo, "config", "user.email", "test@example.com")
  git(repo, "config", "user.name", "Test User")
  await mkdir(path.join(repo, "src"))
  await writeFile(path.join(repo, "src/root.ts"), "export const root = true\n")
  git(repo, "add", "src/root.ts")
  git(repo, "commit", "-qm", "root code")
  const sha = git(repo, "rev-parse", "HEAD")
  const emptyTree = git(repo, "hash-object", "-t", "tree", "/dev/null")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const result = runReview(repo, "codex")

  assert.equal(result.status, 0, result.stderr)
  const args = await readFile(invocationPath, "utf8")
  assert.match(args, new RegExp(`${emptyTree}\\.\\.${sha}`))
  assert.equal((await readStatus(repo, sha)).status, "passed")
})

test("can retry an older commit by fetching that SHA and its parent", async () => {
  const repo = await createRepo()
  const olderSha = await commitFile(repo, "src/older.ts", "export const older = true\n")
  await commitFile(repo, "src/newer.ts", "export const newer = true\n")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const result = runReview(repo, "codex", {}, olderSha)

  assert.equal(result.status, 0, result.stderr)
  assert.match(await readFile(invocationPath, "utf8"), new RegExp(olderSha))
  assert.equal((await readStatus(repo, olderSha)).status, "passed")
})

test("reuses a successful review for an amend-equivalent patch", async () => {
  const repo = await createRepo()
  const originalSha = await commitFile(repo, "src/example.ts")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const originalResult = runReview(repo, "codex")
  assert.equal(originalResult.status, 0, originalResult.stderr)
  await readFile(invocationPath, "utf8")

  await writeFile(invocationPath, "")
  git(repo, "commit", "--amend", "-qm", "rewrite message only")
  const amendedSha = git(repo, "rev-parse", "HEAD")
  assert.notEqual(amendedSha, originalSha)

  const amendedResult = runReview(repo, "codex")
  assert.equal(amendedResult.status, 0, amendedResult.stderr)
  assert.equal((await readFile(invocationPath, "utf8")).trim(), "")
  const status = await readStatus(repo, amendedSha)
  assert.equal(status.status, "passed")
  assert.equal(status.reason, "duplicate_patch")
  assert.equal(status.duplicateOf, originalSha)
  assert.match(status.patchId ?? "", /^[0-9a-f]{40,64}$/)
  assert.equal(status.parent, (await readStatus(repo, originalSha)).parent)
  assert.equal(
    (await readFile(path.join(repo, `.git/agent-reviews/${amendedSha}.txt`), "utf8")).trim(),
    "NO FINDINGS",
  )
})

test("reviews an amended commit when its patch content changes", async () => {
  const repo = await createRepo()
  const originalSha = await commitFile(repo, "src/example.ts")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })
  assert.equal(runReview(repo, "codex").status, 0)

  await writeFile(invocationPath, "")
  await writeFile(path.join(repo, "src/example.ts"), "export const value = 2\n")
  git(repo, "add", "src/example.ts")
  git(repo, "commit", "--amend", "-qm", "change patch")
  const amendedSha = git(repo, "rev-parse", "HEAD")
  assert.notEqual(amendedSha, originalSha)

  const result = runReview(repo, "codex")
  assert.equal(result.status, 0, result.stderr)
  assert.match(await readFile(invocationPath, "utf8"), new RegExp(amendedSha))
  const status = await readStatus(repo, amendedSha)
  assert.equal(status.status, "passed")
  assert.equal(status.duplicateOf, undefined)
})

test("does not reuse a stable patch id when whitespace changes the resulting tree", async () => {
  const repo = await createRepo()
  const originalSha = await commitFile(
    repo,
    "src/example.py",
    "def value():\n    if True:\n        return 1\n",
  )
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })
  assert.equal(runReview(repo, "codex").status, 0)

  await writeFile(invocationPath, "")
  await writeFile(
    path.join(repo, "src/example.py"),
    "def value():\n    if True:\n            return 1\n",
  )
  git(repo, "add", "src/example.py")
  git(repo, "commit", "--amend", "-qm", "whitespace changes semantics")
  const amendedSha = git(repo, "rev-parse", "HEAD")

  assert.notEqual(amendedSha, originalSha)
  const originalStatus = await readStatus(repo, originalSha)
  const result = runReview(repo, "codex")
  assert.equal(result.status, 0, result.stderr)
  assert.match(await readFile(invocationPath, "utf8"), new RegExp(amendedSha))
  const amendedStatus = await readStatus(repo, amendedSha)
  assert.equal(amendedStatus.patchId, originalStatus.patchId)
  assert.notEqual(amendedStatus.tree, originalStatus.tree)
  assert.equal(amendedStatus.duplicateOf, undefined)
})

test("fails closed when code-path classification cannot run", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/example.ts")
  await writeFile(path.join(repo, "scripts/code-path-classification.mjs"), "syntax error !!!\n")
  await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const result = runReview(repo, "codex")

  assert.equal(result.status, 2)
  assert.match(result.stderr, /classification failed/)
  const status = await readStatus(repo, sha)
  assert.equal(status.status, "failed")
  assert.equal(status.failureClass, "path_classification_error")
})

test("performs a fresh review when a reusable artifact is corrupt", async () => {
  const repo = await createRepo()
  const originalSha = await commitFile(repo, "src/example.ts")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })
  assert.equal(runReview(repo, "codex").status, 0)
  await writeFile(path.join(repo, `.git/agent-reviews/${originalSha}.txt`), "")

  await writeFile(invocationPath, "")
  git(repo, "commit", "--amend", "-qm", "message-only amend")
  const amendedSha = git(repo, "rev-parse", "HEAD")
  const result = runReview(repo, "codex")

  assert.equal(result.status, 0, result.stderr)
  assert.match(await readFile(invocationPath, "utf8"), new RegExp(amendedSha))
  assert.equal((await readStatus(repo, amendedSha)).duplicateOf, undefined)
})

test("times out a hung reviewer and records the unreviewed SHA", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/example.ts")
  const childPidPath = path.join(repo, ".git/resistant-reviewer-child.pid")
  await installFakeReviewer(repo, { resistantChildPidPath: childPidPath })

  const result = runReview(repo, "codex", { AGENT_REVIEW_TIMEOUT_SECONDS: "1" })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, new RegExp(sha))
  assert.equal((await readStatus(repo, sha)).failureClass, "timeout")
  const childPid = Number(await readFile(childPidPath, "utf8"))
  const childState = spawnSync("ps", ["-o", "stat=", "-p", String(childPid)], { encoding: "utf8" })
  assert.ok(childState.status !== 0 || /^Z/.test(childState.stdout.trim()), childState.stdout)
})

test("interrupting the runner terminates its reviewer process group", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/example.ts")
  const childPidPath = path.join(repo, ".git/interrupted-reviewer-child.pid")
  await installFakeReviewer(repo, { resistantChildPidPath: childPidPath })
  const runner = spawn("bash", ["scripts/post-commit-review.sh"], {
    cwd: repo,
    env: reviewEnvironment("codex"),
    stdio: "ignore",
  })

  let childPid = 0
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      childPid = Number(await readFile(childPidPath, "utf8"))
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  assert.ok(childPid > 0, "fake reviewer child did not start")
  runner.kill("SIGTERM")
  await once(runner, "close")

  assert.equal((await readStatus(repo, sha)).failureClass, "interrupted")
  const childState = spawnSync("ps", ["-o", "stat=", "-p", String(childPid)], { encoding: "utf8" })
  assert.ok(childState.status !== 0 || /^Z/.test(childState.stdout.trim()), childState.stdout)
})

for (const failure of [
  { name: "usage limit", message: "usage limit reached; retry later", failureClass: "usage_limit" },
  { name: "network", message: "Unable to connect to API: network unavailable", failureClass: "network" },
  { name: "unknown reviewer error", message: "reviewer crashed unexpectedly", failureClass: "reviewer_error" },
]) {
  test(`records ${failure.name} as failed and names unreviewed SHA`, async () => {
    const repo = await createRepo()
    const sha = await commitFile(repo, "src/example.ts")
    await installFakeReviewer(repo, { stderr: failure.message, exitCode: 1 })

    const result = runReview(repo, "codex")

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, new RegExp(sha))
    const status = await readStatus(repo, sha)
    assert.equal(status.status, "failed")
    assert.equal(status.failureClass, failure.failureClass)
  })
}

test("unknown implementer on a code commit fails loudly instead of guessing a reviewer", async () => {
  const repo = await createRepo()
  const docsSha = await commitFile(repo, "docs/notes.md", "notes\n")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const docsResult = runReview(repo)
  assert.equal(docsResult.status, 0, docsResult.stderr)
  const docsStatus = await readStatus(repo, docsSha)
  assert.equal(docsStatus.status, "skipped")
  assert.equal(docsStatus.reason, "no_reviewable_paths")

  const codeSha = await commitFile(repo, ".githooks/example")
  const result = runReview(repo)

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, new RegExp(codeSha))
  assert.match(result.stderr, /NOT REVIEWED/)
  await assert.rejects(readFile(invocationPath, "utf8"), { code: "ENOENT" })
  const status = await readStatus(repo, codeSha)
  assert.equal(status.status, "skipped")
  assert.equal(status.reason, "unknown_implementer")
  assert.equal(status.reviewer, null)
})

test("unresolvable commit argument fails fast without a ledger entry", async () => {
  const repo = await createRepo()
  await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const result = runReview(repo, "codex", {}, "deadbeef123")

  assert.equal(result.status, 2)
  assert.match(result.stderr, /unknown commit/)
  const entries = await readdir(path.join(repo, ".git/agent-reviews")).catch(() => [])
  assert.deepEqual(entries.filter((name) => name.startsWith("deadbeef")), [])
})

test("size-cap kill escalates to SIGKILL for TERM-resistant flooders", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/example.ts")
  const pidPath = path.join(repo, ".git/flooder.pid")
  // A TERM-immune child floods stdout; the leader dies on the size-cap TERM,
  // so only the unconditional post-wait group SIGKILL can stop the child.
  const reviewerPath = path.join(repo, "scripts/agent-review.sh")
  await writeFile(
    reviewerPath,
    `#!/bin/sh
sh -c 'trap "" TERM HUP; while :; do printf "%08192d" 0; done' &
child=$!
echo "$child" > "${pidPath}"
wait "$child"
`,
  )
  await chmod(reviewerPath, 0o755)

  const result = runReview(repo, "codex", {
    AGENT_REVIEW_MAX_OUTPUT_BYTES: "4096",
    AGENT_REVIEW_TIMEOUT_SECONDS: "120",
  })

  assert.equal(result.status, 2, result.stderr)
  assert.match(result.stderr, /output exceeded/)
  const flooderPid = Number((await readFile(pidPath, "utf8")).trim())
  assert.ok(Number.isInteger(flooderPid) && flooderPid > 0)
  await new Promise((resolve) => setTimeout(resolve, 1500))
  let flooderAlive = true
  try {
    process.kill(flooderPid, 0)
  } catch {
    flooderAlive = false
  }
  assert.equal(flooderAlive, false, "TERM-resistant flooder must be SIGKILLed")
  const artifact = await stat(path.join(repo, `.git/agent-reviews/${sha}.txt`))
  assert.ok(artifact.size < 8192, `artifact must stay truncated, got ${artifact.size}`)
})

test("runaway reviewer output is killed and classified output_too_large before timeout", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/example.ts")
  await installFakeReviewer(repo, { floodBytes: 100000, delaySeconds: 30 })

  const startedAt = Date.now()
  const result = runReview(repo, "codex", {
    AGENT_REVIEW_MAX_OUTPUT_BYTES: "4096",
    AGENT_REVIEW_TIMEOUT_SECONDS: "120",
  })

  assert.equal(result.status, 2, result.stderr)
  assert.ok(Date.now() - startedAt < 25_000, "runaway reviewer must be killed by the size poll, not the timeout")
  assert.match(result.stderr, /output exceeded/)
  const status = await readStatus(repo, sha)
  assert.equal(status.status, "failed")
  assert.equal(status.failureClass, "output_too_large")
  const artifact = await readFile(path.join(repo, `.git/agent-reviews/${sha}.txt`), "utf8")
  assert.match(artifact, /\[review artifact truncated\]/)
  assert.ok(artifact.length < 6000)
})

test("agent reviewer dry runs both CLIs with project context and model tools disabled", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/example.ts")
  await cp(agentReviewerSource, path.join(repo, "scripts/agent-review.sh"))
  await chmod(path.join(repo, "scripts/agent-review.sh"), 0o755)

  const claudeReview = spawnSync(
    "bash",
    ["scripts/agent-review.sh", "--dry-run", "--implementer", "codex", "--range", `${sha}^..${sha}`],
    { cwd: repo, encoding: "utf8" },
  )
  assert.equal(claudeReview.status, 0, claudeReview.stderr)
  assert.match(claudeReview.stdout, /--safe-mode/)
  assert.match(claudeReview.stdout, /--strict-mcp-config/)
  assert.match(claudeReview.stdout, /--tools ''/)

  const codexReview = spawnSync(
    "bash",
    ["scripts/agent-review.sh", "--dry-run", "--implementer", "claude", "--range", `${sha}^..${sha}`],
    { cwd: repo, encoding: "utf8" },
  )
  assert.equal(codexReview.status, 0, codexReview.stderr)
  assert.match(codexReview.stdout, /--disable shell_tool/)
  assert.match(codexReview.stdout, /--disable multi_agent/)
  assert.match(codexReview.stdout, /--skip-git-repo-check/)
  assert.match(codexReview.stdout, /CODEX_HOME=.*agent-review-exec/)
  assert.doesNotMatch(codexReview.stdout, new RegExp(`${process.env.HOME}/\\.codex`))
})

test("agent reviewer refuses to export a diff containing secret-like material", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, "src/secret.ts", 'export const leaked = "sk_live_1234567890abcdef"\n')
  await cp(agentReviewerSource, path.join(repo, "scripts/agent-review.sh"))
  await chmod(path.join(repo, "scripts/agent-review.sh"), 0o755)

  const result = spawnSync(
    "bash",
    ["scripts/agent-review.sh", "--dry-run", "--implementer", "codex", "--range", `${sha}^..${sha}`],
    { cwd: repo, encoding: "utf8" },
  )

  assert.equal(result.status, 4)
  assert.match(result.stderr, /secret-like material/)
  assert.doesNotMatch(result.stderr, /sk_live_/)

  const openRouterSha = await commitFile(
    repo,
    "src/openrouter.ts",
    'export const leaked = "sk-or-v1-0123456789abcdef0123456789abcdef"\n',
  )
  const openRouterResult = spawnSync(
    "bash",
    ["scripts/agent-review.sh", "--dry-run", "--implementer", "codex", "--range", `${openRouterSha}^..${openRouterSha}`],
    { cwd: repo, encoding: "utf8" },
  )

  assert.equal(openRouterResult.status, 4)
  assert.match(openRouterResult.stderr, /secret-like material/)
  assert.doesNotMatch(openRouterResult.stderr, /sk-or-v1/)
})

test("agent reviewer never dereferences a tracked symlink into host files", async () => {
  const repo = await createRepo()
  const hostSecret = path.join(await mkdtemp(path.join(tmpdir(), "review-host-secret-")), "secret.txt")
  const secretValue = "host-secret-must-never-enter-review-prompt"
  await writeFile(hostSecret, `${secretValue}\n`)
  await mkdir(path.join(repo, "src"), { recursive: true })
  await symlink(hostSecret, path.join(repo, "src/context.ts"))
  git(repo, "add", "src/context.ts")
  git(repo, "commit", "-qm", "add context link")
  const sha = git(repo, "rev-parse", "HEAD")
  await cp(agentReviewerSource, path.join(repo, "scripts/agent-review.sh"))
  await chmod(path.join(repo, "scripts/agent-review.sh"), 0o755)
  const fakeBin = path.join(repo, ".git/fake-bin")
  const capturedPrompt = path.join(repo, ".git/captured-review-prompt.txt")
  await mkdir(fakeBin)
  await writeFile(
    path.join(fakeBin, "claude"),
    `#!/bin/sh\ncat > "${capturedPrompt}"\nprintf 'NO FINDINGS\\n'\n`,
  )
  await chmod(path.join(fakeBin, "claude"), 0o755)

  const result = spawnSync(
    "bash",
    ["scripts/agent-review.sh", "--implementer", "codex", "--range", `${sha}^..${sha}`],
    {
      cwd: repo,
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` },
      encoding: "utf8",
    },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), "NO FINDINGS")
  assert.doesNotMatch(await readFile(capturedPrompt, "utf8"), new RegExp(secretValue))
})
