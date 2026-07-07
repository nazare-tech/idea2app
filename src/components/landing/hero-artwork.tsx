"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/** Max pointer-follow shift in px (scaled per layer by depth). */
const PARALLAX_STRENGTH = 20
/** How far layers fly outward from the hero center as you scroll away. */
const SCATTER_DISTANCE = 480
/** Center of the 1920x838 artwork box; layers scatter away from this point. */
const CENTER_X = 960
const CENTER_Y = 419

const heroLayers = [
  {
    src: "/landing/hero/215-098_image-27.png",
    width: 297,
    height: 315,
    left: -8,
    top: 202,
    className: "left-[-8px] top-[202px] h-[315px] w-[297px]",
  },
  {
    src: "/landing/hero/215-099_image-28.png",
    width: 426,
    height: 318,
    left: 60,
    top: 33,
    className: "left-[60px] top-[33px] h-[318px] w-[426px]",
  },
  {
    src: "/landing/hero/215-100_image-23.png",
    width: 329,
    height: 390,
    left: 211,
    top: 355,
    className: "left-[211px] top-[355px] h-[390px] w-[329px]",
  },
  {
    src: "/landing/hero/215-101_image-26.png",
    width: 227,
    height: 239,
    left: 234,
    top: 242,
    className: "left-[234px] top-[242px] h-[239px] w-[227px]",
  },
  {
    src: "/landing/hero/215-102_image-25.png",
    width: 116,
    height: 323,
    left: -45,
    top: 316,
    className: "left-[-45px] top-[316px] h-[323px] w-[116px]",
  },
  {
    src: "/landing/hero/215-103_image-24.png",
    width: 175,
    height: 272,
    left: 88,
    top: 377,
    className: "left-[88px] top-[377px] h-[272px] w-[175px]",
  },
  {
    src: "/landing/hero/215-104_image-21.png",
    width: 310,
    height: 276,
    left: 7,
    top: 562,
    className: "left-[7px] top-[562px] h-[276px] w-[310px]",
  },
  {
    src: "/landing/hero/215-105_image-20.png",
    width: 204,
    height: 237,
    left: 234,
    top: 587,
    className: "left-[234px] top-[587px] h-[237px] w-[204px]",
  },
  {
    src: "/landing/hero/215-106_image-22.png",
    width: 177,
    height: 167,
    left: 388,
    top: 483,
    className: "left-[388px] top-[483px] h-[167px] w-[177px]",
  },
  {
    src: "/landing/hero/215-107_image-21.png",
    width: 345,
    height: 287,
    left: 1579,
    top: 523,
    className: "left-[1579px] top-[523px] h-[287px] w-[345px]",
  },
  {
    src: "/landing/hero/215-108_image-22.png",
    width: 223,
    height: 248,
    left: 1419,
    top: 513,
    className: "left-[1419px] top-[513px] h-[248px] w-[223px]",
  },
  {
    src: "/landing/hero/215-109_image-27.png",
    width: 411,
    height: 330,
    left: 1466,
    top: 79,
    className: "left-[1466px] top-[79px] h-[330px] w-[411px]",
  },
  {
    src: "/landing/hero/215-110_image-26.png",
    width: 216,
    height: 215,
    left: 1708,
    top: 21,
    className: "left-[1708px] top-[21px] h-[215px] w-[216px]",
  },
  {
    src: "/landing/hero/215-111_image-24.png",
    width: 199,
    height: 311,
    left: 1725,
    top: 217,
    className: "left-[1725px] top-[217px] h-[311px] w-[199px]",
  },
  {
    src: "/landing/hero/215-112_image-23.png",
    width: 267,
    height: 311,
    left: 1374,
    top: 247,
    className: "left-[1374px] top-[247px] h-[311px] w-[267px]",
  },
  {
    src: "/landing/hero/215-113_image-25.png",
    width: 267,
    height: 257,
    left: 1589,
    top: 383,
    className: "left-[1589px] top-[383px] h-[257px] w-[267px]",
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
    // The artwork is display:none below lg, and the motion is invisible once
    // the hero scrolls out of view; only run the frame loop while both hold.
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
      const heroHeight = section?.offsetHeight || 838
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
      className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[838px] w-[1920px] -translate-x-1/2 -translate-y-1/2 lg:block"
    >
      {heroLayers.map((layer) => (
        <Image
          key={layer.src}
          src={layer.src}
          width={layer.width}
          height={layer.height}
          alt=""
          className={`absolute object-contain ${layer.className}`}
          loading="eager"
          decoding="async"
        />
      ))}
    </div>
  )
}
