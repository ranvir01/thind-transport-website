"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, FileText, CheckCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { generateDOTApplicationPDF } from "@/lib/pdf-builder"

export default function CreateFillablePDFPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)

  const createFillablePDF = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Generate the PDF using our builder
      const blob = await generateDOTApplicationPDF()
      setPdfBlob(blob)

      // Auto-download
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "Thind_Transport_DOT_Application_FILLABLE.pdf"
      a.click()
      URL.revokeObjectURL(url)

      setIsComplete(true)
    } catch (err: any) {
      console.error("Error creating fillable PDF:", err)
      setError(err.message || "Failed to create fillable PDF")
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadAgain = () => {
    if (!pdfBlob) return
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = "Thind_Transport_DOT_Application_FILLABLE.pdf"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Create Fillable PDF</h1>
          <Link href="/driver/dashboard" className="text-white/80 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10" />
              <div>
                <h2 className="text-xl font-bold">Generate Fillable DOT Application</h2>
                <p className="text-white/80 text-sm">Complete 25-page DOT-compliant PDF with form fields</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {!isComplete ? (
              <>
                <p className="text-gray-700">
                  This tool generates a <strong>complete, professional DOT driver application</strong> with 
                  built-in fillable form fields. The PDF includes:
                </p>

                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li><strong>DQ File Checklist</strong> - Internal HR tracking</li>
                  <li><strong>Applicant Information</strong> - Personal details, addresses, education</li>
                  <li><strong>Employment History</strong> - 8 employers with FMCSR questions</li>
                  <li><strong>Accident & Traffic Record</strong> - 3-year history</li>
                  <li><strong>CDL Information</strong> - Licenses, endorsements, A/B/C questions</li>
                  <li><strong>Driving Experience</strong> - Equipment types, miles, states</li>
                  <li><strong>Training & Qualifications</strong> - Courses, awards, references</li>
                  <li><strong>Certifications & Authorizations</strong> - Background, PSP, FCRA, Clearinghouse</li>
                  <li><strong>Previous Employer Inquiry Forms</strong> - 6 forms for DOT compliance</li>
                  <li><strong>Annual Review Forms</strong> - MVR review, driver certification</li>
                  <li><strong>Road Test Certificate</strong> - Skills evaluation</li>
                  <li><strong>Medical Certification</strong> - DOT physical requirements</li>
                  <li><strong>Internal Process Record</strong> - Hiring decision documentation</li>
                </ul>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>How it works:</strong> The PDF is generated entirely in your browser using pdf-lib. 
                    All form fields are properly positioned and sized. Drivers can open it in any PDF viewer 
                    (Adobe Reader, Chrome, Edge) and fill out all fields directly.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={createFillablePDF}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Generating 25-Page PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5 mr-2" />
                        Generate & Download Fillable PDF
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Fillable PDF Created Successfully!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your 25-page DOT application PDF has been downloaded. Open it in any PDF viewer to fill out the form fields.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button onClick={downloadAgain} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Again
                  </Button>
                  <Button onClick={() => { setIsComplete(false); setPdfBlob(null) }} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Generate New
                  </Button>
                  <Link href="/driver/dashboard">
                    <Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]">
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-gray-800 mb-4">Instructions for Drivers</h3>
          <ol className="list-decimal list-inside text-gray-600 space-y-2">
            <li>Download the fillable PDF using the button above</li>
            <li>Open the PDF in Adobe Reader, Chrome, or any PDF viewer</li>
            <li>Click on any field to type your information</li>
            <li>Check the appropriate boxes for Yes/No questions</li>
            <li>Sign in the signature fields (type your name)</li>
            <li>Save the completed PDF</li>
            <li>Email to: <a href="mailto:hr@thindtransport.com" className="text-blue-600 hover:underline">hr@thindtransport.com</a></li>
          </ol>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This application complies with FMCSR 391.21 requirements.</p>
        </div>
      </div>
    </div>
  )
}
