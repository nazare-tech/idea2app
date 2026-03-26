/**
 * Fetch screen data from an existing Stitch project and save as a test fixture.
 *
 * Usage:
 *   node scripts/stitch-fetch-fixture.mjs <projectId>
 *   STITCH_API_KEY=your_key node scripts/stitch-fetch-fixture.mjs 11388488663036883830
 *
 * Reads STITCH_API_KEY from environment (or .env.local).
 * Writes the fixture to src/lib/stitch/test-fixture.json
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

// Load .env.local manually (no dotenv dependency needed)
function loadEnvLocal() {
  try {
    const envPath = resolve(root, ".env.local")
    const lines = readFileSync(envPath, "utf8").split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env.local may not exist
  }
}

loadEnvLocal()

const apiKey = process.env.STITCH_API_KEY
if (!apiKey) {
  console.error("❌ STITCH_API_KEY not set. Add it to .env.local or pass as environment variable.")
  process.exit(1)
}

const projectId = process.argv[2]
if (!projectId) {
  console.error("❌ Usage: node scripts/stitch-fetch-fixture.mjs <projectId>")
  process.exit(1)
}

// Dynamically import the SDK (ESM)
const { StitchToolClient } = await import("@google/stitch-sdk")

const client = new StitchToolClient({ apiKey })

console.log(`\n🔍 Fetching screens for project: ${projectId}\n`)

try {
  // List all screens in the project
  const listRaw = await client.callTool("list_screens", { projectId })
  const screens = listRaw?.screens || []
  console.log(`Found ${screens.length} screens:`)
  screens.forEach((s, i) => console.log(`  [${i}]`, s?.name || s?.id || JSON.stringify(s)))

  if (screens.length === 0) {
    console.error("❌ No screens found in this project.")
    await client.close()
    process.exit(1)
  }

  // Helper: extract bare screen ID
  function screenIdFromItem(item) {
    const name = item?.name || item?.id || item?.screenId || ""
    if (name.includes("/screens/")) return name.split("/screens/")[1]
    return name
  }

  // Take up to 3 screens (or as many as available)
  const targetScreens = screens.slice(0, 3)
  const LABELS = ["A", "B", "C"]

  console.log(`\n⏳ Fetching HTML and image URLs for ${targetScreens.length} screens...`)

  const options = []
  for (let i = 0; i < targetScreens.length; i++) {
    const screenId = screenIdFromItem(targetScreens[i])
    console.log(`  Getting screen ${i + 1}/${targetScreens.length}: ${screenId}`)

    const screenRaw = await client.callTool("get_screen", {
      projectId,
      screenId,
      name: `projects/${projectId}/screens/${screenId}`,
    })

    options.push({
      label: LABELS[i],
      title: `Design Variant ${LABELS[i]}`,
      htmlUrl: screenRaw?.htmlCode?.downloadUrl || "",
      imageUrl: screenRaw?.screenshot?.downloadUrl || "",
    })

    console.log(`    htmlUrl:  ${options[i].htmlUrl ? "✓ " + options[i].htmlUrl.slice(0, 60) + "..." : "❌ missing"}`)
    console.log(`    imageUrl: ${options[i].imageUrl ? "✓ " + options[i].imageUrl.slice(0, 60) + "..." : "❌ missing"}`)
  }

  const fixture = { type: "stitch", options }

  const outPath = resolve(root, "src/lib/stitch/test-fixture.json")
  writeFileSync(outPath, JSON.stringify(fixture, null, 2))

  console.log(`\n✅ Fixture saved to: src/lib/stitch/test-fixture.json`)
  console.log(`   ${options.length} options (${options.map(o => "Option " + o.label).join(", ")})`)
  console.log(`\n💡 Now visit http://localhost:3000/test-mockup to preview the renderer.\n`)
} finally {
  await client.close()
}
