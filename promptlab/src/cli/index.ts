#!/usr/bin/env node

import { createPromptLabInitFiles } from "./init.js"

async function main() {
  const [, , command, ...args] = process.argv
  const force = args.includes("--force")

  if (command !== "init") {
    printHelp()
    process.exit(command ? 1 : 0)
  }

  const result = await createPromptLabInitFiles({ cwd: process.cwd(), force })
  console.log("PromptLab initialized.")
  for (const file of result.created) {
    console.log(`- ${file}`)
  }
  console.log("")
  console.log("Next: ask your coding agent to follow PROMPTLAB_AGENT_HANDOFF.md.")
}

function printHelp() {
  console.log(`PromptLab

Usage:
  promptlab init [--force]
`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
