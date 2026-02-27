"use client"

import { Check } from "lucide-react"

interface Step {
  id: number
  name: string
  shortName: string
}

const steps: Step[] = [
  { id: 1, name: "Personal Information", shortName: "Personal" },
  { id: 2, name: "Address History", shortName: "Address" },
  { id: 3, name: "Employment History", shortName: "Employment" },
  { id: 4, name: "Accidents & Violations", shortName: "Accidents" },
  { id: 5, name: "CDL Information", shortName: "CDL" },
  { id: 6, name: "Driving Experience", shortName: "Experience" },
  { id: 7, name: "Training & Skills", shortName: "Training" },
  { id: 8, name: "Certification", shortName: "Certify" },
  { id: 9, name: "Review & Submit", shortName: "Review" },
]

interface StepProgressProps {
  currentStep: number
  completedSteps: number[]
  onStepClick?: (step: number) => void
}

export function StepProgress({ currentStep, completedSteps, onStepClick }: StepProgressProps) {
  return (
    <div className="w-full">
      {/* Mobile view - just show current step */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {steps[currentStep - 1]?.name}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop view - show all steps */}
      <nav aria-label="Progress" className="hidden md:block">
        <ol className="flex items-center">
          {steps.map((step, stepIdx) => (
            <li 
              key={step.id} 
              className={`${stepIdx !== steps.length - 1 ? 'flex-1' : ''} relative`}
            >
              <div 
                className={`group flex items-center ${onStepClick ? 'cursor-pointer' : ''}`}
                onClick={() => onStepClick && onStepClick(step.id)}
              >
                <span className="flex items-center">
                  <span
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                      transition-colors duration-200
                      ${step.id === currentStep
                        ? 'bg-orange-500 text-white'
                        : completedSteps.includes(step.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }
                      ${onStepClick && step.id !== currentStep ? 'group-hover:bg-orange-300' : ''}
                    `}
                  >
                    {completedSteps.includes(step.id) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.id
                    )}
                  </span>
                </span>
                <span 
                  className={`
                    ml-2 text-xs font-medium hidden lg:block
                    ${step.id === currentStep ? 'text-orange-600' : 'text-gray-500'}
                  `}
                >
                  {step.shortName}
                </span>
              </div>
              
              {/* Connector line */}
              {stepIdx !== steps.length - 1 && (
                <div className="hidden md:block absolute top-4 left-8 w-full">
                  <div className="h-0.5 bg-gray-200 mx-2">
                    <div 
                      className={`h-0.5 transition-all duration-300 ${
                        completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      style={{ width: completedSteps.includes(step.id) ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}

export { steps }

