"use client"

import { useEffect, useRef, useState } from "react"

interface BuildMapNode {
  key: string
  label: string
  description: string
}

const NODES: BuildMapNode[] = [
  {
    key: "market",
    label: "1. Market Research",
    description:
      "Map the competitive landscape, pricing, and open lanes so you stop guessing where the idea can actually win.",
  },
  {
    key: "wedge",
    label: "2. MVP Wedge",
    description:
      "Narrow the concept to the first user, first pain, and first version worth building instead of scoping everything at once.",
  },
  {
    key: "handoff",
    label: "3. Build Handoff",
    description:
      "Turn the direction into a PRD, MVP plan, mockups, and technical detail your coding agent can work from immediately.",
  },
  {
    key: "launch",
    label: "4. Next Build Move",
    description:
      "Leave with a clear next step: what to build now, what to defer, and what to validate once users touch the product.",
  },
]

// --- Main component ---------------------------------------------------------

export function BuildMap() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`build-map-split ${active ? "build-map-split--active" : ""}`}
    >
      <p className="build-map-split__eyebrow">Before and after split</p>
      <h3 className="build-map-split__title">From rough idea to build-ready direction.</h3>
      <div className="build-map-split__layout">
        <div className="build-map-split__idea">
          <p className="build-map-split__chip">Input</p>
          <div className="build-map-split__note">
            <p className="text-[1.35rem] font-semibold leading-tight tracking-[-0.04em]">
              &ldquo;I have an idea, but I do not know what to build first.&rdquo;
            </p>
            <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">
              Unsorted market assumptions, fuzzy scope, too many options, and no clean handoff to start building.
            </p>
          </div>
          <div className="build-map-split__arrow" />
        </div>
        <div className="build-map-split__outputs">
          <p className="build-map-split__chip">Outputs</p>
          <div className="build-map-split__stack mt-5">
            {NODES.map((node, index) => (
              <article className="build-map-split__artifact" key={`split-${node.key}`} style={{ ["--step" as string]: index }}>
                <h4 className="text-[1rem] font-semibold tracking-[-0.03em]">
                  {node.label.replace(/^\d+\.\s*/, "")}
                </h4>
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                  {node.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
