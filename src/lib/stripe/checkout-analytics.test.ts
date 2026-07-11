import assert from "node:assert/strict"
import test from "node:test"

import {
  buildCheckoutAnalyticsMetadata,
  parseCheckoutAnalyticsInput,
  parseCheckoutAnalyticsMetadata,
} from "@/lib/stripe/checkout-analytics"

const SESSION_ID = "11111111-1111-4111-8111-111111111111"
const PROJECT_ID = "22222222-2222-4222-8222-222222222222"
const ATTRIBUTION_EVENT_ID = "33333333-3333-4333-8333-333333333333"

test("checkout analytics input accepts only controlled attribution", () => {
  assert.deepEqual(parseCheckoutAnalyticsInput({
    sourceSurface: "project_composer",
    sessionId: SESSION_ID,
    projectId: PROJECT_ID,
    attributionEventId: ATTRIBUTION_EVENT_ID,
    experimentVariant: "paywall_v2",
  }), {
    sourceSurface: "project_composer",
    sessionId: SESSION_ID,
    projectId: PROJECT_ID,
    attributionEventId: ATTRIBUTION_EVENT_ID,
    experimentVariant: "paywall_v2",
  })
})

test("invalid attribution falls back or is omitted without breaking checkout", () => {
  assert.deepEqual(parseCheckoutAnalyticsInput({
    sourceSurface: "forged_surface",
    sessionId: "not-a-uuid",
    projectId: "not-a-uuid",
    experimentVariant: "contains private free form text",
  }), { sourceSurface: "billing" })
})

test("Stripe metadata round trips the sanitized attribution context", () => {
  const context = parseCheckoutAnalyticsInput({
    sourceSurface: "billing",
    sessionId: SESSION_ID,
    projectId: PROJECT_ID,
    attributionEventId: ATTRIBUTION_EVENT_ID,
  })
  const metadata = buildCheckoutAnalyticsMetadata(context)

  assert.deepEqual(parseCheckoutAnalyticsMetadata(metadata), context)
  assert.deepEqual(Object.keys(metadata).sort(), [
    "analytics_attribution_event_id",
    "analytics_project_id",
    "analytics_session_id",
    "analytics_source_surface",
  ])
})

test("checkout accepts the browser transport analyticsSessionId field", () => {
  assert.equal(parseCheckoutAnalyticsInput({ analyticsSessionId: SESSION_ID }).sessionId, SESSION_ID)
})
