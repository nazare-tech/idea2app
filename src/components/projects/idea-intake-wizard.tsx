"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  IntakeSubmissionLoadingPanel,
  type IntakeLoadingRow,
} from "@/components/projects/intake-submission-loading-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { INTAKE_EXAMPLE_IDEAS } from "@/lib/intake-examples"
import type { IntakeAnswer, IntakeQuestion, IntakeQuestionSet } from "@/lib/intake-types"
import { cn } from "@/lib/utils"

const SESSION_IDEA_KEY = "idea2app:intake:draft"
const MIN_IDEA_LENGTH = 10
const WIZARD_TOTAL_STEPS = 2

type WizardStep = "idea" | "questions"

type OnboardingStatusPayload = {
  readyToRedirect?: boolean
  redirectUrl?: string
  effectiveStatus?: string
  rows?: IntakeLoadingRow[]
  needsExecute?: boolean
}

type AnswerDraft = {
  selectedOptionIds: string[]
  otherSelected: boolean
  otherText: string
  text: string
}

type AnswerState = Record<string, AnswerDraft>

interface IdeaIntakeWizardProps {
  pendingToken?: string | null
}

function emptyAnswer(): AnswerDraft {
  return {
    selectedOptionIds: [],
    otherSelected: false,
    otherText: "",
    text: "",
  }
}

function normalizeIdea(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function IdeaIntakeWizard({ pendingToken }: IdeaIntakeWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>("idea")
  const [idea, setIdea] = useState("")
  const [lastGeneratedIdea, setLastGeneratedIdea] = useState("")
  const [questionSet, setQuestionSet] = useState<IntakeQuestionSet | null>(null)
  const [answers, setAnswers] = useState<AnswerState>({})
  const [isLoadingPending, setIsLoadingPending] = useState(Boolean(pendingToken))
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [creationStatusUrl, setCreationStatusUrl] = useState<string | null>(null)
  const [creationRedirectUrl, setCreationRedirectUrl] = useState<string | null>(null)
  const [creationProjectId, setCreationProjectId] = useState<string | null>(null)
  const [creationRows, setCreationRows] = useState<IntakeLoadingRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const normalizedIdea = useMemo(() => normalizeIdea(idea), [idea])
  const canContinue = normalizedIdea.length >= MIN_IDEA_LENGTH
  const questions = questionSet?.questions ?? []
  const allQuestionsAnswered = questions.length > 0 && questions.every((question) => hasAnswer(question, answers[question.id]))

  useEffect(() => {
    let cancelled = false

    async function loadPendingIdea() {
      if (pendingToken) {
        setIsLoadingPending(true)
        try {
          const response = await fetch(`/api/intake/pending?token=${encodeURIComponent(pendingToken)}`, {
            cache: "no-store",
          })
          if (response.ok) {
            const data = await response.json()
            if (!cancelled && typeof data.idea === "string") {
              setIdea(data.idea)
              window.sessionStorage.setItem(SESSION_IDEA_KEY, data.idea)
              return
            }
          }
        } catch {
          // Fall through to sessionStorage.
        } finally {
          if (!cancelled) setIsLoadingPending(false)
        }
      }

      if (!cancelled) {
        const stored = window.sessionStorage.getItem(SESSION_IDEA_KEY)
        if (stored) setIdea(stored)
        setIsLoadingPending(false)
      }
    }

    loadPendingIdea()

    return () => {
      cancelled = true
    }
  }, [pendingToken])

  useEffect(() => {
    if (!idea.trim()) {
      window.sessionStorage.removeItem(SESSION_IDEA_KEY)
      return
    }
    window.sessionStorage.setItem(SESSION_IDEA_KEY, idea)
  }, [idea])

  useEffect(() => {
    if (!isCreatingProject || !creationStatusUrl) return

    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | null = null
    let idlePollCount = 0
    let executeRetryCount = 0

    async function pollOnboardingStatus() {
      try {
        const response = await fetch(creationStatusUrl!, { cache: "no-store" })
        const data = (await response.json().catch(() => null)) as OnboardingStatusPayload | null

        if (cancelled) return

        if (response.ok && data) {
          if (Array.isArray(data.rows)) {
            setCreationRows(data.rows)

            const hasPendingWork = data.rows.some((row) => row.status === "pending")
            const hasGeneratingWork = data.rows.some((row) => row.status === "generating")
            if ((data.needsExecute || hasPendingWork) && !hasGeneratingWork) {
              idlePollCount += 1
              if (creationProjectId && idlePollCount >= 2 && executeRetryCount < 3) {
                executeRetryCount += 1
                fetch("/api/generate-all/execute", {
                  method: "POST",
                  keepalive: true,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ projectId: creationProjectId }),
                }).catch((executeError) => {
                  console.error("[intake] Failed to retry onboarding generation:", executeError)
                })
              }
            } else {
              idlePollCount = 0
            }
          }

          if (data.readyToRedirect) {
            window.sessionStorage.removeItem(SESSION_IDEA_KEY)
            router.push(data.redirectUrl || creationRedirectUrl || "/projects")
            router.refresh()
            return
          }

          if (data.effectiveStatus === "error") {
            setError("We couldn't generate the initial project documents. Please try again.")
            setIsCreatingProject(false)
            return
          }
        }
      } catch {
        // Keep polling through transient network errors while the server runs.
      }

      if (!cancelled) {
        timeout = setTimeout(pollOnboardingStatus, 2000)
      }
    }

    pollOnboardingStatus()

    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
    }
  }, [creationProjectId, creationRedirectUrl, creationStatusUrl, isCreatingProject, router])

  const updateIdea = (value: string) => {
    setIdea(value)
    setError(null)

    if (lastGeneratedIdea && normalizeIdea(value) !== lastGeneratedIdea) {
      setQuestionSet(null)
      setAnswers({})
      setLastGeneratedIdea("")
    }
  }

  const generateQuestions = async () => {
    if (!canContinue || isGeneratingQuestions) return
    setError(null)

    if (questionSet && normalizedIdea === lastGeneratedIdea) {
      setStep("questions")
      return
    }

    setIsGeneratingQuestions(true)
    try {
      const response = await fetch("/api/intake/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: normalizedIdea }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate questions")
      }

      setQuestionSet(data.questionSet)
      setAnswers({})
      setLastGeneratedIdea(normalizedIdea)
      setStep("questions")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate questions")
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  const setAnswer = (questionId: string, updater: (draft: AnswerDraft) => AnswerDraft) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: updater(prev[questionId] ?? emptyAnswer()),
    }))
  }

  const createProject = async () => {
    if (!questionSet || !allQuestionsAnswered || isCreatingProject) return
    setError(null)
    setIsCreatingProject(true)
    setCreationRows(null)
    setCreationStatusUrl(null)
    setCreationRedirectUrl(null)
    setCreationProjectId(null)

    try {
      const response = await fetch("/api/projects/create-from-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: normalizedIdea,
          questions,
          answers: buildAnswers(questions, answers),
          source: pendingToken ? "landing" : "dashboard",
          pendingToken,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create project")
      }

      if (typeof data?.statusUrl === "string" && typeof data?.project?.id === "string") {
        const redirectUrl = typeof data.redirectUrl === "string" ? data.redirectUrl : data.projectUrl
        setCreationStatusUrl(data.statusUrl)
        setCreationRedirectUrl(redirectUrl)
        setCreationProjectId(data.project.id)

        fetch("/api/generate-all/execute", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: data.project.id }),
        }).catch((executeError) => {
          console.error("[intake] Failed to start onboarding generation:", executeError)
        })
        return
      }

      window.sessionStorage.removeItem(SESSION_IDEA_KEY)
      router.push(data.projectUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
      setCreationRows(null)
      setCreationStatusUrl(null)
      setCreationRedirectUrl(null)
      setCreationProjectId(null)
      setIsCreatingProject(false)
    }
  }

  if (isCreatingProject) {
    return <IntakeSubmissionLoadingPanel rows={creationRows ?? undefined} />
  }

  return (
    <div data-testid="idea-intake-wizard" className="min-h-full bg-[#FAFAFA] px-4 py-5 text-text-primary sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-[600px] flex-col">
        <div className="flex flex-1 items-start justify-center">
          {step === "idea" ? (
            <section className="w-full">
              <div className="rounded-lg border border-border-subtle bg-white p-8 sm:px-10">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
                  Step 1 of {WIZARD_TOTAL_STEPS}
                </p>
                <h2 className="mt-1 font-[family:var(--font-display)] text-5xl font-bold tracking-[-0.04em] text-[#0A0A0A]">
                  Idea Brief
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[#666666]">
                  Describe your business idea in a few sentences
                </p>

                <div className="mt-6">
                  <label htmlFor="idea-brief" className="sr-only">
                    What are you building?
                  </label>
                  <Textarea
                    id="idea-brief"
                    data-testid="intake-idea-textarea"
                    value={idea}
                    onChange={(event) => updateIdea(event.target.value)}
                    placeholder="Example: A product intelligence tool that turns support tickets, sales calls, and customer chats into roadmap priorities..."
                    className="min-h-[170px] border-border-strong bg-white text-[15px] leading-relaxed"
                    disabled={isLoadingPending}
                  />
                </div>

                {isLoadingPending && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
                    <Spinner size="sm" />
                    Loading your saved idea...
                  </div>
                )}

                <div className="mt-6">
                  <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
                    Or start from an example
                  </p>
                  <div className="mt-3 grid gap-3">
                    {INTAKE_EXAMPLE_IDEAS.map((example) => (
                      <button
                        key={example.id}
                        type="button"
                        onClick={() => updateIdea(example.description)}
                        className="rounded-lg border border-border-subtle bg-white p-4 text-left transition-colors hover:border-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="block text-sm font-semibold">{example.title}</span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-text-secondary">
                          {example.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <WizardError error={error} />

              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  onClick={generateQuestions}
                  disabled={!canContinue || isGeneratingQuestions || isLoadingPending}
                  className="h-10 rounded-md bg-text-primary px-[18px] font-[family:var(--font-display)] text-[13px] font-medium text-white hover:bg-text-primary/90"
                  data-testid="intake-continue"
                >
                  {isGeneratingQuestions ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating questions
                    </>
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </section>
          ) : (
            <section className="w-full">
              <div className="rounded-lg border border-border-subtle bg-white p-8 sm:px-10">
                <div className="mb-6">
                  <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
                    Step 2 of {WIZARD_TOTAL_STEPS}
                  </p>
                  <h2 className="mt-1 font-[family:var(--font-display)] text-5xl font-bold tracking-[-0.04em] text-[#0A0A0A]">
                    Tell us a bit more
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#666666]">
                    These questions will help build a better plan for your business
                  </p>
                </div>

                <div className="space-y-4">
                  {questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      answer={answers[question.id] ?? emptyAnswer()}
                      onAnswerChange={(updater) => setAnswer(question.id, updater)}
                    />
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("idea")}
                    disabled={isCreatingProject}
                    className="h-10 rounded-md border-text-primary bg-transparent px-[18px] font-[family:var(--font-display)] text-[13px] font-medium text-text-primary hover:bg-background"
                    data-testid="intake-back"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={createProject}
                    disabled={!allQuestionsAnswered || isCreatingProject}
                    className="h-10 rounded-md bg-text-primary px-[18px] font-[family:var(--font-display)] text-[13px] font-medium text-white hover:bg-text-primary/90"
                    data-testid="intake-create-project"
                  >
                    {isCreatingProject ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating project
                      </>
                    ) : (
                      "Create project"
                    )}
                  </Button>
                </div>
              </div>

              <WizardError error={error} />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  answer,
  onAnswerChange,
}: {
  question: IntakeQuestion
  answer: AnswerDraft
  onAnswerChange: (updater: (draft: AnswerDraft) => AnswerDraft) => void
}) {
  return (
    <article className="rounded-lg border border-border-subtle bg-white p-[18px]">
      <div className="min-w-0">
        <h3 className="font-[family:var(--font-display)] text-xl font-bold leading-snug tracking-[-0.015em] text-[#0D1320]">
          {question.question}
        </h3>
        {question.helperText && (
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{question.helperText}</p>
        )}

        {question.selectionMode === "text" ? (
          <Textarea
            value={answer.text}
            onChange={(event) =>
              onAnswerChange((draft) => ({ ...draft, text: event.target.value }))
            }
            placeholder="Write a short answer..."
            className="mt-4 min-h-[104px] border-border-strong bg-white"
          />
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {question.options.map((option) => {
                const selected = answer.selectedOptionIds.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      onAnswerChange((draft) => toggleOption(question, draft, option.id))
                    }
                    className={cn(
                      "inline-flex max-w-full items-center rounded-md border px-3 py-1.5 text-left text-xs font-medium whitespace-normal break-words transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      selected
                        ? "border-text-primary bg-text-primary text-white"
                        : "border-border-subtle bg-white text-text-primary hover:border-text-primary"
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
              {question.allowOther && (
                <button
                  type="button"
                  onClick={() =>
                    onAnswerChange((draft) => toggleOther(question, draft))
                  }
                  className={cn(
                    "inline-flex max-w-full items-center rounded-md border px-3 py-1.5 text-left text-xs font-medium whitespace-normal break-words transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    answer.otherSelected
                      ? "border-text-primary bg-text-primary text-white"
                      : "border-border-subtle bg-white text-text-primary hover:border-text-primary"
                  )}
                >
                  Other
                </button>
              )}
            </div>
            {question.allowOther && shouldShowOtherInput(question, answer) && (
              <Input
                value={answer.otherText}
                onChange={(event) =>
                  onAnswerChange((draft) => ({ ...draft, otherText: event.target.value }))
                }
                placeholder="Type another answer..."
                className="mt-3 border-border-strong bg-white"
              />
            )}
          </>
        )}
      </div>
    </article>
  )
}

function toggleOption(question: IntakeQuestion, draft: AnswerDraft, optionId: string): AnswerDraft {
  if (question.selectionMode === "single") {
    return {
      ...draft,
      selectedOptionIds: draft.selectedOptionIds.includes(optionId) ? [] : [optionId],
      otherSelected: false,
      otherText: "",
    }
  }

  const selected = new Set(draft.selectedOptionIds)
  if (selected.has(optionId)) {
    selected.delete(optionId)
  } else {
    selected.add(optionId)
  }

  return {
    ...draft,
    selectedOptionIds: [...selected],
  }
}

function toggleOther(question: IntakeQuestion, draft: AnswerDraft): AnswerDraft {
  if (question.selectionMode === "single") {
    return {
      ...draft,
      selectedOptionIds: [],
      otherSelected: !draft.otherSelected,
      otherText: draft.otherSelected ? "" : draft.otherText,
    }
  }

  return {
    ...draft,
    otherSelected: !draft.otherSelected,
    otherText: draft.otherSelected ? "" : draft.otherText,
  }
}

function shouldShowOtherInput(question: IntakeQuestion, answer: AnswerDraft) {
  if (!question.allowOther) return false
  return answer.otherSelected
}

function hasAnswer(question: IntakeQuestion, answer: AnswerDraft | undefined) {
  if (!answer) return false
  if (question.selectionMode === "text") return answer.text.trim().length > 0
  return answer.selectedOptionIds.length > 0 || answer.otherText.trim().length > 0
}

function buildAnswers(questions: IntakeQuestion[], answers: AnswerState): IntakeAnswer[] {
  return questions.map((question) => {
    const answer = answers[question.id] ?? emptyAnswer()
    return {
      questionId: question.id,
      ...(question.selectionMode === "text"
        ? { text: answer.text.trim() }
        : {
            ...(answer.selectedOptionIds.length > 0 ? { selectedOptionIds: answer.selectedOptionIds } : {}),
            ...(answer.otherSelected && answer.otherText.trim() ? { otherText: answer.otherText.trim() } : {}),
          }),
    }
  })
}

function WizardError({ error }: { error: string | null }) {
  if (!error) return null

  return (
    <p className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {error}
    </p>
  )
}
