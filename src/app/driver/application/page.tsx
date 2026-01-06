"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Save, LogOut, User, RotateCcw, FileText, X } from "lucide-react"
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
const STORAGE_KEY = "thind_driver_application"

// Step definitions for clickable navigation
const STEPS = [
  { num: 1, label: 'Personal' },
  { num: 2, label: 'Employment' },
  { num: 3, label: 'Driving' },
  { num: 4, label: 'Experience' },
  { num: 5, label: 'Authorization' },
  { num: 6, label: 'Review' },
  { num: 7, label: 'PDF Preview' },
]

// Safe localStorage helper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key)
      }
    } catch (e) {
      console.error("localStorage access failed:", e)
    }
    return null
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
      }
    } catch (e) {
      console.error("localStorage write failed:", e)
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
      }
    } catch (e) {
      console.error("localStorage remove failed:", e)
    }
  }
}

export default function DriverApplicationPage() {
  const { data: session, status } = useSession()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<DriverApplicationData>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [showReference, setShowReference] = useState(false)
  const [maxCompletedStep, setMaxCompletedStep] = useState(1)

  // Load saved form data from localStorage on mount
  useEffect(() => {
    if (status === "authenticated") {
      try {
        const userEmail = session?.user?.email
        if (userEmail) {
          const saved = safeLocalStorage.getItem(`${STORAGE_KEY}_${userEmail}`)
          if (saved) {
            try {
              const parsed = JSON.parse(saved)
              if (parsed && typeof parsed === 'object') {
                // Migrate old data format if needed (workedForCompanyBefore was boolean, now string)
                const formDataToRestore = parsed.formData || {}
                if (formDataToRestore.personalInfo && typeof formDataToRestore.personalInfo.workedForCompanyBefore === 'boolean') {
                  formDataToRestore.personalInfo.workedForCompanyBefore = formDataToRestore.personalInfo.workedForCompanyBefore ? "true" : "false"
                }
                setFormData(formDataToRestore)
                const savedStep = typeof parsed.currentStep === 'number' ? parsed.currentStep : 1
                setCurrentStep(savedStep)
                // Restore max completed step - at least current step, or saved max
                const savedMaxStep = typeof parsed.maxCompletedStep === 'number' ? parsed.maxCompletedStep : savedStep
                setMaxCompletedStep(Math.max(savedStep, savedMaxStep))
                toast.success("Your progress has been restored")
              }
            } catch (parseError) {
              console.error("Failed to parse saved form data:", parseError)
              // Clear corrupted data
              safeLocalStorage.removeItem(`${STORAGE_KEY}_${userEmail}`)
            }
          }
        }
      } catch (e) {
        console.error("Error loading saved data:", e)
      } finally {
        setIsLoaded(true)
      }
    }
  }, [status, session?.user?.email])

  // Save form data to localStorage whenever it changes
  const saveProgress = useCallback(() => {
    if (session?.user?.email && isLoaded) {
      const dataToSave = {
        formData,
        currentStep,
        maxCompletedStep,
        savedAt: new Date().toISOString()
      }
      safeLocalStorage.setItem(`${STORAGE_KEY}_${session.user.email}`, JSON.stringify(dataToSave))
    }
  }, [formData, currentStep, maxCompletedStep, session?.user?.email, isLoaded])

  // Auto-save when form data changes
  useEffect(() => {
    if (isLoaded) {
      saveProgress()
    }
  }, [formData, currentStep, saveProgress, isLoaded])

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/driver/login"
    }
  }, [status])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/driver/login" })
  }

  const handleResetApplication = async () => {
    if (!confirm('Are you sure you want to reset your application? This will clear all your saved data and you will need to start over.')) {
      return
    }
    
    try {
      // Clear localStorage
      if (session?.user?.email) {
        safeLocalStorage.removeItem(`${STORAGE_KEY}_${session.user.email}`)
      }
      
      // Call API to reset server-side data
      const response = await fetch('/api/driver/reset-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset application')
      }
      
      // Reset local state
      setFormData({})
      setCurrentStep(1)
      setMaxCompletedStep(1)
      toast.success('Application data has been reset. You can start fresh!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset application')
    }
  }

  // Show loading while session is loading or waiting for localStorage to load
  if (status === "loading" || (status === "authenticated" && !isLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange mx-auto mb-4" />
          <p className="text-gray-600">Loading your application...</p>
        </div>
      </div>
    )
  }
  
  // If unauthenticated, the useEffect will redirect, show loading in the meantime
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const progress = (currentStep / TOTAL_STEPS) * 100

  const handleNext = (stepData: any) => {
    // For PersonalInfoStep, extract positionApplyingFor to top level
    let updatedData = { ...stepData }
    if (stepData.personalInfo?.positionApplyingFor) {
      updatedData.positionApplyingFor = stepData.personalInfo.positionApplyingFor
    }
    
    // Add application date if not set
    if (!formData.applicationDate) {
      updatedData.applicationDate = new Date().toLocaleDateString('en-US')
    }
    
    setFormData({ ...formData, ...updatedData })
    if (currentStep < TOTAL_STEPS) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      setMaxCompletedStep(Math.max(maxCompletedStep, nextStep))
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

      // Clear saved form data on successful submission
      if (session?.user?.email) {
        safeLocalStorage.removeItem(`${STORAGE_KEY}_${session.user.email}`)
      }

      toast.success("Application submitted successfully! We'll review it within 1-2 weeks.")
      
      // Show success state before redirecting
      setCurrentStep(TOTAL_STEPS + 1) // Move to success screen
      
      setTimeout(() => {
        window.location.href = "/driver/dashboard"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with User Info and Logout */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-navy mb-2">DOT Driver Application</h1>
            <p className="text-gray-600">
              Complete all sections to finalize your application with Thind Transport
            </p>
          </div>
          {session?.user && (
            <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{session.user.name || session.user.email}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetApplication}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                title="Reset and start over"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar with Clickable Steps */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {currentStep <= TOTAL_STEPS ? `Step ${currentStep} of ${TOTAL_STEPS}` : 'Complete'}
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReference(!showReference)}
                  className="text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {showReference ? 'Hide' : 'View'} Original Form
                </Button>
                <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="mt-4 flex justify-between text-xs">
              {STEPS.map((step) => {
                const isCompleted = step.num <= maxCompletedStep
                const isCurrent = step.num === currentStep
                const canNavigate = step.num <= maxCompletedStep
                
                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => canNavigate && setCurrentStep(step.num)}
                    disabled={!canNavigate}
                    className={`
                      transition-all px-2 py-1 rounded
                      ${isCurrent ? 'text-orange font-bold underline underline-offset-4' : ''}
                      ${isCompleted && !isCurrent ? 'text-orange font-semibold hover:bg-orange/10 cursor-pointer' : ''}
                      ${!isCompleted ? 'text-gray-400 cursor-not-allowed' : ''}
                    `}
                    title={canNavigate ? `Go to ${step.label}` : 'Complete previous steps first'}
                  >
                    {step.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Click any completed step to go back and edit
            </p>
          </CardContent>
        </Card>

        {/* Current Step */}
        {renderStep()}

        {/* Progress Save Notice */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex gap-3">
            <Save className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900">
              <strong className="block mb-1">Your Progress is Saved After Each Step</strong>
              <p>
                When you complete a step and click "Continue", your data is saved. You can safely log out and return later - your progress will be restored when you log back in.
              </p>
            </div>
          </div>
        </div>

        {/* Help Notice */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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

      {/* Original PDF Reference Panel */}
      {showReference && (
        <div className="fixed right-0 top-16 w-[450px] h-[calc(100vh-64px)] bg-white shadow-2xl border-l border-gray-300 z-50 flex flex-col">
          <div className="p-3 bg-yellow-50 border-b border-yellow-200 flex items-center justify-between">
            <div>
              <strong className="text-yellow-800 text-sm">Original Form Reference</strong>
              <p className="text-xs text-yellow-600">Yellow highlights = Fields you need to fill</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReference(false)}
              className="text-yellow-700 hover:bg-yellow-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 w-full bg-gray-100 flex flex-col">
            <object
              data="/templates/thind-transport-application-template.pdf#toolbar=1&navpanes=0&view=FitH"
              type="application/pdf"
              className="flex-1 w-full"
              title="Original DOT Application Form Reference"
            >
              {/* Fallback content if PDF can't be displayed inline */}
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <FileText className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">PDF preview not available in your browser.</p>
                <a
                  href="/templates/thind-transport-application-template.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Open PDF in New Tab
                </a>
              </div>
            </object>
          </div>
        </div>
      )}
    </div>
  )
}

