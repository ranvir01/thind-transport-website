import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-transparent transition-all duration-200 transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary-500/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 shadow-lg font-display uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-secondary-500 to-secondary-600 text-white hover:from-secondary-400 hover:to-secondary-500 hover:shadow-xl active:from-secondary-600 active:to-secondary-700 shadow-secondary-500/30",
        primary: "bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 hover:shadow-xl active:from-primary-600 active:to-primary-700 shadow-primary-500/25",
        secondary:
          "bg-gradient-to-r from-neutral-100 to-neutral-200 text-primary-700 hover:from-white hover:to-neutral-100 hover:shadow-xl active:from-neutral-200 active:to-neutral-300 shadow-black/20",
        outline:
          "border-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/35 hover:shadow-xl active:bg-white/15 shadow-sm",
        ghost: "shadow-none hover:bg-white/10 hover:shadow-md hover:text-white active:bg-white/15 text-steel-200",
        link: "shadow-none text-secondary-400 underline-offset-4 hover:underline hover:text-secondary-300",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-xl active:from-red-700 active:to-red-800 shadow-red-500/25",
        success:
          "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-xl active:from-green-700 active:to-emerald-800 shadow-green-500/25",
      },
      size: {
        default: "h-11 px-6 py-2.5 text-sm",
        sm: "h-9 rounded-lg px-4 text-xs tracking-[0.07em]",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
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

