"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Eye } from "lucide-react"
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
    <Card className="bg-white shadow-lg border border-gray-200">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
          <Eye className="h-6 w-6 text-orange" />
          Review Your Application
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Almost there!</strong> Please review your information below before proceeding to the final PDF preview and submission.
          </p>
        </div>

        {/* Personal Info Summary */}
        <div className="border-l-4 border-orange pl-4 py-2 bg-gray-50 rounded-r-lg">
          <h3 className="font-bold text-gray-900 mb-3">Personal Information</h3>
          <div className="text-sm space-y-2 text-gray-700">
            <p><span className="font-semibold text-gray-800">Name:</span> {formData.personalInfo?.firstName} {formData.personalInfo?.lastName}</p>
            <p><span className="font-semibold text-gray-800">Date of Birth:</span> {formData.personalInfo?.dateOfBirth}</p>
            <p><span className="font-semibold text-gray-800">Phone:</span> {formData.personalInfo?.phone}</p>
            <p><span className="font-semibold text-gray-800">SSN:</span> •••-••-{formData.personalInfo?.socialSecurityNumber?.slice(-4)}</p>
          </div>
        </div>

        {/* CDL Info Summary */}
        <div className="border-l-4 border-orange pl-4 py-2 bg-gray-50 rounded-r-lg">
          <h3 className="font-bold text-gray-900 mb-3">CDL Information</h3>
          <div className="text-sm space-y-2 text-gray-700">
            <p><span className="font-semibold text-gray-800">License #:</span> {formData.drivingRecord?.cdlLicenses?.[0]?.licenseNumber}</p>
            <p><span className="font-semibold text-gray-800">State:</span> {formData.drivingRecord?.cdlLicenses?.[0]?.state}</p>
            <p><span className="font-semibold text-gray-800">Type:</span> {formData.drivingRecord?.cdlLicenses?.[0]?.type}</p>
            <p><span className="font-semibold text-gray-800">Expires:</span> {formData.drivingRecord?.cdlLicenses?.[0]?.expirationDate}</p>
          </div>
        </div>

        {/* Employment History Summary */}
        <div className="border-l-4 border-orange pl-4 py-2 bg-gray-50 rounded-r-lg">
          <h3 className="font-bold text-gray-900 mb-3">Employment History</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><span className="font-semibold text-gray-800">Employers Listed:</span> {formData.employmentHistory?.entries?.length || 0}</p>
            {formData.employmentHistory?.entries?.[0] && (
              <p>
                <span className="font-semibold text-gray-800">Most Recent:</span> {formData.employmentHistory.entries[0].employerName}
              </p>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold mb-3 text-green-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Authorizations Complete
          </h3>
          <ul className="text-sm space-y-2 text-green-800">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              PSP Authorization Signed by: <strong>{formData.pspAuthorization?.fullName}</strong>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              All required disclosures acknowledged
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Background check authorized
            </li>
          </ul>
        </div>

        {/* Important Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900">
            <strong>Certification Statement:</strong> By proceeding, I certify that all information provided is true and complete to the best
            of my knowledge. I understand that any false statements or omissions may disqualify me from employment or
            result in termination.
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting} className="flex-1 py-3">
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back to Edit
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-orange hover:bg-orange/90 text-white font-semibold py-3">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to PDF Preview
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

