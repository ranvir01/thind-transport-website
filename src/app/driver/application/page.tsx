"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Loader2, LogOut, User, ArrowLeft, FileText, Download, 
  CheckCircle, Upload, AlertCircle, Mail, ChevronRight, ChevronLeft, Save
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { 
  loadFieldMap, 
  generateFilledPDF, 
  downloadBlob, 
  groupFieldsBySection,
  validateFormData,
  type FieldMap,
  type FieldDefinition,
  type FormData
} from "@/lib/pdf-generator"

const PDF_TEMPLATE_PATH = "/templates/thind-transport-application-template.pdf"
const FIELD_MAP_PATH = "/field-map.json"
const FORM_STORAGE_KEY = "thind_driver_application_form"

export default function DriverApplicationPage() {
  const { data: session, status } = useSession()
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentStep, setCurrentStep] = useState<'loading' | 'form' | 'generating' | 'review' | 'success'>('loading')
  const [fieldMap, setFieldMap] = useState<FieldMap | null>(null)
  const [formData, setFormData] = useState<FormData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [noFieldsConfigured, setNoFieldsConfigured] = useState(false)

  // Load field map and saved form data
  useEffect(() => {
    const loadData = async () => {
      try {
        const map = await loadFieldMap(FIELD_MAP_PATH)
        setFieldMap(map)
        
        if (map.fields.length === 0) {
          setNoFieldsConfigured(true)
        }
        
        // Load saved form data
        const savedData = localStorage.getItem(FORM_STORAGE_KEY)
        if (savedData) {
          try {
            setFormData(JSON.parse(savedData))
          } catch (e) {
            console.error("Failed to load saved form data")
          }
        }
        
        setCurrentStep('form')
      } catch (err) {
        console.error("Failed to load field map:", err)
        setNoFieldsConfigured(true)
        setCurrentStep('form')
      }
    }
    
    if (status === "authenticated") {
      loadData()
      setIsLoaded(true)
    }
  }, [status])

  // Auto-save form data
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData))
    }
  }, [formData])

  // Group fields by section
  const sectionedFields = useMemo(() => {
    if (!fieldMap) return new Map()
    return groupFieldsBySection(fieldMap.fields)
  }, [fieldMap])

  const sections = useMemo(() => Array.from(sectionedFields.keys()), [sectionedFields])
  const currentSectionFields = useMemo(() => {
    const section = sections[currentSection]
    return sectionedFields.get(section) || []
  }, [sections, currentSection, sectionedFields])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/driver/login" })
  }

  const handleInputChange = (fieldId: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  const handleNextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleGeneratePDF = async () => {
    if (!fieldMap) return

    // Validate
    const validation = validateFormData(fieldMap, formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      toast.error("Please fill in all required fields")
      
      // Find first section with errors
      for (let i = 0; i < sections.length; i++) {
        const sectionFields = sectionedFields.get(sections[i]) || []
        const hasError = sectionFields.some((f: FieldDefinition) => validation.errors[f.id])
        if (hasError) {
          setCurrentSection(i)
          break
        }
      }
      return
    }

    setCurrentStep('generating')
    
    try {
      const pdfBlob = await generateFilledPDF(PDF_TEMPLATE_PATH, fieldMap, formData)
      setGeneratedPdf(pdfBlob)
      setCurrentStep('review')
      toast.success("PDF generated successfully!")
    } catch (err) {
      console.error("Failed to generate PDF:", err)
      toast.error("Failed to generate PDF. Please try again.")
      setCurrentStep('form')
    }
  }

  const handleDownloadPDF = () => {
    if (!generatedPdf) return
    const driverName = (formData['driver_name'] || formData['applicant_name'] || 'Driver') as string
    const filename = `${driverName.replace(/\s+/g, '_')}_DOT_Application.pdf`
    downloadBlob(generatedPdf, filename)
  }

  const handleSubmitApplication = async () => {
    if (!generatedPdf) return

    setIsUploading(true)

    try {
      const formDataUpload = new FormData()
      const driverName = (formData['driver_name'] || formData['applicant_name'] || 'Driver') as string
      formDataUpload.append('file', generatedPdf, `${driverName.replace(/\s+/g, '_')}_application.pdf`)
      formDataUpload.append('driverName', driverName)
      formDataUpload.append('driverEmail', session?.user?.email || '')
      formDataUpload.append('driverPhone', (formData['phone'] || formData['phone_number'] || '') as string)

      const response = await fetch('/api/driver/upload-application', {
        method: 'POST',
        body: formDataUpload,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      // Clear saved form data
      localStorage.removeItem(FORM_STORAGE_KEY)
      
      toast.success('Application submitted successfully!')
      setCurrentStep('success')
    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error(error.message || 'Failed to submit application')
    } finally {
      setIsUploading(false)
    }
  }

  const handleResetForm = () => {
    if (confirm("Are you sure you want to clear all form data and start over?")) {
      setFormData({})
      localStorage.removeItem(FORM_STORAGE_KEY)
      setCurrentSection(0)
      toast.success("Form cleared")
    }
  }

  // Render field input based on type
  const renderField = (field: FieldDefinition) => {
    const value = formData[field.id]
    const hasError = !!errors[field.id]

    if (field.type === 'checkbox') {
      return (
        <div key={field.id} className="flex items-center gap-3">
          <input
            type="checkbox"
            id={field.id}
            checked={!!value}
            onChange={(e) => handleInputChange(field.id, e.target.checked)}
            className="h-4 w-4 text-orange rounded border-gray-300 focus:ring-orange"
          />
          <Label htmlFor={field.id} className="cursor-pointer !mb-0">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
      )
    }

    return (
      <div key={field.id}>
        <Label htmlFor={field.id}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field.id}
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
          value={(value as string) || ''}
          onChange={(e) => handleInputChange(field.id, e.target.value)}
          className={`mt-1 ${hasError ? 'border-red-500' : ''}`}
          placeholder={field.type === 'signature' ? 'Type your full legal name' : ''}
        />
        {hasError && (
          <p className="text-red-500 text-xs mt-1">{errors[field.id]}</p>
        )}
      </div>
    )
  }

  // Loading state
  if (status === "loading" || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-orange mx-auto" />
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    if (typeof window !== 'undefined') {
      window.location.href = "/driver/login"
    }
    return null
  }

  // No fields configured - show admin link
  if (noFieldsConfigured && currentStep === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
        <Header session={session} onLogout={handleLogout} />
        
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Application Form Not Configured
            </h2>
            <p className="text-gray-600 mb-6">
              The form fields haven't been mapped yet. An administrator needs to configure 
              the field positions using the visual mapper tool.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/driver/admin/field-mapper">
                <Button className="bg-orange hover:bg-orange/90 w-full">
                  Open Field Mapper Tool
                </Button>
              </Link>
              <Link href="/driver/dashboard">
                <Button variant="outline" className="w-full">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Generating PDF
  if (currentStep === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-orange mx-auto" />
          <p className="mt-6 text-xl text-gray-700">Generating your PDF...</p>
          <p className="mt-2 text-gray-500">This may take a moment</p>
        </div>
      </div>
    )
  }

  // Success screen
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
        <Header session={session} onLogout={handleLogout} />
        
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Application Submitted Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for applying to Thind Transport. Your application has been received 
              and our HR team will review it within 1-2 business days.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              A confirmation email has been sent to <strong>{session?.user?.email}</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/driver/dashboard">
                <Button className="bg-orange hover:bg-orange/90">
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">
                  Return Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Review & Submit screen
  if (currentStep === 'review') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
        <Header session={session} onLogout={handleLogout} />
        
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                PDF Generated Successfully!
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Review your application and submit to HR
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Your filled PDF is ready!</h3>
                <p className="text-green-700 text-sm">
                  Click the button below to download your completed DOT application PDF. 
                  You can review it before submitting to our HR team.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-800 mb-4 text-center">Ready to Submit?</h3>
                <p className="text-gray-600 text-center text-sm mb-4">
                  By submitting, your application will be saved and emailed to our HR team. 
                  You will receive a confirmation email.
                </p>
                
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('form')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Edit Application
                  </Button>
                  <Button
                    onClick={handleSubmitApplication}
                    disabled={isUploading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Submit to HR
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
      <Header session={session} onLogout={handleLogout} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Section {currentSection + 1} of {sections.length}
            </span>
            <span className="text-sm text-gray-500">
              {sections[currentSection]}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-navy to-navy/90 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{sections[currentSection]}</h2>
                <p className="text-white/70 text-sm mt-1">
                  Fill out all required fields below
                </p>
              </div>
              <FileText className="h-10 w-10 text-orange" />
            </div>
          </div>

          <div className="p-6">
            {/* Section Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              {currentSectionFields.map((field: FieldDefinition) => renderField(field))}
            </div>

            {/* Empty section message */}
            {currentSectionFields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No fields in this section</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="border-t p-4 bg-gray-50 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevSection}
              disabled={currentSection === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleResetForm}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear All
              </Button>
            </div>

            {currentSection < sections.length - 1 ? (
              <Button
                onClick={handleNextSection}
                className="bg-orange hover:bg-orange/90"
              >
                Next Section
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleGeneratePDF}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-1" />
                Generate PDF
              </Button>
            )}
          </div>
        </div>

        {/* Section Navigation Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {sections.map((section, index) => (
            <button
              key={section}
              onClick={() => setCurrentSection(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentSection
                  ? 'bg-orange'
                  : index < currentSection
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
              title={section}
            />
          ))}
        </div>

        {/* Auto-save notice */}
        <p className="text-center text-gray-500 text-sm mt-4">
          <Save className="h-3 w-3 inline mr-1" />
          Your progress is automatically saved
        </p>
      </div>
    </div>
  )
}

// Header component
interface HeaderProps {
  session: any
  onLogout: () => void
}

function Header({ session, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/driver/dashboard" className="text-white hover:text-orange transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">DOT Driver Application</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/80 text-sm hidden sm:block">
            <User className="h-4 w-4 inline mr-1" />
            {session?.user?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
