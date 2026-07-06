"use client"

import { useEffect, useRef } from "react"

const SPARK_PATH =
  "M0 220C77 207 111 190 139 166C165 143 201 150 191 173C183 191 161 180 164 156C169 122 201 96 256 79C292 68 312 45 330 0"

const START_DOT_POSITION = { x: 0, y: 220 }
const FINAL_DOT_POSITION = { x: 255, y: 80 }
const MOTION_DURATION_MS = 2600
const ENTRANCE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)"
const DOT_RADIUS = 3.5
/** Caps so the fast early frames of the ease-out curve stay tasteful. */
const MAX_STRETCH = 1.2
const MAX_BLUR = 2.5

function easeOutQuart(progress: number) {
  return 1 - (1 - progress) ** 4
}

function getClosestPathLength(path: SVGPathElement, target: typeof FINAL_DOT_POSITION) {
  const pathLength = path.getTotalLength()
  let closestLength = 0
  let closestDistance = Number.POSITIVE_INFINITY

  for (let length = 0; length <= pathLength; length += pathLength / 120) {
    const point = path.getPointAtLength(length)
    const distance = Math.hypot(point.x - target.x, point.y - target.y)

    if (distance < closestDistance) {
      closestDistance = distance
      closestLength = length
    }
  }

  return closestLength
}

export function TestimonialBand() {
  const sectionRef = useRef<HTMLElement>(null)
  const quoteRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const sparkRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<SVGEllipseElement>(null)
  const blurRef = useRef<SVGFEGaussianBlurElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const quote = quoteRef.current
    const profile = profileRef.current
    const spark = sparkRef.current
    const path = pathRef.current
    const dot = dotRef.current
    if (!section || !quote || !profile || !spark || !path || !dot) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      section.style.opacity = "1"
      section.style.transform = "none"
      quote.style.opacity = "1"
      quote.style.transform = "none"
      profile.style.opacity = "1"
      profile.style.transform = "none"
      spark.style.opacity = "1"
      spark.style.transform = "none"
      return
    }

    let animationFrame = 0
    let dotDelayTimeout = 0
    let settleTimeout = 0
    let startTime = 0
    const targetLength = getClosestPathLength(path, FINAL_DOT_POSITION)

    const setDotPosition = (point: typeof FINAL_DOT_POSITION) => {
      dot.setAttribute("cx", String(point.x))
      dot.setAttribute("cy", String(point.y))
    }

    setDotPosition(START_DOT_POSITION)
    section.style.opacity = "0"
    section.style.transform = "translate3d(0, 22px, 0) scale(0.985)"
    quote.style.opacity = "0"
    quote.style.transform = "translate3d(-18px, 0, 0)"
    profile.style.opacity = "0"
    profile.style.transform = "translate3d(-10px, 10px, 0)"
    spark.style.opacity = "0"
    spark.style.transform = "translate3d(26px, -10px, 0)"

    const blur = blurRef.current
    let previousPoint: { x: number; y: number } = START_DOT_POSITION

    const setDotRadius = (rx: number, ry: number) => {
      dot.setAttribute("rx", String(rx))
      dot.setAttribute("ry", String(ry))
    }

    const animateDot = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / MOTION_DURATION_MS, 1)
      const point = path.getPointAtLength(targetLength * easeOutQuart(progress))

      // Elongate the dot along its direction of travel and blur it by speed,
      // so fast frames read as motion and the dot settles round at rest.
      const deltaX = point.x - previousPoint.x
      const deltaY = point.y - previousPoint.y
      const speed = Math.hypot(deltaX, deltaY)
      previousPoint = point

      setDotPosition(point)
      if (speed > 0.1) {
        const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI
        const stretch = 1 + Math.min(speed * 0.18, MAX_STRETCH)
        setDotRadius(DOT_RADIUS * stretch, DOT_RADIUS / Math.sqrt(stretch))
        dot.setAttribute("transform", `rotate(${angle} ${point.x} ${point.y})`)
        blur?.setAttribute("stdDeviation", `${Math.min(speed * 0.35, MAX_BLUR)} 0.15`)
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animateDot)
      } else {
        setDotPosition(FINAL_DOT_POSITION)
        dot.removeAttribute("transform")
        blur?.setAttribute("stdDeviation", "0 0")
        setDotRadius(4.75, 4.75)
        settleTimeout = window.setTimeout(() => setDotRadius(DOT_RADIUS, DOT_RADIUS), 180)
      }
    }

    const animateBand = () => {
      section.animate(
        [
          { opacity: 0, transform: "translate3d(0, 22px, 0) scale(0.985)" },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: 760,
          easing: ENTRANCE_EASING,
          fill: "forwards",
        }
      )

      quote.animate(
        [
          { opacity: 0, transform: "translate3d(-18px, 0, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: 720,
          delay: 120,
          easing: ENTRANCE_EASING,
          fill: "forwards",
        }
      )

      profile.animate(
        [
          { opacity: 0, transform: "translate3d(-10px, 10px, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: 620,
          delay: 260,
          easing: ENTRANCE_EASING,
          fill: "forwards",
        }
      )

      spark.animate(
        [
          { opacity: 0, transform: "translate3d(26px, -10px, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: 820,
          delay: 220,
          easing: ENTRANCE_EASING,
          fill: "forwards",
        }
      )
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        animateBand()
        dotDelayTimeout = window.setTimeout(() => {
          animationFrame = requestAnimationFrame(animateDot)
        }, 340)
        observer.disconnect()
      },
      { threshold: 0.45 }
    )

    observer.observe(section)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationFrame)
      window.clearTimeout(dotDelayTimeout)
      window.clearTimeout(settleTimeout)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-[158px] overflow-hidden bg-sidebar-bg px-6 py-8 text-white sm:px-10 lg:px-[120px]"
    >
      <div className="relative z-10 max-w-[710px]">
        <div
          ref={quoteRef}
          className="flex items-start gap-3 font-display font-bold leading-[1.18] tracking-normal sm:gap-4"
        >
          <span className="mt-[-0.3rem] w-6 shrink-0 text-[42px] leading-none text-primary sm:w-[26px] sm:text-[52px]">
            &ldquo;
          </span>
          <p className="max-w-[670px] text-[1.55rem] leading-[1.2] sm:text-[1.875rem]">
            Makercompass is like having a co-founder who&rsquo;s obsessed with execution.
          </p>
        </div>

        <div ref={profileRef} className="mt-4 flex items-center gap-3 pl-0 sm:pl-10">
          <div className="size-12 shrink-0 rounded-full bg-[#E5E7EB]" aria-hidden="true" />
          <div className="text-sm leading-[1.55]">
            <p className="font-bold">Dipesh Dave</p>
            <p>Indie founder</p>
          </div>
        </div>
      </div>

      <svg
        ref={sparkRef}
        className="pointer-events-none absolute -top-5 right-0 hidden h-[220px] w-[330px] text-white/80 md:block lg:right-[120px]"
        viewBox="0 0 330 220"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          {/* Directional blur driven per-frame from the dot's speed */}
          <filter id="testimonial-dot-blur" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur ref={blurRef} stdDeviation="0 0" />
          </filter>
        </defs>
        <path
          ref={pathRef}
          d={SPARK_PATH}
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="7 8"
          strokeLinecap="round"
        />
        <ellipse
          ref={dotRef}
          cx={FINAL_DOT_POSITION.x}
          cy={FINAL_DOT_POSITION.y}
          rx={DOT_RADIUS}
          ry={DOT_RADIUS}
          filter="url(#testimonial-dot-blur)"
          className="drop-shadow-[0_0_10px_rgba(220,38,38,0.55)]"
          fill="var(--primary)"
        />
      </svg>
    </section>
  )
}
