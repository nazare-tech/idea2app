import test from "node:test"
import assert from "node:assert/strict"

import {
  buildLandingAuthModalPath,
  buildLandingIntakeNextPath,
} from "./landing-intake-handoff"

test("buildLandingIntakeNextPath includes autostart without a token", () => {
  assert.equal(buildLandingIntakeNextPath(), "/projects/new?autostart=1")
})

test("buildLandingIntakeNextPath includes intake token before autostart", () => {
  assert.equal(
    buildLandingIntakeNextPath("opaque token"),
    "/projects/new?intake=opaque+token&autostart=1"
  )
})

test("buildLandingAuthModalPath opens signin with safe next path", () => {
  assert.equal(
    buildLandingAuthModalPath("/projects/new?intake=token&autostart=1"),
    "/?modal=auth&mode=signin&next=%2Fprojects%2Fnew%3Fintake%3Dtoken%26autostart%3D1"
  )
})
