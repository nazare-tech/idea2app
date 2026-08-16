import { spawn } from "node:child_process"

const MAX_OUTPUT_CHARS = 24_000
const TIMEOUT_MS = 90_000
const ALLOWED_ENV_KEYS = [
  "PATH", "HOME", "CODEX_HOME", "USER", "LOGNAME", "SHELL", "TMPDIR", "TERM",
  "OPENAI_API_KEY", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "SSL_CERT_FILE", "SSL_CERT_DIR",
] as const

export function canUseLocalCodex(userId: string) {
  return process.env.NODE_ENV !== "production" &&
    Boolean(process.env.RESEARCH_CODEX_OPERATOR_USER_ID) &&
    process.env.RESEARCH_CODEX_OPERATOR_USER_ID === userId
}

export async function generateReplyWithCodex(prompt: string): Promise<string> {
  const executable = process.env.RESEARCH_CODEX_CLI_PATH?.trim() || "codex"
  const childEnv: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV }
  for (const key of ALLOWED_ENV_KEYS) {
    const value = process.env[key]
    if (value) childEnv[key] = value
  }

  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["exec", "--ephemeral", "-"], {
      // Reply generation does not need access to the application working tree.
      cwd: "/tmp",
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      env: childEnv,
    })
    let stdout = ""
    let stderr = ""
    let settled = false

    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      callback()
    }
    const timeout = setTimeout(() => {
      child.kill("SIGKILL")
      finish(() => reject(new Error("Codex reply generation timed out.")))
    }, TIMEOUT_MS)

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = (stdout + chunk.toString("utf8")).slice(-MAX_OUTPUT_CHARS)
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-2_000)
    })
    child.on("error", (error) => finish(() => reject(error)))
    child.on("close", (code) => finish(() => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Codex exited with code ${code}.`))
        return
      }
      const reply = stdout.trim()
      if (!reply) {
        reject(new Error("Codex returned an empty reply."))
        return
      }
      resolve(reply)
    }))

    child.stdin.end(prompt)
  })
}
