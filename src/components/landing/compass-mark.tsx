"use client"

import { useEffect, useRef } from "react"

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"
const MARK_COLOR = "#FF4000"

/**
 * The compass glyph above the bottom CTA: the two arcs fade in, then the needle
 * point lands with a small overshoot. Renders in its final state without JS and
 * under `prefers-reduced-motion`, so it never depends on the animation running.
 */
export function CompassMark() {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const arcs = Array.from(wrap.querySelectorAll<SVGPathElement>("[data-compass-arc]"))
    const dot = wrap.querySelector<SVGCircleElement>("[data-compass-dot]")

    const showFinal = () => {
      for (const arc of arcs) arc.style.opacity = "1"
      if (dot) {
        dot.style.opacity = "1"
        dot.style.transform = "scale(1)"
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      showFinal()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        arcs.forEach((arc, i) => {
          arc.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 500,
            delay: i * 120,
            easing: EXPO,
            fill: "forwards",
          })
        })
        dot?.animate(
          [
            { opacity: 0, transform: "scale(0)" },
            { opacity: 1, transform: "scale(1.25)", offset: 0.7 },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 620, delay: 300, easing: EXPO, fill: "forwards" }
        )
      },
      { threshold: 0.6 }
    )
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapRef} aria-hidden="true" className="mb-7 flex justify-center">
      <svg width="62" height="44" viewBox="0 0 47.9971 33.5966" fill="none">
        <path
          data-compass-arc
          d="M40.6737 0.125786C40.8361 -0.0366426 41.0997 -0.0368826 41.2593 0.12833C45.4302 4.44601 47.997 10.3232 47.9971 16.8004L47.9893 17.4205C47.8313 23.6524 45.2967 29.2928 41.2594 33.4724C41.0998 33.6377 40.8361 33.6374 40.6737 33.4749L39.0976 31.8982C38.9353 31.7358 38.9356 31.4728 39.0947 31.3072C42.7115 27.5438 44.9356 22.4321 44.9356 16.8004C44.9355 11.1686 42.7117 6.05625 39.0948 2.29271C38.9357 2.12711 38.9354 1.8641 39.0978 1.70169L40.6737 0.125786Z"
          fill={MARK_COLOR}
          style={{ opacity: 0 }}
        />
        <path
          data-compass-arc
          d="M8.90025 1.69748C9.06267 1.8599 9.06235 2.12295 8.90316 2.28855C5.28511 6.05223 3.06069 11.1655 3.06055 16.7982C3.06055 22.4298 5.28373 27.5424 8.90033 31.3059C9.05947 31.4715 9.05977 31.7345 8.89737 31.8969L7.32246 33.4718C7.16002 33.6343 6.89637 33.6345 6.73678 33.4693C2.56668 29.1515 0 23.2749 0 16.7982C0.000147854 10.3202 2.56703 4.44194 6.73873 0.124115C6.89833 -0.0410749 7.16194 -0.0408243 7.32436 0.121594L8.90025 1.69748Z"
          fill={MARK_COLOR}
          style={{ opacity: 0 }}
        />
        <circle
          data-compass-dot
          cx="23.9986"
          cy="16.798"
          r="2.6"
          fill={MARK_COLOR}
          style={{ opacity: 0, transform: "scale(0)", transformBox: "fill-box", transformOrigin: "center" }}
        />
      </svg>
    </div>
  )
}
