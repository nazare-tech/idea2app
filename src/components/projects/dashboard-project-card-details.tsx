interface ProjectCardDetailsProps {
  name: string
  description: string | null
  createdLabel: string
  reserveTitleActionSpace?: boolean
}

function getProjectCardDescription(description: string | null) {
  const displayDescription = description?.replace(/^Business idea summary:\s*/i, "").trim()
  return displayDescription || "No project context captured yet."
}

export function ProjectCardDetails({
  name,
  description,
  createdLabel,
  reserveTitleActionSpace = false,
}: ProjectCardDetailsProps) {
  const displayDescription = getProjectCardDescription(description)

  return (
    <div
      data-testid="dashboard-project-card-details"
      className="flex h-[160.6px] shrink-0 flex-col px-2 py-5"
    >
      <div className="flex flex-col gap-2">
        <div className="flex h-[21.6px] items-center gap-2 overflow-hidden">
          <h2
            data-testid="dashboard-project-card-title"
            title={name}
            className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[18px] font-medium leading-[normal] text-text-primary"
          >
            {name}
          </h2>
          {reserveTitleActionSpace && (
            <span
              data-testid="dashboard-project-card-title-action-space"
              aria-hidden="true"
              className="w-8 shrink-0 self-stretch"
            />
          )}
        </div>
        <div
          data-testid="dashboard-project-card-description-slot"
          className="h-[72px] overflow-hidden"
        >
          <p
            data-testid="dashboard-project-card-description"
            className="whitespace-pre-wrap text-[14px] font-normal leading-[normal] text-text-secondary [word-break:break-word]"
          >
            {displayDescription}
          </p>
        </div>
      </div>
      <p
        data-testid="dashboard-project-card-created"
        className="mt-auto whitespace-nowrap text-[14px] italic leading-[1.3] text-text-secondary"
      >
        {createdLabel}
      </p>
    </div>
  )
}
