import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AppPageShellProps {
  children: ReactNode
  className?: string
  contentClassName?: string
}

interface AppPageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function AppPageShell({
  children,
  className,
  contentClassName,
}: AppPageShellProps) {
  return (
    <div className={cn("min-h-full bg-background text-text-primary", className)}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-8 lg:px-14 lg:py-8",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function AppPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: AppPageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-[760px]">
        {eyebrow && (
          <p className="ui-kicker-label text-text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-text-primary sm:text-[2rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  )
}
