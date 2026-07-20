"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Marquee } from "@/components/ui/marquee"
import {
  WIZARD_PRIMARY_BUTTON_CLASS,
  WizardError,
  WizardStepKicker,
} from "@/components/projects/intake-wizard-chrome"
import { INTAKE_EXAMPLE_IDEAS, type IntakeExampleIdea } from "@/lib/intake/examples"
import { shouldSubmitOnEnter } from "@/lib/intake/keyboard-submit"
import { cn } from "@/lib/utils"

// One drifting marquee row per duration; the example pool is chunked evenly
// across them, so adding ideas never requires touching slice indexes.
const EXAMPLE_ROW_DURATIONS_SECONDS = [50, 60, 43]

function chunkEvenly<T>(items: T[], chunkCount: number): T[][] {
  const size = Math.ceil(items.length / chunkCount)
  return Array.from({ length: chunkCount }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  ).filter((chunk) => chunk.length > 0)
}

const EXAMPLE_ROWS = chunkEvenly(INTAKE_EXAMPLE_IDEAS, EXAMPLE_ROW_DURATIONS_SECONDS.length)

interface IntakeIdeaStepProps {
  idea: string
  onIdeaChange: (value: string) => void
  onSubmit: () => void
  /** Guidance shown while a non-empty idea is below the floor. Not an error. */
  hint: string | null
  error: string | null
  /** Restoring a saved idea or generating questions: inputs disabled, examples hidden. */
  locked: boolean
  submitDisabled: boolean
  isLoadingPending: boolean
}

export function IntakeIdeaStep({
  idea,
  onIdeaChange,
  onSubmit,
  hint,
  error,
  locked,
  submitDisabled,
  isLoadingPending,
}: IntakeIdeaStepProps) {
  return (
    <div
      data-testid="idea-intake-wizard"
      className="flex min-h-[calc(100vh-112px)] flex-col bg-background pt-6 pb-24 text-text-primary"
    >
      <div className="px-4 sm:px-8 lg:px-14">
        <section className="mx-auto w-full max-w-[760px]">
          <div className="rounded-lg border border-border-subtle bg-card p-5 sm:p-8 lg:p-10">
            <WizardStepKicker step={1} />
            <h2 className="mt-2 font-[family:var(--font-display)] text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.04em] text-text-primary sm:text-5xl">
              Idea Brief
            </h2>
            <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-text-secondary">
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
                onChange={(event) => onIdeaChange(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    !shouldSubmitOnEnter(
                      {
                        key: event.key,
                        shiftKey: event.shiftKey,
                        repeat: event.repeat,
                        isComposing: event.nativeEvent.isComposing,
                      },
                      submitDisabled
                    )
                  ) {
                    return
                  }

                  event.preventDefault()
                  onSubmit()
                }}
                enterKeyHint="go"
                placeholder="Example: A product intelligence tool that turns support tickets, sales calls, and customer chats into roadmap priorities..."
                className="min-h-[190px] border-border-strong bg-white text-[15px] leading-relaxed"
                disabled={locked}
              />
              {hint && !locked && (
                <p className="mt-2 text-[13px] leading-snug text-text-secondary" data-testid="intake-idea-hint">
                  {hint}
                </p>
              )}
            </div>

            {isLoadingPending && (
              <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="sm" />
                Loading your saved idea...
              </div>
            )}
          </div>

          <WizardError error={error} />

          <div className="mt-5 flex justify-stretch sm:justify-end">
            <Button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              className={cn(WIZARD_PRIMARY_BUTTON_CLASS, "w-full sm:w-auto")}
              data-testid="intake-continue"
            >
              Next
            </Button>
          </div>
        </section>
      </div>

      {/* Scrolling example ideas: drifting rows, hidden while the idea step
          is locked (e.g. restoring a saved idea). */}
      <div
        className={cn(
          "mt-14 w-full transition-opacity duration-200",
          locked && "pointer-events-none opacity-0"
        )}
        aria-hidden={locked}
      >
        <p className="mb-5 text-center font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
          Start from any idea
        </p>
        <div className="flex flex-col gap-3">
          {EXAMPLE_ROWS.map((ideas, index) => (
            <ExampleIdeaRow
              key={index}
              ideas={ideas}
              durationSeconds={EXAMPLE_ROW_DURATIONS_SECONDS[index]}
              disabled={locked}
              onPick={onIdeaChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ExampleIdeaRow({
  ideas,
  durationSeconds,
  disabled,
  onPick,
}: {
  ideas: IntakeExampleIdea[]
  durationSeconds: number
  disabled: boolean
  onPick: (description: string) => void
}) {
  return (
    <Marquee durationSeconds={durationSeconds}>
      {ideas.map((idea) => (
        <button
          key={idea.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(idea.description)}
          className="mr-3 inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border-subtle bg-white px-[18px] py-[9px] text-[13px] font-medium text-text-primary transition-colors hover:border-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
        >
          {idea.title}
        </button>
      ))}
    </Marquee>
  )
}
