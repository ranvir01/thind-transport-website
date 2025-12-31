"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, FileCheck, AlertCircle } from "lucide-react"

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
    signatureDate: new Date().toLocaleDateString('en-US'),
    fullName: "",
  })

  const allChecked = formData.acknowledgeDisclosure &&
    formData.authorizeBackgroundCheck &&
    formData.understandDataQs &&
    formData.understandCrashDisplay &&
    formData.understandInspectionDisplay &&
    formData.fullName

  const handleSubmit = () => {
    if (!allChecked) {
      alert("Please review and agree to all statements, and sign the authorization.")
      return
    }
    onNext({ pspAuthorization: formData })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-orange" />
          PSP Authorization & Disclosure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm text-amber-900">
              <strong className="block mb-2">Pre-Employment Screening Program (PSP) Disclosure</strong>
              <p className="mb-2">
                DOT requires carriers to conduct pre-employment screening. By authorizing this, you consent to FMCSA
                releasing your safety performance data to Thind Transport.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="font-semibold">Required Acknowledgements</h3>
          
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.acknowledgeDisclosure}
              onChange={(e) => setFormData({ ...formData, acknowledgeDisclosure: e.target.checked })}
              className="mt-1"
            />
            <span className="text-sm">
              I acknowledge receipt of the <strong>FMCSA PSP Disclosure</strong> document. I understand this prospective employer
              may obtain my safety performance data from FMCSA's Pre-Employment Screening Program (PSP).
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.authorizeBackgroundCheck}
              onChange={(e) => setFormData({ ...formData, authorizeBackgroundCheck: e.target.checked })}
              className="mt-1"
            />
            <span className="text-sm">
              I authorize <strong>Thind Transport LLC</strong> and/or its third-party representatives to obtain
              information about my safety performance from the PSP database and conduct a background check.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.understandDataQs}
              onChange={(e) => setFormData({ ...formData, understandDataQs: e.target.checked })}
              className="mt-1"
            />
            <span className="text-sm">
              I understand I may request a copy of the report and, if I believe it contains errors, I can submit
              a request to correct the data with FMCSA.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.understandCrashDisplay}
              onChange={(e) => setFormData({ ...formData, understandCrashDisplay: e.target.checked })}
              className="mt-1"
            />
            <span className="text-sm">
              I understand the PSP report will display crash data for the past 5 years and inspection data for the past 3 years.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.understandInspectionDisplay}
              onChange={(e) => setFormData({ ...formData, understandInspectionDisplay: e.target.checked })}
              className="mt-1"
            />
            <span className="text-sm">
              I understand that information from the PSP report will be used solely for safety-sensitive employment decisions.
            </span>
          </label>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">Digital Signature</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Legal Name (Type to Sign) *</Label>
              <Input
                placeholder="John Smith"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.signatureDate}
                onChange={(e) => setFormData({ ...formData, signatureDate: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            By typing your name, you are providing a legal electronic signature under the ESIGN Act.
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>Privacy Notice:</strong> Your information is protected under DOT regulations. It will only be used
            for employment verification and compliance purposes as required by federal law (49 CFR Part 391).
          </p>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={!allChecked} className="flex-1">
            Continue to Review
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

