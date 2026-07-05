# Engineering Automation Control Plane Build Plan

## Purpose

Build a separate internal repository that automates the product engineering loop from Linear ticket to plan, implementation, QA, human review, merge, rollback notes, and learning records.

The goal is not to remove human judgment. The goal is to make the human role higher leverage:

- Put work into Linear.
- Review plans and recommendation tradeoffs.
- Inspect running local previews and QA evidence.
- Approve, request fixes, merge, or reject.
- Tune the system when its judgment is wrong.

## Product Name

Working name: `devctl`

Repository suggestion: `engineering-automation-control-plane`

CLI package name: `@makercompass/devctl`

## Core Workflow

```text
Linear issue
  -> intake/classification
  -> plan generation
  -> plan critique
  -> recommendation selection
  -> implementation branch/worktree
  -> deterministic checks
  -> AI QA and review
  -> local human review console
  -> merge or send back for fixes
  -> learning record
```

## Read This First: Keep V1 Small

The full control plane is the destination, not the first build. The first useful version should degrade to:

```text
Linear label/status
  -> GitHub Action
  -> codex exec / codex-action
  -> draft PR
  -> human review
```

Do not build orchestration before proving one ticket can reliably become one useful draft PR.

V0 is intentionally small:

- One Linear issue.
- One state label or status move.
- One GitHub Actions workflow.
- One Codex implementation pass.
- One draft PR.
- Human review and manual merge.

Only after this works on real tickets should the project add:

- Plan critique.
- Multi-model review.
- Persistent queue service.
- TUI review console.
- Backend batching.
- Decision-learning loops.

This keeps the system honest. If "one ticket -> one PR" is unreliable, a bigger orchestrator will only hide that unreliability.

## Linear State Contract

The workflow should be visible in Linear, not only in the automation database. Use Linear statuses or labels as the outer state machine.

| Linear state/label | What runs | Actor | Output |
| --- | --- | --- | --- |
| `Triage` / `Todo` | Nothing | Human | Ticket with enough context |
| `Planning` | Planner | AI | One plan in V1; 2-3 candidates later |
| `Plan Review` | Critique and selector | AI | Ranked recommendation |
| `Plan Approved` | Nothing | Human | Approval to implement |
| `Implementing` | Codex implementation | AI | Branch and draft PR |
| `AI QA` | Checks, browser QA, AI review | AI | QA report |
| `Human Review` | Local review console | Human | Approve, reject, or needs-fix |
| `Merge` | Merge command/bot | Human-triggered automation | Squash merge |
| `Done` | Outcome logger | AI/automation | Decision record and Linear closure |

Implementation note:

- The internal `automation_runs.status` is the durable state.
- Linear status/labels are the human-facing projection of that state.
- If they drift, the automation database wins and posts a Linear correction comment.

## Orchestration Modes

Build in layers.

### Mode 0: GitHub Actions Only

Use this before building a persistent API server.

Flow:

```text
Linear label/status change
  -> webhook or manual workflow_dispatch
  -> GitHub Actions workflow
  -> codex-action / codex exec
  -> commit branch
  -> open draft PR
```

This mode can be triggered manually if webhooks are not ready:

```bash
gh workflow run automation-worker.yml \
  -f linearIssueKey=MC-123 \
  -f job=implement
```

Use this mode to prove:

- Linear issue parsing works.
- Codex can implement a bounded ticket.
- PR creation is sane.
- Existing CI catches obvious issues.

### Mode 1: Tiny Webhook Dispatcher

Add a small Fastify endpoint that:

- Receives Linear webhooks.
- Validates webhook signatures.
- Maps Linear state to a job.
- Dispatches GitHub `workflow_dispatch`.
- Writes a minimal `automation_runs` row.

The dispatcher does not run code itself.

### Mode 2: Full Control Plane

Add:

- Postgres job leases.
- Worker processes.
- Artifact storage.
- Review TUI.
- Browser QA.
- Merge gates.
- Learning records.

Do not start here.

## Non-Goals For The First Version

- Do not build a fully autonomous merge bot for high-risk changes.
- Do not fine-tune models first.
- Do not replace GitHub PR review.
- Do not build a custom browser automation framework from scratch.
- Do not put this inside the main customer-facing Maker Compass app.
- Do not auto-run destructive database migrations in production.
- Do not create new UX primitives without a research and follow-up-ticket step.

## Architecture Overview

Build this as a sidecar service plus CLI/TUI.

```text
+---------------------+
| Linear              |
| Source of truth     |
+----------+----------+
           |
           | webhook / polling
           v
+-----------------------------+
| Automation API              |
| Fastify                     |
| Job orchestration           |
+----------+------------------+
           |
           v
+-----------------------------+
| Automation DB               |
| Postgres                    |
| Runs, events, decisions     |
+----------+------------------+
           |
           +----------------+
           |                |
           v                v
+-----------------+   +------------------+
| Agent Workers   |   | Local Review TUI |
| Codex/OpenAI    |   | devctl next      |
| Git worktrees   |   | localhost/browser|
+--------+--------+   +--------+---------+
         |                     |
         v                     v
+----------------------------------------+
| GitHub                                 |
| Branches, PRs, checks, merge, releases |
+----------------------------------------+
```

## Recommended Tech Stack

### Language

Use TypeScript end to end.

Reasons:

- Target app is already TypeScript/Next.js.
- GitHub, Linear, Playwright, and CLI tooling all have strong TypeScript support.
- Easier to share schemas between API, worker, and CLI.

### Runtime

- Node.js 22 LTS.
- `tsx` for local development scripts.
- `npm`, to stay close to the Maker Compass repo.

### Implementation Decisions For V1

Do not leave these open for the first build. Use the following choices:

| Area | Decision | Reason |
| --- | --- | --- |
| API server | Fastify | Mature Node server, good TypeScript support, simple plugins |
| CLI commands | Commander | Boring, stable command routing |
| TUI | Ink | React mental model for terminal UI; can start after CLI works |
| Database | Postgres | Durable state, easy local and hosted options |
| DB access | Kysely + `pg` | Type-safe SQL without heavy ORM behavior |
| Migrations | Plain SQL migrations run by a small migration script | Easy to inspect and copy into hosted Postgres/Supabase |
| Queue | Postgres-backed jobs table | Avoid Redis until concurrency requires it |
| Browser QA | Playwright | Screenshots, traces, local browser automation |
| Validation | Zod | Enforce agent output contracts and config schemas |
| Test runner | Vitest | Fast TypeScript unit/integration testing |
| Logging | Pino | Structured JSON logs |
| Formatting | Prettier | Keep generated docs/config stable |
| Linting | ESLint | TypeScript linting |

V1 should avoid Redis, Kubernetes, Temporal, custom workflow DSLs, and persistent browser farms. Add them only after Postgres leases become a real bottleneck.

### Repo Layout

```text
engineering-automation-control-plane/
  package.json
  tsconfig.json
  README.md
  .env.example
  .github/
    workflows/
      ci.yml
      automation-worker.yml
  apps/
    api/
      src/
        index.ts
        routes/
        webhooks/
    cli/
      src/
        index.ts
        commands/
        tui/
    worker/
      src/
        index.ts
        jobs/
        agents/
        harnesses/
packages/
    core/
      src/
        schema/
        config/
        logger/
        errors/
    integrations/
      src/
        linear.ts
        github.ts
        codex.ts
        openai.ts
        playwright.ts
    prompts/
      src/
        planner.ts
        planCritic.ts
        qaReviewer.ts
        designResearch.ts
        mergeDecision.ts
    test-harness/
      src/
        checks.ts
        devServer.ts
        browser.ts
        screenshots.ts
        traces.ts
    ui-review/
      src/
        componentResearch.ts
        visualRubric.ts
        animationRubric.ts
  migrations/
  docs/
    architecture.md
    runbook.md
    security.md
    rollout.md
    prompt-contracts.md
```

## Worker And Queue Contract

Use a Postgres-backed `automation_jobs` table. Workers claim jobs with leases so a crashed worker does not permanently strand work.

Job states:

```text
queued
  -> running
  -> succeeded
  -> failed
  -> cancelled
  -> dead_letter
```

Job table:

```sql
create table automation_jobs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id),
  job_type text not null,
  status text not null default 'queued',
  priority integer not null default 100,
  idempotency_key text not null,
  payload jsonb not null default '{}',
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  lease_owner text,
  lease_expires_at timestamptz,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_type, idempotency_key)
);

create index automation_jobs_claim_idx
  on automation_jobs (status, scheduled_at, priority)
  where status = 'queued';

create index automation_jobs_lease_idx
  on automation_jobs (status, lease_expires_at)
  where status = 'running';
```

Claim algorithm:

```sql
update automation_jobs
set
  status = 'running',
  lease_owner = $worker_id,
  lease_expires_at = now() + interval '5 minutes',
  started_at = coalesce(started_at, now()),
  attempt = attempt + 1,
  updated_at = now()
where id = (
  select id
  from automation_jobs
  where status = 'queued'
    and scheduled_at <= now()
  order by priority asc, scheduled_at asc
  for update skip locked
  limit 1
)
returning *;
```

Lease renewal:

- Long-running jobs renew their lease every 60 seconds.
- If lease renewal fails, the worker must stop before taking further external actions.
- Jobs with expired leases are reset to `queued` if `attempt < max_attempts`.
- Jobs with expired leases and exhausted attempts move to `dead_letter`.

Cancellation:

- `automation_runs.status = 'cancelled'` prevents new jobs from starting.
- Running jobs must check cancellation before each external action.
- Cancellation does not delete worktrees or artifacts.

Idempotency:

- Every external action job must have an idempotency key.
- Examples:
  - `linear-comment:MC-123:plan-ready:v1`
  - `github-pr:MC-123:automation-branch`
  - `checks:MC-123:commit-sha`
- Retried jobs must detect already-created external resources.

Concurrency:

- V1 default: one worker process, concurrency 1.
- Allow concurrency per job type later.
- Never run two implementation jobs for the same run at the same time.

Recovery:

- On worker startup, recover expired running jobs.
- The system must be safe to restart at any step.
- External actions must be written as "get or create" where possible.

## External Tools And APIs

### Linear

Use Linear as the source of truth for product work.

Required capabilities:

- Read issues by status, label, assignee, team, and project.
- Read comments and attachments.
- Create/update comments.
- Move issue status.
- Add labels.
- Create follow-up issues.
- Link PRs and automation run URLs.

Initial trigger options:

1. Poll Linear every few minutes for issues with label `automation-ready`.
2. Later, add Linear webhooks.
3. If using Codex in Linear, allow a human to mention `@Codex` or assign the issue to Codex for task startup.

Useful workflow labels:

- `automation-ready`
- `automation-running`
- `needs-plan-review`
- `needs-human-qa`
- `needs-design-review`
- `needs-backend-review`
- `blocked-by-env`
- `automation-failed`
- `merged`

### GitHub

Use GitHub for branches, PRs, checks, merge, and auditability.

Required capabilities:

- Create branches.
- Push commits.
- Create draft PRs.
- Read PR files and diff.
- Read check runs.
- Trigger GitHub Actions using `workflow_dispatch` or `repository_dispatch`.
- Merge PRs after human approval.
- Apply labels.
- Close PRs.

GitHub Actions supports manually triggered workflows with `workflow_dispatch`, including custom inputs. It also supports external events through `repository_dispatch`. Use those for automation jobs triggered outside GitHub.

### Codex / OpenAI

Use Codex or OpenAI agents for:

- Planning.
- Plan critique.
- Implementation.
- Code review.
- Security review.
- QA report generation.
- Design research synthesis.
- Recommendation A vs B classification.

### Codex CI Implementation Path

For V0 and V1, prefer GitHub Actions plus Codex before custom worker execution.

Use the Codex GitHub Action when running inside CI:

- `openai/codex-action@v1` installs the Codex CLI and runs `codex exec` with configured permissions.
- Store the OpenAI key as a GitHub secret.
- Check out code before invoking the action.
- Use `prompt` or `prompt-file` so implementation prompts are versioned.

Use `codex exec` directly when running from a worker:

```bash
codex exec \
  --sandbox workspace-write \
  --ignore-user-config \
  --json \
  "<task prompt>"
```

Rules:

- Use `--sandbox workspace-write` for implementation.
- Do not use `danger-full-access` except in explicitly isolated throwaway environments.
- Use `--ignore-user-config` in automation so local user config does not leak into CI behavior.
- Prefer JSONL output for machine parsing.
- Capture raw JSONL as an artifact.
- Parse only the structured final output into the automation database.
- Do not let the implementation model grade its own work; use a different model/provider for QA where possible.

Recommended approach:

- Use Codex in Linear for early manual delegation.
- Build a local/worker abstraction called `AgentRunner`.
- Start with a `MockAgentRunner` for deterministic tests.
- Add a `LocalCommandAgentRunner` next. It writes the prompt to an artifact file and invokes a configured local agent command from the automation service, not from the target repo command runner.
- Add a `CloudAgentRunner` later for Codex cloud tasks or an OpenAI Agents SDK workflow.
- Keep the interface generic enough to swap providers, but do not block Milestone 0-3 on cloud automation.

Runner implementation order:

1. `MockAgentRunner`
   - Reads fixture outputs from `tests/fixtures/agent-outputs`.
   - Used for unit and E2E tests.
2. `LocalCommandAgentRunner`
   - Configurable command, for example `codex exec --json`.
   - Captures stdout/stderr as artifacts.
   - Parses structured output through Zod.
   - Has timeout and cancellation support.
3. `CloudAgentRunner`
   - Placeholder interface in V1.
   - Real implementation after the rest of the workflow is stable.

Agent runner interface:

```ts
export interface AgentRunner {
  run(input: AgentRunInput): Promise<AgentRunResult>
}

export interface AgentRunInput {
  runId: string
  role: AgentRole
  prompt: string
  workingDirectory?: string
  allowedTools: string[]
  timeoutMs: number
  metadata: Record<string, unknown>
}

export interface AgentRunResult {
  status: "completed" | "failed" | "timed_out" | "needs_human"
  summary: string
  artifacts: AgentArtifact[]
  model?: string
  tokenUsage?: {
    input: number
    output: number
  }
}
```

### Playwright

Use Playwright for browser testing, screenshots, trace artifacts, and visual QA evidence.

Required capabilities:

- Start local app server.
- Log in with test credentials when available.
- Visit routes relevant to the ticket.
- Capture before/after screenshots.
- Record traces on failure or retry.
- Run smoke tests.
- Run screenshot comparisons for stable high-value flows.

Playwright supports screenshot comparison using `expect(page).toHaveScreenshot()`. It also supports traces, and the official recommendation is to record traces on first retry in CI or retain them on failure.

### Local Worktrees

Use one git worktree per automation run.

Example:

```text
~/dev/worktrees/
  makercompass/
    MC-123-fix-project-card-delete/
    MC-124-update-tooltip/
```

Rules:

- Never run automation directly in the user's active checkout.
- Worktree branch naming: `automation/<linear-key>-<slug>`.
- One run owns one worktree.
- Clean up only after merge or explicit human action.
- Do not delete worktrees automatically while a run is failed or needs review.

### Database

Use Postgres. Supabase is acceptable if you want managed auth/storage later.

#### Database V1 Schema

The schema below is intentionally more concrete than a product sketch. Codex should implement these as real SQL migrations and Kysely table types.

Use `text` fields with check constraints in V1 instead of Postgres enum types. That keeps migrations easy to change while the workflow is still evolving.

Core tables:

```sql
create table repository_configs (
  id uuid primary key default gen_random_uuid(),
  repo_full_name text not null unique,
  default_branch text not null default 'main',
  local_checkout_path text,
  worktree_root text not null,
  manifest_path text not null default '.devctl.json',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table automation_runs (
  id uuid primary key default gen_random_uuid(),
  linear_issue_id text not null,
  linear_issue_key text not null,
  repo_full_name text not null,
  status text not null check (status in (
    'created',
    'classified',
    'planned',
    'plan_review_required',
    'plan_approved',
    'implementing',
    'pr_created',
    'checks_running',
    'qa_running',
    'human_review_required',
    'approved_for_merge',
    'merged',
    'blocked_by_missing_context',
    'blocked_by_environment',
    'blocked_by_tests',
    'blocked_by_merge_conflict',
    'blocked_by_security',
    'blocked_by_database_risk',
    'rejected_by_human',
    'automation_failed',
    'cancelled'
  )),
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  ticket_type text not null check (ticket_type in (
    'bug',
    'feature',
    'ux',
    'backend',
    'infra',
    'research',
    'refactor',
    'test'
  )),
  selected_strategy text,
  branch_name text,
  worktree_path text,
  pr_url text,
  latest_commit_sha text,
  plan_markdown text,
  critique_markdown text,
  qa_report_markdown text,
  human_decision text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (linear_issue_id, repo_full_name)
);

create index automation_runs_status_idx on automation_runs (status, updated_at);
create index automation_runs_linear_key_idx on automation_runs (linear_issue_key);

create table automation_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id),
  event_type text not null,
  actor text not null,
  summary text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table automation_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id),
  artifact_type text not null,
  title text not null,
  path_or_url text,
  content text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id),
  role text not null,
  prompt_version text not null,
  model text,
  status text not null check (status in ('started', 'completed', 'failed', 'timed_out')),
  input_artifact_id uuid references automation_artifacts(id),
  raw_output text,
  parsed_output jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index agent_runs_run_role_idx on agent_runs (run_id, role, started_at desc);

create table check_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id),
  name text not null,
  command text not null,
  status text not null check (status in ('passed', 'failed', 'skipped', 'blocked')),
  exit_code integer,
  duration_ms integer not null,
  output_artifact_id uuid references automation_artifacts(id),
  summary text not null,
  commit_sha text,
  created_at timestamptz not null default now()
);

create index check_results_run_idx on check_results (run_id, created_at desc);

create table qa_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id),
  status text not null check (status in ('passed', 'failed', 'needs_human', 'blocked')),
  commit_sha text,
  route_manifest jsonb not null default '[]',
  viewport_manifest jsonb not null default '[]',
  console_summary jsonb not null default '{}',
  network_summary jsonb not null default '{}',
  report_artifact_id uuid references automation_artifacts(id),
  created_at timestamptz not null default now()
);

create table decision_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id),
  decision_type text not null,
  candidate_plans jsonb not null default '[]',
  candidate_critiques jsonb not null default '[]',
  selected_candidate_id text,
  human_override text,
  outcome text,
  lesson text,
  created_at timestamptz not null default now()
);
```

Artifact storage policy:

- Small text artifacts may be stored inline in `automation_artifacts.content`.
- Large logs, screenshots, videos, and traces must be stored as files or object storage paths.
- Artifacts must be immutable after creation.
- Store SHA-256 checksums for large artifacts in `metadata.sha256`.
- Do not store raw secrets in artifacts.

#### Agent Contract Schemas

Every agent output must be parsed with Zod. Invalid output gets one retry with a stricter "return only JSON" repair prompt. If the second attempt fails, mark the job failed and preserve raw output in `agent_runs.raw_output`.

Prompt versioning:

- Every prompt has a stable `prompt_version`.
- Store prompt version in `agent_runs.prompt_version`.
- When prompt behavior changes materially, bump the version.

Classifier schema:

```ts
export const TicketClassificationSchema = z.object({
  ticketType: z.enum([
    "bug",
    "feature",
    "ux",
    "backend",
    "infra",
    "research",
    "refactor",
    "test",
  ]),
  riskLevel: z.enum(["low", "medium", "high"]),
  requiresDesignResearch: z.boolean(),
  requiresSecurityReview: z.boolean(),
  requiresDatabasePlan: z.boolean(),
  requiresHumanPlanApproval: z.boolean(),
  missingContextQuestions: z.array(z.string()),
  recommendedRepo: z.string(),
  reasoning: z.string(),
})
```

Planner schema:

```ts
export const PlanOutputSchema = z.object({
  problemStatement: z.string(),
  assumptions: z.array(z.string()),
  planCandidates: z
    .array(
      z.object({
        id: z.string(), // "A", "B", or "C"
        title: z.string(),
        summary: z.string(),
        likelyFiles: z.array(z.string()),
        implementationSteps: z.array(z.string()),
        testPlan: z.array(z.string()),
        qaPlan: z.array(z.string()),
        rollbackPlan: z.array(z.string()),
        riskNotes: z.array(z.string()),
        requiresNewUxComponent: z.boolean(),
        pros: z.array(z.string()),
        cons: z.array(z.string()),
      })
    )
    .min(1)
    .max(3),
  preferredCandidateId: z.string(),
  preferredReason: z.string(),
})
```

Critic schema:

```ts
export const PlanCritiqueSchema = z.object({
  verdict: z.enum(["approve", "revise", "block"]),
  concerns: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      title: z.string(),
      detail: z.string(),
      requiredChange: z.string().optional(),
    })
  ),
  recommendationAssessment: z.object({
    agreesWithPreferred: z.boolean(),
    preferredCandidateId: z.string(),
    reason: z.string(),
  }),
  candidateScores: z.array(
    z.object({
      candidateId: z.string(),
      correctness: z.number().min(1).max(5),
      scopeControl: z.number().min(1).max(5),
      riskManagement: z.number().min(1).max(5),
      testCoverage: z.number().min(1).max(5),
      uxFit: z.number().min(1).max(5),
      notes: z.string(),
    })
  ),
  requiredReviews: z.array(z.enum(["design", "security", "database", "human"])),
})
```

QA schema:

```ts
export const AiQaReportSchema = z.object({
  status: z.enum(["pass", "fail", "needs_human"]),
  summary: z.string(),
  blockingFindings: z.array(
    z.object({
      title: z.string(),
      evidence: z.string(),
      suggestedFix: z.string(),
    })
  ),
  nonBlockingFindings: z.array(z.string()),
  testGaps: z.array(z.string()),
  recommendedNextAction: z.enum(["merge", "fix", "manual_review"]),
})
```

Merge decision schema:

```ts
export const MergeDecisionSchema = z.object({
  recommendation: z.enum(["merge", "needs_fix", "reject", "human_decision_required"]),
  reasons: z.array(z.string()),
  blockingIssues: z.array(z.string()),
  nonBlockingIssues: z.array(z.string()),
  suggestedFollowUpTickets: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      labels: z.array(z.string()),
    })
  ),
})
```

## Run State Machine

```text
created
  -> classified
  -> planned
  -> plan_review_required
  -> plan_approved
  -> implementing
  -> pr_created
  -> checks_running
  -> qa_running
  -> human_review_required
  -> approved_for_merge
  -> merged
```

Failure states:

```text
blocked_by_missing_context
blocked_by_environment
blocked_by_tests
blocked_by_merge_conflict
blocked_by_security
blocked_by_database_risk
rejected_by_human
automation_failed
```

## Risk Levels

### Low Risk

Examples:

- Copy changes.
- Small UI layout fixes.
- Non-critical docs.
- Narrow client-side bug with tests.

Allowed automation:

- Plan can be auto-approved if confidence is high.
- PR can be created automatically.
- Human must still merge.

### Medium Risk

Examples:

- New UI component.
- API behavior change.
- Shared utility changes.
- Multiple files across one domain.

Allowed automation:

- Plan requires human review.
- Implementation can proceed after approval.
- AI QA required.
- Human QA required.

### High Risk

Examples:

- Auth.
- Billing.
- Credits.
- Database migrations.
- Permissions/RLS.
- Secrets.
- Data deletion.
- Large refactors.

Allowed automation:

- Plan requires human approval.
- Security review required.
- Rollback plan required.
- No auto-merge.
- Human must inspect diff and run local/staging verification.

## Multi-Model Strategy

Do not run every model at every stage. It is expensive, slower, and can create coordination noise.

Use this rule:

```text
Diversity at decision points.
Single model at production points.
```

| Stage | Model strategy | Reason |
| --- | --- | --- |
| Ticket classification | One strong/cheap model | Mostly routing and risk flags |
| Planning V1 | One model | Keep the first loop simple |
| Planning later | One model producing 1-3 candidates | Better to compare approaches before code is written |
| Plan critique | 2-3 different models/providers | Catch systematic blind spots before implementation |
| Selector | One meta-model or deterministic score aggregation | Aggregate critiques into one recommendation |
| Implementation | One coding model | Multiple implementers create merge conflicts |
| AI QA | One or two models, not the implementation run | Do not let the author grade its own work |
| Security review | Dedicated security prompt/model path | Specialized risk lens |
| Merge decision | Deterministic gate plus summarizer | Merge should be evidence-based, not vibes-based |

V1 selector:

- Start with deterministic score aggregation.
- Average the critique scores for correctness, scope control, risk management, test coverage, and UX fit.
- Block a candidate if any critic marks it `block`.
- Prefer lower-risk candidate on ties.
- Store the chosen candidate and all critique scores in `decision_records`.

Later selector:

- Add feature extraction from ticket type, changed area, file count, risk flags, UX/backend flags, and prior outcomes.
- Train/evaluate a lightweight chooser only after enough labeled decisions exist.

## Agent Roles

### 1. Ticket Classifier

Input:

- Linear issue title.
- Linear issue body.
- Comments.
- Labels.
- Repo context.

Output JSON:

```json
{
  "ticketType": "bug|feature|ux|backend|infra|research|refactor|test",
  "riskLevel": "low|medium|high",
  "requiresDesignResearch": true,
  "requiresSecurityReview": false,
  "requiresDatabasePlan": false,
  "requiresHumanPlanApproval": true,
  "missingContextQuestions": [],
  "recommendedRepo": "nazare-tech/idea2app"
}
```

### 2. Planner

Input:

- Ticket.
- Repo context.
- Related files.
- Prior decision records.

Output:

- Problem statement.
- Assumptions.
- Proposed solution.
- Files likely to change.
- Test plan.
- QA plan.
- Rollback plan.
- Risk notes.
- Recommendation A.
- Recommendation B.
- Preferred recommendation and why.

### 3. Plan Critic

The critic must challenge the plan.

It should answer:

- What can go wrong?
- What is overbuilt?
- What is under-specified?
- What could break existing behavior?
- Is Recommendation A really better than B?
- Does the plan need more research?
- Does it need a security/database/design review?

### 4. Design Research Agent

Runs only when:

- A new UI component may be created.
- Existing component behavior is likely wrong.
- Animation/motion/polish matters.
- The ticket mentions visual quality, "AI slop", confusing UX, tooltip/popover/modal/menu/tabs/etc.

Output:

- Component best practices.
- Accessibility requirements.
- Motion guidance.
- Anti-patterns.
- Existing repo components to reuse.
- Recommendation: reuse, extend, or create.
- Follow-up design-system ticket if a new primitive is created.

### 5. Implementation Agent

Responsibilities:

- Create or use the run worktree.
- Create the branch.
- Implement the approved plan.
- Reuse existing project patterns.
- Add or update tests.
- Commit changes.
- Open draft PR.
- Update Linear.

Restrictions:

- Do not delete files without explicit plan approval.
- Do not hardcode secrets.
- Do not run destructive database actions.
- Do not merge.
- Do not bypass failed checks.

### 6. QA Agent

Responsibilities:

- Run deterministic checks.
- Start local dev server.
- Execute browser smoke tests.
- Capture screenshots.
- Capture traces on failure.
- Check console errors.
- Compare intended vs observed behavior.
- Write a QA report.

QA report sections:

- Summary.
- Commands run.
- Browser routes tested.
- Screenshots/traces.
- Pass/fail findings.
- Known gaps.
- Recommendation: merge, fix, or human inspect.

If AI QA confidence is low or blocking failures are found, the run should move back to `Implementing` or `needs-fix` with the QA report as implementation context. Do not send low-confidence PRs to human review unless the failure is explicitly environmental or needs human judgment.

### 7. Code Review Agent

Review stance:

- Bugs.
- Regressions.
- Missing tests.
- Maintainability.
- Type safety.
- Risky coupling.
- Error handling.

It must produce findings with file/line references when possible.

### 8. Security Review Agent

Runs on high-risk or sensitive changes.

Triggers:

- Auth.
- Billing.
- Secrets.
- API routes.
- User input.
- Database writes.
- RLS.
- File upload/download.
- Webhooks.
- External service calls.

Output:

- Findings.
- Severity.
- Required fixes.
- Residual risk.
- Whether merge is blocked.

### 9. Merge Decision Agent

This agent does not merge. It summarizes whether the PR is ready.

Inputs:

- PR diff.
- CI checks.
- QA report.
- Code review.
- Security review.
- Human comments.

Output:

```json
{
  "recommendation": "merge|needs_fix|reject|human_decision_required",
  "reasons": [],
  "blockingIssues": [],
  "nonBlockingIssues": [],
  "suggestedFollowUpTickets": []
}
```

## UX Component Creation Policy

Before creating a new reusable UX component:

1. Search existing repo components.
2. Search design docs and `PROJECT_CONTEXT.md` if working in Maker Compass.
3. Research best practices for the component type.
4. Check accessibility requirements.
5. Decide whether to reuse, extend, or create.
6. If creating a new component, include:
   - Component file.
   - Usage example.
   - Keyboard behavior.
   - Hover/focus/disabled/loading states where applicable.
   - Responsive behavior.
   - Reduced-motion behavior if animated.
   - Tests or preview route.
7. Create a follow-up Linear issue for design-system polish if the component is new or provisional.

Any AI-created reusable UX primitive is a draft by contract until the follow-up design-system refinement ticket is completed or explicitly closed by a human reviewer.

Optional later integration:

- Connect to Figma or the design-system source of truth.
- Compare new primitives against existing component variants.
- Push accepted primitives into the design system rather than leaving one-off UI in product code.

### Tooltip-Specific Rule

Tooltips should:

- Open on hover and keyboard focus.
- Dismiss on Escape.
- Keep focus on the trigger.
- Avoid focusable content inside the tooltip.
- Use `aria-describedby`.
- Use a small delay unless instant display is needed.
- Use subtle motion only.
- Respect `prefers-reduced-motion`.

If content needs links, buttons, forms, or rich interaction, use a popover or non-modal dialog instead of a tooltip.

### Animation Rule

Use animation when it clarifies:

- Origin.
- State change.
- Spatial relationship.
- Hierarchy.
- Continuity between before/after states.

Do not use animation when it only adds decoration or makes a small utility component feel busy.

Default UI animation guidance:

- Duration: 120-200ms for small UI.
- Easing: ease-out or project design token.
- Properties: opacity and transform only.
- Avoid layout-affecting animation.
- Provide reduced-motion fallback.

## Review Console / TUI

Build a CLI first, then a richer TUI.

Command examples:

```bash
devctl queue
devctl next
devctl inspect MC-123
devctl plan MC-123
devctl approve-plan MC-123
devctl run MC-123
devctl qa MC-123
devctl open MC-123
devctl checks MC-123
devctl merge MC-123
devctl reject MC-123
devctl needs-fix MC-123
devctl rollback-notes MC-123
devctl rollback-backend-batch <batch-id>
```

### `devctl next`

Expected behavior:

1. Finds the next PR/run needing human review.
2. Shows:
   - Linear issue.
   - Plan summary.
   - PR link.
   - Changed files.
   - Check status.
   - QA report.
   - Screenshots.
3. Checks out the PR branch in a worktree.
4. Installs dependencies if needed.
5. Starts local dev server on an available port.
6. Opens browser to the relevant route.
7. Waits for command:
   - `approve`
   - `merge`
   - `needs-fix`
   - `reject`
   - `skip`
   - `open-pr`
   - `open-linear`
   - `show-qa`

### TUI Screens

```text
Queue
  - Ready for plan review
  - Running
  - Needs QA
  - Needs human review
  - Blocked
  - Recently merged

Run Detail
  - Linear issue
  - Plan
  - Recommendation A/B
  - PR
  - Checks
  - QA artifacts
  - Human actions

Local Preview
  - Port
  - Routes
  - Login status
  - Browser open command

Decision Capture
  - approve/reject/fix
  - why
  - was AI recommendation correct?
  - lesson for future

Backend Batch Rollback
  - batch id
  - feature flag status
  - merged squash commit
  - rollback command preview
  - required confirmation
```

## Deterministic Check Harness

Each target repository should define an automation manifest.

Example: `.devctl.json`

```json
{
  "name": "makercompass",
  "packageManager": "npm",
  "defaultBranch": "main",
  "devCommand": "npm run dev",
  "buildCommand": "npm run build",
  "checks": [
    {
      "name": "lint",
      "command": "npm run lint"
    },
    {
      "name": "typecheck",
      "command": "npm run typecheck"
    },
    {
      "name": "test",
      "command": "npm test"
    },
    {
      "name": "build",
      "command": "npm run build",
      "requiresNetwork": true
    }
  ],
  "browser": {
    "baseUrl": "http://localhost:{port}",
    "preferredPorts": [3000, 3001, 3002],
    "auth": {
      "emailEnv": "E2E_TEST_EMAIL",
      "passwordEnv": "E2E_TEST_PASSWORD"
    }
  }
}
```

Check result schema:

```ts
export interface CheckResult {
  name: string
  command: string
  status: "passed" | "failed" | "skipped" | "blocked"
  exitCode?: number
  durationMs: number
  outputPath?: string
  summary: string
}
```

## Browser QA Harness

Use Playwright. Store artifacts per run.

```text
.devctl-artifacts/
  MC-123/
    checks/
      lint.txt
      typecheck.txt
      test.txt
      build.txt
    screenshots/
      before-dashboard.png
      after-dashboard.png
      mobile-after-dashboard.png
    traces/
      dashboard-retry-trace.zip
    reports/
      qa-report.md
      ai-review.md
```

Browser QA should:

- Verify relevant routes load.
- Verify no severe console errors.
- Verify no failed critical network requests.
- Verify core user story works.
- Capture desktop and mobile screenshots for UI changes.
- Capture trace on failure.
- Save a concise report.

### QA Harness Manifest

Extend `.devctl.json` with an explicit browser QA contract.

```json
{
  "browserQa": {
    "auth": {
      "required": true,
      "emailEnv": "E2E_TEST_EMAIL",
      "passwordEnv": "E2E_TEST_PASSWORD",
      "loginPath": "/auth"
    },
    "defaultRoutes": [
      {
        "name": "projects",
        "path": "/projects",
        "requiresAuth": true
      },
      {
        "name": "new-project",
        "path": "/projects/new",
        "requiresAuth": true
      }
    ],
    "routeSelection": {
      "strategy": "changed-files-plus-ticket-text",
      "fallbackRoutes": ["projects"]
    },
    "viewports": [
      {
        "name": "desktop",
        "width": 1440,
        "height": 1000
      },
      {
        "name": "mobile",
        "width": 390,
        "height": 844
      }
    ],
    "screenshots": {
      "mode": "capture",
      "compareStableRoutes": false,
      "updateBaselinesRequiresHuman": true
    },
    "traces": {
      "mode": "retain-on-failure"
    },
    "retries": {
      "count": 1,
      "onlyOnFailure": true
    },
    "consoleFilters": {
      "blockOn": ["error"],
      "ignorePatterns": []
    },
    "networkFilters": {
      "blockOnStatusAtOrAbove": 500,
      "ignoreUrlPatterns": []
    }
  }
}
```

Route selection rules:

- If changed files include a route, test that route.
- If changed files include shared components, test routes where the component is known to render.
- If Linear issue names a route or page, test that route.
- If route inference fails, run the fallback route list.
- For backend-only changes, run deterministic API checks first and browser smoke second.

Screenshot policy:

- Capture screenshots for every UI-affecting change.
- Do not auto-update visual baselines.
- Baseline updates require explicit human approval.
- Store screenshots as artifacts, not inline DB blobs.

Flake policy:

- Retry browser QA once on infrastructure-like failures.
- Do not hide deterministic assertion failures behind retries.
- If first run fails and retry passes, mark QA `needs_human` and include both outputs.

Console/network severity:

- Browser console `error` blocks unless ignored by a repo manifest rule.
- 5xx network responses block.
- 4xx responses block only when they affect the tested user story.
- Analytics, font, and third-party failures are non-blocking unless the ticket touches those systems.

## AI QA Prompt Contract

The QA reviewer receives:

- Linear issue.
- Plan.
- PR diff summary.
- Changed files.
- Deterministic check outputs.
- Screenshot paths.
- Console/network error summary.
- Known limitations.

It must return:

```json
{
  "status": "pass|fail|needs_human",
  "summary": "string",
  "blockingFindings": [
    {
      "title": "string",
      "evidence": "string",
      "suggestedFix": "string"
    }
  ],
  "nonBlockingFindings": [],
  "testGaps": [],
  "recommendedNextAction": "merge|fix|manual_review"
}
```

## Batching Policy

Batching is useful only after the one-ticket flow is reliable.

The batcher periodically scans Linear for related open tickets and suggests groups. It should not merge batches automatically.

Batching signals:

- Same Linear project.
- Same labels or component area.
- Same route/API/module mentioned in title or body.
- Expected file overlap.
- Embedding similarity of ticket descriptions.
- Same root cause.
- Same migration or feature flag.

Hard separation rules:

- Backend/database/auth/billing changes must not be mixed with UX polish.
- Design-system work should not be hidden inside feature work unless it is required for the feature.
- Refactors should not be batched with behavior changes unless the plan explains why.
- High-risk work should remain isolated unless a human explicitly approves the batch.

Batch output:

```json
{
  "batchId": "backend-project-deletion-2026-06",
  "title": "Project deletion backend safety batch",
  "tickets": ["MC-123", "MC-128"],
  "batchType": "backend|ux|frontend|docs|mixed",
  "reason": "Shared API route and rollback path",
  "mustRemainSeparate": ["MC-129"],
  "reviewStrategy": "single PR|separate PRs|backend first then UX",
  "rollbackStrategy": "feature flag + squash revert"
}
```

Suggested default:

- Separate PRs for unrelated UI tickets.
- One backend batch PR only when changes share migration/feature-flag/rollback behavior.
- One follow-up UX/design-system ticket for AI-created primitives.

## Backend Change Policy

Backend changes need stricter gates.

Backend-sensitive areas:

- Database schema.
- RLS.
- Auth.
- Billing.
- Credits.
- Webhooks.
- File upload/download.
- Server-side API route authorization.
- Background jobs.
- External API billing/spend.

Required backend plan sections:

- Data model impact.
- Migration plan.
- Rollback plan.
- Backfill plan if needed.
- Idempotency behavior.
- Authorization/RLS behavior.
- Failure mode behavior.
- Test plan.

### Migration Safety

Prefer expand/contract migrations:

1. Add nullable/new schema.
2. Write code compatible with old and new.
3. Backfill.
4. Switch reads.
5. Later remove old schema.

Never auto-approve:

- Dropping columns.
- Deleting tables.
- Deleting user data.
- Reducing permissions without review.
- Expanding permissions without security review.
- Running production data changes without backup/rollback notes.

### Structured Rollback Readiness Gate

Backend and high-risk PRs must produce a machine-readable rollback readiness record.

```ts
export const RollbackReadinessSchema = z.object({
  applies: z.boolean(),
  riskLevel: z.enum(["low", "medium", "high"]),
  hasForwardMigration: z.boolean(),
  hasRollbackNotes: z.boolean(),
  rollbackSafeAfterWrites: z.boolean(),
  requiresBackup: z.boolean(),
  requiresFeatureFlag: z.boolean(),
  featureFlagName: z.string().optional(),
  manualSteps: z.array(z.string()),
  verificationSteps: z.array(z.string()),
  blockers: z.array(z.string()),
})
```

Merge is blocked when:

- `applies = true` and `hasRollbackNotes = false`.
- `requiresBackup = true` and no backup step is documented.
- `requiresFeatureFlag = true` and no feature flag is named.
- `rollbackSafeAfterWrites = false` and no roll-forward plan exists.
- `blockers` is non-empty.

The TUI should show rollback readiness as a first-class panel, not bury it in PR text.

## PR Creation Policy

Every automation PR should include:

- Linear issue link.
- Plan summary.
- Implementation summary.
- Test commands run.
- QA artifacts.
- Risk level.
- Rollback notes.
- Follow-up tickets.

PR template:

```md
## Summary

## Linear Issue

## Plan

## Changes

## Verification

## QA Artifacts

## Risk Level

## Rollback Notes

## Follow-Up Tickets
```

## Linear Updates

For every run:

- Comment when run starts.
- Comment with plan and recommendation.
- Move issue to `Needs Plan Review` if required.
- Comment with PR link.
- Comment with QA summary.
- Move issue to `Needs Human QA`.
- Move issue to `Done` only after merge.

Example Linear comments:

```md
Automation run started.

Run: <url>
Branch: automation/MC-123-fix-tooltip
Status: planning
```

## Merge Readiness Gate

`devctl merge` must be conservative. It should refuse to merge unless all required evidence is fresh for the latest commit.

Structured gate:

```ts
export const MergeReadinessSchema = z.object({
  prUrl: z.string(),
  headSha: z.string(),
  branchIsUpToDate: z.boolean(),
  hasRequiredHumanApproval: z.boolean(),
  requiredChecksPassed: z.boolean(),
  checksSha: z.string(),
  qaPassedOrAccepted: z.boolean(),
  qaSha: z.string().optional(),
  securityReviewPassedOrNotRequired: z.boolean(),
  rollbackReadyOrNotRequired: z.boolean(),
  unresolvedBlockingComments: z.number(),
  mergeMethod: z.enum(["squash", "merge", "rebase"]),
  blockers: z.array(z.string()),
})
```

Merge refusal rules:

- Refuse if PR head SHA differs from the SHA used for checks.
- Refuse if browser QA SHA differs from PR head SHA for UI changes.
- Refuse if required GitHub checks are pending, failing, or stale.
- Refuse if branch protection blocks merge.
- Refuse if required human approval is missing.
- Refuse if security review is required and not passed.
- Refuse if rollback readiness is required and not passed.
- Refuse if unresolved blocking comments exist.
- Refuse if `blockers` is non-empty.

Merge method:

- Default to squash merge for automation PRs.
- Preserve PR body and Linear issue link.
- Delete the remote branch only after successful merge and only when branch name starts with `automation/`.
- Keep the local worktree until the user runs cleanup or a retention job deletes merged worktrees after a grace period.

Stale branch handling:

- If base branch advanced, update the PR branch through a normal merge or rebase only after human approval.
- Re-run checks after updating the branch.

```md
Plan ready for review.

Recommendation: A
Risk: medium
Requires design research: yes
Requires security review: no

Review in devctl:
devctl inspect MC-123
devctl approve-plan MC-123
```

## Recommendation A/B/C Learning Loop

Do not fine-tune first. Capture high-quality decision records first.

Each time the system chooses among candidate plans, store:

- Issue.
- Context.
- Candidate plans.
- Candidate critiques/scores.
- Chosen candidate.
- Human override if any.
- Outcome.
- Lesson.

Example:

```json
{
  "decisionType": "implementation_strategy",
  "candidatePlans": [
    {
      "id": "A",
      "summary": "Patch existing tooltip usage directly"
    },
    {
      "id": "B",
      "summary": "Create shared tooltip primitive and migrate call sites"
    }
  ],
  "candidateCritiques": [
    {
      "candidateId": "A",
      "averageScore": 3.4
    },
    {
      "candidateId": "B",
      "averageScore": 4.6
    }
  ],
  "selectedCandidateId": "B",
  "humanOverride": "B",
  "outcome": "successful",
  "lesson": "If multiple call sites already duplicate tooltip styling, centralize the primitive even if the immediate bug is narrow."
}
```

Once there are 100-300 useful records, build evals:

```text
Given issue + repo context + prior examples,
which recommendation should be selected?
Expected: B
Reason: shared primitive avoids repeated UX debt.
```

Only consider fine-tuning after retrieval + rubrics + evals stop improving.

## Security Model

### Secrets

Never store tokens in repo.

Use environment variables:

- `LINEAR_API_KEY`
- `GITHUB_TOKEN`
- `OPENAI_API_KEY`
- `CODEX_TOKEN` if needed
- `DATABASE_URL`
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

Do not print credential values in logs.

### Execution Sandbox Contract

All target-repo command execution must go through a single command runner. Do not let agents invoke arbitrary shell commands directly in V1.

Command runner requirements:

- Commands are executed in the run worktree, never in the user's active checkout.
- Commands must match an allowlist from `.devctl.json`.
- Commands run with a minimal environment allowlist.
- Secrets are passed only when the command explicitly needs them.
- Production secrets are never made available to local automation.
- Command output is streamed to artifact files with secret redaction.
- Commands have timeouts.
- Commands have max output size limits.
- Commands cannot write outside the worktree and artifact directory.
- Commands cannot run destructive git commands unless the action is explicitly human-triggered.

Default allowed commands:

```json
{
  "allowedCommands": [
    "npm install",
    "npm run lint",
    "npm run typecheck",
    "npm test",
    "npm run build",
    "npm run dev"
  ],
  "forbiddenCommands": [
    "rm -rf",
    "git reset --hard",
    "git clean",
    "git push --force",
    "drop database",
    "truncate table"
  ]
}
```

This is a policy layer, not a string-matching security boundary. Still implement it because it catches common mistakes and keeps agent behavior auditable.

Environment allowlist:

```text
NODE_ENV
CI
PORT
NEXT_PUBLIC_*
E2E_TEST_EMAIL
E2E_TEST_PASSWORD
```

Never pass:

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
OPENROUTER_API_KEY
ANTHROPIC_API_KEY
GITHUB_TOKEN
LINEAR_API_KEY
```

Exception: integration jobs that call GitHub/Linear/OpenAI use those credentials inside the automation service process, not inside target-repo test/build commands.

Resource limits:

- Default command timeout: 10 minutes.
- Build timeout: 20 minutes.
- Browser QA timeout: 10 minutes.
- Max captured stdout/stderr per command: 5 MB, with full logs optionally stored as a file artifact.
- Kill child process tree on timeout.

Network policy:

- V1 allows network for dependency install and framework builds when required.
- Mark network-requiring commands in `.devctl.json`.
- Record when network was used.
- Future hardening: run target commands in containers with explicit network modes.

### Privacy And Retention

Automation stores prompts, diffs, logs, screenshots, traces, and QA reports. Treat them as sensitive engineering artifacts.

Rules:

- Redact secrets from logs before persistence.
- Do not capture screenshots of pages known to contain real customer secrets or private data unless using a test account.
- Prefer e2e/test accounts for browser QA.
- Artifacts default retention: 30 days.
- Keep decision records longer, but remove raw screenshots/traces unless explicitly retained.
- Store who approved merge and when.
- Store human override reasons for learning, but avoid putting customer data in the lesson field.
- Access to artifacts should be limited to engineering/admin users.
- If object storage is used, use private buckets and signed URLs.

### Tool Permissions

Separate permissions by job:

- Planner: read-only repo access.
- Critic: read-only repo access.
- Implementation: branch/worktree write access.
- QA: local server/browser access.
- Merge: GitHub merge permission, human-triggered only.

### Human Approval Gates

Require human approval for:

- Merge.
- Production deploy.
- Destructive DB migrations.
- Auth/billing permission changes.
- New third-party dependency.
- New external service integration.
- Any secret/environment change.

## Rollback Strategy

### Frontend/UI

- Revert PR.
- Disable feature flag if present.
- Restore previous component.

### Backend/API

- Revert code.
- Keep backwards-compatible schema.
- Use feature flag to disable behavior.
- Roll forward with fix if schema already migrated.

### Backend Batch Operational Rollback

Backend batches should merge behind feature flags whenever practical.

Rollback sequence:

1. Turn the feature flag off.
2. Confirm production behavior is disabled.
3. Revert the single squash merge commit for the backend batch.
4. Deploy the revert.
5. Verify logs, health checks, and affected user flows.
6. Leave additive database migrations in place unless a human-approved migration rollback is safe.

`devctl rollback-backend-batch <batch-id>` should:

- Fetch the batch record.
- Show the feature flag name.
- Show the squash merge commit.
- Show whether rollback is safe after writes.
- Require typed confirmation.
- Flip the feature flag off if an integration exists.
- Create a revert PR or run `git revert` in a rollback branch.
- Never run destructive database rollback automatically.

### Database

Every migration PR must include:

- Forward migration.
- Rollback notes.
- Whether rollback is safe after writes.
- Backup requirement.
- Manual data repair notes if needed.

## Requirements Coverage Map

| Original requirement | Covered by |
| --- | --- |
| Humans start by filing work in Linear | `Linear State Contract`, `External Tools And APIs > Linear` |
| Generate implementation plan | `Agent Roles > Planner`, `Planning And Critique` milestone |
| Review and critique the plan | `Agent Roles > Plan Critic`, `Multi-Model Strategy` |
| Choose Recommendation A/B/C | `Planner schema`, `PlanCritiqueSchema`, `Recommendation A/B/C Learning Loop` |
| Human approves plan | `Linear State Contract`, `Plan Review` states |
| AI implements work | `Codex CI Implementation Path`, `Implementation Agent` |
| AI QA before human QA | `QA Agent`, `Browser QA Harness`, `AI QA Prompt Contract` |
| Human review before merge | `Review Console / TUI`, `Merge Readiness Gate` |
| Multiple models for critique/review | `Multi-Model Strategy` |
| Learn when A is usually right but B/C is better | `Recommendation A/B/C Learning Loop`, `decision_records` |
| New UX component allowed | `UX Component Creation Policy` |
| New UX component creates follow-up ticket | `UX Component Creation Policy`, `Design Research Agent` |
| Research best practices before building component | `Design Research Agent`, `UX Component Creation Policy` |
| Tooltip/accessibility/motion quality | `Tooltip-Specific Rule`, `Animation Rule` |
| Batch related Linear tickets | `Batching Policy` |
| Separate backend from UX batches | `Batching Policy`, `Backend Change Policy` |
| Local review UI: next PR, localhost, test, merge | `Review Console / TUI` |
| Backend changes in controlled batch | `Batching Policy`, `Backend Change Policy` |
| Undo backend changes | `Structured Rollback Readiness Gate`, `Backend Batch Operational Rollback` |
| Start small, avoid overbuilding | `Read This First: Keep V1 Small`, `Orchestration Modes` |

## Milestones

### Milestone -1: One Ticket To One PR Spike

Deliverables:

- One GitHub Actions workflow in a target repo or fixture repo.
- Manual `workflow_dispatch` inputs for `linearIssueKey` and `job`.
- Mock or real Linear issue fetch.
- Codex implementation step using `codex-action` or `codex exec`.
- Draft PR creation.
- Linear comment with PR link.

Acceptance criteria:

- Running one workflow for one Linear issue creates a sane draft PR.
- A human can review and merge manually.
- No custom API server is required.
- No persistent queue is required.
- This works before building the larger control plane.

### Milestone 0: Repo Skeleton

Deliverables:

- New TypeScript repo.
- Package scripts.
- CI.
- Config loader.
- Logger.
- Database migration setup.
- `.env.example`.
- Basic README.

Acceptance criteria:

- `npm run lint`, `npm run typecheck`, and `npm test` pass.
- API starts locally.
- CLI prints help.

### Milestone 1: Linear Intake

Deliverables:

- Linear client.
- Poll issues by label/status.
- Create automation run records.
- Post Linear comments.
- CLI `devctl queue`.

Acceptance criteria:

- Labeling an issue `automation-ready` creates a run.
- `devctl queue` shows it.
- Linear receives a "run started" comment.

### Milestone 2: Planning And Critique

Deliverables:

- Ticket classifier.
- Planner agent.
- Plan critic agent.
- Plan markdown artifact.
- `devctl inspect`.
- `devctl approve-plan`.

Acceptance criteria:

- A Linear issue can produce a plan.
- Risk level is stored.
- Plan approval is captured.
- Medium/high-risk issues pause before implementation.

### Milestone 3: Worktree And PR Automation

Deliverables:

- Git worktree manager.
- Branch creation.
- Agent implementation runner.
- Commit and PR creation.
- Linear PR comment.

Acceptance criteria:

- Approved run creates branch and draft PR.
- PR includes required template sections.
- Work happens outside the active checkout.

### Milestone 4: Deterministic Checks

Deliverables:

- `.devctl.json` repo manifest.
- Check runner.
- Artifact storage.
- GitHub check/PR comment update.

Acceptance criteria:

- Runs lint/typecheck/test/build for Maker Compass.
- Captures outputs.
- Blocks QA/merge recommendation if checks fail.

### Milestone 5: Browser QA

Deliverables:

- Dev server manager.
- Port selection.
- Playwright smoke harness.
- Screenshot capture.
- Trace-on-failure.
- AI QA report.

Acceptance criteria:

- `devctl qa MC-123` starts local app and runs route checks.
- Screenshots and traces are saved.
- QA report is linked in run record.

### Milestone 6: Human Review Console

Deliverables:

- `devctl next`.
- Run detail TUI.
- Browser open integration.
- Human decision capture.

Acceptance criteria:

- User can review one PR at a time.
- User can open local preview.
- User can mark approve/needs-fix/reject.
- Decision is stored.

### Milestone 7: Merge Path

Deliverables:

- Merge readiness summarizer.
- Merge command.
- GitHub merge integration.
- Linear status update.

Acceptance criteria:

- `devctl merge MC-123` refuses if checks fail.
- Merge requires explicit human command.
- Issue is updated after merge.

### Milestone 8: UX Component Research Gate

Deliverables:

- Design research agent.
- Component creation policy enforcement.
- Follow-up Linear issue creator.

Acceptance criteria:

- New component PRs include research notes.
- Tooltip/popover/modal/menu changes check accessibility rules.
- Follow-up design-system ticket is created when needed.

### Milestone 9: Backend Batch And Rollback

Deliverables:

- Backend-risk classifier.
- Migration plan requirement.
- Rollback notes requirement.
- Backend batch grouping view.

Acceptance criteria:

- Backend-sensitive PRs cannot be marked merge-ready without rollback notes.
- Related backend tickets can be grouped manually.

### Milestone 10: Learning Records And Evals

Deliverables:

- Decision record capture.
- Export dataset command.
- Eval runner for recommendation selection.
- Dashboard/report for model accuracy.

Acceptance criteria:

- Human overrides become structured training/eval examples.
- System can report where A/B recommendations failed.

## Build Order For Codex

Give Codex this exact build order:

1. Prove Milestone -1: one Linear issue to one draft PR through GitHub Actions.
2. Scaffold repo and CI.
3. Implement core schemas and database migrations.
4. Implement config and logging.
5. Implement Linear integration.
6. Implement CLI queue and inspect commands.
7. Implement planner and critic prompts with mock agent runner first.
8. Add real agent runner interface.
9. Implement worktree manager.
10. Implement deterministic check runner.
11. Implement PR creation.
12. Implement Playwright QA harness.
13. Implement AI QA report.
14. Implement human review TUI.
15. Implement merge command.
16. Implement UX component research gate.
17. Implement backend rollback gate.
18. Implement learning records and eval export.

## Required Tests

### Unit Tests

- Config loading.
- Linear issue parsing.
- State transitions.
- Risk classification schema validation.
- PR template generation.
- Check result parsing.
- Decision record creation.

### Integration Tests

- Linear client with mocked API.
- GitHub client with mocked API.
- Worktree manager in a temp repo.
- Check runner against a fixture repo.
- Playwright harness against a tiny fixture app.

### E2E Tests

Fixture flow:

1. Mock Linear issue.
2. Create run.
3. Generate plan with mock agent.
4. Approve plan.
5. Create worktree/branch.
6. Apply fixture patch.
7. Run checks.
8. Create mock PR.
9. Run QA.
10. Capture human decision.

## Observability

Log every state transition.

Required event types:

- `run.created`
- `run.classified`
- `plan.created`
- `plan.critiqued`
- `plan.approved`
- `worktree.created`
- `implementation.started`
- `implementation.completed`
- `pr.created`
- `checks.started`
- `checks.completed`
- `qa.started`
- `qa.completed`
- `human.decision`
- `merge.completed`
- `run.failed`

Use structured JSON logs.

## Failure Handling

The system must fail loudly and recoverably.

Examples:

- Linear unavailable -> mark `blocked_by_environment`.
- GitHub push rejected -> mark `blocked_by_merge_conflict`.
- Tests fail -> mark `blocked_by_tests`.
- Agent times out -> mark `automation_failed` with retry option.
- Missing env credentials -> mark `blocked_by_environment`.
- Dev server cannot start -> keep worktree and artifacts.

Retry rules:

- Planning can retry safely.
- QA can retry safely.
- Implementation retry must inspect current branch state first.
- Merge retry must re-check PR status.

## Codex Handoff Prompt

Use this prompt in the new repo after copying this markdown file to `docs/plans/engineering-automation-control-plane-build-plan.md` in that repo:

```text
Build the Engineering Automation Control Plane described in `docs/plans/engineering-automation-control-plane-build-plan.md`.

If the file is not present in this repository yet, create it first from the plan text provided by the user, then continue.

Important constraints:
- Build this as a separate internal TypeScript repo.
- Start with the milestone order in the plan.
- Do not attempt full autonomy first.
- Human approval is required for merge and high-risk changes.
- Use mock integrations before real API calls where practical.
- Add tests for each milestone.
- Keep the architecture modular: core schemas, integrations, worker jobs, CLI/TUI, prompts, and harnesses should be separable.
- Use environment variables for secrets.
- Do not hardcode API keys.
- Prefer simple reliable workflows over clever orchestration.

First task:
Implement Milestone -1 only:
1. Create the smallest possible GitHub Actions workflow that can take a Linear issue key or mocked issue payload.
2. Run a constrained Codex implementation step using `codex-action` or a documented placeholder when credentials are not available.
3. Create or simulate a draft PR.
4. Post or simulate a Linear comment with the PR link.
5. Document exactly what is real and what is mocked.
6. Add tests or fixture scripts around the workflow input/output contract.
7. Stop after proving the one-ticket-to-one-PR loop; do not build the API server yet.

Second task, only after Milestone -1 works:
Implement Milestone 0 and Milestone 1:
1. Scaffold the repo.
2. Add package scripts, TypeScript, lint/typecheck/test.
3. Add core schemas.
4. Add database migration setup.
5. Add Linear integration interface with a mock client and placeholder real client.
6. Add CLI commands `devctl queue` and `devctl inspect`.
7. Add tests.
8. Document local setup in README.md.
```

## Reference Links

- Codex in Linear: https://developers.openai.com/codex/integrations/linear
- Codex GitHub Action: https://developers.openai.com/codex/github-action
- Codex non-interactive mode: https://developers.openai.com/codex/noninteractive
- OpenAI building agents: https://developers.openai.com/tracks/building-agents/
- GitHub Actions `workflow_dispatch`: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch
- GitHub Actions `repository_dispatch`: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch
- Linear webhooks: https://linear.app/developers/webhooks
- Linear agents: https://linear.app/developers/agents
- Playwright visual comparisons: https://playwright.dev/docs/test-snapshots
- Playwright trace viewer: https://playwright.dev/docs/trace-viewer
- WAI-ARIA tooltip pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
- Radix Tooltip: https://www.radix-ui.com/primitives/docs/components/tooltip
