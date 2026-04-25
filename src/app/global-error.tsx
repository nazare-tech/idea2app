"use client"

import Link from "next/link"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled app error", error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-text-primary">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl border border-border-subtle bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              Application Error
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
              Something went wrong while loading this page.
            </h1>
            <p className="mt-4 text-sm leading-6 text-text-secondary">
              Try loading the page again. If the problem keeps happening, refresh
              the app or return to the dashboard and reopen the project.
            </p>
            {error.digest ? (
              <p className="mt-4 text-xs text-text-secondary">
                Error digest: {error.digest}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center justify-center bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Try Again
              </button>
              <Link
                href="/projects"
                className="inline-flex h-11 items-center justify-center border border-border-subtle px-5 text-sm font-semibold text-text-primary"
              >
                Back to Projects
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
