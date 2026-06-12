import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_WORKSPACE_DOCUMENT,
  isWorkspaceDocumentType,
  resolveWorkspaceDocumentTab,
  shouldRedirectBlockedWorkspaceTab,
} from "./workspace-tab-policy"

test("isWorkspaceDocumentType: blocks archived project tabs globally", () => {
  assert.equal(isWorkspaceDocumentType("prompt"), false)
  assert.equal(isWorkspaceDocumentType("launch"), false)
  assert.equal(isWorkspaceDocumentType("competitive"), true)
  assert.equal(isWorkspaceDocumentType("prd"), true)
})

test("resolveWorkspaceDocumentTab: falls back to the default document for blocked or invalid tabs", () => {
  assert.equal(resolveWorkspaceDocumentTab("prompt"), DEFAULT_WORKSPACE_DOCUMENT)
  assert.equal(resolveWorkspaceDocumentTab("launch"), DEFAULT_WORKSPACE_DOCUMENT)
  assert.equal(resolveWorkspaceDocumentTab("nope"), DEFAULT_WORKSPACE_DOCUMENT)
  assert.equal(resolveWorkspaceDocumentTab(null), DEFAULT_WORKSPACE_DOCUMENT)
})

test("shouldRedirectBlockedWorkspaceTab: prompt and archived launch tabs trigger a silent URL redirect", () => {
  assert.equal(shouldRedirectBlockedWorkspaceTab("prompt"), true)
  assert.equal(shouldRedirectBlockedWorkspaceTab("launch"), true)
  assert.equal(shouldRedirectBlockedWorkspaceTab("competitive"), false)
  assert.equal(shouldRedirectBlockedWorkspaceTab(null), false)
})
