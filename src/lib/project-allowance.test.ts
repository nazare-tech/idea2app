import test from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_MONTHLY_PROJECT_ALLOWANCE,
  canCreateProject,
  getActiveMonthlyProjectWindow,
  getProjectAllowanceStatus,
  getUtcCalendarMonthWindow,
  resolveProjectAllowance,
  type ProjectAllowanceClient,
  type ProjectAllowanceOrderOptions,
  type ProjectAllowanceQuery,
  type ProjectAllowanceQueryResult,
  type ProjectAllowanceSelectOptions,
} from "./project-allowance"

type FakeQueryFilter = {
  method: "eq" | "in" | "gte" | "lt"
  column: string
  value: unknown
}

type FakeQueryRecord = {
  table: string
  selectColumns: string | null
  selectOptions: ProjectAllowanceSelectOptions | null
  filters: FakeQueryFilter[]
  orderBy: { column: string; options?: ProjectAllowanceOrderOptions }[]
  limitCount: number | null
}

class FakeQueryBuilder implements ProjectAllowanceQuery<unknown> {
  constructor(
    private readonly response: ProjectAllowanceQueryResult<unknown>,
    private readonly record: FakeQueryRecord
  ) {}

  select(columns: string, options?: ProjectAllowanceSelectOptions): ProjectAllowanceQuery<unknown> {
    this.record.selectColumns = columns
    this.record.selectOptions = options ?? null
    return this
  }

  eq(column: string, value: unknown): ProjectAllowanceQuery<unknown> {
    this.record.filters.push({ method: "eq", column, value })
    return this
  }

  in(column: string, values: readonly unknown[]): ProjectAllowanceQuery<unknown> {
    this.record.filters.push({ method: "in", column, value: values })
    return this
  }

  gte(column: string, value: string): ProjectAllowanceQuery<unknown> {
    this.record.filters.push({ method: "gte", column, value })
    return this
  }

  lt(column: string, value: string): ProjectAllowanceQuery<unknown> {
    this.record.filters.push({ method: "lt", column, value })
    return this
  }

  order(column: string, options?: ProjectAllowanceOrderOptions): ProjectAllowanceQuery<unknown> {
    this.record.orderBy.push({ column, options })
    return this
  }

  limit(count: number): ProjectAllowanceQuery<unknown> {
    this.record.limitCount = count
    return this
  }

  then<TResult1 = ProjectAllowanceQueryResult<unknown>, TResult2 = never>(
    onfulfilled?:
      | ((value: ProjectAllowanceQueryResult<unknown>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected)
  }
}

function createFakeClient(responses: Record<string, ProjectAllowanceQueryResult<unknown>>) {
  const queries: FakeQueryRecord[] = []
  const client: ProjectAllowanceClient = {
    from(table: string): ProjectAllowanceQuery<unknown> {
      const record: FakeQueryRecord = {
        table,
        selectColumns: null,
        selectOptions: null,
        filters: [],
        orderBy: [],
        limitCount: null,
      }

      queries.push(record)

      return new FakeQueryBuilder(
        responses[table] ?? { data: null, error: null, count: null },
        record
      )
    },
  }

  return { client, queries }
}

const NOW = new Date("2026-04-23T12:00:00.000Z")

test("getUtcCalendarMonthWindow returns the active UTC calendar month", () => {
  assert.deepEqual(getUtcCalendarMonthWindow(NOW), {
    start: "2026-04-01T00:00:00.000Z",
    end: "2026-05-01T00:00:00.000Z",
    source: "calendar_month",
  })
})

test("getActiveMonthlyProjectWindow uses a current subscription period when present", () => {
  assert.deepEqual(
    getActiveMonthlyProjectWindow(
      {
        current_period_start: "2026-04-15T10:00:00.000Z",
        current_period_end: "2026-05-15T10:00:00.000Z",
      },
      NOW
    ),
    {
      start: "2026-04-15T10:00:00.000Z",
      end: "2026-05-15T10:00:00.000Z",
      source: "subscription_period",
    }
  )
})

test("resolveProjectAllowance reads explicit plan fields before plan-name fallbacks", () => {
  assert.deepEqual(
    resolveProjectAllowance({
      name: "Pro",
      monthly_project_allowance: 4,
    }),
    {
      allowance: 4,
      source: "plan_field",
      planName: "Pro",
    }
  )
})

test("resolveProjectAllowance reads project allowance from feature text", () => {
  assert.deepEqual(
    resolveProjectAllowance({
      name: "Starter",
      features: ["5 projects per month", "Email support"],
    }),
    {
      allowance: 5,
      source: "plan_feature",
      planName: "Starter",
    }
  )
})

test("resolveProjectAllowance falls back conservatively by plan name", () => {
  assert.deepEqual(resolveProjectAllowance({ name: "Pro" }), {
    allowance: 10,
    source: "plan_name",
    planName: "Pro",
  })
  assert.deepEqual(resolveProjectAllowance({ name: "Internal Dev" }), {
    allowance: null,
    source: "plan_name",
    planName: "Internal Dev",
  })
  assert.deepEqual(resolveProjectAllowance(null), {
    allowance: DEFAULT_MONTHLY_PROJECT_ALLOWANCE,
    source: "default",
    planName: "Free",
  })
})

test("getProjectAllowanceStatus allows users below an explicit plan limit", async () => {
  const { client, queries } = createFakeClient({
    subscriptions: {
      data: [
        {
          status: "active",
          current_period_start: "2026-04-15T10:00:00.000Z",
          current_period_end: "2026-05-15T10:00:00.000Z",
          plans: {
            name: "Starter",
            monthly_project_allowance: 3,
          },
        },
      ],
      error: null,
    },
    projects: { data: null, error: null, count: 2 },
  })

  const result = await getProjectAllowanceStatus(client, "user-1", { now: NOW })

  assert.equal(result.canCreate, true)
  assert.equal(result.allowance, 3)
  assert.equal(result.used, 2)
  assert.equal(result.remaining, 1)
  assert.equal(result.window.source, "subscription_period")

  const projectsQuery = queries.find((query) => query.table === "projects")
  assert.ok(projectsQuery)
  assert.deepEqual(projectsQuery.selectOptions, { count: "exact", head: true })
  assert.deepEqual(
    projectsQuery.filters.filter((filter) => filter.method === "gte" || filter.method === "lt"),
    [
      { method: "gte", column: "created_at", value: "2026-04-15T10:00:00.000Z" },
      { method: "lt", column: "created_at", value: "2026-05-15T10:00:00.000Z" },
    ]
  )
})

test("canCreateProject blocks users at the monthly limit", async () => {
  const { client } = createFakeClient({
    subscriptions: {
      data: [
        {
          status: "active",
          current_period_start: "2026-04-01T00:00:00.000Z",
          current_period_end: "2026-05-01T00:00:00.000Z",
          plans: {
            name: "Starter",
            monthly_project_allowance: 3,
          },
        },
      ],
      error: null,
    },
    projects: { data: null, error: null, count: 3 },
  })

  const result = await canCreateProject(client, "user-1", { now: NOW })

  assert.equal(result.canCreate, false)
  assert.equal(result.reason, "limit_reached")
  assert.equal(result.remaining, 0)
  assert.match(result.message, /monthly project limit/i)
})

test("getProjectAllowanceStatus falls back to the free calendar-month limit without a subscription", async () => {
  const { client } = createFakeClient({
    subscriptions: { data: [], error: null },
    projects: { data: null, error: null, count: 1 },
  })

  const result = await getProjectAllowanceStatus(client, "user-1", { now: NOW })

  assert.equal(result.canCreate, false)
  assert.equal(result.planName, "Free")
  assert.equal(result.allowance, 1)
  assert.equal(result.used, 1)
  assert.equal(result.window.source, "calendar_month")
})

test("getProjectAllowanceStatus keeps unlimited plans unblocked", async () => {
  const { client } = createFakeClient({
    subscriptions: {
      data: [
        {
          status: "active",
          current_period_start: "2026-04-01T00:00:00.000Z",
          current_period_end: "2026-05-01T00:00:00.000Z",
          plans: { name: "Enterprise" },
        },
      ],
      error: null,
    },
    projects: { data: null, error: null, count: 500 },
  })

  const result = await getProjectAllowanceStatus(client, "user-1", { now: NOW })

  assert.equal(result.canCreate, true)
  assert.equal(result.allowance, null)
  assert.equal(result.remaining, null)
  assert.equal(result.used, 500)
})

test("getProjectAllowanceStatus blocks conservatively when project counts fail", async () => {
  const { client } = createFakeClient({
    subscriptions: { data: [], error: null },
    projects: { data: null, error: { message: "count failed" }, count: null },
  })

  const result = await getProjectAllowanceStatus(client, "user-1", { now: NOW })

  assert.equal(result.canCreate, false)
  assert.equal(result.reason, "count_failed")
  assert.equal(result.lookupError, "count failed")
})

test("getProjectAllowanceStatus rejects missing user ids", async () => {
  const { client } = createFakeClient({})

  const result = await getProjectAllowanceStatus(client, "   ", { now: NOW })

  assert.equal(result.canCreate, false)
  assert.equal(result.reason, "invalid_user")
})
