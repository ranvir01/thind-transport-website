"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Loader2, LogOut, User, ArrowLeft, ArrowRight, Save, 
  CheckCircle, AlertCircle, Home
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// Step Components
import {
  StepProgress,
  PersonalInfoStep,
  AddressHistoryStep,
  EmploymentStep,
  AccidentsStep,
  CDLInfoStep,
  ExperienceStep,
  TrainingStep,
  CertificationStep,
  ReviewStep,
} from "@/components/driver-form"

// Types
import type { 
  DriverApplicationFormData, 
  emptyFormData 
} from "@/types/driver-application-form"
import { 
  FORM_STORAGE_KEY, 
  emptyFormData as defaultFormData 
} from "@/types/driver-application-form"

// PDF Generator
import { generateDOTApplicationPDF } from "@/lib/pdf-builder"

export default function DriverApplicationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Form state
  const [formData, setFormData] = useState<DriverApplicationFormData>(defaultFormData)
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  
  // PDF generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Load saved data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData({ ...defaultFormData, ...parsed })
        setCurrentStep(parsed.currentStep || 1)
        if (parsed.completedSteps) {
          setCompletedSteps(parsed.completedSteps)
        }
      }
    } catch (e) {
      console.error("Error loading saved form data:", e)
    }
    setIsLoaded(true)
  }, [])

  // Auto-save when form data changes
  useEffect(() => {
    if (!isLoaded) return
    
    const toSave = {
      ...formData,
      currentStep,
      completedSteps,
      lastSaved: new Date().toISOString(),
    }
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(toSave))
  }, [formData, currentStep, completedSteps, isLoaded])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/driver/login")
    }
  }, [status, router])

  const handleLogout = async () => {
    localStorage.removeItem(FORM_STORAGE_KEY) // Clear form on logout
    await signOut({ callbackUrl: "/driver/login" })
  }

  // Update handlers for each section
  const updatePersonal = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }))
    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const updateAddress = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }))
  }

  const updateEmployment = (data: typeof formData.employment) => {
    setFormData(prev => ({ ...prev, employment: data }))
  }

  const updateAccidents = (data: typeof formData.accidents) => {
    setFormData(prev => ({ ...prev, accidents: data }))
  }

  const updateTraffic = (data: typeof formData.traffic) => {
    setFormData(prev => ({ ...prev, traffic: data }))
  }

  const updateCDL = (data: typeof formData.cdl) => {
    setFormData(prev => ({ ...prev, cdl: data }))
  }

  const updateExperience = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      experience: { ...prev.experience, [field]: value }
    }))
  }

  const updateTraining = (data: typeof formData.training) => {
    setFormData(prev => ({ ...prev, training: data }))
  }

  const updateCertification = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      certification: { ...prev.certification, [field]: value }
    }))
    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1: // Personal Info
        if (!formData.personal.applicant_name) {
          newErrors.applicant_name = "Name is required"
        }
        if (!formData.personal.email) {
          newErrors.email = "Email is required"
        }
        if (!formData.personal.phone) {
          newErrors.phone = "Phone is required"
        }
        if (!formData.personal.dob) {
          newErrors.dob = "Date of birth is required"
        }
        if (!formData.personal.ssn) {
          newErrors.ssn = "SSN is required"
        }
        if (!formData.personal.physical_exam_exp) {
          newErrors.physical_exam_exp = "Physical exam expiration is required"
        }
        break
      case 2: // Address
        if (!formData.address.addr1_street) {
          newErrors.addr1_street = "Current address is required"
        }
        if (!formData.address.addr1_from) {
          newErrors.addr1_from = "From date is required"
        }
        break
      case 3: // Employment
        if ((formData.employment.employers?.length || 0) === 0) {
          newErrors.employers = "At least one employer is required"
        }
        break
      case 5: // CDL
        if ((formData.cdl.licenses?.length || 0) === 0) {
          newErrors.licenses = "At least one license is required"
        }
        break
      case 8: // Certification
        if (!formData.certification.main_signature) {
          newErrors.main_signature = "Signature is required"
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Navigation
  const handleNext = () => {
    if (currentStep < 9) {
      const isValid = validateStep(currentStep)
      if (isValid) {
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps(prev => [...prev, currentStep])
        }
        setCurrentStep(prev => prev + 1)
        window.scrollTo(0, 0)
      } else {
        toast.error("Please fill in all required fields")
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleStepClick = (step: number) => {
    // Allow going back to completed steps or current step
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step)
      window.scrollTo(0, 0)
    }
  }

  // PDF Generation
  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      const blob = await generateDOTApplicationPDF(formData)
      const url = URL.createObjectURL(blob)
      setGeneratedPdfUrl(url)
      toast.success("PDF generated successfully!")
    } catch (err) {
      console.error("Error generating PDF:", err)
      toast.error("Failed to generate PDF")
    } finally {
      setIsGenerating(false)
    }
  }

  // Submit Application
  const handleSubmit = async () => {
    if (!generatedPdfUrl) {
      toast.error("Please generate the PDF first")
      return
    }

    setIsSubmitting(true)
    try {
      // Fetch the blob from the URL
      const response = await fetch(generatedPdfUrl)
      const blob = await response.blob()

      const formDataToSend = new FormData()
      formDataToSend.append("file", blob, "Thind_Transport_Application.pdf")
      formDataToSend.append("driverName", formData.personal.applicant_name || "Unknown")
      formDataToSend.append("driverEmail", formData.personal.email || session?.user?.email || "")

      const uploadResponse = await fetch("/api/driver/upload-application", {
        method: "POST",
        body: formDataToSend,
      })

      const result = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(result.error || "Upload failed")
      }

      setSubmitSuccess(true)
      toast.success("Application submitted successfully!")
      
      // Clear saved form data
      localStorage.removeItem(FORM_STORAGE_KEY)
    } catch (err: any) {
      console.error("Submit error:", err)
      toast.error(err.message || "Failed to submit application")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking auth
  if (status === "loading" || !isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    return null
  }

  // Success Screen
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Application Submitted!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for applying to Thind Transport. We have received your application 
            and will review it shortly. You will be contacted via email regarding next steps.
          </p>
          <div className="space-y-3">
            <Link href="/driver/dashboard">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            data={formData.personal}
            onChange={updatePersonal}
            errors={errors}
          />
        )
      case 2:
        return (
          <AddressHistoryStep
            data={formData.address}
            onChange={updateAddress}
            errors={errors}
          />
        )
      case 3:
        return (
          <EmploymentStep
            data={formData.employment}
            onChange={updateEmployment}
            errors={errors}
          />
        )
      case 4:
        return (
          <AccidentsStep
            accidentData={formData.accidents}
            trafficData={formData.traffic}
            onAccidentChange={updateAccidents}
            onTrafficChange={updateTraffic}
            errors={errors}
          />
        )
      case 5:
        return (
          <CDLInfoStep
            data={formData.cdl}
            onChange={updateCDL}
            errors={errors}
          />
        )
      case 6:
        return (
          <ExperienceStep
            data={formData.experience}
            onChange={updateExperience}
            errors={errors}
          />
        )
      case 7:
        return (
          <TrainingStep
            data={formData.training}
            onChange={updateTraining}
            errors={errors}
          />
        )
      case 8:
        return (
          <CertificationStep
            data={formData.certification}
            onChange={updateCertification}
            errors={errors}
          />
        )
      case 9:
        return (
          <ReviewStep
            data={formData}
            onEditStep={handleStepClick}
            onGeneratePDF={handleGeneratePDF}
            onSubmit={handleSubmit}
            isGenerating={isGenerating}
            isSubmitting={isSubmitting}
            generatedPdfUrl={generatedPdfUrl}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/driver/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <h1 className="text-lg font-semibold text-gray-800 hidden sm:block">
              Driver Application
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{session?.user?.name || session?.user?.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-gray-600"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <StepProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </div>
      </div>

      {/* Auto-save indicator */}
      {formData.lastSaved && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm text-green-700">
            <Save className="w-4 h-4" />
            <span>
              Progress auto-saved • Last saved: {new Date(formData.lastSaved).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 9 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {currentStep === 8 ? "Review Application" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Please fix the following errors:</h4>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
