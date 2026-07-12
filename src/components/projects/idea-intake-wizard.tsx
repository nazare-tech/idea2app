"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { IntakeIdeaStep } from "@/components/projects/intake-idea-step"
import { IntakeQuestionStep } from "@/components/projects/intake-question-step"
import { IntakeSubmissionLoadingPanel } from "@/components/projects/intake-submission-loading-panel"
import {
  buildAnswers,
  emptyAnswer,
  hasAnswer,
  type AnswerDraft,
  type AnswerState,
} from "@/lib/intake/answers"
import { validateIdeaInput } from "@/lib/intake/idea-validation"
import { waitForFirstStreamedToken } from "@/lib/intake/wait-for-first-token"
import type { IntakeQuestionSet } from "@/lib/intake/types"

const SESSION_IDEA_KEY = "makercompass:intake:draft"
const MIN_INTAKE_QUESTIONS = 4
const MAX_INTAKE_QUESTIONS = 7

/**
 * The wizard's single mode. Every screen decision derives from this union
 * (plus `error`, which can accompany "idea" and "questions-failed"):
 * - idea: step 1, editing the idea brief
 * - generating-questions: step 2 with skeleton cards, request in flight
 * - questions: step 2 with the generated question set
 * - questions-failed: step 2 with nothing to answer and a Retry action
 * - creating: submission loading panel until the workspace has live content
 */
type WizardPhase =
  | "idea"
  | "generating-questions"
  | "questions"
  | "questions-failed"
  | "creating"

interface IdeaIntakeWizardProps {
  pendingToken?: string | null
  autoStartQuestions?: boolean
}

function normalizeIdea(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function IdeaIntakeWizard({ pendingToken, autoStartQuestions = false }: IdeaIntakeWizardProps) {
  const router = useRouter()
  const autoStartAttemptedRef = useRef(false)
  const [phase, setPhase] = useState<WizardPhase>("idea")
  // Guards async actions against stale-closure double fires (double click,
  // Enter + click in one tick). Mirrors `phase`; transition() keeps them in sync.
  const phaseRef = useRef<WizardPhase>("idea")
  const [idea, setIdea] = useState("")
  const [lastGeneratedIdea, setLastGeneratedIdea] = useState("")
  const [questionSet, setQuestionSet] = useState<IntakeQuestionSet | null>(null)
  const [answers, setAnswers] = useState<AnswerState>({})
  const [isLoadingPending, setIsLoadingPending] = useState(Boolean(pendingToken))
  const [error, setError] = useState<string | null>(null)

  const transition = useCallback((next: WizardPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const normalizedIdea = useMemo(() => normalizeIdea(idea), [idea])
  const ideaValidation = useMemo(() => validateIdeaInput(idea), [idea])
  const canContinue = ideaValidation.status === "ok"
  // Guidance, not an error: shown only while a non-empty idea is below the floor.
  const ideaHint =
    ideaValidation.status !== "ok" && ideaValidation.status !== "empty"
      ? ideaValidation.message
      : null
  const questions = questionSet?.questions ?? []
  const allQuestionsAnswered =
    questions.length > 0 && questions.every((question) => hasAnswer(question, answers[question.id]))
  const isIdeaStepLocked = isLoadingPending || phase === "generating-questions"

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

  const updateIdea = (value: string) => {
    setIdea(value)
    setError(null)

    if (lastGeneratedIdea && normalizeIdea(value) !== lastGeneratedIdea) {
      setQuestionSet(null)
      setAnswers({})
      setLastGeneratedIdea("")
    }
  }

  const generateQuestions = useCallback(async () => {
    if (!canContinue || phaseRef.current === "generating-questions") return
    setError(null)

    // Same idea, questions already generated: just reveal them.
    if (questionSet && normalizedIdea === lastGeneratedIdea) {
      transition("questions")
      return
    }

    // Reveal Step 2 immediately with skeleton question cards, then generate,
    // so the wait reads as "writing your questions" instead of a stalled button.
    setQuestionSet(null)
    setAnswers({})
    transition("generating-questions")
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

      const generatedQuestions = data?.questionSet?.questions
      if (
        !Array.isArray(generatedQuestions) ||
        generatedQuestions.length < MIN_INTAKE_QUESTIONS ||
        generatedQuestions.length > MAX_INTAKE_QUESTIONS
      ) {
        throw new Error("We couldn't generate a complete question set. Please retry in a moment.")
      }

      setQuestionSet(data.questionSet)
      setAnswers({})
      setLastGeneratedIdea(normalizedIdea)
      transition("questions")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate questions")
      transition("questions-failed")
    }
  }, [canContinue, lastGeneratedIdea, normalizedIdea, questionSet, transition])

  useEffect(() => {
    if (!autoStartQuestions || autoStartAttemptedRef.current || isLoadingPending || phase !== "idea") {
      return
    }

    autoStartAttemptedRef.current = true

    if (!canContinue) {
      setError(
        idea.trim()
          ? "We restored your idea, but it needs a little more detail before we can generate questions."
          : "We couldn't restore your landing page idea. Please paste it here to continue."
      )
      return
    }

    void generateQuestions()
  }, [autoStartQuestions, canContinue, generateQuestions, idea, isLoadingPending, phase])

  const setAnswer = (questionId: string, updater: (draft: AnswerDraft) => AnswerDraft) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: updater(prev[questionId] ?? emptyAnswer()),
    }))
  }

  const createProject = async () => {
    if (!questionSet || !allQuestionsAnswered || phaseRef.current === "creating") return
    setError(null)
    transition("creating")

    try {
      const response = await fetch("/api/projects/create-from-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: normalizedIdea,
          questions,
          answers: buildAnswers(questions, answers),
          source: pendingToken || autoStartQuestions ? "landing" : "dashboard",
          pendingToken,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create project")
      }

      // Fire onboarding generation and go straight to the workspace: it
      // hydrates the durable queue, streams Market Research in place, and
      // retries execute itself if this fire-and-forget request is lost.
      if (typeof data?.project?.id === "string") {
        fetch("/api/generate-all/execute", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: data.project.id }),
        }).catch((executeError) => {
          console.error("[intake] Failed to start onboarding generation:", executeError)
        })

        // Hold the loading panel here until Market Research has actually
        // started streaming, so the workspace never opens to a blank state.
        await waitForFirstStreamedToken(data.project.id)
      }

      const redirectUrl =
        (typeof data?.redirectUrl === "string" && data.redirectUrl) ||
        (typeof data?.projectUrl === "string" && data.projectUrl) ||
        "/projects"
      window.sessionStorage.removeItem(SESSION_IDEA_KEY)
      router.push(redirectUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
      transition("questions")
    }
  }

  if (phase === "creating") {
    return <IntakeSubmissionLoadingPanel />
  }

  if (phase === "idea") {
    return (
      <IntakeIdeaStep
        idea={idea}
        onIdeaChange={updateIdea}
        onSubmit={() => void generateQuestions()}
        hint={ideaHint}
        error={error}
        locked={isIdeaStepLocked}
        submitDisabled={!canContinue || isIdeaStepLocked}
        isLoadingPending={isLoadingPending}
      />
    )
  }

  return (
    <IntakeQuestionStep
      generating={phase === "generating-questions"}
      failed={phase === "questions-failed"}
      questions={questions}
      answers={answers}
      error={error}
      createDisabled={!allQuestionsAnswered}
      onAnswerChange={setAnswer}
      onBack={() => transition("idea")}
      onRetry={() => void generateQuestions()}
      onCreate={() => void createProject()}
    />
  )
}
