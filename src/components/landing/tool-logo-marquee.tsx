import Image from "next/image"

/** Purely informational, not interactive: the visible text is the accessible name, so the logo image is decorative. */
function ToolLogo({ name, src, ariaHidden = false }: { name: string; src: string; ariaHidden?: boolean }) {
  return (
    <div
      className="flex h-[92px] w-[152px] shrink-0 flex-col items-center justify-center gap-3 border border-border-subtle bg-white px-4"
      aria-hidden={ariaHidden ? "true" : undefined}
    >
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        width={96}
        height={32}
        className="h-8 w-auto max-w-[96px] object-contain grayscale opacity-60"
      />
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-text-muted">{name}</span>
    </div>
  )
}

/** Duplicates the row once so a -50% translate loops seamlessly. The duplicate pass is hidden from assistive tech. */
export function ToolLogoMarquee({ tools }: { tools: { name: string; src: string }[] }) {
  return (
    <div className="landing-logo-marquee mt-4">
      <div className="landing-logo-marquee__track">
        {[...tools, ...tools].map((tool, index) => (
          <ToolLogo
            key={`${tool.name}-${index}`}
            name={tool.name}
            src={tool.src}
            ariaHidden={index >= tools.length}
          />
        ))}
      </div>
    </div>
  )
}
