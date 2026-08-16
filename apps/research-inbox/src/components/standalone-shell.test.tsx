import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { StandaloneShell } from "./standalone-shell"

test("standalone shell has neutral identity and no Maker account chrome", () => {
  const html = renderToStaticMarkup(<StandaloneShell><p>Evidence feed</p></StandaloneShell>)
  assert.match(html, /Research Inbox/)
  assert.match(html, /Local workspace/)
  for (const forbidden of ["Maker Compass", "Projects", "Billing", "Preferences", "Sign in", "Log out"]) {
    assert.doesNotMatch(html, new RegExp(forbidden, "i"))
  }
})
