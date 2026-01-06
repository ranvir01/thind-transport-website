"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Loader2, LogOut, User, ArrowLeft, FileText, Download, 
  CheckCircle, Upload, AlertCircle, Mail
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// SimplePDF Configuration
// Sign up free at: https://simplepdf.com to get your company identifier
const SIMPLEPDF_COMPANY_ID = "thindtransport" // Replace with your actual company ID

// The PDF template URL
const PDF_TEMPLATE_PATH = "/templates/thind-transport-application-template.pdf"

export default function DriverApplicationPage() {
  const { data: session, status } = useSession()
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentStep, setCurrentStep] = useState<'intro' | 'editor' | 'upload' | 'success'>('intro')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [completedPdfBlob, setCompletedPdfBlob] = useState<Blob | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Form fields for submission
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')

  useEffect(() => {
    if (status === "authenticated") {
      setIsLoaded(true)
      // Pre-fill name from session if available
      if (session?.user?.name) {
        setDriverName(session.user.name)
      }
    }
  }, [status, session])

  // Listen for messages from SimplePDF iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin is from SimplePDF
      if (!event.origin.includes('simplepdf.com')) return

      const { type, data } = event.data || {}

      console.log('SimplePDF event:', type, data)

      // Handle form submission from SimplePDF
      if (type === 'SIMPLEPDF_FORM_SUBMITTED' || type === 'submission') {
        console.log('Form submitted via SimplePDF')
        
        // If we receive PDF data, convert to blob
        if (data?.pdf) {
          const pdfBlob = base64ToBlob(data.pdf, 'application/pdf')
          setCompletedPdfBlob(pdfBlob)
          setCurrentStep('upload')
          toast.success('Application completed! Please confirm your details to submit.')
        }
      }

      // Handle PDF download event
      if (type === 'SIMPLEPDF_PDF_DOWNLOADED' || type === 'download') {
        toast.info('PDF downloaded. Please upload it to complete your application.')
        setCurrentStep('upload')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Convert base64 to Blob
  const base64ToBlob = (base64: string, contentType: string): Blob => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: contentType })
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/driver/login" })
  }

  const handleStartApplication = () => {
    setCurrentStep('editor')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError('Please upload a PDF file')
        return
      }
      setCompletedPdfBlob(file)
      setUploadError(null)
    }
  }

  const handleSubmitApplication = async () => {
    if (!completedPdfBlob) {
      setUploadError('Please upload your completed application PDF')
      return
    }

    if (!driverName.trim()) {
      setUploadError('Please enter your name')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', completedPdfBlob, `${driverName.replace(/\s+/g, '_')}_application.pdf`)
      formData.append('driverName', driverName)
      formData.append('driverEmail', session?.user?.email || '')
      formData.append('driverPhone', driverPhone)

      const response = await fetch('/api/driver/upload-application', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      toast.success('Application submitted successfully!')
      setCurrentStep('success')
    } catch (error: any) {
      console.error('Submit error:', error)
      setUploadError(error.message || 'Failed to submit application')
      toast.error('Failed to submit application')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDoneEditing = () => {
    setCurrentStep('upload')
  }

  // Show loading while session is loading
  if (status === "loading" || (status === "authenticated" && !isLoaded)) {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Redirecting to login...</p>
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

  // Upload & Submit screen
  if (currentStep === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
        <Header session={session} onLogout={handleLogout} showBack onBack={() => setCurrentStep('editor')} />
        
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-navy to-navy/90 p-6 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Upload className="h-6 w-6" />
                Submit Your Application
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Upload your completed PDF and confirm your details
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div>
                <Label htmlFor="pdf-upload" className="text-gray-700 font-medium">
                  Completed Application PDF <span className="text-red-500">*</span>
                </Label>
                {completedPdfBlob ? (
                  <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">PDF Ready</p>
                        <p className="text-sm text-green-600">
                          {(completedPdfBlob.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCompletedPdfBlob(null)}
                      className="text-green-700"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange hover:bg-orange/5 transition-colors">
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Click to upload your completed PDF</p>
                      <p className="text-gray-400 text-sm mt-1">or drag and drop</p>
                      <input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Driver Details */}
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="driver-name" className="text-gray-700 font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="driver-name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="driver-email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="driver-email"
                    value={session?.user?.email || ''}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="driver-phone" className="text-gray-700 font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="driver-phone"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="(XXX) XXX-XXXX"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Error message */}
              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{uploadError}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('editor')}
                  className="flex-1"
                >
                  Back to Editor
                </Button>
                <Button
                  onClick={handleSubmitApplication}
                  disabled={isUploading || !completedPdfBlob || !driverName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-gray-500 text-xs">
                By submitting, you authorize Thind Transport to review your application 
                and conduct background checks as described in the application.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // PDF Editor screen
  if (currentStep === 'editor') {
    const simplePdfUrl = `https://${SIMPLEPDF_COMPANY_ID}.simplepdf.com/editor?open=${encodeURIComponent(
      typeof window !== 'undefined' ? window.location.origin + PDF_TEMPLATE_PATH : ''
    )}`

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-navy shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep('intro')}
                className="text-white hover:text-orange transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold text-white">Fill Out Application</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleDoneEditing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Done - Submit Application
              </Button>
            </div>
          </div>
        </header>

        {/* Instructions Banner */}
        <div className="pt-16 bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <p className="text-yellow-800 text-sm font-medium">
              📝 Fill out all fields in the PDF below, then click "Done - Submit Application" when finished
            </p>
            <p className="text-yellow-700 text-xs mt-1">
              Use the download button in the editor to save your work, then upload it on the next screen
            </p>
          </div>
        </div>

        {/* SimplePDF Iframe */}
        <div className="flex-1">
          <iframe
            ref={iframeRef}
            src={simplePdfUrl}
            className="w-full h-[calc(100vh-120px)] border-0"
            allow="clipboard-write"
            title="DOT Application Form"
          />
        </div>
      </div>
    )
  }

  // Introduction/Welcome screen (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
      <Header session={session} onLogout={handleLogout} />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Hero section */}
          <div className="bg-gradient-to-r from-navy to-navy/90 p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <FileText className="h-12 w-12 text-orange" />
              <div>
                <h2 className="text-2xl font-bold">DOT Commercial Driver Application</h2>
                <p className="text-white/80">Thind Transport LLC</p>
              </div>
            </div>
            <p className="text-white/90">
              Complete your official DOT driver application using our interactive PDF editor. 
              Fill out the form directly in your browser - your completed application will be 
              automatically saved and emailed to our HR team!
            </p>
          </div>

          {/* Instructions */}
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-orange">1</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Fill the Form</h3>
                <p className="text-sm text-gray-600">
                  Open the PDF editor and fill out all required fields directly in your browser.
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-orange">2</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Download PDF</h3>
                <p className="text-sm text-gray-600">
                  Download your completed application using the save button in the editor.
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-orange">3</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Auto-Submit</h3>
                <p className="text-sm text-gray-600">
                  Upload the PDF and we'll save it & email it to HR automatically!
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">✨ What Happens When You Submit:</h4>
              <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                <li>Your application is securely saved to our system</li>
                <li>HR receives an email with your application attached</li>
                <li>You receive a confirmation email</li>
                <li>Our team reviews applications within 1-2 business days</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">📋 What You'll Need:</h4>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Social Security Number</li>
                <li>CDL License information (number, state, expiration)</li>
                <li>Employment history (last 3 years + 10 years commercial driving)</li>
                <li>Addresses for the past 3 years</li>
                <li>Accident and violation records (past 3 years)</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="bg-orange hover:bg-orange/90 text-white font-semibold px-8"
                onClick={handleStartApplication}
              >
                <FileText className="h-5 w-5 mr-2" />
                Start Application
              </Button>
              <Link href="/driver/dashboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </Link>
            </div>

            {/* Alternative download option */}
            <div className="text-center pt-4 border-t">
              <p className="text-gray-500 text-sm mb-2">
                Prefer to fill it out offline?
              </p>
              <a
                href={PDF_TEMPLATE_PATH}
                download="Thind_Transport_DOT_Application.pdf"
                className="inline-flex items-center gap-2 text-orange hover:text-orange/80"
              >
                <Download className="h-4 w-4" />
                Download Blank Application (PDF)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Header component
interface HeaderProps {
  session: any
  onLogout: () => void
  showBack?: boolean
  onBack?: () => void
}

function Header({ session, onLogout, showBack, onBack }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && onBack ? (
            <button onClick={onBack} className="text-white hover:text-orange transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link href="/" className="text-white hover:text-orange transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <h1 className="text-xl font-bold text-white">Driver Application</h1>
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
