import type { SVGProps } from "react"

/**
 * Brand utility icons, generated from the 2026-07-30 brand kit
 * (`brand/generated/2026-07-30-maker-compass/icons/`). Source of truth is the
 * kit's `build-icons.py`; path data here must match those SVGs exactly.
 *
 * Construction rules (see brand kit `brand.md` § Icons): 24x24 viewBox, 1.5px
 * stroke, butt caps and miter joins for square-cut terminals, no fills,
 * `currentColor` so icons inherit the surrounding text colour. Icons never
 * carry Action Red: red is commitment, an icon is navigation.
 *
 * Exports mirror the lucide-react names they replace, so a swap is an
 * import-path change only. Only glyphs with confirmed call sites are exported.
 */

type BrandIconProps = SVGProps<SVGSVGElement> & {
  /** Rendered square size in px, like lucide's `size` prop. */
  size?: number
}

function makeIcon(label: string, children: React.ReactNode) {
  function Icon({ size = 24, ...props }: BrandIconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    )
  }
  Icon.displayName = label
  return Icon
}

export const ArrowRight = makeIcon(
  "BrandArrowRight",
  <>
    <path d="M3.5 12 H20.5" />
    <path d="M13.5 5 L20.5 12 L13.5 19" />
  </>
)

export const Bell = makeIcon(
  "BrandBell",
  <>
    <path d="M6.5 17.5 V12 C6.5 8.9 8.9 6.5 12 6.5 C15.1 6.5 17.5 8.9 17.5 12 V17.5" />
    <path d="M4 17.5 H20" />
    <path d="M10 20.5 H14" />
  </>
)

export const Check = makeIcon("BrandCheck", <path d="M4 12.5 L9.5 18 L20 6.5" />)

export const Plus = makeIcon(
  "BrandPlus",
  <>
    <path d="M12 3.5 V20.5" />
    <path d="M3.5 12 H20.5" />
  </>
)

export const Settings = makeIcon(
  "BrandSettings",
  <>
    <path d="M3.5 7 H20.5" />
    <path d="M3.5 12 H20.5" />
    <path d="M3.5 17 H20.5" />
    <path d="M8 4.5 V9.5" />
    <path d="M16 9.5 V14.5" />
    <path d="M11 14.5 V19.5" />
  </>
)

export const User = makeIcon(
  "BrandUser",
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5 V18.5 L8.5 15 H15.5 L19.5 18.5 V20.5" />
  </>
)

export const X = makeIcon(
  "BrandX",
  <>
    <path d="M5.5 5.5 L18.5 18.5" />
    <path d="M18.5 5.5 L5.5 18.5" />
  </>
)
