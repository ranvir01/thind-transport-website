import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-xl border-2 bg-white text-neutral-900 shadow-sm ring-offset-white transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/25 focus-visible:ring-offset-0 focus-visible:shadow-md hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-neutral-300",
  {
    variants: {
      variant: {
        default: "border-neutral-200 focus-visible:border-primary-500",
        error: "border-red-300 focus-visible:ring-red-500/25 focus-visible:border-red-500",
        success: "border-green-300 focus-visible:ring-green-500/25 focus-visible:border-green-500",
      },
      inputSize: {
        default: "h-11 px-4 py-2.5 text-sm",
        sm: "h-9 px-3 py-2 text-xs",
        lg: "h-12 px-5 py-3 text-base",
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

