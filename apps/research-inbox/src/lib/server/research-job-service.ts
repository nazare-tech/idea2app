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

export function createResearchJobService(dependencies = {
  repository: createResearchRepository(),
  store: createResearchJobStore(),
  run: runLast30DaysWithCodex,
}) {
  async function execute(id: string, topic: string) {
    try {
      await dependencies.store.update(id, { status: "running" })
      const result = await dependencies.run(topic)
      await dependencies.store.update(id, { status: "importing" })
      const merged = await dependencies.repository.mergeResearchRun(result)
      await dependencies.store.update(id, {
        status: "succeeded",
        importedCount: merged.importedCount,
        warningCount: merged.warningCount,
        retryable: false,
        error: null,
      })
    } catch (error) {
      console.error("Research run failed:", error instanceof Error ? error.name : "Unknown error")
      await dependencies.store.update(id, {
        status: "failed",
        retryable: true,
        error: "Research run failed. Existing inbox data was not changed.",
      }).catch((storeError) => console.error("Could not record research failure:", storeError))
    }
  }

  async function start() {
    const { document } = await dependencies.repository.load()
    const claimed = await dependencies.store.claim(document.workspace.topic)
    if (!claimed.reused) void execute(claimed.job.id, claimed.job.topic)
    return claimed
  }

  return { load: dependencies.store.load, start }
}

let service: ReturnType<typeof createResearchJobService> | undefined

export function getResearchJobService() {
  service ??= createResearchJobService()
  return service
}
