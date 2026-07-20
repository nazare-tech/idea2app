import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-surface-strong bg-surface-soft ui-px-4 ui-py-3 text-sm text-foreground ring-offset-background placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring-soft)] focus-visible:ring-offset-0 focus-visible:border-ring focus-visible:bg-[var(--color-ring-faint)] disabled:cursor-not-allowed disabled:opacity-40 transition-[border-color,background-color,box-shadow,color] duration-200 ease-out-expo",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
