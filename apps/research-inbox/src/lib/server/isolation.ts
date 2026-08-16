import path from "node:path"
import { readdir, readFile } from "node:fs/promises"

const FORBIDDEN_PACKAGES = ["@supabase/", "@makercompass/", "src/lib/supabase", "src/components/layout"]

export function inspectImportSpecifier(specifier: string, appRoot: string, importer: string) {
  if (FORBIDDEN_PACKAGES.some((value) => specifier.includes(value))) return { allowed: false, reason: "forbidden dependency" }
  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(importer), specifier)
    const relative = path.relative(appRoot, resolved)
    if (relative.startsWith("..") || path.isAbsolute(relative)) return { allowed: false, reason: "import escapes standalone app" }
  }
  return { allowed: true }
}

export async function scanStandaloneImports(appRoot: string) {
  const violations: Array<{ importer: string; specifier: string; reason: string }> = []
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) { await walk(target); continue }
      if (!/\.(?:ts|tsx)$/.test(entry.name) || /\.test\.(?:ts|tsx)$/.test(entry.name)) continue
      const contents = await readFile(target, "utf8")
      const importPattern = /(?:from\s+|import\s*\()(["'])([^"']+)\1/g
      for (const match of contents.matchAll(importPattern)) {
        const result = inspectImportSpecifier(match[2], appRoot, target)
        if (!result.allowed) violations.push({ importer: path.relative(appRoot, target), specifier: match[2], reason: result.reason || "not allowed" })
      }
    }
  }
  await walk(path.join(appRoot, "src"))
  return violations
}
