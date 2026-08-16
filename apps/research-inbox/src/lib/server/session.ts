import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { mkdir, open, readFile } from "node:fs/promises"
import path from "node:path"

const TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1_000
const directory = path.join(process.cwd(), ".local")
const secretPath = path.join(directory, "launch-secret")

async function getSecret() {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  try {
    const file = await open(secretPath, "wx", 0o600)
    try { await file.writeFile(randomBytes(32)) } finally { await file.close() }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
  }
  return readFile(secretPath)
}

export async function issueLaunchToken() {
  const payload = `${Date.now() + TOKEN_LIFETIME_MS}.${randomBytes(18).toString("base64url")}`
  const signature = createHmac("sha256", await getSecret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export async function hasValidLaunchToken(headers: Headers) {
  const supplied = headers.get("x-research-token") || ""
  const parts = supplied.split(".")
  if (parts.length !== 3 || !Number.isFinite(Number(parts[0])) || Number(parts[0]) < Date.now()) return false
  const payload = `${parts[0]}.${parts[1]}`
  const expected = createHmac("sha256", await getSecret()).update(payload).digest()
  const received = Buffer.from(parts[2], "base64url")
  return expected.length === received.length && timingSafeEqual(expected, received)
}
