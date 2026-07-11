import assert from "node:assert/strict"
import test from "node:test"

import {
  CLIENT_PRODUCT_EVENT_NAMES,
  MAX_PRODUCT_EVENTS_PER_BATCH,
  PRODUCT_EVENT_REGISTRY,
  PRODUCT_EVENT_SCHEMA_VERSION,
  ProductEventValidationError,
  SERVER_PRODUCT_EVENT_NAMES,
  validateClientEventBatch,
  validateServerEvent,
  type ClientProductEventName,
  type ProductEventInput,
  type ProductEventPropertyMap,
  type ServerProductEventName,
} from "./contracts"

const NOW = new Date("2026-07-11T12:00:00.000Z")
const EVENT_ID = "11111111-1111-4111-8111-111111111111"
const SESSION_ID = "22222222-2222-4222-8222-222222222222"
const PROJECT_ID = "33333333-3333-4333-8333-333333333333"
const RUN_ID = "44444444-4444-4444-8444-444444444444"

const clientProperties: { [N in ClientProductEventName]: ProductEventPropertyMap[N] } = {
  workspace_session_started: { entrySectionId: "executive-summary", viewportClass: "desktop" },
  workspace_section_reached: { sectionId: "mockups", navigationMethod: "scroll", contentState: "ready" },
  workspace_nav_clicked: { fromSectionId: "prd", targetSectionId: "mvp" },
  workspace_session_ended: { activeDurationMs: 42_000, deepestSectionId: "ai-prompts", lastSectionId: "mockups", reachedSectionCount: 6 },
  mockup_concept_impression: { conceptIndex: 1, contentState: "ready" },
  mockup_concept_opened: { conceptIndex: 1, surface: "card" },
  mockup_concept_copied: { conceptIndex: 2, surface: "lightbox" },
  mockup_concept_downloaded: { conceptIndex: 3, surface: "lightbox" },
  prompt_file_impression: { fileName: "first-prompt.md" },
  prompt_file_opened: { fileName: "build-steps.md", surface: "card" },
  prompt_file_copied: { fileName: "project-context.md", surface: "lightbox" },
  prompt_file_downloaded: { fileName: "sub-agents.md", surface: "lightbox" },
  upgrade_cta_viewed: { surface: "project_composer", experimentVariant: "control" },
  upgrade_cta_clicked: { surface: "billing" },
}

const serverProperties: { [N in ServerProductEventName]: ProductEventPropertyMap[N] } = {
  project_created: { creationSource: "intake" },
  generation_started: { runId: RUN_ID, mode: "onboarding" },
  generation_step_completed: { runId: RUN_ID, mode: "generate_all", documentType: "competitive", durationMs: 5_000 },
  generation_completed: { runId: RUN_ID, mode: "generate_all", durationMs: 15_000 },
  generation_failed: { runId: RUN_ID, mode: "retry", documentType: "mockups", failureKind: "provider" },
  checkout_started: { checkoutSessionId: "cs_test_123", planKey: "pro", sourceSurface: "project_composer", experimentVariant: "control" },
  checkout_completed: { checkoutSessionId: "cs_test_123", subscriptionId: "sub_123", planKey: "pro" },
  subscription_cancel_requested: { subscriptionId: "sub_123", planKey: "pro", cancelAtPeriodEnd: true },
  subscription_canceled: { subscriptionId: "sub_123", planKey: "pro", cancellationReason: "requested" },
}

function clientEvent<N extends ClientProductEventName>(eventName: N): ProductEventInput<N> & { sessionId: string } {
  return {
    eventId: EVENT_ID,
    eventName,
    schemaVersion: PRODUCT_EVENT_SCHEMA_VERSION,
    occurredAt: NOW.toISOString(),
    sessionId: SESSION_ID,
    projectId: PROJECT_ID,
    properties: clientProperties[eventName] as ProductEventPropertyMap[N],
  }
}

function serverEvent<N extends ServerProductEventName>(eventName: N): ProductEventInput<N> {
  return {
    eventId: EVENT_ID,
    eventName,
    schemaVersion: PRODUCT_EVENT_SCHEMA_VERSION,
    occurredAt: NOW.toISOString(),
    projectId: PROJECT_ID,
    properties: serverProperties[eventName] as ProductEventPropertyMap[N],
  }
}

test("registry covers every version-one event once with the correct source", () => {
  assert.deepEqual(Object.keys(PRODUCT_EVENT_REGISTRY).sort(), [...CLIENT_PRODUCT_EVENT_NAMES, ...SERVER_PRODUCT_EVENT_NAMES].sort())
  for (const name of CLIENT_PRODUCT_EVENT_NAMES) assert.equal(PRODUCT_EVENT_REGISTRY[name].source, "client")
  for (const name of SERVER_PRODUCT_EVENT_NAMES) assert.equal(PRODUCT_EVENT_REGISTRY[name].source, "server")
})

test("all controlled client event shapes validate", () => {
  for (const eventName of CLIENT_PRODUCT_EVENT_NAMES) {
    const parsed = validateClientEventBatch({ events: [clientEvent(eventName)] }, NOW)
    assert.equal(parsed[0].eventName, eventName)
  }
})

test("all controlled server event shapes validate", () => {
  for (const eventName of SERVER_PRODUCT_EVENT_NAMES) {
    assert.equal(validateServerEvent(serverEvent(eventName), NOW).eventName, eventName)
  }
})

test("source-specific validators reject events from the other trust boundary", () => {
  assert.throws(
    () => validateClientEventBatch({ events: [serverEvent("project_created")] }, NOW),
    /not a client event/,
  )
  assert.throws(() => validateServerEvent(clientEvent("workspace_session_started"), NOW), /not a server event/)
})

test("client batches reject trusted or free-form fields", () => {
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_session_started"), userId: PROJECT_ID }] }, NOW),
    /unsupported top-level fields/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_section_reached"), properties: { ...clientProperties.workspace_section_reached, email: "person@example.com" } }] }, NOW),
    /Unsupported event property: email/,
  )
})

test("canonical section, prompt file, concept, surface, and token allowlists are enforced", () => {
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_section_reached"), properties: { ...clientProperties.workspace_section_reached, sectionId: "some-dom-id" } }] }, NOW),
    /Invalid event property: sectionId/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("prompt_file_opened"), properties: { fileName: "customer-notes.md", surface: "card" } }] }, NOW),
    /Invalid event property: fileName/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("mockup_concept_opened"), properties: { conceptIndex: 4, surface: "card" } }] }, NOW),
    /Invalid event property: conceptIndex/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("upgrade_cta_viewed"), properties: { surface: "header", experimentVariant: "raw variant with spaces" } }] }, NOW),
    /Invalid event property: surface/,
  )
})

test("required identifiers are UUIDs and optional project IDs are registry-controlled", () => {
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_session_started"), eventId: "event-1" }] }, NOW),
    /eventId must be a UUID/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_session_started"), sessionId: "session-1" }] }, NOW),
    /sessionId must be a UUID/,
  )
  const withoutProject = { ...clientEvent("workspace_session_started") }
  delete withoutProject.projectId
  assert.throws(() => validateClientEventBatch({ events: [withoutProject] }, NOW), /projectId must be a UUID/)

  const projectlessUpgrade = { ...clientEvent("upgrade_cta_viewed") }
  delete projectlessUpgrade.projectId
  assert.equal(validateClientEventBatch({ events: [projectlessUpgrade] }, NOW)[0].projectId, undefined)
})

test("schema version and timestamp format/window are enforced", () => {
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_session_started"), schemaVersion: 2 }] }, NOW),
    /Unsupported schemaVersion/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_session_started"), occurredAt: "2026-07-11" }] }, NOW),
    /ISO UTC timestamp/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_session_started"), occurredAt: "2026-07-10T11:59:59.999Z" }] }, NOW),
    /outside the accepted window/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("workspace_session_started"), occurredAt: "2026-07-11T12:05:00.001Z" }] }, NOW),
    /outside the accepted window/,
  )
})

test("batches must be non-empty, bounded, and exact", () => {
  assert.throws(() => validateClientEventBatch({ events: [] }, NOW), ProductEventValidationError)
  assert.throws(
    () => validateClientEventBatch({ events: Array.from({ length: MAX_PRODUCT_EVENTS_PER_BATCH + 1 }, () => clientEvent("workspace_session_started")) }, NOW),
    /must contain/,
  )
  assert.throws(
    () => validateClientEventBatch({ events: [clientEvent("workspace_session_started")], userId: PROJECT_ID }, NOW),
    /only an events array/,
  )
})

test("property payloads are byte bounded before event acceptance", () => {
  assert.throws(
    () => validateClientEventBatch({ events: [{ ...clientEvent("upgrade_cta_viewed"), properties: { surface: "billing", experimentVariant: "x".repeat(5_000) } }] }, NOW),
    /size-bounded object/,
  )
})

test("server identifiers and lifecycle properties are controlled", () => {
  assert.throws(
    () => validateServerEvent({ ...serverEvent("checkout_completed"), properties: { ...serverProperties.checkout_completed, checkoutSessionId: "not-a-checkout" } }, NOW),
    /Invalid event property: checkoutSessionId/,
  )
  assert.throws(
    () => validateServerEvent({ ...serverEvent("generation_failed"), properties: { ...serverProperties.generation_failed, failureKind: "raw provider error text" } }, NOW),
    /Invalid event property: failureKind/,
  )
})
