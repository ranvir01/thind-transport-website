"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { 
  Loader2, LogOut, User, ArrowLeft, FileText, Download, 
  CheckCircle, Upload, AlertCircle, ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { generateDOTApplicationPDF } from "@/lib/pdf-builder"

export default function DriverApplicationPage() {
  const { data: session, status } = useSession()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/driver/login" })
  }

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      const blob = await generateDOTApplicationPDF()
      setGeneratedPdf(blob)
      
      // Auto-download
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Thind_Transport_DOT_Application.pdf"
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success("PDF generated and downloaded!")
    } catch (err) {
      console.error("Error generating PDF:", err)
      toast.error("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadAgain = () => {
    if (!generatedPdf) return
    const url = URL.createObjectURL(generatedPdf)
    const a = document.createElement("a")
    a.href = url
    a.download = "Thind_Transport_DOT_Application.pdf"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpload = async () => {
    if (!generatedPdf) return
    
    setIsUploading(true)
    setUploadError(null)
    
    try {
      const formData = new FormData()
      formData.append("file", generatedPdf, "Thind_Transport_DOT_Application.pdf")
      formData.append("driverName", session?.user?.name || "Unknown Driver")
      formData.append("driverEmail", session?.user?.email || "")
      
      const response = await fetch("/api/driver/upload-application", {
        method: "POST",
        body: formData,
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }
      
      setUploadSuccess(true)
      toast.success("Application submitted successfully!")
    } catch (err: any) {
      console.error("Upload error:", err)
      setUploadError(err.message || "Failed to upload application")
      toast.error("Failed to upload application")
    } finally {
      setIsUploading(false)
    }
  }

  // Show loading while checking auth
  if (status === "loading") {
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
    if (typeof window !== "undefined") {
      window.location.href = "/driver/login"
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/driver/dashboard" className="text-white/80 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-white">DOT Driver Application</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/80">
              <User className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">{session?.user?.email}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-white hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Hero Section */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] p-8 text-white text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-80" />
              <h2 className="text-2xl font-bold mb-2">Thind Transport Driver Application</h2>
              <p className="text-white/80">
                Complete DOT-compliant 25-page application with all required forms
              </p>
            </div>

            <div className="p-6 space-y-6">
              {!uploadSuccess ? (
                <>
                  {/* Step 1: Generate PDF */}
                  <div className="border rounded-xl p-6 bg-gray-50">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800 mb-2">
                          Download Your Application
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Click the button below to generate and download your fillable DOT driver application. 
                          The PDF includes all required forms and can be filled out in any PDF viewer.
                        </p>
                        <Button
                          onClick={handleGeneratePDF}
                          disabled={isGenerating}
                          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                          size="lg"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <Download className="h-5 w-5" />
                              Generate & Download PDF
                            </>
                          )}
                        </Button>
                        
                        {generatedPdf && (
                          <Button
                            onClick={handleDownloadAgain}
                            variant="outline"
                            size="sm"
                            className="ml-3 gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download Again
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Fill Out */}
                  <div className={`border rounded-xl p-6 ${generatedPdf ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0 ${generatedPdf ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                        2
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800 mb-2">
                          Fill Out the Application
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Open the downloaded PDF in Adobe Reader, Chrome, or any PDF viewer. 
                          Click on each field to enter your information. All fields are fillable and will save with the document.
                        </p>
                        <ul className="text-sm text-gray-500 space-y-1">
                          <li>• Complete all required sections</li>
                          <li>• Sign in all signature fields (type your name)</li>
                          <li>• Save the completed PDF to your device</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Submit */}
                  <div className={`border rounded-xl p-6 ${generatedPdf ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0 ${generatedPdf ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                        3
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800 mb-2">
                          Submit Your Application
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Once you've filled out the PDF, you can submit it directly or email it to our HR team.
                        </p>
                        
                        <div className="flex flex-wrap gap-3">
                          <Button
                            onClick={handleUpload}
                            disabled={!generatedPdf || isUploading}
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Submit to Thind Transport
                              </>
                            )}
                          </Button>
                          
                          <a 
                            href="mailto:hr@thindtransport.com?subject=DOT%20Driver%20Application"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Email to HR
                          </a>
                        </div>
                        
                        {uploadError && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{uploadError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Success State */
                <div className="text-center py-8">
                  <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    Application Submitted Successfully!
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Your application has been received. Our HR team will review it and contact you soon.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link href="/driver/dashboard">
                      <Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]">
                        Return to Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadSuccess(false)
                        setGeneratedPdf(null)
                      }}
                    >
                      Submit Another
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Included Forms */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold text-gray-800 mb-4">What's Included in the Application</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <ul className="space-y-2">
                <li>✓ DQ File Checklist (Internal)</li>
                <li>✓ Applicant Information</li>
                <li>✓ Employment History (8 employers)</li>
                <li>✓ Accident Record (3 years)</li>
                <li>✓ Traffic Convictions (3 years)</li>
                <li>✓ CDL/License Information</li>
                <li>✓ A/B/C Questions</li>
              </ul>
              <ul className="space-y-2">
                <li>✓ Driving Experience</li>
                <li>✓ Training & Qualifications</li>
                <li>✓ Authorization Forms</li>
                <li>✓ Previous Employer Inquiry (×6)</li>
                <li>✓ Annual Review Forms</li>
                <li>✓ Road Test Certificate</li>
                <li>✓ Medical Certification</li>
              </ul>
            </div>
          </div>

          {/* Help */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Need help? Contact HR at{" "}
              <a href="mailto:hr@thindtransport.com" className="text-blue-600 hover:underline">
                hr@thindtransport.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
