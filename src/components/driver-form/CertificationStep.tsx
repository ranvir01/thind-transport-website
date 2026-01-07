"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, CheckCircle2, Clock } from "lucide-react"
import type { Certification } from "@/types/driver-application-form"

interface CertificationStepProps {
  data: Certification
  onChange: (field: string, value: string | boolean) => void
  errors?: Record<string, string>
}

export function CertificationStep({ data, onChange, errors = {} }: CertificationStepProps) {
  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>
  const [signatureMetadata, setSignatureMetadata] = useState<{
    ipAddress?: string
    userAgent?: string
    timestamp?: string
  }>({})
  const [isCapturingMetadata, setIsCapturingMetadata] = useState(false)
  
  const inputClass = (field: string) => `
    w-full px-3 py-2 border rounded-lg transition-colors
    ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
  `

  // Capture signature metadata when signature is entered
  useEffect(() => {
    if (data.main_signature && data.main_signature.length > 3 && !signatureMetadata.ipAddress) {
      captureSignatureMetadata()
    }
  }, [data.main_signature])

  const captureSignatureMetadata = async () => {
    setIsCapturingMetadata(true)
    try {
      const response = await fetch('/api/get-client-info')
      const metadata = await response.json()
      setSignatureMetadata(metadata)
      // Store metadata in form data for PDF generation
      onChange('signature_ip', metadata.ipAddress)
      onChange('signature_timestamp', metadata.timestamp)
      onChange('signature_user_agent', metadata.userAgent)
    } catch (error) {
      console.error('Failed to capture signature metadata:', error)
    } finally {
      setIsCapturingMetadata(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Applicant Certification</h2>
        <p className="text-orange-100 text-sm mt-1">
          Please read carefully and sign to certify the accuracy of your application.
        </p>
      </div>

      {/* Certification Statement */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Certification Statement</h3>
        
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            I certify that all information provided in this application is true and complete to the 
            best of my knowledge. I understand that any false statements or omissions may result in 
            disqualification from employment or immediate termination if already employed.
          </p>
          
          <p>
            I authorize Thind Transport LLC and its agents to make inquiries of my previous employers, 
            educational institutions, and references for the purpose of verifying the information I 
            have provided and to investigate my driving record, criminal background, and credit history 
            as permitted by law.
          </p>
          
          <p>
            I understand that I am applying for a safety-sensitive position subject to drug and 
            alcohol testing requirements under 49 CFR Part 382 and Part 40. I agree to submit to 
            pre-employment, random, post-accident, reasonable suspicion, return-to-duty, and 
            follow-up testing as required.
          </p>
          
          <p>
            I understand that the use of a motor vehicle to transport property in interstate commerce 
            requires compliance with the Federal Motor Carrier Safety Regulations (FMCSR) and that 
            false information may subject me to criminal prosecution under applicable federal and 
            state laws.
          </p>
        </div>
      </div>

      {/* Do Not Contact Current Employer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={data.do_not_contact_current || false}
            onCheckedChange={(checked) => onChange('do_not_contact_current', !!checked)}
            className="mt-1"
          />
          <div>
            <span className="text-sm font-medium text-yellow-800">
              Please DO NOT contact my current employer until a conditional offer of employment is made.
            </span>
            <p className="text-xs text-yellow-700 mt-1">
              Check this box if you don't want us to contact your current employer before a job offer.
            </p>
          </div>
        </label>
      </div>

      {/* FCRA Disclosure */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-4">
          Fair Credit Reporting Act (FCRA) Disclosure
        </h3>
        
        <div className="space-y-4 text-sm text-blue-700 leading-relaxed">
          <p>
            In connection with your application for employment, we may obtain one or more consumer 
            reports on you. These reports may contain information about your character, general 
            reputation, personal characteristics, mode of living, and credit worthiness.
          </p>
          
          <p>
            You have the right to request a complete and accurate disclosure of the nature and 
            scope of any investigation. You also have the right to request a copy of your 
            consumer report at no charge if adverse action is taken based on the report.
          </p>
        </div>
      </div>

      {/* E-Signature Consent */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-4">Electronic Signature Consent</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={data.e_signature_consent || false}
              onCheckedChange={(checked) => onChange('e_signature_consent', !!checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-700">
              I consent to conduct this transaction and sign this document electronically. 
              I understand that my electronic signature is legally binding and has the same 
              effect as a handwritten signature under the ESIGN Act and FMCSA regulations.
            </span>
          </label>
          {!data.e_signature_consent && (
            <p className="text-xs text-blue-700 ml-7">
              You must provide consent to use electronic signatures before signing this document.
            </p>
          )}
        </div>
      </div>

      {/* Signature Section */}
      <div className="bg-white border-2 border-orange-300 rounded-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-6 text-center text-lg">
          Electronic Signature<RequiredMark />
        </h3>
        
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              By typing your name below, you certify that you have read, understand, and agree 
              to all the statements above. This electronic signature has the same legal effect 
              as a handwritten signature.
            </p>
          </div>

          {/* Signature Metadata Display */}
          {signatureMetadata.timestamp && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-800">
                  <p className="font-semibold mb-1">Signature Verified & Recorded</p>
                  <div className="space-y-1 text-green-700">
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Signed: {new Date(signatureMetadata.timestamp).toLocaleString()}
                    </p>
                    <p>IP Address: {signatureMetadata.ipAddress}</p>
                    <p className="text-[10px]">This signature is legally binding and will be attached to your application.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="main_signature" className="text-sm font-medium text-gray-700">
                Signature (Type Your Full Name)<RequiredMark />
              </Label>
              <Input
                id="main_signature"
                value={data.main_signature || ''}
                onChange={(e) => onChange('main_signature', e.target.value)}
                placeholder="John Robert Smith"
                className={`${inputClass('main_signature')} text-lg font-cursive`}
                style={{ fontFamily: "'Brush Script MT', cursive" }}
              />
              {errors.main_signature && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.main_signature}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="main_sign_date" className="text-sm font-medium text-gray-700">
                Date<RequiredMark />
              </Label>
              <Input
                id="main_sign_date"
                type="date"
                value={data.main_sign_date || new Date().toISOString().split('T')[0]}
                onChange={(e) => onChange('main_sign_date', e.target.value)}
                className={inputClass('main_sign_date')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="main_printed_name" className="text-sm font-medium text-gray-700">
              Printed Name
            </Label>
            <Input
              id="main_printed_name"
              value={data.main_printed_name || ''}
              onChange={(e) => onChange('main_printed_name', e.target.value)}
              placeholder="John Robert Smith"
              className={inputClass('main_printed_name')}
            />
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-red-800 text-sm">Important Notice</h4>
            <p className="text-xs text-red-700 mt-1">
              This application will be retained for one year. If no hiring decision is made within 
              that time, the application will be destroyed and you must reapply if you wish to be 
              considered for future positions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

