export const DEFAULT_MONTHLY_PROJECT_ALLOWANCE = 1

export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const

export const PLAN_NAME_PROJECT_ALLOWANCES: Record<string, number | null> = {
  free: 1,
  starter: 3,
  basic: 3,
  pro: 10,
  growth: 25,
  team: 25,
  business: 50,
  enterprise: null,
  "internal dev": null,
}

export type ProjectAllowance = number | null

export type ProjectAllowanceSource =
  | "plan_field"
  | "plan_feature"
  | "plan_name"
  | "default"

export type ProjectAllowanceReason =
  | "allowed"
  | "limit_reached"
  | "count_failed"
  | "invalid_user"

export type MonthlyProjectWindow = {
  start: string
  end: string
  source: "subscription_period" | "calendar_month"
}

export type ProjectAllowanceStatus = {
  canCreate: boolean
  allowance: ProjectAllowance
  used: number
  remaining: ProjectAllowance
  planName: string
  window: MonthlyProjectWindow
  allowanceSource: ProjectAllowanceSource
  reason: ProjectAllowanceReason
  message: string
  subscriptionStatus: string | null
  lookupError: string | null
}

export type ProjectAllowanceSelectOptions = {
  count?: "exact"
  head?: boolean
}

export type ProjectAllowanceOrderOptions = {
  ascending?: boolean
  nullsFirst?: boolean
}

export type ProjectAllowanceQueryResult<TData> = {
  data: TData | null
  error: { message?: string } | null
  count?: number | null
}

export interface ProjectAllowanceQuery<TData> extends PromiseLike<ProjectAllowanceQueryResult<TData>> {
  select(columns: string, options?: ProjectAllowanceSelectOptions): ProjectAllowanceQuery<TData>
  eq(column: string, value: unknown): ProjectAllowanceQuery<TData>
  in(column: string, values: readonly unknown[]): ProjectAllowanceQuery<TData>
  gte(column: string, value: string): ProjectAllowanceQuery<TData>
  lt(column: string, value: string): ProjectAllowanceQuery<TData>
  order(column: string, options?: ProjectAllowanceOrderOptions): ProjectAllowanceQuery<TData>
  limit(count: number): ProjectAllowanceQuery<TData>
}

export type ProjectAllowanceClient = {
  from(table: string): ProjectAllowanceQuery<unknown>
}

export type ProjectAllowanceOptions = {
  now?: Date
}

type PlanResolution = {
  allowance: ProjectAllowance
  source: ProjectAllowanceSource
  planName: string
}

type SubscriptionLookup = {
  subscription: Record<string, unknown> | null
  error: string | null
}

const EXPLICIT_ALLOWANCE_KEYS = [
  "monthly_project_allowance",
  "monthly_projects",
  "projects_monthly",
  "project_allowance_monthly",
  "project_limit_monthly",
  "project_allowance",
  "project_limit",
  "projects_limit",
  "projects",
  "max_projects_per_month",
]

export async function canCreateProject(
  client: ProjectAllowanceClient,
  userId: string,
  options: ProjectAllowanceOptions = {}
): Promise<ProjectAllowanceStatus> {
  return getProjectAllowanceStatus(client, userId, options)
}

export async function getProjectAllowanceStatus(
  client: ProjectAllowanceClient,
  userId: string,
  options: ProjectAllowanceOptions = {}
): Promise<ProjectAllowanceStatus> {
  const now = getValidDate(options.now)
  const trimmedUserId = userId.trim()

  if (!trimmedUserId) {
    const window = getUtcCalendarMonthWindow(now)

    return {
      canCreate: false,
      allowance: DEFAULT_MONTHLY_PROJECT_ALLOWANCE,
      used: 0,
      remaining: 0,
      planName: "Free",
      window,
      allowanceSource: "default",
      reason: "invalid_user",
      message: "A signed-in user is required before a project can be created.",
      subscriptionStatus: null,
      lookupError: null,
    }
  }

  const subscriptionLookup = await getActiveSubscription(client, trimmedUserId, now)
  const subscription = subscriptionLookup.subscription
  const plan = getJoinedPlan(subscription)
  const planResolution = resolveProjectAllowance(plan)
  const window = getActiveMonthlyProjectWindow(subscription, now)
  const countResult = await countProjectsInWindow(client, trimmedUserId, window)

  if (countResult.error) {
    return {
      canCreate: false,
      allowance: planResolution.allowance,
      used: 0,
      remaining: 0,
      planName: planResolution.planName,
      window,
      allowanceSource: planResolution.source,
      reason: "count_failed",
      message: "Project allowance could not be verified. Please try again.",
      subscriptionStatus: getStringField(subscription, "status"),
      lookupError: countResult.error,
    }
  }

  const used = countResult.count

  if (planResolution.allowance === null) {
    return {
      canCreate: true,
      allowance: null,
      used,
      remaining: null,
      planName: planResolution.planName,
      window,
      allowanceSource: planResolution.source,
      reason: "allowed",
      message: "Project creation is allowed for the current plan.",
      subscriptionStatus: getStringField(subscription, "status"),
      lookupError: subscriptionLookup.error,
    }
  }

  const remaining = Math.max(planResolution.allowance - used, 0)
  const canCreate = remaining > 0

  return {
    canCreate,
    allowance: planResolution.allowance,
    used,
    remaining,
    planName: planResolution.planName,
    window,
    allowanceSource: planResolution.source,
    reason: canCreate ? "allowed" : "limit_reached",
    message: canCreate
      ? "Project creation is allowed for the current plan."
      : `You have reached the monthly project limit for the ${planResolution.planName} plan.`,
    subscriptionStatus: getStringField(subscription, "status"),
    lookupError: subscriptionLookup.error,
  }
}

export function resolveProjectAllowance(plan: Record<string, unknown> | null): PlanResolution {
  const planName = getPlanName(plan)

  if (!plan) {
    return {
      allowance: DEFAULT_MONTHLY_PROJECT_ALLOWANCE,
      source: "default",
      planName,
    }
  }

  const explicitAllowance = getExplicitPlanAllowance(plan)

  if (explicitAllowance !== undefined) {
    return {
      allowance: explicitAllowance.allowance,
      source: explicitAllowance.source,
      planName,
    }
  }

  const fallback = getFallbackAllowanceForPlanName(planName)

  return {
    allowance: fallback.allowance,
    source: fallback.source,
    planName,
  }
}

export function getUtcCalendarMonthWindow(now = new Date()): MonthlyProjectWindow {
  const date = getValidDate(now)
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    source: "calendar_month",
  }
}

export function getActiveMonthlyProjectWindow(
  subscription: Record<string, unknown> | null,
  now = new Date()
): MonthlyProjectWindow {
  const date = getValidDate(now)
  const start = parseDate(subscription?.current_period_start)
  const end = parseDate(subscription?.current_period_end)

  if (start && end && start < end && start <= date && date < end) {
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      source: "subscription_period",
    }
  }

  return getUtcCalendarMonthWindow(date)
}

async function getActiveSubscription(
  client: ProjectAllowanceClient,
  userId: string,
  now: Date
): Promise<SubscriptionLookup> {
  try {
    const result = await client
      .from("subscriptions")
      .select("id, status, current_period_start, current_period_end, created_at, plan_id, plans(*)")
      .eq("user_id", userId)
      .in("status", ACTIVE_SUBSCRIPTION_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)

    if (result.error) {
      return {
        subscription: null,
        error: getErrorMessage(result.error),
      }
    }

    return {
      subscription: pickBestSubscription(toRecordArray(result.data), now),
      error: null,
    }
  } catch (error) {
    return {
      subscription: null,
      error: getErrorMessage(error),
    }
  }
}

async function countProjectsInWindow(
  client: ProjectAllowanceClient,
  userId: string,
  window: MonthlyProjectWindow
): Promise<{ count: number; error: string | null }> {
  try {
    const result = await client
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", window.start)
      .lt("created_at", window.end)

    if (result.error) {
      return { count: 0, error: getErrorMessage(result.error) }
    }

    if (typeof result.count === "number" && Number.isFinite(result.count)) {
      return { count: Math.max(Math.floor(result.count), 0), error: null }
    }

    const fallbackCount = Array.isArray(result.data) ? result.data.length : 0

    return { count: fallbackCount, error: null }
  } catch (error) {
    return { count: 0, error: getErrorMessage(error) }
  }
}

function pickBestSubscription(
  subscriptions: Record<string, unknown>[],
  now: Date
): Record<string, unknown> | null {
  const activeSubscriptions = subscriptions.filter((subscription) => {
    const status = getStringField(subscription, "status")
    return isActiveSubscriptionStatus(status)
  })

  if (activeSubscriptions.length === 0) {
    return null
  }

  return [...activeSubscriptions].sort((left, right) => {
    const leftHasCurrentWindow = hasCurrentSubscriptionWindow(left, now)
    const rightHasCurrentWindow = hasCurrentSubscriptionWindow(right, now)

    if (leftHasCurrentWindow !== rightHasCurrentWindow) {
      return leftHasCurrentWindow ? -1 : 1
    }

    return getDateTime(right.current_period_end ?? right.created_at) -
      getDateTime(left.current_period_end ?? left.created_at)
  })[0]
}

function hasCurrentSubscriptionWindow(subscription: Record<string, unknown>, now: Date): boolean {
  const start = parseDate(subscription.current_period_start)
  const end = parseDate(subscription.current_period_end)

  return Boolean(start && end && start < end && start <= now && now < end)
}

function isActiveSubscriptionStatus(status: string | null): boolean {
  return Boolean(
    status &&
      ACTIVE_SUBSCRIPTION_STATUSES.some((activeStatus) => activeStatus === status.toLowerCase())
  )
}

function getJoinedPlan(subscription: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!subscription) {
    return null
  }

  const joinedPlan = subscription.plans ?? subscription.plan

  if (Array.isArray(joinedPlan)) {
    return joinedPlan.find(isRecord) ?? null
  }

  return isRecord(joinedPlan) ? joinedPlan : null
}

function resolveAllowanceValue(value: unknown, requireProjectWord: boolean): ProjectAllowance | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }

  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === "") {
    return undefined
  }

  if (requireProjectWord && !normalized.includes("project")) {
    return undefined
  }

  if (/\b(unlimited|unmetered|no limit)\b/.test(normalized)) {
    return null
  }

  const projectMatch = normalized.match(/(\d+)\s*(?:new\s*)?projects?\b/)
  const plainNumberMatch = requireProjectWord ? null : normalized.match(/^\d+$/)
  const match = projectMatch ?? plainNumberMatch

  if (!match) {
    return undefined
  }

  return Number.parseInt(match[1] ?? match[0], 10)
}

function getExplicitPlanAllowance(
  plan: Record<string, unknown> | null
): { allowance: ProjectAllowance; source: ProjectAllowanceSource } | undefined {
  if (!plan) {
    return undefined
  }

  for (const key of EXPLICIT_ALLOWANCE_KEYS) {
    const allowance = resolveAllowanceValue(plan[key], false)

    if (allowance !== undefined) {
      return { allowance, source: "plan_field" }
    }
  }

  const featureAllowance = getFeatureAllowance(plan.features)

  if (featureAllowance !== undefined) {
    return { allowance: featureAllowance, source: "plan_feature" }
  }

  return undefined
}

function getFeatureAllowance(features: unknown): ProjectAllowance | undefined {
  if (typeof features === "string") {
    return resolveAllowanceValue(features, true)
  }

  if (Array.isArray(features)) {
    for (const feature of features) {
      const allowance = getFeatureAllowance(feature)

      if (allowance !== undefined) {
        return allowance
      }
    }

    return undefined
  }

  if (isRecord(features)) {
    for (const key of EXPLICIT_ALLOWANCE_KEYS) {
      const allowance = resolveAllowanceValue(features[key], false)

      if (allowance !== undefined) {
        return allowance
      }
    }

    for (const value of Object.values(features)) {
      const allowance = getFeatureAllowance(value)

      if (allowance !== undefined) {
        return allowance
      }
    }
  }

  return undefined
}

function getFallbackAllowanceForPlanName(planName: string): {
  allowance: ProjectAllowance
  source: ProjectAllowanceSource
} {
  const normalizedPlanName = normalizePlanName(planName)

  for (const [name, allowance] of Object.entries(PLAN_NAME_PROJECT_ALLOWANCES)) {
    if (normalizedPlanName.includes(name)) {
      return {
        allowance,
        source: "plan_name",
      }
    }
  }

  return {
    allowance: DEFAULT_MONTHLY_PROJECT_ALLOWANCE,
    source: "default",
  }
}

function getPlanName(plan: Record<string, unknown> | null): string {
  const name = getStringField(plan, "name")
  return name ?? "Free"
}

function normalizePlanName(planName: string): string {
  return planName.trim().toLowerCase().replace(/\s+/g, " ")
}

function getStringField(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord)
  }

  return isRecord(value) ? [value] : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  return Number.isFinite(date.getTime()) ? date : null
}

function getDateTime(value: unknown): number {
  return parseDate(value)?.getTime() ?? 0
}

function getValidDate(value: Date | undefined): Date {
  return value && Number.isFinite(value.getTime()) ? value : new Date()
}

function getErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === "string") {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error"
}
