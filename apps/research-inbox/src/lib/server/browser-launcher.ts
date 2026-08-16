import { execFile } from "node:child_process"
import { promisify } from "node:util"

import type { BrowserMode } from "../research/types"

const execFileAsync = promisify(execFile)

export async function launchBrowser(mode: BrowserMode, url: URL) {
  if (process.platform === "darwin") {
    const names: Partial<Record<BrowserMode, string>> = { chrome: "Google Chrome", safari: "Safari", firefox: "Firefox", arc: "Arc" }
    const args = mode === "default" ? [url.href] : ["-a", names[mode]!, url.href]
    await execFileAsync("open", args, { timeout: 10_000, windowsHide: true })
    return
  }
  if (mode !== "default") throw new Error("Named browser selection is currently supported on macOS")
  const command = process.platform === "win32" ? "rundll32" : "xdg-open"
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url.href] : [url.href]
  await execFileAsync(command, args, { timeout: 10_000, windowsHide: true })
}
