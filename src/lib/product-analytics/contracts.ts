import { getAllSectionIds } from "@/lib/document-sections"

export const PRODUCT_EVENT_SCHEMA_VERSION = 1 as const
export const MAX_PRODUCT_EVENTS_PER_BATCH = 25
export const MAX_PRODUCT_EVENT_BATCH_BYTES = 64 * 1024
export const MAX_PRODUCT_EVENT_PROPERTIES_BYTES = 4 * 1024
export const MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000
export const MAX_EVENT_FUTURE_SKEW_MS = 5 * 60 * 1000

export const CLIENT_PRODUCT_EVENT_NAMES = [
  "workspace_session_started",
  "workspace_section_reached",
  "workspace_nav_clicked",
  "workspace_session_ended",
  "mockup_concept_impression",
  "mockup_concept_opened",
  "mockup_concept_copied",
  "mockup_concept_downloaded",
  "prompt_file_impression",
  "prompt_file_opened",
  "prompt_file_copied",
  "prompt_file_downloaded",
  "upgrade_cta_viewed",
  "upgrade_cta_clicked",
] as const

export const SERVER_PRODUCT_EVENT_NAMES = [
  "project_created",
  "generation_started",
  "generation_step_completed",
  "generation_completed",
  "generation_failed",
  "checkout_started",
  "checkout_completed",
  "subscription_cancel_requested",
  "subscription_canceled",
] as const

export type ClientProductEventName = typeof CLIENT_PRODUCT_EVENT_NAMES[number]
export type ServerProductEventName = typeof SERVER_PRODUCT_EVENT_NAMES[number]
export type ProductEventName = ClientProductEventName | ServerProductEventName
export type ProductEventSource = "client" | "server"

export const VIEWPORT_CLASSES = ["mobile", "tablet", "desktop"] as const
export const NAVIGATION_METHODS = ["initial", "scroll", "nav"] as const
export const CONTENT_STATES = ["waiting", "partial", "ready", "incomplete", "failed"] as const
export const ARTIFACT_SURFACES = ["card", "lightbox"] as const
export const PROMPT_FILE_NAMES = [
  "first-prompt.md",
  "ai-build-guardrails.md",
  "build-steps.md",
  "functional-requirements.md",
  "user-stories-and-acceptance-criteria.md",
  "technical-considerations.md",
  "sub-agents.md",
  "project-context.md",
] as const
export const UPGRADE_SURFACES = [
  "project_composer",
  "project_delete",
  "preferences",
  "billing",
  "mockup_entitlement",
] as const
export const GENERATION_MODES = ["onboarding", "generate_all", "manual", "retry"] as const
export const GENERATION_DOCUMENT_TYPES = ["competitive", "prd", "mvp", "mockups"] as const
export const GENERATION_FAILURE_KINDS = [
  "provider",
  "timeout",
  "validation",
  "storage",
  "dependency",
  "unknown",
] as const
export const PLAN_KEYS = ["free", "starter", "pro", "premium", "unknown"] as const

type ViewportClass = typeof VIEWPORT_CLASSES[number]
type NavigationMethod = typeof NAVIGATION_METHODS[number]
type ContentState = typeof CONTENT_STATES[number]
type ArtifactSurface = typeof ARTIFACT_SURFACES[number]
type PromptFileName = typeof PROMPT_FILE_NAMES[number]
type UpgradeSurface = typeof UPGRADE_SURFACES[number]
type GenerationMode = typeof GENERATION_MODES[number]
type GenerationDocumentType = typeof GENERATION_DOCUMENT_TYPES[number]
type GenerationFailureKind = typeof GENERATION_FAILURE_KINDS[number]
type PlanKey = typeof PLAN_KEYS[number]

export interface ProductEventPropertyMap {
  workspace_session_started: { entrySectionId: string; viewportClass: ViewportClass }
  workspace_section_reached: {
    sectionId: string
    navigationMethod: NavigationMethod
    contentState: ContentState
  }
  workspace_nav_clicked: { fromSectionId?: string; targetSectionId: string }
  workspace_session_ended: {
    activeDurationMs: number
    deepestSectionId: string
    lastSectionId: string
    reachedSectionCount: number
  }
  mockup_concept_impression: { conceptIndex: 1 | 2 | 3; contentState: ContentState }
  mockup_concept_opened: { conceptIndex: 1 | 2 | 3; surface: ArtifactSurface }
  mockup_concept_copied: { conceptIndex: 1 | 2 | 3; surface: ArtifactSurface }
  mockup_concept_downloaded: { conceptIndex: 1 | 2 | 3; surface: ArtifactSurface }
  prompt_file_impression: { fileName: PromptFileName }
  prompt_file_opened: { fileName: PromptFileName; surface: ArtifactSurface }
  prompt_file_copied: { fileName: PromptFileName; surface: ArtifactSurface }
  prompt_file_downloaded: { fileName: PromptFileName; surface: ArtifactSurface }
  upgrade_cta_viewed: { surface: UpgradeSurface; experimentVariant?: string }
  upgrade_cta_clicked: { surface: UpgradeSurface; experimentVariant?: string }
  project_created: { creationSource: "intake" | "dashboard" }
  generation_started: { runId: string; mode: GenerationMode }
  generation_step_completed: {
    runId: string
    mode: GenerationMode
    documentType: GenerationDocumentType
    durationMs: number
  }
  generation_completed: { runId: string; mode: GenerationMode; durationMs: number }
  generation_failed: {
    runId: string
    mode: GenerationMode
    documentType?: GenerationDocumentType
    failureKind: GenerationFailureKind
  }
  checkout_started: {
    checkoutSessionId: string
    planKey: PlanKey
    sourceSurface: UpgradeSurface
    experimentVariant?: string
  }
  checkout_completed: { checkoutSessionId: string; subscriptionId: string; planKey: PlanKey }
  subscription_cancel_requested: { subscriptionId: string; planKey: PlanKey; cancelAtPeriodEnd: boolean }
  subscription_canceled: { subscriptionId: string; planKey: PlanKey; cancellationReason?: "requested" | "payment_failed" | "admin" | "unknown" }
}

export type ProductEventInput<N extends ProductEventName = ProductEventName> = {
  eventId: string
  eventName: N
  schemaVersion: typeof PRODUCT_EVENT_SCHEMA_VERSION
  occurredAt: string
  sessionId?: string
  projectId?: string
  properties: ProductEventPropertyMap[N]
}

export type ClientProductEventInput = {
  [N in ClientProductEventName]: ProductEventInput<N> & { sessionId: string }
}[ClientProductEventName]

export type ServerProductEventInput = {
  [N in ServerProductEventName]: ProductEventInput<N>
}[ServerProductEventName]

type PropertyRule = { required: boolean; validate: (value: unknown) => boolean }
type EventSpec = {
  source: ProductEventSource
  project: "required" | "optional"
  properties: Record<string, PropertyRule>
}

const WORKSPACE_SECTION_IDS = new Set(getAllSectionIds())
const sectionRule = requiredRule((value) => typeof value === "string" && WORKSPACE_SECTION_IDS.has(value))
const positiveDurationRule = requiredRule((value) => isIntegerInRange(value, 0, 24 * 60 * 60 * 1000))
const runIdRule = requiredRule(isUuid)
const stripeCheckoutRule = requiredRule((value) => isOpaqueId(value, "cs_"))
const stripeSubscriptionRule = requiredRule((value) => isOpaqueId(value, "sub_"))

export const PRODUCT_EVENT_REGISTRY = {
  workspace_session_started: client(true, { entrySectionId: sectionRule, viewportClass: enumRule(VIEWPORT_CLASSES) }),
  workspace_section_reached: client(true, { sectionId: sectionRule, navigationMethod: enumRule(NAVIGATION_METHODS), contentState: enumRule(CONTENT_STATES) }),
  workspace_nav_clicked: client(true, { fromSectionId: optionalRule(sectionRule.validate), targetSectionId: sectionRule }),
  workspace_session_ended: client(true, { activeDurationMs: positiveDurationRule, deepestSectionId: sectionRule, lastSectionId: sectionRule, reachedSectionCount: requiredRule((value) => isIntegerInRange(value, 1, WORKSPACE_SECTION_IDS.size)) }),
  mockup_concept_impression: client(true, { conceptIndex: enumRule([1, 2, 3] as const), contentState: enumRule(CONTENT_STATES) }),
  mockup_concept_opened: client(true, artifactRules()),
  mockup_concept_copied: client(true, artifactRules()),
  mockup_concept_downloaded: client(true, artifactRules()),
  prompt_file_impression: client(true, { fileName: enumRule(PROMPT_FILE_NAMES) }),
  prompt_file_opened: client(true, promptActionRules()),
  prompt_file_copied: client(true, promptActionRules()),
  prompt_file_downloaded: client(true, promptActionRules()),
  upgrade_cta_viewed: client(false, upgradeRules()),
  upgrade_cta_clicked: client(false, upgradeRules()),
  project_created: server(true, { creationSource: enumRule(["intake", "dashboard"] as const) }),
  generation_started: server(true, generationRules()),
  generation_step_completed: server(true, { ...generationRules(), documentType: enumRule(GENERATION_DOCUMENT_TYPES), durationMs: positiveDurationRule }),
  generation_completed: server(true, { ...generationRules(), durationMs: positiveDurationRule }),
  generation_failed: server(true, { ...generationRules(), documentType: optionalRule(enumRule(GENERATION_DOCUMENT_TYPES).validate), failureKind: enumRule(GENERATION_FAILURE_KINDS) }),
  checkout_started: server(false, { checkoutSessionId: stripeCheckoutRule, planKey: enumRule(PLAN_KEYS), sourceSurface: enumRule(UPGRADE_SURFACES), experimentVariant: optionalRule(isSafeToken) }),
  checkout_completed: server(false, { checkoutSessionId: stripeCheckoutRule, subscriptionId: stripeSubscriptionRule, planKey: enumRule(PLAN_KEYS) }),
  subscription_cancel_requested: server(false, { subscriptionId: stripeSubscriptionRule, planKey: enumRule(PLAN_KEYS), cancelAtPeriodEnd: requiredRule((value) => typeof value === "boolean") }),
  subscription_canceled: server(false, { subscriptionId: stripeSubscriptionRule, planKey: enumRule(PLAN_KEYS), cancellationReason: optionalRule(enumRule(["requested", "payment_failed", "admin", "unknown"] as const).validate) }),
} satisfies Record<ProductEventName, EventSpec>

export class ProductEventValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProductEventValidationError"
  }
}

export function validateClientEventBatch(input: unknown, now = new Date()): ClientProductEventInput[] {
  if (!isPlainObject(input) || !hasExactKeys(input, ["events"]) || !Array.isArray(input.events)) {
    throw new ProductEventValidationError("Body must contain only an events array")
  }
  if (input.events.length < 1 || input.events.length > MAX_PRODUCT_EVENTS_PER_BATCH) {
    throw new ProductEventValidationError(`Event batch must contain 1-${MAX_PRODUCT_EVENTS_PER_BATCH} events`)
  }
  if (encodedSize(input) > MAX_PRODUCT_EVENT_BATCH_BYTES) {
    throw new ProductEventValidationError("Event batch is too large")
  }
  return input.events.map((event) => validateEvent(event, "client", now) as ClientProductEventInput)
}

export function validateServerEvent(input: unknown, now = new Date()): ServerProductEventInput {
  return validateEvent(input, "server", now) as ServerProductEventInput
}

export function isClientProductEventName(value: unknown): value is ClientProductEventName {
  return typeof value === "string" && (CLIENT_PRODUCT_EVENT_NAMES as readonly string[]).includes(value)
}

export function isServerProductEventName(value: unknown): value is ServerProductEventName {
  return typeof value === "string" && (SERVER_PRODUCT_EVENT_NAMES as readonly string[]).includes(value)
}

function validateEvent(input: unknown, source: ProductEventSource, now: Date): ProductEventInput {
  if (!isPlainObject(input) || !hasExactKeys(input, ["eventId", "eventName", "schemaVersion", "occurredAt", "sessionId", "projectId", "properties"], true)) {
    throw new ProductEventValidationError("Event contains missing or unsupported top-level fields")
  }
  if (typeof input.eventName !== "string" || !(input.eventName in PRODUCT_EVENT_REGISTRY)) {
    throw new ProductEventValidationError("Unknown event name")
  }
  const eventName = input.eventName as ProductEventName
  const spec = PRODUCT_EVENT_REGISTRY[eventName]
  if (spec.source !== source) throw new ProductEventValidationError(`${eventName} is not a ${source} event`)
  if (!isUuid(input.eventId)) throw new ProductEventValidationError("eventId must be a UUID")
  if (input.schemaVersion !== PRODUCT_EVENT_SCHEMA_VERSION) throw new ProductEventValidationError("Unsupported schemaVersion")
  validateTimestamp(input.occurredAt, now)
  if (source === "client" && !isUuid(input.sessionId)) throw new ProductEventValidationError("sessionId must be a UUID")
  if (input.sessionId !== undefined && !isUuid(input.sessionId)) throw new ProductEventValidationError("sessionId must be a UUID")
  if (spec.project === "required" && !isUuid(input.projectId)) throw new ProductEventValidationError("projectId must be a UUID")
  if (input.projectId !== undefined && !isUuid(input.projectId)) throw new ProductEventValidationError("projectId must be a UUID")
  validateProperties(input.properties, spec.properties)
  return input as ProductEventInput
}

function validateProperties(value: unknown, rules: Record<string, PropertyRule>) {
  if (!isPlainObject(value) || encodedSize(value) > MAX_PRODUCT_EVENT_PROPERTIES_BYTES) {
    throw new ProductEventValidationError("properties must be a size-bounded object")
  }
  for (const key of Object.keys(value)) {
    if (!rules[key]) throw new ProductEventValidationError(`Unsupported event property: ${key}`)
  }
  for (const [key, rule] of Object.entries(rules)) {
    if (!(key in value)) {
      if (rule.required) throw new ProductEventValidationError(`Missing event property: ${key}`)
      continue
    }
    if (!rule.validate(value[key])) throw new ProductEventValidationError(`Invalid event property: ${key}`)
  }
}

function validateTimestamp(value: unknown, now: Date) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new ProductEventValidationError("occurredAt must be an ISO UTC timestamp")
  }
  const timestamp = Date.parse(value)
  const nowMs = now.getTime()
  if (!Number.isFinite(timestamp) || !Number.isFinite(nowMs) || timestamp < nowMs - MAX_EVENT_AGE_MS || timestamp > nowMs + MAX_EVENT_FUTURE_SKEW_MS) {
    throw new ProductEventValidationError("occurredAt is outside the accepted window")
  }
}

function client(projectRequired: boolean, properties: Record<string, PropertyRule>): EventSpec {
  return { source: "client", project: projectRequired ? "required" : "optional", properties }
}

function server(projectRequired: boolean, properties: Record<string, PropertyRule>): EventSpec {
  return { source: "server", project: projectRequired ? "required" : "optional", properties }
}

function artifactRules() {
  return { conceptIndex: enumRule([1, 2, 3] as const), surface: enumRule(ARTIFACT_SURFACES) }
}

function promptActionRules() {
  return { fileName: enumRule(PROMPT_FILE_NAMES), surface: enumRule(ARTIFACT_SURFACES) }
}

function upgradeRules() {
  return { surface: enumRule(UPGRADE_SURFACES), experimentVariant: optionalRule(isSafeToken) }
}

function generationRules() {
  return { runId: runIdRule, mode: enumRule(GENERATION_MODES) }
}

function requiredRule(validate: (value: unknown) => boolean): PropertyRule {
  return { required: true, validate }
}

function optionalRule(validate: (value: unknown) => boolean): PropertyRule {
  return { required: false, validate }
}

function enumRule<const T extends readonly unknown[]>(values: T): PropertyRule {
  return requiredRule((value) => values.includes(value))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
}

function hasExactKeys(value: Record<string, unknown>, allowed: readonly string[], allowOptional = false) {
  const keys = Object.keys(value)
  if (keys.some((key) => !allowed.includes(key))) return false
  if (allowOptional) return ["eventId", "eventName", "schemaVersion", "occurredAt", "properties"].every((key) => key in value)
  return allowed.every((key) => key in value)
}

function isUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isIntegerInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max
}

function isSafeToken(value: unknown) {
  return typeof value === "string" && value.length >= 1 && value.length <= 64 && /^[a-z0-9][a-z0-9_-]*$/i.test(value)
}

function isOpaqueId(value: unknown, prefix: string) {
  return typeof value === "string" && value.length <= 255 && value.startsWith(prefix) && /^[A-Za-z0-9_]+$/.test(value)
}

function encodedSize(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength
  } catch {
    return Number.POSITIVE_INFINITY
  }
}
