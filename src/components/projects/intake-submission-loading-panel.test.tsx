import test from "node:test"
import assert from "node:assert/strict"

import {
  INTAKE_FAKE_PROGRESS_DURATION_MS,
  INTAKE_MAX_FAKE_PROGRESS,
  getNextIntakeProgressValue,
  getTimedIntakeProgress,
  shouldAnimateIntakeProgress,
  statusMessage,
  type IntakeLoadingRow,
} from "./intake-submission-loading-panel"

test("getTimedIntakeProgress: reaches fake cap after the slower onboarding duration", () => {
  assert.equal(INTAKE_FAKE_PROGRESS_DURATION_MS, 40000)
  assert.equal(getTimedIntakeProgress(INTAKE_FAKE_PROGRESS_DURATION_MS / 2, false), 45)
  assert.equal(getTimedIntakeProgress(INTAKE_FAKE_PROGRESS_DURATION_MS, false), INTAKE_MAX_FAKE_PROGRESS)
  assert.equal(getTimedIntakeProgress(INTAKE_FAKE_PROGRESS_DURATION_MS * 2, false), INTAKE_MAX_FAKE_PROGRESS)
})

test("getNextIntakeProgressValue: keeps pending onboarding rows at zero", () => {
  assert.equal(getNextIntakeProgressValue("pending", undefined, 35), 0)
  assert.equal(getNextIntakeProgressValue("pending", 40, 60), 0)
})

test("getNextIntakeProgressValue: advances only generating rows and completes done rows", () => {
  assert.equal(getNextIntakeProgressValue("generating", undefined, 35), 35)
  assert.equal(getNextIntakeProgressValue("generating", 45, 35), 45)
  assert.equal(getNextIntakeProgressValue("done", 45, 60), 100)
})

test("shouldAnimateIntakeProgress: waits until the fill can visually carry the shimmer", () => {
  assert.equal(shouldAnimateIntakeProgress("generating", 8), false)
  assert.equal(shouldAnimateIntakeProgress("generating", 12), true)
  assert.equal(shouldAnimateIntakeProgress("pending", 40), false)
})

test("statusMessage: pending rows do not imply downstream work has started", () => {
  const row: IntakeLoadingRow = {
    key: "prd",
    label: "Product Plan",
    message: "Drafting requirements",
    status: "pending",
  }

  assert.equal(statusMessage(row), "Waiting")
})
