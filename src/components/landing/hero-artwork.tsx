"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/** Max pointer-follow shift in px (scaled per layer by depth). */
const PARALLAX_STRENGTH = 20
/** How far layers fly outward from the hero center as you scroll away. */
const SCATTER_DISTANCE = 480
/** Center of the 1920x720 artwork box; layers scatter away from this point. */
const CENTER_X = 960
const CENTER_Y = 360

/** Figma frame 362:12585 (1497.7px wide) mapped into the centered 1920px box. */
const heroLayers: {
  src: string
  width: number
  height: number
  left: number
  top: number
  side: "left" | "right"
  className: string
}[] = [
  {
    src: "/landing/hero/362-12586_note.png",
    width: 259,
    height: 274,
    left: 27,
    top: 161,
    side: "left",
    className: "left-[27px] top-[161px] h-[274px] w-[259px]",
  },
  {
    src: "/landing/hero/362-12587_note.png",
    width: 371,
    height: 277,
    left: 86,
    top: 7,
    side: "left",
    className: "left-[86px] top-[7px] h-[277px] w-[371px]",
  },
  {
    src: "/landing/hero/362-12588_note.png",
    width: 286,
    height: 340,
    left: 217,
    top: 291,
    side: "left",
    className: "left-[217px] top-[291px] h-[340px] w-[286px]",
  },
  {
    src: "/landing/hero/362-12589_note.png",
    width: 198,
    height: 208,
    left: 237,
    top: 195,
    side: "left",
    className: "left-[237px] top-[195px] h-[208px] w-[198px]",
  },
  {
    src: "/landing/hero/362-12590_note.png",
    width: 101,
    height: 281,
    left: -5,
    top: 252,
    side: "left",
    className: "left-[-5px] top-[252px] h-[281px] w-[101px]",
  },
  {
    src: "/landing/hero/362-12591_note.png",
    width: 152,
    height: 237,
    left: 110,
    top: 309,
    side: "left",
    className: "left-[110px] top-[309px] h-[237px] w-[152px]",
  },
  {
    src: "/landing/hero/362-12592_note.png",
    width: 270,
    height: 240,
    left: 40,
    top: 473,
    side: "left",
    className: "left-[40px] top-[473px] h-[240px] w-[270px]",
  },
  {
    src: "/landing/hero/362-12593_note.png",
    width: 178,
    height: 206,
    left: 238,
    top: 487,
    side: "left",
    className: "left-[238px] top-[487px] h-[206px] w-[178px]",
  },
  {
    src: "/landing/hero/362-12594_note.png",
    width: 154,
    height: 145,
    left: 372,
    top: 400,
    side: "left",
    className: "left-[372px] top-[400px] h-[145px] w-[154px]",
  },
  {
    src: "/landing/hero/362-12595_note.png",
    width: 308,
    height: 256,
    left: 1596,
    top: 442,
    side: "right",
    className: "left-[1596px] top-[442px] h-[256px] w-[308px]",
  },
  {
    src: "/landing/hero/362-12596_note.png",
    width: 199,
    height: 222,
    left: 1453,
    top: 437,
    side: "right",
    className: "left-[1453px] top-[437px] h-[222px] w-[199px]",
  },
  {
    src: "/landing/hero/362-12597_note.png",
    width: 367,
    height: 295,
    left: 1495,
    top: 42,
    side: "right",
    className: "left-[1495px] top-[42px] h-[295px] w-[367px]",
  },
  {
    src: "/landing/hero/362-12598_note.png",
    width: 193,
    height: 192,
    left: 1711,
    top: -7,
    side: "right",
    className: "left-[1711px] top-[-7px] h-[192px] w-[193px]",
  },
  {
    src: "/landing/hero/362-12599_note.png",
    width: 178,
    height: 278,
    left: 1726,
    top: 171,
    side: "right",
    className: "left-[1726px] top-[171px] h-[278px] w-[178px]",
  },
  {
    src: "/landing/hero/362-12600_note.png",
    width: 239,
    height: 278,
    left: 1412,
    top: 191,
    side: "right",
    className: "left-[1412px] top-[191px] h-[278px] w-[239px]",
  },
  {
    src: "/landing/hero/362-12601_note.png",
    width: 239,
    height: 230,
    left: 1604,
    top: 315,
    side: "right",
    className: "left-[1604px] top-[315px] h-[230px] w-[239px]",
  },
]

export function HeroArtwork() {
  const boxRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)")
    const syncDesktopState = () => setIsDesktop(desktopQuery.matches)

    syncDesktopState()
    desktopQuery.addEventListener("change", syncDesktopState)
    return () => desktopQuery.removeEventListener("change", syncDesktopState)
  }, [])

  // Decorative motion: layers follow the pointer slightly (parallax) and
  // scatter outward + fade as the user scrolls past the hero.
  useEffect(() => {
    if (!isDesktop) return

    const box = boxRef.current
    if (!box) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const section = box.parentElement
    const layers = Array.from(box.querySelectorAll("img")).map((el, i) => {
      // Unit vector from the artwork center through the layer's center, from
      // the static layout data (DOM offsets are 0 while the box is hidden).
      const data = heroLayers[i]
      let vx = data.left + data.width / 2 - CENTER_X
      let vy = data.top + data.height / 2 - CENTER_Y
      const len = Math.hypot(vx, vy) || 1
      vx /= len
      vy /= len
      // Deterministic per-layer variation: depth 0.5..1.4, rotation -4.4..4.4deg.
      const depth = 0.5 + (((i * 37) % 10) / 10) * 0.9
      const rot = (((i * 13) % 9) - 4) * 1.1
      el.style.willChange = "transform, opacity"
      return { el, vx, vy, depth, rot }
    })
    if (!layers.length) return

    let mx = 0
    let my = 0
    let cmx = 0
    let cmy = 0
    let frame = 0
    let running = false
    // The component returns null below lg (this effect never runs there), and
    // the motion is invisible once the hero scrolls out of view; only run the
    // frame loop while the hero is visible.
    let heroVisible = true

    const onMove = (event: PointerEvent) => {
      mx = (event.clientX / window.innerWidth) * 2 - 1
      my = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener("pointermove", onMove)

    const tick = () => {
      // Lerp toward the pointer so the parallax trails smoothly.
      cmx += (mx - cmx) * 0.06
      cmy += (my - cmy) * 0.06
      const heroHeight = section?.offsetHeight || 720
      const progress = Math.min(Math.max(window.scrollY / (heroHeight * 0.85), 0), 1)
      const eased = progress * progress // ease-in: starts gently, accelerates while scrolling away

      for (const layer of layers) {
        const px = cmx * PARALLAX_STRENGTH * layer.depth
        const py = cmy * PARALLAX_STRENGTH * 0.7 * layer.depth
        const sx = layer.vx * SCATTER_DISTANCE * eased * layer.depth
        const sy = layer.vy * SCATTER_DISTANCE * 0.8 * eased * layer.depth
        layer.el.style.transform = `translate3d(${px + sx}px, ${py + sy}px, 0) rotate(${layer.rot * eased}deg)`
        layer.el.style.opacity = String(1 - eased * 0.9)
      }
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      if (running || !heroVisible) return
      running = true
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (!running) return
      running = false
      cancelAnimationFrame(frame)
    }

    let observer: IntersectionObserver | null = null
    if (section && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting
        if (heroVisible) start()
        else stop()
      })
      observer.observe(section)
    }

    start()

    return () => {
      window.removeEventListener("pointermove", onMove)
      observer?.disconnect()
      stop()
    }
  }, [isDesktop])

  if (!isDesktop) return null

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[720px] w-[1920px] -translate-x-1/2 -translate-y-1/2 lg:block"
    >
      {/* Entrance animation lives on the wrapper; the parallax loop writes
          transforms to the inner img, so the two never fight. */}
      {heroLayers.map((layer, index) => (
        <div
          key={layer.src}
          className={`absolute ${layer.className} ${layer.side === "left" ? "hero-enter-left" : "hero-enter-right"}`}
          style={{ animationDelay: `${120 + (index % 5) * 70}ms` }}
        >
          <Image
            src={layer.src}
            width={layer.width}
            height={layer.height}
            alt=""
            className="h-full w-full object-contain"
            loading="eager"
            decoding="async"
          />
        </div>
      ))}
    </div>
  )
}
