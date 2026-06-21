import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"

import {
  MvpPlanDocumentBlocks,
  PrdDocumentBlocks,
} from "./planning-document-blocks"

test("planning document barrel re-exports Product Plan and First Version renderers", () => {
  const productHtml = renderToStaticMarkup(
    <PrdDocumentBlocks content="# PRD\n\nLoose legacy notes only." projectId="project-1" />,
  )
  const firstVersionHtml = renderToStaticMarkup(
    <MvpPlanDocumentBlocks content="# MVP Plan\n\nLoose legacy notes only." projectId="project-1" />,
  )

  assert.match(productHtml, /Block view unavailable/)
  assert.match(firstVersionHtml, /Block view unavailable/)
})