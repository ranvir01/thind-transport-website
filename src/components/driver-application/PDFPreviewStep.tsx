"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Send, Loader2, FileText, Download, Eye, CheckCircle2, RefreshCw } from "lucide-react"
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
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Failed to generate PDF. Please try again.')
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
          DOT Application PDF Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Your DOT application is ready!</strong> Review the PDF preview below. This is the official document that will be submitted to Thind Transport LLC. You can download a copy for your records before submitting.
          </p>
        </div>

        {/* PDF Generation Status */}
        {isGenerating && (
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-orange mr-3" />
            <span className="text-gray-700">Generating your DOT application PDF...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <Button 
              onClick={generatePDF} 
              variant="outline" 
              className="mt-3 border-red-300 text-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Generation
            </Button>
          </div>
        )}

        {/* PDF Preview */}
        {pdfUrl && !isGenerating && (
          <>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
              <div className="bg-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">PDF Preview (7 Pages)</span>
                </div>
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
              <iframe
                src={pdfUrl}
                className="w-full h-[600px] bg-white"
                title="DOT Application PDF Preview"
              />
            </div>

            {/* PDF Contents Summary */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                PDF Contents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">1</span>
                  DQ File Checklist (Internal Use)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">2</span>
                  Applicant Personal Information
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">3</span>
                  Employment History
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">4</span>
                  CDL & Driving Record
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">5</span>
                  Experience & Qualifications
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange text-white flex items-center justify-center text-xs font-bold">6</span>
                  PSP Authorization & Signature
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">7</span>
                  Road Test Certificate (Internal)
                </div>
              </div>
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
            <strong>Important:</strong> Once you click "Submit Final Application", this PDF will be securely transmitted to 
            Thind Transport LLC at thindcarrier@gmail.com. You will receive a confirmation email and our team will review 
            your application within 1-2 weeks. We may contact you for additional information or to schedule an interview.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting} className="flex-1 py-3">
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back to Edit
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={!pdfBytes || isSubmitting} 
            variant="outline"
            className="py-3 border-orange text-orange hover:bg-orange hover:text-white"
          >
            <Download className="mr-2 h-5 w-5" />
            Download Copy
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isGenerating || !pdfBytes} 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
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
