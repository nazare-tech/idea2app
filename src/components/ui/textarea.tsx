import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-foreground ring-offset-background placeholder:text-[#4a4f5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,212,255,0.4)] focus-visible:ring-offset-0 focus-visible:border-[rgba(0,212,255,0.3)] focus-visible:bg-[rgba(0,212,255,0.02)] disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200",
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
