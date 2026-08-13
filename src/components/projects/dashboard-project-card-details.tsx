interface ProjectCardDetailsProps {
  name: string
  description: string | null
  createdLabel: string
}

function getProjectCardDescription(description: string | null) {
  const displayDescription = description?.replace(/^Business idea summary:\s*/i, "").trim()
  return displayDescription || "No project context captured yet."
}

export function ProjectCardDetails({
  name,
  description,
  createdLabel,
}: ProjectCardDetailsProps) {
  const displayDescription = getProjectCardDescription(description)

  return (
    <div
      data-testid="dashboard-project-card-details"
      className="h-[122px] shrink-0 overflow-hidden px-2 pt-5"
    >
      <div className="flex h-[22px] items-center gap-[60px] overflow-hidden whitespace-nowrap">
        <h2
          data-testid="dashboard-project-card-title"
          title={name}
          className="min-w-0 flex-1 truncate text-[18px] font-medium leading-[normal] text-text-primary"
        >
          {name}
        </h2>
        <p
          data-testid="dashboard-project-card-created"
          className="shrink-0 text-[14px] italic leading-[normal] text-text-secondary"
        >
          {createdLabel}
        </p>
      </div>
      <div className="pt-2">
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
    </div>
  )
}
