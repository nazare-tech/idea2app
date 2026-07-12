import Image from "next/image"

import { Marquee } from "@/components/ui/marquee"

/** Purely informational, not interactive: the visible text is the accessible name, so the logo image is decorative. */
function ToolLogo({ name, src }: { name: string; src: string }) {
  return (
    <div className="mr-3 flex h-[92px] w-[152px] shrink-0 flex-col items-center justify-center gap-3 border border-border-subtle bg-white px-4">
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        width={96}
        height={32}
        className="h-8 w-24 object-contain grayscale opacity-60"
      />
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-text-muted">{name}</span>
    </div>
  )
}

export function ToolLogoMarquee({ tools }: { tools: { name: string; src: string }[] }) {
  return (
    <div className="mt-4">
      <Marquee durationSeconds={42} fadeWidthPx={48}>
        {tools.map((tool) => (
          <ToolLogo key={tool.name} name={tool.name} src={tool.src} />
        ))}
      </Marquee>
    </div>
  )
}
