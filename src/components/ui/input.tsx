import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#4a4f5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,212,255,0.4)] focus-visible:ring-offset-0 focus-visible:border-[rgba(0,212,255,0.3)] focus-visible:bg-[rgba(0,212,255,0.02)] disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200",
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
