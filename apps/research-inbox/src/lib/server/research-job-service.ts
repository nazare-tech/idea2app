import { createResearchRepository } from "../research/repository"
import { runLast30DaysWithCodex } from "./last30days-runner"
import { createResearchJobStore, type ResearchRunSnapshot } from "./research-job-store"

export interface PublicResearchRun {
  status: ResearchRunSnapshot["status"]
  id?: string
  createdAt?: string
  updatedAt?: string
  startedAt?: string | null
  completedAt?: string | null
  importedCount?: number
  warningCount?: number
  retryable?: boolean
  error?: string | null
}

type ResearchJobDependencies = {
  repository: ReturnType<typeof createResearchRepository>
  store: ReturnType<typeof createResearchJobStore>
  run: typeof runLast30DaysWithCodex
}

export function toPublicResearchRun(run: ResearchRunSnapshot): PublicResearchRun {
  if (run.status === "idle") return run
  return {
    status: run.status,
    id: run.id,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    importedCount: run.importedCount,
    warningCount: run.warningCount,
    retryable: run.retryable,
    error: run.error,
  }
}

export async function executeResearchJob(dependencies: ResearchJobDependencies, id: string, topic: string) {
  try {
    const running = await dependencies.store.update(id, { status: "running" })
    if (!running.updated) return
    const result = await dependencies.run(topic)
    const importing = await dependencies.store.update(id, { status: "importing" })
    if (!importing.updated) return
    const merged = await dependencies.repository.mergeResearchRun(id, result)
    await dependencies.store.reconcileSucceeded(id, merged)
  } catch (error) {
    console.error("Research run failed:", error instanceof Error ? error.name : "Unknown error")
    await dependencies.store.update(id, {
      status: "failed",
      retryable: true,
      error: "Research run stopped before completion. Existing inbox data is safe.",
    }).catch((storeError) => console.error("Could not record research failure:", storeError))
  }
}

export function createResearchJobService(dependencies: ResearchJobDependencies = {
  repository: createResearchRepository(),
  store: createResearchJobStore(),
  run: runLast30DaysWithCodex,
}) {
  async function reconcile(run: ResearchRunSnapshot) {
    if (run.status === "idle" || run.status === "succeeded") return run
    const receipt = await dependencies.repository.getResearchRunReceipt(run.id)
    if (!receipt) return run
    const reconciled = await dependencies.store.reconcileSucceeded(run.id, receipt)
    return reconciled.job
  }

  async function start() {
    const { document } = await dependencies.repository.load()
    await reconcile(await dependencies.store.load())
    const claimed = await dependencies.store.claim(document.workspace.topic)
    if (!claimed.reused) void executeResearchJob(dependencies, claimed.job.id, claimed.job.topic)
    return claimed
  }

  return { load: async () => reconcile(await dependencies.store.load()), start }
}

let service: ReturnType<typeof createResearchJobService> | undefined

export function getResearchJobService() {
  service ??= createResearchJobService()
  return service
}
