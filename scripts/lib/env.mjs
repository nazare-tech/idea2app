import { existsSync, readFileSync } from "node:fs"

/**
 * Minimal .env file parser shared by the standalone scripts, so each script
 * does not grow its own loader. Supports comments, quoted values, and values
 * containing '='. Returns {} for a missing file.
 */
export function parseEnvFile(path) {
  if (!existsSync(path)) return {}

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=")
        const key = line.slice(0, separator).trim()
        let value = line.slice(separator + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        return [key, value]
      }),
  )
}

/** Load a .env file into process.env without overriding already-set keys. */
export function loadEnvFileIntoProcess(path) {
  for (const [key, value] of Object.entries(parseEnvFile(path))) {
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}
