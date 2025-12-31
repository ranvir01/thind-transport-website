"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import type { DriverApplicationData } from "@/types/driver-application"

// Import step components
import { PersonalInfoStep } from "@/components/driver-application/PersonalInfoStep"
import { EmploymentHistoryStep } from "@/components/driver-application/EmploymentHistoryStep"
import { DrivingRecordStep } from "@/components/driver-application/DrivingRecordStep"
import { ExperienceStep } from "@/components/driver-application/ExperienceStep"
import { AuthorizationStep } from "@/components/driver-application/AuthorizationStep"
import { ReviewStep } from "@/components/driver-application/ReviewStep"
import { PDFPreviewStep } from "@/components/driver-application/PDFPreviewStep"

const TOTAL_STEPS = 7

export default function DriverApplicationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<DriverApplicationData>>({})

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/driver/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </div>
    )
  }

  const progress = (currentStep / TOTAL_STEPS) * 100

  const handleNext = (stepData: any) => {
    setFormData({ ...formData, ...stepData })
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = async (finalData: DriverApplicationData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/driver/submit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ...finalData,
          driverId: session?.user?.id,
          status: "under_review",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Submission failed")
      }

      toast.success("Application submitted successfully! We'll review it within 1-2 weeks.")
      
      // Show success state before redirecting
      setCurrentStep(TOTAL_STEPS + 1) // Move to success screen
      
      setTimeout(() => {
        router.push("/driver/dashboard")
      }, 3000)
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application")
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <PersonalInfoStep onNext={handleNext} initialData={formData.personalInfo} />
      case 2:
        return <EmploymentHistoryStep onNext={handleNext} onBack={handleBack} initialData={formData.employmentHistory} />
      case 3:
        return <DrivingRecordStep onNext={handleNext} onBack={handleBack} initialData={formData.drivingRecord} />
      case 4:
        return <ExperienceStep onNext={handleNext} onBack={handleBack} initialData={formData.experienceQualifications} />
      case 5:
        return <AuthorizationStep onNext={handleNext} onBack={handleBack} initialData={formData.pspAuthorization} />
      case 6:
        return <ReviewStep formData={formData as DriverApplicationData} onBack={handleBack} onSubmit={async (data) => handleNext(data)} isSubmitting={false} />
      case 7:
        return <PDFPreviewStep formData={formData as DriverApplicationData} onBack={handleBack} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      case 8:
        // Success screen
        return (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Application Submitted!</h2>
              <p className="text-lg text-gray-600 mb-6">
                Thank you for completing your DOT driver application.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 text-left space-y-2">
                  <li>✓ Your PDF application has been sent to thindcarrier@gmail.com</li>
                  <li>✓ Our compliance team will review your application</li>
                  <li>✓ We'll contact you within 1-2 weeks with next steps</li>
                  <li>✓ You can check your application status in the driver dashboard</li>
                </ul>
              </div>
              <p className="text-sm text-gray-500">
                Redirecting to dashboard...
              </p>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-navy mb-2">DOT Driver Application</h1>
          <p className="text-gray-600">
            Complete all sections to finalize your application with Thind Transport
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {currentStep <= TOTAL_STEPS ? `Step ${currentStep} of ${TOTAL_STEPS}` : 'Complete'}
              </span>
              <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="mt-4 flex justify-between text-xs text-gray-500">
              <span className={currentStep >= 1 ? "text-orange font-semibold" : ""}>Personal</span>
              <span className={currentStep >= 2 ? "text-orange font-semibold" : ""}>Employment</span>
              <span className={currentStep >= 3 ? "text-orange font-semibold" : ""}>Driving</span>
              <span className={currentStep >= 4 ? "text-orange font-semibold" : ""}>Experience</span>
              <span className={currentStep >= 5 ? "text-orange font-semibold" : ""}>Authorization</span>
              <span className={currentStep >= 6 ? "text-orange font-semibold" : ""}>Review</span>
              <span className={currentStep >= 7 ? "text-orange font-semibold" : ""}>PDF Preview</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Step */}
        {renderStep()}

        {/* Help Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong className="block mb-1">Need Help?</strong>
              <p>
                This form collects information required by DOT regulations. All fields marked with * are mandatory.
                If you have questions, call us at (206) 765-6300.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

