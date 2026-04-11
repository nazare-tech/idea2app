import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16 text-text-primary">
      <div className="w-full max-w-xl border border-border-subtle bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
          Not Found
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
          This project could not be found.
        </h1>
        <p className="mt-4 text-sm leading-6 text-text-secondary">
          The project link may be outdated, or the project may no longer be
          available for this account.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/projects"
            className="inline-flex h-11 items-center justify-center bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Go to Projects
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center border border-border-subtle px-5 text-sm font-semibold text-text-primary"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
