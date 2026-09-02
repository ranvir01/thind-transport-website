import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 16px text at every size on touch widths: iOS Safari zooms the viewport into
 * any focused field below 16px and does not zoom back out — 81 of the 86
 * fields in the apply funnel were 14px. Focus is the global outline.
 */
const inputVariants = cva(
  "flex w-full rounded-fleet border bg-white text-neutral-900 shadow-sm transition-colors duration-fast file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-neutral-300",
  {
    variants: {
      variant: {
        default: "border-neutral-300 focus-visible:border-orange-600",
        error: "border-red-400 focus-visible:border-red-600",
        success: "border-green-400 focus-visible:border-green-600",
      },
      inputSize: {
        default: "h-12 px-4 text-base md:h-11 md:text-sm",
        sm: "h-11 px-3 text-base md:h-10 md:text-sm",
        lg: "h-14 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }

