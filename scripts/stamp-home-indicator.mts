#!/usr/bin/env -S npx tsx
/**
 * Stamps the exact iOS home indicator onto generated native-mobile validation images,
 * using the same runtime module the production pipeline runs after generation
 * (src/lib/mockups/home-indicator.ts), so validation batches show precisely what a real
 * run would ship.
 *
 * Usage:
 *   npx tsx scripts/stamp-home-indicator.mts --root <batch-root>
 *
 * Processes every <idea>/images/native-mobile-app-option-*.png under the root, in place.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

import { stampMockupHomeIndicator } from "../src/lib/mockups/home-indicator"

const USAGE = "Usage: npx tsx scripts/stamp-home-indicator.mts --root <batch-root>"

function parseArgs(argv: string[]) {
  const args: { root?: string; help: boolean } = { help: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") {
      const value = argv[i + 1]
      if (!value || value.startsWith("-")) throw new Error(`--root needs a path value\n${USAGE}`)
      args.root = argv[++i]
    } else if (argv[i] === "--help" || argv[i] === "-h") args.help = true
    else throw new Error(`Unknown argument: ${argv[i]}\n${USAGE}`)
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.root) {
    console.log(USAGE)
    if (!args.help) process.exitCode = 2
    return
  }

  let stamped = 0
  for (const entry of readdirSync(args.root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const imagesDir = join(args.root, entry.name, "images")
    if (!existsSync(imagesDir)) continue

    for (const name of readdirSync(imagesDir)) {
      if (!/^native-mobile-app-option-[abc]\.png$/.test(name)) continue
      const path = join(imagesDir, name)
      const output = await stampMockupHomeIndicator(readFileSync(path))
      writeFileSync(path, output)
      stamped++
      console.log(`stamped ${entry.name}/${name}`)
    }
  }
  console.log(`${stamped} images stamped`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
