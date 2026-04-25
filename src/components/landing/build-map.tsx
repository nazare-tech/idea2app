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
      "Map the competitive landscape: who's already solving this, what they charge, and where the open lanes are for your idea.",
  },
  {
    key: "prd",
    label: "2. PRD",
    description:
      "Translate your idea into a real product spec. User personas, requirements, and acceptance criteria so engineering knows exactly what to build.",
  },
  {
    key: "mockups",
    label: "3. Mockups",
    description:
      "Get multiple design directions for the same core screens. Compare them side-by-side and pick the one to ship before writing UI code.",
  },
  {
    key: "marketing",
    label: "4. Marketing",
    description:
      "Plan your go-to-market in one place: audience segments, channel signals, and a budget to land your first customers.",
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
      <h3 className="build-map-split__title">From loose idea to usable stack.</h3>
      <div className="build-map-split__layout">
        <div className="build-map-split__idea">
          <p className="build-map-split__chip">Input</p>
          <div className="build-map-split__note">
            <p className="text-[1.35rem] font-semibold leading-tight tracking-[-0.04em]">
              &ldquo;I have an idea, but I do not know the first build move.&rdquo;
            </p>
            <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">
              Unsorted market assumptions, product scope, screens, and launch questions.
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
