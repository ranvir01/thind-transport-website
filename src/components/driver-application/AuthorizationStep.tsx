"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, FileCheck, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  onNext: (data: { pspAuthorization: any }) => void
  onBack: () => void
  initialData?: any
}

export function AuthorizationStep({ onNext, onBack, initialData }: Props) {
  const [formData, setFormData] = useState(initialData || {
    acknowledgeDisclosure: false,
    authorizeBackgroundCheck: false,
    understandDataQs: false,
    understandCrashDisplay: false,
    understandInspectionDisplay: false,
    signatureDate: new Date().toISOString().split('T')[0],
    fullName: "",
  })

  const allChecked = formData.acknowledgeDisclosure &&
    formData.authorizeBackgroundCheck &&
    formData.understandDataQs &&
    formData.understandCrashDisplay &&
    formData.understandInspectionDisplay &&
    formData.fullName

  const checkedCount = [
    formData.acknowledgeDisclosure,
    formData.authorizeBackgroundCheck,
    formData.understandDataQs,
    formData.understandCrashDisplay,
    formData.understandInspectionDisplay,
  ].filter(Boolean).length

  const handleSubmit = () => {
    if (!allChecked) {
      toast.error("Please review and agree to all statements, and type your full legal name to sign")
      return
    }
    onNext({ pspAuthorization: formData })
  }

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-navy to-navy/90 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileCheck className="h-6 w-6 text-orange" />
          PSP Authorization & Disclosure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
            <div className="text-sm text-amber-900">
              <strong className="block mb-2 text-base">Pre-Employment Screening Program (PSP) Disclosure</strong>
              <p>
                DOT requires carriers to conduct pre-employment screening. By authorizing this, you consent to FMCSA
                releasing your safety performance data to Thind Transport LLC.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-2 border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-900">Required Acknowledgements</h3>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${checkedCount === 5 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {checkedCount}/5 completed
            </span>
          </div>
          
          <label className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.acknowledgeDisclosure}
              onChange={(e) => setFormData({ ...formData, acknowledgeDisclosure: e.target.checked })}
              className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
            />
            <span className="text-gray-800">
              I acknowledge receipt of the <strong>FMCSA PSP Disclosure</strong> document. I understand this prospective employer
              may obtain my safety performance data from FMCSA's Pre-Employment Screening Program (PSP).
            </span>
          </label>

          <label className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.authorizeBackgroundCheck}
              onChange={(e) => setFormData({ ...formData, authorizeBackgroundCheck: e.target.checked })}
              className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
            />
            <span className="text-gray-800">
              I authorize <strong>Thind Transport LLC</strong> and/or its third-party representatives to obtain
              information about my safety performance from the PSP database and conduct a background check.
            </span>
          </label>

          <label className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.understandDataQs}
              onChange={(e) => setFormData({ ...formData, understandDataQs: e.target.checked })}
              className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
            />
            <span className="text-gray-800">
              I understand I may request a copy of the report and, if I believe it contains errors, I can submit
              a request to correct the data with FMCSA.
            </span>
          </label>

          <label className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.understandCrashDisplay}
              onChange={(e) => setFormData({ ...formData, understandCrashDisplay: e.target.checked })}
              className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
            />
            <span className="text-gray-800">
              I understand the PSP report will display <strong>crash data for the past 5 years</strong> and <strong>inspection data for the past 3 years</strong>.
            </span>
          </label>

          <label className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.understandInspectionDisplay}
              onChange={(e) => setFormData({ ...formData, understandInspectionDisplay: e.target.checked })}
              className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
            />
            <span className="text-gray-800">
              I understand that information from the PSP report will be used solely for safety-sensitive employment decisions.
            </span>
          </label>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            {formData.fullName && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            Digital Signature
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">Full Legal Name (Type to Sign) <span className="text-red-500">*</span></Label>
              <Input
                placeholder="John Michael Smith"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900 font-medium"
              />
              <p className="text-xs text-gray-500 mt-1">Type your full legal name as it appears on your license</p>
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.signatureDate}
                onChange={(e) => setFormData({ ...formData, signatureDate: e.target.value })}
                className="mt-1 bg-gray-50 border-gray-300 focus:border-orange focus:ring-orange text-gray-900"
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              By typing your name above, you are providing a <strong>legal electronic signature</strong> under the Electronic Signatures in Global and National Commerce Act (ESIGN Act).
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Privacy Notice:</strong> Your information is protected under DOT regulations. It will only be used
            for employment verification and compliance purposes as required by federal law (49 CFR Part 391).
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1 py-3">
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!allChecked} 
            className={`flex-1 py-3 font-semibold ${allChecked ? 'bg-orange hover:bg-orange/90' : 'bg-gray-300 cursor-not-allowed'} text-white`}
          >
            Continue to Review
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
