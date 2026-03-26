"use client"

/**
 * DEV-ONLY: Test page for the MockupRenderer with a pre-fetched Stitch fixture.
 *
 * To populate the fixture, run:
 *   node scripts/stitch-fetch-fixture.mjs <projectId>
 *
 * e.g.:
 *   node scripts/stitch-fetch-fixture.mjs 11388488663036883830
 *
 * Then visit http://localhost:3000/test-mockup
 */

import { MockupRenderer } from "@/components/ui/mockup-renderer"
// JSON imports are bundled at build time — no API calls at runtime
import fixtureData from "@/lib/stitch/test-fixture.json"

export default function TestMockupPage() {
  const content = JSON.stringify(fixtureData)

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-100">Stitch Mockup Renderer — Test</h1>
          <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded px-2 py-0.5">DEV ONLY</span>
        </div>
        <p className="text-sm text-zinc-500">
          Rendering from <code className="text-zinc-400">src/lib/stitch/test-fixture.json</code>
          {" "}— no API calls made.
        </p>
        <MockupRenderer content={content} />
      </div>
    </div>
  )
}
