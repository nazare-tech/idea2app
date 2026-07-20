"use client"

import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  WIZARD_OUTLINE_BUTTON_CLASS,
  WIZARD_PRIMARY_BUTTON_CLASS,
  WizardError,
  WizardStepKicker,
} from "@/components/projects/intake-wizard-chrome"
import {
  emptyAnswer,
  shouldShowOtherInput,
  supportsAnswerEscapeHatches,
  toggleDecideForMe,
  toggleOption,
  toggleOther,
  type AnswerDraft,
  type AnswerState,
} from "@/lib/intake/answers"
import { INTAKE_OTHER_TEXT_MAX_LENGTH, type IntakeQuestion } from "@/lib/intake/types"
import { cn } from "@/lib/utils"

// Skeleton placeholders shown while questions generate.
const SKELETON_TITLE_WIDTHS = ["58%", "44%", "66%", "50%"]
const QUESTION_REVEAL_STAGGER_MS = 90

const CHIP_BASE_CLASS =
  "inline-flex min-h-11 max-w-full items-center rounded-md border px-3 py-2 text-left text-xs font-medium whitespace-normal break-words transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:py-1.5"
const CHIP_SELECTED_CLASS = "border-text-primary bg-text-primary text-white"
const CHIP_UNSELECTED_CLASS =
  "border-border-subtle bg-white text-text-primary hover:border-text-primary"

interface IntakeQuestionStepProps {
  /** Skeleton cards while the question set is being written. */
  generating: boolean
  /** Generation failed and there is nothing to answer: offer Retry. */
  failed: boolean
  questions: IntakeQuestion[]
  answers: AnswerState
  error: string | null
  createDisabled: boolean
  onAnswerChange: (questionId: string, updater: (draft: AnswerDraft) => AnswerDraft) => void
  onBack: () => void
  onRetry: () => void
  onCreate: () => void
}

export function IntakeQuestionStep({
  generating,
  failed,
  questions,
  answers,
  error,
  createDisabled,
  onAnswerChange,
  onBack,
  onRetry,
  onCreate,
}: IntakeQuestionStepProps) {
  return (
    <div
      data-testid="idea-intake-wizard"
      className="min-h-full bg-background px-4 py-6 text-text-primary sm:px-8 lg:px-14"
    >
      <section className="mx-auto w-full max-w-[760px]">
        <div className="rounded-lg border border-border-subtle bg-card p-5 sm:p-8 lg:p-10">
          <div className="mb-6">
            <WizardStepKicker step={2} />
            <h2 className="mt-2 font-[family:var(--font-display)] text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.04em] text-text-primary sm:text-5xl">
              Tell us a bit more
            </h2>
            <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-text-secondary">
              {generating
                ? "Reading your idea and writing questions worth answering..."
                : "These questions will help build a better plan for your business"}
            </p>
          </div>

          <div className="space-y-4">
            {generating
              ? SKELETON_TITLE_WIDTHS.map((width, index) => (
                  <SkeletonQuestionCard key={`skeleton-${index}`} titleWidth={width} />
                ))
              : questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * QUESTION_REVEAL_STAGGER_MS}ms` }}
                  >
                    <QuestionCard
                      question={question}
                      answer={answers[question.id] ?? emptyAnswer()}
                      onAnswerChange={(updater) => onAnswerChange(question.id, updater)}
                    />
                  </div>
                ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className={WIZARD_OUTLINE_BUTTON_CLASS}
              data-testid="intake-back"
            >
              Back
            </Button>
            {failed ? (
              <Button
                type="button"
                onClick={onRetry}
                className={WIZARD_PRIMARY_BUTTON_CLASS}
                data-testid="intake-retry-questions"
              >
                Retry
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onCreate}
                disabled={createDisabled}
                className={WIZARD_PRIMARY_BUTTON_CLASS}
                data-testid="intake-create-project"
              >
                Create project
              </Button>
            )}
          </div>
        </div>

        <WizardError error={error} />
      </section>
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
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-[family:var(--font-display)] text-xl font-bold leading-snug tracking-[-0.015em] text-[#0D1320]">
            {question.question}
          </h3>
          {question.selectionMode !== "text" && (
            <span className="shrink-0 font-mono text-[10px] font-medium uppercase tracking-[0.18em] whitespace-nowrap text-text-muted">
              {question.selectionMode === "multiple" ? "Pick a few" : "Pick one"}
            </span>
          )}
        </div>
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
                const isMulti = question.selectionMode === "multiple"
                return (
                  <button
                    key={option.id}
                    type="button"
                    role={isMulti ? "checkbox" : undefined}
                    aria-checked={isMulti ? selected : undefined}
                    aria-pressed={isMulti ? undefined : selected}
                    onClick={() =>
                      onAnswerChange((draft) => toggleOption(question, draft, option.id))
                    }
                    className={cn(
                      CHIP_BASE_CLASS,
                      // Multi-select keeps a white chip with a leading checkbox; only
                      // single-select inverts to a solid fill when chosen.
                      isMulti
                        ? cn(
                            "bg-white text-text-primary",
                            selected ? "border-text-primary" : "border-border-subtle hover:border-text-primary"
                          )
                        : selected
                          ? CHIP_SELECTED_CLASS
                          : CHIP_UNSELECTED_CLASS
                    )}
                  >
                    {isMulti && <ChipCheckbox selected={selected} />}
                    <span>{option.label}</span>
                  </button>
                )
              })}
              {supportsAnswerEscapeHatches(question) && (
                <>
                  <button
                    type="button"
                    aria-pressed={answer.decideForMe}
                    onClick={() => onAnswerChange((draft) => toggleDecideForMe(draft))}
                    className={cn(
                      CHIP_BASE_CLASS,
                      answer.decideForMe ? CHIP_SELECTED_CLASS : CHIP_UNSELECTED_CLASS
                    )}
                  >
                    Decide for me
                  </button>
                  <button
                    type="button"
                    role={question.selectionMode === "multiple" ? "checkbox" : undefined}
                    aria-checked={
                      question.selectionMode === "multiple" ? answer.otherSelected : undefined
                    }
                    aria-pressed={
                      question.selectionMode === "multiple" ? undefined : answer.otherSelected
                    }
                    onClick={() => onAnswerChange((draft) => toggleOther(question, draft))}
                    className={cn(
                      CHIP_BASE_CLASS,
                      question.selectionMode === "multiple"
                        ? cn(
                            "bg-white text-text-primary",
                            answer.otherSelected
                              ? "border-text-primary"
                              : "border-border-subtle hover:border-text-primary"
                          )
                        : answer.otherSelected
                          ? CHIP_SELECTED_CLASS
                          : CHIP_UNSELECTED_CLASS
                    )}
                  >
                    {question.selectionMode === "multiple" && (
                      <ChipCheckbox selected={answer.otherSelected} />
                    )}
                    <span>Other</span>
                  </button>
                  {shouldShowOtherInput(question, answer) && (
                    <Input
                      value={answer.otherText}
                      onChange={(event) =>
                        onAnswerChange((draft) => ({ ...draft, otherText: event.target.value }))
                      }
                      placeholder="Your answer..."
                      aria-label={`Custom answer for: ${question.question}`}
                      maxLength={INTAKE_OTHER_TEXT_MAX_LENGTH}
                      autoFocus
                      // Chip-sized so it reads as one more option in the row,
                      // not a separate form control below the group.
                      className="h-11 w-[240px] max-w-full rounded-md border-border-strong bg-white px-3 py-2 text-xs sm:h-auto sm:py-1.5"
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  )
}

function ChipCheckbox({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mr-[7px] inline-flex size-[13px] shrink-0 items-center justify-center rounded-[3px] border-[1.5px] transition-colors",
        selected ? "border-text-primary bg-text-primary" : "border-[#CCC2B8] bg-white"
      )}
    >
      {selected && <Check className="size-[9px] text-white" strokeWidth={4} />}
    </span>
  )
}

function SkeletonQuestionCard({ titleWidth }: { titleWidth: string }) {
  return (
    <article className="rounded-lg border border-border-subtle bg-white p-[18px]" aria-hidden="true">
      <div className="intake-skeleton h-4 rounded" style={{ width: titleWidth }} />
      <div className="intake-skeleton mt-2.5 h-2.5 w-[34%] rounded" />
      <div className="mt-4 flex flex-wrap gap-2">
        {["112px", "88px", "136px", "96px"].map((width, index) => (
          <div key={index} className="intake-skeleton h-[30px] rounded-md" style={{ width }} />
        ))}
      </div>
    </article>
  )
}
