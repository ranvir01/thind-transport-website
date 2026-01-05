"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Eye, User, Briefcase, Shield, Award, FileCheck, MapPin, Truck, AlertTriangle, FileWarning } from "lucide-react"
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

  const getPositionLabel = (position?: string) => {
    switch (position) {
      case 'contract_driver': return 'Contract Driver'
      case 'contractors_driver': return "Contractor's Driver"
      case 'both': return 'Contract Driver & Contractor\'s Driver'
      default: return 'Not specified'
    }
  }

  const getEducationLabel = (education?: any) => {
    if (!education) return 'Not specified'
    const parts = []
    if (education.gradeSchool) parts.push(`Grade ${education.gradeSchool}`)
    if (education.college > 0) parts.push(`College: ${education.college} year${education.college > 1 ? 's' : ''}`)
    if (education.postGraduate > 0) parts.push(`Post-Graduate: ${education.postGraduate} year${education.postGraduate > 1 ? 's' : ''}`)
    return parts.join(', ') || 'Not specified'
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
            <strong>Almost there!</strong> Please review all your information below before proceeding to the final PDF preview and submission.
          </p>
        </div>

        {/* Personal Information */}
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
            <User className="h-5 w-5 text-orange" />
            <h3 className="font-bold text-gray-900">Personal Information</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-800">Position Applying For:</span>
                <span className="ml-2 text-gray-700">{getPositionLabel(formData.positionApplyingFor)}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Full Name:</span>
                <span className="ml-2 text-gray-700">{formData.personalInfo?.firstName} {formData.personalInfo?.lastName}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Date of Birth:</span>
                <span className="ml-2 text-gray-700">{formData.personalInfo?.dateOfBirth} (Age: {formData.personalInfo?.age})</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">SSN:</span>
                <span className="ml-2 text-gray-700">•••-••-{formData.personalInfo?.socialSecurityNumber?.slice(-4)}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Phone:</span>
                <span className="ml-2 text-gray-700">{formData.personalInfo?.phone}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Emergency Phone:</span>
                <span className="ml-2 text-gray-700">{formData.personalInfo?.emergencyPhone}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Physical Exam Expires:</span>
                <span className="ml-2 text-gray-700">{formData.personalInfo?.physicalExamExpiration}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Education:</span>
                <span className="ml-2 text-gray-700">{getEducationLabel((formData.personalInfo as any)?.education)}</span>
              </div>
            </div>

            {/* Current Address */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-gray-600" />
                <span className="font-semibold text-gray-800">Current Address:</span>
              </div>
              <p className="text-sm text-gray-700 ml-6">
                {formData.personalInfo?.currentAddress?.street}, {formData.personalInfo?.currentAddress?.city}, {formData.personalInfo?.currentAddress?.state} {formData.personalInfo?.currentAddress?.zip}
                <br />
                <span className="text-gray-500">({formData.personalInfo?.currentAddress?.from} to {formData.personalInfo?.currentAddress?.to})</span>
              </p>
            </div>

            {/* Previous Addresses */}
            {formData.personalInfo?.previousAddresses && formData.personalInfo.previousAddresses.length > 0 && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <span className="font-semibold text-gray-800">Previous Addresses:</span>
                {formData.personalInfo.previousAddresses.map((addr, idx) => (
                  <p key={idx} className="text-sm text-gray-700 ml-6 mt-1">
                    {addr.street}, {addr.city}, {addr.state} {addr.zip}
                    <span className="text-gray-500"> ({addr.from} to {addr.to})</span>
                  </p>
                ))}
              </div>
            )}

            {/* Worked for company before */}
            {formData.personalInfo?.workedForCompanyBefore === 'true' && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-800">Previously Employed Here:</span> Yes
                  {formData.personalInfo?.previousWorkDates && (
                    <span className="ml-2">({formData.personalInfo.previousWorkDates.from} to {formData.personalInfo.previousWorkDates.to})</span>
                  )}
                  {formData.personalInfo?.reasonForLeaving && (
                    <span className="ml-2">- Reason: {formData.personalInfo.reasonForLeaving}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Employment History */}
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-orange" />
            <h3 className="font-bold text-gray-900">Employment History ({formData.employmentHistory?.entries?.length || 0} entries)</h3>
          </div>
          <div className="p-4 space-y-3">
            {formData.employmentHistory?.entries?.map((entry, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${entry.isUnemployment ? 'bg-yellow-50' : entry.isSelfEmployment ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-gray-800">
                      {entry.isUnemployment ? '📌 Unemployment Period' : entry.isSelfEmployment ? '💼 Self-Employment' : entry.employerName}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">({entry.fromDate} - {entry.toDate})</span>
                  </div>
                </div>
                {!entry.isUnemployment && (
                  <p className="text-sm text-gray-700 mt-1">
                    {entry.position} • {entry.address}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {entry.reasonForLeaving && `Reason for leaving: ${entry.reasonForLeaving}`}
                </p>
                {!entry.isUnemployment && (
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    {entry.subjectToFMCSR && <span>✓ Subject to FMCSRs</span>}
                    {entry.safetyFunctioning && <span>✓ Safety-sensitive position</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Driving Record */}
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange" />
            <h3 className="font-bold text-gray-900">Driving Record</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* CDL Licenses */}
            <div>
              <span className="font-semibold text-gray-800">CDL License(s):</span>
              {formData.drivingRecord?.cdlLicenses?.map((license, idx) => (
                <div key={idx} className="text-sm text-gray-700 ml-4 mt-1">
                  #{license.licenseNumber} ({license.state}) • {license.type}
                  {license.endorsements && ` • Endorsements: ${license.endorsements}`}
                  • Expires: {license.expirationDate}
                </div>
              ))}
            </div>

            {/* License History */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-800">License Denied:</span>
                <span className={`ml-2 ${formData.drivingRecord?.deniedLicense ? 'text-red-600' : 'text-green-600'}`}>
                  {formData.drivingRecord?.deniedLicense ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">License Suspended:</span>
                <span className={`ml-2 ${formData.drivingRecord?.suspendedLicense ? 'text-red-600' : 'text-green-600'}`}>
                  {formData.drivingRecord?.suspendedLicense ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Felony Conviction:</span>
                <span className={`ml-2 ${formData.drivingRecord?.felonyConviction ? 'text-red-600' : 'text-green-600'}`}>
                  {formData.drivingRecord?.felonyConviction ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Accidents */}
            {formData.drivingRecord?.accidents && formData.drivingRecord.accidents.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-semibold text-gray-800">Accidents ({formData.drivingRecord.accidents.length}):</span>
                </div>
                {formData.drivingRecord.accidents.map((acc, idx) => (
                  <p key={idx} className="text-sm text-gray-700 ml-6">
                    {acc.date} - {acc.location}: {acc.details}
                    {(acc.fatalities !== '0' || acc.injuries !== '0') && (
                      <span className="text-red-600"> (Fatalities: {acc.fatalities}, Injuries: {acc.injuries})</span>
                    )}
                  </p>
                ))}
              </div>
            )}

            {/* Violations */}
            {formData.drivingRecord?.violations && formData.drivingRecord.violations.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileWarning className="h-4 w-4 text-red-600" />
                  <span className="font-semibold text-gray-800">Traffic Violations ({formData.drivingRecord.violations.length}):</span>
                </div>
                {formData.drivingRecord.violations.map((viol, idx) => (
                  <p key={idx} className="text-sm text-gray-700 ml-6">
                    {viol.date} - {viol.location}: {viol.charge}
                    {viol.penalty && <span className="text-gray-500"> (Penalty: {viol.penalty})</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Experience & Qualifications */}
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
            <Award className="h-5 w-5 text-orange" />
            <h3 className="font-bold text-gray-900">Experience & Qualifications</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Driving Experience */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-gray-600" />
                <span className="font-semibold text-gray-800">Driving Experience:</span>
              </div>
              {formData.experienceQualifications?.drivingExperience?.map((exp, idx) => (
                <p key={idx} className="text-sm text-gray-700 ml-6">
                  {exp.classOfEquipment} ({exp.typeOfEquipment || 'Various'}) • {exp.dateFrom} to {exp.dateTo}
                  {exp.approximateMiles && ` • ${exp.approximateMiles} miles`}
                </p>
              ))}
            </div>

            {/* States Operated */}
            {formData.experienceQualifications?.statesOperated && formData.experienceQualifications.statesOperated.length > 0 && (
              <div>
                <span className="font-semibold text-gray-800">States Operated In:</span>
                <span className="ml-2 text-sm text-gray-700">
                  {formData.experienceQualifications.statesOperated.sort().join(', ')}
                </span>
              </div>
            )}

            {/* Training & Awards */}
            {formData.experienceQualifications?.specialCourses && (
              <div>
                <span className="font-semibold text-gray-800">Special Training:</span>
                <p className="text-sm text-gray-700 ml-4">{formData.experienceQualifications.specialCourses}</p>
              </div>
            )}
            {formData.experienceQualifications?.safetyAwards && (
              <div>
                <span className="font-semibold text-gray-800">Safety Awards:</span>
                <p className="text-sm text-gray-700 ml-4">{formData.experienceQualifications.safetyAwards}</p>
              </div>
            )}
          </div>
        </div>

        {/* Authorizations */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold mb-3 text-green-900 flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            <CheckCircle2 className="h-5 w-5" />
            Authorizations Complete
          </h3>
          <ul className="text-sm space-y-2 text-green-800">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              PSP Authorization signed by: <strong>{formData.pspAuthorization?.fullName}</strong>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Signed on: {formData.pspAuthorization?.signatureDate}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              All PSP disclosures acknowledged
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              ADA notice acknowledged
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Information certified as true and complete
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
            <strong>Final Certification:</strong> By clicking "Continue to PDF Preview", you confirm that all information 
            provided is true and complete to the best of your knowledge. Any false statements or omissions may disqualify 
            you from employment or result in termination if discovered after employment begins.
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
