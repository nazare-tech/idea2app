import assert from "node:assert/strict"
import test from "node:test"

import { getSpectralSignalMotion } from "./spectral-signal-motion"

const toRadians = (degrees: number) => degrees * Math.PI / 180

test("spectral signal motion starts from the authored Figma origin", () => {
  assert.deepEqual(getSpectralSignalMotion(0), {
    outer: 0,
    middle: 0,
    inner: 0,
    spin: 0,
  })
})

test("spectral signal motion repeats its envelope every four seconds", () => {
  const firstCycle = getSpectralSignalMotion(1.375)
  const laterCycle = getSpectralSignalMotion(9.375)

  assert.deepEqual(laterCycle, firstCycle)
})

test("spectral signal motion interpolates between sampled Figma keyframes", () => {
  const before = getSpectralSignalMotion(0.08)
  const after = getSpectralSignalMotion(0.12)

  assert.ok(after.outer > before.outer)
  assert.ok(after.middle > before.middle)
  assert.ok(after.spin > before.spin)
  assert.ok(Number.isFinite(after.inner))
})

test("spectral signal motion honors authored nonuniform Figma timestamps", () => {
  assert.ok(Math.abs(getSpectralSignalMotion(1.8272).outer - toRadians(306.074)) < 1e-10)
  assert.ok(Math.abs(getSpectralSignalMotion(0.6672).middle - toRadians(120.961)) < 1e-10)
  assert.ok(Math.abs(getSpectralSignalMotion(0.4112).inner - toRadians(-82.222)) < 1e-10)
  assert.ok(Math.abs(getSpectralSignalMotion(0.9984).spin - toRadians(359.984)) < 1e-10)
})

test("spectral signal motion wraps negative elapsed time safely", () => {
  const wrapped = getSpectralSignalMotion(-0.25)

  for (const angle of Object.values(wrapped)) {
    assert.ok(Number.isFinite(angle))
  }
})
