import assert from "node:assert/strict"
import { chmod, cp, mkdtemp, mkdir, readFile, realpath, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn, spawnSync } from "node:child_process"
import { once } from "node:events"
import test from "node:test"

const projectRoot = path.resolve(import.meta.dirname, "../..")
const runnerSource = path.join(projectRoot, "scripts/post-commit-review.sh")
const agentReviewerSource = path.join(projectRoot, "scripts/agent-review.sh")

type ReviewStatus = {
  commit: string
  implementer: string
  reviewer: string | null
  status: "passed" | "findings" | "failed" | "skipped"
  timestamp: string
  failureClass?: string
  reason?: string
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
  assert.deepEqual(args.slice(6), [
    "--out",
    path.join(gitDirectory, `agent-reviews/${sha}.txt`),
  ])
  const { timestamp, ...status } = await readStatus(repo, sha)
  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T/)
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

test("unknown implementer skips loudly instead of guessing a reviewer", async () => {
  const repo = await createRepo()
  const sha = await commitFile(repo, ".githooks/example")
  const invocationPath = await installFakeReviewer(repo, { output: "NO FINDINGS" })

  const result = runReview(repo)

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stderr, new RegExp(sha))
  await assert.rejects(readFile(invocationPath, "utf8"), { code: "ENOENT" })
  const status = await readStatus(repo, sha)
  assert.equal(status.status, "skipped")
  assert.equal(status.reason, "unknown_implementer")
  assert.equal(status.reviewer, null)
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
