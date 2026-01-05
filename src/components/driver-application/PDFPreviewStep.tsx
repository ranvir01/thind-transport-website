"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Send, Loader2, FileText, Download, Eye, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react"
import type { DriverApplicationData } from "@/types/driver-application"
import { generateApplicationPDF, downloadPDF } from "./PDFDocument"

interface Props {
  formData: DriverApplicationData
  onBack: () => void
  onSubmit: (data: DriverApplicationData) => Promise<void>
  isSubmitting: boolean
}

export function PDFPreviewStep({ formData, onBack, onSubmit, isSubmitting }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState<number>(25)

  const generatePDF = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const bytes = await generateApplicationPDF(formData)
      setPdfBytes(bytes)
      
      // Create a blob URL for preview
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err: any) {
      console.error('Error generating PDF:', err)
      setError(err.message || 'Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [formData])

  useEffect(() => {
    generatePDF()
    
    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, []) // Only run once on mount

  const handleDownload = () => {
    if (pdfBytes) {
      const filename = `Thind_Transport_Application_${formData.personalInfo?.lastName || 'Driver'}_${new Date().toISOString().split('T')[0]}.pdf`
      downloadPDF(pdfBytes, filename)
    }
  }

  const handleSubmit = () => {
    onSubmit(formData)
  }

  return (
    <Card className="bg-white shadow-lg border border-gray-200">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
          <FileText className="h-6 w-6 text-orange" />
          Official DOT Application - PDF Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Your official DOT application is ready!</strong> This is the complete 25-page Thind Transport Application 
            with your information filled in. This is the exact document that will be submitted for DOT compliance. 
            You can scroll through all pages and download a copy for your records.
          </p>
        </div>

        {/* PDF Generation Status */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
            <Loader2 className="h-10 w-10 animate-spin text-orange mb-4" />
            <span className="text-gray-700 font-medium">Filling your DOT application form...</span>
            <span className="text-gray-500 text-sm mt-2">Loading 25-page template and placing your data...</span>
            </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
                <p className="text-red-800 font-medium">PDF Generation Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <Button 
                  onClick={generatePDF} 
                  variant="outline" 
                  className="mt-3 border-red-300 text-red-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Generation
                </Button>
              </div>
            </div>
                </div>
        )}

        {/* PDF Preview - Full Height for Scrolling */}
        {pdfUrl && !isGenerating && (
          <>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
              <div className="bg-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-gray-600" />
            <div>
                    <span className="text-sm font-medium text-gray-700">Official DOT Application</span>
                    <span className="text-xs text-gray-500 ml-2">(25 Pages - Scroll to view all)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={generatePDF}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="border-orange text-orange hover:bg-orange hover:text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
              {/* Large preview area with native PDF scrolling */}
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full bg-white"
                style={{ height: '800px' }}
                title="Official DOT Application PDF Preview"
              />
            </div>

            {/* PDF Contents Summary - 25 Pages */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Complete 25-Page DOT Application Contents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">1</span>
                  DQ File Checklist (Internal)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">2</span>
                  Applicant Information
                  </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">3-4</span>
                  Employment History
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">5</span>
                  Accident & Violations
            </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">6</span>
                  CDL License Info
                  </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">7</span>
                  Driving Experience
                  </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">8</span>
                  States & Training
              </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">9-21</span>
                  PSP Authorization
                  </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">22-25</span>
                  Road Test (Internal)
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Orange badges = pages with your filled data | Gray badges = internal use sections (blank)
              </p>
            </div>
          </>
        )}

        {/* Applicant Summary */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Application Ready for Submission
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-800">
            <p><strong>Applicant:</strong> {formData.personalInfo?.firstName} {formData.personalInfo?.lastName}</p>
            <p><strong>CDL:</strong> {formData.drivingRecord?.cdlLicenses?.[0]?.licenseNumber} ({formData.drivingRecord?.cdlLicenses?.[0]?.state})</p>
            <p><strong>Signed:</strong> {formData.pspAuthorization?.fullName}</p>
            <p><strong>Date:</strong> {formData.pspAuthorization?.signatureDate}</p>
          </div>
        </div>

        {/* Important Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
            <strong>Important:</strong> Once you click "Submit Final Application", this complete 25-page DOT application 
            will be securely transmitted to Thind Transport LLC at thindcarrier@gmail.com. You will receive a confirmation 
            email and our compliance team will review your application within 1-2 weeks. We may contact you for additional 
            information or to schedule an interview.
            </p>
          </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 pt-4">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting} className="flex-1 min-w-[140px] py-3">
            <ChevronLeft className="mr-2 h-5 w-5" />
              Back to Edit
            </Button>
          <Button 
            onClick={handleDownload} 
            disabled={!pdfBytes || isSubmitting} 
            variant="outline"
            className="py-3 border-orange text-orange hover:bg-orange hover:text-white min-w-[160px]"
          >
            <Download className="mr-2 h-5 w-5" />
            Download Copy
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isGenerating || !pdfBytes} 
            className="flex-1 min-w-[200px] bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
          >
              {isSubmitting ? (
                <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                <Send className="mr-2 h-5 w-5" />
                  Submit Final Application
                </>
              )}
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
