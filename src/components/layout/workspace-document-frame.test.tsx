import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import { WorkspaceDocumentFrame } from "./workspace-document-frame"

test("WorkspaceDocumentFrame matches the workspace document shell dimensions and padding", () => {
  const html = renderToStaticMarkup(
    <WorkspaceDocumentFrame navKey="prd">
      <p>Product Plan</p>
    </WorkspaceDocumentFrame>,
  )

  assert.match(html, /id="prd"/)
  assert.match(html, /data-section="prd"/)
  assert.match(html, /max-w-\[1020px\]/)
  assert.match(html, /px-5 py-6 sm:px-8 lg:px-10 lg:py-8/)
})
