"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================
// Context for managing stepper state
// ============================================

interface StepperContextValue {
  value: number
  onValueChange: (value: number) => void
  totalSteps: number
  completedSteps: Set<number>
  setCompletedSteps: React.Dispatch<React.SetStateAction<Set<number>>>
  linear: boolean
  orientation: "horizontal" | "vertical"
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

function useStepperContext() {
  const context = React.useContext(StepperContext)
  if (!context) {
    throw new Error("Stepper components must be used within a Stepper")
  }
  return context
}

// ============================================
// Main Stepper Component
// ============================================

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  onValueChange: (value: number) => void
  linear?: boolean
  orientation?: "horizontal" | "vertical"
  children: React.ReactNode
}

export function Stepper({
  value,
  onValueChange,
  linear = false,
  orientation = "horizontal",
  className,
  children,
  ...props
}: StepperProps) {
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set())
  
  // Calculate total steps from Step components
  const totalSteps = React.useMemo(() => {
    let count = 0
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === StepperHeader) {
          const headerProps = (child as React.ReactElement<StepperHeaderProps>).props
          React.Children.forEach(headerProps.children, (stepChild) => {
            if (React.isValidElement(stepChild) && stepChild.type === Step) {
              count++
            }
          })
        }
      }
    })
    return count
  }, [children])

  return (
    <StepperContext.Provider
      value={{
        value,
        onValueChange,
        totalSteps,
        completedSteps,
        setCompletedSteps,
        linear,
        orientation,
      }}
    >
      <div
        className={cn(
          "w-full",
          orientation === "vertical" && "flex gap-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  )
}

// ============================================
// Stepper Header - Contains all Step indicators
// ============================================

export interface StepperHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function StepperHeader({
  className,
  children,
  ...props
}: StepperHeaderProps) {
  const { orientation } = useStepperContext()
  
  return (
    <div
      className={cn(
        "flex gap-2",
        orientation === "horizontal" ? "flex-row w-full" : "flex-col",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================
// Individual Step Indicator
// ============================================

export interface StepProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: number
  title: string
  description?: string
}

export function Step({
  value: stepValue,
  title,
  description,
  className,
  ...props
}: StepProps) {
  const {
    value: currentValue,
    onValueChange,
    completedSteps,
    linear,
    orientation,
  } = useStepperContext()

  const isActive = currentValue === stepValue
  const isCompleted = completedSteps.has(stepValue)
  const isPast = stepValue < currentValue
  const isFuture = stepValue > currentValue
  const isClickable = !linear || isPast || isActive

  const handleClick = () => {
    if (isClickable && !isActive) {
      onValueChange(stepValue)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isClickable}
      className={cn(
        "flex items-center gap-3 transition-all",
        orientation === "horizontal" ? "flex-1" : "w-full",
        isClickable && !isActive && "cursor-pointer hover:opacity-80",
        !isClickable && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
            isCompleted &&
              "border-success-500 bg-success-500 text-white",
            isActive &&
              !isCompleted &&
              "border-primary-600 bg-primary-600 text-white shadow-lg",
            isPast &&
              !isCompleted &&
              "border-primary-400 bg-primary-50 text-primary-600",
            isFuture &&
              "border-neutral-300 bg-white text-neutral-500"
          )}
        >
          {isCompleted ? (
            <Check className="h-5 w-5" />
          ) : (
            <span>{stepValue}</span>
          )}
        </div>

        {/* Connector Line (horizontal only) */}
        {orientation === "horizontal" && (
          <div className="flex-1 h-[2px] mx-2">
            <div
              className={cn(
                "h-full transition-all duration-300",
                (isCompleted || isPast)
                  ? "bg-success-500"
                  : "bg-neutral-300"
              )}
            />
          </div>
        )}
      </div>

      {/* Step Text */}
      <div className={cn("flex flex-col text-left", orientation === "horizontal" && "hidden sm:flex")}>
        <span
          className={cn(
            "text-sm font-semibold transition-colors",
            isActive && "text-primary-700",
            isCompleted && "text-success-700",
            isFuture && "text-neutral-600"
          )}
        >
          {title}
        </span>
        {description && (
          <span className="text-xs text-neutral-500">{description}</span>
        )}
      </div>
    </button>
  )
}

// ============================================
// Stepper Content - Displays content for active step
// ============================================

export interface StepperContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  children: React.ReactNode
}

export function StepperContent({
  value: stepValue,
  className,
  children,
  ...props
}: StepperContentProps) {
  const { value: currentValue } = useStepperContext()
  
  if (currentValue !== stepValue) return null

  return (
    <div
      className={cn(
        "mt-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================
// Stepper Footer - Contains navigation buttons
// ============================================

export interface StepperFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function StepperFooter({
  className,
  children,
  ...props
}: StepperFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 mt-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================
// Navigation Buttons
// ============================================

export interface StepperPreviousProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function StepperPrevious({
  className,
  children = "Previous",
  ...props
}: StepperPreviousProps) {
  const { value, onValueChange, totalSteps } = useStepperContext()
  const canGoPrevious = value > 1

  return (
    <button
      type="button"
      onClick={() => canGoPrevious && onValueChange(value - 1)}
      disabled={!canGoPrevious}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "border border-neutral-300 bg-white hover:bg-neutral-50 hover:text-neutral-900 active:bg-neutral-100",
        "h-10 px-4 py-2",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export interface StepperNextProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onValidate?: () => boolean | Promise<boolean>
}

export function StepperNext({
  className,
  children = "Next",
  onValidate,
  ...props
}: StepperNextProps) {
  const { value, onValueChange, totalSteps, completedSteps, setCompletedSteps } = useStepperContext()
  const canGoNext = value < totalSteps
  const [isValidating, setIsValidating] = React.useState(false)

  const handleClick = async () => {
    if (!canGoNext) return

    // Run validation if provided
    if (onValidate) {
      setIsValidating(true)
      try {
        const isValid = await onValidate()
        if (!isValid) {
          setIsValidating(false)
          return
        }
      } catch (error) {
        console.error("Validation error:", error)
        setIsValidating(false)
        return
      }
      setIsValidating(false)
    }

    // Mark current step as completed
    setCompletedSteps((prev) => new Set([...prev, value]))
    
    // Move to next step
    onValueChange(value + 1)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canGoNext || isValidating}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
        "h-10 px-4 py-2",
        className
      )}
      {...props}
    >
      {isValidating ? "Validating..." : children}
    </button>
  )
}

// ============================================
// Progress Bar Component
// ============================================

export interface StepperProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  showPercentage?: boolean
}

export function StepperProgress({
  className,
  showPercentage = true,
  ...props
}: StepperProgressProps) {
  const { value, totalSteps } = useStepperContext()
  const progress = (value / totalSteps) * 100

  return (
    <div className={cn("w-full mb-6", className)} {...props}>
      {showPercentage && (
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-neutral-900">
            Step {value} of {totalSteps}
          </span>
          <span className="text-neutral-600">{Math.round(progress)}% Complete</span>
        </div>
      )}
      <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary-600 to-success-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ============================================
// Utility Hook
// ============================================

export function useStepper() {
  return useStepperContext()
}

