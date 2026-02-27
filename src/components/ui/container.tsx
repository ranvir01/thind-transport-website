import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const containerVariants = cva(
  "mx-auto w-full transition-all",
  {
    variants: {
      size: {
        default: "max-w-7xl",       // 1280px - standard container
        sm: "max-w-3xl",            // 768px - narrow content
        md: "max-w-5xl",            // 1024px - medium width
        lg: "max-w-7xl",            // 1280px - large width
        xl: "max-w-[1440px]",       // 1440px - extra large
        "2xl": "max-w-[1600px]",    // 1600px - maximum width
        full: "max-w-full",         // Full width, no max constraint
      },
      padding: {
        default: "px-4 sm:px-6 lg:px-8",     // Responsive padding
        none: "px-0",                         // No padding
        sm: "px-2 sm:px-4 lg:px-6",          // Small padding
        lg: "px-6 sm:px-8 lg:px-12",         // Large padding
      },
    },
    defaultVariants: {
      size: "default",
      padding: "default",
    },
  }
)

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  /**
   * Whether to center the container vertically
   */
  centerY?: boolean
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, centerY = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          containerVariants({ size, padding }),
          centerY && "flex items-center min-h-screen",
          className
        )}
        {...props}
      />
    )
  }
)
Container.displayName = "Container"

export { Container, containerVariants }

