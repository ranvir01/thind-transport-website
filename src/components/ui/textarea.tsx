import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        // 16px on touch widths (iOS focus-zoom), grows with content where
        // field-sizing is supported, and the same shape as Input/Button.
        className={`flex min-h-[96px] w-full rounded-fleet border border-neutral-300 bg-white px-4 py-3 text-base md:text-sm text-neutral-900 placeholder:text-neutral-500 transition-colors duration-fast hover:border-neutral-400 focus-visible:border-orange-600 disabled:cursor-not-allowed disabled:opacity-50 [field-sizing:content] max-h-[50vh] ${className || ""}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
