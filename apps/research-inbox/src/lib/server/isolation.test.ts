import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"

import { inspectImportSpecifier, scanStandaloneImports } from "./isolation"

test("standalone import guard rejects root escapes and Maker dependencies", () => {
  const appRoot = path.resolve(process.cwd())
  assert.equal(inspectImportSpecifier("./request-policy", appRoot, path.join(appRoot, "src/lib/server/file.ts")).allowed, true)
  assert.equal(inspectImportSpecifier("../../../../../../src/lib/supabase/server", appRoot, path.join(appRoot, "src/app/page.tsx")).allowed, false)
  assert.equal(inspectImportSpecifier("@supabase/supabase-js", appRoot, path.join(appRoot, "src/app/page.tsx")).allowed, false)
})

test("resolved standalone source graph has no Maker or Supabase imports", async () => {
  const appRoot = path.resolve(process.cwd())
  assert.deepEqual(await scanStandaloneImports(appRoot), [])
})
