"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import type { ReadonlyURLSearchParams } from "next/navigation"

import { parseDocumentStream } from "@/lib/parse-document-stream"
import {
  GENERATE_ALL_DEFAULT_MODELS,
  type DocumentType,
} from "@/lib/document-definitions"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { shouldResumeQueueAfterDocumentRetry } from "@/lib/generate-all-helpers"
import type { GenerateAllStatus, GenerateDocumentFn, QueueItem } from "@/stores/generate-all-store"
import type { MockupOptionStatus } from "@/lib/document-generation-display-status"
import type { OpenRouterImageMockupOption } from "@/lib/openrouter-image-mockup-format"
import type {
  Analysis,
  MvpPlan,
  PRD,
  Project,
  TechSpec,
} from "./workspace-types"

const GENERATION_REQUEST_TIMEOUT_MS = 790_000
const GENERATION_REQUEST_TIMEOUT_SECONDS = GENERATION_REQUEST_TIMEOUT_MS / 1000
const GENERATION_TIMEOUT_MESSAGE = `Generation timed out after ${GENERATION_REQUEST_TIMEOUT_SECONDS} seconds. Please try again.`

type MockupOptionGenerationResult =
  | { skipped: true }
  | {
      skipped: false
      option: OpenRouterImageMockupOption | null
      model: string
      designPlan?: unknown
      error?: string
    }

export function useDocumentGeneration({
  analyses,
  prds,
  mvpPlans,
  techSpecs,
  project,
  projectName,
  searchParams,
  mockupDraftDesignPlan,
  mockupDraftDesignPlanStorageKey,
  mockupDraftOptions,
  mockupDraftRunId,
  mockupDraftRunStorageKey,
  generateAllQueue,
  generateAllStatus,
  loadWorkspaceDocuments,
  resumeGenerateAll,
  saveGeneratingState,
  setGeneratingDocuments,
  setLocalGenerationErrors,
  setMockupDraftDesignPlan,
  setMockupDraftOptions,
  setMockupDraftRunId,
  setMockupOptionStatuses,
}: {
  analyses: Analysis[]
  prds: PRD[]
  mvpPlans: MvpPlan[]
  techSpecs: TechSpec[]
  project: Project
  projectName: string
  searchParams: ReadonlyURLSearchParams
  mockupDraftDesignPlan: unknown
  mockupDraftDesignPlanStorageKey: string
  mockupDraftOptions: OpenRouterImageMockupOption[]
  mockupDraftRunId: string | null
  mockupDraftRunStorageKey: string
  generateAllQueue: QueueItem[]
  generateAllStatus: GenerateAllStatus
  loadWorkspaceDocuments: (docTypes: DocumentType[], options?: { force?: boolean }) => Promise<void>
  resumeGenerateAll: () => Promise<void>
  saveGeneratingState: (docType: DocumentType, isGenerating: boolean) => void
  setGeneratingDocuments: Dispatch<SetStateAction<Record<DocumentType, boolean>>>
  setLocalGenerationErrors: Dispatch<SetStateAction<Partial<Record<DocumentType, string>>>>
  setMockupDraftDesignPlan: Dispatch<SetStateAction<unknown>>
  setMockupDraftOptions: Dispatch<SetStateAction<OpenRouterImageMockupOption[]>>
  setMockupDraftRunId: Dispatch<SetStateAction<string | null>>
  setMockupOptionStatuses: Dispatch<SetStateAction<MockupOptionStatus[]>>
}) {
  const checkPrerequisites = useCallback((type: DocumentType): { canGenerate: boolean; reason?: string } => {
    switch (type) {
      case "prompt":
        return { canGenerate: true }
      case "competitive":
        if (!project.description) {
          return { canGenerate: false, reason: "Please add a project description first" }
        }
        return { canGenerate: true }
      case "prd":
        if (!analyses.some((analysis) => analysis.type === "competitive-analysis")) {
          return { canGenerate: false, reason: "Generate Market Research first" }
        }
        return { canGenerate: true }
      case "mvp":
        if (prds.length === 0) {
          return { canGenerate: false, reason: "Generate Product Plan first" }
        }
        return { canGenerate: true }
      case "mockups":
        if (mvpPlans.length === 0) {
          return { canGenerate: false, reason: "Generate First Version Plan first" }
        }
        return { canGenerate: true }
      case "techspec":
        if (prds.length === 0) {
          return { canGenerate: false, reason: "Generate Product Plan first" }
        }
        return { canGenerate: true }
      case "deploy":
        if (techSpecs.length === 0) {
          return { canGenerate: false, reason: "Generate Tech Spec first" }
        }
        return { canGenerate: true }
      default:
        return { canGenerate: true }
    }
  }, [analyses, mvpPlans.length, prds.length, project.description, techSpecs.length])

  const generateDocument: GenerateDocumentFn = useCallback(
    async (docType, model, options) => {
      setGeneratingDocuments((prev) => ({ ...prev, [docType]: true }))
      saveGeneratingState(docType, true)
      setLocalGenerationErrors((prev) => ({ ...prev, [docType]: undefined }))

      try {
        const endpointMap: Record<string, string> = {
          competitive: "/api/analysis/competitive-analysis",
          prd: "/api/analysis/prd",
          mvp: "/api/analysis/mvp-plan",
          mockups: "/api/mockups/generate",
        }
        const endpoint = endpointMap[docType]
        if (!endpoint) throw new Error(`Unsupported document type: ${docType}`)

        let competitiveContent: string | undefined
        let prdContent: string | undefined
        let mvpContent: string | undefined

        const supabase = createSupabaseClient()

        if (docType === "prd") {
          const { data } = await supabase
            .from("analyses")
            .select("content")
            .eq("project_id", project.id)
            .eq("type", "competitive-analysis")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          competitiveContent =
            data?.content ??
            analyses.find((analysis) => analysis.type === "competitive-analysis")?.content
        } else if (docType === "mvp") {
          const { data } = await supabase
            .from("prds")
            .select("content")
            .eq("project_id", project.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          prdContent = data?.content ?? prds[0]?.content
        } else if (docType === "mockups") {
          const { data } = await supabase
            .from("mvp_plans")
            .select("content")
            .eq("project_id", project.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          mvpContent = data?.content ?? mvpPlans[0]?.content
          const { data: productPlanData } = await supabase
            .from("prds")
            .select("content")
            .eq("project_id", project.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          prdContent = productPlanData?.content ?? prds[0]?.content
        }

        if (docType === "mockups") {
          if (!mvpContent) {
            throw new Error("Generate First Version Plan first")
          }

          const optionLabels = ["A", "B", "C"] as const
          const isMockupFixtureMode =
            searchParams.get("mockupFixture") === "1" ||
            (typeof window !== "undefined" &&
              localStorage.getItem("makercompass_mockup_fixture_mode") === "true")
          const clearMockupDraftRun = () => {
            setMockupDraftRunId(null)
            setMockupDraftDesignPlan(null)
            if (typeof window !== "undefined") {
              localStorage.removeItem(mockupDraftRunStorageKey)
              localStorage.removeItem(mockupDraftDesignPlanStorageKey)
            }
          }

          if (isMockupFixtureMode) {
            setMockupOptionStatuses(optionLabels.map((label) => ({
              label: `Option ${label}`,
              status: "generating" as const,
              message: "Generating fixture",
            })))

            const response = await fetch("/api/mockups/fixture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId: project.id,
                projectName: project.name,
              }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok) {
              throw new Error(payload?.error || "Failed to generate fixture mockups")
            }

            setMockupOptionStatuses(optionLabels.map((label) => ({
              label: `Option ${label}`,
              status: "ready" as const,
              message: "Ready",
            })))
            setMockupDraftOptions([])
            clearMockupDraftRun()
            setLocalGenerationErrors((prev) => ({ ...prev, [docType]: undefined }))
            await loadWorkspaceDocuments([docType], { force: true })
            return true
          }

          const runId = mockupDraftRunId ?? crypto.randomUUID()
          if (!mockupDraftRunId) {
            setMockupDraftRunId(runId)
            if (typeof window !== "undefined") {
              localStorage.setItem(mockupDraftRunStorageKey, runId)
            }
          }
          const optionStatusLabels: Record<typeof optionLabels[number], string> = {
            A: "Option A",
            B: "Option B",
            C: "Option C",
          }
          const getOptionStatusLabel = (label: typeof optionLabels[number]) => optionStatusLabels[label]
          const updateMockupOptionStatus = (
            label: typeof optionLabels[number],
            status: MockupOptionStatus["status"],
            message: string,
          ) => {
            setMockupOptionStatuses((prev) => {
              const existing = new Map(prev.map((option) => [option.label, option]))
              existing.set(getOptionStatusLabel(label), {
                label: getOptionStatusLabel(label),
                status,
                message,
              })
              return optionLabels.map((optionLabel) =>
                existing.get(getOptionStatusLabel(optionLabel)) ?? {
                  label: getOptionStatusLabel(optionLabel),
                  status: "queued" as const,
                  message: "Queued",
                },
              )
            })
          }

          const optionsByLabel = new Map(
            mockupDraftOptions.map((option) => [option.label.toUpperCase(), option]),
          )
          let activeMockupDesignPlan = mockupDraftDesignPlan
          const syncDraftOptions = () => {
            setMockupDraftOptions(
              optionLabels
                .map((optionLabel) => optionsByLabel.get(optionLabel))
                .filter((option): option is OpenRouterImageMockupOption => Boolean(option)),
            )
          }
          const markStoredOptionsReady = (storedOptions: OpenRouterImageMockupOption[]) => {
            for (const option of storedOptions) {
              const label = option.label.toUpperCase() as typeof optionLabels[number]
              if (!optionLabels.includes(label)) continue

              optionsByLabel.set(label, option)
              updateMockupOptionStatus(label, "ready", "Recovered")
            }
            syncDraftOptions()
          }
          const recoverStoredOptions = async () => {
            const response = await fetch("/api/mockups/recover-options", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId: project.id,
                runId,
                designPlan: activeMockupDesignPlan,
              }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok) return

            const storedOptions = Array.isArray(payload?.options)
              ? payload.options.filter((option: unknown): option is OpenRouterImageMockupOption =>
                Boolean(
                  option &&
                  typeof option === "object" &&
                  typeof (option as OpenRouterImageMockupOption).label === "string" &&
                  typeof (option as OpenRouterImageMockupOption).storagePath === "string",
                ),
              )
              : []
            markStoredOptionsReady(storedOptions)
          }

          setMockupOptionStatuses(optionLabels.map((label) => ({
            label: getOptionStatusLabel(label),
            status: optionsByLabel.has(label) ? "ready" : "queued",
            message: optionsByLabel.has(label) ? "Ready" : "Queued",
          })))

          const externalSignal = options?.signal
          const requestWithTimeout = async (
            url: string,
            init: Omit<RequestInit, "signal">,
            timeoutMs = GENERATION_REQUEST_TIMEOUT_MS,
          ) => {
            const requestController = new AbortController()
            const timeoutId = setTimeout(() => requestController.abort(), timeoutMs)
            const handleExternalAbort = () => requestController.abort()

            if (externalSignal) {
              if (externalSignal.aborted) {
                requestController.abort()
              } else {
                externalSignal.addEventListener("abort", handleExternalAbort, { once: true })
              }
            }

            try {
              return await fetch(url, {
                ...init,
                signal: requestController.signal,
              })
            } finally {
              clearTimeout(timeoutId)
              externalSignal?.removeEventListener("abort", handleExternalAbort)
            }
          }

          await recoverStoredOptions()

          const optionResults: MockupOptionGenerationResult[] = []
          for (const label of optionLabels) {
            const existingOption = optionsByLabel.get(label)
            if (existingOption) {
              optionResults.push({
                skipped: false,
                option: existingOption,
                model,
                designPlan: activeMockupDesignPlan ?? undefined,
              })
              continue
            }

            updateMockupOptionStatus(label, "generating", "Generating")

            try {
              const response = await requestWithTimeout("/api/mockups/generate-option", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectId: project.id,
                  mvpPlan: mvpContent,
                  projectName: project.name,
                  idea: project.description,
                  productPlan: prdContent,
                  label,
                  runId,
                  designPlan: activeMockupDesignPlan,
                }),
              })

              const payload = await response.json().catch(() => null)
              if (!response.ok) {
                optionResults.push({
                  skipped: false,
                  option: null,
                  model,
                  error: payload?.error || `Failed to generate mockup option ${label}`,
                })
                continue
              }
              if (payload?.skipped) {
                optionResults.push({ skipped: true })
                continue
              }

              const option = payload?.option as OpenRouterImageMockupOption | undefined
              const resultModel = typeof payload?.model === "string" ? payload.model : model
              const returnedDesignPlan = payload?.designPlan && typeof payload.designPlan === "object"
                ? payload.designPlan
                : null
              if (!option) {
                optionResults.push({
                  skipped: false,
                  option: null,
                  model: resultModel,
                  error: `Mockup option ${label} did not return image data`,
                })
                continue
              }
              if (returnedDesignPlan && !activeMockupDesignPlan) {
                activeMockupDesignPlan = returnedDesignPlan
                setMockupDraftDesignPlan(returnedDesignPlan)
                if (typeof window !== "undefined") {
                  localStorage.setItem(mockupDraftDesignPlanStorageKey, JSON.stringify(returnedDesignPlan))
                }
              }

              updateMockupOptionStatus(label, "ready", "Ready")
              optionsByLabel.set(label, option)
              syncDraftOptions()
              optionResults.push({
                skipped: false,
                option,
                model: resultModel,
                designPlan: returnedDesignPlan ?? activeMockupDesignPlan ?? undefined,
              })
            } catch (error) {
              if (externalSignal?.aborted) throw error

              optionResults.push({
                skipped: false,
                option: null,
                model,
                error: error instanceof Error
                  ? error.message
                  : `Failed to generate mockup option ${label}`,
              })
            }
          }

          const firstSkipped = optionResults.find((result) => result.skipped)
          if (firstSkipped) {
            setMockupDraftOptions([])
            clearMockupDraftRun()
            await loadWorkspaceDocuments([docType], { force: true })
            return true
          }

          await recoverStoredOptions()

          const failures = optionResults.filter((result) =>
            !result.skipped && Boolean(result.error),
          )
          const readyOptions = optionLabels
            .map((label) => optionsByLabel.get(label))
            .filter((option): option is OpenRouterImageMockupOption => Boolean(option))

          if (readyOptions.length !== optionLabels.length) {
            optionResults.forEach((result, index) => {
              if (!result.skipped && result.error) {
                updateMockupOptionStatus(optionLabels[index], "needs_retry", "Needs retry")
              }
            })
            optionLabels.forEach((label) => {
              if (!optionsByLabel.has(label)) {
                updateMockupOptionStatus(label, "needs_retry", "Needs retry")
              }
            })
            const message = failures[0]?.skipped === false && failures[0].error
              ? failures[0].error
              : "One or more mockup options are not available yet"
            throw new Error(message)
          }

          const fulfilledModel = optionResults.find((result) =>
            !result.skipped && result.option && typeof result.model === "string",
          )
          const finalizedModel = fulfilledModel?.skipped === false ? fulfilledModel.model : model
          const finalizedDesignPlan = optionResults.find((result) =>
            !result.skipped && result.designPlan,
          )
          const finalizeResponse = await requestWithTimeout("/api/mockups/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: project.id,
              runId,
              model: finalizedModel,
              options: readyOptions,
              designPlan: finalizedDesignPlan?.skipped === false
                ? finalizedDesignPlan.designPlan
                : activeMockupDesignPlan,
            }),
          }, 60000)
          const finalizePayload = await finalizeResponse.json().catch(() => null)
          if (!finalizeResponse.ok) {
            throw new Error(finalizePayload?.error || "Failed to save generated mockups")
          }

          setMockupDraftOptions([])
          clearMockupDraftRun()
          setLocalGenerationErrors((prev) => ({ ...prev, [docType]: undefined }))
          await loadWorkspaceDocuments([docType], { force: true })
          return true
        }

        const externalSignal = options?.signal
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), GENERATION_REQUEST_TIMEOUT_MS)

        if (externalSignal) {
          if (externalSignal.aborted) {
            controller.abort()
          } else {
            externalSignal.addEventListener("abort", () => controller.abort(), { once: true })
          }
        }

        let response: Response
        try {
          response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              projectId: project.id,
              idea: project.description,
              name: projectName,
              ...(model && { model }),
              ...(!["prd", "mvp"].includes(docType) && { stream: true }),
              ...(docType === "prd" && competitiveContent && {
                competitiveAnalysis: competitiveContent,
              }),
              ...(docType === "mvp" && prdContent && {
                prd: prdContent,
              }),
            }),
          })
        } finally {
          clearTimeout(timeoutId)
        }

        if (!response.ok) {
          let errorMsg = "Failed to generate content"
          try {
            const errorData = await response.json()
            if (errorData?.error) errorMsg = errorData.error
          } catch {
            // ignore parse errors
          }
          throw new Error(errorMsg)
        }

        const contentType = response.headers.get("Content-Type") ?? ""
        if (contentType.includes("application/x-ndjson")) {
          let streamError: string | undefined
          await parseDocumentStream(response, {
            onStage: () => {},
            onToken: () => {},
            onDone: () => {},
            onError: (message) => { streamError = message },
          })
          if (streamError) throw new Error(streamError)
        }

        await loadWorkspaceDocuments([docType], { force: true })
        setLocalGenerationErrors((prev) => ({ ...prev, [docType]: undefined }))
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generation failed"
        setLocalGenerationErrors((prev) => ({ ...prev, [docType]: message }))
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error
        }
        if (error instanceof Error) throw error
        throw new Error("Unknown generation error")
      } finally {
        setGeneratingDocuments((prev) => ({ ...prev, [docType]: false }))
        saveGeneratingState(docType, false)
      }
    },
    [
      analyses,
      loadWorkspaceDocuments,
      mockupDraftDesignPlan,
      mockupDraftDesignPlanStorageKey,
      mockupDraftOptions,
      mockupDraftRunId,
      mockupDraftRunStorageKey,
      mvpPlans,
      prds,
      project,
      projectName,
      saveGeneratingState,
      searchParams,
      setGeneratingDocuments,
      setLocalGenerationErrors,
      setMockupDraftDesignPlan,
      setMockupDraftOptions,
      setMockupDraftRunId,
      setMockupOptionStatuses,
    ],
  )

  const handleGenerateDocument = useCallback(async (docType: DocumentType) => {
    const prerequisites = checkPrerequisites(docType)
    if (!prerequisites.canGenerate) {
      alert(prerequisites.reason ?? "This module is not ready to generate yet.")
      return
    }

    try {
      if (docType !== "mockups") {
        setMockupOptionStatuses([])
      }
      const didGenerate = await generateDocument(docType, GENERATE_ALL_DEFAULT_MODELS[docType] ?? "")
      if (
        didGenerate &&
        shouldResumeQueueAfterDocumentRetry({
          queueStatus: generateAllStatus,
          retriedDocType: docType,
          queue: generateAllQueue,
        })
      ) {
        await resumeGenerateAll()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed. Please try again."
      console.warn(`[WorkspaceGeneration] ${docType} failed: ${message}`)
      if (docType === "mockups") {
        return
      }
      if (error instanceof Error && error.name === "AbortError") {
        alert(GENERATION_TIMEOUT_MESSAGE)
      } else if (error instanceof Error) {
        alert(error.message)
      } else {
        alert("Generation failed. Please try again.")
      }
    }
  }, [checkPrerequisites, generateAllQueue, generateAllStatus, generateDocument, resumeGenerateAll, setMockupOptionStatuses])

  return { handleGenerateDocument }
}
