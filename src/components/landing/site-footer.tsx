import Link from "next/link"

import { BrandWordmark } from "@/components/layout/brand-wordmark"

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
]

/**
 * The one public-site footer, shared by the landing page and the
 * contact/privacy/terms info pages. Sign-in / signup CTAs intentionally live
 * in the header and hero only, so the footer stays product + help + legal.
 */
export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-border-subtle bg-[#F5F0EB]">
      {/* Oversized compass watermark, bled off the bottom-right corner. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 47.9971 33.5966"
        fill="none"
        className="pointer-events-none absolute -bottom-[150px] -right-[170px] hidden h-[574px] w-[820px] text-[rgba(28,25,23,0.09)] md:block"
      >
        <path
          d="M35.4533 27.6265C35.7032 28.034 35.2349 28.5024 34.8273 28.2525L25.1769 22.3101L26.6408 21.4097L31.0236 24.2075C31.2761 24.3687 31.571 24.0746 31.4103 23.8218L28.6154 19.4273L29.5089 17.9732L35.4533 27.6265ZM13.0226 5.28761L13.1759 5.34914L13.3742 5.47023L22.8146 11.2837L21.3517 12.1841L16.9806 9.39504C16.7281 9.23425 16.4332 9.52903 16.5939 9.78176L19.3771 14.1568L18.4826 15.6109L12.672 6.17238L12.55 5.97511L12.4894 5.81984C12.4281 5.51222 12.7149 5.22543 13.0226 5.28761Z"
          stroke="currentColor"
          strokeWidth="0.08"
        />
        <path
          d="M21.443 13.587L34.8006 5.37329C35.2075 5.1231 35.6749 5.59052 35.4248 5.99741L27.2118 19.3557C27.0476 19.6228 26.8228 19.8476 26.5556 20.0119L13.1973 28.2248C12.7904 28.475 12.323 28.0075 12.5732 27.6007L20.787 14.2431C20.9512 13.976 21.1759 13.7513 21.443 13.587Z"
          stroke="currentColor"
          strokeWidth="0.08"
        />
        <path
          d="M40.6737 0.125786C40.8361 -0.0366426 41.0997 -0.0368826 41.2593 0.12833C45.4302 4.44601 47.997 10.3232 47.9971 16.8004L47.9893 17.4205C47.8313 23.6524 45.2967 29.2928 41.2594 33.4724C41.0998 33.6377 40.8361 33.6374 40.6737 33.4749L39.0976 31.8982C38.9353 31.7358 38.9356 31.4728 39.0947 31.3072C42.7115 27.5438 44.9356 22.4321 44.9356 16.8004C44.9355 11.1686 42.7117 6.05625 39.0948 2.29271C38.9357 2.12711 38.9354 1.8641 39.0978 1.70169L40.6737 0.125786Z"
          stroke="currentColor"
          strokeWidth="0.08"
        />
        <path
          d="M8.90025 1.69748C9.06267 1.8599 9.06235 2.12295 8.90316 2.28855C5.28511 6.05223 3.06069 11.1655 3.06055 16.7982C3.06055 22.4298 5.28373 27.5424 8.90033 31.3059C9.05947 31.4715 9.05977 31.7345 8.89737 31.8969L7.32246 33.4718C7.16002 33.6343 6.89637 33.6345 6.73678 33.4693C2.56668 29.1515 0 23.2749 0 16.7982C0.000147854 10.3202 2.56703 4.44194 6.73873 0.124115C6.89833 -0.0410749 7.16194 -0.0408243 7.32436 0.121594L8.90025 1.69748Z"
          stroke="currentColor"
          strokeWidth="0.08"
        />
        <circle cx="23.9986" cy="16.798" r="1.45565" stroke="currentColor" strokeWidth="0.08" />
        <circle cx="23.9986" cy="16.798" r="0.45" fill="var(--primary)" />
      </svg>

      <div className="relative z-[1] mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-14">
        <div>
          <BrandWordmark href="/" logoSize={32} logoClassName="rounded-sm" labelClassName="text-base font-semibold tracking-[0.01em]" />
          <p className="mt-4 max-w-[320px] text-sm leading-relaxed text-text-secondary">
            Turn a one-line idea into research, a product plan, mockups, and a first-version build plan you can hand to a coding agent.
          </p>
        </div>

        <div>
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">Product</p>
          <ul className="mt-4 space-y-3 text-sm">
            {productLinks.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-text-secondary hover:text-text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">Help</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link href="/contact" className="text-text-secondary hover:text-text-primary">
                Contact us
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative z-[1] mx-auto flex min-h-[64px] w-full max-w-[1320px] flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 text-sm sm:px-8 lg:px-14">
        <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-text-muted">© 2026 Maker Compass. All rights reserved.</span>
        <nav className="flex items-center gap-6 font-mono text-[0.6875rem] tracking-[0.18em]">
          <Link href="/privacy" className="text-text-muted hover:text-text-primary">
            PRIVACY
          </Link>
          <Link href="/terms" className="text-text-muted hover:text-text-primary">
            TERMS
          </Link>
        </nav>
      </div>
    </footer>
  )
}
