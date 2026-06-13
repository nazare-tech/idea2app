"use client"

export type ClipboardCopyMethod = "async-clipboard" | "exec-command"

export async function copyTextToClipboard(text: string): Promise<ClipboardCopyMethod> {
  const clipboard = globalThis.navigator?.clipboard

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text)
      return "async-clipboard"
    } catch {
      // Fall back for embedded browsers or permission-limited contexts.
    }
  }

  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    throw new Error("Clipboard copy is not available in this browser.")
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.top = "0"
  textarea.style.left = "0"
  textarea.style.width = "1px"
  textarea.style.height = "1px"
  textarea.style.opacity = "0"
  textarea.style.pointerEvents = "none"

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy command was rejected.")
    }
    return "exec-command"
  } finally {
    textarea.remove()
  }
}
