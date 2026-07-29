import Image from "next/image"

import type { StageCard } from "@/lib/landing-feature-stage"

/**
 * One card on the feature scrollytelling stage.
 *
 * Purely presentational: position, reveal, and rotation are written to the DOM
 * per frame by `feature-scrollytelling.tsx`. The inline styles here are only the
 * server-rendered resting state (landscape position, hidden, pre-rotated), so
 * the first paint matches what the loop takes over on mount.
 *
 * Type sizes are absolute pixels on purpose: the stage is a fixed-size canvas
 * scaled by a transform, so the whole card scales as one unit instead of
 * reflowing.
 */

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"

function CompetitorBody({ domain, name, summary }: { domain: string; name: string; summary: string }) {
  return (
    <>
      <div className="flex items-center gap-4">
        {/* Favicon service, not a local asset: keeps the card honest to the real
            competitor without shipping 4 logos we have no licence for. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          aria-hidden="true"
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-12 w-12 shrink-0 object-contain"
        />
        <h4 className="font-display m-0 text-[32px] font-bold tracking-[-0.03em] text-text-primary">{name}</h4>
      </div>
      <p className="mt-[11px] text-[23px] leading-[1.5] text-text-secondary">{summary}</p>
    </>
  )
}

function PersonaBody({
  initials,
  name,
  role,
  summary,
}: {
  initials: string
  name: string
  role: string
  summary: string
}) {
  return (
    <>
      <div className="flex items-center gap-[18px]">
        <span
          aria-hidden="true"
          className="font-display flex h-16 w-16 shrink-0 items-center justify-center bg-sidebar-bg text-[24px] font-bold text-background"
        >
          {initials}
        </span>
        <div>
          <p className="font-display m-0 text-[28px] font-bold tracking-[-0.02em] text-text-primary">{name}</p>
          <p className="mt-[3px] font-mono text-[17px] font-medium uppercase tracking-[0.14em] text-[#8A8480]">
            {role}
          </p>
        </div>
      </div>
      <p className="mt-[11px] text-[23px] leading-[1.5] text-text-secondary">{summary}</p>
    </>
  )
}

function StepBody({ label, title, summary }: { label: string; title: string; summary: string }) {
  return (
    <>
      <p className="m-0 font-mono text-[17px] font-medium uppercase tracking-[0.18em] text-[#8A8480]">{label}</p>
      <h4 className="font-display mt-3 text-[32px] font-bold tracking-[-0.03em] text-text-primary">{title}</h4>
      <p className="mt-[11px] text-[23px] leading-[1.5] text-text-secondary">{summary}</p>
    </>
  )
}

function PromptBody({
  label,
  badge,
  title,
  lines,
}: {
  label: string
  badge?: string
  title: string
  lines: string[]
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-[15px]">
        <p className="landing-stage-prompt-meta m-0 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-[#8A8480]">
          {label}
        </p>
        {badge ? (
          <p className="landing-stage-prompt-meta m-0 font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-primary">
            {badge}
          </p>
        ) : null}
      </div>
      <h4 className="landing-stage-prompt-title font-display mt-2 text-[24px] font-bold tracking-[-0.03em] text-text-primary">
        {title}
      </h4>
      {/* Clipped on purpose: the card is a preview of a longer file. */}
      <div className="landing-stage-prompt-clip mt-[14px] max-h-[560px] overflow-hidden border border-border-subtle bg-secondary px-5 py-[18px]">
        <p className="landing-stage-prompt-body m-0 whitespace-pre-wrap font-mono text-[15px] leading-[1.65] text-[#6B6259]">
          {lines.join("\n")}
        </p>
      </div>
    </>
  )
}

export function FeatureStageCard({
  card,
  index,
  initiallyVisible = false,
}: {
  card: StageCard
  index: number
  initiallyVisible?: boolean
}) {
  const isImage = card.body.kind === "image"

  return (
    <article
      data-stage-card
      data-rotation={card.rotation}
      style={{
        position: "absolute",
        zIndex: index + 1,
        top: card.landscape.top,
        left: card.landscape.left,
        width: card.landscape.width,
        boxSizing: "border-box",
        opacity: initiallyVisible ? 1 : 0,
        transform: initiallyVisible
          ? `rotate(${card.rotation}deg)`
          : `translateY(56px) scale(0.97) rotate(${card.rotation}deg)`,
        transition: `opacity 620ms ${EXPO}, transform 620ms ${EXPO}`,
        boxShadow: "0 18px 56px rgba(15, 23, 42, 0.12)",
        // Image cards are the artwork; everything else is a paper card.
        ...(isImage
          ? {}
          : { background: "#FFFFFF", border: "1.5px solid var(--border-subtle)", padding: "28px 32px" }),
      }}
    >
      {card.body.kind === "competitor" ? (
        <CompetitorBody domain={card.body.domain} name={card.body.name} summary={card.body.summary} />
      ) : null}
      {card.body.kind === "persona" ? (
        <PersonaBody
          initials={card.body.initials}
          name={card.body.name}
          role={card.body.role}
          summary={card.body.summary}
        />
      ) : null}
      {card.body.kind === "step" ? (
        <StepBody label={card.body.label} title={card.body.title} summary={card.body.summary} />
      ) : null}
      {card.body.kind === "image" ? (
        <Image
          src={card.body.src}
          alt={card.body.alt}
          width={card.body.width}
          height={card.body.height}
          className="block h-auto w-full border-[1.5px] border-[#E2DDD6]"
        />
      ) : null}
      {card.body.kind === "prompt" ? (
        <PromptBody
          label={card.body.label}
          badge={card.body.badge}
          title={card.body.title}
          lines={card.body.lines}
        />
      ) : null}
    </article>
  )
}
