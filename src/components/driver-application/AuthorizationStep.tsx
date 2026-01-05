"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, FileCheck, AlertCircle, CheckCircle2, Info, Scale } from "lucide-react"
import { toast } from "sonner"

interface PSPAuthorizationData {
  acknowledgeDisclosure: boolean
  authorizeBackgroundCheck: boolean
  understandDataQs: boolean
  understandCrashDisplay: boolean
  understandInspectionDisplay: boolean
  acknowledgeADANotice: boolean
  certifyInformationTrue: boolean
  authorizeInvestigation: boolean
  signatureDate: string
  fullName: string
}

interface Props {
  onNext: (data: { pspAuthorization: PSPAuthorizationData }) => void
  onBack: () => void
  initialData?: PSPAuthorizationData
}

export function AuthorizationStep({ onNext, onBack, initialData }: Props) {
  const [formData, setFormData] = useState<PSPAuthorizationData>(initialData || {
    acknowledgeDisclosure: false,
    authorizeBackgroundCheck: false,
    understandDataQs: false,
    understandCrashDisplay: false,
    understandInspectionDisplay: false,
    acknowledgeADANotice: false,
    certifyInformationTrue: false,
    authorizeInvestigation: false,
    signatureDate: new Date().toLocaleDateString('en-US'),
    fullName: "",
  })

  const allChecked = formData.acknowledgeDisclosure &&
    formData.authorizeBackgroundCheck &&
    formData.understandDataQs &&
    formData.understandCrashDisplay &&
    formData.understandInspectionDisplay &&
    formData.acknowledgeADANotice &&
    formData.certifyInformationTrue &&
    formData.authorizeInvestigation &&
    formData.fullName.trim().length > 0

  const checkedCount = [
    formData.acknowledgeDisclosure,
    formData.authorizeBackgroundCheck,
    formData.understandDataQs,
    formData.understandCrashDisplay,
    formData.understandInspectionDisplay,
    formData.acknowledgeADANotice,
    formData.certifyInformationTrue,
    formData.authorizeInvestigation,
  ].filter(Boolean).length

  const handleSubmit = () => {
    if (!allChecked) {
      toast.error("Please review and agree to all statements, and type your full legal name to sign")
      return
    }
    onNext({ pspAuthorization: formData })
  }

  return (
    <Card className="bg-white shadow-lg border border-gray-200">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
          <FileCheck className="h-6 w-6 text-orange" />
          Authorization & Certifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* PSP Disclosure Section */}
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div className="text-sm text-amber-900">
                <strong className="block mb-2 text-base">IMPORTANT PRE-EMPLOYMENT SCREENING PROGRAM (PSP) DISCLOSURE</strong>
                <p className="mb-3">
                  In accordance with 49 CFR 391.23(d) and FMCSA's Pre-Employment Screening Program (PSP), we are required to inform you:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The prospective employer may access the PSP online service to check your DOT safety performance history.</li>
                  <li>The PSP report will contain your crash and roadside inspection history for the past 5 and 3 years, respectively.</li>
                  <li>You have the right to review your PSP report. Visit <strong>www.psp.fmcsa.dot.gov</strong> to request a copy.</li>
                  <li>If you believe the information is inaccurate, you may submit a DataQs request at <strong>dataqs.fmcsa.dot.gov</strong>.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">PSP Acknowledgements</h3>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${checkedCount >= 5 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {Math.min(checkedCount, 5)}/5 completed
              </span>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.acknowledgeDisclosure}
                  onChange={(e) => setFormData({ ...formData, acknowledgeDisclosure: e.target.checked })}
                  className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
                />
                <span className="text-gray-800">
                  I acknowledge receipt of the <strong>FMCSA PSP Disclosure</strong>. I understand this prospective employer
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
                  I authorize <strong>Thind Transport LLC</strong> and its agents to access the FMCSA PSP system to obtain
                  information about my safety performance history and to conduct a background check in connection with my application.
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
                  I understand that I have the right to review my PSP report and if I believe it contains inaccurate information,
                  I may submit a request for data correction through the DataQs system at <strong>dataqs.fmcsa.dot.gov</strong>.
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
                  I understand the PSP report will display <strong>crash data for the past 5 years</strong> from the date the report is generated.
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
                  I understand the PSP report will display <strong>inspection data for the past 3 years</strong> from the date the report is generated.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* ADA Notice Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <Scale className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <strong className="block mb-2 text-base">NOTICE TO APPLICANT – AMERICANS WITH DISABILITIES ACT</strong>
                <p className="mb-3">
                  Thind Transport LLC is committed to compliance with the Americans with Disabilities Act (ADA) and 
                  applicable state fair employment laws. We do not discriminate against qualified individuals with disabilities 
                  in job application procedures, hiring, advancement, discharge, compensation, training, or other terms, 
                  conditions, and privileges of employment.
                </p>
                <p className="mb-3">
                  A qualified individual is a person who meets legitimate skill, experience, education, or other requirements 
                  of an employment position and who can perform the essential functions of the position with or without 
                  reasonable accommodation.
                </p>
                <p>
                  If you require an accommodation to complete this application or participate in the interview process, 
                  please contact us at <strong>(206) 765-6300</strong>.
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-4 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
            <input
              type="checkbox"
              checked={formData.acknowledgeADANotice}
              onChange={(e) => setFormData({ ...formData, acknowledgeADANotice: e.target.checked })}
              className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
            />
            <span className="text-gray-800">
              I acknowledge that I have read and understand the <strong>ADA Notice to Applicant</strong> above.
            </span>
          </label>
        </div>

        {/* Certification Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-orange" />
            <h3 className="font-bold text-lg text-gray-900">Applicant Certification</h3>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-800 mb-4">
              By checking the boxes below, I certify the following statements are true and accurate:
            </p>
            
            <div className="space-y-3">
              <label className="flex items-start gap-4 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200">
                <input
                  type="checkbox"
                  checked={formData.certifyInformationTrue}
                  onChange={(e) => setFormData({ ...formData, certifyInformationTrue: e.target.checked })}
                  className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
                />
                <span className="text-gray-800">
                  I certify that all information provided in this application is <strong>true, complete, and correct</strong> to the best of my knowledge. 
                  I understand that any false or misleading statements or omissions may result in denial of employment or immediate termination 
                  if discovered after employment begins, regardless of when or how discovered.
                </span>
              </label>

              <label className="flex items-start gap-4 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200">
                <input
                  type="checkbox"
                  checked={formData.authorizeInvestigation}
                  onChange={(e) => setFormData({ ...formData, authorizeInvestigation: e.target.checked })}
                  className="mt-1 w-5 h-5 text-orange focus:ring-orange border-gray-300 rounded"
                />
                <span className="text-gray-800">
                  I authorize <strong>Thind Transport LLC</strong> to make any investigation of my employment history, 
                  educational background, criminal history, motor vehicle records, and other records as necessary to verify 
                  the information in this application. I release all parties from any liability arising from providing such information.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Digital Signature Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            {formData.fullName && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            Electronic Signature
          </h3>
          
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-sm text-gray-700">
              By typing your full legal name below, you are providing a <strong>legally binding electronic signature</strong> pursuant 
              to the Electronic Signatures in Global and National Commerce Act (E-SIGN Act) and the Uniform Electronic Transactions Act (UETA).
              This signature has the same legal effect as a handwritten signature.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-800 font-semibold">Full Legal Name (Type to Sign) <span className="text-red-500">*</span></Label>
              <Input
                placeholder="John Michael Smith"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="mt-1 bg-white border-gray-300 focus:border-orange focus:ring-orange text-gray-900 font-semibold text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Type your full legal name exactly as it appears on your driver's license</p>
            </div>
            <div>
              <Label className="text-gray-800 font-semibold">Date <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                value={formData.signatureDate}
                onChange={(e) => setFormData({ ...formData, signatureDate: e.target.value })}
                className="mt-1 bg-gray-100 border-gray-300 text-gray-900"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Today's date (auto-filled)</p>
            </div>
          </div>

          {formData.fullName && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Signature Preview:</span>
              </div>
              <p className="mt-2 text-2xl font-script italic text-gray-800" style={{ fontFamily: 'cursive' }}>
                {formData.fullName}
              </p>
              <p className="text-sm text-gray-600 mt-1">Signed on: {formData.signatureDate}</p>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="p-4 border-2 border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800">Completion Status</span>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${allChecked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {allChecked ? 'Ready to Continue' : `${checkedCount}/8 items + signature`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${allChecked ? 'bg-green-500' : 'bg-orange'}`} 
              style={{ width: `${(checkedCount + (formData.fullName ? 1 : 0)) / 9 * 100}%` }}
            ></div>
          </div>
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

