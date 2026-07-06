"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { Check } from "lucide-react"

/** Entrance easing from the design system (ease-out-expo, no bounce). */
const REVEAL_EASING = "cubic-bezier(0.16, 1, 0.3, 1)"
/** Delay between consecutive text lines in the stagger. */
const STAGGER_STEP_MS = 90

interface FeatureCardProps {
  eyebrow: string
  title: string
  description: string
  bullets: { label: string; body: string }[]
  /** Alternates per card so visuals zigzag down the page. */
  imageOnRight: boolean
  /** The product preview visual for the image half of the card. */
  children: ReactNode
}

/**
 * Feature card with a scroll-triggered reveal: text lines fade in bottom-to-top
 * staggered, and the visual fades in while scaling from 80% to full size.
 * The card renders fully visible; hiding happens imperatively after mount so
 * content stays readable without JS, and reduced-motion users see no animation.
 */
export function FeatureCard({ eyebrow, title, description, bullets, imageOnRight, children }: FeatureCardProps) {
  const cardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return
    }

    const lines = Array.from(card.querySelectorAll<HTMLElement>("[data-reveal-line]"))
    const visual = card.querySelector<HTMLElement>("[data-reveal-visual]")

    for (const line of lines) {
      line.style.opacity = "0"
      line.style.transform = "translate3d(0, 18px, 0)"
    }
    if (visual) {
      visual.style.opacity = "0"
      visual.style.transform = "scale(0.8)"
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        lines.forEach((line, index) => {
          const delay = index * STAGGER_STEP_MS
          line.style.transition = `opacity 600ms ${REVEAL_EASING} ${delay}ms, transform 600ms ${REVEAL_EASING} ${delay}ms`
          line.style.opacity = "1"
          line.style.transform = "translate3d(0, 0, 0)"
        })
        if (visual) {
          visual.style.transition = `opacity 700ms ${REVEAL_EASING} 120ms, transform 700ms ${REVEAL_EASING} 120ms`
          visual.style.opacity = "1"
          visual.style.transform = "scale(1)"
        }
        observer.disconnect()
      },
      { threshold: 0.25 }
    )
    observer.observe(card)

    return () => observer.disconnect()
  }, [])

  return (
    <article
      ref={cardRef}
      className="grid items-stretch gap-6 border border-border-subtle bg-white md:grid-cols-2 md:gap-0"
    >
      <div className={`p-6 md:p-10 ${imageOnRight ? "md:order-1" : "md:order-2"}`}>
        <p data-reveal-line className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
          {eyebrow}
        </p>
        <h3 data-reveal-line className="mt-4 text-[1.45rem] font-semibold leading-tight tracking-[-0.04em] sm:text-[1.85rem]">
          {title}
        </h3>
        <p data-reveal-line className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-text-secondary">
          {description}
        </p>
        <ul className="mt-7 space-y-3">
          {bullets.map((bullet) => (
            <li key={bullet.label} data-reveal-line className="flex items-start gap-3">
              <Check className="mt-1 h-4 w-4 shrink-0 text-text-primary" aria-hidden="true" />
              <p className="text-[15px] leading-relaxed text-text-secondary">
                <span className="font-semibold text-text-primary">{bullet.label}.</span> {bullet.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div data-reveal-visual className={imageOnRight ? "md:order-2" : "md:order-1"}>
        {children}
      </div>
    </article>
  )
}
