"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Send, Loader2, CheckCircle2 } from "lucide-react"
import type { DriverApplicationData } from "@/types/driver-application"

interface Props {
  formData: DriverApplicationData
  onBack: () => void
  onSubmit: (data: DriverApplicationData) => Promise<void>
  isSubmitting: boolean
}

export function ReviewStep({ formData, onBack, onSubmit, isSubmitting }: Props) {
  const handleSubmit = () => {
    onSubmit(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-orange" />
          Review & Submit Application
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-600">
          Please review your information before submitting. Once submitted, a PDF copy will be generated and sent to our compliance team.
        </p>

        {/* Personal Info Summary */}
        <div className="border-l-4 border-orange pl-4">
          <h3 className="font-semibold mb-2">Personal Information</h3>
          <div className="text-sm space-y-1 text-gray-700">
            <p><strong>Name:</strong> {formData.personalInfo?.firstName} {formData.personalInfo?.lastName}</p>
            <p><strong>DOB:</strong> {formData.personalInfo?.dateOfBirth}</p>
            <p><strong>Phone:</strong> {formData.personalInfo?.phone}</p>
            <p><strong>SSN:</strong> {formData.personalInfo?.socialSecurityNumber}</p>
          </div>
        </div>

        {/* CDL Info Summary */}
        <div className="border-l-4 border-orange pl-4">
          <h3 className="font-semibold mb-2">CDL Information</h3>
          <div className="text-sm space-y-1 text-gray-700">
            <p><strong>License:</strong> {formData.drivingRecord?.cdlLicenses?.[0]?.licenseNumber}</p>
            <p><strong>State:</strong> {formData.drivingRecord?.cdlLicenses?.[0]?.state}</p>
            <p><strong>Type:</strong> {formData.drivingRecord?.cdlLicenses?.[0]?.type}</p>
            <p><strong>Expires:</strong> {formData.drivingRecord?.cdlLicenses?.[0]?.expirationDate}</p>
          </div>
        </div>

        {/* Employment History Summary */}
        <div className="border-l-4 border-orange pl-4">
          <h3 className="font-semibold mb-2">Employment History</h3>
          <div className="text-sm text-gray-700">
            <p>{formData.employmentHistory?.entries?.length || 0} employer(s) listed</p>
            {formData.employmentHistory?.entries?.[0] && (
              <p className="mt-1">
                Most recent: {formData.employmentHistory.entries[0].employerName}
              </p>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold mb-2 text-green-900">Certifications</h3>
          <ul className="text-sm space-y-1 text-green-800">
            <li>✓ PSP Authorization Signed: {formData.pspAuthorization?.fullName}</li>
            <li>✓ All required disclosures acknowledged</li>
            <li>✓ Background check authorized</li>
          </ul>
        </div>

        {/* Important Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900">
            <strong>Before you submit:</strong> I certify that all information provided is true and complete to the best
            of my knowledge. I understand that any false statements or omissions may disqualify me from employment or
            result in termination.
          </p>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting} className="flex-1">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Edit
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Application...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Application
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500">
          Submitting will generate a PDF and email it to thindcarrier@gmail.com
        </p>
      </CardContent>
    </Card>
  )
}

