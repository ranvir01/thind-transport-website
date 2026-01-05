"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Send, Loader2, FileText, Eye, Download } from "lucide-react"
import type { DriverApplicationData } from "@/types/driver-application"

interface Props {
  formData: DriverApplicationData
  onBack: () => void
  onSubmit: (data: DriverApplicationData) => Promise<void>
  isSubmitting: boolean
}

export function PDFPreviewStep({ formData, onBack, onSubmit, isSubmitting }: Props) {
  const [showFullPreview, setShowFullPreview] = useState(false)

  const handleSubmit = () => {
    onSubmit(formData)
  }

  return (
    <Card className="bg-white shadow-lg border border-gray-200">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
          <FileText className="h-6 w-6 text-orange" />
          PDF Preview & Final Submission
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Review your application:</strong> Below is a preview of how your DOT application will appear in the PDF document. Please review all information carefully before submitting.
          </p>
        </div>

        {/* PDF Preview Container */}
        <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-inner max-h-[600px] overflow-y-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-800 pb-4">
              <h1 className="text-2xl font-bold">THIND TRANSPORT LLC</h1>
              <p className="text-sm text-gray-600">DRIVER APPLICATION FOR EMPLOYMENT</p>
              <p className="text-xs text-gray-500 mt-2">
                An Equal Opportunity Employer • In compliance with DOT regulations
              </p>
            </div>

            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">PERSONAL INFORMATION</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="font-semibold">Name:</span> {formData.personalInfo?.firstName} {formData.personalInfo?.lastName}</div>
                <div><span className="font-semibold">Date of Birth:</span> {formData.personalInfo?.dateOfBirth}</div>
                <div><span className="font-semibold">Age:</span> {formData.personalInfo?.age}</div>
                <div><span className="font-semibold">SSN:</span> {formData.personalInfo?.socialSecurityNumber}</div>
                <div><span className="font-semibold">Phone:</span> {formData.personalInfo?.phone}</div>
                <div><span className="font-semibold">Emergency Phone:</span> {formData.personalInfo?.emergencyPhone}</div>
                <div className="col-span-2"><span className="font-semibold">Physical Exam Expires:</span> {formData.personalInfo?.physicalExamExpiration}</div>
                <div className="col-span-2"><span className="font-semibold">Current Address:</span> {formData.personalInfo?.currentAddress?.street}, {formData.personalInfo?.currentAddress?.city}, {formData.personalInfo?.currentAddress?.state} {formData.personalInfo?.currentAddress?.zip}</div>
                <div><span className="font-semibold">Education Level:</span> {formData.personalInfo?.educationLevel}</div>
              </div>
            </div>

            {/* CDL Information */}
            <div>
              <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">CDL INFORMATION</h2>
              {formData.drivingRecord?.cdlLicenses?.map((license, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                  <div><span className="font-semibold">License #:</span> {license.licenseNumber}</div>
                  <div><span className="font-semibold">State:</span> {license.state}</div>
                  <div><span className="font-semibold">Type:</span> {license.type}</div>
                  <div><span className="font-semibold">Expires:</span> {license.expirationDate}</div>
                  {license.endorsements && <div className="col-span-2"><span className="font-semibold">Endorsements:</span> {license.endorsements}</div>}
                </div>
              ))}
            </div>

            {/* Employment History */}
            <div>
              <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">EMPLOYMENT HISTORY (Past 3 Years)</h2>
              {formData.employmentHistory?.entries?.map((entry, idx) => (
                <div key={idx} className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div className="col-span-2 font-semibold text-base">{entry.employerName}</div>
                    <div><span className="font-semibold">From:</span> {entry.fromDate}</div>
                    <div><span className="font-semibold">To:</span> {entry.toDate}</div>
                    <div><span className="font-semibold">Position:</span> {entry.position}</div>
                    <div><span className="font-semibold">Phone:</span> {entry.phone}</div>
                    <div className="col-span-2"><span className="font-semibold">Address:</span> {entry.address}</div>
                    {entry.reasonForLeaving && <div className="col-span-2"><span className="font-semibold">Reason for Leaving:</span> {entry.reasonForLeaving}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Driving Experience */}
            <div>
              <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">DRIVING EXPERIENCE</h2>
              {formData.experienceQualifications?.drivingExperience?.map((exp, idx) => (
                <div key={idx} className="mb-2 text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <div><span className="font-semibold">Equipment:</span> {exp.typeOfEquipment}</div>
                    <div><span className="font-semibold">From:</span> {exp.dateFrom}</div>
                    <div><span className="font-semibold">To:</span> {exp.dateTo}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Accidents & Violations */}
            {(formData.drivingRecord?.accidents?.length > 0 || formData.drivingRecord?.violations?.length > 0) && (
              <div>
                <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">SAFETY RECORD</h2>
                {formData.drivingRecord?.accidents?.length > 0 && (
                  <div className="mb-3">
                    <p className="font-semibold text-sm mb-1">Accidents:</p>
                    {formData.drivingRecord.accidents.map((accident, idx) => (
                      <div key={idx} className="text-sm pl-4">• {accident.date} - {accident.details}</div>
                    ))}
                  </div>
                )}
                {formData.drivingRecord?.violations?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm mb-1">Violations:</p>
                    {formData.drivingRecord.violations.map((violation, idx) => (
                      <div key={idx} className="text-sm pl-4">• {violation.date} - {violation.charge}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PSP Authorization */}
            <div>
              <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">PSP AUTHORIZATION & CERTIFICATION</h2>
              <div className="text-sm space-y-2">
                <p>✓ I acknowledge receipt of PSP disclosure</p>
                <p>✓ I authorize background check and PSP report</p>
                <p>✓ I understand crash and inspection data display</p>
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="font-semibold">Signature:</span> {formData.pspAuthorization?.fullName}</div>
                    <div><span className="font-semibold">Date:</span> {formData.pspAuthorization?.signatureDate}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Certification Statement */}
            <div className="p-4 bg-gray-100 border-2 border-gray-400 rounded">
              <p className="text-xs italic">
                I certify that all information provided in this application is true and complete to the best of my knowledge. 
                I understand that any false statements or omissions may disqualify me from employment or result in termination. 
                I authorize investigation of all statements contained in this application and release from liability all persons 
                and organizations providing such information.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>Important:</strong> Once you click "Submit Final Application", this PDF will be generated and emailed to 
              thindcarrier@gmail.com. You will receive a confirmation and our team will review your application within 1-2 weeks.
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
                  Submit Final Application
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

