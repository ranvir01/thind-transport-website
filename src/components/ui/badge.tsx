import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge / eyebrow chip. Flat tones on brand tokens (the gradients, shadows,
 * hover lift and the `secondary` red are gone; `dark:` variants never fired —
 * the marketing site has no dark class). Condensed caps are the sanctioned
 * register for an 11–12px eyebrow, so they stay here.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-transparent font-semibold font-display uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "bg-orange-600 text-white",
        primary: "bg-navy-600 text-white border-white/10",
        secondary: "bg-steel-100 text-navy",
        success: "bg-success-700 text-white",
        warning: "bg-gold-500 text-navy-900",
        error: "bg-error-600 text-white",
        outline: "border-white/15 bg-white/5 text-steel-100",
        neutral: "bg-steel-800 text-steel-100",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2.5 py-0.5 text-[11px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

