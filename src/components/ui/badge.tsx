import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-bold transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-secondary-500/25 focus:ring-offset-2 dark:ring-offset-neutral-950 font-display uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-secondary-500 to-secondary-600 text-white hover:from-secondary-400 hover:to-secondary-500 shadow-secondary-500/25",
        primary:
          "border-transparent bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 shadow-primary-500/20",
        secondary:
          "border-transparent bg-gradient-to-r from-neutral-100 to-neutral-200 text-primary-700 hover:from-white hover:to-neutral-100 shadow-black/15",
        success:
          "border-transparent bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-green-500/20",
        warning:
          "border-transparent bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20",
        error:
          "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-red-500/20",
        outline: 
          "text-steel-100 border-white/15 bg-white/5 backdrop-blur-sm dark:text-neutral-50 dark:border-neutral-700 hover:bg-white/10",
        neutral:
          "border-transparent bg-gradient-to-r from-steel-700 to-steel-800 text-white hover:from-steel-600 hover:to-steel-700 dark:text-neutral-50 shadow-black/20",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2.5 py-0.5 text-[10px]",
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

