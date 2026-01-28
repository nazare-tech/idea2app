import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:shadow-[0_0_30px_rgba(0,212,255,0.35)] hover:scale-[1.02] active:scale-[0.98]",
        destructive: "bg-gradient-to-r from-[#ff3b5c] to-[#ff6b6b] text-white shadow-[0_0_20px_rgba(255,59,92,0.2)] hover:shadow-[0_0_30px_rgba(255,59,92,0.35)] hover:scale-[1.02] active:scale-[0.98]",
        outline: "border border-[rgba(255,255,255,0.1)] bg-transparent text-foreground hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(0,212,255,0.3)] hover:shadow-[0_0_15px_rgba(0,212,255,0.1)]",
        secondary: "bg-[#12121e] text-secondary-foreground border border-[rgba(255,255,255,0.06)] hover:bg-[#1a1a2e] hover:border-[rgba(255,255,255,0.1)]",
        ghost: "text-muted-foreground hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
