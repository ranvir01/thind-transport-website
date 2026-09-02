import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Marketing button. One shape (rounded-fleet), flat fills, no lift/glow/caps by
 * default: the previous base carried shadow-lg, hover:-translate-y, a 4px ring
 * and uppercase condensed type, so a "Cancel" link lifted and shouted, and the
 * default fill was the off-brand `secondary` gradient (#D94B45) — a different
 * red from every hand-rolled bg-orange-600 CTA on the site. Focus is the
 * global :focus-visible outline in globals.css; no second ring here.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-fleet font-semibold transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        /** The brand red at the AA-safe fill shade (#C42820, 5.5:1 with white). */
        default: "bg-orange-600 text-white hover:bg-orange-500 active:bg-orange-700",
        primary: "bg-navy text-white border border-white/10 hover:bg-navy-600 active:bg-navy-700",
        secondary: "bg-white text-navy border border-steel-200 hover:bg-steel-50 active:bg-steel-100",
        outline: "border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/35 active:bg-white/15",
        ghost: "text-steel-200 hover:bg-white/10 hover:text-white active:bg-white/15",
        link: "text-orange-400 underline-offset-4 hover:underline hover:text-orange-300",
        destructive: "bg-error-600 text-white hover:bg-error-700 active:bg-error-800",
        success: "bg-success-700 text-white hover:bg-success-800 active:bg-success-900",
      },
      size: {
        default: "min-h-[44px] px-6 py-2.5 text-sm",
        sm: "min-h-[36px] px-4 py-2 text-xs",
        lg: "min-h-[48px] px-8 py-3 text-base",
        xl: "min-h-[56px] px-10 py-3.5 text-lg",
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

