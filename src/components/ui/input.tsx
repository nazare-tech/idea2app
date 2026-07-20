import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-surface-strong bg-surface-soft ui-px-4 py-2.5 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:ui-font-medium file:text-foreground placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring-soft)] focus-visible:ring-offset-0 focus-visible:border-ring focus-visible:bg-[var(--color-ring-faint)] disabled:cursor-not-allowed disabled:opacity-40 transition-[border-color,background-color,box-shadow,color] duration-200 ease-out-expo",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
