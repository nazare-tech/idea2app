import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface ReportTableProps extends ComponentPropsWithoutRef<"table"> {
  wrapperClassName?: string
  minWidthClassName?: string
  scrollLabel?: string
  headerTone?: "dark" | "warm"
}

/**
 * Shared table shell for generated reports.
 *
 * Consumers keep ownership of semantic rows and cells. Add
 * `data-report-table-emphasis` to body cells that need the Figma idea-column
 * treatment; the shell joins those cells into one continuous outline.
 */
export function ReportTable({
  children,
  className,
  wrapperClassName,
  minWidthClassName = "min-w-[720px]",
  scrollLabel = "Scrollable report table",
  headerTone = "dark",
  ...props
}: ReportTableProps) {
  return (
    <div
      aria-label={scrollLabel}
      role="region"
      tabIndex={0}
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-foreground bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        wrapperClassName,
      )}
    >
      <table
        className={cn(
          "w-full border-separate border-spacing-0 text-[13px] leading-[1.25] text-foreground",
          "[&_thead_th]:px-3 [&_thead_th]:py-4 [&_thead_th]:text-left",
          "[&_thead_th]:font-sans [&_thead_th]:text-[12px] [&_thead_th]:font-bold [&_thead_th]:uppercase",
          "[&_thead_th]:leading-[1.2] [&_thead_th]:tracking-[1px]",
          headerTone === "dark"
            ? "[&_thead]:bg-foreground [&_thead_th]:text-white [&_thead_a]:text-white [&_thead_a]:decoration-white/60 [&_thead_a:hover]:text-white/80 [&_thead_a:hover]:decoration-white/80"
            : "[&_thead]:bg-secondary/70 [&_thead_th]:border-b [&_thead_th]:border-border [&_thead_th]:text-foreground [&_thead_a]:text-foreground",
          "[&_tbody_tr:nth-child(odd)]:bg-card [&_tbody_tr:nth-child(even)]:bg-secondary/70",
          "[&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:text-left [&_tbody_td]:align-top",
          "[&_tbody_th]:px-3 [&_tbody_th]:py-3 [&_tbody_th]:text-left [&_tbody_th]:align-top [&_tbody_th]:font-bold",
          "[&_tbody_tr>*:first-child]:font-bold",
          "[&_tbody_[data-report-table-emphasis]]:border-x [&_tbody_[data-report-table-emphasis]]:border-foreground",
          "[&_tbody_[data-report-table-emphasis]]:font-normal [&_tbody_[data-report-table-emphasis]]:italic",
          "[&_tbody_tr:first-child_[data-report-table-emphasis]]:border-t",
          "[&_tbody_tr:last-child_[data-report-table-emphasis]]:border-b",
          minWidthClassName,
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}
