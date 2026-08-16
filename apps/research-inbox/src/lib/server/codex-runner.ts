import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const DEFAULT_TIMEOUT_MS = 45_000
const DEFAULT_OUTPUT_CAP = 1_000
const STDERR_CAP = 1_000

export class CodexUnavailableError extends Error {}

export interface CodexGenerationOptions {
  timeoutMs?: number
  outputCap?: number
  purpose?: string
}

function positiveInteger(value: number | undefined, fallback: number, name: string) {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved <= 0) throw new TypeError(`${name} must be a positive integer`)
  return resolved
}

function safePurpose(value: string | undefined) {
  const purpose = (value || "reply")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return purpose || "reply"
}

function safeEnvironment(): NodeJS.ProcessEnv {
  const allowed = ["PATH", "HOME", "CODEX_HOME", "OPENAI_API_KEY", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR"]
  const environment: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV }
  for (const key of allowed) if (process.env[key]) environment[key] = process.env[key]
  return environment
}

export async function generateWithCodex(prompt: string, options: CodexGenerationOptions = {}) {
  const timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, "timeoutMs")
  const outputCap = positiveInteger(options.outputCap, DEFAULT_OUTPUT_CAP, "outputCap")
  const purpose = safePurpose(options.purpose)
  const directory = await mkdtemp(path.join(os.tmpdir(), `research-inbox-${purpose}-`))
  const outputPath = path.join(directory, `${purpose}.txt`)
  const executable = process.env.RESEARCH_CODEX_PATH || "codex"
  const args = [
    "exec", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check",
    "--ignore-rules", "--ignore-user-config", "--disable", "web_search",
    "--config", 'approval_policy="never"', "--cd", directory,
    "--output-last-message", outputPath, "-",
  ]

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(executable, args, {
        cwd: directory,
        env: safeEnvironment(),
        detached: process.platform !== "win32",
        shell: false,
        stdio: ["pipe", "ignore", "pipe"],
      })
      let stderr = ""
      const timer = setTimeout(() => {
        if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGKILL")
        else child.kill("SIGKILL")
        reject(new CodexUnavailableError("Codex timed out"))
      }, timeoutMs)
      child.stderr.on("data", (chunk) => { if (stderr.length < STDERR_CAP) stderr += String(chunk).slice(0, STDERR_CAP - stderr.length) })
      child.once("error", (error) => { clearTimeout(timer); reject(new CodexUnavailableError(error.message)) })
      child.once("exit", (code) => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new CodexUnavailableError(stderr || `Codex exited with status ${code}`))
      })
      child.stdin.end(prompt)
    })
    const outputSize = (await stat(outputPath)).size
    if (outputSize > outputCap) throw new CodexUnavailableError(`Codex output exceeded the ${outputCap}-byte limit`)
    const reply = (await readFile(outputPath, "utf8")).trim()
    if (!reply) throw new CodexUnavailableError("Codex returned an empty reply")
    return reply
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
