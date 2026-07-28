/**
 * Hero reel arc: a band of portrait cards riding the top of a very large
 * circle, spanning the viewport edge to edge and rotating slowly forever.
 *
 * Geometry, all in unscaled "wheel" pixels (the wheel is then scaled per
 * breakpoint by `--reel-scale`, so none of this math has to change):
 *
 *   - The wheel is a RADIUS*2 square. Its centre is the circle centre.
 *   - Card k sits at angle `k * STEP` measured from 12 o'clock, with its centre
 *     exactly on the circumference, and is rotated by that same angle so it
 *     stays tangent to the circle.
 *   - The band clips the wheel to a short strip, so only the top of the arc is
 *     visible and the cards to either side get cut flat by the bottom edge.
 *
 * The spin is one CSS keyframe on the inner layer (see `.hero-reel-spin` in
 * globals.css): a single compositor-only transform, no JS, and the global
 * prefers-reduced-motion block already parks it.
 */

import Image from "next/image"

/** Circle radius in wheel pixels. Large enough that the arc reads as a horizon. */
const RADIUS = 1500
const CARD_WIDTH = 168
const CARD_HEIGHT = 294
/** 50 cards puts 188px of arc under each one: 168px of card plus a 20px gap. */
const CARD_COUNT = 50
const STEP_DEGREES = 360 / CARD_COUNT

export const HERO_REEL_SCREENS = [
  { name: "CropScout, Option C, Screen 1", src: "/landing/hero-reel/cropscout-c1-cutout.png" },
  { name: "EvidenceDeck, Option B, Screen 1", src: "/landing/hero-reel/evidencedeck-b1-cutout.png" },
  { name: "FieldScribe, Option B, Screen 1", src: "/landing/hero-reel/fieldscribe-b1-cutout.png" },
  { name: "Kinship Cards, Option C, Screen 1", src: "/landing/hero-reel/kinship-cards-c1-cutout.png" },
  { name: "MentorLoop, Option C, Screen 1", src: "/landing/hero-reel/mentorloop-c1-cutout.png" },
  { name: "ReleaseRelay, Option B, Screen 2", src: "/landing/hero-reel/releaserelay-b2-cutout.png" },
  { name: "ReturnReason, Option C, Screen 1", src: "/landing/hero-reel/returnreason-c1-cutout.png" },
  { name: "ScopeSignal, Option A, Screen 1", src: "/landing/hero-reel/scopesignal-a1-cutout.png" },
  { name: "SignalLedger, Option A, Screen 2", src: "/landing/hero-reel/signalledger-a2-cutout.png" },
  { name: "VenueTurn, Option C, Screen 2", src: "/landing/hero-reel/venueturn-c2-cutout.png" },
] as const

type ReelCard = {
  /** Offset of the card's left edge inside the wheel box, in wheel pixels. */
  left: number
  /** Offset of the card's top edge inside the wheel box, in wheel pixels. */
  top: number
  /** Tangent rotation, degrees clockwise from upright. */
  angle: number
}

/**
 * Places every card on the circle. Angle 0 is 12 o'clock; positive angles walk
 * clockwise, so card centres are at (R + R*sin, R - R*cos) inside the wheel box.
 */
function buildCards(): ReelCard[] {
  return Array.from({ length: CARD_COUNT }, (_, index) => {
    const angle = index * STEP_DEGREES
    const radians = (angle * Math.PI) / 180
    return {
      left: RADIUS + RADIUS * Math.sin(radians) - CARD_WIDTH / 2,
      top: RADIUS - RADIUS * Math.cos(radians) - CARD_HEIGHT / 2,
      angle,
    }
  })
}

const cards = buildCards()

export function HeroReelArc() {
  return (
    <div className="hero-reel-band hero-enter-up z-10 [animation-delay:360ms]" aria-hidden="true">
      <div className="hero-reel-wheel">
        <div className="hero-reel-spin">
          {cards.map((card, index) => {
            const screen = HERO_REEL_SCREENS[index % HERO_REEL_SCREENS.length]
            const isNearInitialCrown = index < 10 || index >= CARD_COUNT - 10

            return (
              <div
                key={card.angle}
                className="hero-reel-card"
                title={screen.name}
                style={{
                  left: card.left,
                  top: card.top,
                  transform: `rotate(${card.angle}deg)`,
                }}
              >
                <Image
                  src={screen.src}
                  alt=""
                  fill
                  loading={isNearInitialCrown ? "eager" : "lazy"}
                  sizes="(max-width: 639px) 104px, (max-width: 1023px) 143px, 168px"
                  className="hero-reel-card-image"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
