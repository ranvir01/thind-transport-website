import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sectionVariants = cva(
  "w-full transition-colors",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        primary: "bg-primary-50 dark:bg-primary-950/20",
        secondary: "bg-secondary-50 dark:bg-secondary-950/20",
        neutral: "bg-neutral-50 dark:bg-neutral-900",
        white: "bg-white dark:bg-neutral-950",
      },
      spacing: {
        default: "py-12 md:py-16 lg:py-20",          // Standard section spacing
        none: "py-0",                                 // No vertical spacing
        sm: "py-8 md:py-10 lg:py-12",               // Small section spacing
        md: "py-12 md:py-16 lg:py-20",              // Medium section spacing (same as default)
        lg: "py-16 md:py-20 lg:py-24",              // Large section spacing
        xl: "py-20 md:py-24 lg:py-32",              // Extra large section spacing
      },
    },
    defaultVariants: {
      variant: "default",
      spacing: "default",
    },
  }
)

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  /**
   * Whether to include a container wrapper inside the section
   */
  contained?: boolean
  /**
   * Container max-width when contained is true
   */
  containerSize?: "sm" | "default" | "md" | "lg" | "xl" | "2xl" | "full"
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, variant, spacing, contained = false, containerSize = "default", children, ...props }, ref) => {
    const content = contained ? (
      <div className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        containerSize === "sm" && "max-w-3xl",
        containerSize === "default" && "max-w-7xl",
        containerSize === "md" && "max-w-5xl",
        containerSize === "lg" && "max-w-7xl",
        containerSize === "xl" && "max-w-[1440px]",
        containerSize === "2xl" && "max-w-[1600px]",
        containerSize === "full" && "max-w-full"
      )}>
        {children}
      </div>
    ) : children

    return (
      <section
        ref={ref}
        className={cn(sectionVariants({ variant, spacing }), className)}
        {...props}
      >
        {content}
      </section>
    )
  }
)
Section.displayName = "Section"

export { Section, sectionVariants }

